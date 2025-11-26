import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/api/apiClient';

/**
 * ProtectedRoute Component
 *
 * Wraps routes that require authentication. Redirects to login if user is not authenticated.
 */
export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await auth.isAuthenticated();
        setIsAuthenticated(authenticated);

        if (!authenticated) {
          // Redirect to login, preserving the intended destination
          navigate(`/Login?returnUrl=${encodeURIComponent(location.pathname)}`, {
            replace: true,
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        navigate(`/Login?returnUrl=${encodeURIComponent(location.pathname)}`, {
          replace: true,
        });
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigate, location]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  return isAuthenticated ? children : null;
}
