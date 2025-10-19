package grpcserver

import (
	"context"
	"fmt"
	"net"
	"time"

	"go.uber.org/zap"
	"google.golang.org/grpc"
)

// Config contains the parameters required to launch a gRPC server instance.
type Config struct {
	Name     string
	Port     string
	Options  []grpc.ServerOption
	Register func(*grpc.Server) error
}

// Run starts a gRPC server, waits for the parent context to be cancelled, and then
// attempts a graceful shutdown. Use a context created with signal.NotifyContext.
func Run(ctx context.Context, logger *zap.Logger, cfg Config) error {
	if cfg.Port == "" {
		cfg.Port = "50051"
	}

	listener, err := net.Listen("tcp", ":"+cfg.Port)
	if err != nil {
		return fmt.Errorf("listen on port %s: %w", cfg.Port, err)
	}

	server := grpc.NewServer(cfg.Options...)
	if cfg.Register != nil {
		if err := cfg.Register(server); err != nil {
			return fmt.Errorf("register services: %w", err)
		}
	}

	shutdownCh := make(chan struct{})

	go func() {
		<-ctx.Done()
		logger.Info("shutting down gRPC server", zap.String("service", cfg.Name))

		done := make(chan struct{})
		go func() {
			server.GracefulStop()
			close(done)
		}()

		select {
		case <-done:
		case <-time.After(10 * time.Second):
			logger.Warn("forcing gRPC shutdown", zap.String("service", cfg.Name))
			server.Stop()
		}

		close(shutdownCh)
	}()

	logger.Info("gRPC server listening", zap.String("service", cfg.Name), zap.String("port", cfg.Port))
	if err := server.Serve(listener); err != nil {
		return fmt.Errorf("serve gRPC: %w", err)
	}

	<-shutdownCh
	return nil
}
