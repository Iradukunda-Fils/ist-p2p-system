# ============================================================================
# Docker Cleanup and Optimization Script (PowerShell)
# ============================================================================
# Comprehensive cleanup of Docker resources and optimization for Windows
# ============================================================================

param(
    [switch]$Force,
    [switch]$RebuildImages
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

Write-Host "============================================" -ForegroundColor $Blue
Write-Host " Docker Cleanup and Optimization Script" -ForegroundColor $Blue
Write-Host "============================================" -ForegroundColor $Blue

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Status "Docker is running. Starting cleanup..."
} catch {
    Write-Error "Docker is not running. Please start Docker and try again."
    exit 1
}

# ============================================================================
# STOP AND REMOVE CONTAINERS
# ============================================================================
Write-Status "Stopping and removing containers..."

# Stop all containers for this project
try {
    docker-compose -f docker-compose.yml down --remove-orphans 2>$null
} catch {
    Write-Warning "Could not stop development containers (may not be running)"
}

try {
    docker-compose -f docker-compose.prod.yml down --remove-orphans 2>$null
} catch {
    Write-Warning "Could not stop production containers (may not be running)"
}

# Remove any dangling containers
$danglingContainers = docker ps -aq --filter "status=exited"
if ($danglingContainers) {
    Write-Status "Removing exited containers..."
    docker rm $danglingContainers
} else {
    Write-Status "No exited containers to remove."
}

# ============================================================================
# REMOVE UNUSED IMAGES
# ============================================================================
Write-Status "Cleaning up Docker images..."

# Remove dangling images
$danglingImages = docker images -f "dangling=true" -q
if ($danglingImages) {
    Write-Status "Removing dangling images..."
    docker rmi $danglingImages
} else {
    Write-Status "No dangling images to remove."
}

# ============================================================================
# CLEAN UP VOLUMES (CAREFUL!)
# ============================================================================
Write-Warning "Cleaning up unused volumes..."
Write-Warning "This will NOT remove named volumes used by the application."

# Remove only anonymous volumes
docker volume prune -f

# List current volumes for reference
Write-Status "Current named volumes:"
docker volume ls --filter "name=p2p_procurement"

# ============================================================================
# CLEAN UP NETWORKS
# ============================================================================
Write-Status "Cleaning up unused networks..."
docker network prune -f

# ============================================================================
# CLEAN UP BUILD CACHE
# ============================================================================
Write-Status "Cleaning up build cache..."
docker builder prune -f

# ============================================================================
# SYSTEM CLEANUP
# ============================================================================
Write-Status "Running system-wide cleanup..."
docker system prune -f

# ============================================================================
# REBUILD IMAGES WITH OPTIMIZATIONS
# ============================================================================
if ($RebuildImages -or (!$Force)) {
    $rebuild = Read-Host "Do you want to rebuild all images with optimizations? (y/N)"
    if ($rebuild -eq "y" -or $rebuild -eq "Y") {
        Write-Status "Rebuilding images with optimizations..."
        
        # Build with no cache for fresh start
        docker-compose build --no-cache --parallel
        
        Write-Status "Images rebuilt successfully!"
    } else {
        Write-Status "Skipping image rebuild."
    }
}

# ============================================================================
# DISPLAY CLEANUP SUMMARY
# ============================================================================
Write-Host "============================================" -ForegroundColor $Blue
Write-Host " Cleanup Summary" -ForegroundColor $Blue
Write-Host "============================================" -ForegroundColor $Blue

Write-Status "Docker system information:"
docker system df

Write-Host "============================================" -ForegroundColor $Blue
Write-Status "Cleanup completed successfully!"
Write-Status "You can now start your services with:"
Write-Status "  Development: docker-compose up -d"
Write-Status "  Production:  docker-compose -f docker-compose.prod.yml up -d"
Write-Host "============================================" -ForegroundColor $Blue