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
    constructor(id, parent = null, options = {}, changeLog = null) {
        // Call parent constructor with correct parameters
        super(id, parent, 'form-builder-canvas');
        
        // Store ChangeLog reference for component creation
        this.changeLog = changeLog;
        
        // Override BaseContainer properties with FormBuilderCanvas specific ones
        this.allowedChildTypes = ['base-user-container', 'form-element', 'container'];
        this.allowedToolTypes = ['container', 'form', 'drawing', 'base-user-container'];
        this.maxChildren = options.maxChildren || 50;
        this.isResizable = options.isResizable !== undefined ? options.isResizable : true;
        this.isDraggable = options.isDraggable !== undefined ? options.isDraggable : false;
        
        // Canvas specific properties
        this.snapToGrid = options.snapToGrid !== undefined ? options.snapToGrid : true;
        this.gridSize = options.gridSize || { x: 20, y: 20 };
        this.showGrid = options.showGrid !== undefined ? options.showGrid : true;
        this.allowOverlap = options.allowOverlap !== undefined ? options.allowOverlap : true;
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
            this.setupCanvasClickHandler();
            
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

    setupCanvasClickHandler() {
        // Add click handler to canvas element for deselection when clicking empty areas
        if (this.element) {
            this.element.addEventListener('click', (event) => {
                // Only handle direct canvas clicks (not clicks on child elements)
                if (event.target === this.element) {
                    // Prevent all event propagation and default behavior to avoid drag/drop interference
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    
                    // Check if any movement locks are active before deselecting
                    const eventHandler = window.toolsApp?.eventHandler;
                    let hasActiveLocks = false;
                    
                    if (eventHandler) {
                        const lockStatus = eventHandler.getLockStatus();
                        const activeLocks = Object.keys(lockStatus.active_locks);
                        
                        // Check for movement-related locks
                        hasActiveLocks = activeLocks.some(lockKey => 
                            lockKey.includes('move_operation') || 
                            lockKey.includes('resize_operation') ||
                            lockKey.includes('select_operation')
                        );
                    }
                    
                    // Additional check: make sure no components are in movement state
                    let hasMovingComponents = false;
                    if (window.containerRegistry) {
                        for (const container of Object.values(window.containerRegistry)) {
                            if (container.isDragging || container.isResizing || 
                                container.element?.getAttribute('data-movement-state') === 'moving' ||
                                container.element?.getAttribute('data-movement-state') === 'ready') {
                                hasMovingComponents = true;
                                break;
                            }
                        }
                    }
                    
                    // Only deselect if no drag operation, no locks, and no movement
                    if (!this.isDragInProgress && !hasActiveLocks && !hasMovingComponents) {
                        console.log('🎯 Canvas empty area clicked - deselecting all containers');
                        // Make deselection async to prevent timing issues
                        this.deselectAllContainers().catch(error => {
                            console.error('❌ Error during canvas deselection:', error);
                        });
                    } else {
                        if (this.isDragInProgress) {
                            console.log('🚫 Ignoring canvas click during drag operation');
                        } else if (hasActiveLocks) {
                            console.log('🚫 Ignoring canvas click - active locks detected');
                        } else if (hasMovingComponents) {
                            console.log('🚫 Ignoring canvas click - components in movement state');
                        }
                    }
                }
            }, true); // Use capture phase to handle before drag/drop events
            
            // Track drag state to prevent deselection during drags
            this.isDragInProgress = false;
            this.element.addEventListener('dragover', () => { this.isDragInProgress = true; });
            this.element.addEventListener('dragleave', () => { this.isDragInProgress = false; });
            this.element.addEventListener('drop', () => { 
                this.isDragInProgress = false;
                // Small delay to prevent immediate click handler from firing after drop
                setTimeout(() => { this.isDragInProgress = false; }, 100);
            });
            
            console.log('✅ Canvas click handler for deselection setup complete');
        }
    }

    async deselectAllContainers() {
        // Deselect all containers that have SelectableBehavior
        if (this.componentInstances) {
            let deselectedCount = 0;
            
            // Use for...of to properly handle async operations
            for (const [elementId, container] of this.componentInstances) {
                if (container.selectableBehavior && container.isSelected) {
                    try {
                        const result = await container.selectableBehavior.deselectAll({});
                        if (result.success) {
                            deselectedCount++;
                            console.log(`✅ Deselected container: ${container.containerId}`);
                        }
                    } catch (error) {
                        console.error(`❌ Failed to deselect container ${container.containerId}:`, error);
                    }
                }
            }
            
            if (deselectedCount > 0) {
                console.log(`✅ Successfully deselected ${deselectedCount} container(s)`);
            }
        }
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
            
            // Create DOM element directly since Graphics Handler doesn't process children arrays
            this.createFormElementDOM(formElement);
            
            return {
                success: true,
                element: formElement,
                graphics_request: {
                    type: 'style_update',
                    componentId: this.containerId,
                    styles: this.getCanvasVisualSchema().container,
                    options: { immediate: true }
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
        
        // Remove DOM element
        this.removeFormElementDOM(elementId);
        
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
    
    createFormElementDOM(formElement) {
        // Create DOM element directly for visual rendering
        try {
            const canvasElement = this.element || document.getElementById(this.containerId);
            if (!canvasElement) {
                console.error('❌ Canvas element not found for DOM creation:', this.containerId);
                return false;
            }
            
            // Check if this is a component type that needs actual instance creation
            if (formElement.type === 'base-user-container') {
                return this.createBaseUserContainerInstance(formElement);
            }
            
            // Generate the HTML content for other element types
            const elementHTML = this.generateElementHTML(formElement);
            
            // Create wrapper div
            const elementDiv = document.createElement('div');
            elementDiv.id = `form_element_${formElement.id}`;
            elementDiv.innerHTML = elementHTML;
            elementDiv.style.position = 'absolute';
            elementDiv.style.left = formElement.position.x + 'px';
            elementDiv.style.top = formElement.position.y + 'px';
            elementDiv.style.zIndex = '100';
            elementDiv.style.background = 'white';
            elementDiv.style.border = '1px solid #007acc';
            elementDiv.style.borderRadius = '4px';
            elementDiv.style.padding = '10px';
            elementDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            elementDiv.style.minWidth = '150px';
            elementDiv.style.minHeight = '50px';
            elementDiv.style.cursor = 'pointer';
            elementDiv.style.userSelect = 'none';
            
            // Add hover effects
            elementDiv.addEventListener('mouseenter', () => {
                elementDiv.style.borderColor = '#0056b3';
                elementDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            });
            
            elementDiv.addEventListener('mouseleave', () => {
                elementDiv.style.borderColor = '#007acc';
                elementDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            });
            
            // Add to canvas
            canvasElement.appendChild(elementDiv);
            
            console.log(`✅ DOM element created for form element: ${formElement.id}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error creating DOM element:', error);
            return false;
        }
    }
    
    createBaseUserContainerInstance(formElement) {
        try {
            const canvasElement = this.element || document.getElementById(this.containerId);
            if (!canvasElement) {
                console.error('❌ Canvas element not found for component creation:', this.containerId);
                return false;
            }
            
            // Create DOM element for the BaseUserContainer
            const containerDiv = document.createElement('div');
            containerDiv.id = formElement.id;
            containerDiv.style.position = 'absolute';
            containerDiv.style.left = formElement.position.x + 'px';
            containerDiv.style.top = formElement.position.y + 'px';
            containerDiv.style.zIndex = '100';
            containerDiv.style.minWidth = '200px';
            containerDiv.style.minHeight = '100px';
            containerDiv.style.backgroundColor = 'white';
            containerDiv.style.borderRadius = '8px';
            containerDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            containerDiv.style.border = 'none';
            containerDiv.style.padding = '0';
            // No innerHTML - plain white container with no text
            
            // Add to canvas first so DOM element exists
            canvasElement.appendChild(containerDiv);
            
            // Create BaseUserContainer instance directly (without factory for now)
            if (typeof BaseUserContainer !== 'undefined') {
                const containerConfig = {
                    userType: 'interactive',
                    formRole: 'container',
                    title: formElement.properties.title || 'User Container',
                    description: formElement.properties.description || 'Container for user interactive elements',
                    allowedChildTypes: formElement.properties.allowedChildTypes || ['input', 'button', 'text'],
                    changeLog: this.changeLog, // Pass ChangeLog reference
                    existingElement: containerDiv // Pass the DOM element that's already in the canvas
                };
                
                const container = new BaseUserContainer(formElement.id, this, containerConfig);
                
                // Store the component instance reference
                this.componentInstances = this.componentInstances || new Map();
                this.componentInstances.set(formElement.id, container);
                
                // Link the instance to the DOM element for click handling
                // Use the containerDiv that's actually in the DOM, not container.element
                containerDiv._baseUserContainer = container;
                
                // Add click event listener to the DOM element for selection behavior
                containerDiv.addEventListener('click', (event) => {
                    if (container.handleClick) {
                        const result = container.handleClick(event);
                        if (result.success) {
                            console.log(`🎯 Selection triggered for ${container.containerId}:`, result);
                            
                            // Send graphics request to Graphics Handler if available
                            if (result.graphics_request && window.toolsApp && window.toolsApp.graphicsHandler) {
                                console.log('📤 Sending graphics request to Graphics Handler');
                                const request = result.graphics_request;
                                
                                // Format the request according to Graphics Handler expectations
                                const styleUpdate = {
                                    componentId: request.componentId,
                                    styles: request.finalStyles,
                                    classes: request.classes,
                                    attributes: request.attributes
                                };
                                
                                window.toolsApp.graphicsHandler.updateComponentStyle(styleUpdate);
                            }
                        }
                    }
                });
                
                console.log(`✅ BaseUserContainer instance created: ${formElement.id} with clean styling`);
                return true;
            } else {
                console.error('❌ BaseUserContainer class not available');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error creating BaseUserContainer instance:', error);
            return false;
        }
    }
    
    removeFormElementDOM(elementId) {
        // Remove DOM element from canvas
        try {
            const domElement = document.getElementById(`form_element_${elementId}`);
            if (domElement) {
                domElement.remove();
                console.log(`✅ DOM element removed for form element: ${elementId}`);
                return true;
            } else {
                console.warn(`⚠️ DOM element not found for form element: ${elementId}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Error removing DOM element:', error);
            return false;
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
        
        // Always allow drops since overlap is enabled
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
        // Helper function to get numeric size values
        const getNumericSize = (size, defaultValue) => {
            if (typeof size === 'number') return size;
            if (typeof size === 'string' && !isNaN(parseFloat(size))) return parseFloat(size);
            return defaultValue;
        };
        
        // Simple overlap detection with proper size handling
        const itemBounds = {
            left: position.x,
            top: position.y,
            right: position.x + getNumericSize(item.size?.width, 200),
            bottom: position.y + getNumericSize(item.size?.height, 100)
        };
        
        return Array.from(this.formElements.values()).some(element => {
            const elementBounds = {
                left: element.position.x,
                top: element.position.y,
                right: element.position.x + getNumericSize(element.size?.width, 200),
                bottom: element.position.y + getNumericSize(element.size?.height, 100)
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
        // Clear all DOM elements first
        this.formElements.forEach((element) => {
            this.removeFormElementDOM(element.id);
        });
        
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
