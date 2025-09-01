/**
 * Amazon Login.js - Amazon Login with Amazon Integration
 * 
 * Handles Amazon OAuth authentication integration for Native Sign In component.
 * Provides secure authentication through Login with Amazon service.
 */

class AmazonLogin {
    constructor() {
        this.isLoaded = false;
        this.clientId = null;
        this.amazonAuth = null;
        this.isSignedIn = false;
        
        console.log('🟠 Amazon Login integration initialized');
    }
    
    /**
     * Initialize Amazon Login
     */
    async initialize(config = {}) {
        try {
            this.clientId = config.clientId || 'amzn1.application-oa2-client.your-client-id';
            
            // Load Amazon Login SDK
            await this._loadAmazonSDK();
            
            // Initialize Amazon Login
            if (window.amazon && window.amazon.Login) {
                window.amazon.Login.setClientId(this.clientId);
                
                // Set up options
                const options = {
                    scope: config.scope || 'profile',
                    popup: config.popup !== false,
                    interactive: config.interactive !== false
                };
                
                this.isLoaded = true;
                console.log('🟠 Amazon Login SDK loaded and initialized');
                return true;
            }
            
            throw new Error('Amazon Login SDK not available');
            
        } catch (error) {
            console.error('🟠 Failed to initialize Amazon Login:', error);
            return false;
        }
    }
    
    /**
     * Start Amazon Sign-In flow
     */
    async signIn() {
        if (!this.isLoaded) {
            throw new Error('Amazon Login not initialized');
        }
        
        try {
            console.log('🟠 Starting Amazon Sign-In flow...');
            
            return new Promise((resolve, reject) => {
                const options = {
                    scope: 'profile',
                    popup: true
                };
                
                window.amazon.Login.authorize(options, (response) => {
                    if (response.error) {
                        console.error('🟠 Amazon authorization failed:', response.error);
                        reject({
                            success: false,
                            provider: 'amazon',
                            error: response.error_description || response.error,
                            errorCode: response.error
                        });
                        return;
                    }
                    
                    // Get user profile
                    this._getUserProfile().then((userData) => {
                        resolve({
                            success: true,
                            provider: 'amazon',
                            userData: userData,
                            rawResponse: response
                        });
                    }).catch((error) => {
                        reject({
                            success: false,
                            provider: 'amazon',
                            error: error.message || 'Failed to get user profile'
                        });
                    });
                });
            });
            
        } catch (error) {
            console.error('🟠 Amazon Sign-In failed:', error);
            return {
                success: false,
                provider: 'amazon',
                error: error.message || 'Amazon Sign-In failed'
            };
        }
    }
    
    /**
     * Get user profile from Amazon
     */
    async _getUserProfile() {
        return new Promise((resolve, reject) => {
            window.amazon.Login.retrieveProfile((response) => {
                if (response.error) {
                    console.error('🟠 Failed to retrieve Amazon profile:', response.error);
                    reject(new Error(response.error_description || response.error));
                    return;
                }
                
                const profile = response.profile;
                const userData = {
                    userId: profile.CustomerId,
                    email: profile.PrimaryEmail || profile.Email,
                    firstName: profile.Name ? profile.Name.split(' ')[0] : null,
                    lastName: profile.Name ? profile.Name.split(' ').slice(1).join(' ') : null,
                    displayName: profile.Name,
                    profilePicture: null // Amazon doesn't provide profile pictures
                };
                
                console.log('🟠 Amazon profile retrieved successfully');
                resolve(userData);
            });
        });
    }
    
    /**
     * Sign out from Amazon
     */
    async signOut() {
        try {
            if (this.isLoaded && window.amazon && window.amazon.Login) {
                return new Promise((resolve) => {
                    window.amazon.Login.logout(() => {
                        this.isSignedIn = false;
                        console.log('🟠 Amazon Sign-Out successful');
                        resolve({ success: true });
                    });
                });
            }
            
            return { success: true }; // Already signed out
            
        } catch (error) {
            console.error('🟠 Amazon Sign-Out failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load Amazon Login SDK
     */
    async _loadAmazonSDK() {
        return new Promise((resolve, reject) => {
            if (window.amazon && window.amazon.Login) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://assets.loginwithamazon.com/js/sdk/amazon-login-sdk.js';
            script.async = true;
            script.onload = () => {
                console.log('🟠 Amazon Login SDK script loaded');
                // Wait a bit for SDK to initialize
                setTimeout(() => resolve(), 100);
            };
            script.onerror = () => {
                reject(new Error('Failed to load Amazon Login SDK'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Check if user is currently signed in with Amazon
     */
    async checkSignInStatus() {
        if (!this.isLoaded || !window.amazon || !window.amazon.Login) {
            return false;
        }
        
        return new Promise((resolve) => {
            window.amazon.Login.retrieveProfile((response) => {
                if (response.error) {
                    this.isSignedIn = false;
                    resolve(false);
                } else {
                    this.isSignedIn = true;
                    resolve(true);
                }
            });
        });
    }
    
    /**
     * Get Amazon Login button HTML
     */
    getButtonHTML(options = {}) {
        const buttonType = options.type || 'LwA';
        const color = options.color || 'Gold';
        const size = options.size || 'Medium';
        const language = options.language || 'en-US';
        
        return `
            <div id="LoginWithAmazon">
                <img border="0" alt="Login with Amazon"
                     src="https://images-na.ssl-images-amazon.com/images/G/01/lwa/btnLWA_${buttonType}_${color}_${size}.png"
                     width="156" height="32" />
            </div>
        `;
    }
    
    /**
     * Render Amazon Login button
     */
    renderButton(element, options = {}) {
        if (!element) {
            console.error('🟠 Element not provided for Amazon button');
            return;
        }
        
        const buttonHTML = this.getButtonHTML(options);
        element.innerHTML = buttonHTML;
        
        // Add click handler
        const button = element.querySelector('#LoginWithAmazon img');
        if (button) {
            button.style.cursor = 'pointer';
            button.addEventListener('click', () => {
                this.signIn().catch((error) => {
                    console.error('🟠 Amazon sign-in error:', error);
                });
            });
        }
    }
    
    /**
     * Get current access token
     */
    async getAccessToken() {
        if (!this.isLoaded || !window.amazon || !window.amazon.Login) {
            return null;
        }
        
        return new Promise((resolve) => {
            window.amazon.Login.retrieveProfile((response) => {
                if (response.error) {
                    resolve(null);
                } else {
                    // Access token is managed by SDK internally
                    resolve('amazon-access-token'); // Placeholder
                }
            });
        });
    }
    
    /**
     * Refresh access token
     */
    async refreshToken() {
        try {
            // Amazon SDK handles token refresh automatically
            const isSignedIn = await this.checkSignInStatus();
            return { success: isSignedIn };
        } catch (error) {
            console.error('🟠 Token refresh failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AmazonLogin;
} else if (typeof window !== 'undefined') {
    window.AmazonLogin = AmazonLogin;
}
