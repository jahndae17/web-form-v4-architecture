/**
 * NativeSignIn.js - Native Sign In Component
 * 
 * Extends BaseUserContainer functionality for native authentication.
 * Provides passkey-based authentication with third-party sign-in options.
 * 
 * ARCHITECTURAL COMPLIANCE:
 * ✅ Data & Structure ONLY
 * ✅ NO visual operations (Graphics Handler exclusive)
 * ✅ NO event listeners (Event Handler exclusive)
 * ✅ Extends BaseUserContainer with nesting disabled
 * ✅ Communicates with Interface Handler only
 */

class NativeSignIn extends BaseUserContainer {
    constructor(containerId, parent, options = {}) {
        // Configure base options for sign-in component
        const signInOptions = {
            ...options,
            userType: 'interactive',
            formRole: 'authentication',
            acceptsInput: true,
            validationRequired: false, // No validation needed for native sign-in
            accessibilityRole: 'form',
            
            // Disable nesting in both preview and design modes
            isNestable: false,
            canBeNested: false,
            
            // Enable authentication-specific behaviors
            isSelectable: true,
            isResizeable: false, // Fixed size for consistent UX
            isMovable: true
        };
        
        super(containerId, parent, signInOptions);
        
        // Native Sign In specific properties
        this.componentType = 'NativeSignIn';
        this.authenticationState = 'idle'; // 'idle', 'scanning', 'authenticating', 'success', 'error'
        this.supportedProviders = ['passkey', 'amazon', 'apple', 'azure', 'facebook', 'google'];
        this.selectedProvider = null;
        this.userProfile = null;
        
        // Passkey specific data
        this.passkeyData = {
            qrCodeGenerated: false,
            qrCodeValue: null,
            expiryTime: null,
            challenge: null
        };
        
        // Authentication flow data
        this.authenticationFlow = {
            provider: null,
            stage: 'initial', // 'initial', 'provider_selected', 'authenticating', 'account_creation', 'complete'
            startTime: null,
            userData: null,
            errors: []
        };
        
        // Security configuration
        this.securityConfig = {
            passkeyTimeout: 300000, // 5 minutes
            maxRetryAttempts: 3,
            tokenExclusionList: ['access_token', 'refresh_token', 'id_token', 'client_secret', 'auth_code'],
            allowedUserDataFields: ['username', 'email', 'profilePicture', 'userId', 'displayName', 'firstName', 'lastName']
        };
        
        console.log(`🔐 NativeSignIn component initialized: ${this.containerId}`);
    }
    
    /**
     * Initialize component structure and DOM elements
     */
    initialize() {
        if (this.isInitialized) {
            console.log(`🔐 NativeSignIn ${this.containerId} already initialized`);
            return true;
        }
        
        try {
            // Call parent initialization
            super.initialize();
            
            // Create native sign-in specific elements
            this._createSignInStructure();
            
            // Initialize authentication state
            this._resetAuthenticationState();
            
            // Request initial styling through Graphics Handler
            if (this.behavior && this.behavior.applyInitialStyling) {
                this.behavior.applyInitialStyling();
            }
            
            console.log(`✅ NativeSignIn ${this.containerId} initialized successfully`);
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to initialize NativeSignIn ${this.containerId}:`, error);
            return false;
        }
    }
    
    /**
     * Create the DOM structure for native sign-in
     */
    _createSignInStructure() {
        if (!this.element) {
            console.warn(`⚠️ Base element not found for ${this.containerId}`);
            return;
        }
        
        // Main container structure
        this.element.className = 'native-signin-container';
        this.element.setAttribute('data-component-type', 'NativeSignIn');
        this.element.setAttribute('data-auth-state', this.authenticationState);
        
        // Create inner structure (DOM structure ONLY - NO styling)
        this.element.innerHTML = `
            <div class="signin-header" data-element="header">
                <div class="signin-title" data-element="title">Sign In</div>
                <div class="signin-subtitle" data-element="subtitle">Scan QR code with your device or choose a sign-in option</div>
            </div>
            
            <div class="passkey-section" data-element="passkey-section">
                <div class="qr-container" data-element="qr-container">
                    <div class="qr-code" data-element="qr-code" data-qr-state="generating">
                        <div class="qr-placeholder" data-element="qr-placeholder">Generating QR Code...</div>
                    </div>
                    <div class="qr-instructions" data-element="qr-instructions">
                        Use your device's camera to scan the QR code above
                    </div>
                </div>
            </div>
            
            <div class="provider-section" data-element="provider-section">
                <div class="provider-divider" data-element="divider">
                    <span data-element="divider-text">or sign in with</span>
                    <div data-element="divider-line"></div>
                </div>
                <div class="provider-buttons" data-element="provider-buttons">
                    <button class="provider-button" data-provider="amazon" data-element="amazon-button">
                        <span data-element="amazon-icon">📦</span>
                        <span data-element="amazon-text">Amazon</span>
                    </button>
                    <button class="provider-button" data-provider="apple" data-element="apple-button">
                        <span data-element="apple-icon">🍎</span>
                        <span data-element="apple-text">Apple</span>
                    </button>
                    <button class="provider-button" data-provider="azure" data-element="azure-button">
                        <span data-element="azure-icon">🏢</span>
                        <span data-element="azure-text">Microsoft</span>
                    </button>
                    <button class="provider-button" data-provider="facebook" data-element="facebook-button">
                        <span data-element="facebook-icon">📘</span>
                        <span data-element="facebook-text">Facebook</span>
                    </button>
                    <button class="provider-button" data-provider="google" data-element="google-button">
                        <span data-element="google-icon">🔵</span>
                        <span data-element="google-text">Continue with Google</span>
                    </button>
                </div>
            </div>
            
            <div class="auth-status" data-element="auth-status" data-status="hidden">
                <div class="status-message" data-element="status-message"></div>
                <div class="status-details" data-element="status-details"></div>
            </div>
        `;
        
        // Store references to key elements for behavior access
        this._storeElementReferences();
    }
    
    /**
     * Store references to key DOM elements
     */
    _storeElementReferences() {
        this.elements = {
            header: this.element.querySelector('[data-element="header"]'),
            title: this.element.querySelector('[data-element="title"]'),
            subtitle: this.element.querySelector('[data-element="subtitle"]'),
            passkeySection: this.element.querySelector('[data-element="passkey-section"]'),
            qrContainer: this.element.querySelector('[data-element="qr-container"]'),
            qrCode: this.element.querySelector('[data-element="qr-code"]'),
            qrPlaceholder: this.element.querySelector('[data-element="qr-placeholder"]'),
            qrInstructions: this.element.querySelector('[data-element="qr-instructions"]'),
            providerSection: this.element.querySelector('[data-element="provider-section"]'),
            providerButtons: this.element.querySelector('[data-element="provider-buttons"]'),
            authStatus: this.element.querySelector('[data-element="auth-status"]'),
            statusMessage: this.element.querySelector('[data-element="status-message"]'),
            statusDetails: this.element.querySelector('[data-element="status-details"]')
        };
    }
    
    /**
     * Updates component visuals through Graphics Handler
     * @param {Object} visualRequest - Visual update request
     */
    updateVisuals(visualRequest) {
        if (!this.element || !visualRequest) return false;
        
        try {
            // Send visual update request to Graphics Handler via behavior
            if (this.behavior && this.behavior.requestVisualUpdate) {
                this.behavior.requestVisualUpdate(visualRequest);
                return true;
            }
            
            console.warn('⚠️ NativeSignIn: No behavior or requestVisualUpdate method available');
            return false;
            
        } catch (error) {
            console.error('❌ NativeSignIn visual update error:', error);
            return false;
        }
    }
    
    /**
     * Requests QR code visual update through Graphics Handler
     */
    updateQRCode(qrSvg) {
        if (!qrSvg) return false;
        
        const visualRequest = {
            action: 'update_qr_code',
            element: this.element.querySelector('[data-element="qr-code"]'),
            svg_content: qrSvg,
            animation: 'fade-in'
        };
        
        return this.updateVisuals(visualRequest);
    }
    
    /**
     * Requests status update through Graphics Handler
     */
    updateAuthStatus(status, message, details = '') {
        const visualRequest = {
            action: 'update_auth_status',
            element: this.element.querySelector('[data-element="auth-status"]'),
            status: status,
            message: message,
            details: details
        };
        
        return this.updateVisuals(visualRequest);
    }
    
    /**
     * Reset authentication state to initial conditions
     */
    _resetAuthenticationState() {
        this.authenticationState = 'idle';
        this.selectedProvider = null;
        this.userProfile = null;
        
        this.passkeyData = {
            qrCodeGenerated: false,
            qrCodeValue: null,
            expiryTime: null,
            challenge: null
        };
        
        this.authenticationFlow = {
            provider: null,
            stage: 'initial',
            startTime: null,
            userData: null,
            errors: []
        };
        
        // Update DOM attributes
        if (this.element) {
            this.element.setAttribute('data-auth-state', this.authenticationState);
        }
    }
    
    /**
     * Get current authentication data (safe for Event Handler)
     */
    getAuthenticationData() {
        return {
            componentId: this.containerId,
            state: this.authenticationState,
            provider: this.selectedProvider,
            stage: this.authenticationFlow.stage,
            hasUserData: !!this.userProfile,
            supportedProviders: this.supportedProviders,
            passkeyReady: this.passkeyData.qrCodeGenerated,
            errors: this.authenticationFlow.errors
        };
    }
    
    /**
     * Set user profile data (filtered for security)
     */
    setUserProfile(userData) {
        if (!userData || typeof userData !== 'object') {
            console.warn('🔐 Invalid user data provided');
            return false;
        }
        
        // Filter user data to only include allowed fields
        const filteredData = {};
        this.securityConfig.allowedUserDataFields.forEach(field => {
            if (userData[field] !== undefined) {
                filteredData[field] = userData[field];
            }
        });
        
        // Explicitly exclude any token fields
        this.securityConfig.tokenExclusionList.forEach(tokenField => {
            delete filteredData[tokenField];
        });
        
        this.userProfile = filteredData;
        this.authenticationFlow.userData = filteredData;
        
        console.log('🔐 User profile set (filtered):', Object.keys(filteredData));
        return true;
    }
    
    /**
     * Update authentication state
     */
    updateAuthenticationState(newState, additionalData = {}) {
        const validStates = ['idle', 'scanning', 'authenticating', 'success', 'error'];
        
        if (!validStates.includes(newState)) {
            console.warn(`🔐 Invalid authentication state: ${newState}`);
            return false;
        }
        
        this.authenticationState = newState;
        
        // Update flow data
        if (additionalData.provider) {
            this.selectedProvider = additionalData.provider;
            this.authenticationFlow.provider = additionalData.provider;
        }
        
        if (additionalData.stage) {
            this.authenticationFlow.stage = additionalData.stage;
        }
        
        if (additionalData.errors) {
            this.authenticationFlow.errors = additionalData.errors;
        }
        
        // Update DOM attributes
        if (this.element) {
            this.element.setAttribute('data-auth-state', this.authenticationState);
        }
        
        console.log(`🔐 Authentication state updated: ${newState}`, additionalData);
        return true;
    }
    
    /**
     * Generate QR code data (placeholder - actual implementation depends on authentication service)
     */
    generatePasskeyQR() {
        const challenge = 'PKChallenge_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const expiryTime = Date.now() + this.securityConfig.passkeyTimeout;
        
        this.passkeyData = {
            qrCodeGenerated: true,
            qrCodeValue: `https://auth.example.com/passkey?challenge=${challenge}&component=${this.containerId}`,
            expiryTime: expiryTime,
            challenge: challenge
        };
        
        console.log('🔐 Passkey QR generated:', { challenge, expiryTime });
        return this.passkeyData;
    }
    
    /**
     * Get component state for ChangeLog
     */
    getState() {
        const baseState = super.getState ? super.getState() : {};
        
        return {
            ...baseState,
            componentType: this.componentType,
            authenticationState: this.authenticationState,
            selectedProvider: this.selectedProvider,
            authenticationStage: this.authenticationFlow.stage,
            passkeyReady: this.passkeyData.qrCodeGenerated,
            hasUserProfile: !!this.userProfile,
            supportedProviders: this.supportedProviders
        };
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        // Clear sensitive data
        this._resetAuthenticationState();
        this.userProfile = null;
        this.elements = null;
        
        // Call parent cleanup
        if (super.destroy) {
            super.destroy();
        }
        
        console.log(`🔐 NativeSignIn ${this.containerId} destroyed`);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NativeSignIn;
} else if (typeof window !== 'undefined') {
    window.NativeSignIn = NativeSignIn;
}