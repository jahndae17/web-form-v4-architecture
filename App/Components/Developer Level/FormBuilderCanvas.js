/**
 * FormBuilderCanvas.js - Graphics Handler Compliant Form Builder Canvas Container
 * 
 * ARCHITECTURE COMPLIANCE:
 * ✅ Extends BaseContainer for consistent reactive architecture
 * ✅ NO direct DOM manipulation - all visual operations through Graphics Handler
 * ✅ NO event listeners - behavior functions called by Event Handler
 * ✅ NO CSS files - visual specifications provided to Graphics Handler
 * ✅ Behavior composition pattern for modular functionality
 * ✅ Lock coordination through Event Handler
 * ✅ ChangeLog integration for state synchronization
 */

(function() {
    // Get BaseContainer reference for current environment
    let BaseContainer;
    if (typeof window !== 'undefined' && window.BaseContainer) {
        // Browser environment
        BaseContainer = window.BaseContainer;
    } else if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment
        BaseContainer = require('./base container.js');
    } else {
        throw new Error('BaseContainer not available in current environment');
    }

class FormBuilderCanvas extends BaseContainer {
    constructor(id, parent = null, options = {}) {
        // Call parent constructor with correct parameters
        super(id, parent, 'form-builder-canvas');
        
        // Override BaseContainer properties with FormBuilderCanvas specific ones
        this.allowedChildTypes = ['base-user-container', 'form-element', 'container'];
        this.allowedToolTypes = ['container', 'form', 'drawing'];
        this.maxChildren = options.maxChildren || 50;
        this.isResizable = options.isResizable !== undefined ? options.isResizable : true;
        this.isDraggable = options.isDraggable !== undefined ? options.isDraggable : false;
        
        // Canvas specific properties
        this.snapToGrid = options.snapToGrid !== undefined ? options.snapToGrid : true;
        this.gridSize = options.gridSize || { x: 20, y: 20 };
        this.showGrid = options.showGrid !== undefined ? options.showGrid : true;
        this.allowOverlap = options.allowOverlap !== undefined ? options.allowOverlap : false;
        this.autoLayout = options.autoLayout !== undefined ? options.autoLayout : false;
        
        // Drop zone configuration
        this.acceptDrops = true;
        this.validDropSources = options.validDropSources || ['tools-container'];
        this.dropValidation = options.dropValidation || 'permissive';
        
        // Visual configuration
        this.backgroundColor = options.backgroundColor || '#f8f9fa';
        this.borderStyle = options.borderStyle || '2px dashed #dee2e6';
        this.padding = options.padding || '20px';
        this.minHeight = options.minHeight || '400px';
        
        // Form Builder Canvas specific properties
        this.formElements = new Map(); // Track form elements by ID
        this.layoutManager = null; // Will be set up after attachment
        this.validationRules = new Map(); // Form validation rules
        this.formSchema = { version: '1.0', elements: [], metadata: {} };
        
        // Canvas state
        this.isGridVisible = this.showGrid;
        this.snapEnabled = this.snapToGrid;
        this.selectedElements = new Set();
        this.clipboardData = null;
        
        // Drop zone state
        this.isDropTarget = true;
        this.dropFeedback = {
            showPreview: true,
            highlightValidZones: true,
            showSnapGuides: true
        };
        
        // Form builder operations
        this.operationHistory = [];
        this.currentOperation = null;
        this.maxHistorySize = 50;
        
        console.log(`📋 FormBuilderCanvas created: ${this.containerId}`);
    }

    // ========================
    // CONTAINER LIFECYCLE METHODS
    // ========================
    
    async initializeContainer() {
        try {
            // Initialize form builder specific features (BaseContainer has no initializeContainer method)
            this.setupLayoutManager();
            this.setupDropZoneHandling();
            this.setupFormValidation();
            
            // Configure visual schema for Graphics Handler
            const visualSchema = this.getCanvasVisualSchema();
            
            return {
                success: true,
                visualSchema: visualSchema,
                changeLog: {
                    type: 'form_builder_canvas_initialized',
                    containerId: this.containerId,
                    gridEnabled: this.isGridVisible,
                    snapEnabled: this.snapEnabled,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                changeLog: {
                    type: 'form_builder_canvas_init_failed',
                    containerId: this.containerId,
                    error: error.message,
                    timestamp: Date.now()
                }
            };
        }
    }
    
    setupLayoutManager() {
        this.layoutManager = {
            mode: this.autoLayout ? 'auto' : 'manual',
            flowDirection: 'vertical',
            spacing: { horizontal: 10, vertical: 10 },
            alignment: 'start',
            wrapping: true
        };
    }
    
    setupDropZoneHandling() {
        // Configure as a valid drop target for drag and drop behavior
        this.dropZoneConfig = {
            accepts: this.allowedToolTypes,
            validation: this.dropValidation,
            feedback: this.dropFeedback,
            constraints: {
                snapToGrid: this.snapEnabled,
                gridSize: this.gridSize,
                allowOverlap: this.allowOverlap
            }
        };
    }
    
    setupFormValidation() {
        // Initialize form validation system
        this.validationRules.set('required', (element) => {
            return element.value && element.value.trim().length > 0;
        });
        
        this.validationRules.set('email', (element) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return !element.value || emailRegex.test(element.value);
        });
        
        this.validationRules.set('minLength', (element, minLength) => {
            return !element.value || element.value.length >= minLength;
        });
    }

    // ========================
    // VISUAL SCHEMA FOR GRAPHICS HANDLER
    // ========================
    
    getCanvasVisualSchema() {
        return {
            container: {
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: this.backgroundColor,
                border: this.borderStyle,
                borderRadius: '8px',
                padding: this.padding,
                minHeight: this.minHeight,
                position: 'relative',
                overflow: 'auto'
            },
            grid: this.isGridVisible ? {
                backgroundImage: `
                    linear-gradient(to right, #e9ecef 1px, transparent 1px),
                    linear-gradient(to bottom, #e9ecef 1px, transparent 1px)
                `,
                backgroundSize: `${this.gridSize.x}px ${this.gridSize.y}px`,
                backgroundPosition: '0 0'
            } : {},
            dropZone: {
                default: {
                    transition: 'all 0.2s ease-in-out'
                },
                dragOver: {
                    borderColor: '#007acc',
                    backgroundColor: 'rgba(0, 122, 204, 0.05)',
                    boxShadow: '0 0 16px rgba(0, 122, 204, 0.2)'
                },
                validDrop: {
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.05)',
                    boxShadow: '0 0 16px rgba(40, 167, 69, 0.3)'
                },
                invalidDrop: {
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.05)',
                    boxShadow: '0 0 16px rgba(220, 53, 69, 0.3)'
                }
            },
            placeholder: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6c757d',
                textAlign: 'center',
                minHeight: '300px',
                padding: '40px 20px'
            },
            selectedElement: {
                outline: '2px solid #007acc',
                outlineOffset: '2px',
                position: 'relative'
            },
            snapGuide: {
                position: 'absolute',
                backgroundColor: '#007acc',
                zIndex: 999,
                pointerEvents: 'none'
            }
        };
    }

    // ========================
    // FORM ELEMENT MANAGEMENT
    // ========================
    
    addFormElement(elementData, position = null) {
        try {
            // Validate element data
            if (!elementData || !elementData.type || !elementData.id) {
                throw new Error('Invalid form element data');
            }
            
            // Check if element type is allowed
            if (!this.allowedChildTypes.includes(elementData.type)) {
                throw new Error(`Element type '${elementData.type}' not allowed in this canvas`);
            }
            
            // Calculate position (snap to grid if enabled)
            const finalPosition = this.calculateElementPosition(position);
            
            // Create form element entry
            const formElement = {
                id: elementData.id,
                type: elementData.type,
                position: finalPosition,
                size: elementData.size || { width: 'auto', height: 'auto' },
                properties: elementData.properties || {},
                validation: elementData.validation || {},
                metadata: {
                    created: Date.now(),
                    modified: Date.now(),
                    version: 1
                }
            };
            
            // Add to form elements collection
            this.formElements.set(elementData.id, formElement);
            
            // Update form schema
            this.updateFormSchema();
            
            // Record operation in history
            this.recordOperation({
                type: 'element_added',
                elementId: elementData.id,
                elementData: formElement,
                timestamp: Date.now()
            });
            
            return {
                success: true,
                element: formElement,
                graphics_request: {
                    type: 'comprehensive_update',
                    componentId: this.containerId,
                    styles: this.getCanvasVisualSchema().container,
                    children: [{
                        id: elementData.id,
                        type: 'form_element',
                        position: finalPosition,
                        content: this.generateElementHTML(formElement)
                    }]
                },
                changeLog: {
                    type: 'form_element_added',
                    canvasId: this.containerId,
                    elementId: elementData.id,
                    position: finalPosition,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                changeLog: {
                    type: 'form_element_add_failed',
                    canvasId: this.containerId,
                    error: error.message,
                    timestamp: Date.now()
                }
            };
        }
    }
    
    removeFormElement(elementId) {
        if (!this.formElements.has(elementId)) {
            return {
                success: false,
                error: 'Element not found'
            };
        }
        
        const element = this.formElements.get(elementId);
        this.formElements.delete(elementId);
        
        // Update form schema
        this.updateFormSchema();
        
        // Record operation in history
        this.recordOperation({
            type: 'element_removed',
            elementId: elementId,
            elementData: element,
            timestamp: Date.now()
        });
        
        return {
            success: true,
            graphics_request: {
                type: 'remove_component',
                componentId: elementId
            },
            changeLog: {
                type: 'form_element_removed',
                canvasId: this.containerId,
                elementId: elementId,
                timestamp: Date.now()
            }
        };
    }
    
    moveFormElement(elementId, newPosition) {
        if (!this.formElements.has(elementId)) {
            return {
                success: false,
                error: 'Element not found'
            };
        }
        
        const element = this.formElements.get(elementId);
        const oldPosition = element.position;
        
        // Apply snap to grid if enabled
        const finalPosition = this.calculateElementPosition(newPosition);
        
        // Update element position
        element.position = finalPosition;
        element.metadata.modified = Date.now();
        
        // Record operation in history
        this.recordOperation({
            type: 'element_moved',
            elementId: elementId,
            oldPosition: oldPosition,
            newPosition: finalPosition,
            timestamp: Date.now()
        });
        
        return {
            success: true,
            graphics_request: {
                type: 'position_update',
                componentId: elementId,
                position: finalPosition,
                animation: { duration: 200, easing: 'ease-out' }
            },
            changeLog: {
                type: 'form_element_moved',
                canvasId: this.containerId,
                elementId: elementId,
                oldPosition: oldPosition,
                newPosition: finalPosition,
                timestamp: Date.now()
            }
        };
    }

    // ========================
    // UTILITY METHODS
    // ========================
    
    calculateElementPosition(position) {
        if (!position) {
            // Auto-position: find next available spot
            return this.findNextAvailablePosition();
        }
        
        if (this.snapEnabled) {
            // Snap to grid
            return {
                x: Math.round(position.x / this.gridSize.x) * this.gridSize.x,
                y: Math.round(position.y / this.gridSize.y) * this.gridSize.y
            };
        }
        
        return position;
    }
    
    findNextAvailablePosition() {
        const occupiedPositions = Array.from(this.formElements.values())
            .map(element => element.position);
        
        // Simple algorithm: start at top-left, move right then down
        let x = this.gridSize.x;
        let y = this.gridSize.y;
        
        while (this.isPositionOccupied({ x, y }, occupiedPositions)) {
            x += this.gridSize.x * 3; // Space elements out
            if (x > 400) { // Wrap to next row
                x = this.gridSize.x;
                y += this.gridSize.y * 3;
            }
        }
        
        return { x, y };
    }
    
    isPositionOccupied(position, occupiedPositions) {
        return occupiedPositions.some(occupied => 
            Math.abs(occupied.x - position.x) < this.gridSize.x &&
            Math.abs(occupied.y - position.y) < this.gridSize.y
        );
    }
    
    generateElementHTML(formElement) {
        // Generate HTML for form element based on type
        switch (formElement.type) {
            case 'base-user-container':
                return `
                    <div class="form-element base-user-container" data-element-id="${formElement.id}">
                        <div class="element-header">
                            <span class="element-icon">📦</span>
                            <span class="element-title">User Container</span>
                        </div>
                        <div class="element-content">
                            ${formElement.properties.placeholder || 'Drag form elements here...'}
                        </div>
                    </div>
                `;
            default:
                return `
                    <div class="form-element" data-element-id="${formElement.id}">
                        <div class="element-header">
                            <span class="element-title">${formElement.type}</span>
                        </div>
                        <div class="element-content">Element content</div>
                    </div>
                `;
        }
    }
    
    updateFormSchema() {
        this.formSchema.elements = Array.from(this.formElements.values());
        this.formSchema.metadata.lastModified = Date.now();
        this.formSchema.metadata.elementCount = this.formElements.size;
    }
    
    recordOperation(operation) {
        this.operationHistory.push(operation);
        
        // Limit history size
        if (this.operationHistory.length > this.maxHistorySize) {
            this.operationHistory.shift();
        }
    }

    // ========================
    // DROP ZONE BEHAVIOR (Called by DragAndDropBehavior)
    // ========================
    
    canAcceptDrop(draggedItem, dropContext) {
        // Check if item type is allowed
        if (!this.allowedToolTypes.includes(draggedItem.type)) {
            return {
                allowed: false,
                reason: 'tool_type_not_allowed',
                message: `${draggedItem.type} tools cannot be dropped on this canvas`
            };
        }
        
        // Check position constraints
        if (dropContext.position && !this.allowOverlap) {
            const wouldOverlap = this.checkForOverlap(draggedItem, dropContext.position);
            if (wouldOverlap) {
                return {
                    allowed: false,
                    reason: 'position_occupied',
                    message: 'This position is already occupied'
                };
            }
        }
        
        return {
            allowed: true,
            snapPosition: this.calculateElementPosition(dropContext.position)
        };
    }
    
    handleDrop(draggedItem, dropContext) {
        // Validate drop
        const validation = this.canAcceptDrop(draggedItem, dropContext);
        if (!validation.allowed) {
            return {
                success: false,
                reason: validation.reason,
                message: validation.message
            };
        }
        
        // Create form element from dragged tool
        const elementData = {
            id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: draggedItem.type,
            size: draggedItem.size || { width: 'auto', height: 'auto' },
            properties: { ...draggedItem.config }
        };
        
        // Add element to canvas
        return this.addFormElement(elementData, validation.snapPosition);
    }
    
    checkForOverlap(item, position) {
        // Simple overlap detection
        const itemBounds = {
            left: position.x,
            top: position.y,
            right: position.x + (item.size?.width || 100),
            bottom: position.y + (item.size?.height || 50)
        };
        
        return Array.from(this.formElements.values()).some(element => {
            const elementBounds = {
                left: element.position.x,
                top: element.position.y,
                right: element.position.x + (element.size?.width || 100),
                bottom: element.position.y + (element.size?.height || 50)
            };
            
            return !(itemBounds.right < elementBounds.left ||
                     itemBounds.left > elementBounds.right ||
                     itemBounds.bottom < elementBounds.top ||
                     itemBounds.top > elementBounds.bottom);
        });
    }

    // ========================
    // PUBLIC API METHODS
    // ========================
    
    getFormSchema() {
        return {
            success: true,
            schema: { ...this.formSchema }
        };
    }
    
    clearCanvas() {
        this.formElements.clear();
        this.updateFormSchema();
        
        this.recordOperation({
            type: 'canvas_cleared',
            timestamp: Date.now()
        });
        
        return {
            success: true,
            graphics_request: {
                type: 'clear_children',
                componentId: this.containerId
            },
            changeLog: {
                type: 'canvas_cleared',
                canvasId: this.containerId,
                timestamp: Date.now()
            }
        };
    }
    
    toggleGrid() {
        this.isGridVisible = !this.isGridVisible;
        
        return {
            success: true,
            gridVisible: this.isGridVisible,
            graphics_request: {
                type: 'style_update',
                componentId: this.containerId,
                styles: this.getCanvasVisualSchema().grid
            }
        };
    }
    
    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        
        return {
            success: true,
            snapEnabled: this.snapEnabled
        };
    }

    // ========================
    // CONTAINER STATE METHODS
    // ========================
    
    getState() {
        return {
            // Base container properties
            containerId: this.containerId,
            name: this.name,
            type: this.type,
            isRoot: this.isRoot,
            position: this.position,
            dimensions: this.dimensions,
            visibility: this.visibility,
            
            // Canvas specific properties
            formElements: Array.from(this.formElements.entries()),
            formSchema: this.formSchema,
            gridVisible: this.isGridVisible,
            snapEnabled: this.snapEnabled,
            operationHistory: this.operationHistory.slice(-10) // Last 10 operations
        };
    }
    
    reset() {
        // Reset BaseContainer properties if needed
        this.children = [];
        this.isActive = false;
        this.isLocked = false;
        
        // Reset canvas-specific properties
        this.formElements.clear();
        this.selectedElements.clear();
        this.operationHistory = [];
        this.updateFormSchema();
        
        return {
            success: true,
            changeLog: {
                type: 'form_builder_canvas_reset',
                canvasId: this.containerId,
                timestamp: Date.now()
            }
        };
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    const BaseContainer = require('./base container.js');
    module.exports = FormBuilderCanvas;
} else {
    // Browser environment
    window.FormBuilderCanvas = FormBuilderCanvas;
}

})(); // End of IIFE
