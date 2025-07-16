// API Configuration
const API_CONFIG = {
    BASE_URL: 'https://13.60.90.28/api',  // HTTP → HTTPS
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

// API Class
class PostGISAPI {
    constructor(config) {
        this.baseURL = config.BASE_URL;
        this.timeout = config.TIMEOUT;
        this.retryAttempts = config.RETRY_ATTEMPTS;
        this.retryDelay = config.RETRY_DELAY;
        
        // Setup axios defaults
        axios.defaults.timeout = this.timeout;
        axios.defaults.baseURL = this.baseURL;
    }

    // Retry wrapper for failed requests
    async retry(fn, attempts = this.retryAttempts) {
        try {
            return await fn();
        } catch (error) {
            if (attempts > 1) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.retry(fn, attempts - 1);
            }
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        return this.retry(async () => {
            const response = await axios.get('/health');
            return response.data;
        });
    }

    // Get all points
    async getAllPoints() {
        return this.retry(async () => {
            const response = await axios.get('/points');
            return response.data;
        });
    }

    // Add new point
    async addPoint(pointData) {
        return this.retry(async () => {
            const response = await axios.post('/points', pointData);
            return response.data;
        });
    }

    // Find nearby points
    async findNearby(lat, lng, radius = 1000) {
        return this.retry(async () => {
            const response = await axios.get('/nearby', {
                params: { lat, lng, radius }
            });
            return response.data;
        });
    }

    // Get categories
    async getCategories() {
        return this.retry(async () => {
            const response = await axios.get('/categories');
            return response.data;
        });
    }

    // Get statistics
    async getStats() {
        return this.retry(async () => {
            const response = await axios.get('/stats');
            return response.data;
        });
    }
}

// Initialize API instance
const api = new PostGISAPI(API_CONFIG);

// Export for global use
window.api = api;