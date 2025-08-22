class TransportationHub {
    constructor() {
        // Firebase configuration - Public project for UCLA EMBA 2027
        this.firebaseConfig = {
            databaseURL: "https://emba-transport-default-rtdb.firebaseio.com/"
        };
        
        this.entries = [];
        this.database = null;
        this.init();
    }

    async init() {
        // Initialize Firebase (using REST API for simplicity)
        this.databaseURL = this.firebaseConfig.databaseURL;
        
        this.setupEventListeners();
        await this.loadEntries();
        this.renderListings();
        
        // Auto-refresh every 10 seconds
        setInterval(() => {
            this.loadEntries().then(() => this.renderListings());
        }, 10000);
    }

    setupEventListeners() {
        document.getElementById('transportForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addEntry();
        });

        document.getElementById('filterType').addEventListener('change', () => {
            this.renderListings();
        });

        document.getElementById('filterDate').addEventListener('change', () => {
            this.renderListings();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            document.getElementById('filterType').value = 'all';
            document.getElementById('filterDate').value = '';
            this.renderListings();
        });

        document.getElementById('refreshBtn')?.addEventListener('click', async () => {
            await this.loadEntries();
            this.renderListings();
            this.showNotification('Refreshed! Showing latest travel plans.');
        });
    }

    async loadEntries() {
        try {
            const response = await fetch(`${this.databaseURL}entries.json`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data) {
                    // Convert Firebase object to array
                    this.entries = Object.keys(data).map(key => ({
                        ...data[key],
                        firebaseId: key
                    }));
                    
                    // Sort by creation date (newest first)
                    this.entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else {
                    this.entries = [];
                }
            }
        } catch (error) {
            console.error('Error loading entries:', error);
            this.showNotification('Error loading data. Please refresh.', 'error');
        }
    }

    async addEntry() {
        const form = document.getElementById('transportForm');
        const formData = new FormData(form);
        
        const entry = {
            id: Date.now().toString(),
            name: formData.get('name'),
            phone: formData.get('phone'),
            type: formData.get('type'),
            date: formData.get('date'),
            time: formData.get('time'),
            from: formData.get('from'),
            to: formData.get('to'),
            details: formData.get('details'),
            createdAt: new Date().toISOString()
        };

        try {
            // Save to Firebase
            const response = await fetch(`${this.databaseURL}entries.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(entry)
            });
            
            if (response.ok) {
                form.reset();
                this.showNotification('Travel plan shared with all classmates! 🚗');
                
                // Reload entries to get the new one
                await this.loadEntries();
                this.renderListings();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            this.showNotification('Error saving. Please try again.', 'error');
        }
    }

    async deleteEntry(firebaseId, entryName) {
        const confirmMsg = `Delete ${entryName}'s travel plan?`;
        if (confirm(confirmMsg)) {
            try {
                const response = await fetch(`${this.databaseURL}entries/${firebaseId}.json`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.showNotification('Entry deleted successfully!');
                    await this.loadEntries();
                    this.renderListings();
                } else {
                    throw new Error('Failed to delete');
                }
            } catch (error) {
                console.error('Error deleting entry:', error);
                this.showNotification('Error deleting. Please try again.', 'error');
            }
        }
    }

    renderListings() {
        const listingsContainer = document.getElementById('listings');
        const noResults = document.getElementById('noResults');
        
        const filteredEntries = this.filterEntries();
        
        if (filteredEntries.length === 0) {
            listingsContainer.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }
        
        noResults.style.display = 'none';
        listingsContainer.innerHTML = filteredEntries.map(entry => this.createCard(entry)).join('');
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const firebaseId = e.target.dataset.firebaseId;
                const entryName = e.target.dataset.entryName;
                await this.deleteEntry(firebaseId, entryName);
            });
        });
    }

    filterEntries() {
        const typeFilter = document.getElementById('filterType').value;
        const dateFilter = document.getElementById('filterDate').value;
        
        return this.entries.filter(entry => {
            const typeMatch = typeFilter === 'all' || entry.type === typeFilter;
            const dateMatch = !dateFilter || entry.date === dateFilter;
            return typeMatch && dateMatch;
        });
    }

    createCard(entry) {
        const typeLabels = {
            'offering-ride': 'Offering Ride',
            'seeking-ride': 'Seeking Ride',
            'rideshare-split': 'Rideshare/Split',
            'flight-info': 'Flight Info'
        };

        const formattedDate = entry.date ? new Date(entry.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        }) : '';

        const formattedTime = this.formatTime(entry.time);
        const dateTimeDisplay = formattedDate && formattedTime ? 
            `📅 ${formattedDate} at ${formattedTime}` : 
            (formattedDate ? `📅 ${formattedDate}` : '');

        // Calculate how long ago it was posted
        const postedAgo = this.getTimeAgo(entry.createdAt);

        return `
            <div class="travel-card">
                <button class="delete-btn" data-firebase-id="${entry.firebaseId}" data-entry-name="${entry.name}" title="Delete entry">×</button>
                <div class="card-header">
                    <span class="card-type type-${entry.type}">${typeLabels[entry.type] || 'Unknown'}</span>
                    <span class="posted-ago">${postedAgo}</span>
                </div>
                ${dateTimeDisplay ? `<div class="card-datetime">${dateTimeDisplay}</div>` : ''}
                <div class="card-route">
                    <div class="route-point">
                        <div class="route-label">From</div>
                        <div class="route-location">${this.escapeHtml(entry.from)}</div>
                    </div>
                    <div class="route-arrow">→</div>
                    <div class="route-point">
                        <div class="route-label">To</div>
                        <div class="route-location">${this.escapeHtml(entry.to)}</div>
                    </div>
                </div>
                ${entry.details ? `
                    <div class="card-details">
                        ${this.escapeHtml(entry.details)}
                    </div>
                ` : ''}
                <div class="card-contact">
                    <span class="contact-name">${this.escapeHtml(entry.name)}</span>
                    ${entry.phone ? `<span class="contact-phone">📱 ${this.escapeHtml(entry.phone)}</span>` : ''}
                </div>
            </div>
        `;
    }

    getTimeAgo(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    formatTime(time) {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? '#F44336' : '#4CAF50';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Add animation styles if not already present
if (!document.getElementById('animation-styles')) {
    const style = document.createElement('style');
    style.id = 'animation-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .posted-ago {
            font-size: 0.8em;
            color: #666;
            font-style: italic;
        }
        
        .loading-indicator {
            text-align: center;
            padding: 20px;
            color: #666;
        }
    `;
    document.head.appendChild(style);
}

// Show loading indicator
document.addEventListener('DOMContentLoaded', () => {
    const listingsContainer = document.getElementById('listings');
    if (listingsContainer) {
        listingsContainer.innerHTML = '<div class="loading-indicator">Loading shared travel plans...</div>';
    }
    new TransportationHub();
});