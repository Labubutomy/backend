package server

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	commonv1 "github.com/Labubutomy/backend/proto/gen/go/platform/common/v1"
	tasksv1 "github.com/Labubutomy/backend/proto/gen/go/platform/tasks/v1"
)

// Setup helper function with mocked dependencies
func setupMockedTaskServerSimple(t *testing.T) (*TaskServiceServer, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	logger := zaptest.NewLogger(t)

	server := New(Config{
		Logger:   logger,
		DB:       db,
		NATSConn: nil, // Skip NATS for unit tests
	})

	return server, mock
}

func TestTaskServiceServer_GetTask(t *testing.T) {
	tests := []struct {
		name           string
		request        *tasksv1.GetTaskRequest
		setupMock      func(mock sqlmock.Sqlmock)
		expectedError  bool
		expectedCode   codes.Code
		validateResult func(t *testing.T, resp *tasksv1.GetTaskResponse)
	}{
		{
			name: "successful_task_retrieval",
			request: &tasksv1.GetTaskRequest{
				TaskId: "task-123",
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{
					"task_id", "client_id", "title", "description", "skill_tags",
					"budget_lower_bound", "budget_upper_bound", "repository_url",
					"status", "created_at", "updated_at",
				}).AddRow(
					"task-123", "client-123", "Build REST API",
					"Need a Go REST API", pq.Array([]string{"golang"}),
					1000.0, 2500.0, "https://github.com/client/project",
					"open", time.Now(), time.Now(),
				)

				mock.ExpectQuery("SELECT (.+) FROM tasks").
					WithArgs("task-123").
					WillReturnRows(rows)
			},
			expectedError: false,
			validateResult: func(t *testing.T, resp *tasksv1.GetTaskResponse) {
				assert.NotNil(t, resp.Task)
				assert.Equal(t, "task-123", resp.Task.TaskId)
				assert.Equal(t, "client-123", resp.Task.ClientId)
				assert.Equal(t, "Build REST API", resp.Task.Title)
				assert.Equal(t, "Need a Go REST API", resp.Task.Description)
				assert.Equal(t, []string{"golang"}, resp.Task.SkillTags)
				assert.Equal(t, commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_OPEN, resp.Task.Status)
			},
		},
		{
			name: "task_not_found",
			request: &tasksv1.GetTaskRequest{
				TaskId: "non-existent-task",
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT (.+) FROM tasks").
					WithArgs("non-existent-task").
					WillReturnError(sql.ErrNoRows)
			},
			expectedError: true,
			expectedCode:  codes.NotFound,
		},
		{
			name: "database_error",
			request: &tasksv1.GetTaskRequest{
				TaskId: "task-123",
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT (.+) FROM tasks").
					WithArgs("task-123").
					WillReturnError(sql.ErrConnDone)
			},
			expectedError: true,
			expectedCode:  codes.Internal,
		},
		{
			name: "empty_task_id",
			request: &tasksv1.GetTaskRequest{
				TaskId: "",
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				// Empty task ID still goes to database and returns no rows
				mock.ExpectQuery("SELECT (.+) FROM tasks").
					WithArgs("").
					WillReturnError(sql.ErrNoRows)
			},
			expectedError: true,
			expectedCode:  codes.NotFound,
		},
		{
			name: "invalid_task_id_format",
			request: &tasksv1.GetTaskRequest{
				TaskId: "invalid-task-id",
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT (.+) FROM tasks").
					WithArgs("invalid-task-id").
					WillReturnError(sql.ErrNoRows)
			},
			expectedError: true,
			expectedCode:  codes.NotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, mock := setupMockedTaskServerSimple(t)
			defer func() {
				assert.NoError(t, mock.ExpectationsWereMet())
			}()

			tt.setupMock(mock)

			resp, err := server.GetTask(context.Background(), tt.request)

			if tt.expectedError {
				assert.Error(t, err)
				if tt.expectedCode != codes.OK {
					assert.Equal(t, tt.expectedCode, status.Code(err))
				}
				assert.Nil(t, resp)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, resp)
				if tt.validateResult != nil {
					tt.validateResult(t, resp)
				}
			}
		})
	}
}

// Test task data parsing and conversion
func TestTaskServiceServer_GetTask_DataHandling(t *testing.T) {
	server, mock := setupMockedTaskServerSimple(t)
	defer func() {
		assert.NoError(t, mock.ExpectationsWereMet())
	}()

	// Test with complex skill tags array - use "assigned" not enum string
	rows := sqlmock.NewRows([]string{
		"task_id", "client_id", "title", "description", "skill_tags",
		"budget_lower_bound", "budget_upper_bound", "repository_url",
		"status", "created_at", "updated_at",
	}).AddRow(
		"task-complex", "client-456", "Complex Task",
		"A complex task with multiple skills",
		pq.Array([]string{"golang", "kubernetes", "postgresql", "redis", "docker"}),
		5000.0, 10000.0, "https://github.com/client/complex-project",
		"assigned", // Use database string value, not proto enum string
		time.Date(2023, 10, 15, 12, 0, 0, 0, time.UTC),
		time.Date(2023, 10, 16, 12, 0, 0, 0, time.UTC),
	)

	mock.ExpectQuery("SELECT (.+) FROM tasks").
		WithArgs("task-complex").
		WillReturnRows(rows)

	request := &tasksv1.GetTaskRequest{
		TaskId: "task-complex",
	}

	resp, err := server.GetTask(context.Background(), request)

	assert.NoError(t, err)
	assert.NotNil(t, resp.Task)

	// Validate complex data
	assert.Equal(t, "task-complex", resp.Task.TaskId)
	assert.Equal(t, "client-456", resp.Task.ClientId)
	assert.Equal(t, "Complex Task", resp.Task.Title)
	assert.Equal(t, "A complex task with multiple skills", resp.Task.Description)
	assert.Equal(t, []string{"golang", "kubernetes", "postgresql", "redis", "docker"}, resp.Task.SkillTags)
	assert.Equal(t, 5000.0, resp.Task.BudgetLowerBound)
	assert.Equal(t, 10000.0, resp.Task.BudgetUpperBound)
	assert.Equal(t, "https://github.com/client/complex-project", resp.Task.RepositoryUrl)
	assert.Equal(t, commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_ASSIGNED, resp.Task.Status)

	// Validate timestamps are properly converted
	assert.NotNil(t, resp.Task.CreatedAt)
	assert.NotNil(t, resp.Task.UpdatedAt)
}

// Benchmark test for performance validation
func BenchmarkTaskServiceServer_GetTask(b *testing.B) {
	db, mock, err := sqlmock.New()
	if err != nil {
		b.Fatal(err)
	}

	logger := zaptest.NewLogger(&testing.T{})
	server := New(Config{
		Logger:   logger,
		DB:       db,
		NATSConn: nil,
	})

	// Setup mock for benchmark iterations
	for i := 0; i < b.N; i++ {
		rows := sqlmock.NewRows([]string{
			"task_id", "client_id", "title", "description", "skill_tags",
			"budget_lower_bound", "budget_upper_bound", "repository_url",
			"status", "created_at", "updated_at",
		}).AddRow(
			"task-bench", "client-bench", "Benchmark Task",
			"Benchmark description", pq.Array([]string{"golang"}),
			1000.0, 2000.0, "https://github.com/bench/project",
			"open", time.Now(), time.Now(),
		)

		mock.ExpectQuery("SELECT (.+) FROM tasks").
			WithArgs("task-bench").
			WillReturnRows(rows)
	}

	request := &tasksv1.GetTaskRequest{
		TaskId: "task-bench",
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_, err := server.GetTask(context.Background(), request)
		if err != nil {
			b.Fatal(err)
		}
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		b.Fatal(err)
	}
}
