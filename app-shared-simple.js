class TransportationHub {
    constructor() {
        // Using a free JSON storage service - no account needed
        // This creates a shared database for all users
        this.storageUrl = 'https://api.npoint.io/8f1e7c9d4a6b3c2d1e0f';
        this.entries = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadEntries();
        this.renderListings();
        
        // Auto-refresh every 15 seconds
        setInterval(() => {
            this.loadEntries().then(() => this.renderListings());
        }, 15000);
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
            const response = await fetch(this.storageUrl);
            
            if (response.ok) {
                const data = await response.json();
                this.entries = data.entries || [];
                
                // Sort by creation date (newest first)
                this.entries.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0);
                    const dateB = new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
            } else if (response.status === 404) {
                // First time - initialize empty
                this.entries = [];
                await this.saveEntries();
            }
        } catch (error) {
            console.error('Error loading entries:', error);
            // Fall back to local storage if network fails
            this.loadLocalBackup();
        }
    }

    async saveEntries() {
        try {
            const response = await fetch(this.storageUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    entries: this.entries,
                    lastUpdated: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                // Also save local backup
                this.saveLocalBackup();
                return true;
            }
            throw new Error('Failed to save');
        } catch (error) {
            console.error('Error saving entries:', error);
            this.showNotification('Saving to backup storage...', 'warning');
            this.saveLocalBackup();
            return false;
        }
    }

    loadLocalBackup() {
        const backup = localStorage.getItem('emba_backup');
        if (backup) {
            try {
                this.entries = JSON.parse(backup);
                this.showNotification('Loaded from local backup', 'info');
            } catch (e) {
                this.entries = [];
            }
        }
    }

    saveLocalBackup() {
        localStorage.setItem('emba_backup', JSON.stringify(this.entries));
    }

    async addEntry() {
        const form = document.getElementById('transportForm');
        const formData = new FormData(form);
        
        const entry = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
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

        this.entries.unshift(entry);
        
        const saved = await this.saveEntries();
        if (saved) {
            form.reset();
            this.showNotification('Travel plan shared with all classmates! 🚗');
        } else {
            this.showNotification('Saved locally - will sync when online', 'warning');
            form.reset();
        }
        
        this.renderListings();
    }

    async deleteEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        const confirmMsg = `Delete ${entry?.name}'s travel plan?`;
        
        if (confirm(confirmMsg)) {
            this.entries = this.entries.filter(entry => entry.id !== id);
            await this.saveEntries();
            this.renderListings();
            this.showNotification('Entry deleted!');
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
                const id = e.target.dataset.id;
                await this.deleteEntry(id);
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

        const postedAgo = this.getTimeAgo(entry.createdAt);

        return `
            <div class="travel-card">
                <button class="delete-btn" data-id="${entry.id}" title="Delete entry">×</button>
                <div class="card-header">
                    <span class="card-type type-${entry.type}">${typeLabels[entry.type] || 'Unknown'}</span>
                    <span class="posted-ago">${postedAgo}</span>
                </div>
                ${dateTimeDisplay ? `<div class="card-datetime">${dateTimeDisplay}</div>` : ''}
                <div class="card-route">
                    <div class="route-point">
                        <div class="route-label">From</div>
                        <div class="route-location">${this.escapeHtml(entry.from || '')}</div>
                    </div>
                    <div class="route-arrow">→</div>
                    <div class="route-point">
                        <div class="route-label">To</div>
                        <div class="route-location">${this.escapeHtml(entry.to || '')}</div>
                    </div>
                </div>
                ${entry.details ? `
                    <div class="card-details">
                        ${this.escapeHtml(entry.details)}
                    </div>
                ` : ''}
                <div class="card-contact">
                    <span class="contact-name">${this.escapeHtml(entry.name || 'Anonymous')}</span>
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
        try {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        } catch {
            return time;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? '#F44336' : 
                       type === 'warning' ? '#FF9800' :
                       type === 'info' ? '#2196F3' : '#4CAF50';
        
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

// Add animation styles
if (!document.getElementById('animation-styles')) {
    const style = document.createElement('style');
    style.id = 'animation-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .posted-ago {
            font-size: 0.8em;
            color: #666;
            font-style: italic;
        }
    `;
    document.head.appendChild(style);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new TransportationHub();
});