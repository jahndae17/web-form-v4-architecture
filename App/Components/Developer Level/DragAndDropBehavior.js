/**
 * DragAndDropBehavior.js - Graphics Handler Compliant Drag-and-Drop Behavior
 * 
 * ARCHITECTURE COMPLIANCE:
 * ✅ NO direct DOM manipulation - all visual operations through Graphics Handler
 * ✅ NO event listeners - behavior functions called by Event Handler
 * ✅ NO CSS files - visual specifications provided to Graphics Handler
 * ✅ Behavior composition pattern for modular attachment
 * ✅ Lock coordination through Event Handler
 * ✅ ChangeLog integration for state synchronization
 */

class DragAndDropBehavior {
    constructor() {
        this.hostContainer = null;
        this.isAttached = false;
        this.currentLockId = null;
        
        // Configuration with compliant defaults
        this.config = {
            // Core Drag Configuration
            enabled: true,
            dragThreshold: 5,
            dragAxis: "both", // "both", "horizontal", "vertical", "none"
            snapToGrid: false,
            gridSize: { x: 20, y: 20 },
            returnOnFailedDrop: true,
            
            // Visual Feedback Configuration
            showDragPreview: true,
            previewOpacity: 0.7,
            previewOffset: { x: 10, y: 10 },
            showDropZones: true,
            dropZoneHighlight: "drag-drop-zone-highlight",
            dragCursor: "grabbing",
            
            // Constraint Configuration
            dragBounds: null, // { left, top, right, bottom }
            
            // Drop zone configuration
            validDropZones: [], // container IDs
            dropTargetContainers: [], // actual container objects with drop handling
            invalidDropZones: [], // container IDs
            dragFilter: null, // function(item) => boolean
            dropFilter: null, // function(item, target) => boolean
            
            // Performance Configuration
            throttleMove: 16, // ~60fps
            useTransform: true,
            hardwareAcceleration: true,
            debounceDropValidation: 50
        };
        
        // Runtime state
        this.dragState = {
            active: false,
            item: null,
            source: null,
            startPosition: null,
            currentPosition: null,
            hoveredTarget: null,
            validTargets: [],
            constraints: {},
            lockId: null
        };
    }

    // ========================
    // BEHAVIOR SCHEMA REGISTRATION
    // ========================
    
    getBehaviorSchema() {
        return {
            "startDrag": {
                "enabled": this.config.enabled,
                "triggers": ["mousedown", "touchstart"],
                "parameters": { 
                    "target": "draggable_element",
                    "threshold": this.config.dragThreshold,
                    "graphics_handler": true
                }
            },
            "updateDrag": {
                "enabled": this.config.enabled,
                "triggers": ["mousemove", "touchmove"],
                "parameters": { 
                    "position": "coordinates",
                    "graphics_handler": true
                }
            },
            "completeDrop": {
                "enabled": this.config.enabled,
                "triggers": ["mouseup", "touchend"],
                "parameters": { 
                    "target": "drop_zone",
                    "graphics_handler": true
                }
            },
            "cancelDrag": {
                "enabled": this.config.enabled,
                "triggers": ["keydown_Escape", "contextmenu"],
                "parameters": { 
                    "reason": "user_cancelled",
                    "graphics_handler": true
                }
            },
            "validateDropZone": {
                "enabled": this.config.enabled,
                "triggers": ["drag_enter", "drag_over"],
                "parameters": { 
                    "target": "potential_drop_zone",
                    "graphics_handler": true
                }
            }
        };
    }

    // ========================
    // VISUAL SCHEMA FOR GRAPHICS HANDLER
    // ========================
    
    getVisualSchema() {
        return {
            dragPreview: {
                opacity: this.config.previewOpacity,
                transform: 'scale(0.95)',
                border: '2px dashed #007acc',
                backgroundColor: 'rgba(0, 122, 204, 0.1)',
                borderRadius: '4px',
                pointerEvents: 'none',
                zIndex: 1000
            },
            dropZoneStyles: {
                valid: {
                    border: '2px solid #4caf50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    boxShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
                },
                invalid: {
                    border: '2px solid #f44336',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    boxShadow: '0 0 8px rgba(244, 67, 54, 0.3)'
                },
                hover: {
                    border: '3px solid #2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.15)',
                    transform: 'scale(1.02)'
                }
            },
            dragStates: {
                dragging: {
                    cursor: this.config.dragCursor,
                    userSelect: 'none',
                    webkitUserSelect: 'none'
                },
                source: {
                    opacity: 0.5,
                    filter: 'grayscale(0.3)'
                }
            },
            animations: {
                dragStart: { duration: 150, easing: 'ease-out' },
                dragEnd: { duration: 200, easing: 'ease-in-out' },
                dropZoneEnter: { duration: 100, easing: 'ease-out' },
                dropZoneExit: { duration: 150, easing: 'ease-in' },
                returnToOrigin: { duration: 300, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }
            }
        };
    }

    // ========================
    // BEHAVIOR LIFECYCLE METHODS
    // ========================
    
    attachToBehavior(hostContainer) {
        if (this.isAttached) {
            throw new Error('DragAndDropBehavior already attached to a container');
        }
        
        this.hostContainer = hostContainer;
        this.isAttached = true;
        
        // Register behavior schema with Event Handler via ChangeLog
        return {
            success: true,
            changeLog: {
                type: 'behavior_attached',
                behaviorType: 'DragAndDropBehavior',
                containerId: hostContainer.id,
                schema: this.getBehaviorSchema(),
                timestamp: Date.now()
            }
        };
    }
    
    configureBehavior(options) {
        if (!this.isAttached) {
            throw new Error('Cannot configure behavior before attachment');
        }
        
        // Merge new configuration with existing
        this.config = { ...this.config, ...options };
        
        // Validate configuration
        const validation = this.validateConfiguration();
        if (!validation.valid) {
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }
        
        return {
            success: true,
            config: this.config,
            changeLog: {
                type: 'behavior_configured',
                behaviorType: 'DragAndDropBehavior',
                containerId: this.hostContainer.id,
                config: this.config,
                timestamp: Date.now()
            }
        };
    }
    
    validateConfiguration() {
        const errors = [];
        
        if (this.config.dragThreshold < 0) {
            errors.push('dragThreshold must be non-negative');
        }
        
        if (!['both', 'horizontal', 'vertical', 'none'].includes(this.config.dragAxis)) {
            errors.push('dragAxis must be one of: both, horizontal, vertical, none');
        }
        
        if (this.config.previewOpacity < 0 || this.config.previewOpacity > 1) {
            errors.push('previewOpacity must be between 0 and 1');
        }
        
        if (this.config.throttleMove < 1) {
            errors.push('throttleMove must be at least 1ms');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ========================
    // CORE BEHAVIOR FUNCTIONS (Called by Event Handler)
    // ========================
    
    startDrag(parameters) {
        // Check if drag operations are allowed in current mode
        if (!this._isAllowedInCurrentMode()) {
            return { 
                success: false, 
                reason: 'drag_disabled_in_preview_mode',
                message: 'Drag and drop is only available in design mode'
            };
        }
        
        if (!this.config.enabled || this.dragState.active) {
            return { success: false, reason: 'drag_not_available' };
        }
        
        // Validate parameters
        if (!parameters || !parameters.target || !parameters.position) {
            return { success: false, reason: 'invalid_parameters' };
        }
        
        const { target, position, event } = parameters;
        
        // Check drag filter
        if (this.config.dragFilter && !this.config.dragFilter(target)) {
            return { success: false, reason: 'item_not_draggable' };
        }
        
        // Request lock from Event Handler
        const lockRequest = {
            type: 'lock_request',
            lockType: 'drag_operation',
            priority: 'high',
            requesterId: this.hostContainer.id,
            lockData: {
                draggedItem: target.id,
                sourceContainer: this.hostContainer.id,
                behaviorType: 'DragAndDropBehavior'
            },
            timeout: 30000 // 30 second timeout
        };
        
        // Initialize drag state
        this.dragState = {
            active: true,
            item: target,
            source: this.hostContainer,
            startPosition: position,
            currentPosition: position,
            hoveredTarget: null,
            validTargets: this.calculateValidTargets(target),
            constraints: this.calculateDragConstraints(target),
            lockId: null // Will be set by Event Handler response
        };
        
        return {
            success: true,
            lockRequest: lockRequest,
            graphics_request: {
                type: 'comprehensive_update',
                componentId: target.id,
                styles: this.getVisualSchema().dragStates.source,
                classes: {
                    add: ['dragging', 'drag-source']
                },
                animation: this.getVisualSchema().animations.dragStart,
                zIndex: 999,
                options: {
                    priority: 'high',
                    batch: false
                }
            },
            changeLog: {
                type: 'drag_started',
                itemId: target.id,
                sourceContainer: this.hostContainer.id,
                position: position,
                timestamp: Date.now()
            }
        };
    }
    
    updateDrag(parameters) {
        if (!this.dragState.active) {
            return { success: false, reason: 'no_active_drag' };
        }
        
        // Validate parameters
        if (!parameters || !parameters.position) {
            return { success: false, reason: 'invalid_parameters' };
        }
        
        const { position, event } = parameters;
        const previousPosition = this.dragState.currentPosition;
        
        // Apply axis constraints
        const constrainedPosition = this.applyAxisConstraints(position);
        
        // Apply boundary constraints
        const finalPosition = this.applyBoundaryConstraints(constrainedPosition);
        
        // Update drag state
        this.dragState.currentPosition = finalPosition;
        
        // Check for hover target changes
        const newHoveredTarget = this.detectHoveredTarget(finalPosition);
        const hoveredTargetChanged = newHoveredTarget !== this.dragState.hoveredTarget;
        
        if (hoveredTargetChanged) {
            this.dragState.hoveredTarget = newHoveredTarget;
        }
        
        // Create preview position with offset
        const previewPosition = {
            x: finalPosition.x + this.config.previewOffset.x,
            y: finalPosition.y + this.config.previewOffset.y
        };
        
        // Build graphics request
        const graphics_request = {
            type: 'comprehensive_update',
            componentId: this.dragState.item.id,
            styles: {
                ...this.getVisualSchema().dragPreview,
                left: `${previewPosition.x}px`,
                top: `${previewPosition.y}px`,
                position: 'fixed'
            },
            options: {
                priority: 'high',
                batch: true
            }
        };
        
        // Add drop zone highlighting if hover target changed
        if (hoveredTargetChanged) {
            graphics_request.additionalRequests = this.generateDropZoneHighlighting();
        }
        
        return {
            success: true,
            graphics_request: graphics_request,
            changeLog: {
                type: 'drag_moved',
                itemId: this.dragState.item.id,
                position: finalPosition,
                hoveredTarget: newHoveredTarget?.id || null,
                timestamp: Date.now()
            }
        };
    }
    
    completeDrop(parameters) {
        if (!this.dragState.active) {
            return { success: false, reason: 'no_active_drag' };
        }
        
        // Validate parameters
        if (!parameters || !parameters.target) {
            return { success: false, reason: 'invalid_parameters' };
        }
        
        const { target, position } = parameters;
        const dropSuccess = this.validateDrop(target);
        
        if (dropSuccess.valid) {
            // Successful drop
            const result = this.executeSuccessfulDrop(target, position);
            this.resetDragState();
            return result;
        } else {
            // Failed drop - return to origin if configured
            if (this.config.returnOnFailedDrop) {
                const result = this.returnToOrigin();
                this.resetDragState();
                return result;
            } else {
                this.resetDragState();
                return {
                    success: false,
                    reason: 'drop_rejected',
                    details: dropSuccess.reason
                };
            }
        }
    }
    
    cancelDrag(parameters) {
        if (!this.dragState.active) {
            return { success: false, reason: 'no_active_drag' };
        }
        
        const { reason } = parameters;
        
        // Capture state before reset
        const itemId = this.dragState.item ? this.dragState.item.id : 'unknown';
        const sourceContainerId = this.hostContainer ? this.hostContainer.id : 'unknown';
        
        // Return to origin
        const result = this.returnToOrigin();
        this.resetDragState();
        
        return {
            ...result,
            changeLog: {
                type: 'drag_cancelled',
                itemId: itemId,
                sourceContainer: sourceContainerId,
                reason: reason || 'user_cancelled',
                timestamp: Date.now()
            }
        };
    }
    
    validateDropZone(parameters) {
        const { target } = parameters;
        const validation = this.validateDrop(target);
        
        const highlightStyle = validation.valid 
            ? this.getVisualSchema().dropZoneStyles.valid
            : this.getVisualSchema().dropZoneStyles.invalid;
        
        return {
            success: true,
            validation: validation,
            graphics_request: {
                type: 'style_update',
                componentId: target.id,
                styles: highlightStyle,
                classes: {
                    add: validation.valid ? ['valid-drop-zone'] : ['invalid-drop-zone'],
                    remove: validation.valid ? ['invalid-drop-zone'] : ['valid-drop-zone']
                },
                animation: this.getVisualSchema().animations.dropZoneEnter
            }
        };
    }

    // ========================
    // UTILITY METHODS
    // ========================

    
    calculateValidTargets(item) {
        const validTargets = [];
        
        // Check configured valid drop zones (HTML elements)
        if (this.config.validDropZones.length > 0) {
            this.config.validDropZones.forEach(zoneId => {
                const zone = document.getElementById(zoneId);
                if (zone) validTargets.push(zone);
            });
        }
        
        // Add container objects' DOM elements as targets
        if (this.config.dropTargetContainers.length > 0) {
            this.config.dropTargetContainers.forEach(container => {
                if (container.element && !validTargets.includes(container.element)) {
                    validTargets.push(container.element);
                }
            });
        }
        
        // Apply drop filter if configured
        if (this.config.dropFilter) {
            return validTargets.filter(target => this.config.dropFilter(item, target));
        }
        
        return validTargets;
    }
    
    calculateDragConstraints(item) {
        const constraints = {};
        
        if (this.config.dragBounds) {
            constraints.bounds = { ...this.config.dragBounds };
        }
        
        if (this.config.snapToGrid) {
            constraints.grid = { ...this.config.gridSize };
        }
        
        constraints.axis = this.config.dragAxis;
        
        return constraints;
    }
    
    applyAxisConstraints(position) {
        if (!this.dragState.startPosition) return position;
        
        switch (this.config.dragAxis) {
            case 'horizontal':
                return {
                    x: position.x,
                    y: this.dragState.startPosition.y
                };
            case 'vertical':
                return {
                    x: this.dragState.startPosition.x,
                    y: position.y
                };
            case 'none':
                return this.dragState.startPosition;
            default: // 'both'
                return position;
        }
    }
    
    applyBoundaryConstraints(position) {
        if (!this.config.dragBounds) return position;
        
        const bounds = this.config.dragBounds;
        return {
            x: Math.max(bounds.left, Math.min(bounds.right, position.x)),
            y: Math.max(bounds.top, Math.min(bounds.bottom, position.y))
        };
    }
    
    detectHoveredTarget(position) {
        // This would normally use spatial indexing for performance
        // For now, simple detection based on configured valid targets
        return this.dragState.validTargets.find(target => {
            const rect = target.getBoundingClientRect();
            return position.x >= rect.left && position.x <= rect.right &&
                   position.y >= rect.top && position.y <= rect.bottom;
        }) || null;
    }
    
    validateDrop(target) {
        if (!target) {
            return { valid: false, reason: 'no_target' };
        }
        
        // Check if target is in invalid drop zones
        if (this.config.invalidDropZones.includes(target.id)) {
            return { valid: false, reason: 'target_in_invalid_zone' };
        }
        
        // Check if target is in valid drop zones (if specified)
        if (this.config.validDropZones.length > 0 && 
            !this.config.validDropZones.includes(target.id)) {
            return { valid: false, reason: 'target_not_in_valid_zone' };
        }
        
        // Check container objects for advanced validation
        if (this.config.dropTargetContainers.length > 0) {
            const targetContainer = this.config.dropTargetContainers.find(container => 
                container.id === target.id || 
                container.containerId === target.id || 
                container.element === target ||
                container.element?.id === target.id
            );
            
            if (targetContainer && typeof targetContainer.canAcceptDrop === 'function') {
                const containerValidation = targetContainer.canAcceptDrop(this.dragState.item, {
                    position: this.dragState.currentPosition,
                    source: this.dragState.source
                });
                
                if (!containerValidation.allowed) {
                    return { 
                        valid: false, 
                        reason: containerValidation.reason || 'container_rejected_drop',
                        details: containerValidation.message
                    };
                }
            }
        }
        
        // Apply drop filter if configured
        if (this.config.dropFilter && 
            !this.config.dropFilter(this.dragState.item, target)) {
            return { valid: false, reason: 'drop_filter_rejected' };
        }
        
        return { valid: true };
    }
    
    executeSuccessfulDrop(target, position) {
        // Check if we have a container object that can handle the drop
        if (this.config.dropTargetContainers.length > 0) {
            const targetContainer = this.config.dropTargetContainers.find(container => 
                container.id === target.id || 
                container.containerId === target.id || 
                container.element === target ||
                container.element?.id === target.id
            );
            
            if (targetContainer && typeof targetContainer.handleDrop === 'function') {
                const containerDropResult = targetContainer.handleDrop(this.dragState.item, {
                    position: position,
                    source: this.dragState.source,
                    dragContext: this.dragState
                });
                
                if (containerDropResult.success) {
                    return {
                        success: true,
                        containerHandled: true,
                        graphics_request: containerDropResult.graphics_request || {
                            type: 'comprehensive_update',
                            componentId: this.dragState.item.id,
                            styles: {
                                position: 'relative',
                                left: '0px',
                                top: '0px',
                                transform: 'none',
                                opacity: '1',
                                filter: 'none'
                            },
                            classes: {
                                remove: ['dragging', 'drag-source', 'drag-preview']
                            },
                            animation: this.getVisualSchema().animations.dragEnd,
                            zIndex: 'auto'
                        },
                        changeLog: containerDropResult.changeLog || {
                            type: 'drag_dropped_container_handled',
                            itemId: this.dragState.item.id,
                            sourceContainer: this.hostContainer.id,
                            targetContainer: target.id,
                            position: position,
                            success: true,
                            timestamp: Date.now()
                        }
                    };
                } else {
                    return {
                        success: false,
                        reason: 'container_drop_failed',
                        details: containerDropResult.error || 'Container failed to handle drop'
                    };
                }
            }
        }
        
        // Fallback to default drop handling
        return {
            success: true,
            graphics_request: {
                type: 'comprehensive_update',
                componentId: this.dragState.item.id,
                styles: {
                    position: 'relative',
                    left: '0px',
                    top: '0px',
                    transform: 'none',
                    opacity: '1',
                    filter: 'none'
                },
                classes: {
                    remove: ['dragging', 'drag-source', 'drag-preview']
                },
                animation: this.getVisualSchema().animations.dragEnd,
                zIndex: 'auto'
            },
            changeLog: {
                type: 'drag_dropped',
                itemId: this.dragState.item.id,
                sourceContainer: this.hostContainer.id,
                targetContainer: target.id,
                position: position,
                success: true,
                timestamp: Date.now()
            }
        };
    }
    
    returnToOrigin() {
        if (!this.dragState.startPosition) {
            return { success: false, reason: 'no_origin_position' };
        }
        
        return {
            success: true,
            graphics_request: {
                type: 'comprehensive_update',
                componentId: this.dragState.item.id,
                styles: {
                    left: `${this.dragState.startPosition.x}px`,
                    top: `${this.dragState.startPosition.y}px`,
                    opacity: '1',
                    filter: 'none'
                },
                classes: {
                    remove: ['dragging', 'drag-source', 'drag-preview']
                },
                animation: this.getVisualSchema().animations.returnToOrigin,
                zIndex: 'auto'
            }
        };
    }
    
    generateDropZoneHighlighting() {
        const requests = [];
        
        // Clear previous highlighting
        this.dragState.validTargets.forEach(target => {
            if (target !== this.dragState.hoveredTarget) {
                requests.push({
                    type: 'style_update',
                    componentId: target.id,
                    classes: {
                        remove: ['valid-drop-zone', 'invalid-drop-zone', 'hovered-drop-zone']
                    }
                });
            }
        });
        
        // Apply new highlighting
        if (this.dragState.hoveredTarget) {
            const validation = this.validateDrop(this.dragState.hoveredTarget);
            requests.push({
                type: 'style_update',
                componentId: this.dragState.hoveredTarget.id,
                styles: this.getVisualSchema().dropZoneStyles.hover,
                classes: {
                    add: ['hovered-drop-zone']
                },
                animation: this.getVisualSchema().animations.dropZoneEnter
            });
        }
        
        return requests;
    }
    
    resetDragState() {
        this.dragState = {
            active: false,
            item: null,
            source: null,
            startPosition: null,
            currentPosition: null,
            hoveredTarget: null,
            validTargets: [],
            constraints: {},
            lockId: null
        };
    }
    
    // ========================
    // CLEANUP METHODS
    // ========================
    
    detachFromContainer() {
        if (!this.isAttached) {
            return { success: false, reason: 'not_attached' };
        }
        
        // Cancel any active drag
        if (this.dragState.active) {
            this.cancelDrag({ reason: 'behavior_detached' });
        }
        
        this.hostContainer = null;
        this.isAttached = false;
        
        return {
            success: true,
            changeLog: {
                type: 'behavior_detached',
                behaviorType: 'DragAndDropBehavior',
                timestamp: Date.now()
            }
        };
    }
    
    releaseAllLocks() {
        if (this.currentLockId) {
            return {
                success: true,
                lockRelease: {
                    type: 'lock_release',
                    lockId: this.currentLockId,
                    reason: 'behavior_cleanup'
                }
            };
        }
        
        return { success: true, reason: 'no_active_locks' };
    }
    
    /**
     * Check if drag operations are allowed in current application mode
     * Drag and drop should only be available in design mode, not preview mode
     */
    _isAllowedInCurrentMode() {
        try {
            // Try to get global mode from multiple sources
            
            // 1. Check if there's a global toolsApp (ReactiveToolsApplication)
            if (typeof window !== 'undefined' && window.toolsApp && 
                typeof window.toolsApp.getCurrentMode === 'function') {
                const currentMode = window.toolsApp.getCurrentMode();
                console.log(`🎯 DragAndDropBehavior: Current mode from toolsApp: ${currentMode}`);
                return currentMode === 'design';
            }
            
            // 2. Check if there's a global ReactiveToolsApplication
            if (typeof window !== 'undefined' && window.reactiveToolsApp && 
                typeof window.reactiveToolsApp.getCurrentMode === 'function') {
                const currentMode = window.reactiveToolsApp.getCurrentMode();
                console.log(`🎯 DragAndDropBehavior: Current mode from reactiveToolsApp: ${currentMode}`);
                return currentMode === 'design';
            }
            
            // 3. Check if host container has ChangeLog access
            if (this.hostContainer && this.hostContainer.changeLog && 
                typeof this.hostContainer.changeLog.getValue === 'function') {
                const currentMode = this.hostContainer.changeLog.getValue('application.mode');
                console.log(`🎯 DragAndDropBehavior: Current mode from host ChangeLog: ${currentMode}`);
                return currentMode === 'design';
            }
            
            // 4. Check if there's a global ChangeLog
            if (typeof window !== 'undefined' && window.changeLog && 
                typeof window.changeLog.getValue === 'function') {
                const currentMode = window.changeLog.getValue('application.mode');
                console.log(`🎯 DragAndDropBehavior: Current mode from global ChangeLog: ${currentMode}`);
                return currentMode === 'design';
            }
            
            // 5. Fallback: check if we're in Node.js environment (always allow for testing)
            if (typeof window === 'undefined') {
                console.log(`🎯 DragAndDropBehavior: Node.js environment, allowing drag`);
                return true;
            }
            
            // 6. Default fallback: allow drag in design mode (assume design mode if unknown)
            console.warn('⚠️ DragAndDropBehavior: Could not determine application mode, defaulting to allow drag');
            return true;
            
        } catch (error) {
            console.error('❌ Error checking application mode for drag operations:', error);
            // Error case: default to allowing drag to avoid breaking functionality
            return true;
        }
    }
    
    resetBehaviorState() {
        this.resetDragState();
        this.currentLockId = null;
        
        return {
            success: true,
            changeLog: {
                type: 'behavior_reset',
                behaviorType: 'DragAndDropBehavior',
                timestamp: Date.now()
            }
        };
    }
    
    destroyBehavior() {
        this.detachFromContainer();
        this.releaseAllLocks();
        this.resetBehaviorState();
        
        // Clear configuration
        this.config = null;
        
        return {
            success: true,
            changeLog: {
                type: 'behavior_destroyed',
                behaviorType: 'DragAndDropBehavior',
                timestamp: Date.now()
            }
        };
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragAndDropBehavior;
}
