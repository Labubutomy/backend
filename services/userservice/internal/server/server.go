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
	usersv1 "github.com/Labubutomy/backend/proto/gen/go/platform/users/v1"
)

// UserServiceServer implements the UserService gRPC API
type UserServiceServer struct {
	usersv1.UnimplementedUserServiceServer

	logger   *zap.Logger
	db       *sql.DB
	natsConn *nats.Conn
}

// Config holds the configuration for the user service
type Config struct {
	Logger   *zap.Logger
	DB       *sql.DB
	NATSConn *nats.Conn
}

// New creates a new UserServiceServer instance
func New(cfg Config) *UserServiceServer {
	return &UserServiceServer{
		logger:   cfg.Logger,
		db:       cfg.DB,
		natsConn: cfg.NATSConn,
	}
}

// CreateDeveloperProfile creates a new developer profile
func (s *UserServiceServer) CreateDeveloperProfile(ctx context.Context, req *usersv1.CreateDeveloperProfileRequest) (*usersv1.CreateDeveloperProfileResponse, error) {
	userID := uuid.New().String()

	// Create user first
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO users (user_id, email, created_at) 
		VALUES ($1, $2, NOW())
	`, userID, req.Email)
	if err != nil {
		s.logger.Error("failed to create user", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "failed to create user: %v", err)
	}

	// Create developer profile
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO developer_profiles (
			user_id, display_name, email, skill_tags, hourly_rate,
			rating, presence_status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, 4.0, 'offline', NOW(), NOW())
	`, userID, req.DisplayName, req.Email, pq.Array(req.SkillTags), req.HourlyRate)
	if err != nil {
		s.logger.Error("failed to create developer profile", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "failed to create developer profile: %v", err)
	}

	// Publish event - using existing UserProfileUpdated as closest match
	event := &eventsv1.UserProfileUpdated{
		UserId:     userID,
		SkillTags:  req.SkillTags,
		HourlyRate: req.HourlyRate,
		OccurredAt: timestamppb.Now(),
	}

	if err := s.publishEvent("user.created", event); err != nil {
		s.logger.Warn("failed to publish user.created event", zap.Error(err))
		// Don't fail the request, just log the warning
	}

	profile := &usersv1.DeveloperProfile{
		UserId:      userID,
		DisplayName: req.DisplayName,
		Email:       req.Email,
		SkillTags:   req.SkillTags,
		HourlyRate:  req.HourlyRate,
		Rating:      4.0,
		Presence:    commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_OFFLINE,
		UpdatedAt:   timestamppb.Now(),
	}

	return &usersv1.CreateDeveloperProfileResponse{
		Profile: profile,
	}, nil
}

// UpdateDeveloperProfile updates an existing developer profile
func (s *UserServiceServer) UpdateDeveloperProfile(ctx context.Context, req *usersv1.UpdateDeveloperProfileRequest) (*emptypb.Empty, error) {
	_, err := s.db.ExecContext(ctx, `
		UPDATE developer_profiles 
		SET skill_tags = $2, hourly_rate = $3, updated_at = NOW()
		WHERE user_id = $1
	`, req.UserId, pq.Array(req.SkillTags), req.HourlyRate)

	if err != nil {
		s.logger.Error("failed to update developer profile", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "failed to update profile: %v", err)
	}

	// Publish event using UserProfileUpdated
	event := &eventsv1.UserProfileUpdated{
		UserId:     req.UserId,
		SkillTags:  req.SkillTags,
		HourlyRate: req.HourlyRate,
		OccurredAt: timestamppb.Now(),
	}

	if err := s.publishEvent("user.updated", event); err != nil {
		s.logger.Warn("failed to publish user.updated event", zap.Error(err))
	}

	return &emptypb.Empty{}, nil
}

// UpdatePresence updates user presence status
func (s *UserServiceServer) UpdatePresence(ctx context.Context, req *usersv1.UpdatePresenceRequest) (*emptypb.Empty, error) {
	presenceStr := req.Presence.String()

	// Get current profile for skills and rating
	var skillTags pq.StringArray
	var rating float64
	err := s.db.QueryRowContext(ctx, `
		SELECT skill_tags, rating FROM developer_profiles WHERE user_id = $1
	`, req.UserId).Scan(&skillTags, &rating)

	if err != nil {
		s.logger.Error("failed to get user profile", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "failed to get user profile: %v", err)
	}

	_, err = s.db.ExecContext(ctx, `
		UPDATE developer_profiles 
		SET presence_status = $2, last_active = NOW(), updated_at = NOW()
		WHERE user_id = $1
	`, req.UserId, presenceStr)

	if err != nil {
		s.logger.Error("failed to update presence", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "failed to update presence: %v", err)
	}

	// Publish presence event with correct fields
	event := &eventsv1.UserPresenceChangedEvent{
		UserId:    req.UserId,
		Status:    req.Presence,
		SkillTags: skillTags,
		Rating:    rating,
		Timestamp: timestamppb.Now(),
	}

	if err := s.publishEvent("user.presence.changed", event); err != nil {
		s.logger.Warn("failed to publish user.presence.changed event", zap.Error(err))
	}

	return &emptypb.Empty{}, nil
}

// ListOnlineDevelopers returns a list of online developers matching criteria
func (s *UserServiceServer) ListOnlineDevelopers(ctx context.Context, req *usersv1.ListOnlineDevelopersRequest) (*usersv1.ListOnlineDevelopersResponse, error) {
	limit := req.Limit
	if limit == 0 {
		limit = 50 // default limit
	}

	query := `
		SELECT user_id, display_name, email, skill_tags, hourly_rate, rating, presence_status, updated_at
		FROM developer_profiles 
		WHERE presence_status IN ('searching', 'idle')
		AND ($1::text[] IS NULL OR skill_tags && $1)
		AND hourly_rate >= $2 AND hourly_rate <= $3
		ORDER BY rating DESC, last_active DESC
		LIMIT $4
	`

	rows, err := s.db.QueryContext(ctx, query, pq.Array(req.SkillTags), req.BudgetLowerBound, req.BudgetUpperBound, limit)
	if err != nil {
		s.logger.Error("failed to query developers", zap.Error(err))
		return nil, status.Errorf(codes.Internal, "failed to query developers: %v", err)
	}
	defer rows.Close()

	var developers []*usersv1.DeveloperProfile
	for rows.Next() {
		var (
			userID, displayName, email, presenceStr string
			skillTags                               pq.StringArray
			hourlyRate, rating                      float64
			updatedAt                               time.Time
		)

		if err := rows.Scan(&userID, &displayName, &email, &skillTags, &hourlyRate, &rating, &presenceStr, &updatedAt); err != nil {
			s.logger.Error("failed to scan developer", zap.Error(err))
			continue
		}

		// Convert presence status
		presence := commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_OFFLINE
		switch presenceStr {
		case "searching":
			presence = commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_SEARCHING
		case "idle":
			presence = commonv1.UserPresenceStatus_USER_PRESENCE_STATUS_IDLE
		}

		developers = append(developers, &usersv1.DeveloperProfile{
			UserId:      userID,
			DisplayName: displayName,
			Email:       email,
			SkillTags:   skillTags,
			HourlyRate:  hourlyRate,
			Rating:      rating,
			Presence:    presence,
			UpdatedAt:   timestamppb.New(updatedAt),
		})
	}

	return &usersv1.ListOnlineDevelopersResponse{
		Developers: developers,
	}, nil
}

// publishEvent publishes an event to NATS
func (s *UserServiceServer) publishEvent(subject string, event interface{}) error {
	if s.natsConn == nil {
		return fmt.Errorf("NATS connection not initialized")
	}

	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	return s.natsConn.Publish(subject, data)
}
