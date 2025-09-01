/**
 * Base User Container - Core Component
 * 
 * Foundational component for all user-interactive form elements.
 * Provides context-aware behavior switching between design-time and runtime modes.
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - Data & Structure ONLY
 * - NO visual operations (Graphics Handler exclusive)
 * - NO event listeners (Event Handler exclusive)
 * - Communicates with Interface Handler only
 */

class BaseUserContainer {
    constructor(containerId, parent, options = {}) {
        // Core Properties
        this.containerId = containerId;
        this.parent = parent;
        this.userType = options.userType || 'interactive';     // vs 'display-only'
        this.formRole = options.formRole || 'container';       // vs 'input', 'layout', 'validation'
        
        // Global mode detection - REMOVED individual inputMode property
        // Mode is now managed globally through ChangeLog
        this.changeLog = options.changeLog || null;           // Reference to global ChangeLog
        
        // Behavior States - Context Dependent
        this.isSelectable = true;
        this.isResizeable = true;
        this.isMovable = true;
        this.isNestable = true;
        
        // User Interaction Properties
        this.acceptsInput = options.acceptsInput || false;
        this.validationRequired = options.validationRequired || false;
        this.accessibilityRole = options.accessibilityRole || 'container';
        this.tabIndex = options.tabIndex || -1;
        
        // Form Integration
        this.formValue = null;
        this.formName = options.formName || null;
        this.isRequired = options.isRequired || false;
        this.validationRules = options.validationRules || [];
        
        // Hierarchy Management
        this.children = [];
        this.depth = parent ? parent.depth + 1 : 0;
        this.index = 0;
        this.canBeNested = options.canBeNested !== false;
        
        // Component State
        this.isInitialized = false;
        this.isSelected = false;
        this.isHovered = false;
        this.isDragging = false;
        this.isResizing = false;
        
        // Handler References (set by system)
        this.interfaceHandler = null;
        // this.changeLog already set from options above - don't override it
        
        // Behavior Instances
        this.selectableBehavior = null;
        this.movableBehavior = null;
        this.resizeableBehavior = null;
        
        // DOM Element (structure only)
        this.element = null;
        
        // Initialize component
        this.init(options);
    }
    
    /**
     * Initialize Component
     * Creates DOM structure and stores visual specifications
     */
    init(options) {
        // Create DOM structure
        this.createElement(options);
        
        // Store visual specifications (for Graphics Handler)
        this._storeVisualSpecs();
        
        // Subscribe to context changes (when ChangeLog available)
        this._setupContextSubscriptions();
        
        // Initialize behavior classes
        this._initializeBehaviors();
        
        this.isInitialized = true;
    }
    
    /**
     * Initialize Behavior Classes
     * Creates and attaches behavior instances to this container
     */
    _initializeBehaviors() {
        // Initialize SelectableBehavior if available
        if (typeof SelectableBehavior !== 'undefined' && this.isSelectable) {
            try {
                this.selectableBehavior = new SelectableBehavior(this);
                
                // Add click event listener to trigger selection behavior
                if (this.element) {
                    this.element.addEventListener('click', (event) => {
                        const result = this.handleClick(event);
                        if (result.success) {
                            console.log(`🎯 Selection triggered for ${this.containerId}:`, result);
                        }
                    });
                }
                
                console.log(`🎯 SelectableBehavior initialized for ${this.containerId}`);
            } catch (error) {
                console.warn(`⚠️ Failed to initialize SelectableBehavior for ${this.containerId}:`, error);
            }
        }
        
        // Initialize MovableBehavior if available (higher priority than SelectableBehavior)
        if (typeof MovableBehavior !== 'undefined' && this.isMovable) {
            try {
                this.movableBehavior = new MovableBehavior(this);
                
                // Add mouse event listeners for movement behavior
                if (this.element) {
                    let mouseDownPosition = null;
                    let isTracking = false;
                    
                    this.element.addEventListener('mousedown', (event) => {
                        if (!this.isDesignMode()) return;
                        
                        mouseDownPosition = { x: event.clientX, y: event.clientY };
                        isTracking = true;
                        
                        // Start movement tracking (synchronous now)
                        const result = this.movableBehavior.startMove({
                            position: mouseDownPosition
                        });
                        
                        if (result.success) {
                            console.log(`🔴 Movement tracking started for ${this.containerId}`);
                            
                            // Send graphics request to Graphics Handler if available
                            if (result.graphics_request && window.toolsApp && window.toolsApp.graphicsHandler) {
                                console.log('📤 Sending movement start graphics request to Graphics Handler');
                                this.changeLog.updateContext('current_context_meta.style_updates', result.graphics_request);
                            }
                        } else {
                            console.log(`🚫 Movement tracking blocked for ${this.containerId}: ${result.error}`);
                            isTracking = false; // Reset tracking if lock denied
                        }
                        
                        event.preventDefault(); // Prevent text selection during potential drag
                    });
                    
                    // Global mousemove listener for movement
                    document.addEventListener('mousemove', (event) => {
                        if (!isTracking || !mouseDownPosition) return;
                        
                        const currentPosition = { x: event.clientX, y: event.clientY };
                        const result = this.movableBehavior.performMove({
                            position: currentPosition
                        });
                        
                        if (result.success && result.graphics_request) {
                            console.log(`🔵 Movement performed for ${this.containerId}:`, result);
                            
                            // Send graphics request to Graphics Handler for real-time movement
                            if (window.toolsApp && window.toolsApp.graphicsHandler) {
                                console.log('📤 Sending movement graphics request to Graphics Handler');
                                this.changeLog.updateContext('current_context_meta.style_updates', result.graphics_request);
                            }
                        }
                    });
                    
                    // Global mouseup listener for movement
                    document.addEventListener('mouseup', (event) => {
                        if (!isTracking) return;
                        
                        isTracking = false;
                        const finalPosition = { x: event.clientX, y: event.clientY };
                        
                        const result = this.movableBehavior.endMove({
                            finalPosition: finalPosition
                        });
                        
                        if (result.success) {
                            console.log(`🟢 Movement ended for ${this.containerId}:`, result);
                            
                            // Send graphics request to Graphics Handler for movement completion
                            if (result.graphics_request && window.toolsApp && window.toolsApp.graphicsHandler) {
                                console.log('📤 Sending movement end graphics request to Graphics Handler');
                                this.changeLog.updateContext('current_context_meta.style_updates', result.graphics_request);
                            }
                        }
                        
                        mouseDownPosition = null;
                    });
                }
                
                console.log(`🎯 MovableBehavior initialized for ${this.containerId}`);
            } catch (error) {
                console.warn(`⚠️ Failed to initialize MovableBehavior for ${this.containerId}:`, error);
            }
        }
        
        // Initialize ResizeableBehavior if available and enabled
        if (typeof ResizeableBehavior !== 'undefined' && this.isResizeable) {
            try {
                this.resizeableBehavior = new ResizeableBehavior(this);
                console.log(`🎯 ResizeableBehavior initialized for ${this.containerId}`);
            } catch (error) {
                console.warn(`⚠️ Failed to initialize ResizeableBehavior for ${this.containerId}:`, error);
            }
        }
        
        // Register this container globally for Graphics Handler access
        this.registerGlobally();
    }
    
    /**
     * Register container in global registry for Graphics Handler access
     */
    registerGlobally() {
        if (typeof window !== 'undefined') {
            // Create global container registry if it doesn't exist
            if (!window.containerRegistry) {
                window.containerRegistry = {};
            }
            
            // Register this container
            window.containerRegistry[this.containerId] = this;
            console.log(`📝 Container ${this.containerId} registered globally`);
            
            // Also attach to DOM element for direct access
            if (this.element) {
                this.element._containerInstance = this;
                console.log(`📝 Container ${this.containerId} attached to DOM element`);
            }
        }
    }
    
    // ========================
    // GLOBAL MODE DETECTION METHODS
    // ========================
    
    /**
     * Get current global application mode
     * @returns {string} Current mode ('design' or 'preview')
     */
    getCurrentMode() {
        if (this.changeLog) {
            return this.changeLog.getValue('application.mode', 'design');
        }
        
        // Fallback: try to get from parent chain
        let current = this.parent;
        while (current && !current.changeLog) {
            current = current.parent;
        }
        
        if (current && current.changeLog) {
            return current.changeLog.getValue('application.mode', 'design');
        }
        
        // Final fallback
        return 'design';
    }
    
    /**
     * Check if currently in design mode
     * @returns {boolean}
     */
    isDesignMode() {
        return this.getCurrentMode() === 'design';
    }
    
    /**
     * Check if currently in preview mode
     * @returns {boolean}
     */
    isPreviewMode() {
        return this.getCurrentMode() === 'preview';
    }
    
    /**
     * Get mode for backwards compatibility (replaces this.inputMode)
     * @returns {string}
     */
    get inputMode() {
        return this.getCurrentMode();
    }
    
    /**
     * Create DOM Element Structure
     * ONLY creates structure, NO styling or visual operations
     */
    createElement(options) {
        // Check if an existing DOM element should be used
        if (options.existingElement) {
            this.element = options.existingElement;
        } else {
            this.element = document.createElement('div');
        }
        
        // Ensure the element has the correct id and attributes
        this.element.id = this.containerId;
        this.element.setAttribute('data-component-type', 'BaseUserContainer');
        this.element.setAttribute('data-user-type', this.userType);
        this.element.setAttribute('data-form-role', this.formRole);
        this.element.setAttribute('role', this.accessibilityRole);
        this.element.setAttribute('tabindex', this.tabIndex);
        
        // Add any required child structure
        if (options.createInnerStructure) {
            this._createInnerStructure(options);
        }
    }
    
    /**
     * Create Inner DOM Structure
     * Override in derived components for specific structure needs
     */
    _createInnerStructure(options) {
        // Base implementation - override in derived classes
        const contentArea = document.createElement('div');
        contentArea.className = 'content-area';
        contentArea.setAttribute('data-role', 'content');
        this.element.appendChild(contentArea);
    }
    
    /**
     * Store Visual Specifications
     * ALL visual requirements declared here for Graphics Handler
     */
    _storeVisualSpecs() {
        this.visualSpecs = {
            baseStyles: {
                // Context-dependent styling
                design: {
                    border: '1px solid transparent',
                    borderRadius: '4px',
                    minHeight: '50px',
                    minWidth: '100px',
                    cursor: 'move',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    position: 'relative',
                    padding: '8px',
                    margin: '4px',
                    boxSizing: 'border-box'
                },
                preview: {
                    border: '1px solid #ecf0f1',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    cursor: 'default',
                    position: 'relative',
                    padding: '8px',
                    margin: '2px',
                    boxSizing: 'border-box'
                },
                runtime: {
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    cursor: 'text',
                    position: 'relative',
                    padding: '8px',
                    margin: '2px',
                    boxSizing: 'border-box'
                }
            },
            states: {
                selected: {
                    border: '2px solid #3498db',
                    boxShadow: '0 0 10px rgba(52, 152, 219, 0.3)',
                    zIndex: 100
                },
                hovered: {
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderColor: '#2980b9'
                },
                dragging: {
                    opacity: 0.7,
                    zIndex: 1000,
                    transform: 'rotate(2deg)',
                    cursor: 'grabbing'
                },
                resizing: {
                    outline: '2px dashed #f39c12',
                    cursor: 'nw-resize'
                },
                focused: {
                    outline: '2px solid #3498db',
                    outlineOffset: '2px'
                },
                error: {
                    border: '2px solid #e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)'
                },
                valid: {
                    border: '2px solid #27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)'
                }
            },
            animations: {
                modeTransition: {
                    duration: 300,
                    easing: 'ease-in-out',
                    properties: ['border', 'background-color', 'cursor', 'padding', 'margin']
                },
                selection: {
                    duration: 200,
                    easing: 'ease-out',
                    properties: ['border', 'box-shadow', 'z-index']
                },
                hover: {
                    duration: 150,
                    easing: 'ease-in-out',
                    properties: ['background-color', 'border-color']
                },
                focus: {
                    duration: 200,
                    easing: 'ease-out',
                    properties: ['outline']
                },
                validation: {
                    duration: 250,
                    easing: 'ease-in-out',
                    properties: ['border', 'background-color']
                }
            },
            responsive: {
                breakpoints: {
                    mobile: { maxWidth: '768px' },
                    tablet: { maxWidth: '1024px' },
                    desktop: { minWidth: '1025px' }
                },
                adaptiveStyles: {
                    mobile: {
                        minWidth: '90%',
                        padding: '6px',
                        margin: '2px'
                    },
                    tablet: {
                        minWidth: '80px',
                        padding: '7px',
                        margin: '3px'
                    },
                    desktop: {
                        minWidth: '100px',
                        padding: '8px',
                        margin: '4px'
                    }
                }
            }
        };
    }
    
    /**
     * Setup Context Subscriptions
     * Monitor context changes via ChangeLog
     */
    _setupContextSubscriptions() {
        // Subscribe to global application mode changes
        if (this.changeLog) {
            this.changeLog.subscribe('application.mode', (newMode) => {
                this.handleGlobalModeChange(newMode);
            });
        }
    }
    
    /**
     * Handle Global Application Mode Changes
     * Updates behavior states and requests visual transitions
     */
    handleGlobalModeChange(newMode) {
        const oldMode = this.getCurrentMode();
        
        // Update behavior states
        this.updateBehaviorStates(newMode);
        
        // Update accessibility attributes
        this._updateAccessibilityForMode(newMode);
        
        // Return graphics request for Interface Handler to process
        return this.createModeTransitionRequest(oldMode, newMode);
    }
    
    /**
     * Legacy method - redirect to global mode change handler
     * @deprecated Use handleGlobalModeChange instead
     */
    handleInputModeChange(newMode) {
        return this.handleGlobalModeChange(newMode);
    }
    
    /**
     * Update Behavior States Based on Input Mode
     */
    updateBehaviorStates(inputMode) {
        switch(inputMode) {
            case 'design':
                this.isSelectable = true;
                this.isResizeable = true;
                this.isMovable = true;
                this.isNestable = true;
                break;
                
            case 'preview':
                this.isSelectable = false;
                this.isResizeable = false;
                this.isMovable = false;
                this.isNestable = false;
                break;
                
            case 'runtime':
                this.isSelectable = false;
                this.isResizeable = false;
                this.isMovable = false;
                this.isNestable = false;
                break;
        }
        
        // Notify Interface Handler of behavior state changes
        this._notifyBehaviorStateChange();
    }
    
    /**
     * Update Accessibility Attributes for Mode
     */
    _updateAccessibilityForMode(mode) {
        if (!this.element) return;
        
        switch(mode) {
            case 'design':
                this.element.setAttribute('aria-label', `Design container: ${this.containerId}`);
                this.element.setAttribute('tabindex', '-1');
                break;
                
            case 'preview':
                this.element.setAttribute('aria-label', `Preview container: ${this.formName || this.containerId}`);
                this.element.setAttribute('tabindex', '-1');
                break;
                
            case 'runtime':
                this.element.setAttribute('aria-label', `Form container: ${this.formName || this.containerId}`);
                this.element.setAttribute('tabindex', this.acceptsInput ? '0' : '-1');
                break;
        }
    }
    
    /**
     * Notify Interface Handler of Behavior State Changes
     */
    _notifyBehaviorStateChange() {
        if (this.interfaceHandler) {
            this.interfaceHandler.updateComponentBehaviorState({
                componentId: this.containerId,
                behaviorStates: {
                    isSelectable: this.isSelectable,
                    isResizeable: this.isResizeable,
                    isMovable: this.isMovable,
                    isNestable: this.isNestable
                },
                inputMode: this.inputMode
            });
        }
    }
    
    // DATA MANAGEMENT METHODS
    
    /**
     * Get Component Data
     */
    getData() {
        return {
            containerId: this.containerId,
            userType: this.userType,
            formRole: this.formRole,
            inputMode: this.inputMode,
            formValue: this.formValue,
            formName: this.formName,
            isRequired: this.isRequired,
            validationRules: this.validationRules,
            children: this.children.map(child => child.getData()),
            state: this.getState()
        };
    }
    
    /**
     * Set Component Data
     */
    setData(newData) {
        if (newData.formValue !== undefined) this.formValue = newData.formValue;
        if (newData.formName !== undefined) this.formName = newData.formName;
        if (newData.isRequired !== undefined) this.isRequired = newData.isRequired;
        if (newData.validationRules !== undefined) this.validationRules = newData.validationRules;
        
        // Update DOM structure if needed
        this._updateDataAttributes();
    }
    
    /**
     * Get Current State
     */
    getState() {
        return {
            isSelected: this.isSelected,
            isHovered: this.isHovered,
            isDragging: this.isDragging,
            isResizing: this.isResizing,
            isSelectable: this.isSelectable,
            isResizeable: this.isResizeable,
            isMovable: this.isMovable,
            isNestable: this.isNestable
        };
    }
    
    /**
     * Update Data Attributes on DOM Element
     */
    _updateDataAttributes() {
        if (!this.element) return;
        
        this.element.setAttribute('data-form-name', this.formName || '');
        this.element.setAttribute('data-required', this.isRequired);
        this.element.setAttribute('data-input-mode', this.inputMode);
    }
    
    // HIERARCHY MANAGEMENT
    
    /**
     * Add Child Component
     */
    addChild(childComponent) {
        if (!this.isNestable) return false;
        
        childComponent.parent = this;
        childComponent.index = this.children.length;
        childComponent.depth = this.depth + 1;
        this.children.push(childComponent);
        
        // Update Interface Handler
        this.updateHierarchyInfo();
        
        return true;
    }
    
    /**
     * Remove Child Component
     */
    removeChild(childComponent) {
        const index = this.children.indexOf(childComponent);
        if (index === -1) return false;
        
        this.children.splice(index, 1);
        childComponent.parent = null;
        
        // Update indices of remaining children
        this.children.forEach((child, idx) => {
            child.index = idx;
        });
        
        // Update Interface Handler
        this.updateHierarchyInfo();
        
        return true;
    }
    
    /**
     * Update Hierarchy Information for Interface Handler
     */
    updateHierarchyInfo() {
        if (this.interfaceHandler) {
            this.interfaceHandler.updateComponentHierarchy({
                componentId: this.containerId,
                parent: this.parent?.containerId || null,
                children: this.children.map(child => child.containerId),
                depth: this.depth,
                siblingIndex: this.index,
                acceptsChildren: this.isNestable,
                canBeNested: this.canBeNested,
                formRole: this.formRole,
                userType: this.userType
            });
        }
    }
    
    // NAVIGATION SUPPORT
    
    /**
     * Get Navigation Context for Interface Handler
     */
    getNavigationContext() {
        return {
            componentId: this.containerId,
            focusable: this.isSelectable,
            tabIndex: this.tabIndex,
            ariaRole: this.accessibilityRole,
            nextFocusable: this.getNextFocusableComponent(),
            previousFocusable: this.getPreviousFocusableComponent(),
            parentFocusable: this.parent?.isSelectable ? this.parent.containerId : null,
            childrenFocusable: this.children
                .filter(child => child.isSelectable)
                .map(child => child.containerId)
        };
    }
    
    /**
     * Get Next Focusable Component
     */
    getNextFocusableComponent() {
        if (!this.parent) return null;
        
        const siblings = this.parent.children;
        const currentIndex = siblings.indexOf(this);
        
        for (let i = currentIndex + 1; i < siblings.length; i++) {
            if (siblings[i].isSelectable) {
                return siblings[i].containerId;
            }
        }
        
        return null;
    }
    
    /**
     * Get Previous Focusable Component
     */
    getPreviousFocusableComponent() {
        if (!this.parent) return null;
        
        const siblings = this.parent.children;
        const currentIndex = siblings.indexOf(this);
        
        for (let i = currentIndex - 1; i >= 0; i--) {
            if (siblings[i].isSelectable) {
                return siblings[i].containerId;
            }
        }
        
        return null;
    }
    
    // GRAPHICS REQUEST GENERATION (for Interface Handler to pass to Event Handler)
    
    /**
     * Create Mode Transition Graphics Request
     */
    createModeTransitionRequest(oldMode, newMode) {
        return {
            type: 'mode_transition',
            componentId: this.containerId,
            transition: {
                from: this.visualSpecs.baseStyles[oldMode],
                to: this.visualSpecs.baseStyles[newMode],
                animation: this.visualSpecs.animations.modeTransition
            },
            classes: {
                remove: [`mode-${oldMode}`, 'transition-source'],
                add: [`mode-${newMode}`, 'transition-target']
            },
            attributes: {
                'data-input-mode': newMode,
                'data-transition': `${oldMode}-to-${newMode}`
            },
            options: {
                priority: 'medium',
                batch: true,
                onComplete: () => this._onModeTransitionComplete(newMode)
            }
        };
    }
    
    /**
     * Create Selection State Graphics Request
     */
    createSelectionRequest(selected) {
        this.isSelected = selected;
        
        return {
            type: 'selection_state',
            componentId: this.containerId,
            animation: {
                ...this.visualSpecs.animations.selection,
                keyframes: selected ? [
                    { transform: 'scale(1)', ...this.visualSpecs.baseStyles[this.inputMode] },
                    { transform: 'scale(1.02)', ...this.visualSpecs.states.selected }
                ] : [
                    { ...this.visualSpecs.states.selected },
                    { ...this.visualSpecs.baseStyles[this.inputMode] }
                ]
            },
            finalStyles: selected ? this.visualSpecs.states.selected : {},
            classes: {
                add: selected ? ['selected'] : [],
                remove: selected ? [] : ['selected']
            },
            options: {
                priority: 'high',
                batch: false
            }
        };
    }
    
    /**
     * Create Hover State Graphics Request
     */
    createHoverRequest(hovered) {
        this.isHovered = hovered;
        
        return {
            type: 'hover_state',
            componentId: this.containerId,
            animation: this.visualSpecs.animations.hover,
            styles: hovered ? this.visualSpecs.states.hovered : {},
            classes: {
                add: hovered ? ['hovered'] : [],
                remove: hovered ? [] : ['hovered']
            },
            options: {
                priority: 'normal',
                batch: true
            }
        };
    }
    
    /**
     * Create Validation State Graphics Request
     */
    createValidationRequest(isValid, errorMessage = null) {
        const stateKey = isValid ? 'valid' : 'error';
        
        return {
            type: 'validation_state',
            componentId: this.containerId,
            animation: this.visualSpecs.animations.validation,
            styles: this.visualSpecs.states[stateKey],
            classes: {
                add: [stateKey],
                remove: [isValid ? 'error' : 'valid']
            },
            attributes: {
                'data-validation-state': stateKey,
                'aria-invalid': !isValid,
                'data-error-message': errorMessage || ''
            },
            options: {
                priority: 'high',
                batch: false
            }
        };
    }
    
    // HANDLER INTEGRATION
    
    /**
     * Set Handler References
     */
    setHandlers({ interfaceHandler, changeLog }) {
        this.interfaceHandler = interfaceHandler;
        this.changeLog = changeLog;
        
        // Setup context subscriptions now that ChangeLog is available
        this._setupContextSubscriptions();
        
        // Register with Interface Handler
        this._registerWithInterface();
    }
    
    /**
     * Register Component with Interface Handler
     */
    _registerWithInterface() {
        if (this.interfaceHandler) {
            this.interfaceHandler.registerComponent({
                componentId: this.containerId,
                component: this,
                type: 'BaseUserContainer',
                userType: this.userType,
                formRole: this.formRole,
                visualSpecs: this.visualSpecs,
                navigationContext: this.getNavigationContext()
            });
        }
    }
    
    // LIFECYCLE METHODS
    
    /**
     * Mode Transition Complete Callback
     */
    _onModeTransitionComplete(newMode) {
        // Update internal state
        this.element?.setAttribute('data-mode-transition-complete', 'true');
        
        // Notify Interface Handler
        if (this.interfaceHandler) {
            this.interfaceHandler.onComponentModeTransition({
                componentId: this.containerId,
                newMode: newMode,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Destroy Component
     */
    destroy() {
        // Unregister from global registry
        if (typeof window !== 'undefined' && window.containerRegistry) {
            delete window.containerRegistry[this.containerId];
            console.log(`📝 Container ${this.containerId} unregistered globally`);
        }
        
        // Clean up DOM element attachment
        if (this.element && this.element._containerInstance) {
            delete this.element._containerInstance;
            console.log(`📝 Container ${this.containerId} detached from DOM element`);
        }
        
        // Unregister from handlers
        if (this.interfaceHandler) {
            this.interfaceHandler.unregisterComponent(this.containerId);
        }
        
        if (this.changeLog) {
            this.changeLog.unsubscribe('current_context_meta.input_mode');
        }
        
        // Clean up children
        this.children.forEach(child => child.destroy());
        this.children = [];
        
        // Remove from parent
        if (this.parent) {
            this.parent.removeChild(this);
        }
        
        // Clean up DOM element
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.element = null;
        this.isInitialized = false;
    }
    
    // UTILITY METHODS
    
    /**
     * Get Component by ID (recursive search)
     */
    findComponent(componentId) {
        if (this.containerId === componentId) {
            return this;
        }
        
        for (const child of this.children) {
            const found = child.findComponent(componentId);
            if (found) return found;
        }
        
        return null;
    }
    
    /**
     * Validate Form Data
     */
    validate() {
        const errors = [];
        
        // Required field validation
        if (this.isRequired && !this.formValue) {
            errors.push('This field is required');
        }
        
        // Custom validation rules
        for (const rule of this.validationRules) {
            const result = rule.validate(this.formValue);
            if (!result.isValid) {
                errors.push(result.message);
            }
        }
        
        // Validate children
        for (const child of this.children) {
            const childErrors = child.validate();
            errors.push(...childErrors);
        }
        
        return errors;
    }
    
    /**
     * Get Form Data (recursive)
     */
    getFormData() {
        const data = {};
        
        // Add own form data
        if (this.formName && this.formValue !== null) {
            data[this.formName] = this.formValue;
        }
        
        // Add children form data
        for (const child of this.children) {
            const childData = child.getFormData();
            Object.assign(data, childData);
        }
        
        return data;
    }
    
    // ========================
    // EVENT HANDLING METHODS
    // ========================
    
    /**
     * Handle click events - delegates to appropriate behaviors
     * @param {Event} event - The click event
     */
    async handleClick(event) {
        // Only handle clicks in design mode if SelectableBehavior is available
        if (this.selectableBehavior && this.isDesignMode()) {
            // Determine click type based on modifier keys
            if (event.ctrlKey || event.metaKey) {
                // Multi-select toggle
                return await this.selectableBehavior.selectMultiple({ mode: 'toggle' });
            } else if (event.shiftKey) {
                // Range selection (if there's a previous selection)
                return await this.selectableBehavior.selectRange({ endComponent: this });
            } else {
                // Single selection
                return await this.selectableBehavior.selectSingle({ clearOthers: true });
            }
        }
        
        return { success: false, reason: 'No selection behavior available or not in design mode' };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseUserContainer;
} else if (typeof window !== 'undefined') {
    window.BaseUserContainer = BaseUserContainer;
}
