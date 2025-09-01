/**
 * Apple Login.js - Apple Sign-In Integration
 * 
 * Handles Apple ID authentication integration for Native Sign In component.
 * Provides secure authentication through Apple's Sign in with Apple service.
 */

class AppleLogin {
    constructor() {
        this.isLoaded = false;
        this.clientId = null; // Should be configured based on app
        this.redirectURI = window.location.origin + '/auth/apple/callback';
        this.scope = 'name email';
        this.responseType = 'code id_token';
        this.responseMode = 'form_post';
        
        console.log('🍎 Apple Login integration initialized');
    }
    
    /**
     * Initialize Apple Sign-In SDK
     */
    async initialize(config = {}) {
        try {
            // Configure Apple Sign-In
            this.clientId = config.clientId || 'your.app.bundle.id';
            this.redirectURI = config.redirectURI || this.redirectURI;
            this.scope = config.scope || this.scope;
            
            // Load Apple Sign-In JS SDK
            await this._loadAppleSDK();
            
            // Initialize Apple ID
            if (window.AppleID) {
                await window.AppleID.auth.init({
                    clientId: this.clientId,
                    scope: this.scope,
                    redirectURI: this.redirectURI,
                    usePopup: true
                });
                
                this.isLoaded = true;
                console.log('🍎 Apple Sign-In SDK loaded and initialized');
                return true;
            }
            
            throw new Error('Apple Sign-In SDK not available');
            
        } catch (error) {
            console.error('🍎 Failed to initialize Apple Sign-In:', error);
            return false;
        }
    }
    
    /**
     * Start Apple Sign-In flow
     */
    async signIn() {
        if (!this.isLoaded) {
            throw new Error('Apple Sign-In not initialized');
        }
        
        try {
            console.log('🍎 Starting Apple Sign-In flow...');
            
            const authorizationObject = {
                scope: this.scope,
                responseType: this.responseType,
                responseMode: this.responseMode,
                usePopup: true
            };
            
            const response = await window.AppleID.auth.signIn(authorizationObject);
            
            // Process the response
            const userData = this._processAppleResponse(response);
            
            console.log('🍎 Apple Sign-In successful');
            return {
                success: true,
                provider: 'apple',
                userData: userData,
                rawResponse: response
            };
            
        } catch (error) {
            console.error('🍎 Apple Sign-In failed:', error);
            return {
                success: false,
                provider: 'apple',
                error: error.message || 'Apple Sign-In failed',
                errorCode: error.error || 'unknown_error'
            };
        }
    }
    
    /**
     * Sign out from Apple
     */
    async signOut() {
        try {
            if (this.isLoaded && window.AppleID) {
                await window.AppleID.auth.signOut();
                console.log('🍎 Apple Sign-Out successful');
                return { success: true };
            }
            return { success: true }; // Already signed out
        } catch (error) {
            console.error('🍎 Apple Sign-Out failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load Apple Sign-In JavaScript SDK
     */
    async _loadAppleSDK() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.AppleID) {
                resolve();
                return;
            }
            
            // Create script element
            const script = document.createElement('script');
            script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
            script.async = true;
            script.onload = () => {
                console.log('🍎 Apple Sign-In SDK script loaded');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Apple Sign-In SDK'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Process Apple authentication response
     */
    _processAppleResponse(response) {
        const userData = {
            userId: response.user || null,
            email: null,
            firstName: null,
            lastName: null,
            displayName: null,
            profilePicture: null
        };
        
        // Extract data from ID token if available
        if (response.authorization && response.authorization.id_token) {
            try {
                const idToken = response.authorization.id_token;
                const payload = this._parseJWT(idToken);
                
                userData.email = payload.email || null;
                userData.userId = payload.sub || response.user;
                
                // Apple provides limited user info for privacy
                if (response.user && response.user.name) {
                    userData.firstName = response.user.name.firstName || null;
                    userData.lastName = response.user.name.lastName || null;
                    userData.displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                }
                
            } catch (error) {
                console.warn('🍎 Failed to parse ID token:', error);
            }
        }
        
        return userData;
    }
    
    /**
     * Parse JWT token (simple implementation)
     */
    _parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('🍎 Failed to parse JWT:', error);
            return {};
        }
    }
    
    /**
     * Get Apple Sign-In button HTML
     */
    getButtonHTML(options = {}) {
        const buttonType = options.type || 'sign-in';
        const color = options.color || 'black';
        const borderRadius = options.borderRadius || 15;
        const height = options.height || 44;
        
        return `
            <div id="appleid-signin" 
                 data-color="${color}" 
                 data-border="true" 
                 data-type="${buttonType}"
                 data-border-radius="${borderRadius}"
                 data-height="${height}">
            </div>
        `;
    }
    
    /**
     * Check if user is signed in with Apple
     */
    async isSignedIn() {
        try {
            if (!this.isLoaded || !window.AppleID) {
                return false;
            }
            
            // Apple doesn't provide a direct way to check sign-in status
            // This would typically be handled by your backend
            return false;
            
        } catch (error) {
            console.error('🍎 Error checking Apple sign-in status:', error);
            return false;
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppleLogin;
} else if (typeof window !== 'undefined') {
    window.AppleLogin = AppleLogin;
}
