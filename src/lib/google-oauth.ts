// Google OAuth utility functions
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (element: HTMLElement, config: { theme: string; size: string; width?: string }) => void;
        };
      };
    };
  }
}

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export class GoogleOAuth {
  private static instance: GoogleOAuth;
  private isInitialized = false;
  private clientId = '333954717151-lbt13auoodjdc5veufhdfnqev3enmp8c.apps.googleusercontent.com';

  static getInstance(): GoogleOAuth {
    if (!GoogleOAuth.instance) {
      GoogleOAuth.instance = new GoogleOAuth();
    }
    return GoogleOAuth.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google OAuth can only be initialized in browser'));
        return;
      }

      // Load Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        window.google.accounts.id.initialize({
          client_id: this.clientId,
          callback: () => {}, // Will be overridden per use case
        });
        this.isInitialized = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Google OAuth script'));
      };
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<GoogleUser> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google OAuth sign in can only be used in browser'));
        return;
      }

      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: (response: { credential: string }) => {
          try {
            // Decode the JWT token
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            
            const googleUser: GoogleUser = {
              googleId: payload.sub,
              email: payload.email,
              name: payload.name,
              picture: payload.picture
            };
            
            resolve(googleUser);
          } catch (_error) {
            reject(new Error('Failed to parse Google OAuth response'));
          }
        },
      });

      window.google.accounts.id.prompt((notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          reject(new Error('Google OAuth popup was blocked or closed'));
        }
      });
    });
  }

  async renderButton(element: HTMLElement, callback: (user: GoogleUser) => void): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (typeof window === 'undefined') {
      throw new Error('Google OAuth button can only be rendered in browser');
    }

    window.google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (response: { credential: string }) => {
        try {
          const payload = JSON.parse(atob(response.credential.split('.')[1]));
          
          const googleUser: GoogleUser = {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
          };
          
          callback(googleUser);
        } catch (error) {
          console.error('Failed to parse Google OAuth response:', error);
        }
      },
    });

    window.google.accounts.id.renderButton(element, {
      theme: 'outline',
      size: 'large'
    });
  }
}
