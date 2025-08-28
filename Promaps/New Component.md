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
└── Behavior.js      ← Function Declarations + Graphics Requests ONLY
```

**⚠️ IMPORTANT: NO SEPARATE CSS FILES**
All visual operations (styles, animations, z-index) are managed centrally by Graphics Handler.

### 🎯 Separation of Concerns

| **File** | **Contains** | **Does NOT Contain** | **Communicates With**|
|----------|--------------|---------------------|-----------------------|
| `Component.js` | • Data properties<br>• Structure<br>• State getters/setters<br>• DOM element creation | • Event listeners<br>• User input handling<br>• Function calls<br>• Visual operations<br>• CSS styles |Interface Handler|
| `Behavior.js` | • Function declarations<br>• Input trigger mappings<br>• Behavior schema<br>• Graphics requests<br>• Style specifications | • Event listeners<br>• Direct function calls<br>• DOM manipulation<br>• Direct animations<br>• CSS files<br>• Direct styling |Event Handler|

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
element.classList.add('highlight');
```

### ❌ NO CSS Files or Direct Styling
```css
/* ❌ WRONG - Don't create separate CSS files */
.my-component { background: blue; }
.my-component:hover { transform: scale(1.1); }
.my-component.active { z-index: 100; }
```

### ❌ NO Style Manipulation
```javascript
// ❌ WRONG - Don't manipulate styles directly
element.style.backgroundColor = 'red';
element.style.display = 'none';
element.className = 'highlighted';
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

### ✅ Graphics Integration with Style Specifications
```javascript
// ✅ CORRECT - Request all visual operations through Event Handler
class MyBehavior {
  editText(parameters) { 
    // Business logic here
    
    // Request animation AND styling through Event Handler → Graphics Handler
    return {
      success: true,
      graphics_request: {
        type: 'animation',
        componentId: parameters.target,
        animation: { 
          highlight: { 
            backgroundColor: { from: 'transparent', to: '#ffff99' },
            duration: 300,
            easing: 'ease-in-out'
          }
        }
      }
    };
  }
  
  saveChanges(parameters) { 
    // Save logic here
    
    // Request comprehensive styling through Event Handler → Graphics Handler  
    return {
      success: true,
      graphics_request: {
        type: 'style_update',
        componentId: parameters.target,
        styles: { 
          border: '2px solid green',
          backgroundColor: '#f0fff0',
          boxShadow: '0 2px 4px rgba(0,255,0,0.3)'
        },
        classes: {
          add: ['saved', 'success'],
          remove: ['editing', 'error']
        }
      }
    };
  }
  
  // Define ALL visual requirements in behavior
  getVisualSchema() {
    return {
      baseStyles: {
        backgroundColor: '#ffffff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '8px'
      },
      stateStyles: {
        editing: { border: '2px solid #007acc', backgroundColor: '#f8fcff' },
        error: { border: '2px solid #d32f2f', backgroundColor: '#fff5f5' },
        saved: { border: '2px solid #388e3c', backgroundColor: '#f1f8e9' }
      },
      animations: {
        highlight: { duration: 300, easing: 'ease-in-out' },
        focus: { duration: 150, easing: 'ease-out' }
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
🎨 Graphics Handler manages (EVERYTHING VISUAL):
├── 🎬 Animations (smooth transitions, effects, keyframes)
├── 🎨 ALL Styles (runtime styles, base styles, theme styles)  
├── 📚 Z-Index Coordination (layering conflicts, stacking)
├── 📐 Layout Updates (responsive changes, positioning)
├── 🎯 CSS Classes (adding/removing classes for states)
├── 🌈 Theme Management (color schemes, visual modes)
└── ⚡ Performance Optimization (60fps, batching, GPU acceleration)

🎯 Event Handler coordinates:
├── 🔒 Permission Model (when graphics operations happen)
├── 📊 Resource Management (conflicts, locks)
├── 🔄 Request Routing (behavior → graphics)
└── 📝 State Synchronization (ChangeLog updates)

💻 Components provide:
├── 📋 Data Structure (what needs visual updates)
├── 🎯 Behavior Schema (what graphics are needed)
├── 🔗 Element References (what gets styled/animated)
├── 📊 State Information (current visual state)
└── 🎨 Visual Specifications (how things should look)
```

### Graphics Request Format
```javascript
// From Behavior functions return:
{
  success: true,
  graphics_request: {
    type: 'comprehensive_update',   // animation | style_update | z_index | comprehensive_update
    componentId: 'my-panel',        // Target element
    styles: {                       // Direct style properties
      backgroundColor: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '4px'
    },
    classes: {                      // CSS class management
      add: ['active', 'highlighted'],
      remove: ['inactive', 'error'],
      toggle: ['expanded']
    },
    animation: {                    // Animation properties
      width: { from: '200px', to: '0px' },
      opacity: { from: 1, to: 0 },
      duration: 300,
      easing: 'ease-in-out'
    },
    zIndex: 150,                    // Z-index management
    options: {
      priority: 'high',             // high | normal | low
      batch: true,                  // Batch with other updates
      onComplete: 'hide_panel'      // Optional callback behavior
    }
  }
}
```

## 🎯 The Golden Rules

**Components are REACTIVE, not PROACTIVE**
- Components declare what they CAN do
- Event Handler decides WHEN to do it
- No component ever handles its own events

**Graphics are CENTRALIZED, not SCATTERED**
- ALL visual operations flow through Graphics Handler exclusively
- NO separate CSS files, NO direct styling, NO style manipulation
- Graphics Handler maintains comprehensive visual state and coordination
- Components request visual changes, Graphics Handler executes them
- Behavior files specify visual requirements, Graphics Handler implements them

**State is COORDINATED, not ISOLATED**
- ChangeLog maintains all system state including visual state
- Handlers coordinate through shared context and visual coordination
- Components update data, Graphics Handler updates ALL visuals
- No component maintains visual state outside Graphics Handler
- All styling, animations, and visual effects are centrally managed