# UI Components Documentation

## Overview

This document catalogs all reusable UI components in the P2P Procurement frontend, including their purpose, props, usage examples, and design patterns.

## Common Components

### Button

**Purpose**: Primary interactive element for actions

**Location**: `src/components/common/Button.tsx`

**Props**:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  // ...extends ButtonHTMLAttributes
}
```

**Variants**:
- `primary`: Main actions (blue background)
- `secondary`: Secondary actions (gray background)
- `danger`: Destructive actions (red background)
- `outline`: Outlined button

**Usage**:
```tsx
<Button variant="primary" onClick={handleSubmit}>
  Submit Request
</Button>

<Button variant="danger" isLoading={isDeleting}>
  Delete
</Button>
```

---

### Input

**Purpose**: Form input field with label and error support

**Location**: `src/components/common/Input.tsx`

**Props**:
```typescript
interface InputProps {
  label?: string;
  error?: string;
  helpText?: string;
  // ...extends InputHTMLAttributes
}
```

**Features**:
- Auto-displays required asterisk
- Error state with red border
- Help text support
- Forward ref for react-hook-form

**Usage**:
```tsx
<Input
  label="Email"
  type="email"
  required
  error={errors.email?.message}
  {...register('email')}
/>
```

---

### Card

**Purpose**: Content container with optional title and actions

**Location**: `src/components/common/Card.tsx`

**Props**:
```typescript
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}
```

**Usage**:
```tsx
<Card 
  title="Request Information"
  actions={<Button size="sm">Edit</Button>}
>
  <p>Card content here</p>
</Card>
```

---

### Modal

**Purpose**: Dialog overlay for confirmations and forms

**Location**: `src/components/common/Modal.tsx`

**Props**:
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
```

**Features**:
- Backdrop overlay
- Click outside to close
- Close button
- Responsive sizing

**Usage**:
```tsx
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Approve Request"
>
  <p>Modal content</p>
  <Button onClick={handleApprove}>Confirm</Button>
</Modal>
```

---

### Spinner

**Purpose**: Loading indicator

**Location**: `src/components/common/Spinner.tsx`

**Props**:
```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Components**:
- `Spinner`: Inline spinner
- `LoadingPage`: Full-page loading state

**Usage**:
```tsx
{isLoading ? <Spinner /> : <Content />}

// Or full page
<LoadingPage />
```

---

### StatusBadge

**Purpose**: Display request status with color coding

**Location**: `src/components/common/StatusBadge.tsx`

**Props**:
```typescript
interface StatusBadgeProps {
  status: RequestStatus; // 'PENDING' | 'APPROVED' | 'REJECTED'
  className?: string;
}
```

**Colors**:
- PENDING: Yellow background
- APPROVED: Green background
- REJECTED: Red background

**Usage**:
```tsx
<StatusBadge status={request.status} />
```

---

## Layout Components

### HeaderComponent

**Purpose**: Top navigation bar with user menu

**Location**: `src/components/layout/Header.tsx`

**Features**:
- App logo/name
- Navigation links
- User avatar with initials
- Role display
- Logout button
- Responsive menu

**Auto-renders for**:
- Dashboard link
- Requests link
- Orders link (finance/admin only)

---

### MainLayout

**Purpose**: Page wrapper with header

**Location**: `src/components/layout/MainLayout.tsx`

**Props**:
```typescript
interface MainLayoutProps {
  children: React.ReactNode;
}
```

**Layout**:
- Header at top
- Main content area
- Centered max-width container
- Consistent padding

**Usage**:
```tsx
<MainLayout>
  <YourPageContent />
</MainLayout>
```

---

## Design Patterns

### Component Structure

All components follow this pattern:
```typescript
import React from 'react';
import clsx from 'clsx';

interface ComponentProps {
  // Props definition
}

export const Component: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2 
}) => {
  return (
    <div className={clsx('base-classes', conditionalClasses)}>
      {/* Component JSX */}
    </div>
  );
};
```

### Styling Convention

- Use Tailwind utility classes
- No inline styles
- Use `clsx` for conditional classes
- Custom classes defined in `index.css`

### TypeScript Types

- All props fully typed
- No `any` types
- Proper union types for variants
- Extends HTML attributes where applicable

### Accessibility

- Proper ARIA labels
- Keyboard navigation
- Focus indicators
- Semantic HTML

## Custom Tailwind Classes

Defined in `src/index.css`:

```css
.btn              // Base button styles
.btn-primary      // Primary button
.btn-secondary    // Secondary button
.btn-danger       // Danger button

.input            // Form input styles
.label            // Form label styles

.card             // Card container

.badge            // Base badge
.badge-pending    // Yellow badge
.badge-approved   // Green badge
.badge-rejected   // Red badge
```

## Component Composition

### Form Example

```tsx
<Card title="Create Request">
  <form onSubmit={handleSubmit}>
    <Input
      label="Title"
      required
      error={errors.title}
      {...register('title')}
    />
    <Input
      label="Description"
      {...register('description')}
    />
    <Button type="submit" isLoading={isSubmitting}>
      Submit
    </Button>
  </form>
</Card>
```

### Modal Confirmation Example

```tsx
<Modal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirm Action"
>
  <p>Are you sure?</p>
  <div className="flex space-x-3">
    <Button variant="secondary" onClick={onClose}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleConfirm}>
      Confirm
    </Button>
  </div>
</Modal>
```

## Future Components

Planned but not yet implemented:
- Table component with sorting
- Pagination component
- FileUpload component
- Select/Dropdown component
- DatePicker component
- Chart components

---

**Total Components**: 8 (6 common + 2 layout)  
**Fully Typed**: Yes  
**Accessible**: Yes
