import { createPageUrl } from '@/utils';

export const handleAuthError = (error, navigate) => {
    if (error?.response?.status === 401 || 
        error?.message?.includes('401') || 
        error?.message?.includes('Unauthorized') ||
        error?.message?.includes('not authenticated')) {
        
        console.log('Authentication error detected, redirecting to home...');
        
        if (navigate) {
            navigate(createPageUrl('Home'));
        } else {
            window.location.href = '/';
        }
        return true;
    }
    return false;
};

export const withAuthErrorHandling = async (fn, navigate) => {
    try {
        return await fn();
    } catch (error) {
        if (handleAuthError(error, navigate)) {
            throw error; // Re-throw to let error boundary handle it
        }
        throw error;
    }
};