/**
 * Event Handler - Manages singleton locks and prevents conflicting operations
 * Monitors context changes and enforces operation exclusivity
 */

class EventHandler {
    constructor(changeLogManager) {
        this.changeLog = changeLogManager;
        this.handlerName = 'event_handler';
        
        // Lock management
        this.activeLocks = new Map();
        this.lockQueue = [];
        this.lockPriorities = {
            'global_lock': 1000,
            'modal_lock': 900,
            'edit_lock': 800,
            'drag_lock': 700,
            'resize_lock': 700,
            'validation_lock': 600,
            'save_lock': 500,
            'animation_lock': 400,
            'async_operation_lock': 300,
            'loading_lock': 200,
            'network_lock': 100,
            'render_lock': 50
        };
        
        // Operation tracking
        this.activeOperations = new Set();
        this.operationHistory = [];
        this.conflictRules = new Map();
        
        // Lock timeouts
        this.lockTimeouts = new Map();
        this.maxLockDuration = 30000; // 30 seconds default
        
        this.init();
    }
    
    /**
     * Initialize event handler and setup conflict rules
     */
    async init() {
        // Register with changelog system
        this.changeLog.registerHandler(this.handlerName);
        
        // Start listening for changes from other handlers
        this.changeLog.startListening(this.handleContextChanges.bind(this));
        
        // Setup conflict resolution rules
        this.setupConflictRules();
        
        console.log('EventHandler initialized');
    }
    
    /**
     * Setup rules for conflicting operations
     */
    setupConflictRules() {
        // Define which operations conflict with each other
        this.conflictRules.set('edit_lock', ['drag_lock', 'resize_lock', 'delete_operation']);
        this.conflictRules.set('drag_lock', ['edit_lock', 'resize_lock', 'selection_operation']);
        this.conflictRules.set('resize_lock', ['edit_lock', 'drag_lock', 'move_operation']);
        this.conflictRules.set('modal_lock', ['*']); // Blocks everything
        this.conflictRules.set('global_lock', ['*']); // Blocks everything
        this.conflictRules.set('validation_lock', ['save_operation', 'submit_operation']);
        this.conflictRules.set('save_lock', ['edit_lock', 'validation_lock']);
        this.conflictRules.set('animation_lock', ['drag_lock', 'resize_lock']);
        this.conflictRules.set('async_operation_lock', ['save_lock', 'network_operation']);
    }
    
    /**
     * Handle context changes from other handlers
     */
    async handleContextChanges(changes) {
        for (const change of changes) {
            console.log(`EventHandler received change from ${change.handler}: ${change.action} at ${change.context_path}`);
            
            // Monitor for operations that need locks
            if (change.context_path.includes('active_operations')) {
                await this.handleOperationChange(change);
            }
            
            // Monitor input states that might trigger locks
            if (change.context_path.includes('current_mouse_input.is_dragging')) {
                await this.handleDragStateChange(change);
            }
            
            // Monitor component interactions
            if (change.context_path.includes('currently_in_object')) {
                await this.handleComponentChange(change);
            }
            
            // Monitor modal states
            if (change.context_path.includes('modal_context.active_modal')) {
                await this.handleModalChange(change);
            }
            
            // Monitor validation states
            if (change.context_path.includes('validation_context')) {
                await this.handleValidationChange(change);
            }
        }
    }
    
    /**
     * Handle operation state changes
     */
    async handleOperationChange(change) {
        if (change.context_path.includes('is_editing') && change.new_value === true) {
            await this.requestLock('edit_lock', 'edit_operation', { source: change.handler });
        } else if (change.context_path.includes('is_editing') && change.new_value === false) {
            await this.releaseLock('edit_lock', 'edit_operation');
        }
        
        if (change.context_path.includes('is_creating') && change.new_value === true) {
            await this.requestLock('edit_lock', 'create_operation', { source: change.handler });
        }
        
        if (change.context_path.includes('is_moving') && change.new_value === true) {
            await this.requestLock('drag_lock', 'move_operation', { source: change.handler });
        } else if (change.context_path.includes('is_moving') && change.new_value === false) {
            await this.releaseLock('drag_lock', 'move_operation');
        }
        
        if (change.context_path.includes('is_resizing') && change.new_value === true) {
            await this.requestLock('resize_lock', 'resize_operation', { source: change.handler });
        } else if (change.context_path.includes('is_resizing') && change.new_value === false) {
            await this.releaseLock('resize_lock', 'resize_operation');
        }
    }
    
    /**
     * Handle drag state changes from mouse input
     */
    async handleDragStateChange(change) {
        if (change.new_value === true) {
            // Dragging started - engage drag lock
            await this.requestLock('drag_lock', 'mouse_drag', { 
                source: change.handler,
                auto_release: true // Will auto-release when dragging stops
            });
        } else if (change.new_value === false) {
            // Dragging stopped - release drag lock
            await this.releaseLock('drag_lock', 'mouse_drag');
        }
    }
    
    /**
     * Handle component interaction changes
     */
    async handleComponentChange(change) {
        if (change.context_path.includes('component_id')) {
            if (change.new_value !== null && change.old_value === null) {
                // Entering a component - check for component-specific locks
                const componentType = this.changeLog.getContextValue('current_context_meta.currently_in_object.component_type');
                
                if (componentType === 'canvas') {
                    // Canvas components might need render locks during heavy operations
                    await this.monitorCanvasOperations(change.new_value);
                }
            }
        }
    }
    
    /**
     * Handle modal state changes
     */
    async handleModalChange(change) {
        if (change.new_value !== null && change.old_value === null) {
            // Modal opened - engage modal lock
            await this.requestLock('modal_lock', `modal_${change.new_value}`, {
                source: change.handler,
                blocking: true // Blocks all other operations
            });
        } else if (change.new_value === null && change.old_value !== null) {
            // Modal closed - release modal lock
            await this.releaseLock('modal_lock', `modal_${change.old_value}`);
        }
    }
    
    /**
     * Handle validation state changes
     */
    async handleValidationChange(change) {
        if (change.context_path.includes('validation_in_progress') && change.new_value === true) {
            await this.requestLock('validation_lock', 'validation_process', { source: change.handler });
        } else if (change.context_path.includes('validation_in_progress') && change.new_value === false) {
            await this.releaseLock('validation_lock', 'validation_process');
        }
        
        if (change.context_path.includes('blocking_errors') && change.new_value.length > 0) {
            // Blocking errors present - prevent certain operations
            await this.requestLock('validation_lock', 'blocking_errors', {
                source: change.handler,
                persistent: true // Stays until errors are resolved
            });
        }
    }
    
    /**
     * Request a singleton lock
     */
    async requestLock(lockType, operationId, options = {}) {
        const lockKey = `${lockType}_${operationId}`;
        const priority = this.lockPriorities[lockType] || 0;
        
        // Check for conflicts
        const conflicts = this.checkConflicts(lockType);
        
        if (conflicts.length > 0) {
            console.log(`EventHandler: Lock request for ${lockKey} conflicts with: ${conflicts.join(', ')}`);
            
            // Handle conflict based on priority
            const canOverride = this.canOverrideConflicts(priority, conflicts);
            
            if (!canOverride && !options.force) {
                // Queue the lock request
                this.lockQueue.push({
                    lockType,
                    operationId,
                    priority,
                    options,
                    timestamp: Date.now()
                });
                
                console.log(`EventHandler: Lock ${lockKey} queued due to conflicts`);
                return false;
            }
        }
        
        // Acquire the lock
        this.activeLocks.set(lockKey, {
            lockType,
            operationId,
            priority,
            options,
            timestamp: Date.now(),
            source: options.source || 'unknown'
        });
        
        // Update context
        await this.changeLog.updateContext(
            `current_context_meta.interaction_locks.${lockType}`,
            true,
            'lock_acquired',
            { 
                operation_id: operationId,
                source: options.source,
                priority,
                timestamp: Date.now()
            }
        );
        
        // Set timeout if specified
        if (options.timeout || this.maxLockDuration) {
            const timeout = setTimeout(() => {
                this.releaseLock(lockType, operationId, 'timeout');
            }, options.timeout || this.maxLockDuration);
            
            this.lockTimeouts.set(lockKey, timeout);
        }
        
        console.log(`EventHandler: Lock acquired - ${lockKey}`);
        return true;
    }
    
    /**
     * Release a singleton lock
     */
    async releaseLock(lockType, operationId, reason = 'manual') {
        const lockKey = `${lockType}_${operationId}`;
        
        if (!this.activeLocks.has(lockKey)) {
            console.warn(`EventHandler: Attempted to release non-existent lock: ${lockKey}`);
            return false;
        }
        
        // Clear timeout
        if (this.lockTimeouts.has(lockKey)) {
            clearTimeout(this.lockTimeouts.get(lockKey));
            this.lockTimeouts.delete(lockKey);
        }
        
        // Remove lock
        const lockInfo = this.activeLocks.get(lockKey);
        this.activeLocks.delete(lockKey);
        
        // Update context
        await this.changeLog.updateContext(
            `current_context_meta.interaction_locks.${lockType}`,
            false,
            'lock_released',
            {
                operation_id: operationId,
                reason,
                duration: Date.now() - lockInfo.timestamp,
                timestamp: Date.now()
            }
        );
        
        console.log(`EventHandler: Lock released - ${lockKey} (${reason})`);
        
        // Process queued locks
        await this.processLockQueue();
        
        return true;
    }
    
    /**
     * Check for conflicting locks
     */
    checkConflicts(lockType) {
        const conflicts = [];
        const conflictRules = this.conflictRules.get(lockType) || [];
        
        for (const [lockKey, lockInfo] of this.activeLocks) {
            if (conflictRules.includes('*') || conflictRules.includes(lockInfo.lockType)) {
                conflicts.push(lockKey);
            }
        }
        
        return conflicts;
    }
    
    /**
     * Check if we can override conflicting locks based on priority
     */
    canOverrideConflicts(newPriority, conflicts) {
        for (const conflictKey of conflicts) {
            const conflictLock = this.activeLocks.get(conflictKey);
            if (conflictLock && conflictLock.priority >= newPriority) {
                return false; // Cannot override higher or equal priority
            }
        }
        return true;
    }
    
    /**
     * Process queued lock requests
     */
    async processLockQueue() {
        if (this.lockQueue.length === 0) return;
        
        // Sort queue by priority (highest first)
        this.lockQueue.sort((a, b) => b.priority - a.priority);
        
        const processable = [];
        const remaining = [];
        
        for (const queuedLock of this.lockQueue) {
            const conflicts = this.checkConflicts(queuedLock.lockType);
            
            if (conflicts.length === 0) {
                processable.push(queuedLock);
            } else {
                remaining.push(queuedLock);
            }
        }
        
        this.lockQueue = remaining;
        
        // Process locks that can now be acquired
        for (const lock of processable) {
            await this.requestLock(lock.lockType, lock.operationId, lock.options);
        }
    }
    
    /**
     * Monitor canvas operations for performance locks
     */
    async monitorCanvasOperations(componentId) {
        // Could monitor for heavy rendering operations and engage render locks
        // This is a placeholder for canvas-specific logic
    }
    
    /**
     * Get current lock status
     */
    getLockStatus() {
        return {
            active_locks: Object.fromEntries(this.activeLocks),
            queued_locks: this.lockQueue.length,
            lock_priorities: this.lockPriorities
        };
    }
    
    /**
     * Check if a specific operation is locked
     */
    isLocked(lockType) {
        for (const [lockKey, lockInfo] of this.activeLocks) {
            if (lockInfo.lockType === lockType) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Emergency release all locks
     */
    async releaseAllLocks(reason = 'emergency') {
        console.log(`EventHandler: Emergency release of all locks - ${reason}`);
        
        const lockKeys = Array.from(this.activeLocks.keys());
        
        for (const lockKey of lockKeys) {
            const [lockType, operationId] = lockKey.split('_', 2);
            await this.releaseLock(lockType, operationId, reason);
        }
        
        // Clear queue
        this.lockQueue = [];
        
        // Clear all timeouts
        this.lockTimeouts.forEach(timeout => clearTimeout(timeout));
        this.lockTimeouts.clear();
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        this.releaseAllLocks('destroy');
        this.changeLog.stopListening();
        
        console.log('EventHandler destroyed');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventHandler;
} else if (typeof window !== 'undefined') {
    window.EventHandler = EventHandler;
}
