#!/bin/bash

# Check dependencies script

echo "Checking dependencies..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if migrate tool is installed
if ! command -v migrate &> /dev/null; then
    echo "❌ migrate tool is not installed. Installing..."
    go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
    if [ $? -ne 0 ]; then
        echo "Failed to install migrate tool. Please install manually:"
        echo "go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
        exit 1
    fi
fi

# Check if protoc is installed
if ! command -v protoc &> /dev/null; then
    echo "❌ protoc is not installed. Please install Protocol Buffers compiler."
    echo "On macOS: brew install protobuf"
    echo "On Ubuntu: sudo apt-get install protobuf-compiler"
    exit 1
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go."
    exit 1
fi

echo "✅ All dependencies are available!"
