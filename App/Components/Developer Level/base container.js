//This is a class
//It has the following properties:

// Core Identity Properties
// - containerId: string (unique identifier for this container instance)
// - name: string (human-readable name for the container)
// - type: choose("canvas","tools","container") (defines the container's purpose and behavior)
// - isRoot: boolean (singleton lock prevents multiple root containers. Root container exists because parent must be a BaseContainer)

// Hierarchy Properties
// - parent: if(isRoot=false, BaseContainer, null) (root container has no parent, represents HTML root UI container)
// - children: array of BaseContainer (child containers managed by this container)
// - depth: number (calculated depth in the container hierarchy, root = 0)
// - index: number (position among siblings in parent's children array)

// Visual Properties
// - position: object { x: number, y: number } (position relative to parent)
// - dimensions: object { width: number, height: number } (container size)
// - zIndex: number (layering order for overlapping containers)
// - visibility: boolean (whether container is visible)
// - opacity: number (0-1, transparency level)

// State Properties
// - isActive: boolean (whether container is currently active/selected)
// - isLocked: boolean (whether container can be modified)
// - isCollapsed: boolean (whether container is minimized/collapsed)
// - isDraggable: boolean (whether container can be moved)
// - isResizable: boolean (whether container can be resized)

// Content Properties
// - content: any (the actual content/data held by this container)
// - metadata: object (additional data about the container)
// - cssClasses: array of strings (CSS classes applied to the container)
// - styles: object (inline styles for the container)

// Event Properties
// - eventHandlers: object (maps event types to handler functions)
// - allowedEvents: array of strings (which events this container can handle)

// Validation Properties
// - constraints: object (rules for what this container can contain)
// - validChildTypes: array of strings (which container types can be children)
// - maxChildren: number (maximum number of child containers allowed)
// - minChildren: number (minimum number of child containers required)