# Contributing Guide

Thank you for your interest in contributing to the P2P Procurement System! This guide will help you get started with contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a professional environment

## Getting Started

### Prerequisites
- Git
- Docker and Docker Compose (recommended)
- OR Python 3.10+, Node.js 18+, PostgreSQL, Redis (for local development)

### Setting Up Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/p2p-procurement.git
   cd p2p-procurement
   ```

2. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start Development Environment**
   ```bash
   # Using Docker (recommended)
   docker-compose up -d
   
   # OR local development
   # See DEVELOPMENT.md for detailed local setup
   ```

4. **Verify Setup**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - All tests pass: `npm test` and `python manage.py test`

## Development Workflow

### Branch Strategy
We use a simplified Git flow:
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - Feature branches
- `bugfix/bug-description` - Bug fix branches
- `hotfix/critical-fix` - Critical production fixes

### Creating a Feature

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following our style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   # Frontend tests
   cd frontend && npm test
   
   # Backend tests
   cd backend && python manage.py test
   
   # Integration tests
   docker-compose exec backend python manage.py test --settings=config.settings.testing
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

## Coding Standards

### Python/Django Backend

#### Code Style
- Follow PEP 8 style guide
- Use Black for code formatting
- Use isort for import sorting
- Maximum line length: 88 characters

```bash
# Format code
black .
isort .

# Check style
flake8 .
mypy .
```

#### Code Structure
```python
# Good: Clear, descriptive names
class PurchaseRequestService:
    def create_request(self, user: User, data: dict) -> PurchaseRequest:
        """Create a new purchase request with validation."""
        pass

# Good: Type hints
def calculate_total(items: List[PurchaseRequestItem]) -> Decimal:
    return sum(item.total_price for item in items)

# Good: Docstrings
def approve_request(request: PurchaseRequest, approver: User) -> None:
    """
    Approve a purchase request.
    
    Args:
        request: The purchase request to approve
        approver: The user approving the request
        
    Raises:
        PermissionError: If approver lacks permission
        ValidationError: If request cannot be approved
    """
    pass
```

#### Testing
```python
# Test file naming: test_*.py
# Test class naming: Test*
# Test method naming: test_*

class TestPurchaseRequestService(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
        
    def test_create_request_success(self):
        """Test successful request creation."""
        data = {
            'title': 'Test Request',
            'description': 'Test Description',
            'items': [{'description': 'Item 1', 'quantity': 1, 'unit_price': 10.00}]
        }
        
        request = PurchaseRequestService.create_request(self.user, data)
        
        self.assertEqual(request.title, 'Test Request')
        self.assertEqual(request.status, 'pending')
        self.assertEqual(request.items.count(), 1)
```

### TypeScript/React Frontend

#### Code Style
- Use TypeScript strict mode
- Use Prettier for formatting
- Use ESLint for linting
- Prefer functional components with hooks

```bash
# Format and lint
npm run format
npm run lint
npm run type-check
```

#### Component Structure
```typescript
// Good: Proper TypeScript interfaces
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// Good: Functional component with proper typing
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  onClick,
}) => {
  const classes = clsx(
    'font-medium rounded-lg transition-colors',
    {
      'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
      'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
      'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
    },
    {
      'px-3 py-1.5 text-sm': size === 'sm',
      'px-4 py-2 text-base': size === 'md',
      'px-6 py-3 text-lg': size === 'lg',
    }
  );

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={loading}
      type="button"
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

#### Testing
```typescript
// Component tests
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

## Commit Message Guidelines

We follow the Conventional Commits specification:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(auth): add cross-tab authentication sync
fix(api): resolve token refresh race condition
docs(readme): update installation instructions
style(frontend): format components with prettier
refactor(backend): extract approval service logic
test(purchases): add integration tests for approval flow
chore(deps): update django to 4.2.8
```

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] No merge conflicts with target branch

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process
1. **Automated Checks**: CI/CD pipeline runs tests and checks
2. **Code Review**: At least one maintainer reviews the code
3. **Testing**: Reviewer tests the changes locally if needed
4. **Approval**: Maintainer approves and merges

## Issue Guidelines

### Bug Reports
Use the bug report template:
```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 91]
- Version: [e.g. 2.0.0]
```

### Feature Requests
Use the feature request template:
```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
Clear description of what you want to happen

**Describe alternatives you've considered**
Alternative solutions or features considered

**Additional context**
Any other context or screenshots
```

## Documentation Guidelines

### Code Documentation
- Use docstrings for all functions and classes
- Include type hints in Python code
- Add JSDoc comments for complex TypeScript functions
- Keep comments up-to-date with code changes

### User Documentation
- Write clear, step-by-step instructions
- Include screenshots for UI features
- Test documentation with fresh eyes
- Update docs when features change

### API Documentation
- Document all endpoints
- Include request/response examples
- Specify required parameters
- Document error responses

## Testing Guidelines

### Test Coverage
- Aim for 80%+ test coverage
- Focus on critical business logic
- Test edge cases and error conditions
- Include integration tests for workflows

### Test Types
1. **Unit Tests**: Test individual functions/components
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete user workflows
4. **API Tests**: Test API endpoints and responses

### Writing Good Tests
```python
# Good test structure
def test_should_create_purchase_request_when_valid_data_provided():
    # Arrange
    user = create_test_user()
    data = create_valid_request_data()
    
    # Act
    request = PurchaseRequestService.create_request(user, data)
    
    # Assert
    assert request.title == data['title']
    assert request.status == 'pending'
    assert request.user == user
```

## Release Process

### Version Numbering
We use Semantic Versioning (SemVer):
- `MAJOR.MINOR.PATCH`
- `MAJOR`: Breaking changes
- `MINOR`: New features (backward compatible)
- `PATCH`: Bug fixes (backward compatible)

### Release Steps
1. Update version numbers
2. Update CHANGELOG.md
3. Create release branch
4. Test release candidate
5. Merge to main
6. Tag release
7. Deploy to production

## Getting Help

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Email**: maintainers@yourcompany.com (for sensitive issues)

### Resources
- [Development Guide](DEVELOPMENT.md)
- [API Documentation](API.md)
- [Architecture Overview](ARCHITECTURE.md)
- [User Guide](USER_GUIDE.md)

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Annual contributor appreciation

Thank you for contributing to the P2P Procurement System! 🎉

---

**Every contribution, no matter how small, makes a difference. We appreciate your help in making this project better!**