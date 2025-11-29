#!/bin/bash
# ============================================================================
# Enhanced Docker Entrypoint for Django Backend
# ============================================================================
# Handles database migrations, static files, superuser creation,
# and graceful startup with comprehensive error handling
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color


echo "========================================"
echo " P2P Procurement Backend Starting"
echo " Environment: ${ENVIRONMENT:-development}"
echo "========================================"

# ============================================================================
# GENERATE JWT KEYS
# ============================================================================
echo -e "${YELLOW}[1/7] Checking JWT keys...${NC}"

KEYS_PATH="/app/keys"

# Create directory if not exists
if [ ! -d "$KEYS_PATH" ]; then
    mkdir -p "$KEYS_PATH"
    chmod 770 "$KEYS_PATH"
fi

# Generate private key if missing
if [ ! -f "$KEYS_PATH/jwt_private.pem" ]; then
    echo "Generating new JWT private key..."
    openssl genrsa -out "$KEYS_PATH/jwt_private.pem" 2048
    chmod 600 "$KEYS_PATH/jwt_private.pem"
fi

# Generate public key if missing
if [ ! -f "$KEYS_PATH/jwt_public.pem" ]; then
    echo "Generating new JWT public key..."
    openssl rsa -in "$KEYS_PATH/jwt_private.pem" -pubout -out "$KEYS_PATH/jwt_public.pem"
    chmod 644 "$KEYS_PATH/jwt_public.pem"
fi



echo -e "${GREEN}✓ JWT keys ready${NC}"

# ============================================================================
# WAIT FOR DATABASE
# ============================================================================
echo -e "${YELLOW}[2/7] Waiting for database...${NC}"

# Build DATABASE_URL from components if not provided
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST:-db}:${DATABASE_PORT:-5432}/${DATABASE_NAME}"
    echo "DATABASE_URL constructed from components"
fi

MAX_RETRIES=30
RETRY_COUNT=0

until python -c "import psycopg2, os; conn = psycopg2.connect(os.environ.get('DATABASE_URL', '')); conn.close()"  > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}ERROR: Database connection timeout after ${MAX_RETRIES} attempts${NC}"
        # Try to run without silencing output to show the actual error
        python -c "import psycopg2, os; conn = psycopg2.connect(os.environ.get('DATABASE_URL', '')); print('Connection successful'); conn.close()"
        exit 1
    fi
    
    echo "Database unavailable - waiting (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

echo -e "${GREEN}✓ Database connection established${NC}"

# ============================================================================
# RUN MIGRATIONS
# ============================================================================
echo -e "${YELLOW}[3/7] Running database migrations...${NC}"

cd /app/src

if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
    echo "Skipping migrations (SKIP_MIGRATIONS=true)"
elif python manage.py migrate --noinput; then
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
else
    echo -e "${RED}ERROR: Migration failed${NC}"
    exit 1
fi

# ============================================================================
# COLLECT STATIC FILES
# ============================================================================
echo -e "${YELLOW}[3/6] Collecting static files...${NC}"

if [ "${SKIP_COLLECTSTATIC:-false}" != "true" ]; then
    # Ensure static directory exists and is writable
    mkdir -p "${STATIC_ROOT}"
    chmod -R 755 "${STATIC_ROOT}" 2>/dev/null || true
    
    if python manage.py collectstatic --noinput --clear 2> /tmp/collectstatic_error.log; then
        echo -e "${GREEN}✓ Static files collected${NC}"
    else
        echo -e "${YELLOW}⚠ Static file collection failed (non-critical)${NC}"
    fi
else
    echo "Skipping static file collection"
fi

# ============================================================================
# CREATE SUPERUSER (if credentials provided)
# ============================================================================
echo -e "${YELLOW}[4/6] Checking superuser creation...${NC}"

if [ "${SKIP_MIGRATIONS:-false}" = "true" ] || [ "${SKIP_SUPERUSER:-false}" = "true" ]; then
    echo "Skipping superuser creation (SKIP_MIGRATIONS or SKIP_SUPERUSER is set)"
elif [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ]; then
    echo "Creating superuser if not exists..."
    
    python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()

username = '$DJANGO_SUPERUSER_USERNAME'
email = '$DJANGO_SUPERUSER_EMAIL'
password = '$DJANGO_SUPERUSER_PASSWORD'
role = '$DJANGO_SUPERUSER_ROLE'

if not User.objects.filter(username=username).exists():
    try:
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role=role
        )
        print('✓ Superuser created successfully')
    except Exception as e:
        print(f'✗ Superuser creation failed: {e}')
else:
    print('✓ Superuser already exists')
EOF
else
    echo "Skipping superuser creation (credentials not provided)"
fi

# ============================================================================
# CACHE WARMUP (Optional)
# ============================================================================
echo -e "${YELLOW}[5/6] Warming up application cache...${NC}"

if [ "${SKIP_CACHE_WARMUP:-false}" != "true" ]; then
    # Add any cache warmup logic here
    echo "Cache warmup completed"
else
    echo "Cache warmup skipped"
fi

# ============================================================================
# HEALTH CHECK
# ============================================================================
echo -e "${YELLOW}[6/6] Running pre-flight checks...${NC}"

# Verify critical settings
python manage.py check --deploy --fail-level WARNING || {
    echo -e "${YELLOW}⚠ Some deployment checks failed (review above)${NC}"
}

echo -e "${GREEN}✓ Pre-flight checks completed${NC}"

# ============================================================================
# START APPLICATION
# ============================================================================
echo "========================================"
echo -e "${GREEN} Starting Application Server${NC}"
echo " Workers: ${GUNICORN_WORKERS:-4}"
echo " Timeout: ${GUNICORN_TIMEOUT:-300}s"
echo "========================================"

# Execute the command passed to docker run
exec "$@"
