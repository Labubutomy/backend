package server

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/nats-io/nats.go"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "github.com/Labubutomy/backend/proto/gen/go/platform/common/v1"
	eventsv1 "github.com/Labubutomy/backend/proto/gen/go/platform/events/v1"
	tasksv1 "github.com/Labubutomy/backend/proto/gen/go/platform/tasks/v1"
)

// TaskServiceServer implements the TaskService gRPC API
type TaskServiceServer struct {
	tasksv1.UnimplementedTaskServiceServer

	logger   *zap.Logger
	db       *sql.DB
	natsConn *nats.Conn
}

// Config holds the configuration for the task service
type Config struct {
	Logger   *zap.Logger
	DB       *sql.DB
	NATSConn *nats.Conn
}

// New creates a new TaskServiceServer instance
func New(cfg Config) *TaskServiceServer {
	return &TaskServiceServer{
		logger:   cfg.Logger,
		db:       cfg.DB,
		natsConn: cfg.NATSConn,
	}
}

// CreateTask creates a new task and publishes task.created event
func (s *TaskServiceServer) CreateTask(ctx context.Context, req *tasksv1.CreateTaskRequest) (*tasksv1.CreateTaskResponse, error) {
	taskID := uuid.New().String()

	// Insert task into database
	var createdAt time.Time
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO tasks (
			task_id, client_id, title, description, skill_tags,
			budget_lower_bound, budget_upper_bound, repository_url,
			priority, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', NOW(), NOW())
		RETURNING created_at
	`, taskID, req.ClientId, req.Title, req.Description, pq.Array(req.SkillTags),
		req.BudgetLowerBound, req.BudgetUpperBound, req.RepositoryUrl, req.Priority).Scan(&createdAt)

	if err != nil {
		s.logger.Error("failed to create task", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "failed to create task: %v", err)
	}

	// Create task object for response
	task := &tasksv1.Task{
		TaskId:           taskID,
		ClientId:         req.ClientId,
		Title:            req.Title,
		Description:      req.Description,
		SkillTags:        req.SkillTags,
		BudgetLowerBound: req.BudgetLowerBound,
		BudgetUpperBound: req.BudgetUpperBound,
		RepositoryUrl:    req.RepositoryUrl,
		Status:           commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_OPEN,
		CreatedAt:        timestamppb.New(createdAt),
		UpdatedAt:        timestamppb.New(createdAt),
	}

	// Publish critical task.created event - this triggers the matching pipeline!
	event := &eventsv1.TaskCreated{
		TaskId:           taskID,
		ClientId:         req.ClientId,
		Title:            req.Title,
		Description:      req.Description,
		SkillTags:        req.SkillTags,
		BudgetLowerBound: req.BudgetLowerBound,
		BudgetUpperBound: req.BudgetUpperBound,
		RepositoryUrl:    req.RepositoryUrl,
		Status:           commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_OPEN,
		OccurredAt:       timestamppb.New(createdAt),
	}

	if err := s.publishEvent("task.created", event); err != nil {
		s.logger.Error("CRITICAL: failed to publish task.created event", zap.Error(err), zap.String("task_id", taskID))
		// This is critical - without this event the matching pipeline won't start!
		return nil, status.Errorf(codes.Internal, "failed to publish task.created event: %v", err)
	}

	s.logger.Info("Task created successfully", zap.String("task_id", taskID), zap.String("client_id", req.ClientId))

	return &tasksv1.CreateTaskResponse{
		Task: task,
	}, nil
}

// GetTask retrieves a task by ID
func (s *TaskServiceServer) GetTask(ctx context.Context, req *tasksv1.GetTaskRequest) (*tasksv1.GetTaskResponse, error) {
	var (
		taskID, clientID, title, description, repositoryUrl, statusStr string
		skillTags                                                      pq.StringArray
		budgetLower, budgetUpper                                       float64
		createdAt, updatedAt                                           time.Time
	)

	err := s.db.QueryRowContext(ctx, `
		SELECT task_id, client_id, title, description, skill_tags,
			   budget_lower_bound, budget_upper_bound, repository_url,
			   status, created_at, updated_at
		FROM tasks WHERE task_id = $1
	`, req.TaskId).Scan(
		&taskID, &clientID, &title, &description, &skillTags,
		&budgetLower, &budgetUpper, &repositoryUrl,
		&statusStr, &createdAt, &updatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, status.Errorf(codes.NotFound, "task not found")
	}
	if err != nil {
		s.logger.Error("failed to get task", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "failed to get task: %v", err)
	}

	// Convert status string to enum
	taskStatus := commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_OPEN
	switch statusStr {
	case "open":
		taskStatus = commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_OPEN
	case "assigned":
		taskStatus = commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_ASSIGNED
	case "paused":
		taskStatus = commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_PAUSED
	case "completed":
		taskStatus = commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_COMPLETED
	case "cancelled":
		taskStatus = commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_CANCELLED
	}

	task := &tasksv1.Task{
		TaskId:           taskID,
		ClientId:         clientID,
		Title:            title,
		Description:      description,
		SkillTags:        skillTags,
		BudgetLowerBound: budgetLower,
		BudgetUpperBound: budgetUpper,
		RepositoryUrl:    repositoryUrl,
		Status:           taskStatus,
		CreatedAt:        timestamppb.New(createdAt),
		UpdatedAt:        timestamppb.New(updatedAt),
	}

	return &tasksv1.GetTaskResponse{
		Task: task,
	}, nil
}

// UpdateTask updates an existing task
func (s *TaskServiceServer) UpdateTask(ctx context.Context, req *tasksv1.UpdateTaskRequest) (*emptypb.Empty, error) {
	// Convert status enum to string
	statusStr := "open"
	switch req.Status {
	case commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_OPEN:
		statusStr = "open"
	case commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_ASSIGNED:
		statusStr = "assigned"
	case commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_PAUSED:
		statusStr = "paused"
	case commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_COMPLETED:
		statusStr = "completed"
	case commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_CANCELLED:
		statusStr = "cancelled"
	}

	_, err := s.db.ExecContext(ctx, `
		UPDATE tasks 
		SET title = $2, description = $3, skill_tags = $4,
			budget_lower_bound = $5, budget_upper_bound = $6,
			repository_url = $7, status = $8, updated_at = NOW()
		WHERE task_id = $1
	`, req.TaskId, req.Title, req.Description, pq.Array(req.SkillTags),
		req.BudgetLowerBound, req.BudgetUpperBound, req.RepositoryUrl, statusStr)

	if err != nil {
		s.logger.Error("failed to update task", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "failed to update task: %v", err)
	}

	// Publish task.updated event
	event := &eventsv1.TaskUpdated{
		TaskId:           req.TaskId,
		Status:           req.Status,
		SkillTags:        req.SkillTags,
		BudgetLowerBound: req.BudgetLowerBound,
		BudgetUpperBound: req.BudgetUpperBound,
		OccurredAt:       timestamppb.Now(),
	}

	if err := s.publishEvent("task.updated", event); err != nil {
		s.logger.Warn("failed to publish task.updated event", zap.Error(err))
	}

	s.logger.Info("Task updated successfully", zap.String("task_id", req.TaskId))

	return &emptypb.Empty{}, nil
}

// publishEvent publishes an event to NATS
func (s *TaskServiceServer) publishEvent(subject string, event interface{}) error {
	if s.natsConn == nil {
		return fmt.Errorf("NATS connection not initialized")
	}

	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	return s.natsConn.Publish(subject, data)
}
