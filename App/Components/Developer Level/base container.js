/**
 * BaseContainer - Foundation class for all UI containers
 * Implements reactive component architecture with comprehensive property management
 */

class BaseContainer {
    // Static properties for root container management
    static _rootContainer = null;
    static _containerRegistry = new Map();
    static _nextId = 1;

    constructor(containerId = null, parent = null, type = 'container') {
        // Core Identity Properties
        this.containerId = containerId || `container_${BaseContainer._nextId++}`;
        this.name = this.containerId; // Default name, can be overridden
        this.type = this._validateType(type);
        this.isRoot = this._determineRootStatus(parent);
        
        // Hierarchy Properties
        this.parent = this._setParent(parent);
        this.children = [];
        this.depth = this._calculateDepth();
        this.index = this._calculateIndex();
        
        // Visual Properties
        this.position = { x: 0, y: 0 };
        this.dimensions = { width: 100, height: 100 };
        this.zIndex = this.depth * 10; // Default z-index based on depth
        this.visibility = true;
        this.opacity = 1.0;
        
        // State Properties
        this.isActive = false;
        this.isLocked = false;
        this.isCollapsed = false;
        this.isDraggable = true;
        this.isResizable = true;
        
        // Content Properties
        this.content = null;
        this.metadata = {};
        this.cssClasses = ['base-container', `container-${this.type}`];
        this.styles = {};
        
        // Event Properties (for handler registration, not direct handling)
        this.eventHandlers = new Map();
        this.allowedEvents = [
            'click', 'double_click', 'right_click', 'hover_enter', 'hover_exit',
            'focus_in', 'focus_out', 'drag_start', 'drag_end', 'resize'
        ];
        
        // Validation Properties
        this.constraints = {
            allowsChildren: true,
            allowsContent: true,
            enforceHierarchy: true
        };
        this.validChildTypes = ['canvas', 'tools', 'container'];
        this.maxChildren = Infinity;
        this.minChildren = 0;
        
        // Register this container
        this._register();
        
        // Initialize DOM element (if in browser environment)
        this.element = this._createElement();
        
        console.log(`BaseContainer created: ${this.containerId} (${this.type})`);
    }
    
    // ========================
    // CORE IDENTITY METHODS
    // ========================
    
    _validateType(type) {
        const validTypes = ['canvas', 'tools', 'container'];
        if (!validTypes.includes(type)) {
            console.warn(`Invalid container type: ${type}. Defaulting to 'container'`);
            return 'container';
        }
        return type;
    }
    
    _determineRootStatus(parent) {
        if (parent === null) {
            if (BaseContainer._rootContainer === null) {
                BaseContainer._rootContainer = this;
                return true;
            } else {
                throw new Error('Root container already exists. Only one root container is allowed.');
            }
        }
        return false;
    }
    
    _register() {
        if (BaseContainer._containerRegistry.has(this.containerId)) {
            throw new Error(`Container ID already exists: ${this.containerId}`);
        }
        BaseContainer._containerRegistry.set(this.containerId, this);
    }
    
    // ========================
    // HIERARCHY METHODS
    // ========================
    
    _setParent(parent) {
        if (parent !== null && !(parent instanceof BaseContainer)) {
            throw new Error('Parent must be a BaseContainer instance or null');
        }
        
        if (parent !== null) {
            parent.addChild(this);
        }
        
        return parent;
    }
    
    _calculateDepth() {
        if (this.isRoot) return 0;
        return this.parent ? this.parent.depth + 1 : 0;
    }
    
    _calculateIndex() {
        if (!this.parent) return 0;
        return this.parent.children.indexOf(this);
    }
    
    addChild(child) {
        if (!(child instanceof BaseContainer)) {
            throw new Error('Child must be a BaseContainer instance');
        }
        
        if (this.children.length >= this.maxChildren) {
            throw new Error(`Maximum children limit reached: ${this.maxChildren}`);
        }
        
        if (!this.validChildTypes.includes(child.type)) {
            throw new Error(`Invalid child type: ${child.type}. Allowed: ${this.validChildTypes.join(', ')}`);
        }
        
        if (!this.children.includes(child)) {
            this.children.push(child);
            child.parent = this;
            child.depth = this.depth + 1;
            child.index = this.children.length - 1;
            
            // Update z-index based on new depth
            child.zIndex = child.depth * 10;
            
            this._updateChildIndices();
            console.log(`Child added: ${child.containerId} to ${this.containerId}`);
        }
        
        return this;
    }
    
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
            child.depth = 0;
            this._updateChildIndices();
            console.log(`Child removed: ${child.containerId} from ${this.containerId}`);
        }
        return this;
    }
    
    _updateChildIndices() {
        this.children.forEach((child, index) => {
            child.index = index;
        });
    }
    
    // ========================
    // VISUAL METHODS
    // ========================
    
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        this._updateElementStyle();
        return this;
    }
    
    setDimensions(width, height) {
        this.dimensions.width = Math.max(0, width);
        this.dimensions.height = Math.max(0, height);
        this._updateElementStyle();
        return this;
    }
    
    setZIndex(zIndex) {
        this.zIndex = zIndex;
        this._updateElementStyle();
        return this;
    }
    
    setVisibility(visible) {
        this.visibility = visible;
        this._updateElementStyle();
        return this;
    }
    
    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
        this._updateElementStyle();
        return this;
    }
    
    // ========================
    // STATE METHODS
    // ========================
    
    activate() {
        this.isActive = true;
        this._updateElementClasses();
        console.log(`Container activated: ${this.containerId}`);
        return this;
    }
    
    deactivate() {
        this.isActive = false;
        this._updateElementClasses();
        console.log(`Container deactivated: ${this.containerId}`);
        return this;
    }
    
    lock() {
        this.isLocked = true;
        this.isDraggable = false;
        this.isResizable = false;
        this._updateElementClasses();
        console.log(`Container locked: ${this.containerId}`);
        return this;
    }
    
    unlock() {
        this.isLocked = false;
        this.isDraggable = true;
        this.isResizable = true;
        this._updateElementClasses();
        console.log(`Container unlocked: ${this.containerId}`);
        return this;
    }
    
    collapse() {
        this.isCollapsed = true;
        this._updateElementClasses();
        return this;
    }
    
    expand() {
        this.isCollapsed = false;
        this._updateElementClasses();
        return this;
    }
    
    // ========================
    // CONTENT METHODS
    // ========================
    
    setContent(content) {
        this.content = content;
        this._updateElementContent();
        return this;
    }
    
    getContent() {
        return this.content;
    }
    
    setMetadata(key, value) {
        this.metadata[key] = value;
        return this;
    }
    
    getMetadata(key) {
        return this.metadata[key];
    }
    
    addCssClass(className) {
        if (!this.cssClasses.includes(className)) {
            this.cssClasses.push(className);
            this._updateElementClasses();
        }
        return this;
    }
    
    removeCssClass(className) {
        const index = this.cssClasses.indexOf(className);
        if (index > -1) {
            this.cssClasses.splice(index, 1);
            this._updateElementClasses();
        }
        return this;
    }
    
    setStyle(property, value) {
        this.styles[property] = value;
        this._updateElementStyle();
        return this;
    }
    
    // ========================
    // EVENT REGISTRATION METHODS (for handlers, not direct handling)
    // ========================
    
    registerEventHandler(eventType, handlerFunction) {
        if (!this.allowedEvents.includes(eventType)) {
            console.warn(`Event type not allowed: ${eventType}`);
            return this;
        }
        
        this.eventHandlers.set(eventType, handlerFunction);
        console.log(`Event handler registered: ${eventType} for ${this.containerId}`);
        return this;
    }
    
    unregisterEventHandler(eventType) {
        this.eventHandlers.delete(eventType);
        console.log(`Event handler unregistered: ${eventType} for ${this.containerId}`);
        return this;
    }
    
    // ========================
    // VALIDATION METHODS
    // ========================
    
    validateHierarchy() {
        // Check minimum children requirement
        if (this.children.length < this.minChildren) {
            return {
                valid: false,
                error: `Minimum children requirement not met: ${this.children.length}/${this.minChildren}`
            };
        }
        
        // Check maximum children limit
        if (this.children.length > this.maxChildren) {
            return {
                valid: false,
                error: `Maximum children limit exceeded: ${this.children.length}/${this.maxChildren}`
            };
        }
        
        // Check child types
        for (const child of this.children) {
            if (!this.validChildTypes.includes(child.type)) {
                return {
                    valid: false,
                    error: `Invalid child type: ${child.type} not in ${this.validChildTypes.join(', ')}`
                };
            }
        }
        
        return { valid: true };
    }
    
    setConstraints(constraints) {
        this.constraints = { ...this.constraints, ...constraints };
        return this;
    }
    
    setValidChildTypes(types) {
        this.validChildTypes = types;
        return this;
    }
    
    setChildLimits(min, max) {
        this.minChildren = Math.max(0, min);
        this.maxChildren = Math.max(min, max);
        return this;
    }
    
    // ========================
    // DOM ELEMENT METHODS
    // ========================
    
    _createElement() {
        // Check if we're in a browser environment
        if (typeof document === 'undefined') {
            console.log(`DOM not available - creating virtual element for ${this.containerId}`);
            return {
                id: this.containerId,
                className: '',
                style: {},
                setAttribute: function(name, value) { this[name] = value; },
                getAttribute: function(name) { return this[name]; }
            };
        }
        
        const element = document.createElement('div');
        element.id = this.containerId;
        element.setAttribute('data-component-id', this.containerId);
        element.setAttribute('data-component-type', this.type);
        element.setAttribute('data-interface-tracked', 'true');
        
        this._updateElementClasses();
        this._updateElementStyle();
        this._updateElementContent();
        
        return element;
    }
    
    _updateElementClasses() {
        if (!this.element) return;
        
        // Build class list
        const classes = [...this.cssClasses];
        
        if (this.isActive) classes.push('active');
        if (this.isLocked) classes.push('locked');
        if (this.isCollapsed) classes.push('collapsed');
        if (this.isDraggable) classes.push('draggable');
        if (this.isResizable) classes.push('resizable');
        
        this.element.className = classes.join(' ');
    }
    
    _updateElementStyle() {
        if (!this.element) return;
        
        const style = {
            position: 'absolute',
            left: `${this.position.x}px`,
            top: `${this.position.y}px`,
            width: `${this.dimensions.width}px`,
            height: `${this.dimensions.height}px`,
            zIndex: this.zIndex,
            opacity: this.opacity,
            display: this.visibility ? 'block' : 'none',
            ...this.styles
        };
        
        // Check if we're in browser environment
        if (typeof document !== 'undefined') {
            Object.assign(this.element.style, style);
        } else {
            // Virtual element - just store styles
            this.element.style = { ...this.element.style, ...style };
        }
    }
    
    _updateElementContent() {
        if (!this.element || typeof document === 'undefined') return;
        
        if (this.content !== null) {
            if (typeof this.content === 'string') {
                this.element.textContent = this.content;
            } else if (this.content instanceof HTMLElement) {
                this.element.innerHTML = '';
                this.element.appendChild(this.content);
            }
        }
    }
    
    // ========================
    // UTILITY METHODS
    // ========================
    
    getPath() {
        const path = [];
        let current = this;
        while (current) {
            path.unshift(current.containerId);
            current = current.parent;
        }
        return path;
    }
    
    findChild(containerId) {
        return this.children.find(child => child.containerId === containerId);
    }
    
    findDescendant(containerId) {
        for (const child of this.children) {
            if (child.containerId === containerId) {
                return child;
            }
            const found = child.findDescendant(containerId);
            if (found) return found;
        }
        return null;
    }
    
    toJSON() {
        return {
            containerId: this.containerId,
            name: this.name,
            type: this.type,
            isRoot: this.isRoot,
            position: this.position,
            dimensions: this.dimensions,
            visibility: this.visibility,
            opacity: this.opacity,
            isActive: this.isActive,
            isLocked: this.isLocked,
            isCollapsed: this.isCollapsed,
            isDraggable: this.isDraggable,
            isResizable: this.isResizable,
            depth: this.depth,
            index: this.index,
            childCount: this.children.length,
            path: this.getPath()
        };
    }
    
    // ========================
    // STATIC METHODS
    // ========================
    
    static getRootContainer() {
        return BaseContainer._rootContainer;
    }
    
    static getContainer(containerId) {
        return BaseContainer._containerRegistry.get(containerId);
    }
    
    static getAllContainers() {
        return Array.from(BaseContainer._containerRegistry.values());
    }
    
    static destroyContainer(containerId) {
        const container = BaseContainer._containerRegistry.get(containerId);
        if (container) {
            // Remove from parent
            if (container.parent) {
                container.parent.removeChild(container);
            }
            
            // Remove from registry
            BaseContainer._containerRegistry.delete(containerId);
            
            // Clear root if this was root
            if (container.isRoot) {
                BaseContainer._rootContainer = null;
            }
            
            console.log(`Container destroyed: ${containerId}`);
        }
    }
    
    // ========================
    // CLEANUP
    // ========================
    
    destroy() {
        // Remove all children
        while (this.children.length > 0) {
            this.removeChild(this.children[0]);
        }
        
        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        // Clean up
        BaseContainer.destroyContainer(this.containerId);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseContainer;
} else if (typeof window !== 'undefined') {
    window.BaseContainer = BaseContainer;
}