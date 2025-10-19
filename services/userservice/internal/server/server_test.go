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
	usersv1 "github.com/Labubutomy/backend/proto/gen/go/platform/users/v1"
)

// Setup helper function
func setupTestServer(t *testing.T) (*UserServiceServer, sqlmock.Sqlmock) {
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

func TestUserServiceServer_CreateDeveloperProfile(t *testing.T) {
	tests := []struct {
		name           string
		request        *usersv1.CreateDeveloperProfileRequest
		setupMock      func(mock sqlmock.Sqlmock)
		expectedError  bool
		expectedCode   codes.Code
		validateResult func(t *testing.T, resp *usersv1.CreateDeveloperProfileResponse)
	}{
		{
			name: "successful_profile_creation",
			request: &usersv1.CreateDeveloperProfileRequest{
				DisplayName: "John Developer",
				Email:       "john@example.com",
				SkillTags:   []string{"golang", "postgresql", "grpc"},
				HourlyRate:  75.0,
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				// Expect user creation
				mock.ExpectExec("INSERT INTO users").
					WithArgs(sqlmock.AnyArg(), "john@example.com").
					WillReturnResult(sqlmock.NewResult(1, 1))

				// Expect developer profile creation
				mock.ExpectExec("INSERT INTO developer_profiles").
					WithArgs(sqlmock.AnyArg(), "John Developer", "john@example.com",
						pq.Array([]string{"golang", "postgresql", "grpc"}), 75.0).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			expectedError: false,
			validateResult: func(t *testing.T, resp *usersv1.CreateDeveloperProfileResponse) {
				assert.NotNil(t, resp.Profile)
				assert.NotEmpty(t, resp.Profile.UserId)
				assert.Equal(t, "John Developer", resp.Profile.DisplayName)
				assert.Equal(t, "john@example.com", resp.Profile.Email)
				assert.Equal(t, []string{"golang", "postgresql", "grpc"}, resp.Profile.SkillTags)
				assert.Equal(t, 75.0, resp.Profile.HourlyRate)
				assert.Equal(t, 4.0, resp.Profile.Rating)
				assert.Equal(t, commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_OFFLINE, resp.Profile.Presence)
			},
		},
		{
			name: "database_error_on_user_creation",
			request: &usersv1.CreateDeveloperProfileRequest{
				DisplayName: "John Developer",
				Email:       "john@example.com",
				SkillTags:   []string{"golang"},
				HourlyRate:  75.0,
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				// User creation fails
				mock.ExpectExec("INSERT INTO users").
					WithArgs(sqlmock.AnyArg(), "john@example.com").
					WillReturnError(sql.ErrConnDone)
			},
			expectedError: true,
			expectedCode:  codes.Internal,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, mock := setupTestServer(t)
			defer func() {
				assert.NoError(t, mock.ExpectationsWereMet())
			}()

			tt.setupMock(mock)

			resp, err := server.CreateDeveloperProfile(context.Background(), tt.request)

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

func TestUserServiceServer_ListOnlineDevelopers(t *testing.T) {
	tests := []struct {
		name           string
		request        *usersv1.ListOnlineDevelopersRequest
		setupMock      func(mock sqlmock.Sqlmock)
		expectedError  bool
		expectedCode   codes.Code
		validateResult func(t *testing.T, resp *usersv1.ListOnlineDevelopersResponse)
	}{
		{
			name: "successful_developer_listing",
			request: &usersv1.ListOnlineDevelopersRequest{
				SkillTags:        []string{"golang", "postgresql"},
				BudgetLowerBound: 50.0,
				BudgetUpperBound: 150.0,
				Limit:            10,
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{
					"user_id", "display_name", "email", "skill_tags",
					"hourly_rate", "rating", "presence_status", "updated_at",
				}).
					AddRow("user-1", "John Doe", "john@example.com",
						pq.Array([]string{"golang", "postgresql"}), 75.0, 4.5, "searching", time.Now()).
					AddRow("user-2", "Jane Smith", "jane@example.com",
						pq.Array([]string{"golang", "docker"}), 85.0, 4.8, "idle", time.Now())

				mock.ExpectQuery("SELECT (.+) FROM developer_profiles").
					WithArgs(pq.Array([]string{"golang", "postgresql"}), 50.0, 150.0, int32(10)).
					WillReturnRows(rows)
			},
			expectedError: false,
			validateResult: func(t *testing.T, resp *usersv1.ListOnlineDevelopersResponse) {
				assert.Len(t, resp.Developers, 2)

				dev1 := resp.Developers[0]
				assert.Equal(t, "user-1", dev1.UserId)
				assert.Equal(t, "John Doe", dev1.DisplayName)
				assert.Equal(t, "john@example.com", dev1.Email)
				assert.Equal(t, []string{"golang", "postgresql"}, dev1.SkillTags)
				assert.Equal(t, 75.0, dev1.HourlyRate)
				assert.Equal(t, 4.5, dev1.Rating)
				assert.Equal(t, commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_SEARCHING, dev1.Presence)

				dev2 := resp.Developers[1]
				assert.Equal(t, "user-2", dev2.UserId)
				assert.Equal(t, commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_IDLE, dev2.Presence)
			},
		},
		{
			name: "database_query_error",
			request: &usersv1.ListOnlineDevelopersRequest{
				SkillTags:        []string{"golang"},
				BudgetLowerBound: 50.0,
				BudgetUpperBound: 150.0,
				Limit:            10,
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT (.+) FROM developer_profiles").
					WithArgs(pq.Array([]string{"golang"}), 50.0, 150.0, int32(10)).
					WillReturnError(sql.ErrConnDone)
			},
			expectedError: true,
			expectedCode:  codes.Internal,
		},
		{
			name: "empty_result_set",
			request: &usersv1.ListOnlineDevelopersRequest{
				SkillTags:        []string{"rare-skill"},
				BudgetLowerBound: 200.0,
				BudgetUpperBound: 300.0,
				Limit:            10,
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				rows := sqlmock.NewRows([]string{
					"user_id", "display_name", "email", "skill_tags",
					"hourly_rate", "rating", "presence_status", "updated_at",
				}) // Empty result set

				mock.ExpectQuery("SELECT (.+) FROM developer_profiles").
					WithArgs(pq.Array([]string{"rare-skill"}), 200.0, 300.0, int32(10)).
					WillReturnRows(rows)
			},
			expectedError: false,
			validateResult: func(t *testing.T, resp *usersv1.ListOnlineDevelopersResponse) {
				assert.Len(t, resp.Developers, 0)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, mock := setupTestServer(t)
			defer func() {
				assert.NoError(t, mock.ExpectationsWereMet())
			}()

			tt.setupMock(mock)

			resp, err := server.ListOnlineDevelopers(context.Background(), tt.request)

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

func TestUserServiceServer_UpdatePresence(t *testing.T) {
	tests := []struct {
		name          string
		request       *usersv1.UpdatePresenceRequest
		setupMock     func(mock sqlmock.Sqlmock)
		expectedError bool
		expectedCode  codes.Code
	}{
		{
			name: "successful_presence_update",
			request: &usersv1.UpdatePresenceRequest{
				UserId:   "user-123",
				Presence: commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_SEARCHING,
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				// Expect query to get current profile
				rows := sqlmock.NewRows([]string{"skill_tags", "rating"}).
					AddRow(pq.Array([]string{"golang", "postgresql"}), 4.5)
				mock.ExpectQuery("SELECT skill_tags, rating FROM developer_profiles").
					WithArgs("user-123").
					WillReturnRows(rows)

				// Expect presence update
				mock.ExpectExec("UPDATE developer_profiles").
					WithArgs("user-123", "USER_PRESENCE_STATUS_SEARCHING").
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			expectedError: false,
		},
		{
			name: "user_not_found",
			request: &usersv1.UpdatePresenceRequest{
				UserId:   "non-existent-user",
				Presence: commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_IDLE,
			},
			setupMock: func(mock sqlmock.Sqlmock) {
				// Query returns no rows
				mock.ExpectQuery("SELECT skill_tags, rating FROM developer_profiles").
					WithArgs("non-existent-user").
					WillReturnError(sql.ErrNoRows)
			},
			expectedError: true,
			expectedCode:  codes.Internal,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, mock := setupTestServer(t)
			defer func() {
				assert.NoError(t, mock.ExpectationsWereMet())
			}()

			tt.setupMock(mock)

			resp, err := server.UpdatePresence(context.Background(), tt.request)

			if tt.expectedError {
				assert.Error(t, err)
				if tt.expectedCode != codes.OK {
					assert.Equal(t, tt.expectedCode, status.Code(err))
				}
				assert.Nil(t, resp)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, resp)
			}
		})
	}
}

func TestUserServiceServer_publishEvent(t *testing.T) {
	t.Run("nil_connection", func(t *testing.T) {
		server := &UserServiceServer{
			logger:   zaptest.NewLogger(t),
			natsConn: nil,
		}

		err := server.publishEvent("user.created", map[string]string{"test": "data"})
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "NATS connection not initialized")
	})

	t.Run("marshal_error", func(t *testing.T) {
		server := &UserServiceServer{
			logger:   zaptest.NewLogger(t),
			natsConn: nil, // This will trigger the marshal error path when we fix the NATS check
		}

		// Use an invalid event that can't be marshaled (channel can't be marshaled to JSON)
		invalidEvent := make(chan int)

		err := server.publishEvent("user.created", invalidEvent)
		assert.Error(t, err)
		// Since NATS connection is nil, it will error before marshaling
		assert.Contains(t, err.Error(), "NATS connection not initialized")
	})
}

// Benchmark test
func BenchmarkUserServiceServer_ListOnlineDevelopers(b *testing.B) {
	// Create a test instance
	server, mock := setupTestServer(&testing.T{})
	defer mock.ExpectationsWereMet()

	// Setup mock to return developers for each benchmark iteration
	for i := 0; i < b.N; i++ {
		rows := sqlmock.NewRows([]string{
			"user_id", "display_name", "email", "skill_tags",
			"hourly_rate", "rating", "presence_status", "updated_at",
		})

		// Add 10 developers for realistic benchmark
		for j := 0; j < 10; j++ {
			rows.AddRow(
				"user-"+string(rune('A'+j)),
				"Developer "+string(rune('A'+j)),
				"dev"+string(rune('A'+j))+"@example.com",
				pq.Array([]string{"golang", "postgresql"}),
				75.0, 4.5, "searching", time.Now(),
			)
		}

		mock.ExpectQuery("SELECT (.+) FROM developer_profiles").
			WithArgs(pq.Array([]string{"golang"}), 50.0, 150.0, int32(10)).
			WillReturnRows(rows)
	}

	request := &usersv1.ListOnlineDevelopersRequest{
		SkillTags:        []string{"golang"},
		BudgetLowerBound: 50.0,
		BudgetUpperBound: 150.0,
		Limit:            10,
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_, err := server.ListOnlineDevelopers(context.Background(), request)
		if err != nil {
			b.Fatal(err)
		}
	}
}
