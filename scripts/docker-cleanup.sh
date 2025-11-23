#!/bin/bash
# ============================================================================
# Docker Cleanup and Optimization Script
# ============================================================================
# Comprehensive cleanup of Docker resources and optimization
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE} Docker Cleanup and Optimization Script${NC}"
echo -e "${BLUE}============================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running. Starting cleanup..."

# ============================================================================
# STOP AND REMOVE CONTAINERS
# ============================================================================
print_status "Stopping and removing containers..."

# Stop all containers for this project
docker-compose -f docker-compose.yml down --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Remove any dangling containers
DANGLING_CONTAINERS=$(docker ps -aq --filter "status=exited")
if [ ! -z "$DANGLING_CONTAINERS" ]; then
    print_status "Removing exited containers..."
    docker rm $DANGLING_CONTAINERS
else
    print_status "No exited containers to remove."
fi

# ============================================================================
# REMOVE UNUSED IMAGES
# ============================================================================
print_status "Cleaning up Docker images..."

# Remove dangling images
DANGLING_IMAGES=$(docker images -f "dangling=true" -q)
if [ ! -z "$DANGLING_IMAGES" ]; then
    print_status "Removing dangling images..."
    docker rmi $DANGLING_IMAGES
else
    print_status "No dangling images to remove."
fi

# Remove unused images (optional - uncomment if needed)
# print_warning "Removing all unused images..."
# docker image prune -a -f

# ============================================================================
# CLEAN UP VOLUMES (CAREFUL!)
# ============================================================================
print_warning "Cleaning up unused volumes..."
print_warning "This will NOT remove named volumes used by the application."

# Remove only anonymous volumes
docker volume prune -f

# List current volumes for reference
print_status "Current named volumes:"
docker volume ls --filter "name=p2p_procurement"

# ============================================================================
# CLEAN UP NETWORKS
# ============================================================================
print_status "Cleaning up unused networks..."
docker network prune -f

# ============================================================================
# CLEAN UP BUILD CACHE
# ============================================================================
print_status "Cleaning up build cache..."
docker builder prune -f

# ============================================================================
# SYSTEM CLEANUP
# ============================================================================
print_status "Running system-wide cleanup..."
docker system prune -f

# ============================================================================
# REBUILD IMAGES WITH OPTIMIZATIONS
# ============================================================================
read -p "Do you want to rebuild all images with optimizations? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Rebuilding images with optimizations..."
    
    # Build with no cache for fresh start
    docker-compose build --no-cache --parallel
    
    print_status "Images rebuilt successfully!"
else
    print_status "Skipping image rebuild."
fi

# ============================================================================
# DISPLAY CLEANUP SUMMARY
# ============================================================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE} Cleanup Summary${NC}"
echo -e "${BLUE}============================================${NC}"

print_status "Docker system information:"
docker system df

echo -e "${BLUE}============================================${NC}"
print_status "Cleanup completed successfully!"
print_status "You can now start your services with:"
print_status "  Development: docker-compose up -d"
print_status "  Production:  docker-compose -f docker-compose.prod.yml up -d"
echo -e "${BLUE}============================================${NC}"