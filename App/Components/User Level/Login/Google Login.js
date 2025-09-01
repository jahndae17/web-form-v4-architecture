/**
 * Google Login.js - Google Sign-In Integration
 * 
 * Handles Google OAuth 2.0 authentication integration for Native Sign In component.
 * Provides secure authentication through Google Identity Services.
 */

class GoogleLogin {
    constructor() {
        this.isLoaded = false;
        this.clientId = null;
        this.googleAuth = null;
        this.isSignedIn = false;
        
        console.log('🔵 Google Login integration initialized');
    }
    
    /**
     * Initialize Google Sign-In
     */
    async initialize(config = {}) {
        try {
            this.clientId = config.clientId || 'your-google-client-id.googleusercontent.com';
            
            // Load Google Identity Services
            await this._loadGoogleSDK();
            
            // Initialize Google Identity Services
            if (window.google && window.google.accounts) {
                window.google.accounts.id.initialize({
                    client_id: this.clientId,
                    callback: this._handleCredentialResponse.bind(this),
                    auto_select: false,
                    cancel_on_tap_outside: false
                });
                
                this.isLoaded = true;
                console.log('🔵 Google Identity Services loaded and initialized');
                return true;
            }
            
            throw new Error('Google Identity Services not available');
            
        } catch (error) {
            console.error('🔵 Failed to initialize Google Sign-In:', error);
            return false;
        }
    }
    
    /**
     * Start Google Sign-In flow
     */
    async signIn() {
        if (!this.isLoaded) {
            throw new Error('Google Sign-In not initialized');
        }
        
        try {
            console.log('🔵 Starting Google Sign-In flow...');
            
            return new Promise((resolve, reject) => {
                // Store resolve/reject for callback
                this._currentResolve = resolve;
                this._currentReject = reject;
                
                // Trigger sign-in popup
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        // Fallback to OAuth popup
                        this._fallbackToOAuth();
                    }
                });
            });
            
        } catch (error) {
            console.error('🔵 Google Sign-In failed:', error);
            return {
                success: false,
                provider: 'google',
                error: error.message || 'Google Sign-In failed'
            };
        }
    }
    
    /**
     * Handle credential response from Google
     */
    _handleCredentialResponse(response) {
        try {
            const userData = this._processGoogleResponse(response);
            
            console.log('🔵 Google Sign-In successful');
            
            if (this._currentResolve) {
                this._currentResolve({
                    success: true,
                    provider: 'google',
                    userData: userData,
                    rawResponse: response
                });
                this._currentResolve = null;
                this._currentReject = null;
            }
            
        } catch (error) {
            console.error('🔵 Failed to process Google response:', error);
            
            if (this._currentReject) {
                this._currentReject(error);
                this._currentResolve = null;
                this._currentReject = null;
            }
        }
    }
    
    /**
     * Fallback to OAuth popup when One Tap is not available
     */
    _fallbackToOAuth() {
        try {
            // Load OAuth2 library if not already loaded
            if (!window.gapi) {
                this._loadGoogleAPI().then(() => {
                    this._initOAuth();
                });
            } else {
                this._initOAuth();
            }
        } catch (error) {
            console.error('🔵 OAuth fallback failed:', error);
            if (this._currentReject) {
                this._currentReject(error);
            }
        }
    }
    
    /**
     * Initialize OAuth2 flow
     */
    _initOAuth() {
        window.gapi.load('auth2', () => {
            window.gapi.auth2.init({
                client_id: this.clientId,
                scope: 'profile email'
            }).then(() => {
                const authInstance = window.gapi.auth2.getAuthInstance();
                return authInstance.signIn();
            }).then((googleUser) => {
                const userData = this._processOAuthResponse(googleUser);
                
                if (this._currentResolve) {
                    this._currentResolve({
                        success: true,
                        provider: 'google',
                        userData: userData,
                        rawResponse: googleUser
                    });
                }
            }).catch((error) => {
                if (this._currentReject) {
                    this._currentReject(error);
                }
            });
        });
    }
    
    /**
     * Sign out from Google
     */
    async signOut() {
        try {
            if (window.gapi && window.gapi.auth2) {
                const authInstance = window.gapi.auth2.getAuthInstance();
                if (authInstance) {
                    await authInstance.signOut();
                }
            }
            
            // Also revoke One Tap
            if (window.google && window.google.accounts) {
                window.google.accounts.id.disableAutoSelect();
            }
            
            this.isSignedIn = false;
            console.log('🔵 Google Sign-Out successful');
            return { success: true };
            
        } catch (error) {
            console.error('🔵 Google Sign-Out failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load Google Identity Services SDK
     */
    async _loadGoogleSDK() {
        return new Promise((resolve, reject) => {
            if (window.google && window.google.accounts) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                console.log('🔵 Google Identity Services SDK loaded');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Google Identity Services SDK'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Load Google API (for OAuth fallback)
     */
    async _loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Google API'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Process Google Identity Services response
     */
    _processGoogleResponse(response) {
        const credential = response.credential;
        const payload = this._parseJWT(credential);
        
        return {
            userId: payload.sub,
            email: payload.email,
            firstName: payload.given_name || null,
            lastName: payload.family_name || null,
            displayName: payload.name,
            profilePicture: payload.picture || null,
            emailVerified: payload.email_verified === true
        };
    }
    
    /**
     * Process OAuth2 response
     */
    _processOAuthResponse(googleUser) {
        const profile = googleUser.getBasicProfile();
        
        return {
            userId: profile.getId(),
            email: profile.getEmail(),
            firstName: profile.getGivenName(),
            lastName: profile.getFamilyName(),
            displayName: profile.getName(),
            profilePicture: profile.getImageUrl()
        };
    }
    
    /**
     * Parse JWT token
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
            console.error('🔵 Failed to parse JWT:', error);
            return {};
        }
    }
    
    /**
     * Render Google Sign-In button
     */
    renderButton(element, options = {}) {
        if (!this.isLoaded || !window.google || !window.google.accounts) {
            console.error('🔵 Google Identity Services not loaded');
            return;
        }
        
        const buttonOptions = {
            type: options.type || 'standard',
            theme: options.theme || 'outline',
            size: options.size || 'large',
            text: options.text || 'signin_with',
            shape: options.shape || 'rectangular',
            logo_alignment: options.logoAlignment || 'left'
        };
        
        window.google.accounts.id.renderButton(element, buttonOptions);
    }
    
    /**
     * Check if user is currently signed in
     */
    async checkSignInStatus() {
        try {
            if (window.gapi && window.gapi.auth2) {
                const authInstance = window.gapi.auth2.getAuthInstance();
                if (authInstance) {
                    this.isSignedIn = authInstance.isSignedIn.get();
                    return this.isSignedIn;
                }
            }
            return false;
        } catch (error) {
            console.error('🔵 Error checking Google sign-in status:', error);
            return false;
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleLogin;
} else if (typeof window !== 'undefined') {
    window.GoogleLogin = GoogleLogin;
}
