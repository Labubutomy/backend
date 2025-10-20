#!/bin/bash

# DevMatch AI Frontend Build Script

set -e

echo "🚀 Building DevMatch AI Frontend..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t devmatch-web .

echo "✅ Build completed successfully!"
echo ""
echo "To run the application:"
echo "  docker run -p 80:80 devmatch-web"
echo ""
echo "Or use docker-compose:"
echo "  docker-compose up -d"
echo ""
echo "The application will be available at: http://localhost"
