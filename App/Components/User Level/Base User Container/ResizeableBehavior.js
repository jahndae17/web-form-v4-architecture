/**
 * Resizeable Behavior
 * 
 * Provides resize handles and dimension management for BaseUserContainer.
 * Handles drag-based resizing with constraint support and live preview.
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - Function declarations only
 * - Graphics requests returned to Event Handler
 * - Active in design mode only
 * - NO direct visual operations
 */

class ResizeableBehavior {
    constructor(component) {
        this.component = component;
        this.componentId = component.containerId;
        
        // Resize state
        this.isResizing = false;
        this.resizeHandle = null;
        this.startDimensions = null;
        this.startPosition = null;
        
        // Resize constraints
        this.constraints = {
            minWidth: 50,
            minHeight: 30,
            maxWidth: null,
            maxHeight: null,
            aspectRatio: null,
            snapToGrid: false,
            gridSize: 10
        };
        
        // Behavior schema for resize operations
        this.behaviorSchema = {
            "startResize": {
                "enabled": true,
                "triggers": ["mousedown_resize_handle"],
                "parameters": { 
                    "handle": "required", 
                    "position": "required",
                    "constrainAspectRatio": false 
                },
                "contextDependent": true,
                "requiredMode": "design"
            },
            "performResize": {
                "enabled": true,
                "triggers": ["mousemove_while_resizing"],
                "parameters": { 
                    "position": "required", 
                    "constraints": "optional",
                    "livePreview": true 
                },
                "contextDependent": true,
                "requiredMode": "design"
            },
            "endResize": {
                "enabled": true,
                "triggers": ["mouseup", "Escape"],
                "parameters": { 
                    "finalDimensions": "optional",
                    "cancelled": false 
                },
                "contextDependent": true,
                "requiredMode": "design"
            },
            "showResizeHandles": {
                "enabled": true,
                "triggers": ["selection", "hover"],
                "parameters": { "visible": "required" },
                "contextDependent": true,
                "requiredMode": "design"
            },
            "constrainResize": {
                "enabled": true,
                "triggers": ["Shift+resize", "Alt+resize"],
                "parameters": { 
                    "constraintType": "required",
                    "value": "optional" 
                },
                "contextDependent": true,
                "requiredMode": "design"
            }
        };
    }
    
    /**
     * Start Resize Operation
     * Initializes resize mode and displays resize preview
     */
    startResize(parameters) {
        console.log("🔍 ResizeableBehavior Stage 1: startResize called", parameters);
        
        // Check if allowed in current mode
        if (!this._isAllowedInCurrentMode()) {
            console.log("🔍 ResizeableBehavior Stage 1a: Resize not allowed in current mode");
            return { success: false, error: 'Resize not allowed in current mode' };
        }
        
        console.log("🔍 ResizeableBehavior Stage 1b: Mode check passed, setting resize state");
        
        // Business logic
        this.isResizing = true;
        this.component.isResizing = true;
        this.resizeHandle = parameters.handle;
        
        // Handle coordinate formats: accept either position object or clientX/clientY
        if (parameters.position) {
            this.startPosition = parameters.position;
        } else if (parameters.clientX !== undefined && parameters.clientY !== undefined) {
            this.startPosition = { x: parameters.clientX, y: parameters.clientY };
        } else {
            console.log("🔍 ResizeableBehavior Stage 1c: Invalid parameters - no position data");
            return { success: false, error: 'Invalid parameters: position or clientX/clientY required' };
        }
        
        console.log("🔍 ResizeableBehavior Stage 1d: Getting start dimensions");
        this.startDimensions = this._getCurrentDimensions();
        
        console.log("🔍 ResizeableBehavior Stage 1e: Start dimensions:", this.startDimensions);
        
        // Update constraints if provided
        if (parameters.constrainAspectRatio) {
            console.log("🔍 ResizeableBehavior Stage 1f: Setting aspect ratio constraint");
            this.constraints.aspectRatio = this.startDimensions.width / this.startDimensions.height;
        }
        
        console.log("🔍 ResizeableBehavior Stage 1g: Creating graphics request");
        
        // Create resize start graphics request
        const graphics_request = {
            type: 'resize_start',
            componentId: this.componentId,
            styles: {
                ...this.component.visualSpecs.states.resizing,
                cursor: this._getResizeCursor(parameters.handle),
                userSelect: 'none',
                pointerEvents: 'none' // Prevent interference during resize
            },
            classes: {
                add: ['resizing', 'resize-active', `resize-${parameters.handle}`],
                remove: ['idle', 'resize-inactive']
            },
            attributes: {
                'data-resize-state': 'active',
                'data-resize-handle': parameters.handle,
                'data-resize-start-time': Date.now()
            },
            resizeHandles: {
                visible: true,
                activeHandle: parameters.handle,
                style: 'solid'
            },
            options: {
                priority: 'high',
                batch: false,
                onComplete: () => this._onResizeStart()
            }
        };
        
        // Add resize preview overlay
        graphics_request.overlay = {
            type: 'resize_preview',
            styles: {
                position: 'absolute',
                border: '2px dashed #f39c12',
                backgroundColor: 'rgba(243, 156, 18, 0.1)',
                pointerEvents: 'none',
                zIndex: 1001
            },
            dimensions: this.startDimensions
        };
        
        console.log("🔍 ResizeableBehavior Stage 1h: Returning success result");
        
        return {
            success: true,
            graphics_request,
            state_change: {
                componentId: this.componentId,
                property: 'isResizing',
                value: true,
                metadata: {
                    handle: parameters.handle,
                    startPosition: this.startPosition,
                    startDimensions: this.startDimensions,
                    constrainAspectRatio: parameters.constrainAspectRatio,
                    timestamp: Date.now()
                }
            },
            cursor_change: {
                cursor: this._getResizeCursor(parameters.handle),
                scope: 'document' // Apply to entire document during resize
            }
        };
    }
    
    /**
     * Perform Resize Operation
     * Updates dimensions during live resize with constraints
     */
    performResize(parameters) {
        console.log("🔍 ResizeableBehavior Stage 2: performResize called", parameters);
        
        if (!this.isResizing) {
            console.log("🔍 ResizeableBehavior Stage 2a: Component not in resize mode");
            return { success: false, error: 'Component not in resize mode' };
        }
        
        console.log("🔍 ResizeableBehavior Stage 2b: Resize mode confirmed, processing position");
        
        // Handle coordinate formats: accept either position object or clientX/clientY
        let currentPosition;
        if (parameters.position) {
            currentPosition = parameters.position;
        } else if (parameters.clientX !== undefined && parameters.clientY !== undefined) {
            currentPosition = { x: parameters.clientX, y: parameters.clientY };
        } else {
            console.log("🔍 ResizeableBehavior Stage 2c: Invalid parameters - no position data");
            return { success: false, error: 'Invalid parameters: position or clientX/clientY required' };
        }
        
        console.log("🔍 ResizeableBehavior Stage 2d: Calculating new dimensions");
        
        // Calculate new dimensions based on handle and mouse position
        const newDimensions = this._calculateNewDimensions(
            currentPosition, 
            this.resizeHandle,
            this.startDimensions,
            this.startPosition
        );
        
        console.log("🔍 ResizeableBehavior Stage 2e: Applying constraints");
        
        // Apply constraints
        const constrainedDimensions = this._applyConstraints(
            newDimensions, 
            parameters.constraints || this.constraints
        );
        
        console.log("🔍 ResizeableBehavior Stage 2f: Creating live resize graphics request");
        
        // Create live resize graphics request
        // IMPORTANT: During performResize (live preview), we should NOT apply styles to the element
        // Instead, we only update the overlay preview and pass calculated dimensions for tracking
        const graphics_request = {
            type: 'resize_preview',
            componentId: this.componentId,
            // NO STYLES during live preview to prevent layout thrashing of parent containers
            overlay: {
                update: true,
                dimensions: constrainedDimensions,
                showDimensions: true,
                dimensionText: `${Math.round(constrainedDimensions.width)} × ${Math.round(constrainedDimensions.height)}`,
                styles: {
                    position: 'absolute',
                    border: '2px dashed #007acc',
                    background: 'rgba(0, 122, 204, 0.1)',
                    pointerEvents: 'none',
                    zIndex: 1000
                }
            },
            // Store calculated styles for Graphics Handler to track, but don't apply them yet
            calculatedStyles: {
                width: `${constrainedDimensions.width}px`,
                height: `${constrainedDimensions.height}px`,
                left: `${constrainedDimensions.x || this.startDimensions.x}px`,
                top: `${constrainedDimensions.y || this.startDimensions.y}px`
            },
            animation: {
                duration: 0 // Immediate for smooth live resize
            },
            options: {
                priority: 'high',
                batch: true,
                throttle: 16 // ~60fps for smooth resizing
            }
        };
        
        // Add constraint violations feedback
        if (this._hasConstraintViolations(newDimensions, constrainedDimensions)) {
            graphics_request.constraintFeedback = {
                type: 'violation',
                message: this._getConstraintViolationMessage(newDimensions, constrainedDimensions),
                style: 'error'
            };
        }
        
        console.log("🔍 ResizeableBehavior Stage 2g: Returning performResize result");
        
        return {
            success: true,
            graphics_request,
            state_change: {
                componentId: this.componentId,
                property: 'currentDimensions',
                value: constrainedDimensions,
                temporary: true, // This is a preview state
                metadata: {
                    original: newDimensions,
                    constrained: constrainedDimensions,
                    violations: this._getConstraintViolations(newDimensions, constrainedDimensions)
                }
            }
        };
    }
    
    /**
     * End Resize Operation
     * Finalizes resize and cleans up resize state
     */
    endResize(parameters) {
        console.log("🔍 ResizeableBehavior Stage 3: endResize called", parameters);
        
        if (!this.isResizing) {
            console.log("🔍 ResizeableBehavior Stage 3a: Component not in resize mode");
            return { success: true, message: 'Component not in resize mode' };
        }
        
        console.log("🔍 ResizeableBehavior Stage 3b: Setting resize state to false");
        
        // Business logic
        this.isResizing = false;
        this.component.isResizing = false;
        
        const cancelled = parameters.cancelled || false;
        let finalDimensions;
        
        console.log("🔍 ResizeableBehavior Stage 3c: Determining final dimensions, cancelled:", cancelled);
        
        if (cancelled) {
            // Revert to original dimensions
            finalDimensions = this.startDimensions;
            console.log("🔍 ResizeableBehavior Stage 3d: Using start dimensions (cancelled)");
        } else if (parameters.finalDimensions) {
            // Use provided final dimensions (from Graphics Handler with actual resize calculations)
            finalDimensions = parameters.finalDimensions;
            console.log(`🔍 ResizeableBehavior Stage 3e: Using provided finalDimensions:`, finalDimensions);
        } else {
            // Fallback to current dimensions (should rarely be used)
            finalDimensions = this._getCurrentDimensions();
            console.log(`🔍 ResizeableBehavior Stage 3f: No finalDimensions provided, using current:`, finalDimensions);
        }
        
        console.log("🔍 ResizeableBehavior Stage 3g: Creating resize completion graphics request");
        
        // Create resize completion graphics request
        const graphics_request = {
            type: 'resize_complete',
            componentId: this.componentId,
            // Remove animation to ensure immediate style application in Graphics Handler
            // Animation was causing Graphics Handler to take animation path instead of immediate path
            styles: {
                width: `${finalDimensions.width}px`,
                height: `${finalDimensions.height}px`,
                left: `${finalDimensions.x}px`,
                top: `${finalDimensions.y}px`,
                cursor: 'default',
                userSelect: 'auto',
                pointerEvents: 'auto'
            },
            classes: {
                add: ['resize-complete', 'idle'],
                remove: ['resizing', 'resize-active', `resize-${this.resizeHandle}`]
            },
            attributes: {
                'data-resize-state': 'complete',
                'data-final-width': finalDimensions.width,
                'data-final-height': finalDimensions.height
            },
            resizeHandles: {
                visible: this.component.isSelected, // Keep handles if selected
                style: 'normal'
            },
            overlay: {
                remove: true // Remove resize preview overlay
            },
            options: {
                priority: 'high',
                batch: false,
                onComplete: () => this._onResizeComplete(finalDimensions, cancelled)
            }
        };
        
        console.log("🔍 ResizeableBehavior Stage 3h: Resetting state variables");
        
        // Reset state
        this.resizeHandle = null;
        this.startDimensions = null;
        this.startPosition = null;
        this.constraints.aspectRatio = null; // Clear temporary aspect ratio
        
        return {
            success: true,
            graphics_request,
            state_change: {
                componentId: this.componentId,
                property: 'isResizing',
                value: false,
                metadata: {
                    finalDimensions,
                    cancelled,
                    duration: Date.now() - (this.resizeStartTime || Date.now()),
                    timestamp: Date.now()
                }
            },
            cursor_change: {
                cursor: 'default',
                scope: 'document'
            }
        };
    }
    
    /**
     * Show/Hide Resize Handles
     * Controls visibility of resize handles based on selection/hover
     */
    showResizeHandles(parameters) {
        if (!this._isAllowedInCurrentMode()) {
            return { success: false, error: 'Resize handles not available in current mode' };
        }
        
        const visible = parameters.visible;
        
        // Create resize handles graphics request
        const graphics_request = {
            type: 'resize_handles',
            componentId: this.componentId,
            animation: {
                duration: 150,
                easing: 'ease-in-out'
            },
            resizeHandles: {
                visible,
                positions: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
                style: {
                    width: '40px', // Increased for better interaction
                    height: '40px', // Increased for better interaction
                    backgroundColor: 'transparent', // Invisible handles
                    border: 'none',
                    borderRadius: '2px',
                    opacity: visible ? 1 : 0,
                    pointerEvents: visible ? 'auto' : 'none'
                },
                hoverStyle: {
                    backgroundColor: 'transparent', // Keep invisible on hover
                    transform: 'none'
                }
            },
            classes: {
                add: visible ? ['resize-handles-visible'] : ['resize-handles-hidden'],
                remove: visible ? ['resize-handles-hidden'] : ['resize-handles-visible']
            },
            options: {
                priority: 'medium',
                batch: true
            }
        };
        
        return {
            success: true,
            graphics_request,
            state_change: {
                componentId: this.componentId,
                property: 'resizeHandlesVisible',
                value: visible,
                timestamp: Date.now()
            }
        };
    }

    /**
     * Hide Resize Handles
     * Convenience method to hide resize handles
     */
    hideResizeHandles() {
        return this.showResizeHandles({ visible: false });
    }
    
    /**
     * Constrain Resize
     * Applies specific constraints during resize (Shift, Alt modifiers)
     */
    constrainResize(parameters) {
        const constraintType = parameters.constraintType;
        const value = parameters.value;
        
        switch(constraintType) {
            case 'aspectRatio':
                this.constraints.aspectRatio = value || (this.startDimensions.width / this.startDimensions.height);
                break;
            case 'square':
                this.constraints.aspectRatio = 1;
                break;
            case 'snapToGrid':
                this.constraints.snapToGrid = true;
                this.constraints.gridSize = value || 10;
                break;
            case 'centerResize':
                this.constraints.centerResize = true;
                break;
        }
        
        // Create constraint feedback graphics request
        return {
            success: true,
            graphics_request: {
                type: 'constraint_feedback',
                componentId: this.componentId,
                constraintIndicator: {
                    type: constraintType,
                    visible: true,
                    style: {
                        position: 'absolute',
                        top: '-25px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(52, 152, 219, 0.9)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        zIndex: 1002
                    },
                    text: this._getConstraintText(constraintType, value)
                },
                options: {
                    priority: 'medium',
                    batch: true
                }
            },
            state_change: {
                componentId: this.componentId,
                property: 'resizeConstraints',
                value: { ...this.constraints },
                temporary: true
            }
        };
    }
    
    // UTILITY METHODS
    
    /**
     * Check if resize is allowed in current mode
     */
    _isAllowedInCurrentMode() {
        return this.component.isDesignMode() && this.component.isResizeable;
    }
    
    /**
     * Get current component dimensions
     */
    _getCurrentDimensions() {
        if (!this.component.element) {
            return { width: 100, height: 50, x: 0, y: 0 };
        }
        
        // Use offset properties for consistency with CSS positioning system
        // This matches how Graphics Handler calculates final dimensions
        const element = this.component.element;
        
        return {
            width: element.offsetWidth,
            height: element.offsetHeight,
            x: element.offsetLeft,
            y: element.offsetTop
        };
    }
    
    /**
     * Calculate new dimensions based on resize handle and mouse position
     */
    _calculateNewDimensions(currentPosition, handle, startDimensions, startPosition) {
        const deltaX = currentPosition.x - startPosition.x;
        const deltaY = currentPosition.y - startPosition.y;
        
        let newDimensions = { ...startDimensions };
        
        switch(handle) {
            case 'nw':
                newDimensions.width = startDimensions.width - deltaX;
                newDimensions.height = startDimensions.height - deltaY;
                newDimensions.x = startDimensions.x + deltaX;
                newDimensions.y = startDimensions.y + deltaY;
                break;
            case 'n':
                newDimensions.height = startDimensions.height - deltaY;
                newDimensions.y = startDimensions.y + deltaY;
                break;
            case 'ne':
                newDimensions.width = startDimensions.width + deltaX;
                newDimensions.height = startDimensions.height - deltaY;
                newDimensions.y = startDimensions.y + deltaY;
                break;
            case 'e':
                newDimensions.width = startDimensions.width + deltaX;
                break;
            case 'se':
                newDimensions.width = startDimensions.width + deltaX;
                newDimensions.height = startDimensions.height + deltaY;
                break;
            case 's':
                newDimensions.height = startDimensions.height + deltaY;
                break;
            case 'sw':
                newDimensions.width = startDimensions.width - deltaX;
                newDimensions.height = startDimensions.height + deltaY;
                newDimensions.x = startDimensions.x + deltaX;
                break;
            case 'w':
                newDimensions.width = startDimensions.width - deltaX;
                newDimensions.x = startDimensions.x + deltaX;
                break;
        }
        
        return newDimensions;
    }
    
    /**
     * Apply resize constraints
     */
    _applyConstraints(dimensions, constraints) {
        let constrained = { ...dimensions };
        
        // Minimum constraints
        if (constraints.minWidth) {
            constrained.width = Math.max(constrained.width, constraints.minWidth);
        }
        if (constraints.minHeight) {
            constrained.height = Math.max(constrained.height, constraints.minHeight);
        }
        
        // Maximum constraints
        if (constraints.maxWidth) {
            constrained.width = Math.min(constrained.width, constraints.maxWidth);
        }
        if (constraints.maxHeight) {
            constrained.height = Math.min(constrained.height, constraints.maxHeight);
        }
        
        // Aspect ratio constraint
        if (constraints.aspectRatio) {
            const ratio = constraints.aspectRatio;
            // Determine which dimension to constrain based on which changed more
            const widthChange = Math.abs(constrained.width - this.startDimensions.width);
            const heightChange = Math.abs(constrained.height - this.startDimensions.height);
            
            if (widthChange > heightChange) {
                constrained.height = constrained.width / ratio;
            } else {
                constrained.width = constrained.height * ratio;
            }
        }
        
        // Grid snapping
        if (constraints.snapToGrid) {
            const gridSize = constraints.gridSize || 10;
            constrained.width = Math.round(constrained.width / gridSize) * gridSize;
            constrained.height = Math.round(constrained.height / gridSize) * gridSize;
            
            if (constrained.x !== undefined) {
                constrained.x = Math.round(constrained.x / gridSize) * gridSize;
            }
            if (constrained.y !== undefined) {
                constrained.y = Math.round(constrained.y / gridSize) * gridSize;
            }
        }
        
        // Center resize constraint
        if (constraints.centerResize && this.startDimensions) {
            const widthDelta = constrained.width - this.startDimensions.width;
            const heightDelta = constrained.height - this.startDimensions.height;
            
            constrained.x = this.startDimensions.x - (widthDelta / 2);
            constrained.y = this.startDimensions.y - (heightDelta / 2);
        }
        
        return constrained;
    }
    
    /**
     * Get resize cursor for handle
     */
    _getResizeCursor(handle) {
        const cursors = {
            'nw': 'nw-resize',
            'n': 'n-resize',
            'ne': 'ne-resize',
            'e': 'e-resize',
            'se': 'se-resize',
            's': 's-resize',
            'sw': 'sw-resize',
            'w': 'w-resize'
        };
        return cursors[handle] || 'nw-resize';
    }
    
    /**
     * Check for constraint violations
     */
    _hasConstraintViolations(original, constrained) {
        return JSON.stringify(original) !== JSON.stringify(constrained);
    }
    
    /**
     * Get constraint violation message
     */
    _getConstraintViolationMessage(original, constrained) {
        const violations = [];
        
        if (original.width !== constrained.width) {
            violations.push('width constrained');
        }
        if (original.height !== constrained.height) {
            violations.push('height constrained');
        }
        
        return violations.join(', ');
    }
    
    /**
     * Get constraint violations details
     */
    _getConstraintViolations(original, constrained) {
        const violations = {};
        
        if (original.width < this.constraints.minWidth) {
            violations.minWidth = true;
        }
        if (original.height < this.constraints.minHeight) {
            violations.minHeight = true;
        }
        if (this.constraints.maxWidth && original.width > this.constraints.maxWidth) {
            violations.maxWidth = true;
        }
        if (this.constraints.maxHeight && original.height > this.constraints.maxHeight) {
            violations.maxHeight = true;
        }
        
        return violations;
    }
    
    /**
     * Get constraint text for feedback
     */
    _getConstraintText(constraintType, value) {
        switch(constraintType) {
            case 'aspectRatio':
                return value ? `Aspect Ratio: ${value.toFixed(2)}` : 'Maintain Aspect Ratio';
            case 'square':
                return 'Square Constraint';
            case 'snapToGrid':
                return `Snap to Grid: ${value || 10}px`;
            case 'centerResize':
                return 'Center Resize';
            default:
                return constraintType;
        }
    }
    
    /**
     * Resize start callback
     */
    _onResizeStart() {
        this.resizeStartTime = Date.now();
        
        // Notify Interface Handler
        if (this.component.interfaceHandler) {
            this.component.interfaceHandler.onResizeStart({
                componentId: this.componentId,
                handle: this.resizeHandle,
                startDimensions: this.startDimensions
            });
        }
    }
    
    /**
     * Resize completion callback
     */
    _onResizeComplete(finalDimensions, cancelled) {
        // Notify Interface Handler
        if (this.component.interfaceHandler) {
            this.component.interfaceHandler.onResizeComplete({
                componentId: this.componentId,
                finalDimensions,
                cancelled,
                duration: Date.now() - this.resizeStartTime
            });
        }
    }
    
    /**
     * Get Visual Schema for Resize Operations
     */
    getResizeVisualSchema() {
        return {
            resizeStates: {
                idle: this.component.visualSpecs.baseStyles[this.component.inputMode],
                resizing: this.component.visualSpecs.states.resizing,
                preview: {
                    border: '2px dashed #f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)'
                }
            },
            resizeHandles: {
                size: '8px',
                color: '#3498db',
                hoverColor: '#2980b9',
                positions: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
            },
            resizeAnimations: {
                start: { duration: 100, easing: 'ease-out' },
                complete: { duration: 200, easing: 'ease-in-out' },
                cancel: { duration: 300, easing: 'ease-out' }
            },
            resizeCursors: {
                'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
                'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
                'sw': 'sw-resize', 'w': 'w-resize'
            }
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResizeableBehavior;
} else if (typeof window !== 'undefined') {
    window.ResizeableBehavior = ResizeableBehavior;
}
