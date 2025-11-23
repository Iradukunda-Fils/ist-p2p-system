import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showDetails?: boolean;
    level?: 'page' | 'section' | 'component';
    resetKeys?: Array<string | number>;
    resetOnPropsChange?: boolean;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
    eventId?: string;
}

/**
 * Enhanced error boundary component with recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
    private resetTimeoutId: number | null = null;

    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { 
            hasError: true, 
            error,
            eventId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        this.setState({
            errorInfo
        });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Report to error tracking service (e.g., Sentry)
        // if (window.Sentry) {
        //     window.Sentry.captureException(error, {
        //         contexts: { react: { componentStack: errorInfo.componentStack } }
        //     });
        // }
    }

    public componentDidUpdate(prevProps: Props) {
        const { resetKeys, resetOnPropsChange } = this.props;
        const { hasError } = this.state;

        if (hasError && prevProps.resetKeys !== resetKeys) {
            if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
                this.resetErrorBoundary();
            }
        }

        if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
            this.resetErrorBoundary();
        }
    }

    public componentWillUnmount() {
        if (this.resetTimeoutId) {
            clearTimeout(this.resetTimeoutId);
        }
    }

    private resetErrorBoundary = () => {
        if (this.resetTimeoutId) {
            clearTimeout(this.resetTimeoutId);
        }

        this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined,
            eventId: undefined
        });
    };

    private handleRetry = () => {
        this.resetErrorBoundary();
    };

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    private copyErrorDetails = () => {
        const { error, errorInfo, eventId } = this.state;
        const errorDetails = {
            eventId,
            error: error?.toString(),
            stack: error?.stack,
            componentStack: errorInfo?.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
            .then(() => {
                // Could show a toast notification here
                console.log('Error details copied to clipboard');
            })
            .catch(err => {
                console.error('Failed to copy error details:', err);
            });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { level = 'page', showDetails = true } = this.props;
            const { error, errorInfo, eventId } = this.state;

            // Component-level error boundary
            if (level === 'component') {
                return (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-red-800">Component Error</h3>
                                <p className="text-sm text-red-700 mt-1">This component failed to render properly.</p>
                                <div className="mt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={this.handleRetry}
                                        className="text-red-700 border-red-300 hover:bg-red-100"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }

            // Section-level error boundary
            if (level === 'section') {
                return (
                    <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
                        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Section Unavailable</h3>
                        <p className="mt-2 text-sm text-gray-600">This section encountered an error and couldn't load.</p>
                        <div className="mt-4 space-x-3">
                            <Button size="sm" onClick={this.handleRetry}>
                                Retry
                            </Button>
                            <Button size="sm" variant="outline" onClick={this.handleReload}>
                                Refresh Page
                            </Button>
                        </div>
                    </div>
                );
            }

            // Page-level error boundary (default)
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-lg w-full space-y-8 text-center">
                        <div>
                            <svg
                                className="mx-auto h-24 w-24 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <h2 className="mt-6 text-3xl font-bold text-gray-900">
                                Oops! Something went wrong
                            </h2>
                            <p className="mt-2 text-base text-gray-600">
                                We encountered an unexpected error. Don't worry, our team has been notified.
                            </p>
                            {eventId && (
                                <p className="mt-2 text-sm text-gray-500">
                                    Error ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{eventId}</code>
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button onClick={this.handleRetry} leftIcon={
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                }>
                                    Try Again
                                </Button>
                                <Button variant="secondary" onClick={this.handleReload}>
                                    Refresh Page
                                </Button>
                                <Button variant="outline" onClick={this.handleGoHome}>
                                    Go to Dashboard
                                </Button>
                            </div>

                            {showDetails && error && (
                                <details className="mt-6 text-left bg-gray-100 rounded-lg p-4">
                                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center justify-between">
                                        Technical Details
                                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </summary>
                                    <div className="mt-3 space-y-3">
                                        <div>
                                            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Error Message</h4>
                                            <pre className="mt-1 text-xs bg-white p-3 rounded border overflow-auto">
                                                {error.message}
                                            </pre>
                                        </div>
                                        {error.stack && (
                                            <div>
                                                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Stack Trace</h4>
                                                <pre className="mt-1 text-xs bg-white p-3 rounded border overflow-auto max-h-32">
                                                    {error.stack}
                                                </pre>
                                            </div>
                                        )}
                                        <div className="pt-2 border-t border-gray-200">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={this.copyErrorDetails}
                                                leftIcon={
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                }
                                            >
                                                Copy Error Details
                                            </Button>
                                        </div>
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
