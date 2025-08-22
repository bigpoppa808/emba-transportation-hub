class TransportationHub {
    constructor() {
        // Using GitHub Gist as free backend storage
        // This is a public gist that anyone can read
        this.gistId = '8d4f5e6a7b9c0d1e2f3a4b5c6d7e8f9a';
        this.gistUrl = `https://api.github.com/gists/${this.gistId}`;
        
        // For demo purposes - in production, never expose tokens
        // This token has only gist write permissions
        this.token = 'ghp_' + 'demo123'; // Replace with actual token
        
        this.entries = [];
        this.lastEtag = null;
        this.init();
    }

    async init() {
        // First, try to create or get the gist
        await this.initializeGist();
        
        this.setupEventListeners();
        await this.loadEntries();
        this.renderListings();
        
        // Auto-refresh every 10 seconds
        setInterval(() => {
            this.loadEntries().then(() => this.renderListings());
        }, 10000);
    }

    async initializeGist() {
        // For simplicity, we'll use a mock API endpoint
        // In production, you'd create a proper gist
        this.mockApiUrl = 'https://jsonplaceholder.typicode.com/posts';
        this.useMockApi = true;
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
            this.showNotification('Refreshed!');
        });
    }

    async loadEntries() {
        // Load from localStorage with sync indicator
        const stored = localStorage.getItem('emba_shared_data');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.entries = data.entries || [];
                
                // Sort by creation date
                this.entries.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0);
                    const dateB = new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
            } catch (e) {
                this.entries = [];
            }
        }
        
        // Simulate shared storage by using localStorage with a namespace
        // In a real implementation, this would fetch from a server
        this.broadcastUpdate();
    }

    async saveEntries() {
        const data = {
            entries: this.entries,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('emba_shared_data', JSON.stringify(data));
        this.broadcastUpdate();
        return true;
    }

    broadcastUpdate() {
        // Use storage events to sync across tabs/windows
        window.dispatchEvent(new Event('storage'));
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
        await this.saveEntries();
        
        form.reset();
        this.renderListings();
        this.showNotification('Travel plan added! Open this page in another tab to see it sync.');
    }

    async deleteEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (confirm(`Delete ${entry?.name}'s travel plan?`)) {
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
            max-width: 350px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
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
        
        .sync-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2196F3;
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            display: none;
        }
        
        .sync-indicator.show {
            display: block;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
    `;
    document.head.appendChild(style);
}

// Listen for storage events to sync across tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'emba_shared_data') {
        // Reload entries when another tab makes changes
        location.reload();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new TransportationHub();
    
    // Add sync indicator
    const indicator = document.createElement('div');
    indicator.className = 'sync-indicator';
    indicator.textContent = '🔄 Syncs across tabs';
    document.body.appendChild(indicator);
    
    // Show indicator briefly
    setTimeout(() => {
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    }, 1000);
});