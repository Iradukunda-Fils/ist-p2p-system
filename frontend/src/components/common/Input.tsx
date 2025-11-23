import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helpText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    variant?: 'default' | 'filled' | 'flushed';
    size?: 'sm' | 'md' | 'lg';
    isInvalid?: boolean;
    isRequired?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ 
        label, 
        error, 
        helpText, 
        leftIcon, 
        rightIcon, 
        variant = 'default',
        size = 'md',
        isInvalid = false,
        isRequired = false,
        className, 
        ...props 
    }, ref) => {
        const hasError = error || isInvalid;
        const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

        const baseClasses = 'block w-full transition-colors duration-200 focus:outline-none';
        
        const variantClasses = {
            default: 'border border-secondary-300 rounded-md shadow-soft bg-white',
            filled: 'border-0 bg-secondary-100 rounded-md',
            flushed: 'border-0 border-b-2 border-secondary-300 rounded-none bg-transparent px-0',
        };

        const sizeClasses = {
            sm: 'px-3 py-2 text-sm',
            md: 'px-3 py-2.5 text-sm',
            lg: 'px-4 py-3 text-base',
        };

        const focusClasses = hasError 
            ? 'focus:border-error-500 focus:ring-2 focus:ring-error-500 focus:ring-opacity-20'
            : 'focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20';

        const errorClasses = hasError 
            ? 'border-error-500 bg-error-50' 
            : '';

        const iconPadding = {
            left: leftIcon ? (size === 'sm' ? 'pl-10' : size === 'lg' ? 'pl-12' : 'pl-11') : '',
            right: rightIcon ? (size === 'sm' ? 'pr-10' : size === 'lg' ? 'pr-12' : 'pr-11') : '',
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
                
                <div className="relative">
                    {leftIcon && (
                        <div className={clsx(
                            'absolute inset-y-0 left-0 flex items-center pointer-events-none',
                            size === 'sm' ? 'pl-3' : size === 'lg' ? 'pl-4' : 'pl-3'
                        )}>
                            <span className={clsx(
                                'text-secondary-400',
                                size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
                            )}>
                                {leftIcon}
                            </span>
                        </div>
                    )}
                    
                    <input
                        ref={ref}
                        id={inputId}
                        className={clsx(
                            baseClasses,
                            variantClasses[variant],
                            sizeClasses[size],
                            focusClasses,
                            errorClasses,
                            iconPadding.left,
                            iconPadding.right,
                            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
                            className
                        )}
                        aria-invalid={hasError}
                        aria-describedby={
                            error ? `${inputId}-error` : 
                            helpText ? `${inputId}-help` : undefined
                        }
                        {...props}
                    />
                    
                    {rightIcon && (
                        <div className={clsx(
                            'absolute inset-y-0 right-0 flex items-center pointer-events-none',
                            size === 'sm' ? 'pr-3' : size === 'lg' ? 'pr-4' : 'pr-3'
                        )}>
                            <span className={clsx(
                                hasError ? 'text-error-400' : 'text-secondary-400',
                                size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
                            )}>
                                {rightIcon}
                            </span>
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

Input.displayName = 'Input';
