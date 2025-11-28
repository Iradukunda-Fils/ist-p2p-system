# ============================================================================
# Nginx Gateway Dockerfile
# ============================================================================
# Optimized Nginx gateway for routing traffic to backend and frontend services
# ============================================================================

FROM nginx:1.25-alpine

LABEL maintainer="P2P Procurement Team"
LABEL description="Nginx gateway for P2P Procurement System"
LABEL version="1.0.0"

# Install additional tools
# Note: openssl only needed if generating SSL certs at runtime
RUN apk add --no-cache \
    curl \
    tzdata

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/* /etc/nginx/nginx.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create directories for SSL certificates and cache
RUN mkdir -p /etc/nginx/ssl \
    /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
    /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx

# Set proper permissions
RUN chmod 755 /etc/nginx/ssl

# Note: nginx -t test is skipped during build as upstream servers don't exist yet
# Configuration will be tested at runtime when services are available

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
