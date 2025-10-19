package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/Labubutomy/backend/pkg/logger"
	"github.com/Labubutomy/backend/pkg/runtime/grpcserver"
	"github.com/Labubutomy/backend/services/recommendationservice/internal/server"
	"go.uber.org/zap"
	"google.golang.org/grpc"
)

const serviceName = "recommendation-service"

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log, err := logger.New(serviceName)
	if err != nil {
		panic(err)
	}
	defer func() { _ = log.Sync() }()

	port := os.Getenv("GRPC_PORT")

	if err := grpcserver.Run(ctx, log, grpcserver.Config{
		Name: serviceName,
		Port: port,
		Register: func(s *grpc.Server) error {
			return server.Register(s)
		},
	}); err != nil {
		log.Error("gRPC server stopped with error", zap.Error(err))
	}
}
