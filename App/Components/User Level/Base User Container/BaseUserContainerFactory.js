/**
 * BaseUserContainerFactory.js - Factory for creating BaseUserContainer instances
 * 
 * ARCHITECTURE COMPLIANCE:
 * ✅ Factory pattern for consistent component creation
 * ✅ NO direct DOM manipulation - returns data structures only
 * ✅ NO event listeners - components register with Event Handler
 * ✅ Integration with Graphics Handler through proper schema
 * ✅ Behavior composition pattern for modular functionality
 * ✅ ChangeLog integration for state synchronization
 */

// Import dependencies based on environment
let BaseUserContainer, BaseUserContainerBehavior, SelectableBehavior, ResizeableBehavior;

if (typeof window !== 'undefined') {
    // Browser environment - assume global classes
    BaseUserContainer = window.BaseUserContainer;
    BaseUserContainerBehavior = window.BaseUserContainerBehavior;
    SelectableBehavior = window.SelectableBehavior;
    ResizeableBehavior = window.ResizeableBehavior;
    
    // Debug dependency availability
    console.log('🏭 BaseUserContainerFactory loading...');
    console.log('Dependencies check:', {
        BaseUserContainer: typeof BaseUserContainer,
        BaseUserContainerBehavior: typeof BaseUserContainerBehavior,
        SelectableBehavior: typeof SelectableBehavior,
        ResizeableBehavior: typeof ResizeableBehavior
    });
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    BaseUserContainer = require('./BaseUserContainer.js');
    BaseUserContainerBehavior = require('./BaseUserContainerBehavior.js');
    SelectableBehavior = require('./SelectableBehavior.js');
    ResizeableBehavior = require('./ResizeableBehavior.js');
}

class BaseUserContainerFactory {
    constructor() {
        this.instanceCounter = 0;
        this.presets = new Map();
        this.templates = new Map();
        
        // Initialize default presets
        this._initializePresets();
        this._initializeTemplates();
        
        console.log('🏭 BaseUserContainerFactory initialized');
    }

    // ========================
    // FACTORY CREATION METHODS
    // ========================

    /**
     * Create a new BaseUserContainer instance with specified configuration
     * @param {Object} config - Configuration object
     * @param {string} config.preset - Preset name to use (optional)
     * @param {string} config.containerId - Unique container ID (optional - auto-generated)
     * @param {Object} config.parent - Parent container reference
     * @param {Object} config.options - Additional options to override preset
     * @returns {Object} Factory result with container instance and metadata
     */
    createContainer(config = {}) {
        try {
            // Generate unique ID if not provided
            const containerId = config.containerId || this._generateContainerId();
            
            // Get base configuration from preset
            let baseOptions = {};
            if (config.preset && this.presets.has(config.preset)) {
                baseOptions = { ...this.presets.get(config.preset) };
                console.log(`🏭 Using preset: ${config.preset}`);
            }
            
            // Merge with custom options
            const finalOptions = { 
                ...baseOptions, 
                ...config.options,
                factoryGenerated: true,
                factoryVersion: '1.0.0',
                createdAt: Date.now()
            };
            
            // If an existing DOM element is provided, pass it through
            if (config.existingElement) {
                finalOptions.existingElement = config.existingElement;
                console.log(`🏭 Factory: Using provided DOM element for container: ${containerId}`);
            }

            // Create the BaseUserContainer instance
            const container = new BaseUserContainer(containerId, config.parent, finalOptions);
            
            // Create and attach behavior
            const behavior = new BaseUserContainerBehavior(container);
            container.behavior = behavior;
            
            // Attach sub-behaviors if enabled
            this._attachSubBehaviors(container, finalOptions);
            
            // Initialize container
            const initResult = this._initializeContainer(container, finalOptions);
            if (!initResult.success) {
                throw new Error(`Container initialization failed: ${initResult.error}`);
            }

            this.instanceCounter++;
            
            console.log(`🏭 BaseUserContainer created: ${containerId} (preset: ${config.preset || 'default'})`);
            
            return {
                success: true,
                container: container,
                behavior: behavior,
                metadata: {
                    factoryId: this.instanceCounter,
                    preset: config.preset || 'default',
                    createdAt: finalOptions.createdAt,
                    containerId: containerId
                },
                changeLog: {
                    type: 'container_created',
                    factoryType: 'BaseUserContainerFactory',
                    containerId: containerId,
                    preset: config.preset || 'default',
                    timestamp: Date.now()
                }
            };

        } catch (error) {
            console.error('❌ BaseUserContainerFactory creation failed:', error);
            return {
                success: false,
                error: error.message,
                changeLog: {
                    type: 'container_creation_failed',
                    factoryType: 'BaseUserContainerFactory',
                    error: error.message,
                    timestamp: Date.now()
                }
            };
        }
    }

    /**
     * Create multiple containers from a template
     * @param {string} templateName - Template name
     * @param {Array} containerConfigs - Array of container configurations
     * @returns {Object} Factory result with multiple containers
     */
    createFromTemplate(templateName, containerConfigs = []) {
        if (!this.templates.has(templateName)) {
            return {
                success: false,
                error: `Template '${templateName}' not found`,
                availableTemplates: Array.from(this.templates.keys())
            };
        }

        const template = this.templates.get(templateName);
        const results = [];
        const errors = [];

        containerConfigs.forEach((config, index) => {
            const mergedConfig = {
                preset: template.defaultPreset,
                ...config,
                options: {
                    ...template.defaultOptions,
                    ...config.options
                }
            };

            const result = this.createContainer(mergedConfig);
            if (result.success) {
                results.push(result);
            } else {
                errors.push({ index, error: result.error });
            }
        });

        return {
            success: errors.length === 0,
            containers: results,
            errors: errors,
            template: templateName,
            changeLog: {
                type: 'template_containers_created',
                templateName: templateName,
                containerCount: results.length,
                errorCount: errors.length,
                timestamp: Date.now()
            }
        };
    }

    /**
     * Clone an existing container with modifications
     * @param {BaseUserContainer} sourceContainer - Container to clone
     * @param {Object} modifications - Properties to modify in the clone
     * @returns {Object} Factory result with cloned container
     */
    cloneContainer(sourceContainer, modifications = {}) {
        try {
            // Extract configuration from source container
            const sourceConfig = this._extractContainerConfig(sourceContainer);
            
            // Apply modifications
            const cloneConfig = {
                parent: modifications.parent || sourceContainer.parent,
                options: {
                    ...sourceConfig,
                    ...modifications,
                    // Generate new ID for clone
                    clonedFrom: sourceContainer.containerId,
                    isClone: true
                }
            };

            const result = this.createContainer(cloneConfig);
            
            if (result.success) {
                result.changeLog.type = 'container_cloned';
                result.changeLog.sourceContainerId = sourceContainer.containerId;
            }

            return result;

        } catch (error) {
            return {
                success: false,
                error: error.message,
                changeLog: {
                    type: 'container_clone_failed',
                    sourceContainerId: sourceContainer?.containerId,
                    error: error.message,
                    timestamp: Date.now()
                }
            };
        }
    }

    // ========================
    // PRESET MANAGEMENT
    // ========================

    /**
     * Register a new preset configuration
     * @param {string} name - Preset name
     * @param {Object} config - Preset configuration
     */
    registerPreset(name, config) {
        this.presets.set(name, { ...config });
        console.log(`🏭 Preset registered: ${name}`);
        
        return {
            success: true,
            presetName: name,
            changeLog: {
                type: 'preset_registered',
                presetName: name,
                timestamp: Date.now()
            }
        };
    }

    /**
     * Get available presets
     * @returns {Array} List of available preset names
     */
    getAvailablePresets() {
        return Array.from(this.presets.keys());
    }

    /**
     * Get preset configuration
     * @param {string} name - Preset name
     * @returns {Object} Preset configuration
     */
    getPreset(name) {
        return this.presets.get(name) || null;
    }

    // ========================
    // TEMPLATE MANAGEMENT
    // ========================

    /**
     * Register a new template
     * @param {string} name - Template name
     * @param {Object} template - Template configuration
     */
    registerTemplate(name, template) {
        this.templates.set(name, { ...template });
        console.log(`🏭 Template registered: ${name}`);
        
        return {
            success: true,
            templateName: name,
            changeLog: {
                type: 'template_registered',
                templateName: name,
                timestamp: Date.now()
            }
        };
    }

    /**
     * Get available templates
     * @returns {Array} List of available template names
     */
    getAvailableTemplates() {
        return Array.from(this.templates.keys());
    }

    // ========================
    // UTILITY METHODS
    // ========================

    /**
     * Generate unique container ID
     * @returns {string} Unique container ID
     */
    _generateContainerId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `base_user_container_${timestamp}_${random}`;
    }

    /**
     * Initialize default presets
     */
    _initializePresets() {
        // Basic Form Input Container
        this.registerPreset('form_input', {
            userType: 'interactive',
            formRole: 'input',
            acceptsInput: true,
            validationRequired: true,
            accessibilityRole: 'textbox',
            tabIndex: 0,
            visualSchema: {
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                fontSize: '14px',
                fontFamily: 'system-ui, sans-serif'
            }
        });

        // Layout Container
        this.registerPreset('layout_container', {
            userType: 'interactive',
            formRole: 'layout',
            acceptsInput: false,
            validationRequired: false,
            accessibilityRole: 'group',
            canBeNested: true,
            visualSchema: {
                border: '2px dashed #ccc',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#f9f9f9',
                minHeight: '100px'
            }
        });

        // Display Only Container
        this.registerPreset('display_only', {
            userType: 'display-only',
            formRole: 'container',
            acceptsInput: false,
            validationRequired: false,
            isSelectable: false,
            isResizeable: false,
            isMovable: false,
            accessibilityRole: 'presentation',
            visualSchema: {
                border: 'none',
                backgroundColor: 'transparent',
                padding: '4px'
            }
        });

        // Validation Container
        this.registerPreset('validation_container', {
            userType: 'interactive',
            formRole: 'validation',
            acceptsInput: false,
            validationRequired: true,
            accessibilityRole: 'alert',
            visualSchema: {
                border: '1px solid #dc3545',
                borderRadius: '4px',
                padding: '8px',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                fontSize: '12px'
            }
        });

        console.log('🏭 Default presets initialized:', this.getAvailablePresets());
    }

    /**
     * Initialize default templates
     */
    _initializeTemplates() {
        // Basic Form Template
        this.registerTemplate('basic_form', {
            defaultPreset: 'layout_container',
            defaultOptions: {
                formRole: 'layout',
                canBeNested: true
            },
            description: 'Basic form layout with input containers'
        });

        // Survey Form Template
        this.registerTemplate('survey_form', {
            defaultPreset: 'form_input',
            defaultOptions: {
                validationRequired: true,
                accessibilityRole: 'form'
            },
            description: 'Survey form with validation and accessibility'
        });

        console.log('🏭 Default templates initialized:', this.getAvailableTemplates());
    }

    /**
     * Attach sub-behaviors to container
     * @param {BaseUserContainer} container - Container instance
     * @param {Object} options - Configuration options
     */
    _attachSubBehaviors(container, options) {
        try {
            // Attach SelectableBehavior if enabled and available
            if (container.isSelectable && SelectableBehavior) {
                const selectableBehavior = new SelectableBehavior();
                const attachResult = selectableBehavior.attachToBehavior(container);
                if (attachResult.success) {
                    container.behavior.selectableBehavior = selectableBehavior;
                    console.log(`🏭 SelectableBehavior attached to ${container.containerId}`);
                }
            }

            // Attach ResizeableBehavior if enabled and available
            if (container.isResizeable && ResizeableBehavior) {
                const resizeableBehavior = new ResizeableBehavior();
                const attachResult = resizeableBehavior.attachToBehavior(container);
                if (attachResult.success) {
                    container.behavior.resizeableBehavior = resizeableBehavior;
                    console.log(`🏭 ResizeableBehavior attached to ${container.containerId}`);
                }
            }

        } catch (error) {
            console.warn('⚠️ Sub-behavior attachment failed:', error.message);
        }
    }

    /**
     * Initialize container with factory-specific setup
     * @param {BaseUserContainer} container - Container instance
     * @param {Object} options - Configuration options
     * @returns {Object} Initialization result
     */
    _initializeContainer(container, options) {
        try {
            // Set factory metadata
            container.factoryGenerated = true;
            container.factoryVersion = options.factoryVersion;
            container.createdAt = options.createdAt;

            // Initialize container state
            container.isInitialized = true;

            // Generate visual schema for Graphics Handler
            if (options.visualSchema) {
                container.visualSchema = options.visualSchema;
            }

            return { success: true };

        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    /**
     * Extract configuration from existing container for cloning
     * @param {BaseUserContainer} container - Source container
     * @returns {Object} Extracted configuration
     */
    _extractContainerConfig(container) {
        return {
            userType: container.userType,
            formRole: container.formRole,
            acceptsInput: container.acceptsInput,
            validationRequired: container.validationRequired,
            accessibilityRole: container.accessibilityRole,
            tabIndex: container.tabIndex,
            formName: container.formName,
            isRequired: container.isRequired,
            validationRules: [...container.validationRules],
            canBeNested: container.canBeNested,
            visualSchema: container.visualSchema ? { ...container.visualSchema } : null
        };
    }

    // ========================
    // FACTORY INFORMATION
    // ========================

    /**
     * Get factory statistics
     * @returns {Object} Factory statistics
     */
    getFactoryStats() {
        return {
            instancesCreated: this.instanceCounter,
            availablePresets: this.getAvailablePresets().length,
            availableTemplates: this.getAvailableTemplates().length,
            factoryVersion: '1.0.0',
            presetsRegistered: this.getAvailablePresets(),
            templatesRegistered: this.getAvailableTemplates()
        };
    }

    /**
     * Reset factory state (useful for testing)
     */
    reset() {
        this.instanceCounter = 0;
        this.presets.clear();
        this.templates.clear();
        this._initializePresets();
        this._initializeTemplates();
        
        console.log('🏭 BaseUserContainerFactory reset');
        
        return {
            success: true,
            changeLog: {
                type: 'factory_reset',
                timestamp: Date.now()
            }
        };
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseUserContainerFactory;
} else if (typeof window !== 'undefined') {
    window.BaseUserContainerFactory = BaseUserContainerFactory;
    console.log('🏭 BaseUserContainerFactory exported to window');
}

console.log('🏭 BaseUserContainerFactory loaded - Factory pattern implementation');
