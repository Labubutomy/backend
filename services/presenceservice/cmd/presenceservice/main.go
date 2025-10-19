package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Labubutomy/backend/pkg/logger"
	"github.com/Labubutomy/backend/services/presenceservice/internal/server"
	"go.uber.org/zap"
)

const serviceName = "presence-service"

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log, err := logger.New(serviceName)
	if err != nil {
		panic(err)
	}
	defer func() { _ = log.Sync() }()

	addr := os.Getenv("HTTP_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	httpSrv := &http.Server{
		Addr:    addr,
		Handler: server.NewRouter(log),
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := httpSrv.Shutdown(shutdownCtx); err != nil {
			log.Warn("presence server shutdown with error", zap.Error(err))
		}
	}()

	log.Info("presence HTTP server listening", zap.String("addr", addr))
	if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Error("presence server failed", zap.Error(err))
	}
}
