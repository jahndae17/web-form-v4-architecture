/**
 * Slingshot Error Detector
 * 
 * Detects "slingshot" behaviors where components:
 * - Move in one direction then suddenly snap back (rubber band effect)
 * - Overshoot their target and oscillate
 * - Experience momentum-based positioning errors
 * - Get "launched" due to calculation errors
 * 
 * Common causes:
 * - Physics simulation errors
 * - Animation spring overshoots
 * - Momentum calculations going wrong
 * - Multiple animation systems conflicting
 * - Mouse/touch event lag causing position corrections
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - Works with Graphics Handler animation monitoring
 * - Integrates with SuddenPositionChangeDetector
 * - Reports through ChangeLog error context
 */

class SlingShotErrorDetector {
    constructor(positionDetector = null) {
        this.positionDetector = positionDetector;
        this.componentTrackingData = new Map(); // componentId -> movement tracking
        
        this.thresholds = {
            slingshotDistance: 150, // px - distance that indicates slingshot
            snapBackTime: 500, // ms - time window for snap-back detection
            oscillationCount: 3, // number of direction changes indicating oscillation
            momentumDecayRate: 0.8, // expected momentum decay rate
            overshootThreshold: 50, // px - how much overshoot indicates error
            launchVelocity: 3000, // px/s - velocity that indicates "launch" error
        };
        
        this.detectionState = {
            isMonitoring: false,
            errorCount: 0,
            activeTrackings: new Set(),
            intervalId: null
        };
        
        this.errorHistory = [];
        this.maxHistorySize = 50;
        
        // Error type classifications
        this.errorTypes = {
            RUBBER_BAND: 'rubber_band_snapback',
            OVERSHOOT: 'target_overshoot',
            OSCILLATION: 'position_oscillation', 
            LAUNCH: 'component_launch',
            MOMENTUM_ERROR: 'momentum_calculation_error',
            SPRING_OVERFLOW: 'spring_animation_overflow',
            LAG_CORRECTION: 'input_lag_correction'
        };

        // Pattern recognition data
        this.patterns = {
            rubberBand: {
                minDistance: 100,
                maxSnapBackTime: 600,
                directionReversalRequired: true
            },
            overshoot: {
                minOvershoot: 30,
                settlingTime: 1000,
                dampingRequired: true
            },
            oscillation: {
                minOscillations: 2,
                maxOscillationTime: 2000,
                amplitudeDecayRequired: true
            }
        };
    }

    /**
     * Start monitoring for slingshot behaviors
     */
    startMonitoring(changeLog = null) {
        if (this.detectionState.isMonitoring) {
            console.warn('⚠️ SlingShotErrorDetector already monitoring');
            return;
        }

        this.changeLog = changeLog;
        this.detectionState.isMonitoring = true;

        // Start periodic analysis
        this.detectionState.intervalId = setInterval(() => {
            this.analyzeActiveMovements();
        }, 100);

        // Subscribe to position detector if available
        if (this.positionDetector) {
            this.positionDetector.onPositionChange = (componentId, data) => {
                this.onPositionChange(componentId, data);
            };
        }

        // Subscribe to ChangeLog events
        if (this.changeLog) {
            this.changeLog.subscribe('current_context_meta.graphics.animations', (data) => {
                this.onAnimationStart(data);
            });
            
            this.changeLog.subscribe('current_context_meta.style_updates', (data) => {
                this.onStyleUpdate(data);
            });
        }

        console.log('🎯 SlingShotErrorDetector monitoring started');
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

        console.log('🎯 SlingShotErrorDetector monitoring stopped');
    }

    /**
     * Start tracking a component's movement
     */
    startTracking(componentId, initialPosition, movementType = 'user') {
        const trackingData = {
            componentId,
            startTime: Date.now(),
            startPosition: initialPosition,
            currentPosition: initialPosition,
            targetPosition: null,
            movementType, // 'user', 'animation', 'physics'
            
            // Movement history for pattern analysis
            positionHistory: [{
                position: initialPosition,
                timestamp: Date.now(),
                velocity: { x: 0, y: 0 },
                source: 'start'
            }],
            
            // Direction change tracking
            directionChanges: [],
            
            // Velocity tracking
            velocityHistory: [],
            maxVelocity: 0,
            
            // Pattern flags
            hasReversed: false,
            overshootDetected: false,
            oscillationCount: 0,
            
            // State
            isActive: true,
            completed: false
        };

        this.componentTrackingData.set(componentId, trackingData);
        this.detectionState.activeTrackings.add(componentId);
        
        console.log(`🎯 Started tracking component: ${componentId}`);
    }

    /**
     * Update component position during movement
     */
    updatePosition(componentId, newPosition, source = 'update') {
        const trackingData = this.componentTrackingData.get(componentId);
        if (!trackingData || !trackingData.isActive) return;

        const now = Date.now();
        const lastEntry = trackingData.positionHistory[trackingData.positionHistory.length - 1];
        
        if (!lastEntry) return;

        // Calculate velocity
        const deltaTime = now - lastEntry.timestamp;
        const deltaPosition = {
            x: newPosition.x - lastEntry.position.x,
            y: newPosition.y - lastEntry.position.y
        };
        
        const velocity = deltaTime > 0 ? {
            x: deltaPosition.x / (deltaTime / 1000),
            y: deltaPosition.y / (deltaTime / 1000)
        } : { x: 0, y: 0 };

        const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
        
        // Track maximum velocity
        if (speed > trackingData.maxVelocity) {
            trackingData.maxVelocity = speed;
        }

        // Add to position history
        trackingData.positionHistory.push({
            position: newPosition,
            timestamp: now,
            velocity,
            speed,
            deltaTime,
            source
        });

        // Add to velocity history
        trackingData.velocityHistory.push({
            velocity,
            speed,
            timestamp: now
        });

        // Limit history size
        if (trackingData.positionHistory.length > 50) {
            trackingData.positionHistory.shift();
        }
        if (trackingData.velocityHistory.length > 30) {
            trackingData.velocityHistory.shift();
        }

        // Detect direction changes
        this.detectDirectionChange(trackingData, velocity);
        
        // Update current position
        trackingData.currentPosition = newPosition;

        // Run real-time analysis
        this.analyzeMovementPattern(trackingData);
    }

    /**
     * Set target position for movement (helps detect overshoots)
     */
    setTargetPosition(componentId, targetPosition) {
        const trackingData = this.componentTrackingData.get(componentId);
        if (trackingData) {
            trackingData.targetPosition = targetPosition;
        }
    }

    /**
     * Stop tracking a component
     */
    stopTracking(componentId, reason = 'completed') {
        const trackingData = this.componentTrackingData.get(componentId);
        if (!trackingData) return;

        trackingData.isActive = false;
        trackingData.completed = true;
        trackingData.endTime = Date.now();
        trackingData.endReason = reason;

        this.detectionState.activeTrackings.delete(componentId);

        // Final analysis
        this.performFinalAnalysis(trackingData);
        
        console.log(`🎯 Stopped tracking component: ${componentId} (${reason})`);
    }

    /**
     * Detect direction changes in movement
     */
    detectDirectionChange(trackingData, currentVelocity) {
        const history = trackingData.velocityHistory;
        if (history.length < 2) return;

        const lastVelocity = history[history.length - 1].velocity;
        
        // Check for direction reversal
        const xReversal = (lastVelocity.x > 0 && currentVelocity.x < 0) || 
                         (lastVelocity.x < 0 && currentVelocity.x > 0);
        const yReversal = (lastVelocity.y > 0 && currentVelocity.y < 0) || 
                         (lastVelocity.y < 0 && currentVelocity.y > 0);

        if (xReversal || yReversal) {
            const change = {
                timestamp: Date.now(),
                position: trackingData.currentPosition,
                previousVelocity: lastVelocity,
                newVelocity: currentVelocity,
                type: xReversal && yReversal ? 'full_reversal' : 'partial_reversal'
            };

            trackingData.directionChanges.push(change);
            trackingData.hasReversed = true;

            // Check for oscillation
            if (trackingData.directionChanges.length >= this.thresholds.oscillationCount) {
                trackingData.oscillationCount++;
            }
        }
    }

    /**
     * Analyze movement pattern in real-time
     */
    analyzeMovementPattern(trackingData) {
        // Check for launch behavior (excessive velocity)
        if (trackingData.maxVelocity > this.thresholds.launchVelocity) {
            this.detectLaunchError(trackingData);
        }

        // Check for overshoot if we have a target
        if (trackingData.targetPosition) {
            this.detectOvershoot(trackingData);
        }

        // Check for rubber band behavior
        this.detectRubberBand(trackingData);

        // Check for oscillation
        if (trackingData.oscillationCount >= this.thresholds.oscillationCount) {
            this.detectOscillation(trackingData);
        }
    }

    /**
     * Detect launch errors (component "shot" at high velocity)
     */
    detectLaunchError(trackingData) {
        const error = {
            type: this.errorTypes.LAUNCH,
            componentId: trackingData.componentId,
            severity: 'critical',
            maxVelocity: trackingData.maxVelocity,
            message: `Component ${trackingData.componentId} launched at ${trackingData.maxVelocity.toFixed(2)}px/s`,
            timestamp: Date.now(),
            context: {
                startPosition: trackingData.startPosition,
                currentPosition: trackingData.currentPosition,
                movementType: trackingData.movementType,
                recentVelocity: trackingData.velocityHistory.slice(-5),
                possibleCause: 'calculation_overflow_or_physics_error'
            }
        };

        this.reportError(error);
    }

    /**
     * Detect overshoot behavior
     */
    detectOvershoot(trackingData) {
        if (trackingData.overshootDetected) return;

        const target = trackingData.targetPosition;
        const current = trackingData.currentPosition;

        const distanceToTarget = Math.sqrt(
            (current.x - target.x) ** 2 + (current.y - target.y) ** 2
        );

        // Check if we've moved past the target significantly
        if (distanceToTarget > this.thresholds.overshootThreshold) {
            // Check if we're moving away from target
            const history = trackingData.positionHistory;
            if (history.length >= 2) {
                const prev = history[history.length - 2].position;
                const prevDistance = Math.sqrt(
                    (prev.x - target.x) ** 2 + (prev.y - target.y) ** 2
                );

                if (distanceToTarget > prevDistance) {
                    trackingData.overshootDetected = true;

                    const error = {
                        type: this.errorTypes.OVERSHOOT,
                        componentId: trackingData.componentId,
                        severity: 'medium',
                        overshootDistance: distanceToTarget,
                        targetPosition: target,
                        currentPosition: current,
                        message: `Component ${trackingData.componentId} overshot target by ${distanceToTarget.toFixed(2)}px`,
                        timestamp: Date.now(),
                        context: {
                            movementType: trackingData.movementType,
                            maxVelocity: trackingData.maxVelocity,
                            possibleCause: 'animation_spring_overshoot_or_momentum_error'
                        }
                    };

                    this.reportError(error);
                }
            }
        }
    }

    /**
     * Detect rubber band / snap back behavior
     */
    detectRubberBand(trackingData) {
        if (!trackingData.hasReversed || trackingData.directionChanges.length === 0) return;

        const latestChange = trackingData.directionChanges[trackingData.directionChanges.length - 1];
        const timeSinceChange = Date.now() - latestChange.timestamp;

        if (timeSinceChange > this.thresholds.snapBackTime) return;

        // Check if we've moved significantly and then snapped back
        const startPos = trackingData.startPosition;
        const changePos = latestChange.position;
        const currentPos = trackingData.currentPosition;

        const distanceOut = Math.sqrt(
            (changePos.x - startPos.x) ** 2 + (changePos.y - startPos.y) ** 2
        );

        const distanceBack = Math.sqrt(
            (currentPos.x - startPos.x) ** 2 + (currentPos.y - startPos.y) ** 2
        );

        if (distanceOut > this.thresholds.slingshotDistance && distanceBack < distanceOut * 0.3) {
            const error = {
                type: this.errorTypes.RUBBER_BAND,
                componentId: trackingData.componentId,
                severity: 'high',
                maxDistance: distanceOut,
                snapBackDistance: distanceBack,
                snapBackTime: timeSinceChange,
                message: `Component ${trackingData.componentId} rubber band: moved ${distanceOut.toFixed(2)}px then snapped back to ${distanceBack.toFixed(2)}px`,
                timestamp: Date.now(),
                context: {
                    startPosition: startPos,
                    maxExtensionPosition: changePos,
                    currentPosition: currentPos,
                    directionChanges: trackingData.directionChanges,
                    possibleCause: 'spring_constraint_or_boundary_collision'
                }
            };

            this.reportError(error);
        }
    }

    /**
     * Detect oscillation behavior
     */
    detectOscillation(trackingData) {
        const changes = trackingData.directionChanges;
        if (changes.length < this.thresholds.oscillationCount) return;

        const recentChanges = changes.slice(-this.thresholds.oscillationCount);
        const timeSpan = recentChanges[recentChanges.length - 1].timestamp - recentChanges[0].timestamp;

        if (timeSpan < this.patterns.oscillation.maxOscillationTime) {
            const error = {
                type: this.errorTypes.OSCILLATION,
                componentId: trackingData.componentId,
                severity: 'medium',
                oscillationCount: trackingData.oscillationCount,
                timeSpan,
                message: `Component ${trackingData.componentId} oscillating: ${trackingData.oscillationCount} direction changes in ${timeSpan}ms`,
                timestamp: Date.now(),
                context: {
                    directionChanges: recentChanges,
                    movementType: trackingData.movementType,
                    possibleCause: 'animation_instability_or_competing_forces'
                }
            };

            this.reportError(error);
        }
    }

    /**
     * Perform final analysis when tracking stops
     */
    performFinalAnalysis(trackingData) {
        const totalTime = trackingData.endTime - trackingData.startTime;
        const totalDistance = Math.sqrt(
            (trackingData.currentPosition.x - trackingData.startPosition.x) ** 2 +
            (trackingData.currentPosition.y - trackingData.startPosition.y) ** 2
        );

        // Check for momentum calculation errors
        if (trackingData.velocityHistory.length > 5) {
            this.analyzeMomentumBehavior(trackingData);
        }

        // Log movement summary
        console.log(`📊 Movement analysis for ${trackingData.componentId}:`, {
            totalTime,
            totalDistance,
            maxVelocity: trackingData.maxVelocity,
            directionChanges: trackingData.directionChanges.length,
            oscillations: trackingData.oscillationCount,
            overshoot: trackingData.overshootDetected
        });
    }

    /**
     * Analyze momentum behavior for calculation errors
     */
    analyzeMomentumBehavior(trackingData) {
        const velocities = trackingData.velocityHistory;
        
        // Check for unrealistic velocity changes
        for (let i = 1; i < velocities.length; i++) {
            const prev = velocities[i - 1];
            const curr = velocities[i];
            
            const velocityChange = Math.sqrt(
                (curr.velocity.x - prev.velocity.x) ** 2 +
                (curr.velocity.y - prev.velocity.y) ** 2
            );

            const timeChange = curr.timestamp - prev.timestamp;
            const acceleration = velocityChange / (timeChange / 1000);

            // Check for unrealistic acceleration (likely calculation error)
            if (acceleration > 10000) { // 10,000 px/s²
                const error = {
                    type: this.errorTypes.MOMENTUM_ERROR,
                    componentId: trackingData.componentId,
                    severity: 'high',
                    acceleration,
                    velocityChange,
                    timeChange,
                    message: `Component ${trackingData.componentId} momentum error: acceleration ${acceleration.toFixed(2)}px/s²`,
                    timestamp: Date.now(),
                    context: {
                        previousVelocity: prev.velocity,
                        currentVelocity: curr.velocity,
                        possibleCause: 'physics_calculation_overflow'
                    }
                };

                this.reportError(error);
            }
        }
    }

    /**
     * Analyze all active movements
     */
    analyzeActiveMovements() {
        for (const componentId of this.detectionState.activeTrackings) {
            const trackingData = this.componentTrackingData.get(componentId);
            if (trackingData && trackingData.isActive) {
                // Check for stale movements (might indicate hung animations)
                const timeSinceLastUpdate = Date.now() - 
                    trackingData.positionHistory[trackingData.positionHistory.length - 1]?.timestamp;

                if (timeSinceLastUpdate > 5000) { // 5 seconds
                    this.stopTracking(componentId, 'timeout');
                }
            }
        }
    }

    /**
     * Handle position changes from position detector
     */
    onPositionChange(componentId, data) {
        // If we're not already tracking this component, start tracking
        if (!this.componentTrackingData.has(componentId)) {
            this.startTracking(componentId, data.position, 'detected');
        } else {
            this.updatePosition(componentId, data.position, 'detected');
        }
    }

    /**
     * Handle animation start events
     */
    onAnimationStart(data) {
        if (data.componentId) {
            // Start tracking animated components
            const element = document.getElementById(data.componentId);
            if (element) {
                const rect = element.getBoundingClientRect();
                const position = {
                    x: rect.left + window.scrollX,
                    y: rect.top + window.scrollY
                };
                
                this.startTracking(data.componentId, position, 'animation');
            }
        }
    }

    /**
     * Handle style updates
     */
    onStyleUpdate(data) {
        if (data.componentId && data.styles) {
            const positionStyles = ['left', 'top', 'transform'];
            const hasPositionUpdate = positionStyles.some(prop => prop in data.styles);
            
            if (hasPositionUpdate) {
                const element = document.getElementById(data.componentId);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const position = {
                        x: rect.left + window.scrollX,
                        y: rect.top + window.scrollY
                    };
                    
                    this.updatePosition(data.componentId, position, 'style_update');
                }
            }
        }
    }

    /**
     * Report an error
     */
    reportError(error) {
        this.errorHistory.push(error);
        
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }

        this.detectionState.errorCount++;

        // Log to console
        console.error(`🎯 Slingshot Error [${error.type}]:`, error.message, error);

        // Report to ChangeLog
        if (this.changeLog) {
            this.changeLog.updateContext('current_context_meta.errors.slingshot_detector', {
                latestError: error,
                errorCount: this.detectionState.errorCount,
                activeTrackings: Array.from(this.detectionState.activeTrackings),
                timestamp: Date.now()
            });
        }

        // Visual debugging for critical errors
        if (error.severity === 'critical' || error.severity === 'high') {
            this.createSlingshotDebuggingAid(error);
        }
    }

    /**
     * Create visual debugging aid for slingshot errors
     */
    createSlingshotDebuggingAid(error) {
        const element = document.getElementById(error.componentId);
        if (!element) return;

        // Add visual indicator
        element.style.outline = '3px dashed orange';
        element.style.outlineOffset = '5px';
        element.setAttribute('data-slingshot-error', error.type);

        // Create movement trail visualization
        const trackingData = this.componentTrackingData.get(error.componentId);
        if (trackingData && trackingData.positionHistory.length > 1) {
            this.drawMovementTrail(trackingData);
        }

        // Remove indicators after debugging
        setTimeout(() => {
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.removeAttribute('data-slingshot-error');
            this.clearMovementTrail(error.componentId);
        }, 10000);
    }

    /**
     * Draw movement trail for debugging
     */
    drawMovementTrail(trackingData) {
        const trailContainer = document.createElement('div');
        trailContainer.id = `trail-${trackingData.componentId}`;
        trailContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

        const history = trackingData.positionHistory;
        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1].position;
            const curr = history[i].position;

            const line = document.createElement('div');
            const length = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
            const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x) * 180 / Math.PI;

            line.style.cssText = `
                position: absolute;
                left: ${prev.x}px;
                top: ${prev.y}px;
                width: ${length}px;
                height: 2px;
                background: linear-gradient(to right, rgba(255,165,0,0.8), rgba(255,69,0,0.8));
                transform: rotate(${angle}deg);
                transform-origin: 0 50%;
            `;

            trailContainer.appendChild(line);
        }

        document.body.appendChild(trailContainer);
    }

    /**
     * Clear movement trail
     */
    clearMovementTrail(componentId) {
        const trail = document.getElementById(`trail-${componentId}`);
        if (trail) {
            trail.remove();
        }
    }

    /**
     * Get status and statistics
     */
    getStatus() {
        return {
            isMonitoring: this.detectionState.isMonitoring,
            activeTrackings: this.detectionState.activeTrackings.size,
            errorCount: this.detectionState.errorCount,
            recentErrors: this.errorHistory.slice(-5),
            thresholds: this.thresholds,
            trackingData: Array.from(this.componentTrackingData.keys())
        };
    }

    /**
     * Get detailed tracking info for a component
     */
    getTrackingInfo(componentId) {
        const data = this.componentTrackingData.get(componentId);
        if (!data) return null;

        return {
            componentId,
            isActive: data.isActive,
            startTime: data.startTime,
            endTime: data.endTime,
            movementType: data.movementType,
            startPosition: data.startPosition,
            currentPosition: data.currentPosition,
            targetPosition: data.targetPosition,
            maxVelocity: data.maxVelocity,
            directionChanges: data.directionChanges.length,
            oscillationCount: data.oscillationCount,
            hasReversed: data.hasReversed,
            overshootDetected: data.overshootDetected
        };
    }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SlingShotErrorDetector;
} else {
    window.SlingShotErrorDetector = SlingShotErrorDetector;
}
