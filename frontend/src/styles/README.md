# Design System Documentation

This document outlines the typography and spacing system for the P2P Procurement System frontend.

## Typography System

### Typography Components

Use the `Typography` component for consistent text styling:

```tsx
import { Typography, Heading, Display, Body, Caption } from '@/components/common';

// Display text (for hero sections, landing pages)
<Display level={1}>Welcome to P2P System</Display>
<Display level={2}>Streamline Your Procurement</Display>

// Headings (for page titles, section headers)
<Heading level={1}>Dashboard</Heading>
<Heading level={2}>Recent Requests</Heading>
<Heading level={3}>Request Details</Heading>

// Body text (for content, descriptions)
<Body size="large">This is important content that needs emphasis.</Body>
<Body>This is regular body text for most content.</Body>
<Body size="small">This is smaller text for secondary information.</Body>

// Captions and labels
<Caption>Last updated: 2 hours ago</Caption>
<Overline>Section Label</Overline>
```

### Typography Classes

You can also use CSS classes directly:

```css
/* Display text */
.text-display-1    /* 5xl/6xl, bold, tight spacing */
.text-display-2    /* 4xl/5xl, bold, tight spacing */
.text-display-3    /* 3xl/4xl, bold, tight spacing */

/* Headings */
.text-heading-1    /* 2xl/3xl, semibold */
.text-heading-2    /* xl/2xl, semibold */
.text-heading-3    /* lg/xl, semibold */
.text-heading-4    /* base/lg, semibold */
.text-heading-5    /* sm, semibold, uppercase, tracking-wide */

/* Body text */
.text-body-large   /* lg, relaxed line height */
.text-body         /* base, normal line height */
.text-body-small   /* sm, normal line height */

/* Utility text */
.text-caption      /* xs, tight line height */
.text-overline     /* xs, medium weight, uppercase, wide tracking */
```

### Semantic Colors

Use semantic color classes for consistent meaning:

```css
.text-primary      /* Primary brand color */
.text-secondary    /* Secondary/neutral color */
.text-success      /* Success states */
.text-warning      /* Warning states */
.text-error        /* Error states */
.text-muted        /* De-emphasized text */
.text-emphasis     /* Emphasized text */
.text-subtle       /* Very subtle text */
```

## Spacing System

### Spacing Components

Use spacing components for consistent layouts:

```tsx
import { VStack, HStack, Stack, Section, Container } from '@/components/common';

// Vertical spacing
<VStack size="component">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</VStack>

// Horizontal spacing
<HStack size="element">
  <button>Cancel</button>
  <button>Save</button>
</HStack>

// Conditional spacing
<Stack isInline={isMobile ? false : true} size="content">
  <div>Content 1</div>
  <div>Content 2</div>
</Stack>

// Page sections
<Section spacing="section">
  <Heading level={1}>Page Title</Heading>
  <Body>Page content goes here...</Body>
</Section>

// Containers with max width
<Container maxWidth="2xl" spacing="content">
  <div>Centered content with consistent spacing</div>
</Container>
```

### Spacing Classes

Direct CSS classes for spacing:

```css
/* Vertical spacing */
.space-tight       /* 4px between items */
.space-element     /* 8px between items */
.space-component   /* 16px between items */
.space-content     /* 24px between items */
.space-section     /* 32px between items */

/* Padding utilities */
.p-element         /* 8px padding */
.p-component       /* 16px padding */
.p-content         /* 24px padding */
.p-section         /* 32px padding */

/* Margin utilities */
.m-element         /* 8px margin */
.m-component       /* 16px margin */
.m-content         /* 24px margin */
.m-section         /* 32px margin */
```

### Spacing Scale

The spacing system follows a consistent scale:

- **tight**: 4px - For very close related elements
- **element**: 8px - Between form elements, small components
- **component**: 16px - Between components, cards
- **content**: 24px - Between content sections
- **section**: 32px - Between major page sections

## Color System

### Primary Colors

```css
/* Primary brand colors */
.bg-primary-50 to .bg-primary-900
.text-primary-50 to .text-primary-900
.border-primary-50 to .border-primary-900
```

### Semantic Colors

```css
/* Success (green) */
.bg-success-50 to .bg-success-900
.text-success-50 to .text-success-900

/* Warning (amber) */
.bg-warning-50 to .bg-warning-900
.text-warning-50 to .text-warning-900

/* Error (red) */
.bg-error-50 to .bg-error-900
.text-error-50 to .text-error-900

/* Secondary/Neutral (slate) */
.bg-secondary-50 to .bg-secondary-900
.text-secondary-50 to .text-secondary-900
```

## Component Examples

### Card with Typography

```tsx
<Card title="Request Details" variant="elevated">
  <VStack size="component">
    <div>
      <Overline color="muted">Request ID</Overline>
      <Body color="emphasis">REQ-2024-001</Body>
    </div>
    <div>
      <Overline color="muted">Status</Overline>
      <Body color="success">Approved</Body>
    </div>
    <div>
      <Caption color="muted">Last updated 2 hours ago</Caption>
    </div>
  </VStack>
</Card>
```

### Form with Consistent Spacing

```tsx
<Section>
  <Heading level={2}>Create New Request</Heading>
  <VStack size="component">
    <Input 
      label="Request Title" 
      placeholder="Enter request title"
    />
    <Input 
      label="Description" 
      placeholder="Describe your request"
    />
    <HStack size="element">
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Create Request</Button>
    </HStack>
  </VStack>
</Section>
```

## Best Practices

### Typography

1. **Use semantic components** - Prefer `<Heading level={2}>` over `<h2 className="text-heading-2">`
2. **Maintain hierarchy** - Use heading levels in order (h1 → h2 → h3)
3. **Use semantic colors** - Use `color="error"` instead of `className="text-red-600"`
4. **Be consistent** - Use the same typography patterns across similar components

### Spacing

1. **Use spacing components** - Prefer `<VStack>` over manual margin/padding
2. **Follow the scale** - Stick to the defined spacing sizes
3. **Be semantic** - Use `size="section"` for major sections, `size="element"` for small items
4. **Responsive design** - Components automatically handle responsive spacing

### Colors

1. **Use semantic colors** - `success`, `warning`, `error` for states
2. **Consistent shades** - Use 600 for primary colors, 500 for hover states
3. **Accessibility** - Ensure sufficient contrast ratios
4. **Brand consistency** - Use primary colors for brand elements

## Migration Guide

### From Old Classes to New System

```css
/* Old → New */
.text-lg.font-semibold → .text-heading-3
.text-sm.text-gray-500 → .text-body-small.text-muted
.space-y-4 → use <VStack size="component">
.text-red-600 → .text-error
.bg-green-100 → .bg-success-100
```

### Component Updates

When updating existing components:

1. Replace manual typography classes with Typography components
2. Replace manual spacing with Spacing components  
3. Update color references to use semantic color system
4. Test responsive behavior with new components