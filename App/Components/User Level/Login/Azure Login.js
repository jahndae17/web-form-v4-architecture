/**
 * Azure Login.js - Microsoft Azure AD / Microsoft Account Integration
 * 
 * Handles Microsoft authentication integration for Native Sign In component.
 * Supports both Azure AD (work/school) and Microsoft accounts (personal).
 */

class AzureLogin {
    constructor() {
        this.isLoaded = false;
        this.clientId = null;
        this.msalInstance = null;
        this.accountType = 'both'; // 'work', 'personal', or 'both'
        
        console.log('🔵 Azure/Microsoft Login integration initialized');
    }
    
    /**
     * Initialize Microsoft Authentication Library (MSAL)
     */
    async initialize(config = {}) {
        try {
            this.clientId = config.clientId || 'your-azure-app-client-id';
            this.accountType = config.accountType || 'both';
            
            // Load MSAL.js library
            await this._loadMSAL();
            
            // Configure MSAL
            const msalConfig = {
                auth: {
                    clientId: this.clientId,
                    authority: this._getAuthority(config),
                    redirectUri: config.redirectUri || window.location.origin,
                    postLogoutRedirectUri: config.logoutRedirectUri || window.location.origin
                },
                cache: {
                    cacheLocation: config.cacheLocation || 'localStorage',
                    storeAuthStateInCookie: config.storeAuthStateInCookie || false
                },
                system: {
                    loggerOptions: {
                        loggerCallback: (level, message, containsPii) => {
                            if (!containsPii && config.enableLogging) {
                                console.log(`🔵 MSAL [${level}]:`, message);
                            }
                        },
                        piiLoggingEnabled: false
                    }
                }
            };
            
            // Initialize MSAL instance
            this.msalInstance = new window.msal.PublicClientApplication(msalConfig);
            
            // Handle redirect response
            await this.msalInstance.handleRedirectPromise();
            
            this.isLoaded = true;
            console.log('🔵 Microsoft Authentication Library initialized');
            return true;
            
        } catch (error) {
            console.error('🔵 Failed to initialize Azure/Microsoft Login:', error);
            return false;
        }
    }
    
    /**
     * Start Microsoft Sign-In flow
     */
    async signIn() {
        if (!this.isLoaded) {
            throw new Error('Azure/Microsoft Login not initialized');
        }
        
        try {
            console.log('🔵 Starting Microsoft Sign-In flow...');
            
            const loginRequest = {
                scopes: ['User.Read', 'profile', 'email', 'openid'],
                prompt: 'select_account'
            };
            
            // Try silent sign-in first
            try {
                const accounts = this.msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    const silentRequest = {
                        ...loginRequest,
                        account: accounts[0]
                    };
                    
                    const response = await this.msalInstance.acquireTokenSilent(silentRequest);
                    const userData = await this._getUserProfile(response.accessToken);
                    
                    return {
                        success: true,
                        provider: 'azure',
                        userData: userData,
                        rawResponse: response
                    };
                }
            } catch (silentError) {
                console.log('🔵 Silent sign-in failed, falling back to interactive');
            }
            
            // Interactive sign-in
            const response = await this.msalInstance.acquireTokenPopup(loginRequest);
            const userData = await this._getUserProfile(response.accessToken);
            
            console.log('🔵 Microsoft Sign-In successful');
            return {
                success: true,
                provider: 'azure',
                userData: userData,
                rawResponse: response
            };
            
        } catch (error) {
            console.error('🔵 Microsoft Sign-In failed:', error);
            return {
                success: false,
                provider: 'azure',
                error: error.message || 'Microsoft Sign-In failed',
                errorCode: error.errorCode || 'unknown_error'
            };
        }
    }
    
    /**
     * Get user profile from Microsoft Graph API
     */
    async _getUserProfile(accessToken) {
        try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Graph API error: ${response.status}`);
            }
            
            const profile = await response.json();
            
            return {
                userId: profile.id,
                email: profile.mail || profile.userPrincipalName,
                firstName: profile.givenName,
                lastName: profile.surname,
                displayName: profile.displayName,
                profilePicture: null, // Would need separate call to get photo
                jobTitle: profile.jobTitle,
                officeLocation: profile.officeLocation,
                businessPhones: profile.businessPhones
            };
            
        } catch (error) {
            console.error('🔵 Failed to get user profile from Graph API:', error);
            
            // Fallback to basic info from token
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                const account = accounts[0];
                return {
                    userId: account.localAccountId,
                    email: account.username,
                    firstName: null,
                    lastName: null,
                    displayName: account.name || account.username,
                    profilePicture: null
                };
            }
            
            throw error;
        }
    }
    
    /**
     * Sign out from Microsoft
     */
    async signOut() {
        try {
            if (!this.isLoaded || !this.msalInstance) {
                return { success: true };
            }
            
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                const logoutRequest = {
                    account: accounts[0],
                    postLogoutRedirectUri: window.location.origin
                };
                
                await this.msalInstance.logoutPopup(logoutRequest);
            }
            
            console.log('🔵 Microsoft Sign-Out successful');
            return { success: true };
            
        } catch (error) {
            console.error('🔵 Microsoft Sign-Out failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Load Microsoft Authentication Library (MSAL.js)
     */
    async _loadMSAL() {
        return new Promise((resolve, reject) => {
            if (window.msal) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://alcdn.msauth.net/browser/2.38.4/js/msal-browser.min.js';
            script.integrity = 'sha384-6X8F5l9VKJlM8WpNLpQrNW0M4w+3mH+Y3KWnEU5P2q1Y7SBKPVJzVkKqKcKpJK7F';
            script.crossOrigin = 'anonymous';
            script.async = true;
            script.onload = () => {
                console.log('🔵 MSAL.js library loaded');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load MSAL.js library'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Get appropriate authority based on account type
     */
    _getAuthority(config) {
        if (config.authority) {
            return config.authority;
        }
        
        switch (this.accountType) {
            case 'work':
                return 'https://login.microsoftonline.com/organizations';
            case 'personal':
                return 'https://login.microsoftonline.com/consumers';
            case 'both':
            default:
                return 'https://login.microsoftonline.com/common';
        }
    }
    
    /**
     * Check if user is currently signed in
     */
    async isSignedIn() {
        try {
            if (!this.isLoaded || !this.msalInstance) {
                return false;
            }
            
            const accounts = this.msalInstance.getAllAccounts();
            return accounts.length > 0;
            
        } catch (error) {
            console.error('🔵 Error checking Microsoft sign-in status:', error);
            return false;
        }
    }
    
    /**
     * Get current user account
     */
    getCurrentAccount() {
        if (!this.isLoaded || !this.msalInstance) {
            return null;
        }
        
        const accounts = this.msalInstance.getAllAccounts();
        return accounts.length > 0 ? accounts[0] : null;
    }
    
    /**
     * Acquire access token silently
     */
    async getAccessToken(scopes = ['User.Read']) {
        try {
            if (!this.isLoaded || !this.msalInstance) {
                throw new Error('MSAL not initialized');
            }
            
            const account = this.getCurrentAccount();
            if (!account) {
                throw new Error('No account signed in');
            }
            
            const silentRequest = {
                scopes: scopes,
                account: account
            };
            
            const response = await this.msalInstance.acquireTokenSilent(silentRequest);
            return {
                success: true,
                accessToken: response.accessToken,
                expiresOn: response.expiresOn
            };
            
        } catch (error) {
            console.error('🔵 Failed to acquire access token:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get Microsoft Sign-In button HTML
     */
    getButtonHTML(options = {}) {
        const buttonText = options.text || 'Sign in with Microsoft';
        const buttonClass = options.className || 'microsoft-signin-button';
        
        return `
            <button type="button" class="${buttonClass}" style="
                background-color: #0078d4;
                border: 1px solid #0078d4;
                color: white;
                padding: 10px 16px;
                font-size: 14px;
                border-radius: 2px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                ${buttonText}
            </button>
        `;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AzureLogin;
} else if (typeof window !== 'undefined') {
    window.AzureLogin = AzureLogin;
}
