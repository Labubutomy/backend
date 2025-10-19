#!/bin/bash
# Setup environment for Go development
export PATH="/usr/local/go/bin:$PATH"
export GOPATH=$HOME/go
export PATH="$PATH:$GOPATH/bin"

# Add Docker to PATH
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

echo "Environment setup completed!"
echo "Go version: $(go version)"
echo "GOPATH: $GOPATH"
echo "PATH includes: /usr/local/go/bin and $GOPATH/bin"