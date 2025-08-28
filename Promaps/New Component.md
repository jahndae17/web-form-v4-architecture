# Component Architecture Guide

## 🔄 Handler Flow
```
👤 User Input 
    ↓
🎮 IO Handler (captures ALL inputs)
    ↓ 
📝 Updates Context (shared state)
    ↓
🔍 Interface Handler (detects component changes)
    ↓
📝 Updates Context (component states)
    ↓
⚡ Event Handler (applies locks & calls functions)
    ↓ ┌─────────────────────────────────────────┐
    ↓ │ 🎨 Graphics Handler (visual operations) │
    ↓ │ • Animations & transitions             │
    ↓ │ • Style coordination                   │
    ↓ │ • Z-index management                   │
    ↓ │ • Performance optimization             │
    ↓ └─────────────────────────────────────────┘
    ↓
📝 Updates Context (operation states)
    ↓
🔄 All Handlers Listen & React
```

## 🧩 Component Architecture

### 📁 Component Structure
```
MyComponent/
├── Component.js     ← Data & Structure ONLY
├── Behavior.js      ← Function Declarations ONLY  
└── Styles.css       ← Appearance ONLY
```

### 🎯 Separation of Concerns

| **File** | **Contains** | **Does NOT Contain** | **Communicates With**|
|----------|--------------|---------------------|-----------------------|
| `Component.js` | • Data properties<br>• Structure<br>• State getters/setters | • Event listeners<br>• User input handling<br>• Function calls<br>• Visual operations |Interface Handler|
| `Behavior.js` | • Function declarations<br>• Input trigger mappings<br>• Behavior schema<br>• Graphics requests | • Event listeners<br>• Direct function calls<br>• DOM manipulation<br>• Direct animations |Event Handler|
| `Styles.css` | • Base visual appearance<br>• Static CSS rules<br>• CSS custom properties | • JavaScript<br>• Event handling<br>• Dynamic animations<br>• Z-index management |Index.html|

## 📋 Behavior Schema Registration

Each `Behavior.js` file declares what it can do:

```javascript
// MyComponent/Behavior.js
const behaviorSchema = {
  "editText": {
    "enabled": true,
    "triggers": ["click","double_click"],
    "parameters": { "target": "text_element" }
  },
  "saveChanges": {
    "enabled": true, 
    "triggers": ["Ctrl+S", "blur"],
    "parameters": { "validate": true }
  },
  "deleteComponent": {
    "enabled": true,
    "triggers": ["Delete", "right_click+delete"],
    "parameters": { "confirm": true }
  },
  "animateHighlight": {
    "enabled": true,
    "triggers": ["focus", "validation_error"],
    "parameters": { 
      "duration": 300,
      "graphics_handler": true  // Handled by Graphics Handler
    }
  }
};
```

## 🚫 What Components DON'T Do

### ❌ NO Direct Visual Operations
```javascript
// ❌ WRONG - Don't handle graphics directly in components
element.style.transform = 'translateX(100px)';
element.animate({ opacity: 0 }, 300);
element.style.zIndex = 1000;
```

### ❌ NO Event Listeners in Components
```javascript
// ❌ WRONG - Don't do this in components
element.addEventListener('click', handleClick);
element.onclick = myFunction;
```

### ❌ NO Direct Function Calls
```javascript
// ❌ WRONG - Don't call behaviors directly
this.editText();
this.saveChanges();
```

### ❌ NO Input Handling
```javascript
// ❌ WRONG - Don't handle inputs in components
if (event.key === 'Enter') { ... }
if (event.ctrlKey && event.key === 's') { ... }
```

## ✅ What Components DO

### ✅ Data & Structure
```javascript
// ✅ CORRECT - Components handle data
class MyComponent {
  constructor() {
    this.data = { text: '', saved: false };
    this.element = this.createElement();
  }
  
  getData() { return this.data; }
  setData(newData) { this.data = newData; }
  render() { /* Update DOM with current data */ }
}
```

### ✅ Graphics Integration
```javascript
// ✅ CORRECT - Request graphics operations through Event Handler
class MyBehavior {
  editText(parameters) { 
    // Business logic here
    
    // Request animation through Event Handler → Graphics Handler
    return {
      success: true,
      graphics_request: {
        type: 'animation',
        componentId: parameters.target,
        animation: { highlight: true },
        duration: 300
      }
    };
  }
  
  saveChanges(parameters) { 
    // Save logic here
    
    // Request style update through Event Handler → Graphics Handler  
    return {
      success: true,
      graphics_request: {
        type: 'style_update',
        componentId: parameters.target,
        styles: { border: '2px solid green' }
      }
    };
  }
}
```

## 🎮 How It Actually Works

1. **User clicks on component**
2. **IO Handler** captures the click
3. **Interface Handler** detects which component was clicked
4. **Event Handler** looks up the component's behavior schema
5. **Event Handler** finds that "click" triggers "editText" function
6. **Event Handler** acquires any needed locks
7. **Event Handler** calls the "editText" function
8. **Behavior** returns result with optional graphics_request
9. **Event Handler** sends graphics_request to **Graphics Handler**
10. **Graphics Handler** executes animations/styles/z-index operations
11. **Component updates** its data and re-renders
12. **ChangeLog** records all state changes for coordination

## 📞 Communication Summary

```
Component Says: "I have an editText function that responds to clicks"
Event Handler Says: "Got it, I'll watch for clicks and call editText"

User Clicks Component
↓
Event Handler: "Click detected, calling editText function"
↓
Component: "editText function executed, requesting highlight animation"
↓
Event Handler: "Got animation request, sending to Graphics Handler"
↓
Graphics Handler: "Animation request received, executing highlight effect"
↓
ChangeLog: "Recording animation state and component update"
```

## 🎨 Graphics Handler Integration

### Visual Operations Hierarchy
```
🎨 Graphics Handler manages:
├── 🎬 Animations (smooth transitions, effects)
├── 🎨 Dynamic Styles (runtime style changes)  
├── 📚 Z-Index Coordination (layering conflicts)
├── 📐 Layout Updates (responsive changes)
└── ⚡ Performance Optimization (60fps, batching)

🎯 Event Handler coordinates:
├── 🔒 Permission Model (when graphics operations happen)
├── 📊 Resource Management (conflicts, locks)
├── 🔄 Request Routing (behavior → graphics)
└── 📝 State Synchronization (ChangeLog updates)

💻 Components provide:
├── 📋 Data Structure (what needs visual updates)
├── 🎯 Behavior Schema (what graphics are needed)
├── 🔗 Element References (what gets animated)
└── 📊 State Information (current visual state)
```

### Graphics Request Format
```javascript
// From Behavior functions return:
{
  success: true,
  graphics_request: {
    type: 'animation',          // animation | style_update | z_index
    componentId: 'my-panel',    // Target element
    animation: {                // Animation properties
      width: { from: '200px', to: '0px' },
      duration: 300,
      easing: 'ease-in-out'
    },
    options: {
      priority: 'high',         // high | normal | low
      batch: true,              // Batch with other updates
      onComplete: 'hide_panel'  // Optional callback behavior
    }
  }
}
```

## 🎯 The Golden Rules

**Components are REACTIVE, not PROACTIVE**
- Components declare what they CAN do
- Event Handler decides WHEN to do it
- No component ever handles its own events

**Graphics are COORDINATED, not DIRECT**
- Components request visual operations through Event Handler
- Graphics Handler executes all visual operations
- No component directly manipulates styles, animations, or z-index
- All visual state changes flow through the centralized graphics system

**State is CENTRALIZED, not SCATTERED**
- ChangeLog maintains all system state
- Handlers coordinate through shared context
- Components update data, Graphics Handler updates visuals
- No component maintains its own isolated visual state