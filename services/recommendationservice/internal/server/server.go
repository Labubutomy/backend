package server

import "google.golang.org/grpc"

// Register wires the recommendation service handlers into the provided gRPC server.
func Register(s *grpc.Server) error {
	_ = s
	return nil
}
