// Application Manager
class AppManager {
    constructor() {
        this.points = [];
        this.categories = [];
        this.stats = {};
        this.activeCategory = null;
        this.isLoading = false;
        
        this.init();
    }

    // Initialize application
    async init() {
        try {
            // Show loading
            this.showLoading();
            
            // Check API health
            await this.checkAPIHealth();
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Hide loading
            this.hideLoading();
            
        } catch (error) {
            console.error('App initialization error:', error);
            this.showMessage('Failed to initialize application. Please check API connection.', 'error');
        }
    }

    // Check API health
    async checkAPIHealth() {
        try {
            const health = await api.healthCheck();
            this.updateAPIStatus(true, health);
        } catch (error) {
            this.updateAPIStatus(false, error.message);
            throw error;
        }
    }

    // Load initial data
    async loadInitialData() {
        try {
            // Load all data concurrently
            const [points, categories, stats] = await Promise.all([
                api.getAllPoints(),
                api.getCategories(),
                api.getStats()
            ]);
            
            this.points = points;
            this.categories = categories;
            this.stats = stats;
            
            // Update UI
            this.displayPoints(points);
            this.displayCategories(categories);
            this.displayStats(stats);
            
            // Add points to map
            mapManager.addPoints(points);
            
        } catch (error) {
            console.error('Data loading error:', error);
            throw error;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Add point form
        document.getElementById('add-point-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddPoint();
        });
    }

    // Update API status
    updateAPIStatus(isConnected, data) {
        const statusElement = document.getElementById('api-status');
        
        if (isConnected) {
            statusElement.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="status-icon bg-success"></span>
                    <div>
                        <strong class="status-connected">Connected</strong>
                        <div class="small text-muted">
                            ${data.database ? new Date(data.database.timestamp).toLocaleString() : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            statusElement.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="status-icon bg-danger"></span>
                    <div>
                        <strong class="status-error">Disconnected</strong>
                        <div class="small text-muted">${data}</div>
                    </div>
                </div>
            `;
        }
    }

    // Display statistics
    displayStats(stats) {
        const statsContent = document.getElementById('stats-content');
        
        statsContent.innerHTML = `
            <div class="stat-item">
                <span>Total Points</span>
                <span class="stat-value">${stats.total_points}</span>
            </div>
            <div class="stat-item">
                <span>Categories</span>
                <span class="stat-value">${stats.categories.length}</span>
            </div>
            <div class="stat-item">
                <span>Map Bounds</span>
                <span class="stat-value">
                    ${stats.bounds.min_lat?.toFixed(3)}, ${stats.bounds.min_lng?.toFixed(3)} - 
                    ${stats.bounds.max_lat?.toFixed(3)}, ${stats.bounds.max_lng?.toFixed(3)}
                </span>
            </div>
        `;
    }

    // Display categories
    displayCategories(categories) {
        const categoriesElement = document.getElementById('categories-list');
        
        categoriesElement.innerHTML = categories.map(category => `
            <div class="category-item ${this.activeCategory === category.category ? 'active' : ''}" 
                 onclick="appManager.filterByCategory('${category.category}')">
                <span class="category-name">${category.category}</span>
                <span class="category-badge">${category.count}</span>
            </div>
        `).join('');
    }

    // Display points
    displayPoints(points) {
        const pointsElement = document.getElementById('points-list');
        const countElement = document.getElementById('points-count');
        
        countElement.textContent = `${points.length} points`;
        
        if (points.length === 0) {
            pointsElement.innerHTML = '<div class="text-muted">No points found</div>';
            return;
        }
        
        pointsElement.innerHTML = points.map(point => `
            <div class="point-item fade-in" 
                 data-point-id="${point.id}"
                 onclick="appManager.highlightPoint(${point.id})">
                <div class="point-name">
                    ${point.name}
                    <span class="point-category">${point.category}</span>
                </div>
                ${point.description ? `<div class="point-description">${point.description}</div>` : ''}
                <div class="point-meta">
                    <span class="point-coords">${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}</span>
                    ${point.distance_meters ? `<span class="point-distance">${point.distance_meters}m</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    // Filter points by category
    async filterByCategory(category) {
        try {
            this.showLoading();
            
            let filteredPoints;
            
            if (category === this.activeCategory) {
                // Toggle off - show all points
                filteredPoints = await api.getAllPoints();
                this.activeCategory = null;
            } else {
                // Filter by category
                filteredPoints = await api.getPointsByCategory(category);
                this.activeCategory = category;
            }
            
            // Update display
            this.displayPoints(filteredPoints);
            this.displayCategories(this.categories);
            
            // Update map
            mapManager.clearMarkers();
            mapManager.addPoints(filteredPoints);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Filter error:', error);
            this.showMessage('Failed to filter points', 'error');
            this.hideLoading();
        }
    }

    // Handle add point form submission
    async handleAddPoint() {
        try {
            const formData = {
                name: document.getElementById('point-name').value,
                category: document.getElementById('point-category').value,
                description: document.getElementById('point-description').value,
                lat: parseFloat(document.getElementById('point-lat').value),
                lng: parseFloat(document.getElementById('point-lng').value)
            };
            
            // Validate
            if (!formData.name || !formData.lat || !formData.lng) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }
            
            if (formData.lat < -90 || formData.lat > 90 || formData.lng < -180 || formData.lng > 180) {
                this.showMessage('Invalid coordinates', 'error');
                return;
            }
            
            this.showLoading();
            
            // Add point via API
            const newPoint = await api.addPoint(formData);
            
            // Update local data
            this.points.push(newPoint);
            
            // Update display
            this.displayPoints(this.points);
            mapManager.addPoint(newPoint);
            
            // Clear form
            document.getElementById('add-point-form').reset();
            
            // Show success message
            this.showMessage('Point added successfully!', 'success');
            
            // Refresh categories and stats
            await this.refreshData();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Add point error:', error);
            this.showMessage('Failed to add point. Please try again.', 'error');
            this.hideLoading();
        }
    }

    // Highlight point
    highlightPoint(pointId) {
        mapManager.highlightPoint(pointId);
    }

    // Show all points
    async showAllPoints() {
        try {
            this.showLoading();
            
            this.activeCategory = null;
            const allPoints = await api.getAllPoints();
            
            this.displayPoints(allPoints);
            this.displayCategories(this.categories);
            
            mapManager.clearMarkers();
            mapManager.addPoints(allPoints);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Show all points error:', error);
            this.showMessage('Failed to load points', 'error');
            this.hideLoading();
        }
    }

    // Clear map
    clearMap() {
        mapManager.clearMarkers();
        this.displayPoints([]);
        this.activeCategory = null;
        this.displayCategories(this.categories);
    }

    // Search nearby points
    async searchNearby() {
        try {
            const lat = parseFloat(document.getElementById('search-lat').value);
            const lng = parseFloat(document.getElementById('search-lng').value);
            const radius = parseInt(document.getElementById('search-radius').value) || 1000;
            
            if (!lat || !lng) {
                this.showMessage('Please enter latitude and longitude', 'error');
                return;
            }
            
            await mapManager.searchAtLocation(lat, lng, radius);
            
        } catch (error) {
            console.error('Search error:', error);
            this.showMessage('Search failed. Please try again.', 'error');
        }
    }

    // Refresh data
    async refreshData() {
        try {
            const [categories, stats] = await Promise.all([
                api.getCategories(),
                api.getStats()
            ]);
            
            this.categories = categories;
            this.stats = stats;
            
            this.displayCategories(categories);
            this.displayStats(stats);
            
        } catch (error) {
            console.error('Refresh data error:', error);
        }
    }

    // Show loading state
    showLoading() {
        this.isLoading = true;
        // You can add loading UI here
    }

    // Hide loading state
    hideLoading() {
        this.isLoading = false;
        // You can hide loading UI here
    }

    // Show message
    showMessage(message, type = 'info') {
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `${type}-message`;
        messageElement.textContent = message;
        
        // Add to page
        const container = document.querySelector('.sidebar');
        container.insertBefore(messageElement, container.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }
}

// Global functions for HTML onclick events
function showAllPoints() {
    window.appManager.showAllPoints();
}

function clearMap() {
    window.appManager.clearMap();
}

function searchNearby() {
    window.appManager.searchNearby();
}

function toggleLocationSearch() {
    window.mapManager.toggleClickSearch();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.appManager = new AppManager();
});