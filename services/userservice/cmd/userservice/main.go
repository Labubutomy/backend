package main

import (
	"context"
	"database/sql"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/lib/pq"
	"github.com/nats-io/nats.go"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	"github.com/Labubutomy/backend/pkg/logger"
	"github.com/Labubutomy/backend/pkg/runtime/grpcserver"
	usersv1 "github.com/Labubutomy/backend/proto/gen/go/platform/users/v1"
	"github.com/Labubutomy/backend/services/userservice/internal/server"
)

const serviceName = "user-service"

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log, err := logger.New(serviceName)
	if err != nil {
		panic(err)
	}
	defer func() { _ = log.Sync() }()

	// Initialize database connection
	dbURL := getEnvOrDefault("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/freelance_platform?sslmode=disable")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Test database connection
	if err := db.PingContext(ctx); err != nil {
		log.Fatal("failed to ping database", zap.Error(err))
	}

	// Initialize NATS connection
	natsURL := getEnvOrDefault("NATS_URL", "nats://localhost:4222")
	natsConn, err := nats.Connect(natsURL)
	if err != nil {
		log.Fatal("failed to connect to NATS", zap.Error(err))
	}
	defer natsConn.Close()

	// Create user service
	userService := server.New(server.Config{
		Logger:   log,
		DB:       db,
		NATSConn: natsConn,
	})

	port := getEnvOrDefault("GRPC_PORT", "50051")

	if err := grpcserver.Run(ctx, log, grpcserver.Config{
		Name: serviceName,
		Port: port,
		Register: func(s *grpc.Server) error {
			usersv1.RegisterUserServiceServer(s, userService)
			return nil
		},
	}); err != nil {
		log.Error("gRPC server stopped with error", zap.Error(err))
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
