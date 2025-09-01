/**
 * NativeSignInFactory.js - Factory for creating NativeSignIn instances
 * 
 * Extends BaseUserContainerFactory to create authentication components.
 * Provides preconfigured sign-in components with proper behavior integration.
 * 
 * ARCHITECTURAL COMPLIANCE:
 * ✅ Factory pattern for consistent component creation
 * ✅ NO direct DOM manipulation - returns data structures only
 * ✅ NO event listeners - components register with Event Handler
 * ✅ Integration with Graphics Handler through proper schema
 * ✅ Behavior composition pattern for authentication functionality
 */

class NativeSignInFactory extends BaseUserContainerFactory {
    constructor() {
        super();
        
        // Initialize authentication-specific presets
        this._initializeAuthPresets();
        
        console.log('🔐 NativeSignInFactory initialized');
    }
    
    /**
     * Initialize authentication component presets
     */
    _initializeAuthPresets() {
        // Default native sign-in preset
        this.presets.set('default', {
            userType: 'interactive',
            formRole: 'authentication',
            acceptsInput: true,
            validationRequired: false,
            accessibilityRole: 'form',
            isNestable: false,
            canBeNested: false,
            isSelectable: true,
            isResizeable: false,
            isMovable: true,
            providers: ['passkey', 'amazon', 'apple', 'azure', 'facebook', 'google'],
            autoGenerateQR: true,
            qrTimeout: 300000 // 5 minutes
        });
        
        // Minimal sign-in (passkey only)
        this.presets.set('passkey-only', {
            userType: 'interactive',
            formRole: 'authentication',
            acceptsInput: true,
            validationRequired: false,
            accessibilityRole: 'form',
            isNestable: false,
            canBeNested: false,
            isSelectable: true,
            isResizeable: false,
            isMovable: false,
            providers: ['passkey'],
            autoGenerateQR: true,
            qrTimeout: 180000 // 3 minutes
        });
        
        // Enterprise sign-in (limited providers)
        this.presets.set('enterprise', {
            userType: 'interactive',
            formRole: 'authentication',
            acceptsInput: true,
            validationRequired: false,
            accessibilityRole: 'form',
            isNestable: false,
            canBeNested: false,
            isSelectable: true,
            isResizeable: false,
            isMovable: true,
            providers: ['passkey', 'azure', 'google'],
            autoGenerateQR: true,
            qrTimeout: 600000 // 10 minutes
        });
        
        // Mobile-optimized sign-in
        this.presets.set('mobile', {
            userType: 'interactive',
            formRole: 'authentication',
            acceptsInput: true,
            validationRequired: false,
            accessibilityRole: 'form',
            isNestable: false,
            canBeNested: false,
            isSelectable: true,
            isResizeable: false,
            isMovable: false,
            providers: ['passkey', 'apple', 'google'],
            autoGenerateQR: false, // Skip QR on mobile
            qrTimeout: 0
        });
    }
    
    /**
     * Create a new NativeSignIn component
     */
    createSignIn(containerId, parent, options = {}) {
        try {
            // Apply preset if specified
            let config = { ...options };
            if (options.preset && this.presets.has(options.preset)) {
                config = { ...this.presets.get(options.preset), ...options };
            }
            
            console.log(`🔐 Creating NativeSignIn: ${containerId}`, config);
            
            // Create the component instance
            const component = new NativeSignIn(containerId, parent, config);
            
            // Initialize the component
            const initSuccess = component.initialize();
            if (!initSuccess) {
                throw new Error(`Failed to initialize NativeSignIn: ${containerId}`);
            }
            
            // Create and attach behavior
            const behavior = new NativeSignInBehavior(component);
            component.behavior = behavior;
            component.behaviorSchema = behavior.behaviorSchema;
            
            // Register with global systems if available
            this._registerComponent(component);
            
            // Auto-generate QR code if enabled
            if (config.autoGenerateQR) {
                setTimeout(() => {
                    if (behavior.generateQRCode) {
                        const qrResult = behavior.generateQRCode({ autoGenerate: true });
                        if (qrResult.success && qrResult.graphics_request) {
                            // Send to Graphics Handler if available
                            if (window.toolsApp && window.toolsApp.graphicsHandler) {
                                window.toolsApp.graphicsHandler.executeRequest(qrResult.graphics_request);
                            }
                        }
                    }
                }, 100);
            }
            
            console.log(`✅ NativeSignIn created successfully: ${containerId}`);
            return component;
            
        } catch (error) {
            console.error(`❌ Failed to create NativeSignIn ${containerId}:`, error);
            return null;
        }
    }
    
    /**
     * Create sign-in with specific provider focus
     */
    createProviderSignIn(containerId, parent, provider, options = {}) {
        const providerConfig = {
            ...options,
            providers: [provider, 'passkey'], // Always include passkey as fallback
            focusProvider: provider
        };
        
        return this.createSignIn(containerId, parent, providerConfig);
    }
    
    /**
     * Create passkey-only sign-in
     */
    createPasskeySignIn(containerId, parent, options = {}) {
        return this.createSignIn(containerId, parent, {
            ...options,
            preset: 'passkey-only'
        });
    }
    
    /**
     * Create enterprise sign-in
     */
    createEnterpriseSignIn(containerId, parent, options = {}) {
        return this.createSignIn(containerId, parent, {
            ...options,
            preset: 'enterprise'
        });
    }
    
    /**
     * Create mobile-optimized sign-in
     */
    createMobileSignIn(containerId, parent, options = {}) {
        return this.createSignIn(containerId, parent, {
            ...options,
            preset: 'mobile'
        });
    }
    
    /**
     * Register component with global systems
     */
    _registerComponent(component) {
        // Register with global container registry
        if (typeof window !== 'undefined' && window.containerRegistry) {
            window.containerRegistry[component.containerId] = component;
        }
        
        // Register with FormBuilderCanvas if available
        if (typeof window !== 'undefined' && window.formBuilderCanvas) {
            window.formBuilderCanvas.addContainer(component);
        }
        
        // Register behavior schema with Event Handler
        if (typeof window !== 'undefined' && window.toolsApp && window.toolsApp.eventHandler) {
            window.toolsApp.eventHandler.registerBehaviorSchema(
                component.containerId,
                component.behaviorSchema
            );
        }
        
        console.log(`📝 NativeSignIn ${component.containerId} registered with global systems`);
    }
    
    /**
     * Create multiple sign-in components with different configurations
     */
    createSignInSuite(parentContainer, options = {}) {
        const suite = {
            default: null,
            passkey: null,
            enterprise: null,
            mobile: null
        };
        
        try {
            // Create default sign-in
            suite.default = this.createSignIn(
                `signin-default-${this.instanceCounter++}`,
                parentContainer,
                { preset: 'default', ...options.default }
            );
            
            // Create passkey-only variant
            suite.passkey = this.createPasskeySignIn(
                `signin-passkey-${this.instanceCounter++}`,
                parentContainer,
                options.passkey
            );
            
            // Create enterprise variant
            suite.enterprise = this.createEnterpriseSignIn(
                `signin-enterprise-${this.instanceCounter++}`,
                parentContainer,
                options.enterprise
            );
            
            // Create mobile variant
            suite.mobile = this.createMobileSignIn(
                `signin-mobile-${this.instanceCounter++}`,
                parentContainer,
                options.mobile
            );
            
            console.log('🔐 Sign-in suite created successfully');
            return suite;
            
        } catch (error) {
            console.error('❌ Failed to create sign-in suite:', error);
            return null;
        }
    }
    
    /**
     * Get authentication provider capabilities
     */
    getProviderCapabilities() {
        return {
            passkey: {
                name: 'Passkey',
                supportsQR: true,
                requiresAccount: false,
                oneClickCreation: true,
                securityLevel: 'high'
            },
            amazon: {
                name: 'Amazon',
                supportsQR: false,
                requiresAccount: true,
                oneClickCreation: false,
                securityLevel: 'medium'
            },
            apple: {
                name: 'Apple',
                supportsQR: false,
                requiresAccount: true,
                oneClickCreation: false,
                securityLevel: 'high'
            },
            azure: {
                name: 'Microsoft',
                supportsQR: false,
                requiresAccount: true,
                oneClickCreation: false,
                securityLevel: 'high'
            },
            facebook: {
                name: 'Facebook',
                supportsQR: false,
                requiresAccount: true,
                oneClickCreation: false,
                securityLevel: 'medium'
            },
            google: {
                name: 'Google',
                supportsQR: false,
                requiresAccount: true,
                oneClickCreation: false,
                securityLevel: 'high'
            }
        };
    }
    
    /**
     * Validate sign-in configuration
     */
    validateConfiguration(config) {
        const errors = [];
        
        if (!config.providers || !Array.isArray(config.providers)) {
            errors.push('Providers array is required');
        }
        
        if (config.providers && config.providers.length === 0) {
            errors.push('At least one provider must be specified');
        }
        
        const validProviders = ['passkey', 'amazon', 'apple', 'azure', 'facebook', 'google'];
        if (config.providers) {
            config.providers.forEach(provider => {
                if (!validProviders.includes(provider)) {
                    errors.push(`Invalid provider: ${provider}`);
                }
            });
        }
        
        if (config.qrTimeout && (config.qrTimeout < 60000 || config.qrTimeout > 3600000)) {
            errors.push('QR timeout must be between 1 minute and 1 hour');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NativeSignInFactory;
} else if (typeof window !== 'undefined') {
    window.NativeSignInFactory = NativeSignInFactory;
}
