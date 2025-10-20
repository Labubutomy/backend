#!/bin/bash
# Script to install Gateway service dependencies

set -e

echo "Installing Gateway service dependencies..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is not installed"
    exit 1
fi

# Install Python dependencies for Gateway service
cd services/gateway
pip3 install -r requirements.txt

echo "Gateway dependencies installed successfully!"
echo "You can now run: make dev"
