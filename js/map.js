// Map Configuration
const MAP_CONFIG = {
    CENTER: [41.0082, 28.9784], // Istanbul
    ZOOM: 11,
    MIN_ZOOM: 8,
    MAX_ZOOM: 18,
    TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    TILE_ATTRIBUTION: '© OpenStreetMap contributors'
};

// Category colors
const CATEGORY_COLORS = {
    'Historic': '#ff6b6b',
    'Religious': '#4ecdc4',
    'Shopping': '#45b7d1',
    'Landmark': '#96ceb4',
    'Public': '#feca57',
    'Restaurant': '#ff9ff3',
    'Entertainment': '#54a0ff',
    'Other': '#5f27cd'
};

// Map Class
class MapManager {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.markersLayer = null;
        this.searchCircle = null;
        this.clickSearchEnabled = false;
        
        this.initMap();
        this.bindEvents();
    }

    // Initialize map
    initMap() {
        this.map = L.map('map').setView(MAP_CONFIG.CENTER, MAP_CONFIG.ZOOM);
        
        // Add tile layer
        L.tileLayer(MAP_CONFIG.TILE_URL, {
            attribution: MAP_CONFIG.TILE_ATTRIBUTION,
            minZoom: MAP_CONFIG.MIN_ZOOM,
            maxZoom: MAP_CONFIG.MAX_ZOOM
        }).addTo(this.map);
        
        // Create markers layer
        this.markersLayer = L.layerGroup().addTo(this.map);
        
        // Add scale control
        L.control.scale().addTo(this.map);
    }

    // Bind map events
    bindEvents() {
        // Click to search
        this.map.on('click', (e) => {
            if (this.clickSearchEnabled) {
                this.searchAtLocation(e.latlng.lat, e.latlng.lng);
            } else {
                // Add coordinates to form when clicking
                document.getElementById('point-lat').value = e.latlng.lat.toFixed(6);
                document.getElementById('point-lng').value = e.latlng.lng.toFixed(6);
            }
        });
    }

    // Get category color
    getCategoryColor(category) {
        return CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
    }

    // Create marker icon
    createMarkerIcon(category) {
        const color = this.getCategoryColor(category);
        return L.divIcon({
            html: `<div style="
                background-color: ${color};
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10],
            className: 'custom-marker'
        });
    }

    // Create popup content
    createPopupContent(point) {
        return `
            <div class="popup-content">
                <div class="popup-title">${point.name}</div>
                <div class="popup-category">${point.category}</div>
                ${point.description ? `<div class="popup-description">${point.description}</div>` : ''}
                <div class="popup-coords">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}
                </div>
                ${point.distance_meters ? `<div class="popup-distance">
                    <i class="fas fa-ruler"></i> 
                    ${point.distance_meters}m away
                </div>` : ''}
            </div>
        `;
    }

    // Add point to map
    addPoint(point) {
        const marker = L.marker([point.lat, point.lng], {
            icon: this.createMarkerIcon(point.category)
        });
        
        marker.bindPopup(this.createPopupContent(point));
        
        // Add click event to highlight point in list
        marker.on('click', () => {
            this.highlightPointInList(point.id);
        });
        
        this.markersLayer.addLayer(marker);
        this.markers.set(point.id, marker);
        
        return marker;
    }

    // Add multiple points
    addPoints(points) {
        points.forEach(point => this.addPoint(point));
        
        // Fit map to markers if there are any
        if (points.length > 0) {
            this.fitToMarkers();
        }
    }

    // Clear all markers
    clearMarkers() {
        this.markersLayer.clearLayers();
        this.markers.clear();
        this.clearSearchCircle();
    }

    // Highlight point on map
    highlightPoint(pointId) {
        const marker = this.markers.get(pointId);
        if (marker) {
            marker.openPopup();
            this.map.setView(marker.getLatLng(), 15);
        }
    }

    // Highlight point in list
    highlightPointInList(pointId) {
        // Remove previous highlights
        document.querySelectorAll('.point-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add highlight to current point
        const pointElement = document.querySelector(`[data-point-id="${pointId}"]`);
        if (pointElement) {
            pointElement.classList.add('active');
            pointElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Fit map to all markers
    fitToMarkers() {
        if (this.markers.size > 0) {
            const group = new L.featureGroup(Array.from(this.markers.values()));
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // Search at location
    async searchAtLocation(lat, lng, radius = 1000) {
        try {
            // Add search circle
            this.addSearchCircle(lat, lng, radius);
            
            // Perform search
            const nearbyPoints = await api.findNearby(lat, lng, radius);
            
            // Clear existing markers and add nearby points
            this.clearMarkers();
            this.addPoints(nearbyPoints);
            
            // Update UI
            window.appManager.displayPoints(nearbyPoints);
            window.appManager.showMessage(`Found ${nearbyPoints.length} points within ${radius}m`, 'success');
            
        } catch (error) {
            console.error('Search error:', error);
            window.appManager.showMessage('Search failed. Please try again.', 'error');
        }
    }

    // Add search circle
    addSearchCircle(lat, lng, radius) {
        this.clearSearchCircle();
        
        this.searchCircle = L.circle([lat, lng], {
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.1,
            radius: radius
        }).addTo(this.map);
    }

    // Clear search circle
    clearSearchCircle() {
        if (this.searchCircle) {
            this.map.removeLayer(this.searchCircle);
            this.searchCircle = null;
        }
    }

    // Toggle click search mode
    toggleClickSearch() {
        this.clickSearchEnabled = !this.clickSearchEnabled;
        
        // Update button state
        const button = document.querySelector('[onclick="toggleLocationSearch()"]');
        if (this.clickSearchEnabled) {
            button.classList.add('active');
            button.innerHTML = '<i class="fas fa-times"></i> Cancel Search';
            this.map.getContainer().style.cursor = 'crosshair';
        } else {
            button.classList.remove('active');
            button.innerHTML = '<i class="fas fa-crosshairs"></i> Click to Search';
            this.map.getContainer().style.cursor = '';
        }
    }
}

// Initialize map manager
const mapManager = new MapManager();

// Export for global use
window.mapManager = mapManager;