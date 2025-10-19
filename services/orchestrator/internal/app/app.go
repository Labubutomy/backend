package app

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	deliveryv1 "github.com/Labubutomy/backend/proto/gen/go/platform/delivery/v1"
	eventsv1 "github.com/Labubutomy/backend/proto/gen/go/platform/events/v1"
	matchingv1 "github.com/Labubutomy/backend/proto/gen/go/platform/matching/v1"
)

// Config captures the dependencies required to run the orchestrator loop.
type Config struct {
	Logger               *zap.Logger
	NATSConn             *nats.Conn
	RedisClient          *redis.ClusterClient
	RecommendationClient matchingv1.RecommendationServiceClient
	DeliveryClient       deliveryv1.DeliveryServiceClient
	MaxConcurrentTasks   int
	MaxProposalsPerTask  int
	ProposalTimeout      time.Duration
}

// Orchestrator consumes task events, performs candidate selection, and emits proposals.
type Orchestrator struct {
	cfg              Config
	logger           *zap.Logger
	taskSubscription *nats.Subscription
	metrics          *Metrics

	// Concurrency control
	taskSemaphore   chan struct{}
	proposalLimiter map[string]chan struct{}
	limiterMutex    sync.RWMutex
}

// Metrics holds performance metrics for the orchestrator
type Metrics struct {
	TasksProcessed     int64
	ProposalsDelivered int64
	MatchingLatency    []time.Duration
	ErrorCount         int64
}

// NewOrchestrator constructs a new orchestrator instance with the provided dependencies.
func NewOrchestrator(cfg Config) *Orchestrator {
	if cfg.Logger == nil {
		cfg.Logger = zap.NewNop()
	}
	if cfg.MaxConcurrentTasks == 0 {
		cfg.MaxConcurrentTasks = 100
	}
	if cfg.MaxProposalsPerTask == 0 {
		cfg.MaxProposalsPerTask = 20
	}
	if cfg.ProposalTimeout == 0 {
		cfg.ProposalTimeout = 5 * time.Minute
	}

	return &Orchestrator{
		cfg:             cfg,
		logger:          cfg.Logger,
		taskSemaphore:   make(chan struct{}, cfg.MaxConcurrentTasks),
		proposalLimiter: make(map[string]chan struct{}),
		metrics:         &Metrics{},
	}
}

// Run keeps the orchestrator loop alive until the context is cancelled.
func (o *Orchestrator) Run(ctx context.Context) error {
	o.logger.Info("starting orchestrator", zap.Int("max_concurrent_tasks", o.cfg.MaxConcurrentTasks))

	// Subscribe to task.created events with durable consumer
	sub, err := o.cfg.NATSConn.QueueSubscribe("task.created", "orchestrator", o.handleTaskCreated)
	if err != nil {
		return fmt.Errorf("failed to subscribe to task.created: %w", err)
	}
	o.taskSubscription = sub

	// Start metrics reporting goroutine
	go o.reportMetrics(ctx)

	// Start cleanup goroutine for expired proposals
	go o.cleanupExpiredProposals(ctx)

	o.logger.Info("orchestrator started successfully")

	// Wait for context cancellation
	<-ctx.Done()

	o.logger.Info("shutting down orchestrator")

	// Graceful shutdown
	if err := o.taskSubscription.Unsubscribe(); err != nil {
		o.logger.Error("error unsubscribing from NATS", zap.Error(err))
	}

	return nil
}

// handleTaskCreated processes a task.created event with minimal latency
func (o *Orchestrator) handleTaskCreated(msg *nats.Msg) {
	start := time.Now()
	defer func() {
		latency := time.Since(start)
		o.metrics.MatchingLatency = append(o.metrics.MatchingLatency, latency)
		o.logger.Debug("task processing completed",
			zap.Duration("latency", latency),
			zap.String("task_id", string(msg.Data)))
	}()

	// Acquire semaphore for concurrency control
	select {
	case o.taskSemaphore <- struct{}{}:
		defer func() { <-o.taskSemaphore }()
	default:
		o.logger.Warn("max concurrent tasks reached, dropping task",
			zap.String("subject", msg.Subject))
		o.metrics.ErrorCount++
		return
	}

	// Parse event
	var taskEvent eventsv1.TaskCreatedEvent
	if err := json.Unmarshal(msg.Data, &taskEvent); err != nil {
		o.logger.Error("failed to unmarshal task.created event",
			zap.Error(err), zap.String("data", string(msg.Data)))
		o.metrics.ErrorCount++
		return
	}

	// Process task with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := o.processTask(ctx, &taskEvent); err != nil {
		o.logger.Error("failed to process task",
			zap.Error(err),
			zap.String("task_id", taskEvent.TaskId))
		o.metrics.ErrorCount++
	} else {
		o.metrics.TasksProcessed++
	}
}

// processTask implements the core matching logic
func (o *Orchestrator) processTask(ctx context.Context, task *eventsv1.TaskCreatedEvent) error {
	taskID := task.TaskId

	o.logger.Info("processing task",
		zap.String("task_id", taskID),
		zap.Strings("skills", task.SkillTags),
		zap.Float64("budget_min", task.BudgetLowerBound),
		zap.Float64("budget_max", task.BudgetUpperBound))

	// Step 1: Fast candidate selection from Redis (target: 50ms)
	candidates, err := o.getCandidatesFromRedis(ctx, task)
	if err != nil {
		return fmt.Errorf("candidate selection failed: %w", err)
	}

	if len(candidates) == 0 {
		o.logger.Info("no candidates found for task",
			zap.String("task_id", taskID),
			zap.Strings("skills", task.SkillTags))
		return nil
	}

	o.logger.Debug("candidates found",
		zap.String("task_id", taskID),
		zap.Int("count", len(candidates)))

	// Step 2: Score candidates via Recommendation Service (target: 200ms)
	scores, err := o.scoreCandidates(ctx, task, candidates)
	if err != nil {
		return fmt.Errorf("candidate scoring failed: %w", err)
	}

	// Step 3: Create and deliver proposals (target: 200ms)
	return o.deliverProposals(ctx, taskID, scores)
}

// getCandidatesFromRedis performs fast candidate lookup using Redis indices
func (o *Orchestrator) getCandidatesFromRedis(ctx context.Context, task *eventsv1.TaskCreatedEvent) ([]string, error) {
	// Use Redis pipeline for efficient multi-skill lookup
	pipe := o.cfg.RedisClient.Pipeline()

	// Get online developers for each required skill (sorted by rating)
	skillKeys := make([]string, len(task.SkillTags))
	for i, skill := range task.SkillTags {
		skillKey := fmt.Sprintf("skill:%s:online", skill)
		skillKeys[i] = skillKey
		// Get top developers by rating for this skill
		pipe.ZRevRange(ctx, skillKey, 0, 50) // Top 50 per skill
	}

	results, err := pipe.Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("redis pipeline failed: %w", err)
	}

	// Collect all candidate user IDs
	candidateSet := make(map[string]bool)
	for _, result := range results {
		cmd := result.(*redis.StringSliceCmd)
		userIDs, err := cmd.Result()
		if err != nil {
			continue // Skip failed skill lookups
		}
		for _, userID := range userIDs {
			candidateSet[userID] = true
		}
	}

	// Convert to slice and apply budget filtering
	candidates := make([]string, 0, len(candidateSet))
	for userID := range candidateSet {
		// Quick budget pre-filtering via Redis
		if o.checkBudgetCompatibility(ctx, userID, task.BudgetLowerBound, task.BudgetUpperBound) {
			candidates = append(candidates, userID)
		}
	}

	return candidates, nil
}

// checkBudgetCompatibility performs fast budget filtering using Redis
func (o *Orchestrator) checkBudgetCompatibility(ctx context.Context, userID string, budgetMin, budgetMax float64) bool {
	// Check if user's hourly rate is compatible with task budget
	// This could be pre-computed and stored in Redis for O(1) lookup
	hourlyRate, err := o.cfg.RedisClient.HGet(ctx, fmt.Sprintf("user:%s:profile", userID), "hourly_rate").Float64()
	if err != nil {
		return true // Include if rate is unknown (fallback)
	}

	// Simple budget compatibility check
	// For more sophisticated logic, could estimate hours and compare
	return hourlyRate >= budgetMin*0.5 && hourlyRate <= budgetMax*1.5
}

// scoreCandidates calls the recommendation service for candidate scoring
func (o *Orchestrator) scoreCandidates(ctx context.Context, task *eventsv1.TaskCreatedEvent, candidates []string) ([]*matchingv1.CandidateScore, error) {
	// Build scoring request
	req := &matchingv1.ScoreTaskCandidatesRequest{
		Task: &matchingv1.TaskContext{
			TaskId:           task.TaskId,
			SkillTags:        task.SkillTags,
			BudgetLowerBound: task.BudgetLowerBound,
			BudgetUpperBound: task.BudgetUpperBound,
			Title:            task.Title,
			Description:      task.Description,
		},
		Candidates: make([]*matchingv1.CandidateContext, len(candidates)),
		Limit:      uint32(o.cfg.MaxProposalsPerTask),
		Strategy: &matchingv1.ScoringStrategy{
			Name: "balanced", // Default strategy
		},
	}

	// Fill candidate contexts (this could be optimized with batched Redis calls)
	for i, userID := range candidates {
		candidateCtx, err := o.buildCandidateContext(ctx, userID)
		if err != nil {
			o.logger.Warn("failed to build candidate context",
				zap.Error(err), zap.String("user_id", userID))
			continue
		}
		req.Candidates[i] = candidateCtx
	}

	// Call recommendation service
	resp, err := o.cfg.RecommendationClient.ScoreTaskCandidates(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("recommendation service call failed: %w", err)
	}

	return resp.Scores, nil
}

// buildCandidateContext creates candidate context from user data
func (o *Orchestrator) buildCandidateContext(ctx context.Context, userID string) (*matchingv1.CandidateContext, error) {
	// Get user profile from Redis (should be cached for performance)
	profileKey := fmt.Sprintf("user:%s:profile", userID)
	profile, err := o.cfg.RedisClient.HGetAll(ctx, profileKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get user profile: %w", err)
	}

	// Parse profile data (simplified - in production, use proper serialization)
	candidateCtx := &matchingv1.CandidateContext{
		UserId: userID,
	}

	// Parse skills if available
	if skillsStr, exists := profile["skills"]; exists {
		// Simple comma-separated parsing for MVP
		if skillsStr != "" {
			candidateCtx.SkillTags = []string{skillsStr} // TODO: proper parsing
		}
	}

	// Parse hourly rate if available
	if rateStr, exists := profile["hourly_rate"]; exists && rateStr != "" {
		if rate, err := fmt.Sscanf(rateStr, "%f", &candidateCtx.HourlyRate); err == nil && rate == 1 {
			// Successfully parsed
		}
	}

	// Parse rating if available
	if ratingStr, exists := profile["rating"]; exists && ratingStr != "" {
		if rating, err := fmt.Sscanf(ratingStr, "%f", &candidateCtx.Rating); err == nil && rating == 1 {
			// Successfully parsed
		}
	}

	return candidateCtx, nil
}

// deliverProposals creates and delivers proposals to selected candidates
func (o *Orchestrator) deliverProposals(ctx context.Context, taskID string, scores []*matchingv1.CandidateScore) error {
	if len(scores) == 0 {
		o.logger.Info("no scores to deliver", zap.String("task_id", taskID))
		return nil
	}

	o.logger.Info("delivering proposals",
		zap.String("task_id", taskID),
		zap.Int("count", len(scores)))

	// Create proposals in parallel for minimal latency
	var wg sync.WaitGroup
	errCh := make(chan error, len(scores))

	for _, score := range scores {
		wg.Add(1)
		go func(s *matchingv1.CandidateScore) {
			defer wg.Done()
			if err := o.deliverSingleProposal(ctx, taskID, s); err != nil {
				errCh <- err
			} else {
				o.metrics.ProposalsDelivered++
			}
		}(score)
	}

	wg.Wait()
	close(errCh)

	// Log any errors but don't fail the entire operation
	for err := range errCh {
		o.logger.Error("proposal delivery failed", zap.Error(err))
	}

	return nil
}

// deliverSingleProposal delivers a proposal to a single candidate
func (o *Orchestrator) deliverSingleProposal(ctx context.Context, taskID string, score *matchingv1.CandidateScore) error {
	proposalID := fmt.Sprintf("prop_%s_%s_%d", taskID, score.UserId, time.Now().UnixNano())

	// Create delivery request
	deliveryReq := &deliveryv1.DeliverProposalRequest{
		ProposalId: proposalID,
		TaskId:     taskID,
		UserId:     score.UserId,
		Payload: &deliveryv1.ProposalPayload{
			// Fill with task details
			Score:     score.Score,
			ExpiresAt: nil, // Set expiration timestamp
		},
		Options: &deliveryv1.DeliveryOptions{
			PreferredChannels: []deliveryv1.DeliveryChannel{
				deliveryv1.DeliveryChannel_DELIVERY_CHANNEL_WEBSOCKET,
				deliveryv1.DeliveryChannel_DELIVERY_CHANNEL_PUSH,
			},
			AllowFallback: true,
			RetryCount:    3,
		},
	}

	// Call delivery service
	_, err := o.cfg.DeliveryClient.DeliverProposal(ctx, deliveryReq)
	if err != nil {
		return fmt.Errorf("delivery service call failed: %w", err)
	}

	// Publish match.proposed event
	event := &eventsv1.MatchProposedEvent{
		ProposalId: proposalID,
		TaskId:     taskID,
		UserId:     score.UserId,
		Score:      score.Score,
		// Add other fields
	}

	eventData, _ := json.Marshal(event)
	return o.cfg.NATSConn.Publish("match.proposed", eventData)
}

// reportMetrics periodically reports orchestrator metrics
func (o *Orchestrator) reportMetrics(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			o.logMetrics()
		}
	}
}

// logMetrics logs current performance metrics
func (o *Orchestrator) logMetrics() {
	var avgLatency time.Duration
	if len(o.metrics.MatchingLatency) > 0 {
		var total time.Duration
		for _, lat := range o.metrics.MatchingLatency {
			total += lat
		}
		avgLatency = total / time.Duration(len(o.metrics.MatchingLatency))
		o.metrics.MatchingLatency = nil // Reset for next interval
	}

	o.logger.Info("orchestrator metrics",
		zap.Int64("tasks_processed", o.metrics.TasksProcessed),
		zap.Int64("proposals_delivered", o.metrics.ProposalsDelivered),
		zap.Duration("avg_latency", avgLatency),
		zap.Int64("error_count", o.metrics.ErrorCount))
}

// cleanupExpiredProposals periodically cleans up expired proposals
func (o *Orchestrator) cleanupExpiredProposals(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Implement cleanup logic
			o.logger.Debug("cleaning up expired proposals")
		}
	}
}
