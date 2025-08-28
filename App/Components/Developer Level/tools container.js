/**
 * ToolsContainer - Specialized container for tool management and interaction
 * 
 * ARCHITECTURE OVERVIEW:
 * - Extends BaseContainer with tool-specific functionality
 * - Implements reactive architecture: declares tool capabilities, handlers execute behaviors
 * - Integrates with Event Handler for drag-and-drop coordination and panel management
 * - Uses behavior composition pattern for modular functionality
 * 
 * INHERITANCE STRUCTURE:
 * BaseContainer (foundation)
 * └── ToolsContainer (specialized tool management)
 *     ├── DragAndDropBehavior.js (enables tool dragging to canvas)
 *     └── ToolPanelToggleBehavior.js (manages panel open/close states)
 * 
 * REACTIVE INTEGRATION POINTS:
 * - IO Handler: Captures tool interaction events (click, drag, hover)
 * - Interface Handler: Detects tool enter/exit states and updates context
 * - Event Handler: Manages drag conflicts and panel state locks
 * - ChangeLog: Coordinates tool state changes across handlers
 */

// Import BaseContainer if in Node.js environment
if (typeof require !== 'undefined') {
    const BaseContainer = require('./base container.js');
    if (typeof module !== 'undefined') {
        global.BaseContainer = BaseContainer;
    }
}

/**
 * ToolsContainer class - Extends BaseContainer with tool management capabilities
 */
class ToolsContainer extends BaseContainer {
    constructor(containerId = null, parent = null, options = {}) {
        // Initialize as 'tools' type container
        super(containerId, parent, 'tools');
        
        // ========================
        // TOOL MANAGEMENT PROPERTIES
        // ========================
        
        // Start with empty tools array as specified
        this.tools = [];
        // Note: activeTools and selectedTools arrays removed - state managed by Event Handler
        this.toolCategories = options.toolCategories || ['drawing', 'text', 'shapes', 'selection', 'container', 'form'];
        this.toolLayout = this._validateToolLayout(options.toolLayout || 'grid');
        
        // ========================
        // PANEL STATE PROPERTIES
        // ========================
        
        this.isPanelOpen = options.isPanelOpen !== undefined ? options.isPanelOpen : true;
        
        // Calculate dynamic height based on available space
        const availableHeight = this._calculateAvailableHeight(options);
        
        this.panelSize = {
            expanded: { width: 200, height: availableHeight },
            collapsed: { width: 0, height: availableHeight },
            ...options.panelSize
        };
        this.animationDuration = options.animationDuration || 300;
        this.persistPanelState = options.persistPanelState !== undefined ? options.persistPanelState : true;
        this.panelPosition = this._validatePanelPosition(options.panelPosition || 'left');
        this.allowPanelResize = options.allowPanelResize !== undefined ? options.allowPanelResize : true;
        
        // ========================
        // DRAG AND DROP PROPERTIES
        // ========================
        
        this.dragEnabled = options.dragEnabled !== undefined ? options.dragEnabled : true;
        this.dropZones = options.dropZones || ['canvas-area']; // Default to canvas area as drop zone
        this.dragPreview = {
            enabled: true,
            opacity: 0.7,
            offset: { x: 10, y: 10 },
            ...options.dragPreview
        };
        this.snapToGrid = options.snapToGrid !== undefined ? options.snapToGrid : false;
        this.dragConstraints = {
            boundary: 'viewport',
            axis: 'both',
            ...options.dragConstraints
        };
        this.returnOnFailedDrop = options.returnOnFailedDrop !== undefined ? options.returnOnFailedDrop : true;
        
        // ========================
        // TOOL INTERACTION PROPERTIES (Event Handler Managed)
        // ========================
        
        // Note: Tool selection and activation now handled by Event Handler and DragAndDropBehavior
        // These properties maintained for compatibility and configuration
        this.selectionMode = this._validateSelectionMode(options.selectionMode || 'single');
        this.toolHoverEffects = options.toolHoverEffects !== undefined ? options.toolHoverEffects : true;
        this.doubleClickAction = this._validateDoubleClickAction(options.doubleClickAction || 'activate');
        this.contextMenuEnabled = options.contextMenuEnabled !== undefined ? options.contextMenuEnabled : true;
        this.keyboardShortcuts = options.keyboardShortcuts || {};
        
        // ========================
        // VISUAL CUSTOMIZATION PROPERTIES
        // ========================
        
        this.toolSpacing = options.toolSpacing || 8;
        this.toolSize = { width: 32, height: 32, ...options.toolSize };
        this.showToolLabels = options.showToolLabels !== undefined ? options.showToolLabels : true;
        this.showToolIcons = options.showToolIcons !== undefined ? options.showToolIcons : true;
        this.theme = this._validateTheme(options.theme || 'auto');
        this.iconSet = options.iconSet || 'default';
        
        // ========================
        // BEHAVIOR INTEGRATION PROPERTIES
        // ========================
        
        this.enabledBehaviors = options.enabledBehaviors || ['DragAndDropBehavior', 'ToolPanelToggleBehavior'];
        this.behaviorPriority = {
            'DragAndDropBehavior': 1,
            'ToolPanelToggleBehavior': 2,
            ...options.behaviorPriority
        };
        this.behaviorState = {};
        this.allowBehaviorToggle = options.allowBehaviorToggle !== undefined ? options.allowBehaviorToggle : true;
        
        // Behavior instances (will be set during initialization)
        this.dragAndDropBehavior = null;
        this.toggleBehavior = null;
        
        // ========================
        // EVENT HANDLER INTEGRATION PROPERTIES
        // ========================
        
        this.eventPriority = options.eventPriority || 10;
        this.lockOnDrag = options.lockOnDrag !== undefined ? options.lockOnDrag : true;
        this.lockTimeout = options.lockTimeout || 5000;
        this.conflictResolution = this._validateConflictResolution(options.conflictResolution || 'queue');
        
        // ========================
        // VALIDATION AND CONSTRAINTS PROPERTIES
        // ========================
        
        this.allowedToolTypes = options.allowedToolTypes || ['brush', 'text', 'shape', 'selector', 'eraser', 'container', 'drawing', 'form'];
        this.maxTools = options.maxTools || 50;
        this.minTools = options.minTools || 0;
        this.toolValidation = options.toolValidation || {};
        this.requiredCategories = options.requiredCategories || [];
        
        // Initialize the container with current state
        this._initializeContainer();
        
        console.log(`ToolsContainer created: ${this.containerId} (panel: ${this.isPanelOpen ? 'open' : 'closed'})`);
    }
    
    // ========================
    // VALIDATION METHODS
    // ========================
    
    _validateToolLayout(layout) {
        const validLayouts = ['grid', 'list', 'accordion', 'tabs'];
        if (!validLayouts.includes(layout)) {
            console.warn(`Invalid tool layout: ${layout}. Defaulting to 'grid'`);
            return 'grid';
        }
        return layout;
    }
    
    _validatePanelPosition(position) {
        const validPositions = ['left', 'right', 'top', 'bottom'];
        if (!validPositions.includes(position)) {
            console.warn(`Invalid panel position: ${position}. Defaulting to 'left'`);
            return 'left';
        }
        return position;
    }
    
    _validateSelectionMode(mode) {
        const validModes = ['single', 'multiple', 'none'];
        if (!validModes.includes(mode)) {
            console.warn(`Invalid selection mode: ${mode}. Defaulting to 'single'`);
            return 'single';
        }
        return mode;
    }
    
    _validateDoubleClickAction(action) {
        const validActions = ['activate', 'edit', 'duplicate', 'none'];
        if (!validActions.includes(action)) {
            console.warn(`Invalid double click action: ${action}. Defaulting to 'activate'`);
            return 'activate';
        }
        return action;
    }
    
    _validateTheme(theme) {
        const validThemes = ['light', 'dark', 'auto'];
        if (!validThemes.includes(theme)) {
            console.warn(`Invalid theme: ${theme}. Defaulting to 'auto'`);
            return 'auto';
        }
        return theme;
    }
    
    _validateConflictResolution(resolution) {
        const validResolutions = ['queue', 'override', 'cancel'];
        if (!validResolutions.includes(resolution)) {
            console.warn(`Invalid conflict resolution: ${resolution}. Defaulting to 'queue'`);
            return 'queue';
        }
        return resolution;
    }
    
    // ========================
    // DYNAMIC SIZING METHODS
    // ========================
    
    _calculateAvailableHeight(options) {
        // If height is explicitly provided in options, use it
        if (options.panelSize && options.panelSize.expanded && options.panelSize.expanded.height) {
            return options.panelSize.expanded.height;
        }
        
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
            return 400; // Default for Node.js environment
        }
        
        // Try to get height from app container
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            const containerHeight = appContainer.getBoundingClientRect().height;
            // Use 100% of container height with reasonable minimum
            return Math.max(300, containerHeight);
        }
        
        // Fallback to full viewport height
        return Math.max(300, window.innerHeight);
    }
    
    // ========================
    // INITIALIZATION METHODS
    // ========================
    
    _initializeContainer() {
        // Set initial metadata (data only - no visual operations)
        // Store visual specifications for Graphics Handler (no direct application)
        this._storeVisualSpecs();
        
        // Initialize behaviors
        this._initializeBehaviors();
    }
    
    _initializeBehaviors() {
        // Initialize behavior states
        this.enabledBehaviors.forEach(behaviorName => {
            this.behaviorState[behaviorName] = {
                enabled: true,
                initialized: false,
                lastUsed: null
            };
        });

        // Initialize DragAndDropBehavior if enabled
        if (this.enabledBehaviors.includes('DragAndDropBehavior')) {
            this._initializeDragAndDropBehavior();
        }

        console.log(`Behaviors initialized: ${this.enabledBehaviors.join(', ')}`);
    }

    _initializeDragAndDropBehavior() {
        // Configure drag behavior for this container
        this.dragBehaviorConfig = {
            enabled: this.dragEnabled,
            dragThreshold: 5,
            dragAxis: 'both',
            snapToGrid: false,
            gridSize: { x: 10, y: 10 },
            showDragPreview: true,
            previewOpacity: this.dragPreview.opacity,
            dropZones: this.dropZones,
            dragConstraints: this.dragConstraints,
            returnOnFailedDrop: this.returnOnFailedDrop,
            throttleMove: 16, // 60fps
            useTransform: true,
            hardwareAcceleration: true
        };

        // Mark as initialized
        this.behaviorState['DragAndDropBehavior'].initialized = true;
        
        console.log('DragAndDropBehavior configuration ready for attachment');
    }    // ========================
    // GRAPHICS HANDLER INTEGRATION
    // ========================

    _storeVisualSpecs() {
        // Define ALL visual specifications for Graphics Handler
        // Components declare visual requirements, Graphics Handler implements them
        this.visualSpecs = {
            baseStyles: {
                position: 'relative',
                backgroundColor: this.theme === 'dark' ? '#2d2d2d' : '#f5f5f5',
                border: `1px solid ${this.theme === 'dark' ? '#404040' : '#ddd'}`,
                borderRadius: '4px',
                overflow: 'hidden',
                transition: `width ${this.animationDuration}ms ease-in-out`
            },
            classes: {
                base: ['tools-container', `panel-${this.panelPosition}`, `layout-${this.toolLayout}`, `theme-${this.theme}`],
                states: {
                    open: ['panel-open'],
                    closed: ['panel-collapsed']
                }
            },
            dimensions: {
                expanded: this.panelSize.expanded,
                collapsed: this.panelSize.collapsed
            },
            animations: {
                panelToggle: {
                    duration: this.animationDuration,
                    easing: 'ease-in-out',
                    properties: ['width', 'opacity']
                }
            },
            zIndex: 100 // Override default z-index for panel visibility
        };
    }

    getVisualSpecs() {
        return this.visualSpecs;
    }

    // Returns graphics request for initial container setup
    getInitialGraphicsRequest() {
        const currentSize = this.isPanelOpen ? this.panelSize.expanded : this.panelSize.collapsed;
        const stateClasses = this.isPanelOpen ? 
            this.visualSpecs.classes.states.open : 
            this.visualSpecs.classes.states.closed;

        return {
            type: 'comprehensive_update',
            componentId: this.containerId,
            styles: {
                ...this.visualSpecs.baseStyles,
                width: `${currentSize.width}px`,
                height: `${currentSize.height}px`,
                zIndex: this.visualSpecs.zIndex
            },
            classes: {
                add: [...this.visualSpecs.classes.base, ...stateClasses]
            },
            options: {
                priority: 'high',
                batch: false
            }
        };
    }
    
    // ========================
    // TOOL MANAGEMENT METHODS
    // ========================
    
    addTool(toolItem) {
        // Validate tool item
        if (!this._validateToolItem(toolItem)) {
            throw new Error('Invalid tool item provided');
        }
        
        // Check constraints
        if (this.tools.length >= this.maxTools) {
            throw new Error(`Maximum tools limit reached: ${this.maxTools}`);
        }
        
        if (!this.allowedToolTypes.includes(toolItem.type)) {
            throw new Error(`Tool type not allowed: ${toolItem.type}`);
        }
        
        // Check for duplicate tool IDs
        if (this.tools.find(tool => tool.toolId === toolItem.toolId)) {
            throw new Error(`Tool ID already exists: ${toolItem.toolId}`);
        }
        
        // Add tool to collection
        this.tools.push(toolItem);
        
        console.log(`Tool added: ${toolItem.toolId} (${toolItem.type})`);
        return this;
    }
    
    removeTool(toolId) {
        const index = this.tools.findIndex(tool => tool.toolId === toolId);
        if (index > -1) {
            const removedTool = this.tools.splice(index, 1)[0];
            
            // Note: Tool state management now handled by Event Handler
            // No need to manually remove from activeTools/selectedTools arrays
            
            console.log(`Tool removed: ${toolId}`);
            return removedTool;
        }
        return null;
    }
    
    getTool(toolId) {
        return this.tools.find(tool => tool.toolId === toolId);
    }
    
    getToolsByCategory(category) {
        return this.tools.filter(tool => tool.type === category);
    }
    
    getToolsByType(type) {
        return this.tools.filter(tool => tool.type === type);
    }
    
    // ========================
    // DRAG AND DROP INTERACTION METHODS  
    // ========================
    // Note: These methods are called by DragAndDropBehavior through Event Handler

    startToolDrag(parameters) {
        const { toolId, position, event } = parameters;
        const tool = this.getTool(toolId);
        
        if (!tool || !tool.isEnabled || !this.dragEnabled) {
            return { 
                success: false, 
                reason: tool ? 'drag_disabled' : 'tool_not_found' 
            };
        }

        // Check if tool is draggable
        if (tool.isDraggable === false) {
            return { 
                success: false, 
                reason: 'tool_not_draggable' 
            };
        }

        // Mark tool as being dragged
        tool.isDragging = true;
        tool.dragStartTime = Date.now();
        tool.dragStartPosition = position;

        return {
            success: true,
            graphics_request: {
                type: 'comprehensive_update',
                componentId: tool.toolElement?.id || `tool-${toolId}`,
                styles: {
                    opacity: this.dragPreview.opacity,
                    transform: 'scale(0.95)',
                    zIndex: 1000,
                    pointerEvents: 'none'
                },
                classes: {
                    add: ['dragging', 'drag-source']
                },
                options: {
                    priority: 'high'
                }
            },
            changeLog: {
                type: 'tool_drag_started',
                data: {
                    toolId: toolId,
                    sourceContainer: this.containerId,
                    position: position,
                    timestamp: Date.now()
                }
            }
        };
    }

    updateToolDrag(parameters) {
        const { toolId, position, hoveredTarget } = parameters;
        const tool = this.getTool(toolId);
        
        if (!tool || !tool.isDragging) {
            return { success: false, reason: 'invalid_drag_state' };
        }

        // Update drag position
        tool.currentDragPosition = position;
        
        // Validate drop zone if provided
        let dropZoneValid = false;
        if (hoveredTarget) {
            dropZoneValid = this.validateDropZone(hoveredTarget, tool);
        }

        return {
            success: true,
            graphics_request: {
                type: 'comprehensive_update',
                componentId: tool.toolElement?.id || `tool-${toolId}`,
                styles: {
                    transform: `translate(${position.x - tool.dragStartPosition.x}px, ${position.y - tool.dragStartPosition.y}px) scale(0.95)`,
                    opacity: this.dragPreview.opacity
                },
                options: {
                    priority: 'high',
                    batch: true
                }
            },
            dragInfo: {
                valid: dropZoneValid,
                hoveredTarget: hoveredTarget,
                position: position
            }
        };
    }

    completeToolDrop(parameters) {
        const { toolId, targetContainer, position } = parameters;
        const tool = this.getTool(toolId);
        
        if (!tool || !tool.isDragging) {
            return { success: false, reason: 'invalid_drag_state' };
        }

        // Validate the drop
        const dropValid = this.validateDropZone(targetContainer, tool);
        
        if (dropValid) {
            // Successful drop - tool moves to target
            return this._executeSuccessfulToolDrop(tool, targetContainer, position);
        } else {
            // Failed drop - return to origin
            return this._returnToolToOrigin(tool);
        }
    }

    cancelToolDrag(parameters) {
        const { toolId, reason } = parameters;
        const tool = this.getTool(toolId);
        
        if (!tool || !tool.isDragging) {
            return { success: false, reason: 'invalid_drag_state' };
        }

        return this._returnToolToOrigin(tool, reason);
    }

    validateDropZone(targetElement, tool) {
        if (!targetElement || !tool) {
            return false;
        }

        // Check if target is in valid drop zones
        const targetId = targetElement.id || targetElement.dataset?.dropZone;
        
        if (this.dropZones.length > 0) {
            return this.dropZones.includes(targetId);
        }

        // If no specific drop zones defined, check for data attributes
        return targetElement.hasAttribute('data-drop-zone') || 
               targetElement.classList.contains('drop-zone');
    }

    // ========================
    // PRIVATE DRAG HELPER METHODS
    // ========================

    _executeSuccessfulToolDrop(tool, targetContainer, position) {
        // Reset drag state
        tool.isDragging = false;
        tool.dragStartTime = null;
        tool.dragStartPosition = null;
        tool.currentDragPosition = null;

        return {
            success: true,
            graphics_request: {
                type: 'comprehensive_update',
                componentId: tool.toolElement?.id || `tool-${tool.toolId}`,
                styles: {
                    transform: 'none',
                    opacity: '1',
                    zIndex: 'auto',
                    pointerEvents: 'auto'
                },
                classes: {
                    remove: ['dragging', 'drag-source'],
                    add: ['dropped']
                },
                animation: {
                    duration: 200,
                    easing: 'ease-out'
                }
            },
            changeLog: {
                type: 'tool_drop_completed',
                data: {
                    toolId: tool.toolId,
                    sourceContainer: this.containerId,
                    targetContainer: targetContainer.id || 'unknown',
                    position: position,
                    success: true,
                    timestamp: Date.now()
                }
            },
            dropResult: {
                toolId: tool.toolId,
                targetContainer: targetContainer,
                position: position
            }
        };
    }

    _returnToolToOrigin(tool, reason = 'cancelled') {
        // Reset drag state
        tool.isDragging = false;
        const startPos = tool.dragStartPosition || { x: 0, y: 0 };
        tool.dragStartTime = null;
        tool.dragStartPosition = null;
        tool.currentDragPosition = null;

        return {
            success: true,
            graphics_request: {
                type: 'comprehensive_update',
                componentId: tool.toolElement?.id || `tool-${tool.toolId}`,
                animation: {
                    transform: 'none',
                    opacity: '1',
                    duration: 300,
                    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                },
                styles: {
                    zIndex: 'auto',
                    pointerEvents: 'auto'
                },
                classes: {
                    remove: ['dragging', 'drag-source']
                }
            },
            changeLog: {
                type: 'tool_drag_cancelled',
                data: {
                    toolId: tool.toolId,
                    sourceContainer: this.containerId,
                    reason: reason,
                    timestamp: Date.now()
                }
            }
        };
    }

    // ========================
    // PANEL STATE METHODS
    // ========================
    // Note: These methods are called by ToolPanelToggleBehavior, not internally
    
    openPanel() {
        if (this.isPanelOpen) {
            return null; // No graphics request needed
        }
        
        this.isPanelOpen = true;
        this.lastUsed = Date.now();

        // Return graphics request for opening animation
        return {
            type: 'panel_animation',
            componentId: this.containerId,
            animation: {
                ...this.visualSpecs.animations.panelToggle,
                keyframes: [
                    { 
                        width: `${this.panelSize.collapsed.width}px`,
                        opacity: 0.8
                    },
                    { 
                        width: `${this.panelSize.expanded.width}px`,
                        opacity: 1
                    }
                ]
            },
            classes: {
                add: this.visualSpecs.classes.states.open,
                remove: this.visualSpecs.classes.states.closed
            },
            finalStyles: {
                width: `${this.panelSize.expanded.width}px`,
                height: `${this.panelSize.expanded.height}px`,
                opacity: 1
            },
            options: {
                priority: 'high',
                batch: false
            }
        };
    }
    
    closePanel() {
        if (!this.isPanelOpen) {
            return null; // No graphics request needed
        }
        
        this.isPanelOpen = false;

        // Return graphics request for closing animation
        return {
            type: 'panel_animation',
            componentId: this.containerId,
            animation: {
                ...this.visualSpecs.animations.panelToggle,
                keyframes: [
                    { 
                        width: `${this.panelSize.expanded.width}px`,
                        opacity: 1
                    },
                    { 
                        width: `${this.panelSize.collapsed.width}px`,
                        opacity: 0.8
                    }
                ]
            },
            classes: {
                add: this.visualSpecs.classes.states.closed,
                remove: this.visualSpecs.classes.states.open
            },
            finalStyles: {
                width: `${this.panelSize.collapsed.width}px`,
                height: `${this.panelSize.collapsed.height}px`,
                opacity: 0.8
            },
            options: {
                priority: 'high',
                batch: false
            }
        };
    }
    
    
    setPanelPosition(position) {
        const validPosition = this._validatePanelPosition(position);
        if (validPosition !== this.panelPosition) {
            const oldPosition = this.panelPosition;
            this.panelPosition = validPosition;
            
            // Return graphics request for position change
            return {
                type: 'class_update',
                componentId: this.containerId,
                classes: {
                    add: [`panel-${this.panelPosition}`],
                    remove: [`panel-${oldPosition}`]
                },
                options: {
                    priority: 'medium',
                    batch: true
                }
            };
        }
        return null; // No change needed
    }
    
    // ========================
    // BEHAVIOR MANAGEMENT METHODS
    // ========================
    
    enableBehavior(behaviorName) {
        if (this.enabledBehaviors.includes(behaviorName)) {
            this.behaviorState[behaviorName].enabled = true;
            console.log(`Behavior enabled: ${behaviorName}`);
        }
        return this;
    }
    
    disableBehavior(behaviorName) {
        if (this.allowBehaviorToggle && this.behaviorState[behaviorName]) {
            this.behaviorState[behaviorName].enabled = false;
            console.log(`Behavior disabled: ${behaviorName}`);
        }
        return this;
    }
    
    isBehaviorEnabled(behaviorName) {
        return this.behaviorState[behaviorName]?.enabled || false;
    }
    
    getBehaviorState(behaviorName) {
        return this.behaviorState[behaviorName] || null;
    }

    getDragAndDropBehaviorSchema() {
        if (!this.enabledBehaviors.includes('DragAndDropBehavior')) {
            return null;
        }

        return {
            "startToolDrag": {
                "enabled": this.dragEnabled,
                "triggers": ["mousedown", "touchstart"],
                "parameters": { 
                    "toolId": "string", 
                    "position": "coordinates", 
                    "event": "DOM_event",
                    "graphics_handler": true 
                }
            },
            "updateToolDrag": {
                "enabled": this.dragEnabled,
                "triggers": ["mousemove", "touchmove"],
                "parameters": { 
                    "toolId": "string", 
                    "position": "coordinates", 
                    "hoveredTarget": "DOM_element",
                    "graphics_handler": true 
                }
            },
            "completeToolDrop": {
                "enabled": this.dragEnabled,
                "triggers": ["mouseup", "touchend"],
                "parameters": { 
                    "toolId": "string", 
                    "targetContainer": "DOM_element", 
                    "position": "coordinates",
                    "graphics_handler": true 
                }
            },
            "cancelToolDrag": {
                "enabled": this.dragEnabled,
                "triggers": ["Escape", "contextmenu"],
                "parameters": { 
                    "toolId": "string", 
                    "reason": "cancellation_type",
                    "graphics_handler": true 
                }
            },
            "validateDropZone": {
                "enabled": this.dragEnabled,
                "triggers": ["mouseover", "mouseenter"],
                "parameters": { 
                    "targetElement": "DOM_element", 
                    "tool": "tool_object",
                    "graphics_handler": true 
                }
            }
        };
    }

    // ========================
    // VALIDATION HELPER METHODS
    // ========================
    
    _validateToolItem(toolItem) {
        const requiredProperties = ['toolId', 'name', 'type'];
        
        if (!toolItem || typeof toolItem !== 'object') {
            return false;
        }
        
        for (const prop of requiredProperties) {
            if (!toolItem.hasOwnProperty(prop) || !toolItem[prop]) {
                console.warn(`Tool item missing required property: ${prop}`);
                return false;
            }
        }
        
        return true;
    }
    
    // ========================
    // VALIDATION METHODS
    // ========================
    
    validateConfiguration() {
        const issues = [];
        
        // Check required categories
        for (const category of this.requiredCategories) {
            if (!this.getToolsByCategory(category).length) {
                issues.push(`Required category missing: ${category}`);
            }
        }
        
        // Check tool limits
        if (this.tools.length < this.minTools) {
            issues.push(`Minimum tools requirement not met: ${this.tools.length}/${this.minTools}`);
        }
        
        if (this.tools.length > this.maxTools) {
            issues.push(`Maximum tools limit exceeded: ${this.tools.length}/${this.maxTools}`);
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
    
    // ========================
    // UTILITY METHODS
    // ========================
    
    getState() {
        return {
            ...this.toJSON(),
            isPanelOpen: this.isPanelOpen,
            panelPosition: this.panelPosition,
            toolCount: this.tools.length,
            // Note: activeToolCount and selectedToolCount removed - managed by Event Handler
            enabledBehaviors: this.enabledBehaviors,
            theme: this.theme,
            toolLayout: this.toolLayout
        };
    }
    
    reset() {
        // Clear all tools
        this.tools = [];
        // Note: activeTools and selectedTools arrays removed - state managed by Event Handler
        
        // Reset to initial state
        this.isPanelOpen = true;
        // Note: Panel opening will be handled by ToolPanelToggleBehavior
        
        // Update metadata
        console.log(`ToolsContainer reset: ${this.containerId}`);
        return this;
    }
    
    // ========================
    // STATIC HELPER METHODS
    // ========================
    
    static createToolItem(toolId, name, type, options = {}) {
        return {
            toolId: toolId,
            name: name,
            type: type,
            icon: options.icon || '',
            description: options.description || '',
            isActive: false,
            isEnabled: options.isEnabled !== undefined ? options.isEnabled : true,
            isDraggable: options.isDraggable !== undefined ? options.isDraggable : true,
            position: options.position || { x: 0, y: 0 },
            size: options.size || { width: 32, height: 32 },
            config: options.config || {},
            behaviorOverrides: options.behaviorOverrides || {}
        };
    }
}

// ========================
// GRAPHICS HANDLER COMPLIANCE STATUS: ✅ COMPLETE
// ========================
// All direct DOM manipulation methods removed
// All visual operations now return graphics requests
// Component is data-only with visual specifications storage
// Full Graphics Handler integration implemented

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolsContainer;
} else if (typeof window !== 'undefined') {
    window.ToolsContainer = ToolsContainer;
}

// Tool Management Properties
// - tools: array of ToolItem objects (collection of available tools in this container)
// Note: activeTools and selectedTools arrays removed - state managed by Event Handler
// - toolCategories: array of strings (groupings like "drawing", "text", "shapes", "selection")
// - toolLayout: choose("grid", "list", "accordion", "tabs") (how tools are visually arranged)

// Panel State Properties
// - isPanelOpen: boolean (whether the tools panel is currently expanded)
// - panelSize: object { expanded: {width, height}, collapsed: {width, height} } (panel dimensions in different states)
// - animationDuration: number (milliseconds for panel open/close animations)
// - persistPanelState: boolean (whether panel state survives page refresh)
// - panelPosition: choose("left", "right", "top", "bottom") (where panel is docked)
// - allowPanelResize: boolean (whether users can manually resize the panel)

// Drag and Drop Properties
// - dragEnabled: boolean (whether tools can be dragged from this container)
// - dropZones: array of string (container IDs that can accept dropped tools from this toolbar)
// - dragPreview: object (settings for visual feedback during drag operations)
// - snapToGrid: boolean (whether dropped tools snap to grid positions)
// - dragConstraints: object (boundaries and rules for drag operations)
// - returnOnFailedDrop: boolean (whether tools return to origin if drop fails)

// Tool Interaction Properties (Event Handler Managed)
// - selectionMode: choose("single", "multiple", "none") (configuration for Event Handler)
// Note: Tool selection and activation state managed by Event Handler and DragAndDropBehavior
// - toolHoverEffects: boolean (whether tools show visual feedback on hover)
// - doubleClickAction: choose("activate", "edit", "duplicate", "none") (what happens on tool double-click)
// - contextMenuEnabled: boolean (whether tools show right-click menus)
// - keyboardShortcuts: object (mapping of keyboard shortcuts to tool actions)

// Visual Customization Properties
// - toolSpacing: number (pixels between tools in the layout)
// - toolSize: object { width, height } (default size for tool representations)
// - showToolLabels: boolean (whether to display tool names/descriptions)
// - showToolIcons: boolean (whether to display tool icons)
// - theme: choose("light", "dark", "auto") (visual theme for the tools container)
// - iconSet: string (which icon set to use for tool representations)

// Behavior Integration Properties
// - enabledBehaviors: array of strings (which behaviors are currently active)
// - behaviorPriority: object (order of behavior execution when conflicts occur)
// - behaviorState: object (current state data for each active behavior)
// - allowBehaviorToggle: boolean (whether behaviors can be enabled/disabled at runtime)

// Event Handler Integration Properties
// - eventPriority: number (priority level for Event Handler coordination)
// - lockOnDrag: boolean (whether to request singleton lock during drag operations)
// - lockTimeout: number (milliseconds before automatically releasing locks)
// - conflictResolution: choose("queue", "override", "cancel") (how to handle event conflicts)

// Validation and Constraints Properties
// - allowedToolTypes: array of strings (which types of tools this container can hold)
// - maxTools: number (maximum number of tools this container can contain)
// - minTools: number (minimum number of tools required in this container)
// - toolValidation: object (rules for validating tool configurations)
// - requiredCategories: array of strings (tool categories that must be present)

// ========================
// TOOL ITEM STRUCTURE
// ========================

// ToolItem Object Properties:
// - toolId: string (unique identifier for this tool)
// - name: string (human-readable name for the tool)
// - type: string (tool category like "brush", "text", "shape", "selector")
// - icon: string (path or reference to tool icon)
// - description: string (tooltip/help text for the tool)
// - isActive: boolean (whether this tool is currently being used)
// - isEnabled: boolean (whether this tool is available for use)
// - isDraggable: boolean (whether this specific tool can be dragged)
// - position: object { x, y } (position within the tools container)
// - size: object { width, height } (size of this tool's representation)
// - config: object (tool-specific configuration and settings)
// - behaviorOverrides: object (tool-specific behavior modifications)

// ========================
// BEHAVIOR COMPOSITION DEPENDENCIES
// ========================

// DragAndDropBehavior.js Requirements:
// - Must integrate with Event Handler for drag conflict management
// - Must update context with drag state changes for Interface Handler tracking
// - Must respect BaseContainer's isDraggable property
// - Must validate drop zones against ToolsContainer's dropZones array
// - Must handle dragPreview visual feedback
// - Must implement returnOnFailedDrop logic
// - Must respect dragConstraints boundaries
// - Must trigger ChangeLog updates for cross-handler coordination

// ToolPanelToggleBehavior.js Requirements:
// - Must integrate with Event Handler for panel state locks (prevent simultaneous toggles)
// - Must animate between panelSize.expanded and panelSize.collapsed dimensions
// - Must respect animationDuration timing
// - Must update BaseContainer's dimensions during animation
// - Must persist panel state if persistPanelState is true
// - Must handle allowPanelResize logic if enabled
// - Must respect panelPosition constraints
// - Must trigger ChangeLog updates when panel state changes

// ========================
// HANDLER INTEGRATION SPECIFICATIONS
// ========================

// IO Handler Integration:
// - Capture mouse events on tools (mousedown, mousemove, mouseup for dragging)
// - Capture click events for tool selection and activation
// - Capture keyboard events for shortcuts and navigation
// - Capture touch events for mobile drag-and-drop support
// - Update context with user interaction data for other handlers

// Interface Handler Integration:
// - Detect when user enters/exits tool areas
// - Track which tools are being hovered or interacted with
// - Update currentComponent context when tools are selected
// - Monitor tool container visibility and active state
// - Coordinate with other components when tools are dropped

// Event Handler Integration:
// - Request singleton locks during drag operations to prevent conflicts
// - Manage panel toggle locks to prevent simultaneous open/close operations
// - Handle drag conflict resolution when multiple tools are dragged
// - Coordinate tool activation to ensure only allowed number are active
// - Release locks appropriately when operations complete

// ChangeLog Integration:
// - Log tool selection changes for cross-handler awareness
// - Log panel state changes for persistence and coordination
// - Log drag start/end events for behavior synchronization
// - Log tool activation/deactivation for state management
// - Monitor changes from other handlers that affect tool container state

// ========================
// REACTIVE ARCHITECTURE COMPLIANCE
// ========================

// DECLARATION PATTERN (What ToolsContainer declares):
// - "I can hold and manage tools of specified types"
// - "I can drag tools to registered drop zones"
// - "I can toggle between expanded and collapsed panel states"
// - "I require Event Handler coordination for drag conflicts"
// - "I support keyboard shortcuts for tool activation"
// - "I can validate tool configurations against constraints"

// EXECUTION PATTERN (What handlers execute):
// - IO Handler: "User dragged tool X, updating context with drag state"
// - Interface Handler: "Tool Y entered active state, updating currentComponent"
// - Event Handler: "Requesting lock for drag operation, managing conflicts"
// - ChangeLog: "Tool state changed, notifying all handlers"

// BEHAVIOR COMPOSITION PATTERN:
// - ToolsContainer provides the structure and properties
// - DragAndDropBehavior adds drag functionality using container's properties
// - ToolPanelToggleBehavior adds panel management using container's properties
// - Event Handler coordinates behavior conflicts and provides locks
// - All behaviors respect BaseContainer's core constraints and validations

// ========================
// CONTEXT SYSTEM INTEGRATION
// ========================

// Context Properties This Component Affects:
// - currentComponent: when tools are selected or panel is focused
// - dragState: during drag operations (tool being dragged, drop zones, etc.)
// - componentStates: tool container's current state (panel open/closed, active tools)
// - userInteractions: tool clicks, drags, selections, panel toggles
// - eventQueue: drag events, panel events, tool activation events
// - lockStates: drag locks, panel locks, tool activation locks

// Context Properties This Component Reads:
// - canvasState: to determine valid drop zones for tools
// - globalLocks: to check if drag operations are allowed
// - currentTheme: to apply appropriate visual styling
// - userPreferences: for panel state persistence and shortcut customization
// - performanceMode: to adjust animation smoothness and effects

// ========================
// EXTENSION POINTS
// ========================

// Future Extensibility:
// - Additional behaviors can be composed (ToolGroupingBehavior, ToolSearchBehavior)
// - Custom tool types can be registered via allowCustomTools
// - Third-party plugins can extend tool functionality
// - Custom drag constraints can be implemented
// - Alternative panel animations can be added
// - Tool marketplace integration points available

// ========================
// PERFORMANCE CONSIDERATIONS
// ========================

// Optimization Requirements:
// - Efficient tool rendering for large tool collections
// - Smooth panel animations without blocking UI
// - Optimized drag preview generation
// - Debounced context updates during rapid interactions
// - Lazy loading of tool icons and resources
// - Memory management for active tool states