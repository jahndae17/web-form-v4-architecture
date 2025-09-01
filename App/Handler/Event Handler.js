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
        
        // Behavior registration system
        this.registeredBehaviors = new Map();
        this.triggerMappings = new Map();
        this.elementTriggers = new Map();
        this.functionTriggers = new Map();
        
        this.init();
    }
    
    // ========================
    // BEHAVIOR REGISTRATION METHODS
    // ========================
    
    /**
     * Register a behavior instance with the Event Handler
     */
    registerBehavior(behaviorId, behaviorConfig) {
        if (this.registeredBehaviors.has(behaviorId)) {
            console.warn(`EventHandler: Behavior ${behaviorId} is already registered`);
            return false;
        }
        
        const config = {
            instance: behaviorConfig.instance,
            schema: behaviorConfig.schema,
            version: behaviorConfig.version || '1.0.0',
            priority: behaviorConfig.priority || 10,
            enabled: behaviorConfig.enabled !== false
        };
        
        this.registeredBehaviors.set(behaviorId, config);
        console.log(`EventHandler: Behavior registered - ${behaviorId} v${config.version}`);
        return true;
    }
    
    /**
     * Unregister a behavior from the Event Handler
     */
    unregisterBehavior(behaviorId) {
        if (!this.registeredBehaviors.has(behaviorId)) {
            console.warn(`EventHandler: Cannot unregister non-existent behavior ${behaviorId}`);
            return false;
        }
        
        // Remove all triggers for this behavior
        const triggersToRemove = [];
        for (const [triggerKey, triggerData] of this.triggerMappings) {
            if (triggerData.behaviorId === behaviorId) {
                triggersToRemove.push(triggerKey);
            }
        }
        
        triggersToRemove.forEach(triggerKey => {
            this.triggerMappings.delete(triggerKey);
        });
        
        // Remove behavior registration
        this.registeredBehaviors.delete(behaviorId);
        console.log(`EventHandler: Behavior unregistered - ${behaviorId}`);
        return true;
    }
    
    /**
     * Register a DOM element trigger (e.g., button click)
     */
    registerTrigger(element, eventType, triggerName, options = {}) {
        if (!element || !eventType || !triggerName) {
            console.warn('EventHandler: Invalid trigger registration parameters');
            return false;
        }
        
        const triggerKey = `${eventType}:${triggerName}`;
        const elementKey = this.getElementKey(element);
        
        // Create event listener
        const eventListener = (event) => {
            this.handleTriggerEvent(triggerKey, event, options);
        };
        
        // Store trigger mapping
        if (!this.elementTriggers.has(elementKey)) {
            this.elementTriggers.set(elementKey, new Map());
        }
        
        this.elementTriggers.get(elementKey).set(eventType, {
            triggerName,
            triggerKey,
            listener: eventListener,
            options
        });
        
        // Add DOM event listener
        element.addEventListener(eventType, eventListener);
        
        console.log(`EventHandler: Trigger registered - ${triggerKey} on element ${elementKey}`);
        return true;
    }
    
    /**
     * Unregister a DOM element trigger
     */
    unregisterTrigger(element, eventType) {
        const elementKey = this.getElementKey(element);
        
        if (!this.elementTriggers.has(elementKey)) {
            return false;
        }
        
        const elementTriggers = this.elementTriggers.get(elementKey);
        if (!elementTriggers.has(eventType)) {
            return false;
        }
        
        const triggerData = elementTriggers.get(eventType);
        
        // Remove DOM event listener
        element.removeEventListener(eventType, triggerData.listener);
        
        // Remove from mappings
        elementTriggers.delete(eventType);
        if (elementTriggers.size === 0) {
            this.elementTriggers.delete(elementKey);
        }
        
        console.log(`EventHandler: Trigger unregistered - ${triggerData.triggerKey} from element ${elementKey}`);
        return true;
    }
    
    /**
     * Register a function trigger mapping
     */
    registerFunctionTrigger(triggerPattern, behaviorId, functionName, parameters = {}) {
        const triggerKey = triggerPattern;
        
        if (this.functionTriggers.has(triggerKey)) {
            console.warn(`EventHandler: Function trigger ${triggerKey} is already registered`);
            return false;
        }
        
        this.functionTriggers.set(triggerKey, {
            behaviorId,
            functionName,
            parameters,
            enabled: true
        });
        
        console.log(`EventHandler: Function trigger registered - ${triggerKey} → ${behaviorId}.${functionName}()`);
        return true;
    }
    
    /**
     * Handle a trigger event and execute mapped functions
     */
    async handleTriggerEvent(triggerKey, event, options = {}) {
        console.log(`EventHandler: Trigger fired - ${triggerKey}`);
        
        // Find matching function triggers
        const matchingTriggers = [];
        for (const [pattern, triggerData] of this.functionTriggers) {
            if (this.matchesTriggerPattern(triggerKey, pattern)) {
                matchingTriggers.push(triggerData);
            }
        }
        
        if (matchingTriggers.length === 0) {
            console.warn(`EventHandler: No function mappings found for trigger ${triggerKey}`);
            return false;
        }
        
        // Execute matched functions
        const results = [];
        for (const triggerData of matchingTriggers) {
            try {
                const result = await this.executeBehaviorFunction(
                    triggerData.behaviorId,
                    triggerData.functionName,
                    triggerData.parameters,
                    event
                );
                results.push({ success: true, result });
            } catch (error) {
                console.error(`EventHandler: Failed to execute ${triggerData.behaviorId}.${triggerData.functionName}():`, error);
                results.push({ success: false, error });
            }
        }
        
        return results;
    }
    
    /**
     * Execute a behavior function
     */
    async executeBehaviorFunction(behaviorId, functionName, parameters, event) {
        const behaviorConfig = this.registeredBehaviors.get(behaviorId);
        if (!behaviorConfig || !behaviorConfig.enabled) {
            throw new Error(`Behavior ${behaviorId} not found or disabled`);
        }
        
        const behaviorInstance = behaviorConfig.instance;
        if (!behaviorInstance[functionName]) {
            throw new Error(`Function ${functionName} not found in behavior ${behaviorId}`);
        }
        
        // Merge parameters with event data
        const callParams = {
            ...parameters,
            event,
            triggerSource: 'event_handler',
            timestamp: Date.now()
        };
        
        console.log(`EventHandler: Executing ${behaviorId}.${functionName}() with params:`, callParams);
        
        // Call the behavior function
        return await behaviorInstance[functionName](callParams);
    }
    
    /**
     * Check if a trigger key matches a pattern
     */
    matchesTriggerPattern(triggerKey, pattern) {
        // Exact match
        if (triggerKey === pattern) {
            return true;
        }
        
        // Pattern matching (basic implementation)
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(triggerKey);
        }
        
        return false;
    }
    
    /**
     * Get a unique key for a DOM element
     */
    getElementKey(element) {
        if (element.id) {
            return `id:${element.id}`;
        }
        
        if (element.className) {
            return `class:${element.className}`;
        }
        
        // Fallback to element reference
        return `ref:${element.tagName}_${Date.now()}`;
    }
    
    /**
     * Get registered behaviors
     */
    getRegisteredBehaviors() {
        return Object.fromEntries(this.registeredBehaviors);
    }
    
    /**
     * Get trigger mappings
     */
    getTriggerMappings() {
        return {
            functionTriggers: Object.fromEntries(this.functionTriggers),
            elementTriggers: Object.fromEntries(this.elementTriggers)
        };
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
        // NOTE: With component-specific locks, these conflicts only apply within the same component
        this.conflictRules.set('edit_lock', ['drag_lock', 'resize_lock', 'delete_operation']);
        this.conflictRules.set('drag_lock', ['edit_lock', 'resize_lock', 'selection_operation']); // A component can't be moved and resized simultaneously
        this.conflictRules.set('resize_lock', ['edit_lock', 'drag_lock', 'move_operation']); // A component can't be resized and moved simultaneously
        this.conflictRules.set('modal_lock', ['*']); // Blocks everything globally
        this.conflictRules.set('global_lock', ['*']); // Blocks everything globally
        this.conflictRules.set('validation_lock', ['save_operation', 'submit_operation']);
        this.conflictRules.set('save_lock', ['edit_lock', 'validation_lock']);
        this.conflictRules.set('animation_lock', ['drag_lock', 'resize_lock']); // Conflicts with transform operations on same component
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
     * Extract component ID from operation ID
     */
    _extractComponentIdFromOperationId(operationId) {
        // Extract component ID from operation IDs like:
        // - "move_operation_element_123"
        // - "resize_operation_container_456"
        // - "mouse_drag_element_789"
        
        const patterns = [
            /_([^_]+_[^_]+)$/, // operation_element_123 -> element_123
            /_([^_]+)$/ // operation_123 -> 123
        ];
        
        for (const pattern of patterns) {
            const match = operationId.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }

    /**
     * Extract component ID from context path for component-specific locks
     */
    _extractComponentIdFromPath(contextPath) {
        // Look for patterns like:
        // - "components.element_123.is_moving"
        // - "containers.container_456.is_resizing"
        // - "current_context_meta.component_element_789.operation"
        
        const patterns = [
            /components\.([^.]+)\./, // components.elementId.property
            /containers\.([^.]+)\./, // containers.containerId.property
            /component_([^.]+)\./, // component_elementId.property
            /element_([^.]+)\./, // element_elementId.property
            /container_([^.]+)\./ // container_containerId.property
        ];
        
        for (const pattern of patterns) {
            const match = contextPath.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }

    /**
     * Handle operation state changes
     */
    async handleOperationChange(change) {
        // Extract component ID from the context path for component-specific locks
        const componentId = this._extractComponentIdFromPath(change.context_path) || 'global';
        
        if (change.context_path.includes('is_editing') && change.new_value === true) {
            await this.requestLock('edit_lock', `edit_operation_${componentId}`, { source: change.handler });
        } else if (change.context_path.includes('is_editing') && change.new_value === false) {
            await this.releaseLock('edit_lock', `edit_operation_${componentId}`);
        }
        
        if (change.context_path.includes('is_creating') && change.new_value === true) {
            await this.requestLock('edit_lock', `create_operation_${componentId}`, { source: change.handler });
        }
        
        if (change.context_path.includes('is_moving') && change.new_value === true) {
            await this.requestLock('drag_lock', `move_operation_${componentId}`, { source: change.handler });
        } else if (change.context_path.includes('is_moving') && change.new_value === false) {
            await this.releaseLock('drag_lock', `move_operation_${componentId}`);
        }
        
        if (change.context_path.includes('is_resizing') && change.new_value === true) {
            await this.requestLock('resize_lock', `resize_operation_${componentId}`, { source: change.handler });
        } else if (change.context_path.includes('is_resizing') && change.new_value === false) {
            await this.releaseLock('resize_lock', `resize_operation_${componentId}`);
        }
    }
    
    /**
     * Handle drag state changes from mouse input
     */
    async handleDragStateChange(change) {
        // Extract component ID for component-specific mouse drag locks
        const componentId = this._extractComponentIdFromPath(change.context_path) || 'mouse';
        
        if (change.new_value === true) {
            // Dragging started - engage drag lock
            await this.requestLock('drag_lock', `mouse_drag_${componentId}`, { 
                source: change.handler,
                auto_release: true // Will auto-release when dragging stops
            });
        } else if (change.new_value === false) {
            // Dragging stopped - release drag lock
            await this.releaseLock('drag_lock', `mouse_drag_${componentId}`);
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
        
        // Check for conflicts - now component-aware
        const conflicts = this.checkConflicts(lockType, operationId);
        
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
    checkConflicts(lockType, operationId) {
        const conflicts = [];
        const conflictRules = this.conflictRules.get(lockType) || [];
        
        // Extract component ID from the operation ID
        const componentId = this._extractComponentIdFromOperationId(operationId);
        
        for (const [lockKey, lockInfo] of this.activeLocks) {
            const lockComponentId = this._extractComponentIdFromOperationId(lockInfo.operationId);
            
            // Global locks (modal, global_lock) conflict with everything
            if (conflictRules.includes('*') || lockInfo.lockType === 'modal_lock' || lockInfo.lockType === 'global_lock') {
                conflicts.push(lockKey);
                continue;
            }
            
            // For component-specific locks, only check conflicts within the same component
            if (componentId && lockComponentId && componentId === lockComponentId) {
                if (conflictRules.includes(lockInfo.lockType)) {
                    conflicts.push(lockKey);
                }
            }
            // For operations without component IDs, check all conflicts (legacy behavior)
            else if (!componentId || !lockComponentId) {
                if (conflictRules.includes(lockInfo.lockType)) {
                    conflicts.push(lockKey);
                }
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
            const conflicts = this.checkConflicts(queuedLock.lockType, queuedLock.operationId);
            
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
     * Get detailed lock information for debugging
     */
    getDetailedLockStatus() {
        const activeLocks = [];
        const queuedLocks = [];
        
        // Process active locks
        for (const [lockKey, lockInfo] of this.activeLocks) {
            const [lockType, operationId] = lockKey.split('_', 2);
            const componentId = this._extractComponentIdFromOperationId(operationId);
            
            activeLocks.push({
                lockKey,
                lockType,
                operationId,
                componentId: componentId || 'global',
                priority: lockInfo.priority,
                timestamp: lockInfo.timestamp,
                context: lockInfo.context,
                duration: Date.now() - lockInfo.timestamp,
                blocking: lockInfo.blocking || false,
                reason: lockInfo.reason || 'operation'
            });
        }
        
        // Process queued locks
        this.lockQueue.forEach((queuedLock, index) => {
            const componentId = this._extractComponentIdFromOperationId(queuedLock.operationId);
            
            queuedLocks.push({
                position: index + 1,
                lockType: queuedLock.lockType,
                operationId: queuedLock.operationId,
                componentId: componentId || 'global',
                priority: queuedLock.priority,
                timestamp: queuedLock.timestamp,
                waitTime: Date.now() - queuedLock.timestamp,
                context: queuedLock.context,
                reason: queuedLock.reason || 'queued operation'
            });
        });
        
        return {
            summary: {
                totalActiveLocks: activeLocks.length,
                totalQueuedLocks: queuedLocks.length,
                componentsWithLocks: new Set(activeLocks.map(lock => lock.componentId)).size,
                lockTypes: new Set([...activeLocks.map(lock => lock.lockType), ...queuedLocks.map(lock => lock.lockType)])
            },
            activeLocks,
            queuedLocks,
            conflictRules: Object.fromEntries(this.conflictRules),
            lockPriorities: this.lockPriorities
        };
    }
    
    /**
     * Get locks for a specific component
     */
    getComponentLocks(componentId) {
        const componentLocks = {
            active: [],
            queued: []
        };
        
        // Find active locks for this component
        for (const [lockKey, lockInfo] of this.activeLocks) {
            const [lockType, operationId] = lockKey.split('_', 2);
            const lockComponentId = this._extractComponentIdFromOperationId(operationId);
            
            if (lockComponentId === componentId || (!lockComponentId && componentId === 'global')) {
                componentLocks.active.push({
                    lockKey,
                    lockType,
                    operationId,
                    priority: lockInfo.priority,
                    timestamp: lockInfo.timestamp,
                    duration: Date.now() - lockInfo.timestamp,
                    context: lockInfo.context
                });
            }
        }
        
        // Find queued locks for this component
        this.lockQueue.forEach((queuedLock, index) => {
            const lockComponentId = this._extractComponentIdFromOperationId(queuedLock.operationId);
            
            if (lockComponentId === componentId || (!lockComponentId && componentId === 'global')) {
                componentLocks.queued.push({
                    position: index + 1,
                    lockType: queuedLock.lockType,
                    operationId: queuedLock.operationId,
                    priority: queuedLock.priority,
                    timestamp: queuedLock.timestamp,
                    waitTime: Date.now() - queuedLock.timestamp,
                    context: queuedLock.context
                });
            }
        });
        
        return componentLocks;
    }
    
    /**
     * Check what would conflict with a potential lock
     */
    checkPotentialConflicts(lockType, operationId) {
        const componentId = this._extractComponentIdFromOperationId(operationId);
        const conflicts = [];
        
        for (const [activeLockKey, lockInfo] of this.activeLocks) {
            const [activeLockType, activeOperationId] = activeLockKey.split('_', 2);
            const activeComponentId = this._extractComponentIdFromOperationId(activeOperationId);
            
            // Check if there would be a conflict
            if (this._wouldConflict(lockType, componentId, activeLockType, activeComponentId)) {
                conflicts.push({
                    conflictingLock: activeLockKey,
                    conflictingLockType: activeLockType,
                    conflictingOperationId: activeOperationId,
                    conflictingComponentId: activeComponentId || 'global',
                    priority: lockInfo.priority,
                    duration: Date.now() - lockInfo.timestamp,
                    reason: 'operation conflict'
                });
            }
        }
        
        return {
            wouldConflict: conflicts.length > 0,
            conflicts,
            canAcquire: conflicts.length === 0
        };
    }
    
    /**
     * Helper method to check if two locks would conflict
     */
    _wouldConflict(lockType1, componentId1, lockType2, componentId2) {
        // Global locks block everything
        if (lockType2 === 'modal_lock' || lockType2 === 'global_lock') {
            return true;
        }
        
        // Different components don't conflict (unless global)
        if (componentId1 && componentId2 && componentId1 !== componentId2) {
            return false;
        }
        
        // Check conflict rules
        const conflictingTypes = this.conflictRules.get(lockType2);
        return conflictingTypes && (conflictingTypes.includes(lockType1) || conflictingTypes.includes('*'));
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
