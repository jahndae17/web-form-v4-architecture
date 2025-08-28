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
        this.activeTools = [];
        this.toolCategories = options.toolCategories || ['drawing', 'text', 'shapes', 'selection'];
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
        this.dropZones = options.dropZones || [];
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
        // TOOL INTERACTION PROPERTIES
        // ========================
        
        this.selectionMode = this._validateSelectionMode(options.selectionMode || 'single');
        this.selectedTools = [];
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
        
        this.allowedToolTypes = options.allowedToolTypes || ['brush', 'text', 'shape', 'selector', 'eraser'];
        this.maxTools = options.maxTools || 50;
        this.minTools = options.minTools || 0;
        this.toolValidation = options.toolValidation || {};
        this.requiredCategories = options.requiredCategories || [];
        
        // ========================
        // Z-INDEX OVERRIDE FOR ANIMATION VISIBILITY
        // ========================
        
        // Override default z-index (depth * 10 = 0) to ensure panel stays visible during animations
        this.setZIndex(options.zIndex || 100);
        
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
        // Set initial dimensions based on panel state
        const currentSize = this.isPanelOpen ? this.panelSize.expanded : this.panelSize.collapsed;
        this.setDimensions(currentSize.width, currentSize.height);
        
        // Add tools-specific CSS classes
        this.addCssClass('tools-container');
        this.addCssClass(`panel-${this.panelPosition}`);
        this.addCssClass(`layout-${this.toolLayout}`);
        this.addCssClass(`theme-${this.theme}`);
        
        if (this.isPanelOpen) {
            this.addCssClass('panel-open');
        } else {
            this.addCssClass('panel-collapsed');
        }
        
        // Set initial metadata
        this.setMetadata('panelState', this.isPanelOpen ? 'open' : 'closed');
        this.setMetadata('toolCount', this.tools.length);
        this.setMetadata('activeToolCount', this.activeTools.length);
        
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
        
        console.log(`Behaviors initialized: ${this.enabledBehaviors.join(', ')}`);
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
        this.setMetadata('toolCount', this.tools.length);
        
        console.log(`Tool added: ${toolItem.toolId} (${toolItem.type})`);
        return this;
    }
    
    removeTool(toolId) {
        const index = this.tools.findIndex(tool => tool.toolId === toolId);
        if (index > -1) {
            const removedTool = this.tools.splice(index, 1)[0];
            
            // Remove from active tools if present
            this._removeFromActiveTools(toolId);
            
            // Remove from selected tools if present
            this._removeFromSelectedTools(toolId);
            
            this.setMetadata('toolCount', this.tools.length);
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
    // TOOL INTERACTION METHODS
    // ========================
    
    selectTool(toolId) {
        const tool = this.getTool(toolId);
        if (!tool || !tool.isEnabled) {
            return false;
        }
        
        if (this.selectionMode === 'none') {
            return false;
        }
        
        if (this.selectionMode === 'single') {
            // Clear previous selections
            this.selectedTools = [];
        }
        
        if (!this.selectedTools.find(t => t.toolId === toolId)) {
            this.selectedTools.push(tool);
            console.log(`Tool selected: ${toolId}`);
        }
        
        return true;
    }
    
    deselectTool(toolId) {
        this._removeFromSelectedTools(toolId);
        console.log(`Tool deselected: ${toolId}`);
        return this;
    }
    
    clearSelection() {
        this.selectedTools = [];
        console.log('All tools deselected');
        return this;
    }
    
    activateTool(toolId) {
        const tool = this.getTool(toolId);
        if (!tool || !tool.isEnabled) {
            return false;
        }
        
        // Add to active tools
        if (!this.activeTools.find(t => t.toolId === toolId)) {
            this.activeTools.push(tool);
            tool.isActive = true;
            this.setMetadata('activeToolCount', this.activeTools.length);
            console.log(`Tool activated: ${toolId}`);
        }
        
        return true;
    }
    
    deactivateTool(toolId) {
        this._removeFromActiveTools(toolId);
        const tool = this.getTool(toolId);
        if (tool) {
            tool.isActive = false;
        }
        console.log(`Tool deactivated: ${toolId}`);
        return this;
    }
    
    // ========================
    // PANEL STATE METHODS
    // ========================
    // Note: These methods are called by ToolPanelToggleBehavior, not internally
    
    openPanel() {
        if (this.isPanelOpen) {
            return this;
        }
        
        this.isPanelOpen = true;
        this.setDimensions(this.panelSize.expanded.width, this.panelSize.expanded.height);
        this.removeCssClass('panel-collapsed');
        this.addCssClass('panel-open');
        this.setMetadata('panelState', 'open');
        
        console.log(`Panel opened: ${this.containerId}`);
        return this;
    }
    
    closePanel() {
        if (!this.isPanelOpen) {
            return this;
        }
        
        this.isPanelOpen = false;
        this.setDimensions(this.panelSize.collapsed.width, this.panelSize.collapsed.height);
        this.removeCssClass('panel-open');
        this.addCssClass('panel-collapsed');
        this.setMetadata('panelState', 'closed');
        
        console.log(`Panel closed: ${this.containerId}`);
        return this;
    }
    
    
    setPanelPosition(position) {
        const validPosition = this._validatePanelPosition(position);
        if (validPosition !== this.panelPosition) {
            this.removeCssClass(`panel-${this.panelPosition}`);
            this.panelPosition = validPosition;
            this.addCssClass(`panel-${this.panelPosition}`);
            console.log(`Panel position changed: ${this.panelPosition}`);
        }
        return this;
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
    
    _removeFromActiveTools(toolId) {
        const index = this.activeTools.findIndex(tool => tool.toolId === toolId);
        if (index > -1) {
            this.activeTools.splice(index, 1);
            this.setMetadata('activeToolCount', this.activeTools.length);
        }
    }
    
    _removeFromSelectedTools(toolId) {
        const index = this.selectedTools.findIndex(tool => tool.toolId === toolId);
        if (index > -1) {
            this.selectedTools.splice(index, 1);
        }
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
            activeToolCount: this.activeTools.length,
            selectedToolCount: this.selectedTools.length,
            enabledBehaviors: this.enabledBehaviors,
            theme: this.theme,
            toolLayout: this.toolLayout
        };
    }
    
    reset() {
        // Clear all tools and selections
        this.tools = [];
        this.activeTools = [];
        this.selectedTools = [];
        
        // Reset to initial state
        this.isPanelOpen = true;
        // Note: Panel opening will be handled by ToolPanelToggleBehavior
        
        // Update metadata
        this.setMetadata('toolCount', 0);
        this.setMetadata('activeToolCount', 0);
        this.setMetadata('panelState', 'open');
        
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
            shortcut: options.shortcut || '',
            config: options.config || {},
            behaviorOverrides: options.behaviorOverrides || {}
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToolsContainer;
} else if (typeof window !== 'undefined') {
    window.ToolsContainer = ToolsContainer;
}

// Tool Management Properties
// - tools: array of ToolItem objects (collection of available tools in this container. There should presently be none)
// - activeTools: array of ToolItem objects (tools currently being used/dragged)
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

// Tool Interaction Properties
// - selectionMode: choose("single", "multiple", "none") (how many tools can be selected at once)
// - selectedTools: array of ToolItem objects (currently selected tools)
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
// - shortcut: string (keyboard shortcut for activating this tool)
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