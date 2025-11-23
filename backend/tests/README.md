# P2P Procurement System - Backend Tests

This directory contains all organized tests for the P2P Procurement System backend.

## Test Organization

### Directory Structure
```
backend/tests/
├── __init__.py
├── README.md
├── run_tests.py          # Main test runner
├── unit/                 # Unit tests
│   ├── __init__.py
│   ├── test_authentication.py
│   ├── test_approval_actions.py
│   ├── test_logout_endpoint.py
│   ├── test_receipt_validation.py
│   └── test_tasks_simple.py
├── integration/          # Integration tests
│   ├── __init__.py
│   └── test_celery_integration.py
└── api/                  # API endpoint tests
    ├── __init__.py
    └── test_api_endpoints.py
```

## Test Categories

### Unit Tests (`unit/`)
Tests individual components and functions in isolation:

- **`test_authentication.py`**: JWT authentication, user roles, permissions
- **`test_approval_actions.py`**: Purchase request approval workflow
- **`test_logout_endpoint.py`**: User logout functionality
- **`test_receipt_validation.py`**: Receipt validation algorithms
- **`test_tasks_simple.py`**: Core task validation logic

### Integration Tests (`integration/`)
Tests complete workflows and component interactions:

- **`test_celery_integration.py`**: End-to-end Celery task workflows

### API Tests (`api/`)
Tests REST API endpoints and HTTP interactions:

- **`test_api_endpoints.py`**: Complete API endpoint testing with authentication

## Running Tests

### Run All Tests
```bash
# From backend/tests directory
python run_tests.py

# Or from backend directory
python tests/run_tests.py
```

### Run Specific Test Categories
```bash
# Unit tests only
python unit/test_authentication.py

# Integration tests only
python integration/test_celery_integration.py

# API tests only
python api/test_api_endpoints.py
```

### Run Individual Test Files
```bash
# Run specific test
python unit/test_receipt_validation.py
```

## Test Requirements

### Environment Setup
Tests require the following environment setup:

1. **Django Configuration**: Tests use Django settings from `config.settings`
2. **Database**: Tests may create temporary test data
3. **Redis**: Integration tests may require Redis for Celery
4. **Dependencies**: All backend requirements must be installed

### Environment Variables
Some tests may require environment variables:
```bash
DJANGO_SETTINGS_MODULE=config.settings.development
DATABASE_URL=postgresql://user:pass@localhost/test_db
REDIS_URL=redis://localhost:6379/0
```

## Test Data

### Test Users
API tests create the following test users:
- `staff_user` (role: staff) - Can create purchase requests
- `approver_lvl1` (role: approver_lvl1) - Can approve requests ≤ $1000
- `approver_lvl2` (role: approver_lvl2) - Can approve all requests
- `finance_user` (role: finance) - Can manage purchase orders
- `admin_user` (role: admin) - Full system access

All test users use password: `testpass123`

### Test Data Cleanup
Tests are designed to:
- Create minimal test data
- Clean up after themselves when possible
- Use transactions for database tests
- Avoid conflicts with existing data

## Test Coverage

### Features Tested
- ✅ User authentication and JWT tokens
- ✅ Role-based permissions
- ✅ Purchase request approval workflow
- ✅ Receipt validation algorithms
- ✅ Celery task integration
- ✅ API endpoint functionality
- ✅ Error handling and edge cases

### Requirements Coverage
- ✅ Requirement 6.2: Receipt comparison against purchase orders
- ✅ Requirement 6.3: Match score calculation
- ✅ Requirement 6.4: Discrepancy detection and manual review
- ✅ Authentication and authorization
- ✅ Purchase request workflow
- ✅ Document processing pipeline

## Troubleshooting

### Common Issues

1. **Django Setup Errors**
   ```bash
   # Ensure Django settings are configured
   export DJANGO_SETTINGS_MODULE=config.settings.development
   ```

2. **Database Connection Issues**
   ```bash
   # Check database configuration
   python manage.py check --database default
   ```

3. **Redis Connection Issues**
   ```bash
   # Check Redis connectivity
   redis-cli ping
   ```

4. **Import Errors**
   ```bash
   # Ensure Python path includes src directory
   export PYTHONPATH="${PYTHONPATH}:./src"
   ```

### Test Debugging
- Use `python -v` for verbose output
- Check Django logs in `src/logs/django.log`
- Use `print()` statements for debugging test logic
- Run tests individually to isolate issues

## Contributing

### Adding New Tests
1. Place unit tests in `unit/` directory
2. Place integration tests in `integration/` directory
3. Place API tests in `api/` directory
4. Follow naming convention: `test_*.py`
5. Include docstrings and comments
6. Update this README if adding new test categories

### Test Standards
- Use descriptive test names
- Include setup and teardown when needed
- Test both success and failure cases
- Use assertions with meaningful messages
- Keep tests independent and isolated

---

**Last Updated**: November 2024  
**Test Framework**: Django TestCase, unittest  
**Coverage**: Core backend functionality