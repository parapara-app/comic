#!/bin/bash

# Start production environment
echo "Starting production environment..."
cd infra/docker
docker-compose up --build