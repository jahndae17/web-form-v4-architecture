/**
 * Movable Behavior
 * 
 * Handles movement/dragging logic for BaseUserContainer components.
 * Provides Graphics Handler compliant movement operations with 8px minimum delta.
 * Higher priority than SelectableBehavior - small movements select, larger movements move.
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - Function declarations only
 * - Graphics requests returned to Event Handler
 * - Context-aware enable/disable logic
 * - NO direct visual operations
 * - NO event listeners (handled by Event Handler)
 */

class MovableBehavior {
    constructor(component) {
        this.component = component;
        this.componentId = component.containerId;
        
        // Movement state tracking
        this.isMoving = false;
        this.startPosition = null;
        this.currentPosition = null;
        this.movementDelta = { x: 0, y: 0 };
        this.minimumMovementThreshold = 8; // 8px minimum to trigger movement
        
        // Movement constraints
        this.snapToGrid = true;
        this.gridSize = 10;
        this.boundaries = null;
        
        // Behavior schema for movement operations
        this.behaviorSchema = {
            "startMove": {
                "enabled": true,
                "triggers": ["mousedown"],
                "parameters": { "position": "required", "target": "drag_area" },
                "contextDependent": true,
                "requiredMode": "design",
                "priority": "high" // Higher than SelectableBehavior
            },
            "performMove": {
                "enabled": true,
                "triggers": ["mousemove"],
                "parameters": { "position": "required", "deltaThreshold": 8 },
                "contextDependent": true,
                "requiredMode": "design",
                "priority": "high"
            },
            "endMove": {
                "enabled": true,
                "triggers": ["mouseup", "Escape"],
                "parameters": { "finalPosition": "optional" },
                "contextDependent": true,
                "requiredMode": "design",
                "priority": "high"
            },
            "cancelMove": {
                "enabled": true,
                "triggers": ["Escape", "blur"],
                "parameters": {},
                "contextDependent": true,
                "requiredMode": "design",
                "priority": "high"
            }
        };
    }
    
    /**
     * Start Movement Operation
     * Captures initial position and prepares for potential movement
     */
    startMove(parameters) {
        // Check if movement is allowed in current mode
        if (!this._isAllowedInCurrentMode()) {
            return { success: false, error: 'Movement not allowed in current mode' };
        }
        
        // Get element's current CSS position
        const element = this.component.element;
        const computedStyle = window.getComputedStyle(element);
        const currentLeft = parseInt(computedStyle.left) || 0;
        const currentTop = parseInt(computedStyle.top) || 0;
        
        // Store mouse position and element offset
        this.mouseStartPosition = {
            x: parameters.position.x,
            y: parameters.position.y,
            timestamp: Date.now()
        };
        
        // Store element's initial CSS position
        this.elementStartPosition = {
            x: currentLeft,
            y: currentTop
        };
        
        // Calculate offset between mouse and element
        this.mouseOffset = {
            x: this.mouseStartPosition.x - currentLeft,
            y: this.mouseStartPosition.y - currentTop
        };
        
        this.currentPosition = { ...this.mouseStartPosition };
        this.movementDelta = { x: 0, y: 0 };
        this.isMoving = false; // Not moving yet, just tracking
        
        // Update component state
        this.component.isDragging = false; // Will become true if movement threshold exceeded
        
        // Create movement preparation graphics request
        const graphics_request = {
            type: 'movement_preparation',
            componentId: this.componentId,
            styles: {
                cursor: 'grab',
                userSelect: 'none',
                pointerEvents: 'none' // Prevent interference during potential movement
            },
            classes: {
                add: ['movement-ready'],
                remove: ['movement-idle']
            },
            attributes: {
                'data-movement-state': 'ready',
                'data-movement-start': this.mouseStartPosition.timestamp
            },
            options: {
                priority: 'high',
                batch: false
            }
        };
        
        return {
            success: true,
            graphics_request,
            state_change: {
                componentId: this.componentId,
                property: 'movementState',
                value: 'ready',
                metadata: {
                    mouseStartPosition: this.mouseStartPosition,
                    elementStartPosition: this.elementStartPosition,
                    threshold: this.minimumMovementThreshold,
                    timestamp: Date.now()
                }
            }
        };
    }
    
    /**
     * Perform Movement Operation
     * Only triggers actual movement if delta exceeds 8px threshold
     */
    performMove(parameters) {
        if (!this.mouseStartPosition || !this.elementStartPosition || !this._isAllowedInCurrentMode()) {
            return { success: false, error: 'Movement not initialized or not allowed' };
        }
        
        // Calculate movement delta from mouse start position
        this.movementDelta = {
            x: parameters.position.x - this.mouseStartPosition.x,
            y: parameters.position.y - this.mouseStartPosition.y
        };
        
        const totalDelta = Math.sqrt(
            Math.pow(this.movementDelta.x, 2) + Math.pow(this.movementDelta.y, 2)
        );
        
        // Check if movement threshold exceeded
        if (totalDelta < this.minimumMovementThreshold) {
            // Below threshold - prepare for potential selection instead
            return {
                success: true,
                message: 'Below movement threshold - selection may trigger on mouseup',
                state_change: {
                    componentId: this.componentId,
                    property: 'movementState',
                    value: 'below_threshold',
                    metadata: {
                        currentDelta: totalDelta,
                        threshold: this.minimumMovementThreshold,
                        potentialSelection: true
                    }
                }
            };
        }
        
        // Threshold exceeded - begin actual movement
        if (!this.isMoving) {
            this.isMoving = true;
            this.component.isDragging = true;
            
            // Override any potential selection behavior
            if (this.component.selectableBehavior) {
                this.component.selectableBehavior.suppressSelection = true;
            }
        }
        
        // Calculate new element position based on movement delta
        let targetPosition = {
            x: this.elementStartPosition.x + this.movementDelta.x,
            y: this.elementStartPosition.y + this.movementDelta.y
        };
        
        // Update current mouse position
        this.currentPosition = {
            x: parameters.position.x,
            y: parameters.position.y,
            timestamp: Date.now()
        };
        
        // Apply grid snapping if enabled (to element position, not mouse position)
        if (this.snapToGrid) {
            targetPosition = this._snapToGrid(targetPosition);
        }
        
        // Apply boundary constraints
        if (this.boundaries) {
            targetPosition = this._applyBoundaries(targetPosition);
        }
        
        // Create movement graphics request
        const graphics_request = {
            type: 'active_movement',
            componentId: this.componentId,
            animation: {
                duration: 50, // Very fast for smooth movement
                easing: 'linear'
            },
            styles: {
                left: `${targetPosition.x}px`,
                top: `${targetPosition.y}px`,
                cursor: 'grabbing',
                zIndex: 1000, // Bring to front during movement
                opacity: 0.9
            },
            classes: {
                add: ['moving', 'dragging'],
                remove: ['movement-ready', 'selected'] // Remove selection during movement
            },
            attributes: {
                'data-movement-state': 'moving',
                'data-current-position': `${targetPosition.x},${targetPosition.y}`,
                'data-movement-delta': `${this.movementDelta.x},${this.movementDelta.y}`
            },
            options: {
                priority: 'high',
                batch: false,
                immediate: true // Apply immediately for smooth movement
            }
        };
        
        return {
            success: true,
            graphics_request,
            state_change: {
                componentId: this.componentId,
                property: 'position',
                value: targetPosition,
                metadata: {
                    movementType: 'drag',
                    delta: this.movementDelta,
                    totalDistance: totalDelta,
                    snapped: this.snapToGrid,
                    timestamp: Date.now()
                }
            }
        };
    }
    
    /**
     * End Movement Operation
     * Finalizes position and cleans up movement state
     */
    async endMove(parameters) {
        const wasMoving = this.isMoving;
        const finalMousePosition = parameters.finalPosition || this.currentPosition;
        
        // Calculate the element's final position by subtracting the mouse offset
        const finalElementPosition = finalMousePosition ? {
            x: finalMousePosition.x - this.mouseOffset.x,
            y: finalMousePosition.y - this.mouseOffset.y
        } : null;
        
        // Clean up movement state
        this.isMoving = false;
        this.component.isDragging = false;
        
        // Re-enable selection behavior if it was suppressed
        if (this.component.selectableBehavior) {
            this.component.selectableBehavior.suppressSelection = false;
        }
        
        // If we never actually moved (stayed below threshold), allow selection
        if (!wasMoving && this.component.selectableBehavior) {
            // Trigger selection behavior instead
            setTimeout(async () => {
                await this.component.selectableBehavior.selectSingle({ clearOthers: true });
            }, 0);
            
            return this._resetMovementState();
        }
        
        // Apply final grid snapping to element position
        let snappedPosition = finalElementPosition;
        if (this.snapToGrid && finalElementPosition) {
            snappedPosition = this._snapToGrid(finalElementPosition);
        }
        
        // Create movement completion graphics request
        const graphics_request = {
            type: 'movement_completion',
            componentId: this.componentId,
            animation: {
                duration: 200,
                easing: 'ease-out'
            },
            styles: {
                left: snappedPosition ? `${snappedPosition.x}px` : '',
                top: snappedPosition ? `${snappedPosition.y}px` : '',
                cursor: 'pointer',
                zIndex: '', // Reset z-index
                opacity: 1,
                userSelect: '',
                pointerEvents: ''
            },
            classes: {
                add: ['movement-complete'],
                remove: ['moving', 'dragging', 'movement-ready']
            },
            attributes: {
                'data-movement-state': 'complete',
                'data-final-position': snappedPosition ? `${snappedPosition.x},${snappedPosition.y}` : '',
                'data-movement-end': Date.now()
            },
            options: {
                priority: 'medium',
                batch: false,
                onComplete: () => this._onMovementComplete()
            }
        };
        
        // Reset state
        this.startPosition = null;
        this.currentPosition = null;
        this.movementDelta = { x: 0, y: 0 };
        
        return {
            success: true,
            graphics_request,
            state_change: {
                componentId: this.componentId,
                property: 'position',
                value: snappedPosition,
                metadata: {
                    movementType: 'completed',
                    totalMovement: wasMoving,
                    finalPosition: snappedPosition,
                    timestamp: Date.now()
                }
            }
        };
    }
    
    /**
     * Cancel Movement Operation
     * Returns component to original position
     */
    cancelMove(parameters) {
        const originalPosition = this.startPosition;
        
        // Clean up movement state
        this.isMoving = false;
        this.component.isDragging = false;
        
        // Re-enable selection behavior
        if (this.component.selectableBehavior) {
            this.component.selectableBehavior.suppressSelection = false;
        }
        
        // Create movement cancellation graphics request
        const graphics_request = {
            type: 'movement_cancellation',
            componentId: this.componentId,
            animation: {
                duration: 300,
                easing: 'ease-in-out'
            },
            styles: {
                transform: originalPosition ? `translate(${originalPosition.x}px, ${originalPosition.y}px)` : '',
                cursor: 'pointer',
                zIndex: '',
                opacity: 1,
                userSelect: '',
                pointerEvents: ''
            },
            classes: {
                add: ['movement-cancelled'],
                remove: ['moving', 'dragging', 'movement-ready']
            },
            attributes: {
                'data-movement-state': 'cancelled',
                'data-returned-to': originalPosition ? `${originalPosition.x},${originalPosition.y}` : ''
            },
            options: {
                priority: 'high',
                batch: false
            }
        };
        
        // Reset state
        this.startPosition = null;
        this.currentPosition = null;
        this.movementDelta = { x: 0, y: 0 };
        
        return {
            success: true,
            graphics_request,
            state_change: {
                componentId: this.componentId,
                property: 'position',
                value: originalPosition,
                metadata: {
                    movementType: 'cancelled',
                    returnedToOriginal: true,
                    timestamp: Date.now()
                }
            }
        };
    }
    
    /**
     * Set Movement Constraints
     * Configure boundaries and snapping behavior
     */
    setMovementConstraints(constraints) {
        this.boundaries = constraints.boundaries || null;
        this.snapToGrid = constraints.snapToGrid !== false;
        this.gridSize = constraints.gridSize || 10;
        this.minimumMovementThreshold = constraints.threshold || 8;
        
        return {
            success: true,
            state_change: {
                componentId: this.componentId,
                property: 'movementConstraints',
                value: constraints,
                metadata: {
                    boundaries: this.boundaries,
                    snapToGrid: this.snapToGrid,
                    gridSize: this.gridSize,
                    threshold: this.minimumMovementThreshold
                }
            }
        };
    }
    
    // UTILITY METHODS
    
    /**
     * Check if movement is allowed in current mode
     */
    _isAllowedInCurrentMode() {
        return this.component.isDesignMode() && this.component.isMovable;
    }
    
    /**
     * Snap position to grid
     */
    _snapToGrid(position) {
        return {
            x: Math.round(position.x / this.gridSize) * this.gridSize,
            y: Math.round(position.y / this.gridSize) * this.gridSize
        };
    }
    
    /**
     * Apply boundary constraints to position
     */
    _applyBoundaries(position) {
        if (!this.boundaries) return position;
        
        return {
            x: Math.max(this.boundaries.left, Math.min(this.boundaries.right, position.x)),
            y: Math.max(this.boundaries.top, Math.min(this.boundaries.bottom, position.y))
        };
    }
    
    /**
     * Reset movement state without triggering movement
     */
    _resetMovementState() {
        this.startPosition = null;
        this.currentPosition = null;
        this.movementDelta = { x: 0, y: 0 };
        this.isMoving = false;
        this.component.isDragging = false;
        
        return {
            success: true,
            graphics_request: {
                type: 'movement_reset',
                componentId: this.componentId,
                styles: {
                    cursor: 'pointer',
                    userSelect: '',
                    pointerEvents: ''
                },
                classes: {
                    remove: ['movement-ready', 'moving', 'dragging']
                },
                attributes: {
                    'data-movement-state': 'idle'
                }
            }
        };
    }
    
    /**
     * Movement completion callback
     */
    _onMovementComplete() {
        // Notify Interface Handler of movement completion
        if (this.component.interfaceHandler) {
            this.component.interfaceHandler.onMovementComplete({
                componentId: this.componentId,
                finalPosition: this.currentPosition,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Get Current Movement State
     */
    getMovementState() {
        return {
            isMoving: this.isMoving,
            startPosition: this.startPosition,
            currentPosition: this.currentPosition,
            delta: this.movementDelta,
            threshold: this.minimumMovementThreshold,
            constraints: {
                boundaries: this.boundaries,
                snapToGrid: this.snapToGrid,
                gridSize: this.gridSize
            }
        };
    }
    
    /**
     * Get Visual Schema for Movement States
     */
    getMovementVisualSchema() {
        return {
            movementStates: {
                idle: {
                    cursor: 'pointer',
                    opacity: 1,
                    transform: 'none'
                },
                ready: {
                    cursor: 'grab',
                    userSelect: 'none'
                },
                moving: {
                    cursor: 'grabbing',
                    opacity: 0.9,
                    zIndex: 1000,
                    userSelect: 'none',
                    pointerEvents: 'none'
                },
                complete: {
                    cursor: 'pointer',
                    opacity: 1,
                    zIndex: 'auto'
                }
            },
            movementAnimations: {
                start: {
                    duration: 100,
                    easing: 'ease-out'
                },
                move: {
                    duration: 50,
                    easing: 'linear'
                },
                end: {
                    duration: 200,
                    easing: 'ease-out'
                },
                cancel: {
                    duration: 300,
                    easing: 'ease-in-out'
                }
            },
            thresholdIndicators: {
                belowThreshold: {
                    outline: '1px dashed rgba(52, 152, 219, 0.5)'
                },
                aboveThreshold: {
                    outline: '2px solid #e74c3c',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }
            }
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MovableBehavior;
} else if (typeof window !== 'undefined') {
    window.MovableBehavior = MovableBehavior;
}
