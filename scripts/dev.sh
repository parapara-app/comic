#!/bin/bash

# Start development environment
echo "Starting development environment..."
cd infra/docker
docker-compose -f docker-compose.dev.yml up