import React from 'react';
import clsx from 'clsx';

type SpacingSize = 'tight' | 'element' | 'component' | 'content' | 'section';
type SpacingDirection = 'vertical' | 'horizontal' | 'all';

interface SpacingProps {
  size?: SpacingSize;
  direction?: SpacingDirection;
  className?: string;
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

const spacingClasses: Record<SpacingSize, Record<SpacingDirection, string>> = {
  tight: {
    vertical: 'space-y-1',
    horizontal: 'space-x-1',
    all: 'gap-1',
  },
  element: {
    vertical: 'space-y-2',
    horizontal: 'space-x-2',
    all: 'gap-2',
  },
  component: {
    vertical: 'space-y-4',
    horizontal: 'space-x-4',
    all: 'gap-4',
  },
  content: {
    vertical: 'space-y-6',
    horizontal: 'space-x-6',
    all: 'gap-6',
  },
  section: {
    vertical: 'space-y-8',
    horizontal: 'space-x-8',
    all: 'gap-8',
  },
};

export const Spacing: React.FC<SpacingProps> = ({
  size = 'component',
  direction = 'vertical',
  className,
  children,
  as: Component = 'div',
  ...props
}) => {
  return (
    <Component
      className={clsx(
        spacingClasses[size][direction],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

// Convenience components for common layouts
export const VStack: React.FC<Omit<SpacingProps, 'direction'>> = (props) => (
  <Spacing direction="vertical" {...props} />
);

export const HStack: React.FC<Omit<SpacingProps, 'direction'>> = (props) => (
  <Spacing direction="horizontal" {...props} />
);

export const Stack: React.FC<SpacingProps & { isInline?: boolean }> = ({ 
  isInline = false, 
  ...props 
}) => (
  <Spacing 
    direction={isInline ? 'horizontal' : 'vertical'} 
    as={isInline ? 'span' : 'div'}
    {...props} 
  />
);

// Layout containers with consistent spacing
export const Section: React.FC<{ 
  className?: string; 
  children: React.ReactNode;
  spacing?: SpacingSize;
}> = ({ 
  className, 
  children, 
  spacing = 'section' 
}) => (
  <section className={clsx('p-section', className)}>
    <VStack size={spacing}>
      {children}
    </VStack>
  </section>
);

export const Container: React.FC<{ 
  className?: string; 
  children: React.ReactNode;
  spacing?: SpacingSize;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
}> = ({ 
  className, 
  children, 
  spacing = 'content',
  maxWidth = '7xl'
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className={clsx(
      'mx-auto px-4 sm:px-6 lg:px-8',
      maxWidthClasses[maxWidth],
      className
    )}>
      <VStack size={spacing}>
        {children}
      </VStack>
    </div>
  );
};