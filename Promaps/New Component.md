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
| `Component.js` | • Data properties<br>• Structure<br>• State getters/setters | • Event listeners<br>• User input handling<br>• Function calls |Interface Handler|
| `Behavior.js` | • Function declarations<br>• Input trigger mappings<br>• Behavior schema | • Event listeners<br>• Direct function calls<br>• DOM manipulation |Event Handler|
| `Styles.css` | • Visual appearance<br>• Animations<br>• States (hover, active) | • JavaScript<br>• Event handling<br>• Behavior logic |Index.html|

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
  }
};
```

## 🚫 What Components DON'T Do

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

### ✅ Behavior Declarations
```javascript
// ✅ CORRECT - Behaviors declare what they can do
class MyBehavior {
  // Declare functions (but Event Handler calls them)
  editText(parameters) { /* Implementation */ }
  saveChanges(parameters) { /* Implementation */ }
  deleteComponent(parameters) { /* Implementation */ }
  
  // Register with Event Handler
  getSchema() { return behaviorSchema; }
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
8. **Component updates** its data and re-renders

## 📞 Communication Summary

```
Component Says: "I have an editText function that responds to clicks"
Event Handler Says: "Got it, I'll watch for clicks and call editText"

User Clicks Component
↓
Event Handler: "Click detected, calling editText function"
↓
Component: "editText function executed, updating display"
```

## 🎯 The Golden Rule

**Components are REACTIVE, not PROACTIVE**
- Components declare what they CAN do
- Event Handler decides WHEN to do it
- No component ever handles its own events