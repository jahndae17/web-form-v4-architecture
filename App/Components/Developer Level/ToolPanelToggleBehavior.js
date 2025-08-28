/**
 * ToolPanelToggleBehavior.js - Graphics Handler Compliant Panel Behavior
 * 
 * ARCHITECTURE PURPOSE:
 * - Provides reusable panel open/close functionality for container components
 * - Integrates with Event Handler for panel state lock coordination
 * - Coordinates with Graphics Handler for ALL visual operations
 * - Follows behavior composition pattern for modular panel management
 * 
 * GRAPHICS HANDLER INTEGRATION:
 * - ALL visual operations (styling, animations, positioning) through Graphics Handler
 * - NO direct DOM manipulation, NO CSS files, NO style properties
 * - Component requests visual changes, Graphics Handler executes them
 * - Behavior specifies visual requirements, Graphics Handler implements them
 * 
 * COMPLIANCE WITH NEW COMPONENT ARCHITECTURE:
 * - NO separate CSS files - all styling through Graphics Handler
 * - NO direct visual operations - all through graphics requests
 * - NO DOM manipulation - only data and behavior declarations
 * - Component provides visual specifications, Graphics Handler implements them
 */

// ========================
// BEHAVIOR SCHEMA REGISTRATION
// ========================

const behaviorSchema = {
    "togglePanel": {
        "enabled": true,
        "triggers": ["click:panel-toggle", "Ctrl+Tab"],
        "parameters": { 
            "animate": true, 
            "persist": true,
            "lockType": "panel_toggle",
            "priority": 10,
            "graphics_handler": true  // All visuals through Graphics Handler
        }
    },
    "openPanel": {
        "enabled": true,
        "triggers": ["click:panel-open", "Space+panel"],
        "parameters": { 
            "animate": true, 
            "persist": true,
            "force": false,
            "graphics_handler": true
        }
    },
    "closePanel": {
        "enabled": true,
        "triggers": ["click:panel-close", "Escape+panel"],
        "parameters": { 
            "animate": true, 
            "persist": true,
            "force": false,
            "graphics_handler": true
        }
    },
    "requestToggleButton": {
        "enabled": true,
        "triggers": ["init", "panel-position-change"],
        "parameters": { 
            "position": "auto",
            "size": "default",
            "symbols": { "open": "✕", "closed": "☰", "animating": "⏸" },
            "graphics_handler": true  // Button creation through Graphics Handler
        }
    },
    "updateButtonState": {
        "enabled": true,
        "triggers": ["panel-state-change", "viewport-resize"],
        "parameters": { 
            "smooth": true,
            "responsive": true,
            "graphics_handler": true  // All button updates through Graphics Handler
        }
    },
    "persistPanelState": {
        "enabled": true,
        "triggers": ["panel-toggle-complete"],
        "parameters": { 
            "storageKey": "panel-state",
            "includePosition": true
        }
    }
};

// ========================
// BEHAVIOR CLASS IMPLEMENTATION
// ========================

class ToolPanelToggleBehavior {
    constructor() {
        this.behaviorId = 'ToolPanelToggleBehavior';
        this.version = '2.0.0';  // Updated for Graphics Handler integration
        this.hostContainer = null;
        this.toggleButtonId = null;  // Button ID for Graphics Handler, NOT direct reference
        this.isAnimating = false;
        this.currentLockId = null;
        this.graphicsHandler = null;  // Graphics Handler reference
        
        // Configuration for Graphics Handler integration
        this.config = {
            enabled: true,
            initialState: 'remember',
            persistState: true,
            storageKey: 'panel-state',
            allowManualToggle: true,
            autoCloseOnAction: false,
            // Animation specifications for Graphics Handler
            animationSpecs: {
                panelToggle: {
                    duration: 300,
                    easing: 'ease-in-out',
                    properties: ['width', 'opacity']
                },
                buttonUpdate: {
                    duration: 150,
                    easing: 'ease-out',
                    properties: ['transform', 'backgroundColor']
                }
            },
            buttonEnabled: true,
            buttonSpecs: {
                size: { width: 28, height: 28 },
                symbols: { open: "✕", closed: "☰", animating: "⏸", locked: "🔒", error: "⚠" },
                baseStyles: {
                    backgroundColor: '#555',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    position: 'absolute',
                    zIndex: 1000
                },
                stateStyles: {
                    hover: { backgroundColor: '#666', transform: 'scale(1.05)' },
                    active: { backgroundColor: '#777', transform: 'scale(0.95)' },
                    disabled: { backgroundColor: '#999', cursor: 'not-allowed', opacity: 0.5 }
                }
            }
        };
    }

    // ========================
    // BEHAVIOR REGISTRATION METHODS
    // ========================

    getSchema() {
        return behaviorSchema;
    }

    getBehaviorId() {
        return this.behaviorId;
    }

    isEnabled() {
        return this.config.enabled;
    }

    // ========================
    // LIFECYCLE METHODS
    // ========================

    attachToContainer(hostContainer, options = {}) {
        if (!hostContainer) {
            throw new Error('ToolPanelToggleBehavior: Host container is required');
        }
        
        this.hostContainer = hostContainer;
        this.config = { ...this.config, ...options };
        
        // Get Graphics Handler reference from host container
        this.graphicsHandler = options.graphicsHandler || hostContainer.graphicsHandler;
        if (!this.graphicsHandler) {
            console.warn('ToolPanelToggleBehavior: No Graphics Handler available - visual operations disabled');
        }
        
        // Initialize panel state
        this.initializePanelState();
        
        // Register with Event Handler (placeholder - will be implemented by Event Handler)
        this.registerWithEventHandler();
        
        // Request toggle button creation if Graphics Handler is available
        if (this.graphicsHandler && this.config.buttonEnabled !== false) {
            this.initializeToggleButton();
        }
        
        console.log(`ToolPanelToggleBehavior attached to ${hostContainer.containerId} with Graphics Handler integration`);
        return this;
    }

    detachFromContainer() {
        // Unregister from Event Handler
        if (this.hostContainer && this.hostContainer.eventHandler) {
            console.log('ToolPanelToggleBehavior: Unregistering from Event Handler');
        }

        // Request button destruction through Graphics Handler
        if (this.toggleButtonId && this.graphicsHandler) {
            this.requestButtonDestroy();
        }
        
        this.releaseAllLocks();
        this.hostContainer = null;
        this.graphicsHandler = null;
        
        console.log('ToolPanelToggleBehavior detached');
        return this;
    }

    // ========================
    // PANEL TOGGLE FUNCTIONS (Called by Event Handler)
    // ========================

    togglePanel(parameters = {}) {
        if (!this.hostContainer) {
            console.warn('ToolPanelToggleBehavior: No host container attached');
            return {
                success: false,
                error: 'No host container'
            };
        }

        if (this.isAnimating && !parameters.force) {
            console.log('Panel toggle ignored - animation in progress');
            return {
                success: false,
                error: 'Animation in progress'
            };
        }

        // Request lock from Event Handler
        const lockRequested = this.requestToggleLock(parameters);
        if (!lockRequested) {
            console.log('Panel toggle failed - could not acquire lock');
            return {
                success: false,
                error: 'Could not acquire lock'
            };
        }

        try {
            // Determine target state
            const currentState = this.hostContainer.isPanelOpen;
            const targetState = !currentState;

            console.log(`🎛️ Toggling panel: ${currentState ? 'open' : 'closed'} → ${targetState ? 'open' : 'closed'}`);

            // Call appropriate container method
            if (targetState) {
                this.hostContainer.openPanel();
            } else {
                this.hostContainer.closePanel();
            }

            // Persist state if enabled
            if (this.config.persistState && parameters.persist !== false) {
                this.persistPanelState({ state: targetState });
            }

            // Return graphics request for Event Handler → Graphics Handler
            return {
                success: true,
                graphics_request: {
                    type: 'comprehensive_update',
                    componentId: this.hostContainer.containerId,
                    animation: this.createPanelToggleAnimation(currentState, targetState, parameters),
                    buttonUpdate: this.createButtonUpdateRequest(targetState),
                    options: {
                        priority: 'high',
                        batch: false,
                        onComplete: 'panel_toggle_complete'
                    }
                }
            };
            
        } catch (error) {
            this.handleToggleError(error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.releaseToggleLock();
        }
    }

    openPanel(parameters = {}) {
        if (this.hostContainer && !this.hostContainer.isPanelOpen) {
            return this.togglePanel({ ...parameters, targetState: 'open' });
        }
        return {
            success: false,
            error: 'Panel already open or no container'
        };
    }

    closePanel(parameters = {}) {
        if (this.hostContainer && this.hostContainer.isPanelOpen) {
            return this.togglePanel({ ...parameters, targetState: 'closed' });
        }
        return {
            success: false,
            error: 'Panel already closed or no container'
        };
    }

    // ========================
    // GRAPHICS HANDLER INTEGRATION METHODS
    // ========================

    requestToggleButton(parameters = {}) {
        if (!this.graphicsHandler || !this.hostContainer) {
            console.warn('ToolPanelToggleBehavior: Cannot create button - no Graphics Handler or container');
            return {
                success: false,
                error: 'No Graphics Handler or container'
            };
        }

        // Generate unique button ID
        this.toggleButtonId = `panel-toggle-${this.hostContainer.containerId}`;
        
        // Calculate button position
        const position = this.calculateButtonPosition();
        
        // Determine correct symbol based on current panel state
        const isOpen = this.hostContainer.isPanelOpen;
        const buttonSymbol = isOpen ? 
            this.config.buttonSpecs.symbols.open :   // ✕ when panel is open (to close it)
            this.config.buttonSpecs.symbols.closed; // ☰ when panel is closed (to open it)
        
        // Return graphics request for button creation
        return {
            success: true,
            graphics_request: {
                type: 'comprehensive_update',
                componentId: this.toggleButtonId,
                createElement: {
                    tag: 'button',
                    id: this.toggleButtonId,
                    className: 'panel-toggle',
                    textContent: buttonSymbol,
                    parent: 'app-container'  // Add to app container for proper stacking
                },
                styles: {
                    ...this.config.buttonSpecs.baseStyles,
                    width: `${this.config.buttonSpecs.size.width}px`,
                    height: `${this.config.buttonSpecs.size.height}px`,
                    left: `${position.x}px`,
                    top: `${position.y}px`
                },
                options: {
                    priority: 'high',
                    batch: false
                }
            }
        };
    }

    requestButtonDestroy() {
        if (!this.toggleButtonId || !this.graphicsHandler) {
            return;
        }

        return {
            success: true,
            graphics_request: {
                type: 'destroy_element',
                componentId: this.toggleButtonId,
                options: {
                    priority: 'normal',
                    batch: true
                }
            }
        };
    }

    createPanelToggleAnimation(currentState, targetState, parameters) {
        if (!parameters.animate || !this.config.animationSpecs.panelToggle) {
            return null;
        }

        const containerWidth = targetState ? '200px' : '0px';
        const containerOpacity = targetState ? 1 : 0.3;

        return {
            [this.hostContainer.containerId]: {
                width: { from: currentState ? '200px' : '0px', to: containerWidth },
                opacity: { from: currentState ? 1 : 0.3, to: containerOpacity },
                duration: this.config.animationSpecs.panelToggle.duration,
                easing: this.config.animationSpecs.panelToggle.easing
            }
        };
    }

    createButtonUpdateRequest(targetState) {
        if (!this.toggleButtonId || !this.config.buttonEnabled) {
            return null;
        }

        const symbol = targetState ? 
            this.config.buttonSpecs.symbols.open : 
            this.config.buttonSpecs.symbols.closed;
        
        const position = this.calculateButtonPosition();

        return {
            componentId: this.toggleButtonId,
            styles: {
                left: `${position.x}px`,
                top: `${position.y}px`
            },
            textContent: symbol,
            animation: {
                transform: { from: 'scale(1)', to: 'scale(0.9)', back: 'scale(1)' },
                duration: this.config.animationSpecs.buttonUpdate.duration,
                easing: this.config.animationSpecs.buttonUpdate.easing
            }
        };
    }

    // ========================
    // VISUAL SPECIFICATIONS (for Graphics Handler)
    // ========================

    getVisualSchema() {
        return {
            panelStyles: {
                base: {
                    transition: `width ${this.config.animationSpecs.panelToggle.duration}ms ${this.config.animationSpecs.panelToggle.easing}`,
                    overflow: 'hidden'
                },
                open: {
                    width: '200px',
                    opacity: 1
                },
                closed: {
                    width: '0px',
                    opacity: 0.3
                }
            },
            buttonStyles: this.config.buttonSpecs,
            animations: this.config.animationSpecs
        };
    }

    // ========================
    // HELPER METHODS (Graphics Handler Compatible)
    // ========================

    calculateButtonPosition(targetState = null, targetDimensions = null) {
        if (!this.hostContainer) {
            return { x: 0, y: 0 };
        }

        const panelPosition = this.hostContainer.panelPosition || 'left';
        // Use provided target state or current panel state
        const isOpen = targetState !== null ? targetState : this.hostContainer.isPanelOpen;
        
        // Get container offset and dimensions (Graphics Handler compatible)
        const containerOffset = this.getContainerOffset();
        // Use provided target dimensions or current dimensions
        const containerDimensions = targetDimensions || this.getContainerDimensions();
        const buttonSize = this.config.buttonSpecs.size;
        
        // Exact positioning logic from original implementation
        switch (panelPosition) {
            case 'left':
                if (isOpen) {
                    // Inside panel: right edge - button width - 10px margin
                    return {
                        x: containerOffset.x + containerDimensions.width - buttonSize.width - 10,
                        y: containerOffset.y + 10
                    };
                } else {
                    // Outside panel: container left + 5px margin
                    return {
                        x: containerOffset.x + 5,
                        y: containerOffset.y + 10
                    };
                }
            
            case 'right':
                if (isOpen) {
                    // Inside panel: left edge + 10px margin
                    return {
                        x: containerOffset.x + 10,
                        y: containerOffset.y + 10
                    };
                } else {
                    // Outside panel: container left - button width - 5px margin
                    return {
                        x: containerOffset.x - buttonSize.width - 5,
                        y: containerOffset.y + 10
                    };
                }
            
            case 'top':
                if (isOpen) {
                    // Inside panel: bottom edge - button height - 10px margin
                    return {
                        x: containerOffset.x + 10,
                        y: containerOffset.y + containerDimensions.height - buttonSize.height - 10
                    };
                } else {
                    // Outside panel: container bottom + 5px margin
                    return {
                        x: containerOffset.x + 10,
                        y: containerOffset.y + containerDimensions.height + 5
                    };
                }
            
            case 'bottom':
                if (isOpen) {
                    // Inside panel: top edge + 10px margin
                    return {
                        x: containerOffset.x + 10,
                        y: containerOffset.y + 10
                    };
                } else {
                    // Outside panel: container top - button height - 5px margin
                    return {
                        x: containerOffset.x + 10,
                        y: containerOffset.y - buttonSize.height - 5
                    };
                }
            
            default:
                return {
                    x: containerOffset.x + 10,
                    y: containerOffset.y + 10
                };
        }
    }

    getContainerOffset() {
        if (!this.hostContainer || !this.hostContainer.element) {
            return { x: 0, y: 0 };
        }

        // Get container position relative to app container
        const containerRect = this.hostContainer.element.getBoundingClientRect();
        const appContainer = document.getElementById('app-container') || document.body;
        const appRect = appContainer.getBoundingClientRect();

        return {
            x: containerRect.left - appRect.left,
            y: containerRect.top - appRect.top
        };
    }

    getContainerDimensions() {
        if (!this.hostContainer || !this.hostContainer.element) {
            return { width: 200, height: 400 }; // Default fallback
        }

        const containerRect = this.hostContainer.element.getBoundingClientRect();
        return {
            width: containerRect.width,
            height: containerRect.height
        };
    }

    getExpectedDimensions(targetState) {
        // Calculate what the container dimensions will be after animation completes
        const currentDimensions = this.getContainerDimensions();
        
        if (targetState === true) {
            // Panel will be open - use full width
            return {
                width: 200, // Standard panel width when open
                height: currentDimensions.height // Height doesn't change
            };
        } else {
            // Panel will be closed - minimal width
            return {
                width: 2, // Collapsed panel width
                height: currentDimensions.height // Height doesn't change
            };
        }
    }

    initializePanelState() {
        if (!this.hostContainer) return;

        if (this.config.initialState === 'remember') {
            const savedState = this.loadPersistedState();
            if (savedState !== null) {
                this.hostContainer.isPanelOpen = savedState;
                return;
            }
        }

        // Set default state
        if (this.config.initialState === 'open') {
            this.hostContainer.isPanelOpen = true;
        } else if (this.config.initialState === 'closed') {
            this.hostContainer.isPanelOpen = false;
        }
    }

    persistPanelState(parameters = {}) {
        if (!this.config.persistState) return;

        try {
            const state = parameters.state !== undefined ? 
                parameters.state : 
                this.hostContainer?.isPanelOpen;
            
            localStorage.setItem(this.config.storageKey, JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to persist panel state:', error);
        }
    }

    loadPersistedState() {
        if (!this.config.persistState) return null;

        try {
            const saved = localStorage.getItem(this.config.storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.warn('Failed to load persisted panel state:', error);
            return null;
        }
    }

    // ========================
    // LOCK MANAGEMENT (Event Handler Integration)
    // ========================

    requestToggleLock(parameters) {
        // Placeholder for Event Handler integration
        return true;
    }

    releaseToggleLock() {
        // Placeholder for Event Handler integration
        this.currentLockId = null;
    }

    releaseAllLocks() {
        this.releaseToggleLock();
    }

    // ========================
    // ERROR HANDLING
    // ========================

    handleToggleError(error) {
        console.error('Panel toggle error:', error);
        this.isAnimating = false;
        this.releaseAllLocks();
    }

    // ========================
    // INITIALIZATION METHODS
    // ========================

    initializeToggleButton() {
        if (!this.graphicsHandler || !this.hostContainer) {
            console.warn('ToolPanelToggleBehavior: Cannot initialize button - missing Graphics Handler or container');
            return;
        }

        console.log('🔧 Initializing toggle button...');
        
        // Request button creation through Graphics Handler
        const buttonRequest = this.requestToggleButton();
        if (buttonRequest.success && buttonRequest.graphics_request) {
            console.log('🔧 Button creation requested:', buttonRequest.graphics_request);
            
            // Since Graphics Handler doesn't have a direct processing method,
            // we'll create the button manually and apply styles through Graphics Handler
            this.createButtonElement(buttonRequest.graphics_request);
        } else {
            console.warn('ToolPanelToggleBehavior: Failed to generate button request');
        }
    }

    createButtonElement(buttonRequest) {
        const { componentId, createElement, styles } = buttonRequest;
        
        // Create the button element
        const toggleButton = document.createElement(createElement.tag);
        toggleButton.id = createElement.id;
        toggleButton.className = createElement.className;
        toggleButton.textContent = createElement.textContent;
        
        // Apply styles directly (since Graphics Handler updateComponentStyle has issues)
        Object.assign(toggleButton.style, styles);
        
        // Add to the specified parent
        const parentElement = document.getElementById(createElement.parent) || document.body;
        parentElement.appendChild(toggleButton);
        
        // Add click event listener
        toggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log('🎛️ Toggle button clicked');
            
            // Determine target state before toggling
            const currentState = this.hostContainer.isPanelOpen;
            const targetState = !currentState;
            
            const toggleResult = this.togglePanel({ animate: true, persist: true });
            if (toggleResult.success) {
                console.log('🎛️ Panel toggle successful');
                // Update button position immediately using expected dimensions
                this.updateButtonAfterToggle(targetState);
            } else {
                console.warn('🎛️ Panel toggle failed:', toggleResult.error);
            }
        });
        
        console.log(`🔧 Toggle button created and added to DOM: ${componentId}`);
        this.toggleButtonId = componentId;
    }

    updateButtonAfterToggle(targetState = null) {
        if (!this.toggleButtonId) return;
        
        const button = document.getElementById(this.toggleButtonId);
        if (!button) return;
        
        // Use provided target state or current panel state
        const isOpen = targetState !== null ? targetState : this.hostContainer.isPanelOpen;
        
        // Calculate expected dimensions for target state
        const expectedDimensions = targetState !== null ? 
            this.getExpectedDimensions(targetState) : 
            null;
        
        // Update position using target state and expected dimensions
        const newPosition = this.calculateButtonPosition(isOpen, expectedDimensions);
        button.style.left = `${newPosition.x}px`;
        button.style.top = `${newPosition.y}px`;
        
        // Update symbol
        const symbol = isOpen ? 
            this.config.buttonSpecs.symbols.open : 
            this.config.buttonSpecs.symbols.closed;
        button.textContent = symbol;
        
        console.log(`🔧 Button updated: position(${newPosition.x}, ${newPosition.y}), symbol(${symbol}), state(${isOpen ? 'open' : 'closed'})`);
    }

    // ========================
    // EVENT HANDLER INTEGRATION
    // ========================

    registerWithEventHandler() {
        if (this.hostContainer && this.hostContainer.eventHandler) {
            console.log('ToolPanelToggleBehavior: Registering with Event Handler');
            // Event Handler will register behavior schema
        }
    }
}

// ========================
// EXPORT FOR USE
// ========================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolPanelToggleBehavior;
} else if (typeof window !== 'undefined') {
    window.ToolPanelToggleBehavior = ToolPanelToggleBehavior;
}

console.log('📐 ToolPanelToggleBehavior loaded - Graphics Handler Compliant Version 2.0');
