import React from 'react';
import clsx from 'clsx';

type TypographyVariant = 
  | 'display-1' | 'display-2' | 'display-3'
  | 'heading-1' | 'heading-2' | 'heading-3' | 'heading-4' | 'heading-5'
  | 'body-large' | 'body' | 'body-small'
  | 'caption' | 'overline';

type TypographyColor = 
  | 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  | 'muted' | 'emphasis' | 'subtle';

type TypographyElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';

interface TypographyProps {
  variant?: TypographyVariant;
  color?: TypographyColor;
  as?: TypographyElement;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<TypographyVariant, string> = {
  'display-1': 'text-display-1',
  'display-2': 'text-display-2',
  'display-3': 'text-display-3',
  'heading-1': 'text-heading-1',
  'heading-2': 'text-heading-2',
  'heading-3': 'text-heading-3',
  'heading-4': 'text-heading-4',
  'heading-5': 'text-heading-5',
  'body-large': 'text-body-large',
  'body': 'text-body',
  'body-small': 'text-body-small',
  'caption': 'text-caption',
  'overline': 'text-overline',
};

const colorClasses: Record<TypographyColor, string> = {
  default: 'text-gray-900',
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  muted: 'text-muted',
  emphasis: 'text-emphasis',
  subtle: 'text-subtle',
};

const defaultElements: Record<TypographyVariant, TypographyElement> = {
  'display-1': 'h1',
  'display-2': 'h1',
  'display-3': 'h1',
  'heading-1': 'h1',
  'heading-2': 'h2',
  'heading-3': 'h3',
  'heading-4': 'h4',
  'heading-5': 'h5',
  'body-large': 'p',
  'body': 'p',
  'body-small': 'p',
  'caption': 'span',
  'overline': 'span',
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = 'default',
  as,
  className,
  children,
  ...props
}) => {
  const Component = as || defaultElements[variant];
  
  return (
    <Component
      className={clsx(
        variantClasses[variant],
        colorClasses[color],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

// Convenience components for common use cases
export const Heading: React.FC<Omit<TypographyProps, 'variant'> & { level?: 1 | 2 | 3 | 4 | 5 }> = ({
  level = 1,
  ...props
}) => {
  const variant = `heading-${level}` as TypographyVariant;
  return <Typography variant={variant} {...props} />;
};

export const Display: React.FC<Omit<TypographyProps, 'variant'> & { level?: 1 | 2 | 3 }> = ({
  level = 1,
  ...props
}) => {
  const variant = `display-${level}` as TypographyVariant;
  return <Typography variant={variant} {...props} />;
};

export const Body: React.FC<Omit<TypographyProps, 'variant'> & { size?: 'large' | 'normal' | 'small' }> = ({
  size = 'normal',
  ...props
}) => {
  const variant = size === 'large' ? 'body-large' : size === 'small' ? 'body-small' : 'body';
  return <Typography variant={variant} {...props} />;
};

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Overline: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="overline" {...props} />
);