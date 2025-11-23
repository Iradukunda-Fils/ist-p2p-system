# System Architecture

This document provides a comprehensive overview of the P2P Procurement System architecture, design patterns, and technical decisions.

## High-Level Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile App  │  API Clients  │  Third-party     │
│  (React SPA)  │   (Future)   │   (Future)    │  Integrations    │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS/REST API
┌─────────────────▼───────────────────────────────────────────────┐
│                    Gateway Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│              Nginx Reverse Proxy                                │
│  • SSL Termination  • Load Balancing  • Static Files           │
│  • Rate Limiting    • Compression     • Security Headers       │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐ ┌────────▼────────┐
│ Frontend Layer │ │ Backend Layer   │
├────────────────┤ ├─────────────────┤
│ React 18 SPA   │ │ Django REST API │
│ • TypeScript   │ │ • Python 3.10+  │
│ • Tailwind CSS │ │ • DRF 3.14+     │
│ • Vite Build   │ │ • JWT Auth      │
│ • State Mgmt   │ │ • Business Logic│
└────────────────┘ └─────────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐ ┌─────────▼────────┐ ┌────────▼────────┐
│ Data Layer     │ │ Cache Layer      │ │ Task Queue      │
├────────────────┤ ├──────────────────┤ ├─────────────────┤
│ PostgreSQL 14+ │ │ Redis 7+         │ │ Celery Workers  │
│ • ACID Compliance│ • Session Store  │ │ • Async Tasks   │
│ • JSON Support │ │ • Query Cache    │ │ • Scheduled Jobs│
│ • Full-text    │ │ • Rate Limiting  │ │ • Email Queue   │
│   Search       │ │ • Pub/Sub        │ │ • File Processing│
└────────────────┘ └──────────────────┘ └─────────────────┘
```

## Frontend Architecture

### Component Architecture
```
src/
├── api/                    # API Layer
│   ├── client.ts          # Axios client with interceptors
│   ├── authApi.ts         # Authentication endpoints
│   ├── purchasesApi.ts    # Purchase request endpoints
│   └── documentsApi.ts    # Document management endpoints
├── components/            # UI Components
│   ├── common/           # Reusable components
│   │   ├── Button.tsx    # Button variants
│   │   ├── Input.tsx     # Form inputs
│   │   ├── Modal.tsx     # Modal dialogs
│   │   └── Table.tsx     # Data tables
│   ├── layout/           # Layout components
│   │   ├── Header.tsx    # Navigation header
│   │   ├── Sidebar.tsx   # Side navigation
│   │   └── MainLayout.tsx# Page wrapper
│   └── domain/           # Domain-specific components
│       ├── PurchaseRequestCard.tsx
│       ├── ApprovalTimeline.tsx
│       └── DocumentUpload.tsx
├── pages/                # Route components
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Dashboard views
│   ├── requests/        # Purchase request pages
│   └── orders/          # Purchase order pages
├── store/               # State management
│   ├── authStore.ts     # Authentication state
│   ├── requestsStore.ts # Requests state
│   └── uiStore.ts       # UI state
├── hooks/               # Custom React hooks
│   ├── useAuth.ts       # Authentication hook
│   ├── useRequests.ts   # Requests data hook
│   └── useLocalStorage.ts# Local storage hook
├── utils/               # Utility functions
│   ├── constants.ts     # Application constants
│   ├── formatters.ts    # Data formatting
│   └── validators.ts    # Form validation
└── types/               # TypeScript definitions
    └── index.ts         # Type definitions
```

### State Management Strategy

#### Zustand for Client State
```typescript
// Authentication state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

// UI state
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  toggleSidebar: () => void;
  addNotification: (notification: Notification) => void;
}
```

#### React Query for Server State
```typescript
// Purchase requests queries
const usePurchaseRequests = (filters?: RequestFilters) => {
  return useQuery({
    queryKey: ['purchaseRequests', filters],
    queryFn: () => purchasesApi.getRequests(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutations with optimistic updates
const useCreateRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: purchasesApi.createRequest,
    onMutate: async (newRequest) => {
      // Optimistic update
      await queryClient.cancelQueries(['purchaseRequests']);
      const previousRequests = queryClient.getQueryData(['purchaseRequests']);
      
      queryClient.setQueryData(['purchaseRequests'], (old: any) => ({
        ...old,
        results: [{ ...newRequest, id: 'temp', status: 'pending' }, ...old.results]
      }));
      
      return { previousRequests };
    },
    onError: (err, newRequest, context) => {
      // Rollback on error
      queryClient.setQueryData(['purchaseRequests'], context?.previousRequests);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['purchaseRequests']);
    },
  });
};
```

### Authentication Architecture

#### Secure Cookie-Based Authentication
```typescript
// Cookie management
class SecureCookieManager {
  setAuthTokens(access: string, refresh: string): void {
    // Set HTTP-only cookies via API call
    document.cookie = `access_token=${access}; HttpOnly; Secure; SameSite=Strict`;
    document.cookie = `refresh_token=${refresh}; HttpOnly; Secure; SameSite=Strict`;
  }

  clearAuthData(): void {
    // Clear cookies via API call
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }
}

// Cross-tab synchronization
class AuthSyncService {
  private channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel('auth-sync');
    this.channel.addEventListener('message', this.handleAuthEvent);
  }

  broadcastAuthEvent(event: AuthEvent): void {
    this.channel.postMessage(event);
  }

  private handleAuthEvent = (event: MessageEvent<AuthEvent>) => {
    switch (event.data.type) {
      case 'LOGIN':
        // Update auth state in all tabs
        break;
      case 'LOGOUT':
        // Clear auth state and redirect
        break;
      case 'TOKEN_REFRESH':
        // Refresh auth state
        break;
    }
  };
}
```

## Backend Architecture

### Django Project Structure
```
backend/src/
├── config/                # Project configuration
│   ├── settings/
│   │   ├── base.py       # Base settings
│   │   ├── development.py# Development overrides
│   │   ├── production.py # Production overrides
│   │   └── testing.py    # Test settings
│   ├── urls.py           # Root URL configuration
│   ├── wsgi.py           # WSGI application
│   └── celery.py         # Celery configuration
├── core/                 # Core utilities
│   ├── permissions.py    # Custom permissions
│   ├── middleware.py     # Custom middleware
│   ├── exceptions.py     # Custom exceptions
│   └── utils.py          # Utility functions
├── users/                # User management
│   ├── models.py         # User models
│   ├── serializers.py    # API serializers
│   ├── views.py          # API views
│   ├── permissions.py    # User permissions
│   └── urls.py           # URL patterns
├── purchases/            # Purchase management
│   ├── models.py         # Purchase models
│   ├── serializers.py    # API serializers
│   ├── views.py          # API views
│   ├── services/         # Business logic layer
│   │   ├── approval_service.py
│   │   ├── purchase_request_service.py
│   │   └── purchase_order_service.py
│   ├── tasks.py          # Celery tasks
│   ├── permissions.py    # Purchase permissions
│   └── urls.py           # URL patterns
└── documents/            # Document processing
    ├── models.py         # Document models
    ├── serializers.py    # API serializers
    ├── views.py          # API views
    ├── processors/       # Document processors
    │   ├── ocr_processor.py
    │   ├── ai_processor.py
    │   └── pdf_processor.py
    ├── storage.py        # File storage backends
    └── urls.py           # URL patterns
```

### Service Layer Pattern
```python
# Business logic separation
class PurchaseRequestService:
    @staticmethod
    def create_request(user: User, data: dict) -> PurchaseRequest:
        """Create a new purchase request with validation."""
        # Validate business rules
        if data['total_amount'] > user.spending_limit:
            raise ValidationError("Amount exceeds spending limit")
        
        # Create request
        request = PurchaseRequest.objects.create(
            user=user,
            title=data['title'],
            description=data['description'],
            status='pending'
        )
        
        # Create items
        for item_data in data['items']:
            PurchaseRequestItem.objects.create(
                request=request,
                **item_data
            )
        
        # Trigger approval workflow
        ApprovalService.initiate_approval(request)
        
        return request

class ApprovalService:
    @staticmethod
    def initiate_approval(request: PurchaseRequest) -> None:
        """Start the approval workflow."""
        approver = ApprovalService.get_approver(request.total_amount)
        
        ApprovalHistory.objects.create(
            request=request,
            approver=approver,
            action='assigned',
            timestamp=timezone.now()
        )
        
        # Send notification
        NotificationService.send_approval_notification(approver, request)
```

### Database Design

#### Core Models
```python
class User(AbstractUser):
    role = models.CharField(max_length=20, choices=USER_ROLES)
    spending_limit = models.DecimalField(max_digits=10, decimal_places=2)
    department = models.CharField(max_length=100)
    manager = models.ForeignKey('self', null=True, blank=True)

class PurchaseRequest(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'status']),
        ]

class PurchaseRequestItem(models.Model):
    request = models.ForeignKey(PurchaseRequest, related_name='items')
    description = models.CharField(max_length=500)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

class ApprovalHistory(models.Model):
    request = models.ForeignKey(PurchaseRequest, related_name='approval_history')
    approver = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    comment = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
```

#### Database Optimization
```python
# Query optimization examples
class PurchaseRequestViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return PurchaseRequest.objects.select_related(
            'user', 'approver'
        ).prefetch_related(
            'items', 'approval_history__approver'
        ).annotate(
            items_count=Count('items'),
            total_items_value=Sum('items__total_price')
        )

# Database indexes for performance
class Meta:
    indexes = [
        models.Index(fields=['status', 'created_at']),
        models.Index(fields=['user', 'status']),
        models.Index(fields=['total_amount']),
        models.Index(fields=['-created_at']),  # For ordering
    ]
```

## Infrastructure Architecture

### Containerization Strategy
```yaml
# docker-compose.yml structure
services:
  nginx:          # Reverse proxy and static files
  frontend:       # React application
  backend:        # Django API server
  db:            # PostgreSQL database
  redis:         # Cache and message broker
  celery_worker: # Background task processor
  celery_beat:   # Task scheduler
  
  # Management tools
  pgadmin:       # Database administration
  redis-commander: # Redis management
  flower:        # Celery monitoring
```

### Networking
```
Docker Network: p2p_network
├── nginx:80 → frontend:3000 (static files)
├── nginx:80 → backend:8000 (API routes)
├── backend:8000 → db:5432 (database)
├── backend:8000 → redis:6379 (cache)
├── celery_worker → redis:6379 (message broker)
└── celery_worker → db:5432 (task results)
```

### Security Architecture

#### Authentication Flow
```
1. User Login Request
   ├── Frontend sends credentials to /api/auth/token/
   ├── Backend validates credentials
   ├── Backend generates JWT tokens
   ├── Backend sets HTTP-only cookies
   └── Frontend receives user data

2. Authenticated Requests
   ├── Frontend makes API request
   ├── Nginx forwards to backend
   ├── Backend validates JWT from cookie
   ├── Backend processes request
   └── Backend returns response

3. Token Refresh
   ├── Backend detects expired access token
   ├── Backend uses refresh token from cookie
   ├── Backend generates new access token
   ├── Backend updates cookie
   └── Backend processes original request
```

#### Security Layers
```
┌─────────────────────────────────────────┐
│ Network Security                        │
│ • HTTPS/TLS encryption                  │
│ • Firewall rules                        │
│ • VPN access (production)               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Application Security                    │
│ • JWT authentication                    │
│ • Role-based access control            │
│ • CSRF protection                       │
│ • XSS prevention                        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Data Security                           │
│ • Database encryption at rest           │
│ • Encrypted backups                     │
│ • Audit logging                         │
│ • PII data protection                   │
└─────────────────────────────────────────┘
```

## Performance Architecture

### Caching Strategy
```python
# Multi-level caching
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Cache usage patterns
@cache_page(60 * 15)  # 15 minutes
def dashboard_stats(request):
    """Cache dashboard statistics."""
    pass

@method_decorator(cache_page(60 * 5), name='list')
class PurchaseRequestViewSet(viewsets.ModelViewSet):
    """Cache list views for 5 minutes."""
    pass
```

### Database Performance
```python
# Connection pooling
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 60,  # Connection reuse
        'OPTIONS': {
            'MAX_CONNS': 20,
            'MIN_CONNS': 5,
        }
    }
}

# Query optimization
class PurchaseRequestQuerySet(models.QuerySet):
    def with_related(self):
        return self.select_related('user', 'approver').prefetch_related('items')
    
    def for_user(self, user):
        return self.filter(user=user)
    
    def pending_approval(self):
        return self.filter(status='pending')
```

### Async Task Processing
```python
# Celery task configuration
@shared_task(bind=True, max_retries=3)
def process_document(self, document_id):
    """Process uploaded document with OCR and AI."""
    try:
        document = Document.objects.get(id=document_id)
        
        # OCR processing
        text = OCRProcessor.extract_text(document.file)
        
        # AI data extraction
        extracted_data = AIProcessor.extract_data(text)
        
        # Update document
        document.extracted_data = extracted_data
        document.processing_status = 'completed'
        document.save()
        
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

## Monitoring and Observability

### Logging Architecture
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/app/logs/django.log',
            'maxBytes': 1024*1024*100,  # 100MB
            'backupCount': 5,
            'formatter': 'json',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
        },
        'purchases': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
        },
    },
}
```

### Health Checks
```python
# Health check endpoints
class HealthCheckView(APIView):
    def get(self, request):
        checks = {
            'database': self.check_database(),
            'redis': self.check_redis(),
            'celery': self.check_celery(),
            'storage': self.check_storage(),
        }
        
        status = 'healthy' if all(checks.values()) else 'unhealthy'
        
        return Response({
            'status': status,
            'checks': checks,
            'timestamp': timezone.now().isoformat(),
        })
```

## Scalability Considerations

### Horizontal Scaling
```yaml
# Production scaling configuration
services:
  backend:
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
  
  celery_worker:
    deploy:
      replicas: 8
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Database Scaling
```python
# Read replicas configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'p2p_procurement',
        'HOST': 'primary-db',
    },
    'read_replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'p2p_procurement',
        'HOST': 'read-replica-db',
    }
}

DATABASE_ROUTERS = ['core.routers.DatabaseRouter']

# Router for read/write splitting
class DatabaseRouter:
    def db_for_read(self, model, **hints):
        return 'read_replica'
    
    def db_for_write(self, model, **hints):
        return 'default'
```

## Future Architecture Considerations

### Microservices Migration Path
```
Current Monolith → Modular Monolith → Microservices

Phase 1: Service Layer Separation
├── User Service
├── Purchase Request Service
├── Approval Service
├── Document Service
└── Notification Service

Phase 2: Database Separation
├── User Database
├── Purchase Database
├── Document Database
└── Audit Database

Phase 3: Service Extraction
├── User Microservice
├── Purchase Microservice
├── Document Microservice
└── Notification Microservice
```

### Event-Driven Architecture
```python
# Event sourcing preparation
class DomainEvent:
    def __init__(self, aggregate_id, event_type, data, timestamp=None):
        self.aggregate_id = aggregate_id
        self.event_type = event_type
        self.data = data
        self.timestamp = timestamp or timezone.now()

class PurchaseRequestCreated(DomainEvent):
    def __init__(self, request_id, user_id, total_amount):
        super().__init__(
            aggregate_id=request_id,
            event_type='purchase_request.created',
            data={
                'user_id': user_id,
                'total_amount': str(total_amount),
            }
        )
```

---

**This architecture provides a solid foundation for the P2P Procurement System with clear separation of concerns, scalability, and maintainability.** 🏗️