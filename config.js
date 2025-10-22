// Environment-specific configuration
const ENV_CONFIG = {
    dev: {
        API_BASE_URL: 'https://your-api-id.execute-api.region.amazonaws.com/dev',
        LOG_LEVEL: 'debug'
    },
    staging: {
        API_BASE_URL: 'https://your-api-id.execute-api.region.amazonaws.com/staging',
        LOG_LEVEL: 'info'
    },
    prod: {
        API_BASE_URL: 'https://your-api-id.execute-api.region.amazonaws.com/prod',
        LOG_LEVEL: 'error'
    }
};

// Get current environment
const getCurrentEnv = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return 'dev';
    } else if (hostname.includes('staging')) {
        return 'staging';
    } else {
        return 'prod';
    }
};

// Export configuration
export const CONFIG = ENV_CONFIG[getCurrentEnv()];