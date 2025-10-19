package server

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "github.com/Labubutomy/backend/proto/gen/go/platform/common/v1"
	eventsv1 "github.com/Labubutomy/backend/proto/gen/go/platform/events/v1"
	usersv1 "github.com/Labubutomy/backend/proto/gen/go/platform/users/v1"

	_ "github.com/lib/pq"
)

// MockUserServiceClient is a mock implementation of UserServiceClient
type MockUserServiceClient struct {
	mock.Mock
}

func (m *MockUserServiceClient) CreateDeveloperProfile(ctx context.Context, req *usersv1.CreateDeveloperProfileRequest, opts ...grpc.CallOption) (*usersv1.CreateDeveloperProfileResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*usersv1.CreateDeveloperProfileResponse), args.Error(1)
}

func (m *MockUserServiceClient) UpdateDeveloperProfile(ctx context.Context, req *usersv1.UpdateDeveloperProfileRequest, opts ...grpc.CallOption) (*emptypb.Empty, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*emptypb.Empty), args.Error(1)
}

func (m *MockUserServiceClient) UpdatePresence(ctx context.Context, req *usersv1.UpdatePresenceRequest, opts ...grpc.CallOption) (*emptypb.Empty, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*emptypb.Empty), args.Error(1)
}

func (m *MockUserServiceClient) ListOnlineDevelopers(ctx context.Context, req *usersv1.ListOnlineDevelopersRequest, opts ...grpc.CallOption) (*usersv1.ListOnlineDevelopersResponse, error) {
	args := m.Called(ctx, req)
	return args.Get(0).(*usersv1.ListOnlineDevelopersResponse), args.Error(1)
}

// setupTestDB creates a connection to the test database
func setupTestDB(t *testing.T) *sql.DB {
	// Use the existing development database for testing
	db, err := sql.Open("postgres", "postgres://postgres:postgres@localhost:5432/freelance_platform?sslmode=disable")
	require.NoError(t, err)

	// Ensure connection works
	ctx := context.Background()
	err = db.PingContext(ctx)
	require.NoError(t, err)

	// Clean up any existing test proposals and tasks
	_, err = db.ExecContext(ctx, `DELETE FROM proposals WHERE task_id::text LIKE '550e8400-%'`)
	require.NoError(t, err)
	_, err = db.ExecContext(ctx, `DELETE FROM tasks WHERE task_id::text LIKE '550e8400-%'`)
	require.NoError(t, err)

	// Insert test tasks to satisfy foreign key constraints
	testTaskIDs := []string{
		"550e8400-e29b-41d4-a716-446655440001",
		"550e8400-e29b-41d4-a716-446655440003",
		"550e8400-e29b-41d4-a716-446655440004",
		"550e8400-e29b-41d4-a716-446655440005",
		"550e8400-e29b-41d4-a716-446655440007",
	}
	testClientID := "550e8400-e29b-41d4-a716-446655440000"
	for _, taskID := range testTaskIDs {
		_, err = db.ExecContext(ctx, `
			INSERT INTO tasks (task_id, client_id, title, description, skill_tags, budget_lower_bound, budget_upper_bound, status, created_at, updated_at)
			VALUES ($1, $2, 'Test Task', 'Test Description', ARRAY['go'], 50.0, 100.0, 'open', NOW(), NOW())
			ON CONFLICT (task_id) DO NOTHING
		`, taskID, testClientID)
		require.NoError(t, err)
	}

	// Insert test users for proposals
	testUserIDs := []string{
		"550e8400-e29b-41d4-a716-446655440006",
		"550e8400-e29b-41d4-a716-446655440010", // testDeveloper1ID
		"550e8400-e29b-41d4-a716-446655440011", // testDeveloper2ID
		"550e8400-e29b-41d4-a716-446655440012", // testDeveloperID
		"550e8400-e29b-41d4-a716-446655440013", // integrationDev1ID
		"550e8400-e29b-41d4-a716-446655440014", // integrationDev2ID
	}
	for _, userID := range testUserIDs {
		_, err = db.ExecContext(ctx, `
			INSERT INTO users (user_id, email, display_name, user_type, created_at, updated_at)
			VALUES ($1, $2, $3, 'developer', NOW(), NOW())
			ON CONFLICT (user_id) DO NOTHING
		`, userID, userID+"@test.com", "Test User "+userID)
		require.NoError(t, err)
	}

	return db
}

// setupTestNATS creates a connection to the test NATS server
func setupTestNATS(t *testing.T) *nats.Conn {
	nc, err := nats.Connect("nats://localhost:4222")
	require.NoError(t, err)
	return nc
}

// createTestServer creates a configured OrchestratorServer for testing
func createTestServer(t *testing.T, mockUserClient *MockUserServiceClient) (*OrchestratorServer, *sql.DB, *nats.Conn) {
	db := setupTestDB(t)
	nc := setupTestNATS(t)

	logger := zaptest.NewLogger(t)

	server := New(Config{
		Logger:     logger,
		DB:         db,
		NATSConn:   nc,
		UserClient: mockUserClient,
	})

	return server, db, nc
}

// Test handleTaskCreated method
func TestOrchestratorServer_HandleTaskCreated(t *testing.T) {
	mockUserClient := &MockUserServiceClient{}
	server, db, nc := createTestServer(t, mockUserClient)
	defer db.Close()
	defer nc.Close()

	// Create test developers
	testDeveloper1ID := "550e8400-e29b-41d4-a716-446655440010"
	testDeveloper2ID := "550e8400-e29b-41d4-a716-446655440011"
	testDevelopers := []*usersv1.DeveloperProfile{
		{
			UserId:     testDeveloper1ID,
			SkillTags:  []string{"go", "postgresql"},
			HourlyRate: 50.0,
			Rating:     4.5,
			Presence:   commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_SEARCHING,
		},
		{
			UserId:     testDeveloper2ID,
			SkillTags:  []string{"go", "react"},
			HourlyRate: 60.0,
			Rating:     4.8,
			Presence:   commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_IDLE,
		},
	}

	// Mock UserService response
	mockUserClient.On("ListOnlineDevelopers", mock.Anything, mock.AnythingOfType("*v1.ListOnlineDevelopersRequest")).Return(
		&usersv1.ListOnlineDevelopersResponse{
			Developers: testDevelopers,
		}, nil)

	// Create TaskCreated event
	testTaskID := "550e8400-e29b-41d4-a716-446655440001"
	testClientID := "550e8400-e29b-41d4-a716-446655440002"
	taskEvent := &eventsv1.TaskCreated{
		TaskId:           testTaskID,
		ClientId:         testClientID,
		Title:            "Test Task",
		Description:      "Test description",
		SkillTags:        []string{"go", "postgresql"},
		BudgetLowerBound: 40.0,
		BudgetUpperBound: 70.0,
		Status:           commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_OPEN,
		OccurredAt:       timestamppb.New(time.Now()),
	}

	// Marshal event to JSON bytes (as Task Service sends)
	eventData, err := json.Marshal(taskEvent)
	require.NoError(t, err)

	// Create NATS message
	msg := &nats.Msg{
		Subject: "task.created",
		Data:    eventData,
	}

	// Test handleTaskCreated
	err = server.handleTaskCreated(msg)
	assert.NoError(t, err)

	// Verify proposals were created in database
	rows, err := db.Query(`
		SELECT proposal_id, task_id, user_id, score, status, strategy_used 
		FROM proposals 
		WHERE task_id = $1
	`, testTaskID)
	require.NoError(t, err)
	defer rows.Close()

	proposalCount := 0
	for rows.Next() {
		var proposalID, taskID, userID, status, strategy string
		var score float64

		err = rows.Scan(&proposalID, &taskID, &userID, &score, &status, &strategy)
		require.NoError(t, err)

		assert.Equal(t, testTaskID, taskID)
		assert.Contains(t, []string{testDeveloper1ID, testDeveloper2ID}, userID)
		assert.Equal(t, "proposed", status)
		assert.Equal(t, "skill_match", strategy)
		assert.Greater(t, score, 0.0)
		assert.LessOrEqual(t, score, 1.0)

		proposalCount++
	}

	assert.Equal(t, 2, proposalCount, "Should create proposals for both developers")

	// Verify mock was called
	mockUserClient.AssertExpectations(t)
}

// Test findSuitableDevelopers method
func TestOrchestratorServer_FindSuitableDevelopers(t *testing.T) {
	mockUserClient := &MockUserServiceClient{}
	server, db, nc := createTestServer(t, mockUserClient)
	defer db.Close()
	defer nc.Close()

	t.Run("success case", func(t *testing.T) {
		// Test developers
		testDeveloperID := "550e8400-e29b-41d4-a716-446655440012"
		testDevelopers := []*usersv1.DeveloperProfile{
			{
				UserId:     testDeveloperID,
				SkillTags:  []string{"go", "react"},
				HourlyRate: 50.0,
				Rating:     4.5,
			},
		}

		// Mock UserService response
		mockUserClient.On("ListOnlineDevelopers", mock.Anything, mock.MatchedBy(func(req *usersv1.ListOnlineDevelopersRequest) bool {
			return len(req.SkillTags) == 2 &&
				req.SkillTags[0] == "go" &&
				req.SkillTags[1] == "react" &&
				req.BudgetLowerBound == 40.0 &&
				req.BudgetUpperBound == 60.0 &&
				req.Limit == 5
		})).Return(&usersv1.ListOnlineDevelopersResponse{
			Developers: testDevelopers,
		}, nil).Once()

		// Create test task
		task := &eventsv1.TaskCreated{
			TaskId:           "550e8400-e29b-41d4-a716-446655440003",
			SkillTags:        []string{"go", "react"},
			BudgetLowerBound: 40.0,
			BudgetUpperBound: 60.0,
		}

		// Test findSuitableDevelopers
		developers, err := server.findSuitableDevelopers(task)

		assert.NoError(t, err)
		assert.Len(t, developers, 1)
		assert.Equal(t, testDeveloperID, developers[0].UserId)
	})

	t.Run("empty result case", func(t *testing.T) {
		// Mock empty response
		mockUserClient.On("ListOnlineDevelopers", mock.Anything, mock.Anything).Return(
			&usersv1.ListOnlineDevelopersResponse{
				Developers: []*usersv1.DeveloperProfile{},
			}, nil).Once()

		task := &eventsv1.TaskCreated{
			TaskId:    "550e8400-e29b-41d4-a716-446655440004",
			SkillTags: []string{"ruby", "rails"},
		}

		developers, err := server.findSuitableDevelopers(task)

		assert.NoError(t, err)
		assert.Len(t, developers, 0)
	})

	mockUserClient.AssertExpectations(t)
}

// Test createProposal method
func TestOrchestratorServer_CreateProposal(t *testing.T) {
	mockUserClient := &MockUserServiceClient{}
	server, db, nc := createTestServer(t, mockUserClient)
	defer db.Close()
	defer nc.Close()

	// Clean up before test
	testTaskID := "550e8400-e29b-41d4-a716-446655440005"
	testUserID := "550e8400-e29b-41d4-a716-446655440006"
	_, err := db.Exec(`DELETE FROM proposals WHERE task_id = $1`, testTaskID)
	require.NoError(t, err)

	// Test proposal creation
	err = server.createProposal(testTaskID, testUserID, 0.85)
	assert.NoError(t, err)

	// Verify proposal was inserted
	var count int
	err = db.QueryRow(`SELECT COUNT(*) FROM proposals WHERE task_id = $1 AND user_id = $2`,
		testTaskID, testUserID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 1, count)

	// Verify proposal details
	var proposalID, status, strategy string
	var score float64
	var expiresAt time.Time

	err = db.QueryRow(`
		SELECT proposal_id, score, status, strategy_used, expires_at 
		FROM proposals 
		WHERE task_id = $1 AND user_id = $2
	`, testTaskID, testUserID).Scan(&proposalID, &score, &status, &strategy, &expiresAt)

	require.NoError(t, err)
	assert.NotEmpty(t, proposalID)
	assert.Equal(t, 0.85, score)
	assert.Equal(t, "proposed", status)
	assert.Equal(t, "skill_match", strategy)
	assert.True(t, expiresAt.After(time.Now().Add(4*time.Minute)), "Should expire in ~5 minutes")
}

// Test calculateMatchScore method
func TestOrchestratorServer_CalculateMatchScore(t *testing.T) {
	mockUserClient := &MockUserServiceClient{}
	server, db, nc := createTestServer(t, mockUserClient)
	defer db.Close()
	defer nc.Close()

	task := &eventsv1.TaskCreated{
		SkillTags:        []string{"go", "postgresql", "docker"},
		BudgetLowerBound: 40.0,
		BudgetUpperBound: 80.0, // midpoint = 60
	}

	t.Run("perfect match", func(t *testing.T) {
		developer := &usersv1.DeveloperProfile{
			SkillTags:  []string{"go", "postgresql", "docker"},
			HourlyRate: 60.0, // exact budget midpoint
			Rating:     5.0,  // max rating
		}

		score := server.calculateMatchScore(task, developer)

		// Should be close to 1.0 (perfect match)
		assert.Greater(t, score, 0.9)
		assert.LessOrEqual(t, score, 1.0)
	})

	t.Run("partial skill match", func(t *testing.T) {
		developer := &usersv1.DeveloperProfile{
			SkillTags:  []string{"go", "react"}, // only 1 of 3 skills match
			HourlyRate: 60.0,
			Rating:     4.0,
		}

		score := server.calculateMatchScore(task, developer)

		// Should be lower due to partial skill match
		assert.Greater(t, score, 0.0)
		assert.Less(t, score, 0.7)
	})

	t.Run("budget mismatch", func(t *testing.T) {
		developer := &usersv1.DeveloperProfile{
			SkillTags:  []string{"go", "postgresql", "docker"},
			HourlyRate: 100.0, // way above budget
			Rating:     5.0,
		}

		score := server.calculateMatchScore(task, developer)

		// Should be lower due to budget mismatch
		assert.Greater(t, score, 0.0)
		assert.Less(t, score, 0.85)
	})

	t.Run("no skills required", func(t *testing.T) {
		taskNoSkills := &eventsv1.TaskCreated{
			SkillTags:        []string{}, // no skills required
			BudgetLowerBound: 40.0,
			BudgetUpperBound: 80.0,
		}

		developer := &usersv1.DeveloperProfile{
			SkillTags:  []string{"anything"},
			HourlyRate: 60.0,
			Rating:     4.0,
		}

		score := server.calculateMatchScore(taskNoSkills, developer)

		// Skill score should be 1.0 when no skills required
		assert.Greater(t, score, 0.8)
	})
}

// Test intersectSkills method
func TestOrchestratorServer_IntersectSkills(t *testing.T) {
	mockUserClient := &MockUserServiceClient{}
	server, db, nc := createTestServer(t, mockUserClient)
	defer db.Close()
	defer nc.Close()

	t.Run("exact match", func(t *testing.T) {
		skills1 := []string{"go", "postgresql"}
		skills2 := []string{"go", "postgresql"}

		intersection := server.intersectSkills(skills1, skills2)
		assert.Equal(t, 2, len(intersection))
	})

	t.Run("partial match", func(t *testing.T) {
		skills1 := []string{"go", "postgresql", "docker"}
		skills2 := []string{"go", "react", "typescript"}

		intersection := server.intersectSkills(skills1, skills2)
		assert.Equal(t, 1, len(intersection))
		assert.Equal(t, "go", intersection[0])
	})

	t.Run("no match", func(t *testing.T) {
		skills1 := []string{"go", "postgresql"}
		skills2 := []string{"python", "django"}

		intersection := server.intersectSkills(skills1, skills2)
		assert.Equal(t, 0, len(intersection))
	})

	t.Run("case insensitive", func(t *testing.T) {
		skills1 := []string{"Go", "PostgreSQL"}
		skills2 := []string{"go", "postgresql"}

		intersection := server.intersectSkills(skills1, skills2)
		assert.Equal(t, 2, len(intersection))
	})
}

// Integration test - full pipeline
func TestOrchestratorServer_IntegrationFlow(t *testing.T) {
	mockUserClient := &MockUserServiceClient{}
	server, db, nc := createTestServer(t, mockUserClient)
	defer db.Close()
	defer nc.Close()

	// Clean up test data
	testTaskID := "550e8400-e29b-41d4-a716-446655440007"
	testClientID := "550e8400-e29b-41d4-a716-446655440008"
	_, err := db.Exec(`DELETE FROM proposals WHERE task_id = $1`, testTaskID)
	require.NoError(t, err)

	// Create test developers
	integrationDev1ID := "550e8400-e29b-41d4-a716-446655440013"
	integrationDev2ID := "550e8400-e29b-41d4-a716-446655440014"
	testDevelopers := []*usersv1.DeveloperProfile{
		{
			UserId:     integrationDev1ID,
			SkillTags:  []string{"go", "microservices"},
			HourlyRate: 65.0,
			Rating:     4.7,
		},
		{
			UserId:     integrationDev2ID,
			SkillTags:  []string{"go", "kubernetes"},
			HourlyRate: 75.0,
			Rating:     4.9,
		},
	}

	// Mock UserService
	mockUserClient.On("ListOnlineDevelopers", mock.Anything, mock.Anything).Return(
		&usersv1.ListOnlineDevelopersResponse{
			Developers: testDevelopers,
		}, nil)

	// Start event listener
	err = server.StartEventListener(context.Background())
	require.NoError(t, err)

	// Subscribe to match.proposed events to verify they're published
	matchEvents := make(chan *nats.Msg, 10)
	_, err = nc.Subscribe("match.proposed", func(msg *nats.Msg) {
		matchEvents <- msg
	})
	require.NoError(t, err)

	// Simulate TaskCreated event from Task Service
	taskEvent := &eventsv1.TaskCreated{
		TaskId:           testTaskID,
		ClientId:         testClientID,
		Title:            "Integration Test Task",
		Description:      "Full pipeline test",
		SkillTags:        []string{"go", "microservices"},
		BudgetLowerBound: 60.0,
		BudgetUpperBound: 80.0,
		Status:           commonv1.TaskLifecycleStatus_TASK_LIFECYCLE_STATUS_OPEN,
		OccurredAt:       timestamppb.New(time.Now()),
	}

	eventData, err := json.Marshal(taskEvent)
	require.NoError(t, err)

	// Publish task.created event
	err = nc.Publish("task.created", eventData)
	require.NoError(t, err)

	// Wait for processing
	time.Sleep(1 * time.Second)

	// Verify proposals were created
	var proposalCount int
	err = db.QueryRow(`SELECT COUNT(*) FROM proposals WHERE task_id = $1`, testTaskID).Scan(&proposalCount)
	require.NoError(t, err)
	assert.Equal(t, 2, proposalCount, "Should create proposals for both developers")

	// Verify match.proposed events were published
	timeout := time.After(2 * time.Second)
	receivedEvents := 0

eventLoop:
	for {
		select {
		case <-matchEvents:
			receivedEvents++
			if receivedEvents >= 2 {
				break eventLoop
			}
		case <-timeout:
			break eventLoop
		}
	}

	assert.GreaterOrEqual(t, receivedEvents, 2, "Should receive match.proposed events")

	// Verify mock was called
	mockUserClient.AssertExpectations(t)
}
