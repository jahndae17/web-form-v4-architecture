/**
 * ToolPanelToggleBehavior.js - Modular behavior for panel state management
 * 
 * ARCHITECTURE PURPOSE:
 * - Provides reusable panel open/close functionality for container components
 * - Integrates with Event Handler for panel state lock coordination
 * - Manages smooth animations and state persistence
 * - Follows behavior composition pattern for modular panel management
 * 
 * BEHAVIOR COMPOSITION PATTERN:
 * - Can be attached to any container component that needs panel functionality
 * - Respects host container's size constraints and layout requirements
 * - Coordinates with other behaviors to prevent visual conflicts
 * - Uses ChangeLog for panel state synchronization across handlers
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
            "priority": 10
        }
    },
    "openPanel": {
        "enabled": true,
        "triggers": ["click:panel-open", "Space+panel"],
        "parameters": { 
            "animate": true, 
            "persist": true,
            "force": false
        }
    },
    "closePanel": {
        "enabled": true,
        "triggers": ["click:panel-close", "Escape+panel"],
        "parameters": { 
            "animate": true, 
            "persist": true,
            "force": false
        }
    },
    "createToggleButton": {
        "enabled": true,
        "triggers": ["init", "panel-position-change"],
        "parameters": { 
            "position": "auto",
            "size": "default",
            "symbols": { "open": "✕", "closed": "☰", "animating": "⏸" }
        }
    },
    "updateButtonPosition": {
        "enabled": true,
        "triggers": ["panel-state-change", "viewport-resize"],
        "parameters": { 
            "smooth": true,
            "responsive": true
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
        this.version = '1.0.0';
        this.hostContainer = null;
        this.toggleButton = null;
        this.isAnimating = false;
        this.currentLockId = null;
        
        // Configuration from behavior schema
        this.config = {
            enabled: true,
            initialState: 'remember', // 'open', 'closed', 'remember'
            persistState: true,
            storageKey: 'panel-state',
            allowManualToggle: true,
            autoCloseOnAction: false,
            animationEnabled: true,
            animationDuration: 300,
            animationEasing: 'ease-in-out',
            buttonEnabled: true,
            buttonSize: { width: 28, height: 28 },
            buttonSymbols: { open: "✕", closed: "☰", animating: "⏸", locked: "🔒", error: "⚠" }
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
        
        // Initialize panel state
        this.initializePanelState();
        
        // Create toggle button if enabled
        if (this.config.buttonEnabled) {
            this.createToggleButton();
        }
        
        // Register with Event Handler (placeholder - will be implemented by Event Handler)
        this.registerWithEventHandler();
        
        console.log(`ToolPanelToggleBehavior attached to ${hostContainer.containerId}`);
        return this;
    }

    detachFromContainer() {
        // Unregister from Event Handler
        if (this.hostContainer && this.hostContainer.eventHandler) {
            this.hostContainer.eventHandler.unregisterBehavior(this.behaviorId);
            console.log('✅ ToolPanelToggleBehavior unregistered from Event Handler');
        }

        // Destroy toggle button
        if (this.toggleButton) {
            this.destroyToggleButton();
        }
        
        this.releaseAllLocks();
        this.hostContainer = null;
        
        console.log(`ToolPanelToggleBehavior detached`);
        return this;
    }

    // ========================
    // PANEL TOGGLE FUNCTIONS (Called by Event Handler)
    // ========================

    togglePanel(parameters = {}) {
        if (!this.hostContainer) {
            console.warn('ToolPanelToggleBehavior: No host container attached');
            return false;
        }

        if (this.isAnimating && !parameters.force) {
            console.log('Panel toggle ignored - animation in progress');
            return false;
        }

        // Request lock from Event Handler
        const lockRequested = this.requestToggleLock(parameters);
        if (!lockRequested) {
            console.log('Panel toggle failed - could not acquire lock');
            return false;
        }

        try {
            // Determine target state
            const currentState = this.hostContainer.isPanelOpen;
            const targetState = !currentState;

            console.log(`🎛️ Toggling panel: ${currentState ? 'open' : 'closed'} → ${targetState ? 'open' : 'closed'}`);

            // Start animation if enabled
            if (this.config.animationEnabled && parameters.animate !== false) {
                this.startAnimation(currentState, targetState);
            }

            // Call appropriate container method
            if (targetState) {
                this.hostContainer.openPanel();
            } else {
                this.hostContainer.closePanel();
            }

            // Update button state
            if (this.toggleButton) {
                this.updateButtonSymbol(targetState ? 'open' : 'closed');
                this.updateButtonPosition();
            }

            // Persist state if enabled
            if (this.config.persistState && parameters.persist !== false) {
                this.persistPanelState({ state: targetState });
            }

            // Complete animation
            if (this.config.animationEnabled && parameters.animate !== false) {
                this.completeAnimation(targetState);
            }

            // Call panel state change callback if provided
            if (typeof this.onPanelStateChange === 'function') {
                try {
                    this.onPanelStateChange(targetState, currentState);
                } catch (callbackError) {
                    console.warn('Panel state change callback failed:', callbackError);
                }
            }

            return true;

        } catch (error) {
            console.error('Panel toggle failed:', error);
            this.handleToggleError(error);
            return false;
        } finally {
            this.releaseToggleLock();
        }
    }

    openPanel(parameters = {}) {
        if (this.hostContainer && !this.hostContainer.isPanelOpen) {
            return this.togglePanel({ ...parameters, targetState: 'open' });
        }
        return false;
    }

    closePanel(parameters = {}) {
        if (this.hostContainer && this.hostContainer.isPanelOpen) {
            return this.togglePanel({ ...parameters, targetState: 'closed' });
        }
        return false;
    }

    // ========================
    // TOGGLE BUTTON MANAGEMENT FUNCTIONS
    // ========================

    createToggleButton(parameters = {}) {
        if (this.toggleButton) {
            this.destroyToggleButton();
        }

        if (!this.hostContainer || !this.config.buttonEnabled) {
            return null;
        }

        // Check if DOM is available (browser environment)
        if (typeof document === 'undefined') {
            console.log('DOM not available - toggle button creation skipped (Node.js environment)');
            return null;
        }

        // Create button element
        this.toggleButton = document.createElement('button');
        this.toggleButton.id = `panel-toggle-${this.hostContainer.containerId}`;
        this.toggleButton.className = 'panel-toggle';
        this.toggleButton.setAttribute('aria-label', 'Toggle panel');
        this.toggleButton.setAttribute('aria-expanded', this.hostContainer.isPanelOpen.toString());

        // Set initial symbol
        const initialSymbol = this.hostContainer.isPanelOpen ? 
            this.config.buttonSymbols.open : 
            this.config.buttonSymbols.closed;
        this.toggleButton.textContent = initialSymbol;

        // Apply initial positioning
        this.updateButtonPosition();

        // Register button with Event Handler for reactive architecture
        if (this.hostContainer.eventHandler) {
            this.hostContainer.eventHandler.registerTrigger(
                this.toggleButton,
                'click',
                'panel-toggle',
                { behaviorId: this.behaviorId, functionName: 'togglePanel' }
            );
            console.log('🎛️ Toggle button registered with Event Handler');
        } else {
            console.warn('⚠️ Event Handler not available - button will not function');
        }

        // Add to DOM (append to app-container instead of tools-container to escape stacking context)
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.appendChild(this.toggleButton);
            console.log('🎛️ Toggle button appended to app-container (higher stacking context)');
        } else if (this.hostContainer.element) {
            this.hostContainer.element.appendChild(this.toggleButton);
            console.log('⚠️ Fallback: Toggle button appended to tools-container');
        }

        console.log(`Toggle button created for ${this.hostContainer.containerId}`);
        return this.toggleButton;
    }

    updateButtonPosition(parameters = {}) {
        if (!this.toggleButton || !this.hostContainer) {
            return;
        }

        const position = this.calculateButtonPosition();
        
        // Apply position with smooth transition if enabled
        if (parameters.smooth !== false && this.config.animationEnabled) {
            this.toggleButton.style.transition = `all ${this.config.animationDuration}ms ${this.config.animationEasing}`;
        }

        this.toggleButton.style.position = 'absolute';
        this.toggleButton.style.left = `${position.x}px`;
        this.toggleButton.style.top = `${position.y}px`;
        this.toggleButton.style.width = `${this.config.buttonSize.width}px`;
        this.toggleButton.style.height = `${this.config.buttonSize.height}px`;
        this.toggleButton.style.zIndex = '9999'; // Ensure button appears above all other elements
    }

    updateButtonSymbol(newState) {
        if (!this.toggleButton) return;

        const symbol = this.config.buttonSymbols[newState] || this.config.buttonSymbols.closed;
        this.toggleButton.textContent = symbol;
        this.toggleButton.setAttribute('aria-expanded', (newState === 'open').toString());
    }

    destroyToggleButton() {
        if (this.toggleButton) {
            // Unregister from Event Handler if available
            if (this.hostContainer && this.hostContainer.eventHandler) {
                this.hostContainer.eventHandler.unregisterTrigger(this.toggleButton, 'click');
                console.log('🎛️ Toggle button unregistered from Event Handler');
            }

            // Remove from DOM
            if (this.toggleButton.parentNode) {
                this.toggleButton.parentNode.removeChild(this.toggleButton);
            }
        }
        this.toggleButton = null;
    }

    // ========================
    // HELPER METHODS
    // ========================

    calculateButtonPosition() {
        if (!this.hostContainer) {
            return { x: 0, y: 0 };
        }

        const panelPosition = this.hostContainer.panelPosition || 'left';
        const isOpen = this.hostContainer.isPanelOpen;
        const containerDimensions = this.hostContainer.dimensions;
        const buttonSize = this.config.buttonSize;

        // Get tools-container position relative to app-container
        const toolsContainer = this.hostContainer.element;
        const appContainer = document.querySelector('.app-container');
        let containerOffset = { x: 0, y: 0 };
        
        if (toolsContainer && appContainer) {
            const toolsRect = toolsContainer.getBoundingClientRect();
            const appRect = appContainer.getBoundingClientRect();
            containerOffset = {
                x: toolsRect.left - appRect.left,
                y: toolsRect.top - appRect.top
            };
        }

        // Position calculation based on panel position and state
        switch (panelPosition) {
            case 'left':
                return {
                    x: containerOffset.x + (isOpen ? 
                        containerDimensions.width - buttonSize.width - 10 : 
                        5), // Position just outside collapsed panel (0px width)
                    y: containerOffset.y + 10
                };
            case 'right':
                return {
                    x: containerOffset.x + (isOpen ? 10 : -buttonSize.width - 5),
                    y: containerOffset.y + 10
                };
            case 'top':
                return {
                    x: containerOffset.x + 10,
                    y: containerOffset.y + (isOpen ? 
                        containerDimensions.height - buttonSize.height - 10 : 
                        containerDimensions.height + 5)
                };
            case 'bottom':
                return {
                    x: containerOffset.x + 10,
                    y: containerOffset.y + (isOpen ? 10 : -buttonSize.height - 5)
                };
            default:
                return { x: containerOffset.x + 10, y: containerOffset.y + 10 };
        }
    }

    initializePanelState() {
        if (!this.hostContainer) return;

        if (this.config.initialState === 'remember' && this.config.persistState) {
            const savedState = this.loadPersistedState();
            if (savedState !== null) {
                if (savedState && !this.hostContainer.isPanelOpen) {
                    this.hostContainer.openPanel();
                } else if (!savedState && this.hostContainer.isPanelOpen) {
                    this.hostContainer.closePanel();
                }
            }
        }
    }

    persistPanelState(parameters = {}) {
        if (!this.config.persistState || !this.hostContainer) return;

        const state = parameters.state !== undefined ? 
            parameters.state : 
            this.hostContainer.isPanelOpen;

        try {
            localStorage.setItem(this.config.storageKey, JSON.stringify({
                isOpen: state,
                position: this.hostContainer.panelPosition,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Failed to persist panel state:', error);
        }
    }

    loadPersistedState() {
        if (!this.config.persistState) return null;

        try {
            const saved = localStorage.getItem(this.config.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                return data.isOpen;
            }
        } catch (error) {
            console.warn('Failed to load persisted panel state:', error);
        }
        return null;
    }

    // ========================
    // LOCK MANAGEMENT (Event Handler Integration)
    // ========================

    requestToggleLock(parameters) {
        // Placeholder for Event Handler integration
        // In real implementation, this would request a lock from Event Handler
        this.currentLockId = `toggle-${Date.now()}`;
        return true;
    }

    releaseToggleLock() {
        // Placeholder for Event Handler integration
        this.currentLockId = null;
    }

    releaseAllLocks() {
        if (this.currentLockId) {
            this.releaseToggleLock();
        }
    }

    // ========================
    // ANIMATION MANAGEMENT
    // ========================

    startAnimation(fromState, toState) {
        this.isAnimating = true;
        if (this.toggleButton) {
            this.updateButtonSymbol('animating');
        }
    }

    completeAnimation(finalState) {
        this.isAnimating = false;
        if (this.toggleButton) {
            this.updateButtonSymbol(finalState ? 'open' : 'closed');
        }
    }

    // ========================
    // ERROR HANDLING
    // ========================

    handleToggleError(error) {
        this.isAnimating = false;
        if (this.toggleButton) {
            this.updateButtonSymbol('error');
        }
        console.error('ToolPanelToggleBehavior error:', error);
    }

    // ========================
    // EVENT HANDLER INTEGRATION
    // ========================

    registerWithEventHandler() {
        if (!this.hostContainer || !this.hostContainer.eventHandler) {
            console.warn('⚠️ Event Handler not available for behavior registration');
            return false;
        }

        const eventHandler = this.hostContainer.eventHandler;
        const schema = this.getSchema();

        try {
            // Register behavior schema with Event Handler
            eventHandler.registerBehavior(this.behaviorId, {
                instance: this,
                schema: schema,
                version: this.version,
                priority: 10,
                enabled: this.config.enabled
            });

            // Register specific function triggers
            Object.keys(schema).forEach(functionName => {
                const functionConfig = schema[functionName];
                if (functionConfig.enabled && functionConfig.triggers) {
                    functionConfig.triggers.forEach(trigger => {
                        eventHandler.registerFunctionTrigger(
                            trigger,
                            this.behaviorId,
                            functionName,
                            functionConfig.parameters || {}
                        );
                    });
                }
            });

            console.log(`✅ ToolPanelToggleBehavior registered with Event Handler: ${Object.keys(schema).length} functions`);
            return true;

        } catch (error) {
            console.error('❌ Failed to register with Event Handler:', error);
            return false;
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

// ========================
// IMPLEMENTATION REFERENCE DOCUMENTATION
// ========================

// STYLES TO IMPLEMENT (use CSS only if it fits):
// .panel-toggle {
//     background: #555;
//     border: none;
//     color: #fff;
//     width: 28px;
//     height: 28px;
//     border-radius: 4px;
//     cursor: pointer;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     font-size: 16px;
//     transition: all 0.2s ease;
// }
//
// .panel-toggle:hover {
//     background: #666;
//     transform: scale(1.05);
// }

// ========================
// BEHAVIOR CONFIGURATION PROPERTIES
// ========================

// Panel State Configuration
// - enabled: boolean (whether panel toggle functionality is active)
// - initialState: choose("open", "closed", "remember") (default panel state)
// - persistState: boolean (whether to save panel state across sessions)
// - storageKey: string (localStorage key for state persistence)
// - allowManualToggle: boolean (whether users can manually toggle panel)
// - autoCloseOnAction: boolean (whether panel closes after tool selection)

// Animation Configuration
// - animationEnabled: boolean (whether to animate panel transitions)
// - animationDuration: number (milliseconds for open/close animations)
// - animationEasing: string (CSS easing function for animations)
// - animationDelay: number (milliseconds before animation starts)
// - skipAnimationOnInit: boolean (whether to skip animation on initial load)
// - reducedMotionRespect: boolean (whether to respect user's reduced motion preference)

// Size and Layout Configuration
// - expandedSize: object { width, height } (panel dimensions when open)
// - collapsedSize: object { width, height } (panel dimensions when closed)
// - minSize: object { width, height } (minimum allowed panel size)
// - maxSize: object { width, height } (maximum allowed panel size)
// - resizeHandle: boolean (whether to show resize handle when expanded)
// - maintainAspectRatio: boolean (whether to maintain aspect ratio during resize)

// Trigger Configuration
// - toggleTrigger: choose("click", "double_click", "hover", "keyboard", "custom") (how panel is toggled)
// - keyboardShortcut: string (keyboard shortcut for toggle)
// - hoverDelay: number (milliseconds delay for hover-triggered toggle)
// - clickTarget: string (CSS selector for clickable toggle elements)
// - customTriggerEvents: array of strings (custom events that trigger toggle)

// Toggle Button State Configuration
// - buttonEnabled: boolean (whether to show a toggle button)
// - buttonPosition: object { relativeTo: "panel", offset: { x, y }, anchor: "corner|edge|center" } (button placement)
// - buttonSize: object { width, height } (toggle button dimensions)
// - buttonSymbols: object { open: "✕", closed: "☰", animating: "⏸", locked: "🔒", error: "⚠" } (icons for each state)
// - buttonVisibility: object { alwaysVisible: boolean, hideOnCollapsed: boolean, fadeOnInactive: boolean }
// - buttonStyling: object { cssClasses: array, hoverEffects: boolean, activeState: boolean }

// ========================
// TOGGLE BUTTON STATE TABLE
// ========================

// | Panel State | Button Symbol | Button Visibility | Button Action |
// |-------------|---------------|-------------------|---------------|
// | Closed      | "☰" (hamburger) | Always visible | Open panel |
// | Open        | "✕" (X close) | Visible on hover/focus | Close panel |
// | Closing     | "⏸" (pause) | Always visible | Cancel/queue |

// ========================
// DETAILED BUTTON POSITIONING BY PANEL SIDE
// ========================

// LEFT PANEL (panelPosition: "left"):
// When Closed:
//   - Button Position: Outside panel, on the right edge of the viewport's left side
//   - Coordinates: { x: panelCollapsedWidth + 5px, y: panelTop + 10px }
//   - Anchor: Top-left of button aligns with calculated position
//   - Visual: [Panel][Button]     [Rest of UI]
//   - Symbol: "☰" (indicates "open panel to the right")

// When Open:
//   - Button Position: Inside panel, near the right edge (top-right corner of panel)
//   - Coordinates: { x: panelExpandedWidth - buttonWidth - 10px, y: panelTop + 10px }
//   - Anchor: Top-left of button aligns with calculated position
//   - Visual: [Panel Content    [✕]]     [Rest of UI]
//   - Symbol: "✕" (indicates "close this panel")

// RIGHT PANEL (panelPosition: "right"):
// When Closed:
//   - Button Position: Outside panel, on the left edge of the panel area
//   - Coordinates: { x: viewportWidth - panelCollapsedWidth - buttonWidth - 5px, y: panelTop + 10px }
//   - Anchor: Top-left of button aligns with calculated position
//   - Visual: [Rest of UI]     [Button][Panel]
//   - Symbol: "☰" (indicates "open panel to the left")

// When Open:
//   - Button Position: Inside panel, near the left edge (top-left corner of panel)
//   - Coordinates: { x: viewportWidth - panelExpandedWidth + 10px, y: panelTop + 10px }
//   - Anchor: Top-left of button aligns with calculated position
//   - Visual: [Rest of UI]     [[✕]    Panel Content]
//   - Symbol: "✕" (indicates "close this panel")

// TOP PANEL (panelPosition: "top"):
// When Closed:
//   - Button Position: Outside panel, on the bottom edge of the collapsed panel
//   - Coordinates: { x: panelLeft + 10px, y: panelCollapsedHeight + 5px }
//   - Anchor: Top-left of button aligns with calculated position
//   - Visual: [Panel]
//           [Button]
//           [Rest of UI]
//   - Symbol: "☰" (indicates "open panel downward")

// When Open:
//   - Button Position: Inside panel, near the bottom edge (bottom-left corner of panel)
//   - Coordinates: { x: panelLeft + 10px, y: panelExpandedHeight - buttonHeight - 10px }
//   - Anchor: Top-left of button aligns with calculated position
//   - Visual: [Panel Content]
//           [✕]
//           [Rest of UI]
//   - Symbol: "✕" (indicates "close this panel")

// BOTTOM PANEL (panelPosition: "bottom"):
// When Closed:
//   - Button Position: Outside panel, on the top edge of the collapsed panel
//   - Coordinates: { x: panelLeft + 10px, y: viewportHeight - panelCollapsedHeight - buttonHeight - 5px }
//   - Anchor: Top-left of button aligns with calculated position
//   - Visual: [Rest of UI]
//           [Button]
//           [Panel]
//   - Symbol: "☰" (indicates "open panel upward")

// When Open:
//   - Button Position: Inside panel, near the top edge (top-left corner of panel)
//   - Coordinates: { x: panelLeft + 10px, y: viewportHeight - panelExpandedHeight + 10px }
//   - Anchor: Top-left of button aligns with calculated position
//   - Visual: [Rest of UI]
//           [✕]
//           [Panel Content]
//   - Symbol: "✕" (indicates "close this panel")

// ========================
// BUTTON POSITIONING CALCULATION RULES
// ========================

// Position Calculation Variables:
// - panelCollapsedWidth/Height: dimensions when panel is closed
// - panelExpandedWidth/Height: dimensions when panel is open
// - panelLeft/Top: current panel position coordinates
// - buttonWidth/Height: toggle button dimensions
// - viewportWidth/Height: available screen space
// - margin: 5px outside panel, 10px inside panel (configurable)

// Position Update Triggers:
// - Panel state change (open/close)
// - Panel resize (if allowPanelResize is true)
// - Viewport resize (responsive repositioning)
// - Panel position change (if panel can be moved)
// - Animation progress (smooth position transitions)

// Responsive Behavior:
// - Small screens: Button may stack vertically or use smaller size
// - Touch devices: Larger touch target (minimum 44px × 44px)
// - High DPI displays: Sharp icons and appropriate sizing
// - Reduced motion: Instant position changes instead of smooth transitions

// Button Symbol State Transitions:
// - Closed → Opening: "☰" → "⏸" (immediate when animation starts)
// - Opening → Open: "⏸" → "✕" (when animation completes)
// - Open → Closing: "✕" → "⏸" (immediate when animation starts)
// - Closing → Closed: "⏸" → "☰" (when animation completes)
// - Any State → Locked: current symbol → "🔒" (immediate)
// - Any State → Error: current symbol → "⚠" (immediate)

// Symbol Meaning and User Intent:
// - "☰" (hamburger): Universal "menu" or "open" symbol - indicates panel can be opened
// - "✕" (X): Universal "close" symbol - indicates panel can be closed
// - "⏸" (pause): Indicates operation in progress, can be cancelled
// - "🔒" (lock): Indicates panel is locked and cannot be toggled
// - "⚠" (warning): Indicates error state requiring user attention

// Button Visibility Rules:
// - Closed state: Always visible (users need to know they can open panel)
// - Opening state: Always visible (users need cancel option)
// - Open state: Visible on panel hover or button focus (reduces visual clutter)
// - Closing state: Always visible (users need cancel option)
// - Locked state: Visible but grayed out (indicates unavailable state)
// - Error state: Always visible with alert styling (requires user attention)

// Button Interaction Behavior:
// - Single click: Execute primary action (open/close/cancel)
// - Double click: Quick toggle (skip animation if configured)
// - Right click: Show context menu with panel options (if enabled)
// - Keyboard focus: Show button tooltip with current action description
// - Touch/mobile: Larger touch target, haptic feedback on supported devices

// ========================
// EVENT HANDLER INTEGRATION SPECIFICATIONS
// ========================

// Lock Management Requirements:
// - Request singleton lock from Event Handler before panel state change
// - lockType: "panel_toggle" with priority based on user interaction type
// - lockTimeout: configurable timeout to prevent stuck panel states
// - lockData: { panelId, currentState, targetState, animationDuration, lockId }
// - Handle lock conflicts: queue toggle requests or cancel based on priority

// Conflict Resolution Patterns:
// - If drag operation is active: delay panel toggle until drag completes
// - If another panel is animating: queue toggle or cancel based on system policy
// - If container is being resized: coordinate timing to prevent layout conflicts
// - If multiple toggle requests: debounce and execute only the latest request

// Lock Release Conditions:
// - Animation completion (successful state change)
// - Animation cancellation (user interruption or error)
// - Timeout expiration (automatic release for stuck states)
// - Component destruction or behavior disabled
// - Error during animation or state change

// ========================
// CONTEXT SYSTEM INTEGRATION
// ========================

// Context Updates During Toggle Lifecycle:
// - panelStates.{containerId}.isOpen: boolean indicating current state
// - panelStates.{containerId}.isAnimating: boolean indicating transition state
// - panelStates.{containerId}.targetState: intended final state
// - panelStates.{containerId}.animationProgress: 0-1 animation completion
// - panelStates.{containerId}.lastToggleTime: timestamp of last state change
// - panelStates.{containerId}.toggleReason: user action that triggered change

// ChangeLog Integration Points:
// - "panel_toggle_requested": { panelId, currentState, targetState, trigger, timestamp }
// - "panel_animation_started": { panelId, fromState, toState, duration, timestamp }
// - "panel_animation_progress": { panelId, progress, currentSize, timestamp }
// - "panel_animation_completed": { panelId, finalState, actualDuration, timestamp }
// - "panel_toggle_cancelled": { panelId, reason, partialProgress, timestamp }
// - "panel_state_persisted": { panelId, state, storageKey, timestamp }

// ========================
// INTERFACE HANDLER COORDINATION
// ========================

// Component Interaction Management:
// - Update currentComponent when panel gains focus during toggle
// - Coordinate with component layout when panel size changes
// - Handle component visibility changes that affect panel behavior
// - Manage component z-index during panel animations
// - Coordinate with component focus management during state changes

// Layout Impact Communication:
// - Notify other components when panel size changes
// - Update available space calculations for sibling components
// - Coordinate responsive layout adjustments
// - Handle overflow and scrolling implications
// - Manage component positioning relative to panel state

// ========================
// IO HANDLER INTEGRATION
// ========================

// Input Event Handling:
// - click/touch: trigger panel toggle based on clickTarget configuration
// - keydown: handle keyboard shortcuts for panel toggle
// - hover: manage hover-based toggle with appropriate delays
// - resize: handle manual panel resizing when resizeHandle is enabled
// - focus: manage focus-based panel behavior
// - custom events: handle configured custom trigger events

// Event Data Requirements:
// - Click coordinates for determining toggle trigger validity
// - Keyboard event details for shortcut processing
// - Touch gesture data for mobile panel interaction
// - Resize handle interaction data for manual sizing
// - Focus event details for focus-based triggers
// - Custom event payload for extensible trigger mechanisms

// ========================
// BEHAVIOR LIFECYCLE METHODS
// ========================

// Initialization Methods:
// - attachToContainer(hostContainer): attach behavior to container
// - configureBehavior(options): set behavior configuration and validation
// - initializePanelState(): set initial panel state based on configuration
// - setupTriggerListeners(): attach event listeners for toggle triggers
// - registerWithEventHandler(): register for lock coordination
// - loadPersistedState(): restore panel state from storage if enabled

// Runtime Methods:
// - requestToggle(reason, source): initiate panel state change
// - startAnimation(fromState, toState): begin panel transition animation
// - updateAnimation(progress): update animation state and visual feedback
// - completeAnimation(finalState): finalize animation and update state
// - cancelAnimation(reason): abort current animation and cleanup
// - handleLockConflict(conflictData): resolve Event Handler conflicts
// - persistState(state): save panel state to storage if enabled

// Toggle Button Management Methods:
// - createToggleButton(): generate toggle button element with initial state
// - updateButtonPosition(): reposition button based on panel state and position
// - updateButtonSymbol(newState): change button icon/text for new panel state
// - updateButtonVisibility(panelState, userInteraction): show/hide button based on rules
// - handleButtonInteraction(eventType, eventData): process button clicks, hovers, focus
// - destroyToggleButton(): remove button element and cleanup event listeners
// - validateButtonConfiguration(): ensure button settings are valid and consistent

// Cleanup Methods:
// - detachFromContainer(): remove behavior from host container
// - releaseAllLocks(): release any active Event Handler locks
// - clearTriggerListeners(): remove all event listeners
// - resetPanelState(): reset to initial configuration state
// - destroyBehavior(): complete cleanup and destruction

// ========================
// INTEGRATION WITH TOOLS CONTAINER
// ========================

// ToolsContainer Property Integration:
// - Uses ToolsContainer.isPanelOpen for current state tracking
// - Applies ToolsContainer.panelSize for expanded/collapsed dimensions
// - Respects ToolsContainer.animationDuration for transition timing
// - Honors ToolsContainer.persistPanelState for state persistence
// - Implements ToolsContainer.panelPosition for layout positioning
// - Enforces ToolsContainer.allowPanelResize for resize functionality

// Panel State Effects on Tools:
// - Tool visibility changes based on panel state (collapsed may hide tools)
// - Tool layout adjustments when panel size changes
// - Tool interaction availability (some tools may be disabled when collapsed)
// - Tool selection behavior modification based on panel state
// - Tool keyboard navigation adaptation to panel configuration

// ========================
// ANIMATION SYSTEM INTEGRATION
// ========================

// CSS Animation Coordination:
// - Generate appropriate CSS transitions for smooth panel movement
// - Handle browser compatibility for animation features
// - Coordinate with CSS transforms for optimal performance
// - Manage animation timing functions and duration
// - Handle animation interruption and state cleanup

// JavaScript Animation Fallback:
// - Provide JavaScript-based animation for unsupported browsers
// - Implement custom easing functions when CSS options are limited
// - Handle complex animation sequences that CSS cannot support
// - Provide animation progress callbacks for advanced coordination
// - Manage high-frequency animation updates efficiently

// Performance Optimization:
// - Use CSS transforms instead of position changes when possible
// - Implement animation frame scheduling for smooth 60fps animations
// - Optimize animation calculations to prevent layout thrashing
// - Provide animation quality settings for performance-constrained devices
// - Cache animation calculations for repeated operations

// ========================
// STATE PERSISTENCE SYSTEM
// ========================

// Local Storage Integration:
// - Save panel state to localStorage with configurable keys
// - Handle storage quota limits and cleanup old state data
// - Provide fallback mechanisms when storage is unavailable
// - Implement state versioning for configuration changes
// - Handle privacy modes where storage may be restricted

// State Restoration Logic:
// - Restore panel state on component initialization
// - Validate restored state against current configuration
// - Handle migration of old state formats to new versions
// - Provide default fallbacks for corrupted or invalid state
// - Coordinate with user preferences and system settings

// ========================
// ERROR HANDLING AND RECOVERY
// ========================

// Error Scenarios:
// - Animation interrupted by user interaction or system events
// - Storage persistence fails due to quota or permissions
// - Lock conflicts cannot be resolved within timeout
// - Container size constraints conflict with panel requirements
// - Browser compatibility issues with animation features
// - Network issues affecting context updates during state changes

// Recovery Strategies:
// - Graceful fallback to instant state changes when animation fails
// - Default state restoration when persistence fails
// - Automatic lock release and retry mechanisms for conflicts
// - Adaptive panel sizing when constraints cannot be met
// - Progressive enhancement for animation feature availability
// - State synchronization recovery after connection issues

// ========================
// ACCESSIBILITY CONSIDERATIONS
// ========================

// Accessibility Features:
// - ARIA attributes for panel state announcement (aria-expanded, aria-hidden)
// - Keyboard navigation support for panel toggle functionality
// - Screen reader announcements for panel state changes
// - Focus management during panel transitions
// - High contrast mode support for panel visual indicators
// - Reduced motion preferences respect for animation control
// - Alternative interaction methods for motor impairments

// ARIA Integration:
// - aria-expanded: reflects current panel state for screen readers
// - aria-controls: links toggle triggers to panel elements
// - aria-label: provides descriptive labels for panel functionality
// - role: appropriate roles for panel and trigger elements
// - aria-live: announces dynamic panel state changes
// - tabindex: manages focus flow during panel state transitions

// ========================
// RESPONSIVE DESIGN INTEGRATION
// ========================

// Responsive Behavior:
// - Adapt panel sizing based on container and viewport dimensions
// - Handle mobile-specific panel interaction patterns
// - Coordinate with responsive layout systems
// - Provide touch-friendly toggle mechanisms
// - Handle orientation changes that affect panel layout
// - Adapt animation timing for device performance capabilities
