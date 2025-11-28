# ============================================================================
# Multi-Stage Dockerfile for React/Vite Frontend
# ============================================================================
# Stage 1: Builder - Install dependencies and build production assets
# Stage 2: Nginx - Serve static files with nginx
# ============================================================================

# ============================================================================
# STAGE 1: BUILDER
# ============================================================================
FROM node:20-alpine AS builder

LABEL maintainer="P2P Procurement Team"
LABEL description="Builder stage for React frontend"

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with optimizations
# Note: npm ci installs all dependencies by default (including devDependencies)
RUN npm ci --prefer-offline --no-audit --no-fund && \
    npm cache clean --force

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_TITLE="P2P Procurement System"

# Set environment variables for build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_APP_TITLE=$VITE_APP_TITLE \
    NODE_ENV=production

# Build the application with optimizations
RUN npm run build && \
    # Remove source maps in production for security
    find dist -name "*.map" -type f -delete

# ============================================================================
# STAGE 2: NGINX SERVER
# ============================================================================
FROM nginx:1.25-alpine AS runtime

LABEL maintainer="P2P Procurement Team"
LABEL description="Production runtime for React frontend"
LABEL version="1.0.0"

# Install curl for healthchecks
RUN apk add --no-cache curl

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
