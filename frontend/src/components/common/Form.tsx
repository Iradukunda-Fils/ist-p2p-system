import React from 'react';
import clsx from 'clsx';
import { VStack, HStack } from './Spacing';
import { Typography } from './Typography';

// Form container component
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  title?: string;
  description?: string;
  spacing?: 'tight' | 'element' | 'component' | 'content';
  className?: string;
  children: React.ReactNode;
}

export const Form: React.FC<FormProps> = ({
  title,
  description,
  spacing = 'component',
  className,
  children,
  ...props
}) => {
  return (
    <form className={clsx('w-full', className)} {...props}>
      <VStack size={spacing}>
        {(title || description) && (
          <div>
            {title && (
              <Typography variant="heading-3" className="mb-2">
                {title}
              </Typography>
            )}
            {description && (
              <Typography variant="body-small" color="muted">
                {description}
              </Typography>
            )}
          </div>
        )}
        {children}
      </VStack>
    </form>
  );
};

// Form section component for grouping related fields
interface FormSectionProps {
  title?: string;
  description?: string;
  spacing?: 'tight' | 'element' | 'component' | 'content';
  className?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  spacing = 'element',
  className,
  children,
}) => {
  return (
    <div className={clsx('w-full', className)}>
      <VStack size={spacing}>
        {(title || description) && (
          <div>
            {title && (
              <Typography variant="heading-4" className="mb-1">
                {title}
              </Typography>
            )}
            {description && (
              <Typography variant="body-small" color="muted">
                {description}
              </Typography>
            )}
          </div>
        )}
        <VStack size={spacing}>
          {children}
        </VStack>
      </VStack>
    </div>
  );
};

// Form field wrapper with consistent spacing and layout
interface FormFieldProps {
  label?: string;
  error?: string;
  helpText?: string;
  isRequired?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helpText,
  isRequired = false,
  className,
  children,
}) => {
  const fieldId = React.useId();

  return (
    <div className={clsx('w-full', className)}>
      <VStack size="tight">
        {label && (
          <label 
            htmlFor={fieldId}
            className="block text-sm font-medium text-secondary-700"
          >
            {label}
            {isRequired && (
              <span className="text-error-500 ml-1" aria-label="required">*</span>
            )}
          </label>
        )}
        
        <div>
          {React.cloneElement(children as React.ReactElement, { 
            id: fieldId,
            'aria-invalid': !!error,
            'aria-describedby': error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined,
          })}
        </div>
        
        {error && (
          <div 
            id={`${fieldId}-error`}
            className="flex items-start space-x-1"
            role="alert"
          >
            <svg 
              className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            <Typography variant="body-small" color="error">
              {error}
            </Typography>
          </div>
        )}
        
        {helpText && !error && (
          <Typography 
            variant="body-small" 
            color="muted"
            id={`${fieldId}-help`}
          >
            {helpText}
          </Typography>
        )}
      </VStack>
    </div>
  );
};

// Form actions container for buttons
interface FormActionsProps {
  align?: 'left' | 'center' | 'right';
  spacing?: 'tight' | 'element' | 'component';
  className?: string;
  children: React.ReactNode;
}

export const FormActions: React.FC<FormActionsProps> = ({
  align = 'right',
  spacing = 'element',
  className,
  children,
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={clsx('w-full pt-4 border-t border-secondary-200', className)}>
      <HStack size={spacing} className={clsx('flex', alignClasses[align])}>
        {children}
      </HStack>
    </div>
  );
};

// Form group for inline fields (like first name + last name)
interface FormGroupProps {
  spacing?: 'tight' | 'element' | 'component';
  className?: string;
  children: React.ReactNode;
}

export const FormGroup: React.FC<FormGroupProps> = ({
  spacing = 'element',
  className,
  children,
}) => {
  return (
    <div className={clsx('w-full', className)}>
      <HStack size={spacing} className="items-start">
        {children}
      </HStack>
    </div>
  );
};

// Form error summary component
interface FormErrorSummaryProps {
  errors: string[];
  title?: string;
  className?: string;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  title = 'Please correct the following errors:',
  className,
}) => {
  if (errors.length === 0) return null;

  return (
    <div className={clsx(
      'bg-error-50 border border-error-200 rounded-md p-4',
      className
    )}>
      <VStack size="tight">
        <div className="flex items-center">
          <svg 
            className="w-5 h-5 text-error-500 mr-2" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          <Typography variant="body-small" color="error" className="font-medium">
            {title}
          </Typography>
        </div>
        
        <ul className="list-disc list-inside space-y-1 ml-7">
          {errors.map((error, index) => (
            <li key={index}>
              <Typography variant="body-small" color="error">
                {error}
              </Typography>
            </li>
          ))}
        </ul>
      </VStack>
    </div>
  );
};