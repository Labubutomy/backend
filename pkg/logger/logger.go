package logger

import "go.uber.org/zap"

// New creates a production zap logger enriched with the service name field.
func New(service string) (*zap.Logger, error) {
	base, err := zap.NewProduction()
	if err != nil {
		return nil, err
	}
	return base.With(zap.String("service", service)), nil
}
