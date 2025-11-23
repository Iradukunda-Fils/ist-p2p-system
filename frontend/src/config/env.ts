/**
 * Environment configuration and validation
 * Ensures all required environment variables are properly configured
 */

interface EnvConfig {
  apiBaseUrl: string;
  appName: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Validate and return environment configuration
 * Throws helpful errors if configuration is missing or invalid
 */
export const getEnvConfig = (): EnvConfig => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const appName = import.meta.env.VITE_APP_NAME;

  // Validate required environment variables
  if (!apiBaseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is not defined. Please check your .env file.\n' +
      'Expected: VITE_API_BASE_URL=http://localhost:8000/api'
    );
  }

  // Warn about common configuration errors
  if (apiBaseUrl.includes(':5000')) {
    console.warn(
      '⚠️  WARNING: API URL is pointing to port 5000.\n' +
      '   Django typically runs on port 8000.\n' +
      '   Please verify this is correct.'
    );
  }

  if (!apiBaseUrl.endsWith('/api')) {
    console.warn(
      '⚠️  WARNING: API Base URL should typically end with "/api".\n' +
      `   Current value: ${apiBaseUrl}`
    );
  }

  return {
    apiBaseUrl,
    appName: appName || 'P2P Procurement System',
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  };
};

// Export singleton instance
export const env = getEnvConfig();

// Log configuration in development
if (env.isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    apiBaseUrl: env.apiBaseUrl,
    appName: env.appName,
    mode: env.isDevelopment ? 'development' : 'production',
  });
}
