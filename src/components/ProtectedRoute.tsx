import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: string[];
}

export const ProtectedRoute = ({ children, allowedUserTypes }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Get user type from user metadata
  const userTypeFromMetadata = user.user_metadata?.user_type;
  
  // Temporary fixes for users without user_type set
  let effectiveUserType = userTypeFromMetadata;
  
  if (!userTypeFromMetadata) {
    // Check email to determine user type
    if (user?.email === 'realjarirkhann@gmail.com') {
      effectiveUserType = 'distributor';
    } else if (user?.email === 'kjarir23@gmail.com') {
      effectiveUserType = 'farmer';
    } else {
      // Default to farmer for any other users without user_type
      effectiveUserType = 'farmer';
    }
  }
  
  if (allowedUserTypes && effectiveUserType && !allowedUserTypes.includes(effectiveUserType)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
