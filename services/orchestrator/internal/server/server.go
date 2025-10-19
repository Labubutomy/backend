package server

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	eventsv1 "github.com/Labubutomy/backend/proto/gen/go/platform/events/v1"
	usersv1 "github.com/Labubutomy/backend/proto/gen/go/platform/users/v1"
)

// OrchestratorServer handles task matching pipeline
type OrchestratorServer struct {
	logger     *zap.Logger
	db         *sql.DB
	natsConn   *nats.Conn
	userClient usersv1.UserServiceClient
}

// Config holds the configuration for the orchestrator service
type Config struct {
	Logger     *zap.Logger
	DB         *sql.DB
	NATSConn   *nats.Conn
	UserClient usersv1.UserServiceClient
}

// New creates a new OrchestratorServer instance
func New(cfg Config) *OrchestratorServer {
	return &OrchestratorServer{
		logger:     cfg.Logger,
		db:         cfg.DB,
		natsConn:   cfg.NATSConn,
		userClient: cfg.UserClient,
	}
}

// StartEventListener starts listening for task.created events from NATS
func (s *OrchestratorServer) StartEventListener(ctx context.Context) error {
	s.logger.Info("Starting NATS event listener for task.created events")

	_, err := s.natsConn.Subscribe("task.created", func(msg *nats.Msg) {
		// Handle events asynchronously to not block NATS
		go func() {
			if err := s.handleTaskCreated(msg); err != nil {
				s.logger.Error("failed to handle task.created event", zap.Error(err))
			}
		}()
	})

	if err != nil {
		return fmt.Errorf("failed to subscribe to task.created: %w", err)
	}

	s.logger.Info("Successfully subscribed to task.created events")
	return nil
}

// handleTaskCreated processes task.created events and starts matching pipeline
func (s *OrchestratorServer) handleTaskCreated(msg *nats.Msg) error {
	s.logger.Info("Received task.created event", zap.String("subject", msg.Subject))

	// 1. Deserialize TaskCreated event (Task Service sends JSON format)
	var event eventsv1.TaskCreated
	if err := json.Unmarshal(msg.Data, &event); err != nil {
		return fmt.Errorf("failed to unmarshal TaskCreated event: %w", err)
	}

	s.logger.Info("Processing TaskCreated event",
		zap.String("task_id", event.TaskId),
		zap.String("title", event.Title),
		zap.Strings("skill_tags", event.SkillTags),
		zap.Float64("budget_lower", event.BudgetLowerBound),
		zap.Float64("budget_upper", event.BudgetUpperBound))

	// 2. Find suitable developers through User Service gRPC
	developers, err := s.findSuitableDevelopers(&event)
	if err != nil {
		s.logger.Error("failed to find suitable developers", zap.Error(err), zap.String("task_id", event.TaskId))
		// Don't return error - continue processing even if User Service is unavailable
		return nil
	}

	s.logger.Info("Found suitable developers",
		zap.String("task_id", event.TaskId),
		zap.Int("count", len(developers)))

	// 3. Create proposals in PostgreSQL for each developer
	for _, dev := range developers {
		score := s.calculateMatchScore(&event, dev)
		if err := s.createProposal(event.TaskId, dev.UserId, score); err != nil {
			s.logger.Error("failed to create proposal",
				zap.Error(err),
				zap.String("task_id", event.TaskId),
				zap.String("user_id", dev.UserId))
			continue
		}
		s.logger.Info("Created proposal",
			zap.String("task_id", event.TaskId),
			zap.String("user_id", dev.UserId),
			zap.Float64("score", score))
	}

	return nil
}

// findSuitableDevelopers finds developers that match the task requirements
func (s *OrchestratorServer) findSuitableDevelopers(task *eventsv1.TaskCreated) ([]*usersv1.DeveloperProfile, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Call User Service ListOnlineDevelopers with filters
	resp, err := s.userClient.ListOnlineDevelopers(ctx, &usersv1.ListOnlineDevelopersRequest{
		SkillTags:        task.SkillTags,
		BudgetLowerBound: task.BudgetLowerBound,
		BudgetUpperBound: task.BudgetUpperBound,
		Limit:            5, // Top 5 candidates
	})

	if err != nil {
		return nil, fmt.Errorf("failed to call User Service ListOnlineDevelopers: %w", err)
	}

	return resp.Developers, nil
}

// calculateMatchScore calculates match score between task and developer
func (s *OrchestratorServer) calculateMatchScore(task *eventsv1.TaskCreated, developer *usersv1.DeveloperProfile) float64 {
	// 1. Skill overlap: intersection of skills / total task skills
	skillScore := float64(len(s.intersectSkills(task.SkillTags, developer.SkillTags))) / float64(len(task.SkillTags))
	if len(task.SkillTags) == 0 {
		skillScore = 1.0 // No specific skills required
	}

	// 2. Budget compatibility: proximity of developer rate to budget midpoint
	budgetMid := (task.BudgetLowerBound + task.BudgetUpperBound) / 2
	budgetScore := 1.0
	if budgetMid > 0 {
		budgetScore = 1.0 - math.Min(1.0, math.Abs(developer.HourlyRate-budgetMid)/budgetMid)
	}

	// 3. Developer rating (normalize from 5-star scale)
	ratingScore := developer.Rating / 5.0
	if ratingScore > 1.0 {
		ratingScore = 1.0
	}

	// Weighted score: 50% skills, 30% budget, 20% rating
	finalScore := 0.5*skillScore + 0.3*budgetScore + 0.2*ratingScore

	s.logger.Debug("Calculated match score",
		zap.String("task_id", task.TaskId),
		zap.String("user_id", developer.UserId),
		zap.Float64("skill_score", skillScore),
		zap.Float64("budget_score", budgetScore),
		zap.Float64("rating_score", ratingScore),
		zap.Float64("final_score", finalScore))

	return finalScore
}

// intersectSkills finds common skills between two slices
func (s *OrchestratorServer) intersectSkills(skills1, skills2 []string) []string {
	skillMap := make(map[string]bool)
	for _, skill := range skills1 {
		skillMap[strings.ToLower(skill)] = true
	}

	var intersection []string
	for _, skill := range skills2 {
		if skillMap[strings.ToLower(skill)] {
			intersection = append(intersection, skill)
		}
	}
	return intersection
}

// createProposal creates a proposal in PostgreSQL and publishes match.proposed event
func (s *OrchestratorServer) createProposal(taskID, userID string, score float64) error {
	proposalID := uuid.New().String()

	// 1. Insert proposal into database
	_, err := s.db.ExecContext(context.Background(), `
		INSERT INTO proposals (proposal_id, task_id, user_id, score, status, strategy_used, expires_at, created_at)
		VALUES ($1, $2, $3, $4, 'proposed', 'skill_match', NOW() + INTERVAL '5 minutes', NOW())
	`, proposalID, taskID, userID, score)

	if err != nil {
		return fmt.Errorf("failed to insert proposal into database: %w", err)
	}

	// 2. Publish match.proposed event to NATS
	event := &eventsv1.MatchProposed{
		ProposalId: proposalID,
		TaskId:     taskID,
		UserId:     userID,
		Score:      score,
		Strategy:   "skill_match",
		OccurredAt: timestamppb.New(time.Now()),
	}

	if err := s.publishEvent("match.proposed", event); err != nil {
		s.logger.Error("failed to publish match.proposed event",
			zap.Error(err),
			zap.String("proposal_id", proposalID))
		// Don't return error - proposal is already in DB
	}

	return nil
}

// publishEvent publishes an event to NATS
func (s *OrchestratorServer) publishEvent(subject string, event proto.Message) error {
	data, err := proto.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	if err := s.natsConn.Publish(subject, data); err != nil {
		return fmt.Errorf("failed to publish event to %s: %w", subject, err)
	}

	s.logger.Debug("Published event", zap.String("subject", subject))
	return nil
}
