## Handler Integration
* IO Handler - Input Event Capture
* Listens for: Other handlers changing interaction locks
* Updates: Mouse position, keyboard state, drag states, touch events
* Triggers: Context updates for all user input events
* Reacts to: Lock changes by adjusting input handling behavior

## Interface Handler - Component Interaction
* Listens for: Input state changes, lock status changes
* Updates: Currently active component, focus states, component bounds
* Triggers: Component enter/exit events, focus changes
* Reacts to: Disables hover detection during drags, respects interaction locks

## Event Handler - Singleton Lock Manager
* Listens for: All operation state changes, modal states, validation states
* Updates: Interaction locks, lock priorities, conflict resolution
* Triggers: Lock acquisition/release based on context changes
* Manages: Conflict resolution, lock queuing, automatic timeouts

# Singleton Lock System
The Event Handler enforces these locks with priorities:

global_lock (1000) - Blocks everything
modal_lock (900) - Blocks all interactions
edit_lock (800) - Prevents conflicting edits
drag_lock/resize_lock (700) - Prevents simultaneous transformations
validation_lock (600) - Blocks saves during validation
save_lock (500) - Prevents conflicting saves