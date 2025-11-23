# Development Guide

This guide covers setting up a local development environment for the P2P Procurement System.

## Development Environment Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **Redis 7+**
- **Git**

### Quick Setup

#### Option 1: Docker Development (Recommended)
```bash
# Clone repository
git clone <repository-url>
cd p2p-procurement

# Copy environment file
cp .env.example .env

# Start development environment
docker-compose up -d

# Create superuser
docker-compose exec backend python src/manage.py createsuperuser
```

#### Option 2: Local Development
```bash
# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install

# Start services (separate terminals)
cd backend/src && python manage.py runserver
cd frontend && npm run dev
celery -A config worker -l info
```

## Project Structure

```
p2p-procurement/
├── backend/                 # Django backend
│   ├── src/
│   │   ├── config/         # Django settings
│   │   ├── core/           # Core utilities
│   │   ├── users/          # User management
│   │   ├── purchases/      # Purchase requests & orders
│   │   ├── documents/      # Document processing
│   │   └── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── store/         # State management
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utilities
│   ├── package.json
│   └── Dockerfile
├── nginx/                 # Nginx configuration
├── docs/                  # Documentation
├── docker-compose.yml     # Development compose
├── docker-compose.prod.yml # Production compose
└── .env.example          # Environment template
```

## Backend Development

### Django Project Structure
```
backend/src/
├── config/                # Project configuration
│   ├── settings/
│   │   ├── base.py       # Base settings
│   │   ├── development.py # Development settings
│   │   └── production.py  # Production settings
│   ├── urls.py           # URL configuration
│   └── wsgi.py           # WSGI configuration
├── core/                 # Core utilities
│   ├── permissions.py    # Custom permissions
│   ├── middleware.py     # Custom middleware
│   └── utils.py          # Utility functions
├── users/                # User management
│   ├── models.py         # User models
│   ├── serializers.py    # API serializers
│   ├── views.py          # API views
│   └── urls.py           # URL patterns
├── purchases/            # Purchase management
│   ├── models.py         # Purchase models
│   ├── serializers.py    # API serializers
│   ├── views.py          # API views
│   ├── services/         # Business logic
│   ├── tasks.py          # Celery tasks
│   └── urls.py           # URL patterns
└── documents/            # Document processing
    ├── models.py         # Document models
    ├── processors/       # OCR and AI processing
    └── storage.py        # File storage
```

### Development Commands
```bash
# Django management commands
python manage.py runserver          # Start development server
python manage.py migrate            # Apply database migrations
python manage.py makemigrations     # Create new migrations
python manage.py createsuperuser    # Create admin user
python manage.py shell              # Django shell
python manage.py test               # Run tests
python manage.py collectstatic      # Collect static files

# Database operations
python manage.py dbshell            # Database shell
python manage.py dumpdata > data.json  # Export data
python manage.py loaddata data.json    # Import data

# Custom commands
python manage.py create_sample_data  # Create sample data (if available)
```

### API Development

#### Creating New Endpoints
```python
# 1. Define model (models.py)
class MyModel(models.Model):
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

# 2. Create serializer (serializers.py)
class MyModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = '__all__'

# 3. Create viewset (views.py)
class MyModelViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.all()
    serializer_class = MyModelSerializer
    permission_classes = [IsAuthenticated]

# 4. Register URLs (urls.py)
router.register(r'mymodels', MyModelViewSet)
```

#### Testing APIs
```bash
# Using curl
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/purchases/requests/

# Using Django shell
python manage.py shell
>>> from rest_framework.test import APIClient
>>> client = APIClient()
>>> response = client.get('/api/purchases/requests/')
```

### Database Development

#### Migrations
```bash
# Create migration for model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Rollback migration
python manage.py migrate app_name 0001
```

#### Database Queries
```python
# Efficient queries
from purchases.models import PurchaseRequest

# Use select_related for foreign keys
requests = PurchaseRequest.objects.select_related('user', 'approver')

# Use prefetch_related for many-to-many
requests = PurchaseRequest.objects.prefetch_related('items')

# Combine for complex queries
requests = PurchaseRequest.objects.select_related('user').prefetch_related('items')
```

## Frontend Development

### React Project Structure
```
frontend/src/
├── api/                  # API client and services
│   ├── client.ts        # Axios client configuration
│   ├── authApi.ts       # Authentication API
│   ├── purchasesApi.ts  # Purchases API
│   └── documentsApi.ts  # Documents API
├── components/          # Reusable components
│   ├── common/         # Generic components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── layout/         # Layout components
│   │   ├── Header.tsx
│   │   └── MainLayout.tsx
│   └── auth/           # Auth-specific components
├── pages/              # Page components
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Dashboard
│   ├── requests/      # Purchase requests
│   └── orders/        # Purchase orders
├── store/             # State management
│   └── authStore.ts   # Authentication state
├── types/             # TypeScript definitions
│   └── index.ts       # Type definitions
├── utils/             # Utility functions
│   ├── constants.ts   # Constants
│   └── formatters.ts  # Data formatters
└── styles/            # Global styles
    └── index.css      # Tailwind CSS
```

### Development Commands
```bash
# Development server
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Code quality
npm run lint             # ESLint
npm run type-check       # TypeScript checking
npm run format           # Prettier formatting

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Component Development

#### Creating Components
```typescript
// components/common/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  onClick,
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

#### State Management with Zustand
```typescript
// store/authStore.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (username: string, password: string) => {
    try {
      const response = await authApi.login({ username, password });
      set({ user: response.user, isAuthenticated: true });
    } catch (error) {
      throw error;
    }
  },
  
  logout: () => {
    authApi.logout();
    set({ user: null, isAuthenticated: false });
  },
}));
```

#### API Integration with React Query
```typescript
// hooks/usePurchaseRequests.ts
export const usePurchaseRequests = () => {
  return useQuery({
    queryKey: ['purchaseRequests'],
    queryFn: () => purchasesApi.getRequests(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreatePurchaseRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: purchasesApi.createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
    },
  });
};
```

## Testing

### Backend Testing
```python
# tests/test_models.py
from django.test import TestCase
from purchases.models import PurchaseRequest

class PurchaseRequestModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass'
        )
    
    def test_create_purchase_request(self):
        request = PurchaseRequest.objects.create(
            title='Test Request',
            description='Test Description',
            user=self.user,
            total_amount=100.00
        )
        self.assertEqual(request.title, 'Test Request')
        self.assertEqual(request.status, 'pending')

# tests/test_api.py
from rest_framework.test import APITestCase
from rest_framework import status

class PurchaseRequestAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_purchase_request(self):
        data = {
            'title': 'Test Request',
            'description': 'Test Description',
            'total_amount': 100.00
        }
        response = self.client.post('/api/purchases/requests/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

### Frontend Testing
```typescript
// components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Running Tests
```bash
# Backend tests
cd backend
python manage.py test                    # All tests
python manage.py test purchases         # Specific app
python manage.py test purchases.tests.test_models  # Specific module

# Frontend tests
cd frontend
npm run test                            # All tests
npm run test Button                     # Specific component
npm run test:coverage                   # With coverage
```

## Code Quality

### Backend Code Quality
```bash
# Install development dependencies
pip install black flake8 isort mypy

# Format code
black .

# Check code style
flake8 .

# Sort imports
isort .

# Type checking
mypy .
```

### Frontend Code Quality
```bash
# ESLint
npm run lint
npm run lint:fix

# Prettier
npm run format

# TypeScript checking
npm run type-check
```

### Pre-commit Hooks
```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

## Debugging

### Backend Debugging
```python
# Using Django shell
python manage.py shell
>>> from purchases.models import PurchaseRequest
>>> requests = PurchaseRequest.objects.all()
>>> print(requests.query)  # See SQL query

# Using pdb debugger
import pdb; pdb.set_trace()

# Using Django debug toolbar (in development)
# Add to INSTALLED_APPS: 'debug_toolbar'
```

### Frontend Debugging
```typescript
// Browser DevTools
console.log('Debug info:', data);
console.table(arrayData);

// React DevTools
// Install React Developer Tools browser extension

// Redux DevTools (for Zustand)
import { devtools } from 'zustand/middleware';

export const useAuthStore = create<AuthState>()(
  devtools((set, get) => ({
    // ... store implementation
  }))
);
```

## Environment Configuration

### Development Environment Variables
```env
# Backend (.env)
DEBUG=True
SECRET_KEY=dev-secret-key-not-for-production
DATABASE_URL=postgresql://postgres:password@localhost:5432/p2p_procurement
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=P2P Procurement System (Dev)
```

### IDE Configuration

#### VS Code Settings
```json
// .vscode/settings.json
{
  "python.defaultInterpreterPath": "./backend/.venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

#### VS Code Extensions
- Python
- Django
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

## Performance Optimization

### Backend Performance
```python
# Database query optimization
# Use select_related for foreign keys
requests = PurchaseRequest.objects.select_related('user', 'approver')

# Use prefetch_related for reverse foreign keys and many-to-many
requests = PurchaseRequest.objects.prefetch_related('items')

# Use only() to limit fields
requests = PurchaseRequest.objects.only('id', 'title', 'status')

# Use values() for simple data
data = PurchaseRequest.objects.values('id', 'title', 'status')
```

### Frontend Performance
```typescript
// Component memoization
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* expensive rendering */}</div>;
});

// Callback memoization
const handleClick = useCallback(() => {
  // handle click
}, [dependency]);

// Value memoization
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Code splitting
const LazyComponent = React.lazy(() => import('./LazyComponent'));
```

## Deployment Preparation

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Code quality checks passing
- [ ] Environment variables configured
- [ ] Database migrations created and tested
- [ ] Static files collected
- [ ] Security settings reviewed
- [ ] Performance optimizations applied
- [ ] Documentation updated

### Build Commands
```bash
# Backend
python manage.py collectstatic --noinput
python manage.py migrate

# Frontend
npm run build

# Docker
docker-compose build
docker-compose -f docker-compose.prod.yml build
```

---

**Happy coding!** 🚀 This development setup provides a solid foundation for building and maintaining the P2P Procurement System.