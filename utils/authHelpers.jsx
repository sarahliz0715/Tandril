import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

/**
 * Centralized authentication error handler
 * @param {Error} error - The error object
 * @param {Function} navigate - React Router navigate function
 * @param {Object} options - Configuration options
 * @returns {boolean} - True if it was an auth error and was handled
 */
// Pages anyone can see without logging in. An auth error from a request that
// was still running when the user logged out must not pull them off one of
// these (e.g. Dashboard data retries finishing after they already clicked
// Log in, which bounced them from the Login page back to the landing page).
const PUBLIC_PATHS = ['/', '/home', '/login', '/signup', '/pricing', '/termsofservice', '/privacypolicy', '/privacy', '/terms', '/emailsignups', '/survey'];

export const isOnPublicPage = () => {
    try {
        const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
        return PUBLIC_PATHS.includes(path);
    } catch {
        return false;
    }
};

export const handleAuthError = (error, navigate, options = {}) => {
    const {
        showToast = false,
        redirectTo = 'Home',
        customMessage = "Your session has expired. Please sign in again."
    } = options;

    // Check for 401 status
    const _em = (error?.message || '').toLowerCase(); if (error.response?.status === 401 || error.status === 401 || _em.includes('session') || _em.includes('jwt') || _em.includes('auth session') || (error?.name || '').includes('Auth')) {
        if (isOnPublicPage()) return true;
        if (showToast) {
            toast.error("Authentication Required", {
                description: customMessage,
                duration: 5000
            });
        }
        
        console.log(`Auth error detected, redirecting to ${redirectTo}`);
        navigate(createPageUrl(redirectTo));
        return true;
    }
    
    // Check for 429 rate limit
    if (error.response?.status === 429 || error.status === 429) {
        toast.error("Too Many Requests", {
            description: "Please wait a moment before trying again.",
            duration: 5000
        });
        return true;
    }
    
    return false;
};

/**
 * Wrapper for async functions that automatically handles auth errors
 * @param {Function} fn - Async function to wrap
 * @param {Function} navigate - React Router navigate function
 * @param {Object} options - Configuration options
 */
export const withAuthHandling = (fn, navigate, options = {}) => {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            if (handleAuthError(error, navigate, options)) {
                return null;
            }
            throw error;
        }
    };
};

/**
 * Retry function with exponential backoff for rate limits
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (error.response?.status === 429 && i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                console.log(`Rate limited, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
};
