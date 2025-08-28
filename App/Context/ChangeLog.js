/**
 * ChangeLog Manager - Coordinates context changes between handlers
 * Manages a JSON-based changelog for inter-handler communication
 */

class ChangeLogManager {
    constructor(changelogPath = './changelog.json', contextPath = './current_context_meta.json') {
        this.changelogPath = changelogPath;
        this.contextPath = contextPath;
        this.isNode = typeof window === 'undefined';
        
        // In-memory cache
        this.changelogCache = null;
        this.contextCache = null;
        this.lastReadTime = 0;
        
        // Event system
        this.listeners = new Map();
        this.isListening = false;
        this.pollInterval = 50; // ms
        this.pollTimer = null;
        
        // Handler tracking
        this.handlerName = null;
        this.lastProcessedSequence = 0;
        
        this.init();
    }
    
    /**
     * Initialize the changelog manager
     */
    async init() {
        try {
            await this.loadChangelog();
            await this.loadContext();
        } catch (error) {
            console.error('ChangeLogManager init failed:', error);
            this.initializeEmptyStructures();
        }
    }
    
    /**
     * Register a handler with the changelog system
     */
    registerHandler(handlerName) {
        this.handlerName = handlerName;
        
        // Update handler registration in changelog
        if (this.changelogCache && this.changelogCache.handlers) {
            if (!this.changelogCache.handlers[handlerName]) {
                this.changelogCache.handlers[handlerName] = {
                    last_read_sequence: 0,
                    last_write_sequence: 0,
                    is_listening: false,
                    poll_interval: this.pollInterval
                };
            }
            this.changelogCache.handlers[handlerName].is_listening = true;
            this.saveChangelog();
        }
        
        console.log(`Handler registered: ${handlerName}`);
    }
    
    /**
     * Start listening for changes
     */
    startListening(callback) {
        if (!this.handlerName) {
            throw new Error('Handler must be registered before listening');
        }
        
        this.isListening = true;
        
        if (callback) {
            this.listeners.set('change', callback);
        }
        
        // Start polling for changes
        this.pollTimer = setInterval(() => {
            this.checkForChanges();
        }, this.pollInterval);
        
        console.log(`Started listening for changes: ${this.handlerName}`);
    }
    
    /**
     * Stop listening for changes
     */
    stopListening() {
        this.isListening = false;
        
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        
        // Update handler status
        if (this.changelogCache && this.changelogCache.handlers && this.handlerName) {
            this.changelogCache.handlers[this.handlerName].is_listening = false;
            this.saveChangelog();
        }
        
        console.log(`Stopped listening: ${this.handlerName}`);
    }
    
    /**
     * Log a change to the changelog
     */
    async logChange(action, contextPath, oldValue, newValue, changeType = 'update', metadata = {}) {
        if (!this.changelogCache) {
            await this.loadChangelog();
        }
        
        const sequenceId = ++this.changelogCache.last_sequence_id;
        
        const entry = {
            sequence_id: sequenceId,
            timestamp: Date.now(),
            handler: this.handlerName || 'unknown',
            action: action,
            context_path: contextPath,
            old_value: oldValue,
            new_value: newValue,
            change_type: changeType,
            metadata: metadata
        };
        
        // Add entry to changelog
        this.changelogCache.entries.push(entry);
        this.changelogCache.last_updated = Date.now();
        
        // Update handler's last write sequence
        if (this.handlerName && this.changelogCache.handlers[this.handlerName]) {
            this.changelogCache.handlers[this.handlerName].last_write_sequence = sequenceId;
        }
        
        // Cleanup old entries if needed
        this.cleanupOldEntries();
        
        // Save changelog
        await this.saveChangelog();
        
        console.log(`Change logged: ${action} at ${contextPath} by ${this.handlerName}`);
        return sequenceId;
    }
    
    /**
     * Update context and log the change
     */
    async updateContext(path, newValue, changeType = 'update', metadata = {}) {
        const oldValue = this.getContextValue(path);
        
        // Update context
        this.setContextValue(path, newValue);
        
        // Log the change
        await this.logChange('context_update', path, oldValue, newValue, changeType, metadata);
        
        // Save context
        await this.saveContext();
    }
    
    /**
     * Get a value from context by path
     */
    getContextValue(path) {
        if (!this.contextCache) return null;
        
        const keys = path.split('.');
        let value = this.contextCache;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return null;
            }
        }
        
        return value;
    }
    
    /**
     * Set a value in context by path
     */
    setContextValue(path, newValue) {
        if (!this.contextCache) return false;
        
        const keys = path.split('.');
        let obj = this.contextCache;
        
        // Navigate to parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in obj) || typeof obj[key] !== 'object') {
                obj[key] = {};
            }
            obj = obj[key];
        }
        
        // Set the value
        obj[keys[keys.length - 1]] = newValue;
        return true;
    }
    
    /**
     * Check for new changes since last read
     */
    async checkForChanges() {
        if (!this.isListening) return;
        
        try {
            await this.loadChangelog();
            
            if (!this.changelogCache || !this.changelogCache.entries) return;
            
            // Find new entries since last processed
            const newEntries = this.changelogCache.entries.filter(entry => 
                entry.sequence_id > this.lastProcessedSequence &&
                entry.handler !== this.handlerName // Don't process our own changes
            );
            
            if (newEntries.length > 0) {
                // Update last processed sequence
                this.lastProcessedSequence = Math.max(...newEntries.map(e => e.sequence_id));
                
                // Update handler's last read sequence
                if (this.handlerName && this.changelogCache.handlers[this.handlerName]) {
                    this.changelogCache.handlers[this.handlerName].last_read_sequence = this.lastProcessedSequence;
                    await this.saveChangelog();
                }
                
                // Notify listeners
                const callback = this.listeners.get('change');
                if (callback) {
                    callback(newEntries);
                }
                
                // Reload context if it was updated
                const contextUpdates = newEntries.filter(e => e.action === 'context_update');
                if (contextUpdates.length > 0) {
                    await this.loadContext();
                }
            }
        } catch (error) {
            console.error('Error checking for changes:', error);
        }
    }
    
    /**
     * Get recent changes for a specific handler
     */
    getRecentChanges(sinceSequence = 0, handlerFilter = null) {
        if (!this.changelogCache || !this.changelogCache.entries) return [];
        
        return this.changelogCache.entries.filter(entry => {
            if (entry.sequence_id <= sinceSequence) return false;
            if (handlerFilter && entry.handler !== handlerFilter) return false;
            return true;
        });
    }
    
    /**
     * Load changelog from file/storage
     */
    async loadChangelog() {
        try {
            if (this.isNode) {
                const fs = require('fs').promises;
                const data = await fs.readFile(this.changelogPath, 'utf8');
                this.changelogCache = JSON.parse(data);
            } else {
                // Browser implementation - would use localStorage, IndexedDB, or fetch
                const stored = localStorage.getItem('changelog');
                if (stored) {
                    this.changelogCache = JSON.parse(stored);
                }
            }
        } catch (error) {
            console.warn('Could not load changelog, initializing empty:', error.message);
            this.initializeEmptyStructures();
        }
    }
    
    /**
     * Save changelog to file/storage
     */
    async saveChangelog() {
        try {
            const data = JSON.stringify(this.changelogCache, null, 2);
            
            if (this.isNode) {
                const fs = require('fs').promises;
                await fs.writeFile(this.changelogPath, data, 'utf8');
            } else {
                localStorage.setItem('changelog', data);
            }
        } catch (error) {
            console.error('Failed to save changelog:', error);
        }
    }
    
    /**
     * Load context from file/storage
     */
    async loadContext() {
        try {
            if (this.isNode) {
                const fs = require('fs').promises;
                const data = await fs.readFile(this.contextPath, 'utf8');
                this.contextCache = JSON.parse(data);
            } else {
                const stored = localStorage.getItem('context');
                if (stored) {
                    this.contextCache = JSON.parse(stored);
                }
            }
        } catch (error) {
            console.warn('Could not load context:', error.message);
        }
    }
    
    /**
     * Save context to file/storage
     */
    async saveContext() {
        try {
            const data = JSON.stringify(this.contextCache, null, 2);
            
            if (this.isNode) {
                const fs = require('fs').promises;
                await fs.writeFile(this.contextPath, data, 'utf8');
            } else {
                localStorage.setItem('context', data);
            }
        } catch (error) {
            console.error('Failed to save context:', error);
        }
    }
    
    /**
     * Initialize empty structures
     */
    initializeEmptyStructures() {
        this.changelogCache = {
            changelog: {
                entries: [],
                last_sequence_id: 0,
                last_updated: Date.now(),
                version: "1.0.0",
                max_entries: 1000,
                auto_cleanup: true,
                retention_hours: 24
            },
            handlers: {},
            lock_registry: {
                active_locks: {},
                lock_queue: [],
                lock_history: []
            }
        };
    }
    
    /**
     * Cleanup old entries
     */
    cleanupOldEntries() {
        if (!this.changelogCache || !this.changelogCache.changelog) return;
        
        const config = this.changelogCache.changelog;
        const now = Date.now();
        const maxAge = config.retention_hours * 60 * 60 * 1000;
        
        // Remove old entries
        config.entries = config.entries.filter(entry => 
            (now - entry.timestamp) <= maxAge
        );
        
        // Limit total entries
        if (config.entries.length > config.max_entries) {
            const excess = config.entries.length - config.max_entries;
            config.entries.splice(0, excess);
        }
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        this.stopListening();
        this.listeners.clear();
        this.changelogCache = null;
        this.contextCache = null;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChangeLogManager;
} else if (typeof window !== 'undefined') {
    window.ChangeLogManager = ChangeLogManager;
}