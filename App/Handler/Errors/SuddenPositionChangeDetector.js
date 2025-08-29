/**
 * Sudden Position Change Detector
 * 
 * Monitors for unexpected position changes that could indicate:
 * - Offset accumulation bugs (like the MovableBehavior transform+left/top conflict)
 * - Memory leaks causing position drift
 * - Concurrent modification issues
 * - Animation conflicts
 * - Layout thrashing
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - Integrates with Graphics Handler position monitoring
 * - Reports through ChangeLog error context
 * - Non-invasive monitoring (no interference with normal operations)
 */

class SuddenPositionChangeDetector {
    constructor() {
        this.componentPositions = new Map(); // componentId -> position history
        this.thresholds = {
            suddenJumpDistance: 400, // px - distance that indicates a sudden jump
            velocityLimit: 2500, // px/s - max reasonable movement velocity  
            accumumulationThreshold: 200, // px - offset accumulation detection
            checkInterval: 100 // ms - how often to check positions
        };
        
        this.detectionState = {
            isMonitoring: false,
            errorCount: 0,
            lastCheck: 0,
            suspiciousComponents: new Set(),
            intervalId: null
        };
        
        this.errorHistory = [];
        this.maxHistorySize = 100;
        
        // Error type classifications
        this.errorTypes = {
            SUDDEN_JUMP: 'sudden_position_jump',
            OFFSET_ACCUMULATION: 'offset_accumulation',
            VELOCITY_OVERFLOW: 'excessive_velocity',
            POSITION_DRIFT: 'gradual_position_drift',
            LAYOUT_THRASH: 'layout_thrashing',
            CONCURRENT_MODIFICATION: 'concurrent_position_modification'
        };
    }

    /**
     * Start monitoring position changes
     */
    startMonitoring(changeLog = null) {
        if (this.detectionState.isMonitoring) {
            console.warn('⚠️ SuddenPositionChangeDetector already monitoring');
            return;
        }

        this.changeLog = changeLog;
        this.detectionState.isMonitoring = true;
        this.detectionState.lastCheck = Date.now();

        // Start periodic position checking
        this.detectionState.intervalId = setInterval(() => {
            this.checkAllComponentPositions();
        }, this.thresholds.checkInterval);

        // Subscribe to Graphics Handler position updates if available
        if (this.changeLog) {
            this.changeLog.subscribe('current_context_meta.graphics.layout', (data) => {
                this.onLayoutChange(data);
            });
            
            this.changeLog.subscribe('current_context_meta.style_updates', (data) => {
                this.onStyleUpdate(data);
            });
        }

        console.log('🔍 SuddenPositionChangeDetector monitoring started');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.detectionState.isMonitoring) return;

        this.detectionState.isMonitoring = false;
        
        if (this.detectionState.intervalId) {
            clearInterval(this.detectionState.intervalId);
            this.detectionState.intervalId = null;
        }

        console.log('🔍 SuddenPositionChangeDetector monitoring stopped');
    }

    /**
     * Register a component for position monitoring
     */
    registerComponent(componentId, initialPosition = null) {
        if (!componentId) return;

        const element = document.getElementById(componentId);
        if (!element) {
            console.warn(`⚠️ Cannot register component ${componentId} - element not found`);
            return;
        }

        const position = initialPosition || this.getElementPosition(element);
        
        this.componentPositions.set(componentId, {
            history: [{ 
                position, 
                timestamp: Date.now(),
                source: 'registration' 
            }],
            lastVelocity: { x: 0, y: 0 },
            suspiciousChangeCount: 0,
            element: element
        });

        console.log(`📍 Registered component for position monitoring: ${componentId}`);
    }

    /**
     * Unregister a component
     */
    unregisterComponent(componentId) {
        this.componentPositions.delete(componentId);
        this.detectionState.suspiciousComponents.delete(componentId);
    }

    /**
     * Check all registered components for position changes
     */
    checkAllComponentPositions() {
        const now = Date.now();
        const deltaTime = now - this.detectionState.lastCheck;
        
        for (const [componentId, data] of this.componentPositions.entries()) {
            this.checkComponentPosition(componentId, data, deltaTime);
        }
        
        this.detectionState.lastCheck = now;
    }

    /**
     * Check a specific component's position
     */
    checkComponentPosition(componentId, data, deltaTime) {
        const element = data.element;
        if (!element || !document.body.contains(element)) {
            // Element removed from DOM
            this.unregisterComponent(componentId);
            return;
        }

        const currentPosition = this.getElementPosition(element);
        const lastEntry = data.history[data.history.length - 1];
        
        if (!lastEntry) return;

        const positionChange = {
            x: currentPosition.x - lastEntry.position.x,
            y: currentPosition.y - lastEntry.position.y
        };

        const distance = Math.sqrt(positionChange.x ** 2 + positionChange.y ** 2);
        const velocity = deltaTime > 0 ? distance / (deltaTime / 1000) : 0;

        // Add current position to history
        data.history.push({
            position: currentPosition,
            timestamp: Date.now(),
            source: 'periodic_check',
            distance,
            velocity,
            deltaTime
        });

        // Limit history size
        if (data.history.length > 20) {
            data.history.shift();
        }

        // Run detection algorithms
        this.detectSuddenJump(componentId, data, distance, positionChange);
        this.detectVelocityOverflow(componentId, data, velocity);
        this.detectOffsetAccumulation(componentId, data);
        this.detectPositionDrift(componentId, data);
        this.detectLayoutThrashing(componentId, data);

        data.lastVelocity = { x: positionChange.x / (deltaTime / 1000), y: positionChange.y / (deltaTime / 1000) };
    }

    /**
     * Detect sudden position jumps (like the transform+left/top bug we fixed)
     */
    detectSuddenJump(componentId, data, distance, positionChange) {
        if (distance > this.thresholds.suddenJumpDistance) {
            const previousEntry = data.history[data.history.length - 2];
            const currentEntry = data.history[data.history.length - 1];
            
            console.error(`🚨 DEBUGGING SUDDEN JUMP for ${componentId}:`);
            console.error(`   Previous position:`, previousEntry?.position);
            console.error(`   Current position:`, currentEntry?.position);
            console.error(`   Previous CSS:`, previousEntry?.position?.css);
            console.error(`   Current CSS:`, currentEntry?.position?.css);
            console.error(`   Position change:`, positionChange);
            console.error(`   Distance:`, distance);
            console.error(`   Time difference:`, currentEntry?.timestamp - previousEntry?.timestamp, 'ms');
            
            const error = {
                type: this.errorTypes.SUDDEN_JUMP,
                componentId,
                severity: 'high',
                distance,
                positionChange,
                message: `Component ${componentId} jumped ${distance.toFixed(2)}px suddenly`,
                timestamp: Date.now(),
                context: {
                    previousPosition: previousEntry?.position,
                    currentPosition: currentEntry?.position,
                    previousCSS: previousEntry?.position?.css,
                    currentCSS: currentEntry?.position?.css,
                    timeDelta: currentEntry?.timestamp - previousEntry?.timestamp,
                    possibleCause: distance > 300 ? 'offset_accumulation' : 'animation_conflict'
                }
            };

            this.reportError(error);
            this.detectionState.suspiciousComponents.add(componentId);
            data.suspiciousChangeCount++;
        }
    }

    /**
     * Detect excessive movement velocity
     */
    detectVelocityOverflow(componentId, data, velocity) {
        if (velocity > this.thresholds.velocityLimit) {
            const error = {
                type: this.errorTypes.VELOCITY_OVERFLOW,
                componentId,
                severity: 'medium',
                velocity,
                message: `Component ${componentId} moving at ${velocity.toFixed(2)}px/s (limit: ${this.thresholds.velocityLimit}px/s)`,
                timestamp: Date.now(),
                context: {
                    recentHistory: data.history.slice(-5),
                    possibleCause: 'runaway_animation_or_calculation_error'
                }
            };

            this.reportError(error);
        }
    }

    /**
     * Detect offset accumulation (multiple positioning systems conflicting)
     */
    detectOffsetAccumulation(componentId, data) {
        if (data.history.length < 5) return;

        // Check for consistent small movements in same direction (accumulation pattern)
        const recentMoves = data.history.slice(-5);
        let totalDrift = { x: 0, y: 0 };
        let consistentDirection = true;
        let lastDirection = null;

        for (let i = 1; i < recentMoves.length; i++) {
            const move = {
                x: recentMoves[i].position.x - recentMoves[i-1].position.x,
                y: recentMoves[i].position.y - recentMoves[i-1].position.y
            };

            totalDrift.x += move.x;
            totalDrift.y += move.y;

            const direction = {
                x: move.x > 0 ? 1 : move.x < 0 ? -1 : 0,
                y: move.y > 0 ? 1 : move.y < 0 ? -1 : 0
            };

            if (lastDirection && (direction.x !== lastDirection.x || direction.y !== lastDirection.y)) {
                consistentDirection = false;
            }
            lastDirection = direction;
        }

        const totalDriftDistance = Math.sqrt(totalDrift.x ** 2 + totalDrift.y ** 2);

        if (consistentDirection && totalDriftDistance > this.thresholds.accumumulationThreshold) {
            const error = {
                type: this.errorTypes.OFFSET_ACCUMULATION,
                componentId,
                severity: 'high',
                totalDrift,
                totalDriftDistance,
                message: `Component ${componentId} showing offset accumulation pattern: ${totalDriftDistance.toFixed(2)}px total drift`,
                timestamp: Date.now(),
                context: {
                    recentHistory: recentMoves,
                    possibleCause: 'multiple_positioning_systems_conflict',
                    suggestion: 'Check for transform+left/top conflicts or multiple animation systems'
                }
            };

            this.reportError(error);
            this.detectionState.suspiciousComponents.add(componentId);
        }
    }

    /**
     * Detect gradual position drift
     */
    detectPositionDrift(componentId, data) {
        if (data.history.length < 10) return;

        const firstPosition = data.history[0].position;
        const currentPosition = data.history[data.history.length - 1].position;
        
        const totalDrift = Math.sqrt(
            (currentPosition.x - firstPosition.x) ** 2 + 
            (currentPosition.y - firstPosition.y) ** 2
        );

        // Check if component has drifted significantly without user interaction
        const timeSpan = data.history[data.history.length - 1].timestamp - data.history[0].timestamp;
        const driftRate = totalDrift / (timeSpan / 1000); // px per second

        if (totalDrift > 200 && driftRate < 10) { // Slow drift over time
            const error = {
                type: this.errorTypes.POSITION_DRIFT,
                componentId,
                severity: 'medium',
                totalDrift,
                driftRate,
                timeSpan,
                message: `Component ${componentId} has drifted ${totalDrift.toFixed(2)}px over ${(timeSpan/1000).toFixed(1)}s`,
                timestamp: Date.now(),
                context: {
                    startPosition: firstPosition,
                    currentPosition: currentPosition,
                    possibleCause: 'memory_leak_or_calculation_error'
                }
            };

            this.reportError(error);
        }
    }

    /**
     * Detect layout thrashing (rapid position changes)
     */
    detectLayoutThrashing(componentId, data) {
        if (data.history.length < 5) return;

        const recent = data.history.slice(-5);
        let rapidChanges = 0;
        const threshold = 10; // px

        for (let i = 1; i < recent.length; i++) {
            const distance = Math.sqrt(
                (recent[i].position.x - recent[i-1].position.x) ** 2 +
                (recent[i].position.y - recent[i-1].position.y) ** 2
            );
            
            if (distance > threshold && recent[i].deltaTime < 50) {
                rapidChanges++;
            }
        }

        if (rapidChanges >= 3) {
            const error = {
                type: this.errorTypes.LAYOUT_THRASH,
                componentId,
                severity: 'medium',
                rapidChanges,
                message: `Component ${componentId} showing layout thrashing: ${rapidChanges} rapid changes`,
                timestamp: Date.now(),
                context: {
                    recentHistory: recent,
                    possibleCause: 'animation_conflicts_or_css_issues'
                }
            };

            this.reportError(error);
        }
    }

    /**
     * Handle Graphics Handler layout changes
     */
    onLayoutChange(data) {
        if (data.componentId) {
            this.registerComponent(data.componentId);
        }
    }

    /**
     * Handle Graphics Handler style updates
     */
    onStyleUpdate(data) {
        if (data.componentId && data.styles) {
            // Auto-register component if not already registered
            if (!this.componentPositions.has(data.componentId)) {
                console.log(`🔍 Auto-registering component for monitoring: ${data.componentId}`);
                this.registerComponent(data.componentId);
            }
            
            // Check if position-related styles are being updated
            const positionStyles = ['left', 'top', 'transform', 'position'];
            const hasPositionUpdate = positionStyles.some(prop => prop in data.styles);
            
            if (hasPositionUpdate) {
                console.log(`🔍 Position update detected for ${data.componentId}:`, data.styles);
                
                // Force check this component on next cycle
                setTimeout(() => {
                    const componentData = this.componentPositions.get(data.componentId);
                    if (componentData) {
                        this.checkComponentPosition(data.componentId, componentData, 100);
                    }
                }, 10); // Reduced delay for more immediate detection
            }
        }
    }

    /**
     * Get element position (accounting for various positioning methods)
     */
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            rect: {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            },
            css: {
                left: computedStyle.left,
                top: computedStyle.top,
                transform: computedStyle.transform,
                position: computedStyle.position
            }
        };
    }

    /**
     * Report an error
     */
    reportError(error) {
        this.errorHistory.push(error);
        
        // Limit history size
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }

        this.detectionState.errorCount++;

        // Log to console
        console.error(`🚨 Position Error [${error.type}]:`, error.message, error);

        // Report to ChangeLog if available
        if (this.changeLog) {
            this.changeLog.updateContext('current_context_meta.errors.position_detector', {
                latestError: error,
                errorCount: this.detectionState.errorCount,
                suspiciousComponents: Array.from(this.detectionState.suspiciousComponents),
                timestamp: Date.now()
            });
        }

        // Trigger debugging aids for high severity errors
        if (error.severity === 'high') {
            this.triggerDebuggingAids(error);
        }
    }

    /**
     * Trigger debugging aids for severe errors
     */
    triggerDebuggingAids(error) {
        // Add visual indicators for debugging
        const element = document.getElementById(error.componentId);
        if (element) {
            element.style.outline = '3px solid red';
            element.style.outlineOffset = '2px';
            element.setAttribute('data-position-error', error.type);
            
            // Remove visual indicator after 5 seconds
            setTimeout(() => {
                element.style.outline = '';
                element.style.outlineOffset = '';
                element.removeAttribute('data-position-error');
            }, 5000);
        }

        // Create debugging overlay
        this.createDebuggingOverlay(error);
    }

    /**
     * Create debugging overlay with error information
     */
    createDebuggingOverlay(error) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        overlay.innerHTML = `
            <strong>Position Error Detected</strong><br>
            Component: ${error.componentId}<br>
            Type: ${error.type}<br>
            ${error.message}<br>
            <button onclick="this.parentElement.remove()" style="margin-top: 5px; background: white; color: red; border: none; padding: 2px 5px; border-radius: 3px; cursor: pointer;">Dismiss</button>
        `;

        document.body.appendChild(overlay);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (overlay.parentElement) {
                overlay.remove();
            }
        }, 10000);
    }

    /**
     * Get status and statistics
     */
    getStatus() {
        return {
            isMonitoring: this.detectionState.isMonitoring,
            componentCount: this.componentPositions.size,
            errorCount: this.detectionState.errorCount,
            suspiciousComponents: Array.from(this.detectionState.suspiciousComponents),
            recentErrors: this.errorHistory.slice(-10),
            thresholds: this.thresholds
        };
    }

    /**
     * Get detailed component information
     */
    getComponentInfo(componentId) {
        const data = this.componentPositions.get(componentId);
        if (!data) return null;

        return {
            componentId,
            currentPosition: data.history[data.history.length - 1]?.position,
            history: data.history,
            suspiciousChangeCount: data.suspiciousChangeCount,
            lastVelocity: data.lastVelocity,
            isSuspicious: this.detectionState.suspiciousComponents.has(componentId)
        };
    }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SuddenPositionChangeDetector;
} else {
    window.SuddenPositionChangeDetector = SuddenPositionChangeDetector;
}
