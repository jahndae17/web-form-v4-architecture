/**
 * Facebook Login.js - Facebook Login Integration
 * 
 * Handles Facebook OAuth authentication integration for Native Sign In component.
 * Provides secure authentication through Facebook Login for Web.
 */

class FacebookLogin {
    constructor() {
        this.isLoaded = false;
        this.appId = null;
        this.version = 'v18.0';
        this.isSignedIn = false;
        
        console.log('🔵 Facebook Login integration initialized');
    }
    
    /**
     * Initialize Facebook SDK
     */
    async initialize(config = {}) {
        try {
            this.appId = config.appId || 'your-facebook-app-id';
            this.version = config.version || 'v18.0';
            
            // Load Facebook SDK
            await this._loadFacebookSDK();
            
            // Initialize Facebook SDK
            if (window.FB) {
                window.FB.init({
                    appId: this.appId,
                    cookie: config.cookie !== false,
                    xfbml: config.xfbml !== false,
                    version: this.version,
                    autoLogAppEvents: config.autoLogAppEvents !== false
                });
                
                this.isLoaded = true;
                console.log('🔵 Facebook SDK loaded and initialized');
                return true;
            }
            
            throw new Error('Facebook SDK not available');
            
        } catch (error) {
            console.error('🔵 Failed to initialize Facebook Login:', error);
            return false;
        }
    }
    
    /**
     * Start Facebook Sign-In flow
     */
    async signIn() {
        if (!this.isLoaded) {
            throw new Error('Facebook Login not initialized');
        }
        
        try {
            console.log('🔵 Starting Facebook Sign-In flow...');
            
            return new Promise((resolve, reject) => {
                const loginOptions = {
                    scope: 'email,public_profile',
                    return_scopes: true,
                    enable_profile_selector: true
                };
                
                window.FB.login((response) => {
                    if (response.authResponse) {
                        // Successfully authenticated
                        this._getUserProfile().then((userData) => {
                            this.isSignedIn = true;
                            resolve({
                                success: true,
                                provider: 'facebook',
                                userData: userData,
                                rawResponse: response
                            });
                        }).catch((error) => {
                            reject({
                                success: false,
                                provider: 'facebook',
                                error: error.message || 'Failed to get user profile'
                            });
                        });
                    } else {
                        // User cancelled login or did not fully authorize
                        const errorMsg = response.error ? response.error.message : 'User cancelled login';
                        reject({
                            success: false,
                            provider: 'facebook',
                            error: errorMsg,
                            errorCode: response.error ? response.error.code : 'user_cancelled'
                        });
                    }
                }, loginOptions);
            });
            
        } catch (error) {
            console.error('🔵 Facebook Sign-In failed:', error);
            return {
                success: false,
                provider: 'facebook',
                error: error.message || 'Facebook Sign-In failed'
            };
        }
    }
    
    /**
     * Get user profile from Facebook Graph API
     */
    async _getUserProfile() {
        return new Promise((resolve, reject) => {
            window.FB.api('/me', {
                fields: 'id,name,email,first_name,last_name,picture.type(large),birthday,gender,location'
            }, (response) => {
                if (response.error) {
                    console.error('🔵 Facebook Graph API error:', response.error);
                    reject(new Error(response.error.message));
                    return;
                }
                
                const userData = {
                    userId: response.id,
                    email: response.email || null,
                    firstName: response.first_name || null,
                    lastName: response.last_name || null,
                    displayName: response.name,
                    profilePicture: response.picture && response.picture.data ? response.picture.data.url : null,
                    birthday: response.birthday || null,
                    gender: response.gender || null,
                    location: response.location ? response.location.name : null
                };
                
                console.log('🔵 Facebook profile retrieved successfully');
                resolve(userData);
            });
        });
    }
    
    /**
     * Sign out from Facebook
     */
    async signOut() {
        try {
            if (!this.isLoaded || !window.FB) {
                return { success: true };
            }
            
            return new Promise((resolve) => {
                window.FB.logout((response) => {
                    this.isSignedIn = false;
                    console.log('🔵 Facebook Sign-Out successful');
                    resolve({ success: true, response: response });
                });
            });
            
        } catch (error) {
            console.error('🔵 Facebook Sign-Out failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load Facebook SDK
     */
    async _loadFacebookSDK() {
        return new Promise((resolve, reject) => {
            if (window.FB) {
                resolve();
                return;
            }
            
            // Create Facebook SDK script
            const script = document.createElement('script');
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                console.log('🔵 Facebook SDK script loaded');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Facebook SDK'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Check login status
     */
    async getLoginStatus() {
        if (!this.isLoaded || !window.FB) {
            return { connected: false };
        }
        
        return new Promise((resolve) => {
            window.FB.getLoginStatus((response) => {
                this.isSignedIn = response.status === 'connected';
                resolve(response);
            });
        });
    }
    
    /**
     * Check if user is currently signed in
     */
    async isSignedIn() {
        const status = await this.getLoginStatus();
        return status.status === 'connected';
    }
    
    /**
     * Get access token
     */
    async getAccessToken() {
        const status = await this.getLoginStatus();
        if (status.status === 'connected' && status.authResponse) {
            return {
                success: true,
                accessToken: status.authResponse.accessToken,
                expiresIn: status.authResponse.expiresIn,
                userID: status.authResponse.userID
            };
        }
        
        return {
            success: false,
            error: 'User not connected'
        };
    }
    
    /**
     * Share content on Facebook
     */
    async shareContent(content) {
        if (!this.isLoaded || !window.FB) {
            return { success: false, error: 'Facebook SDK not loaded' };
        }
        
        return new Promise((resolve) => {
            window.FB.ui({
                method: 'share',
                href: content.url || window.location.href,
                quote: content.quote || '',
                hashtag: content.hashtag || ''
            }, (response) => {
                if (response && !response.error_message) {
                    resolve({ success: true, response: response });
                } else {
                    resolve({ 
                        success: false, 
                        error: response ? response.error_message : 'Share cancelled' 
                    });
                }
            });
        });
    }
    
    /**
     * Get Facebook Login button HTML
     */
    getButtonHTML(options = {}) {
        const buttonText = options.text || 'Continue with Facebook';
        const buttonClass = options.className || 'facebook-signin-button';
        const size = options.size || 'large';
        
        const buttonStyles = {
            large: 'padding: 12px 24px; font-size: 16px;',
            medium: 'padding: 10px 20px; font-size: 14px;',
            small: 'padding: 8px 16px; font-size: 12px;'
        };
        
        return `
            <button type="button" class="${buttonClass}" style="
                background-color: #1877f2;
                border: 1px solid #1877f2;
                color: white;
                ${buttonStyles[size] || buttonStyles.large}
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-weight: 600;
                text-decoration: none;
                transition: background-color 0.2s;
            " onmouseover="this.style.backgroundColor='#166fe5'" 
               onmouseout="this.style.backgroundColor='#1877f2'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                ${buttonText}
            </button>
        `;
    }
    
    /**
     * Render Facebook Login button with SDK
     */
    renderButton(element, options = {}) {
        if (!this.isLoaded || !window.FB || !element) {
            console.error('🔵 Facebook SDK not loaded or element not provided');
            return;
        }
        
        const buttonOptions = {
            size: options.size || 'large',
            button_type: options.button_type || 'continue_with',
            layout: options.layout || 'default',
            auto_logout_link: options.auto_logout_link !== false,
            use_continue_as: options.use_continue_as !== false,
            width: options.width || null
        };
        
        // Create div for FB button
        const fbButtonDiv = document.createElement('div');
        fbButtonDiv.className = 'fb-login-button';
        
        // Set attributes
        Object.keys(buttonOptions).forEach(key => {
            if (buttonOptions[key] !== null) {
                fbButtonDiv.setAttribute(`data-${key.replace(/_/g, '-')}`, buttonOptions[key]);
            }
        });
        
        fbButtonDiv.setAttribute('data-scope', 'email,public_profile');
        fbButtonDiv.setAttribute('data-onlogin', 'checkLoginState');
        
        element.appendChild(fbButtonDiv);
        
        // Parse Facebook elements
        window.FB.XFBML.parse(element);
    }
}

// Global function for Facebook button callback
function checkLoginState() {
    if (window.facebookLogin) {
        window.facebookLogin.getLoginStatus().then(response => {
            console.log('🔵 Facebook login state changed:', response);
        });
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FacebookLogin;
} else if (typeof window !== 'undefined') {
    window.FacebookLogin = FacebookLogin;
}
