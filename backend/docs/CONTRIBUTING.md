# Contributing Guidelines

Thank you for your interest in contributing to the Django P2P Procurement System! This document provides guidelines and best practices for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Documentation](#documentation)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### 1. Fork the Repository

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/django-p2p-system.git
cd django-p2p-system/backend
```

### 2. Set Up Development Environment

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development tools

# Set up pre-commit hooks
pre-commit install
```

### 3. Configure Local Settings

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your local settings
# Use SQLite for local development
DATABASE_URL=sqlite:///db.sqlite3
```

### 4. Run Migrations

```bash
cd src
python manage.py migrate
python manage.py createsuperuser
```

### 5. Start Development Server

```bash
python manage.py runserver
```

## Development Workflow

### Branching Strategy

We use Git Flow:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Creating a Feature Branch

```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-vendor-management

# Make your changes
# ...

# Commit changes
git add .
git commit -m "feat: add vendor management module"

# Push to your fork
git push origin feature/add-vendor-management
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```
feat(purchases): add multi-currency support

Add support for multiple currencies in purchase requests
and purchase orders with automated conversion rates.

Closes #123
```

```
fix(approvals): prevent duplicate approval notifications

Fixed issue where approval notifications were sent multiple
times due to race condition in Celery task.

Fixes #456
```

## Coding Standards

### Python Style Guide

We follow [PEP 8](https://pep8.org/) with some modifications:

- **Line Length**: 100 characters (not 79)
- **Indentation**: 4 spaces
- **Quotes**: Single quotes for strings (unless double quotes avoid escaping)

### Code Formatting

We use **Black** for code formatting:

```bash
# Format all Python files
black src/

# Check without modifying
black --check src/
```

### Import Sorting

We use **isort** for import organization:

```bash
# Sort imports
isort src/

# Check without modifying
isort --check-only src/
```

### Linting

We use **Flake8** for linting:

```bash
# Run linter
flake8 src/

# Configuration in setup.cfg
```

### Type Hints

Use Python type hints for function signatures:

```python
from typing import List, Optional
from decimal import Decimal

def calculate_total(items: List[RequestItem]) -> Decimal:
    """Calculate total amount from request items."""
    total: Decimal = Decimal('0.00')
    for item in items:
        total += item.line_total
    return total
```

### Docstrings

Use Google-style docstrings:

```python
def approve_request(request_id: str, approver: User, level: int) -> Approval:
    """
    Approve a purchase request at the specified level.
    
    Args:
        request_id: UUID of the purchase request
        approver: User performing the approval
        level: Approval level (1 or 2)
        
    Returns:
        Created Approval instance
        
    Raises:
        PermissionDenied: If user lacks approval permissions
        ValidationError: If request cannot be approved
        
    Example:
        >>> approval = approve_request('uuid', approver_user, 1)
        >>> approval.decision
        'APPROVED'
    """
    # Implementation
```

## Testing Guidelines

### Writing Tests

 - Tests go in `app/tests/` directory
- One test file per module: `test_models.py`, `test_views.py`, etc.
- Use descriptive test names: `test_approve_request_with_valid_permissions`

**Test Structure**:

```python
from django.test import TestCase
from purchases.models import PurchaseRequest
from purchases.services.approval_service import ApprovalService

class ApprovalServiceTestCase(TestCase):
    """Test cases for ApprovalService."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.user.role = 'approver_lvl1'
        self.user.save()
        
    def test_approve_request_success(self):
        """Test successful approval of purchase request."""
        # Arrange
        pr = PurchaseRequest.objects.create(...)
        
        # Act
        approval, updated_pr = ApprovalService.approve_request(
            request_id=str(pr.id),
            approver=self.user,
            level=1
        )
        
        # Assert
        self.assertEqual(approval.decision, 'APPROVED')
        self.assertEqual(updated_pr.status, 'APPROVED')
```

### Running Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test purchases

# Run specific test class
python manage.py test purchases.tests.test_services.ApprovalServiceTestCase

# Run with coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

### Test Coverage

- Maintain minimum **80% code coverage**
- All new features must include tests
- Bug fixes should include regression tests

## Pull Request Process

### 1. Prepare Your PR

Before submitting:

```bash
# Update from develop
git checkout develop
git pull origin develop
git checkout feature/your-feature
git rebase develop

# Run quality checks
black src/
isort src/
flake8 src/
python manage.py test
```

### 2. Create Pull Request

- Open PR against `develop` branch
- Fill out the PR template completely
- Link related issues
- Add appropriate labels

**PR Title Format**:
```
feat(purchases): add vendor management module
```

### 3. PR Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No new warnings generated
```

### 4. Code Review

- Address all review comments
- Keep discussion professional and constructive
- Be open to feedback and suggestions
- Update PR based on feedback

### 5. Merging

- **Squash and merge** for feature branches
- **Rebase and merge** for bug fixes
- Delete branch after merging

## Documentation

### Code Documentation

- Add docstrings to all public modules, classes, and functions
- Update inline comments for complex logic
- Keep comments up-to-date with code changes

### Project Documentation

- Update `README.md` for major features
- Update `ARCHITECTURE.md` for architectural changes
- Update `API_DOCUMENTATION.md` for API changes
- Update `DEPLOYMENT.md` for deployment changes

### Writing Good Documentation

**DO**:
- Be clear and concise
- Include code examples
- Use proper grammar and spelling
- Keep it up-to-date

**DON'T**:
- Assume knowledge  
- Use jargon without explanation
- Write obvious comments
- Leave outdated information

## Development Tools

### Recommended IDE Setup

**VS Code Extensions**:
- Python
- Pylance
- Django
- GitLens
- Black Formatter
- Better Comments

### Pre-commit Hooks

`.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
  
  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort
        
  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
```

## Getting Help

- **Slack**: #dev-p2p-system
- **Email**: dev-team@yourcompany.com
- **Documentation**: https://docs.yourcompany.com
- **Issues**: https://github.com/your-org/django-p2p-system/issues

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Annual contributor report

---

Thank you for contributing to the Django P2P Procurement System! 🎉
