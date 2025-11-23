import React from 'react';
import clsx from 'clsx';
import { Input } from './Input';
import { Typography } from './Typography';
import { VStack } from './Spacing';

// Enhanced textarea component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  variant?: 'default' | 'filled' | 'flushed';
  size?: 'sm' | 'md' | 'lg';
  isInvalid?: boolean;
  isRequired?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    label, 
    error, 
    helpText, 
    variant = 'default',
    size = 'md',
    isInvalid = false,
    isRequired = false,
    resize = 'vertical',
    className, 
    ...props 
  }, ref) => {
    const hasError = error || isInvalid;
    const inputId = props.id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses = 'block w-full transition-colors duration-200 focus:outline-none';
    
    const variantClasses = {
      default: 'border border-secondary-300 rounded-md shadow-soft bg-white',
      filled: 'border-0 bg-secondary-100 rounded-md',
      flushed: 'border-0 border-b-2 border-secondary-300 rounded-none bg-transparent px-0',
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm min-h-[80px]',
      md: 'px-3 py-2.5 text-sm min-h-[100px]',
      lg: 'px-4 py-3 text-base min-h-[120px]',
    };

    const focusClasses = hasError 
      ? 'focus:border-error-500 focus:ring-2 focus:ring-error-500 focus:ring-opacity-20'
      : 'focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20';

    const errorClasses = hasError 
      ? 'border-error-500 bg-error-50' 
      : '';

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    return (
      <div className="w-full">
        {label && (
          <label 
            className="block text-sm font-medium text-secondary-700 mb-2" 
            htmlFor={inputId}
          >
            {label}
            {(props.required || isRequired) && (
              <span className="text-error-500 ml-1" aria-label="required">*</span>
            )}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            baseClasses,
            variantClasses[variant],
            sizeClasses[size],
            focusClasses,
            errorClasses,
            resizeClasses[resize],
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-secondary-50',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : 
            helpText ? `${inputId}-help` : undefined
          }
          {...props}
        />
        
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-2 text-sm text-error-600 flex items-center"
            role="alert"
          >
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {helpText && !error && (
          <p 
            id={`${inputId}-help`}
            className="mt-2 text-sm text-secondary-500"
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Enhanced select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  placeholder?: string;
  variant?: 'default' | 'filled' | 'flushed';
  size?: 'sm' | 'md' | 'lg';
  isInvalid?: boolean;
  isRequired?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    label, 
    error, 
    helpText, 
    placeholder,
    variant = 'default',
    size = 'md',
    isInvalid = false,
    isRequired = false,
    options,
    className, 
    ...props 
  }, ref) => {
    const hasError = error || isInvalid;
    const inputId = props.id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses = 'block w-full transition-colors duration-200 focus:outline-none appearance-none bg-no-repeat bg-right';
    
    const variantClasses = {
      default: 'border border-secondary-300 rounded-md shadow-soft bg-white',
      filled: 'border-0 bg-secondary-100 rounded-md',
      flushed: 'border-0 border-b-2 border-secondary-300 rounded-none bg-transparent px-0',
    };

    const sizeClasses = {
      sm: 'px-3 py-2 pr-8 text-sm',
      md: 'px-3 py-2.5 pr-10 text-sm',
      lg: 'px-4 py-3 pr-12 text-base',
    };

    const focusClasses = hasError 
      ? 'focus:border-error-500 focus:ring-2 focus:ring-error-500 focus:ring-opacity-20'
      : 'focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20';

    const errorClasses = hasError 
      ? 'border-error-500 bg-error-50' 
      : '';

    // Chevron down icon as background image
    const chevronIcon = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`;

    return (
      <div className="w-full">
        {label && (
          <label 
            className="block text-sm font-medium text-secondary-700 mb-2" 
            htmlFor={inputId}
          >
            {label}
            {(props.required || isRequired) && (
              <span className="text-error-500 ml-1" aria-label="required">*</span>
            )}
          </label>
        )}
        
        <select
          ref={ref}
          id={inputId}
          className={clsx(
            baseClasses,
            variantClasses[variant],
            sizeClasses[size],
            focusClasses,
            errorClasses,
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-secondary-50',
            className
          )}
          style={{
            backgroundImage: chevronIcon,
            backgroundPosition: `right ${size === 'sm' ? '0.5rem' : size === 'lg' ? '1rem' : '0.75rem'} center`,
            backgroundSize: '1.25rem 1.25rem',
          }}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : 
            helpText ? `${inputId}-help` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-2 text-sm text-error-600 flex items-center"
            role="alert"
          >
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {helpText && !error && (
          <p 
            id={`${inputId}-help`}
            className="mt-2 text-sm text-secondary-500"
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Checkbox component
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
  isInvalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    label, 
    description,
    error, 
    isInvalid = false,
    size = 'md',
    className, 
    ...props 
  }, ref) => {
    const hasError = error || isInvalid;
    const inputId = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const baseClasses = 'rounded border-secondary-300 text-primary-600 focus:ring-primary-500 focus:ring-2 focus:ring-offset-2 transition-colors';
    const errorClasses = hasError ? 'border-error-500' : '';

    return (
      <div className="w-full">
        <div className="flex items-start">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className={clsx(
              baseClasses,
              sizeClasses[size],
              errorClasses,
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : 
              description ? `${inputId}-description` : undefined
            }
            {...props}
          />
          
          {(label || description) && (
            <div className="ml-3 flex-1">
              {label && (
                <label 
                  htmlFor={inputId}
                  className="text-sm font-medium text-secondary-900 cursor-pointer"
                >
                  {label}
                </label>
              )}
              {description && (
                <p 
                  id={`${inputId}-description`}
                  className="text-sm text-secondary-500 mt-1"
                >
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <p 
            id={`${inputId}-error`}
            className="mt-2 text-sm text-error-600 flex items-center"
            role="alert"
          >
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Radio group component
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  label?: string;
  error?: string;
  helpText?: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  isRequired?: boolean;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  label,
  error,
  helpText,
  options,
  value,
  onChange,
  isRequired = false,
  size = 'md',
  orientation = 'vertical',
  className,
}) => {
  const groupId = `radio-group-${Math.random().toString(36).substr(2, 9)}`;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const baseClasses = 'border-secondary-300 text-primary-600 focus:ring-primary-500 focus:ring-2 focus:ring-offset-2 transition-colors';
  const errorClasses = error ? 'border-error-500' : '';

  return (
    <div className={clsx('w-full', className)}>
      <VStack size="tight">
        {label && (
          <label className="block text-sm font-medium text-secondary-700">
            {label}
            {isRequired && (
              <span className="text-error-500 ml-1" aria-label="required">*</span>
            )}
          </label>
        )}
        
        <div 
          className={clsx(
            orientation === 'horizontal' ? 'flex flex-wrap gap-6' : 'space-y-3'
          )}
          role="radiogroup"
          aria-labelledby={label ? groupId : undefined}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${groupId}-error` : 
            helpText ? `${groupId}-help` : undefined
          }
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-start">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled}
                className={clsx(
                  baseClasses,
                  sizeClasses[size],
                  errorClasses,
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              />
              
              <div className="ml-3 flex-1">
                <label 
                  className="text-sm font-medium text-secondary-900 cursor-pointer"
                  onClick={() => !option.disabled && onChange?.(option.value)}
                >
                  {option.label}
                </label>
                {option.description && (
                  <p className="text-sm text-secondary-500 mt-1">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {error && (
          <p 
            id={`${groupId}-error`}
            className="text-sm text-error-600 flex items-center"
            role="alert"
          >
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {helpText && !error && (
          <p 
            id={`${groupId}-help`}
            className="text-sm text-secondary-500"
          >
            {helpText}
          </p>
        )}
      </VStack>
    </div>
  );
};