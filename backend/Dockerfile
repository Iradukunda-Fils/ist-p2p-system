# ============================================================================
# Multi-Stage Dockerfile for Django P2P Procurement Backend
# ============================================================================
# Stage 1: Builder - Install dependencies and compile Python packages
# Stage 2: Runtime - Lean production image with only runtime dependencies
# ============================================================================

# ============================================================================
# STAGE 1: BUILDER
# ============================================================================
FROM python:3.12-slim AS builder

LABEL maintainer="P2P Procurement Team"
LABEL description="Builder stage for Django backend"

# Set environment variables for build
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    g++ \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements files
COPY requirements.txt requirements.production.txt /tmp/

# Install Python dependencies with optimizations
RUN pip install --upgrade pip setuptools wheel && \
    pip install -r /tmp/requirements.txt && \
    pip install -r /tmp/requirements.production.txt && \
    pip install psycopg2-binary && \
    # Clean up pip cache and temporary files
    pip cache purge && \
    find /opt/venv -name "*.pyc" -delete && \
    find /opt/venv -name "__pycache__" -type d -exec rm -rf {} + || true

# ============================================================================
# STAGE 2: RUNTIME
# ============================================================================
FROM python:3.12-slim AS runtime

LABEL maintainer="P2P Procurement Team"
LABEL description="Production runtime for Django backend"
LABEL version="1.0.0"

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=config.settings.production

# Install runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libjpeg62-turbo \
    zlib1g \
    libfreetype6 \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create application user (non-root for security)
RUN groupadd -r django && useradd -r -g django django

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=django:django ./src /app/src
COPY --chown=django:django ./docker-entrypoint.sh /app/docker-entrypoint.sh

# Create Django-specific directories (must be before USER switch)
RUN mkdir -p /app/src/static /app/src/temp_uploads /app/src/staticfiles /app/media /app/logs && \
    chown -R django:django /app/src /app/media /app/logs

# Make entrypoint executable
RUN chmod +x /app/docker-entrypoint.sh

# Switch to non-root user
USER django

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/', timeout=5)" || exit 1

# Set entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Default command (can be overridden)
CMD ["gunicorn", \
    "--bind", "0.0.0.0:8000", \
    "--workers", "4", \
    "--worker-class", "sync", \
    "--timeout", "300", \
    "--access-logfile", "-", \
    "--error-logfile", "-", \
    "--chdir", "/app/src", \
    "config.wsgi:application"]
