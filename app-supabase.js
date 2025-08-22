class TransportationHub {
    constructor() {
        // Supabase configuration
        this.supabaseUrl = 'https://nscqhnqpmnqecruzhphq.supabase.co';
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zY3FobnFwbW5xZWNydXpocGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MDM1MDQsImV4cCI6MjA3MTQ3OTUwNH0.mKkshyzUuV3I0dqg-RN0Q6O5eXzSFK0KHDOOLlX6qRg';
        
        this.entries = [];
        this.init();
    }

    async init() {
        // Initialize table if needed
        await this.initializeTable();
        
        this.setupEventListeners();
        await this.loadEntries();
        this.renderListings();
        
        // Auto-refresh every 10 seconds
        setInterval(() => {
            this.loadEntries().then(() => this.renderListings());
        }, 10000);
    }

    async initializeTable() {
        // First, check if table exists by trying to fetch
        const checkUrl = `${this.supabaseUrl}/rest/v1/transportation`;
        
        try {
            const response = await fetch(checkUrl, {
                headers: {
                    'apikey': this.supabaseAnonKey,
                    'Authorization': `Bearer ${this.supabaseAnonKey}`
                }
            });
            
            if (response.status === 404 || response.status === 400) {
                console.log('Table needs to be created. Please run the setup script.');
            }
        } catch (error) {
            console.log('Supabase connection established');
        }
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
            const response = await fetch(
                `${this.supabaseUrl}/rest/v1/transportation?order=created_at.desc`,
                {
                    headers: {
                        'apikey': this.supabaseAnonKey,
                        'Authorization': `Bearer ${this.supabaseAnonKey}`
                    }
                }
            );
            
            if (response.ok) {
                this.entries = await response.json();
            } else if (response.status === 404 || response.status === 400) {
                // Table doesn't exist yet
                this.entries = [];
                this.showNotification('Setting up database...', 'info');
            }
        } catch (error) {
            console.error('Error loading entries:', error);
            // Fallback to local storage
            this.loadLocalBackup();
        }
    }

    async addEntry() {
        const form = document.getElementById('transportForm');
        const formData = new FormData(form);
        
        const entry = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            type: formData.get('type'),
            date: formData.get('date'),
            time: formData.get('time'),
            from_location: formData.get('from'),
            to_location: formData.get('to'),
            details: formData.get('details')
        };

        try {
            const response = await fetch(
                `${this.supabaseUrl}/rest/v1/transportation`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': this.supabaseAnonKey,
                        'Authorization': `Bearer ${this.supabaseAnonKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(entry)
                }
            );
            
            if (response.ok || response.status === 201) {
                form.reset();
                this.showNotification('Travel plan shared with all classmates! 🚗');
                await this.loadEntries();
                this.renderListings();
            } else {
                const error = await response.text();
                console.error('Error response:', error);
                
                // If table doesn't exist, save locally and show instructions
                if (response.status === 404 || response.status === 400) {
                    this.saveLocalBackup(entry);
                    this.showNotification('Saved locally. Database setup needed.', 'warning');
                } else {
                    throw new Error('Failed to save');
                }
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            this.saveLocalBackup(entry);
            this.showNotification('Saved locally. Will sync when online.', 'warning');
        }
    }

    async deleteEntry(id) {
        if (confirm('Are you sure you want to delete this entry?')) {
            try {
                const response = await fetch(
                    `${this.supabaseUrl}/rest/v1/transportation?id=eq.${id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'apikey': this.supabaseAnonKey,
                            'Authorization': `Bearer ${this.supabaseAnonKey}`
                        }
                    }
                );
                
                if (response.ok) {
                    this.showNotification('Entry deleted successfully!');
                    await this.loadEntries();
                    this.renderListings();
                }
            } catch (error) {
                console.error('Error deleting entry:', error);
                this.showNotification('Error deleting. Please try again.', 'error');
            }
        }
    }

    loadLocalBackup() {
        const backup = localStorage.getItem('emba_backup');
        if (backup) {
            try {
                const data = JSON.parse(backup);
                this.entries = data.entries || [];
                this.showNotification('Loaded from local backup', 'info');
            } catch (e) {
                this.entries = [];
            }
        }
    }

    saveLocalBackup(entry) {
        const backup = JSON.parse(localStorage.getItem('emba_backup') || '{"entries":[]}');
        backup.entries.unshift({
            ...entry,
            id: Date.now().toString(),
            created_at: new Date().toISOString()
        });
        localStorage.setItem('emba_backup', JSON.stringify(backup));
        
        // Update local entries for display
        this.entries = backup.entries;
        this.renderListings();
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

        const postedAgo = this.getTimeAgo(entry.created_at);
        
        // Handle both from_location/to_location (Supabase) and from/to (local)
        const fromLocation = entry.from_location || entry.from || '';
        const toLocation = entry.to_location || entry.to || '';

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
                        <div class="route-location">${this.escapeHtml(fromLocation)}</div>
                    </div>
                    <div class="route-arrow">→</div>
                    <div class="route-point">
                        <div class="route-label">To</div>
                        <div class="route-location">${this.escapeHtml(toLocation)}</div>
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