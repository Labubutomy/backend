package server

import (
	"net/http"

	"go.uber.org/zap"
)

// NewRouter constructs the HTTP router responsible for tracking developer presence.
func NewRouter(logger *zap.Logger) http.Handler {
	mux := http.NewServeMux()

	// TODO: add WebSocket upgrade handler and heartbeat endpoints.
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	return mux
}
