/**
 * Interface Handler - Detects entering and exiting components
 * Manages component interaction states and triggers appropriate callbacks
 */

class InterfaceHandler {
    constructor(changeLogManager) {
        this.changeLog = changeLogManager;
        this.handlerName = 'interface_handler';
        
        // Track component states
        this.activeComponents = new Set();
        this.hoveredComponents = new Set();
        this.focusedComponent = null;
        this.lastActiveComponent = null;
        
        // Event callbacks
        this.callbacks = {
            onEnter: new Map(),
            onExit: new Map(),
            onFocus: new Map(),
            onBlur: new Map(),
            onActivate: new Map(),
            onDeactivate: new Map()
        };
        
        // Configuration
        this.config = {
            debounceTime: 50, // ms
            enableHoverDetection: true,
            enableFocusDetection: true,
            enableKeyboardNavigation: true,
            logEvents: false
        };
        
        // Debounce timers
        this.debounceTimers = new Map();
        
        this.init();
    }
    
    /**
     * Initialize event listeners and changelog integration
     */
    async init() {
        // Register with changelog system
        this.changeLog.registerHandler(this.handlerName);
        
        // Start listening for changes from other handlers
        this.changeLog.startListening(this.handleContextChanges.bind(this));
        
        if (typeof document !== 'undefined') {
            this.setupEventListeners();
        }
        
        console.log('InterfaceHandler initialized');
    }
    
    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // Mouse events
        document.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
        document.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
        document.addEventListener('mouseover', this.handleMouseOver.bind(this), true);
        document.addEventListener('mouseout', this.handleMouseOut.bind(this), true);
        
        // Focus events
        if (this.config.enableFocusDetection) {
            document.addEventListener('focusin', this.handleFocusIn.bind(this), true);
            document.addEventListener('focusout', this.handleFocusOut.bind(this), true);
        }
        
        // Keyboard navigation
        if (this.config.enableKeyboardNavigation) {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
        }
        
        // Touch events for mobile
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), true);
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), true);
    }
    
    /**
     * Register a component for tracking
     */
    registerComponent(element, componentId, options = {}) {
        if (!element || !componentId) {
            console.warn('InterfaceHandler: Invalid component registration');
            return false;
        }
        
        // Add component identifier
        element.setAttribute('data-component-id', componentId);
        element.setAttribute('data-interface-tracked', 'true');
        
        // Store component options
        if (options.callbacks) {
            this.registerCallbacks(componentId, options.callbacks);
        }
        
        this.log(`Registered component: ${componentId}`);
        return true;
    }
    
    /**
     * Unregister a component
     */
    unregisterComponent(componentId) {
        // Clean up active states
        this.activeComponents.delete(componentId);
        this.hoveredComponents.delete(componentId);
        
        if (this.focusedComponent === componentId) {
            this.focusedComponent = null;
        }
        
        // Remove callbacks
        Object.keys(this.callbacks).forEach(eventType => {
            this.callbacks[eventType].delete(componentId);
        });
        
        this.log(`Unregistered component: ${componentId}`);
    }
    
    /**
     * Register event callbacks for a component
     */
    registerCallbacks(componentId, callbacks) {
        Object.keys(callbacks).forEach(eventType => {
            if (this.callbacks[eventType]) {
                this.callbacks[eventType].set(componentId, callbacks[eventType]);
            }
        });
    }
    
    /**
     * Handle mouse enter events
     */
    handleMouseEnter(event) {
        const componentId = this.getComponentId(event.target);
        if (componentId) {
            this.debounceEvent('enter', componentId, () => {
                this.enterComponent(componentId, 'mouse', event);
            });
        }
    }
    
    /**
     * Handle mouse leave events
     */
    handleMouseLeave(event) {
        const componentId = this.getComponentId(event.target);
        if (componentId) {
            this.debounceEvent('leave', componentId, () => {
                this.exitComponent(componentId, 'mouse', event);
            });
        }
    }
    
    /**
     * Handle mouse over events (for nested components)
     */
    handleMouseOver(event) {
        const componentId = this.getComponentId(event.target);
        if (componentId && this.config.enableHoverDetection) {
            if (!this.hoveredComponents.has(componentId)) {
                this.hoveredComponents.add(componentId);
                this.triggerCallback('onEnter', componentId, { type: 'hover', event });
                this.log(`Hover enter: ${componentId}`);
            }
        }
    }
    
    /**
     * Handle mouse out events
     */
    handleMouseOut(event) {
        const componentId = this.getComponentId(event.target);
        if (componentId && this.hoveredComponents.has(componentId)) {
            // Check if we're actually leaving the component
            if (!event.target.contains(event.relatedTarget)) {
                this.hoveredComponents.delete(componentId);
                this.triggerCallback('onExit', componentId, { type: 'hover', event });
                this.log(`Hover exit: ${componentId}`);
            }
        }
    }
    
    /**
     * Handle focus in events
     */
    async handleFocusIn(event) {
        const componentId = this.getComponentId(event.target);
        if (componentId) {
            const previousFocus = this.focusedComponent;
            this.focusedComponent = componentId;
            
            // Update context
            await this.changeLog.updateContext(
                'current_context_meta.focus_context.focused_component',
                componentId,
                'update',
                { event_type: 'focus_in', previous_focus: previousFocus, timestamp: Date.now() }
            );
            
            if (previousFocus && previousFocus !== componentId) {
                this.triggerCallback('onBlur', previousFocus, { event });
            }
            
            this.triggerCallback('onFocus', componentId, { event });
            this.log(`Focus: ${componentId}`);
        }
    }
    
    /**
     * Handle focus out events
     */
    async handleFocusOut(event) {
        const componentId = this.getComponentId(event.target);
        if (componentId === this.focusedComponent) {
            this.focusedComponent = null;
            
            await this.changeLog.updateContext(
                'current_context_meta.focus_context.focused_component',
                null,
                'update',
                { event_type: 'focus_out', timestamp: Date.now() }
            );
            
            this.triggerCallback('onBlur', componentId, { event });
            this.log(`Blur: ${componentId}`);
        }
    }
    
    /**
     * Handle changes from other handlers
     */
    handleContextChanges(changes) {
        changes.forEach(change => {
            console.log(`InterfaceHandler received change from ${change.handler}: ${change.action} at ${change.context_path}`);
            
            // React to input changes
            if (change.context_path.includes('current_mouse_input') || 
                change.context_path.includes('current_keyboard_input')) {
                this.handleInputChange(change);
            }
            
            // React to lock changes
            if (change.context_path.includes('interaction_locks')) {
                this.handleLockChange(change);
            }
        });
    }
    
    /**
     * Handle input changes from IOHandler
     */
    handleInputChange(change) {
        // Adjust component detection based on input state
        if (change.context_path.includes('is_dragging') && change.new_value === true) {
            // Disable hover detection during drag
            this.config.enableHoverDetection = false;
        } else if (change.context_path.includes('is_dragging') && change.new_value === false) {
            // Re-enable hover detection after drag
            this.config.enableHoverDetection = true;
        }
    }
    
    /**
     * Handle interaction lock changes
     */
    async handleLockChange(change) {
        if (change.new_value === true) {
            // Lock engaged - may need to restrict component interactions
            await this.changeLog.updateContext(
                'current_context_meta.capability_context.disabled_actions',
                ['component_interaction'],
                'update',
                { reason: 'interaction_lock_active', lock_type: change.context_path }
            );
        } else {
            // Lock released - restore component interactions
            await this.changeLog.updateContext(
                'current_context_meta.capability_context.disabled_actions',
                [],
                'update',
                { reason: 'interaction_lock_released' }
            );
        }
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeyDown(event) {
        if (this.focusedComponent) {
            // Handle arrow keys, tab, enter, etc.
            const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'];
            
            if (navigationKeys.includes(event.key)) {
                this.triggerCallback('onKeyNav', this.focusedComponent, { 
                    key: event.key, 
                    event 
                });
            }
        }
    }
    
    /**
     * Handle touch start events
     */
    handleTouchStart(event) {
        const componentId = this.getComponentId(event.target);
        if (componentId) {
            this.enterComponent(componentId, 'touch', event);
        }
    }
    
    /**
     * Handle touch end events
     */
    handleTouchEnd(event) {
        const componentId = this.getComponentId(event.target);
        if (componentId) {
            this.exitComponent(componentId, 'touch', event);
        }
    }
    
    /**
     * Enter a component
     */
    async enterComponent(componentId, inputType, event) {
        if (!this.activeComponents.has(componentId)) {
            this.activeComponents.add(componentId);
            this.lastActiveComponent = componentId;
            
            // Update context
            await this.changeLog.updateContext(
                'current_context_meta.currently_in_object.component_id',
                componentId,
                'update',
                { event_type: 'component_enter', input_type: inputType, timestamp: Date.now() }
            );
            
            // Get component info if available
            const element = document.querySelector(`[data-component-id="${componentId}"]`);
            if (element) {
                const componentType = element.getAttribute('data-component-type') || 'unknown';
                const bounds = element.getBoundingClientRect();
                
                await this.changeLog.updateContext(
                    'current_context_meta.currently_in_object.component_type',
                    componentType,
                    'update'
                );
                
                await this.changeLog.updateContext(
                    'current_context_meta.currently_in_object.component_bounds',
                    {
                        x: bounds.left,
                        y: bounds.top,
                        width: bounds.width,
                        height: bounds.height
                    },
                    'update'
                );
            }
            
            this.triggerCallback('onEnter', componentId, { 
                inputType, 
                event,
                timestamp: Date.now()
            });
            
            this.triggerCallback('onActivate', componentId, { 
                inputType, 
                event 
            });
            
            this.log(`Enter component: ${componentId} (${inputType})`);
        }
    }
    
    /**
     * Exit a component
     */
    async exitComponent(componentId, inputType, event) {
        if (this.activeComponents.has(componentId)) {
            this.activeComponents.delete(componentId);
            
            // Update context - clear if this was the current component
            const currentComponentId = this.changeLog.getContextValue('current_context_meta.currently_in_object.component_id');
            if (currentComponentId === componentId) {
                await this.changeLog.updateContext(
                    'current_context_meta.currently_in_object.component_id',
                    null,
                    'update',
                    { event_type: 'component_exit', input_type: inputType, timestamp: Date.now() }
                );
                
                await this.changeLog.updateContext(
                    'current_context_meta.currently_in_object.component_type',
                    null,
                    'update'
                );
            }
            
            this.triggerCallback('onExit', componentId, { 
                inputType, 
                event,
                timestamp: Date.now()
            });
            
            this.triggerCallback('onDeactivate', componentId, { 
                inputType, 
                event 
            });
            
            this.log(`Exit component: ${componentId} (${inputType})`);
        }
    }
    
    /**
     * Get component ID from element
     */
    getComponentId(element) {
        // Look for component ID in current element or parent elements
        let current = element;
        while (current && current !== document) {
            const componentId = current.getAttribute('data-component-id');
            if (componentId) {
                return componentId;
            }
            current = current.parentElement;
        }
        return null;
    }
    
    /**
     * Trigger callback for a component
     */
    triggerCallback(eventType, componentId, data = {}) {
        const callback = this.callbacks[eventType]?.get(componentId);
        if (callback && typeof callback === 'function') {
            try {
                callback(componentId, data);
            } catch (error) {
                console.error(`InterfaceHandler callback error for ${componentId}:`, error);
            }
        }
    }
    
    /**
     * Debounce events to prevent rapid firing
     */
    debounceEvent(eventType, componentId, callback) {
        const key = `${eventType}-${componentId}`;
        
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            callback();
            this.debounceTimers.delete(key);
        }, this.config.debounceTime);
        
        this.debounceTimers.set(key, timer);
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            activeComponents: Array.from(this.activeComponents),
            hoveredComponents: Array.from(this.hoveredComponents),
            focusedComponent: this.focusedComponent,
            lastActiveComponent: this.lastActiveComponent
        };
    }
    
    /**
     * Check if component is active
     */
    isComponentActive(componentId) {
        return this.activeComponents.has(componentId);
    }
    
    /**
     * Check if component is hovered
     */
    isComponentHovered(componentId) {
        return this.hoveredComponents.has(componentId);
    }
    
    /**
     * Check if component is focused
     */
    isComponentFocused(componentId) {
        return this.focusedComponent === componentId;
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    /**
     * Log events if enabled
     */
    log(message) {
        if (this.config.logEvents) {
            console.log(`[InterfaceHandler] ${message}`);
        }
    }
    
    /**
     * Cleanup and destroy handler
     */
    destroy() {
        // Clear all timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        // Clear all states
        this.activeComponents.clear();
        this.hoveredComponents.clear();
        this.focusedComponent = null;
        
        // Clear callbacks
        Object.keys(this.callbacks).forEach(eventType => {
            this.callbacks[eventType].clear();
        });
        
        // Stop changelog listening
        this.changeLog.stopListening();
        
        this.log('InterfaceHandler destroyed');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InterfaceHandler;
} else if (typeof window !== 'undefined') {
    window.InterfaceHandler = InterfaceHandler;
}