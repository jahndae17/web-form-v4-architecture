/**
 * Movement State Stuck Detector
 * 
 * Monitors for elements that get stuck in movement states (moving, ready, etc.) 
 * and prevents canvas interaction blocking. This detector specifically handles
 * cases where elements remain in movement state after resize operations or
 * incomplete mouse interactions.
 * 
 * @author System
 * @version 1.0.0
 */

class MovementStateStuckDetector {
    constructor() {
        this.detectorId = 'movement-state-stuck-detector';
        this.isActive = false;
        this.monitoringInterval = null;
        this.stuckElements = new Map(); // Track elements and when they got stuck
        
        // Configuration
        this.config = {
            checkInterval: 1000, // Check every 1 second (faster)
            stuckThreshold: 3000, // Consider stuck after 3 seconds (reduced)
            maxStuckTime: 5000, // Force cleanup after 5 seconds (reduced)
            movementStates: ['moving', 'ready', 'dragging'],
            cleanupClasses: ['moving', 'dragging', 'movement-ready'],
            logLevel: 'warn' // 'debug', 'warn', 'error'
        };
        
        console.log('🔍 MovementStateStuckDetector initialized');
    }
    
    /**
     * Start monitoring for stuck movement states
     */
    startMonitoring() {
        if (this.isActive) {
            console.log('⚠️ MovementStateStuckDetector already active');
            return;
        }
        
        this.isActive = true;
        this.monitoringInterval = setInterval(() => {
            this.checkForStuckElements();
        }, this.config.checkInterval);
        
        console.log('🎯 MovementStateStuckDetector monitoring started');
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.isActive) return;
        
        this.isActive = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.stuckElements.clear();
        console.log('🛑 MovementStateStuckDetector monitoring stopped');
    }
    
    /**
     * Check for elements stuck in movement states
     */
    checkForStuckElements() {
        const now = Date.now();
        const stuckElements = this.findStuckElements();
        
        // Update tracking for newly stuck elements
        stuckElements.forEach(element => {
            if (!this.stuckElements.has(element.id)) {
                this.stuckElements.set(element.id, {
                    element: element,
                    stuckSince: now,
                    state: element.getAttribute('data-movement-state'),
                    lastReported: 0
                });
                
                if (this.config.logLevel === 'debug') {
                    console.log(`🔍 New stuck element detected: ${element.id} (state: ${element.getAttribute('data-movement-state')})`);
                }
            }
        });
        
        // Remove elements that are no longer stuck
        const currentStuckIds = new Set(stuckElements.map(el => el.id));
        for (const [elementId, info] of this.stuckElements.entries()) {
            if (!currentStuckIds.has(elementId)) {
                if (this.config.logLevel === 'debug') {
                    console.log(`✅ Element no longer stuck: ${elementId}`);
                }
                this.stuckElements.delete(elementId);
            }
        }
        
        // Process stuck elements
        this.processStuckElements(now);
    }
    
    /**
     * Find elements currently stuck in movement states
     */
    findStuckElements() {
        const stuckElements = [];
        const now = Date.now();
        
        // Find elements with movement states
        const movingElements = document.querySelectorAll('[data-movement-state]');
        
        movingElements.forEach(element => {
            const state = element.getAttribute('data-movement-state');
            const startTime = element.getAttribute('data-movement-start');
            
            if (this.config.movementStates.includes(state)) {
                if (startTime) {
                    const stuckDuration = now - parseInt(startTime);
                    if (stuckDuration > this.config.stuckThreshold) {
                        stuckElements.push(element);
                    }
                } else {
                    // No start time but in movement state - definitely stuck
                    stuckElements.push(element);
                }
            }
        });
        
        return stuckElements;
    }
    
    /**
     * Process and potentially fix stuck elements
     */
    processStuckElements(now) {
        for (const [elementId, info] of this.stuckElements.entries()) {
            const stuckDuration = now - info.stuckSince;
            const element = info.element;
            
            // Report stuck element periodically
            if (now - info.lastReported > 3000) { // Report every 3 seconds
                console.warn(`⚠️ Element stuck in movement state: ${elementId} (${info.state}) for ${Math.round(stuckDuration/1000)}s`);
                info.lastReported = now;
            }
            
            // Force cleanup if stuck too long
            if (stuckDuration > this.config.maxStuckTime) {
                console.error(`🚨 Force cleaning stuck element: ${elementId} (stuck for ${Math.round(stuckDuration/1000)}s)`);
                this.forceCleanElement(element);
                this.stuckElements.delete(elementId);
            }
        }
    }
    
    /**
     * Force clean a stuck element
     */
    forceCleanElement(element) {
        try {
            // Reset movement state
            element.setAttribute('data-movement-state', 'idle');
            element.removeAttribute('data-movement-start');
            element.removeAttribute('data-current-position');
            element.removeAttribute('data-movement-delta');
            
            // Remove stuck classes
            this.config.cleanupClasses.forEach(className => {
                element.classList.remove(className);
            });
            
            // Reset styles that might be stuck
            element.style.cursor = '';
            element.style.userSelect = '';
            element.style.pointerEvents = '';
            element.style.opacity = '';
            element.style.zIndex = '';
            
            // Try to find and reset the BaseUserContainer behavior if available
            const containerId = element.id;
            if (window.BaseUserContainer && window.BaseUserContainer.globalRegistry && 
                window.BaseUserContainer.globalRegistry.has(containerId)) {
                const container = window.BaseUserContainer.globalRegistry.get(containerId);
                
                if (container && container.forceCleanupMovementState) {
                    console.log(`🔧 Using container's force cleanup for stuck element: ${containerId}`);
                    container.forceCleanupMovementState();
                } else if (container && container.movableBehavior) {
                    console.log(`🔧 Resetting MovableBehavior for stuck element: ${containerId}`);
                    container.movableBehavior.isMoving = false;
                    container.isDragging = false;
                    
                    // Reset behavior state
                    container.movableBehavior.startPosition = null;
                    container.movableBehavior.currentPosition = null;
                    container.movableBehavior.movementDelta = { x: 0, y: 0 };
                }
            }
            
            // Dispatch a custom event to notify other systems
            const cleanupEvent = new CustomEvent('movementStateForceCleanup', {
                detail: {
                    elementId: element.id,
                    timestamp: Date.now(),
                    detector: this.detectorId
                }
            });
            document.dispatchEvent(cleanupEvent);
            
            console.log(`✅ Force cleaned stuck element: ${element.id}`);
            
        } catch (error) {
            console.error(`❌ Error force cleaning element ${element.id}:`, error);
        }
    }
    
    /**
     * Manual cleanup trigger for external use
     */
    forceCleanupAllStuck() {
        const stuckElements = this.findStuckElements();
        console.log(`🧹 Manual cleanup triggered for ${stuckElements.length} stuck elements`);
        
        stuckElements.forEach(element => {
            this.forceCleanElement(element);
        });
        
        this.stuckElements.clear();
    }
    
    /**
     * Get current status
     */
    getStatus() {
        return {
            isActive: this.isActive,
            stuckElementsCount: this.stuckElements.size,
            stuckElements: Array.from(this.stuckElements.entries()).map(([id, info]) => ({
                id,
                state: info.state,
                stuckDuration: Date.now() - info.stuckSince
            }))
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('🔧 MovementStateStuckDetector config updated:', this.config);
    }
}

// Global instance
if (typeof window !== 'undefined') {
    window.MovementStateStuckDetector = MovementStateStuckDetector;
    
    // Auto-initialize
    if (!window.movementStateStuckDetector) {
        window.movementStateStuckDetector = new MovementStateStuckDetector();
        
        // Auto-start monitoring when the page loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    window.movementStateStuckDetector.startMonitoring();
                }, 1000); // Start after 1 second delay
            });
        } else {
            // Page already loaded
            setTimeout(() => {
                window.movementStateStuckDetector.startMonitoring();
            }, 1000);
        }
        
        // Add to debug tools
        if (window.debugTools) {
            window.debugTools.movementStateStuckDetector = window.movementStateStuckDetector;
        }
        
        console.log('🔍 MovementStateStuckDetector auto-initialized and will start monitoring');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MovementStateStuckDetector;
}
