import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { sanitizeError, sanitizeString } from '@/lib/security';
import { Tables } from '@/integrations/supabase/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserTypes?: string[];
}

export const ProtectedRoute = ({ children, allowedUserTypes }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  // Initialize profileLoading based on whether we have a profile
  const [profileLoading, setProfileLoading] = React.useState(() => {
    // If we already have a profile, no need to load
    return !profile;
  });
  const [fetchedProfile, setFetchedProfile] = React.useState<Tables<'profiles'> | null>(null);

  // Fetch profile directly if it's not loaded yet - CRITICAL: Must complete before access check
  React.useEffect(() => {
    let isMounted = true;
    
    if (user && !profile && !loading) {
      // Keep loading state true while fetching - DO NOT proceed until fetch completes
      setProfileLoading(true);
      
      // Try to fetch profile directly from database
      const fetchProfileDirectly = async () => {
        try {
          logger.debug('ProtectedRoute: Fetching profile for user', { userId: sanitizeString(user.id, 100) });
          const { data: profileList, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .limit(1)
            .returns<Tables<'profiles'>[]>();
          
          if (!isMounted) return; // Component unmounted, don't update state
          
          if (!error && profileList && profileList.length > 0) {
            logger.debug('Profile fetched directly in ProtectedRoute', { profileId: sanitizeString(profileList[0]?.id, 100) });
            setFetchedProfile(profileList[0]);
            setProfileLoading(false); // Only set to false AFTER profile is fetched
          } else {
            // Profile doesn't exist or error
            logger.warn('Profile not found in ProtectedRoute', { 
              error: error ? sanitizeError(error) : 'No profile found',
              userId: sanitizeString(user.id, 100)
            });
            setFetchedProfile(null);
            setProfileLoading(false); // Set to false even if no profile found
          }
        } catch (err) {
          if (!isMounted) return;
          logger.error('Error fetching profile in ProtectedRoute', err);
          setFetchedProfile(null);
          setProfileLoading(false);
        }
      };
      
      fetchProfileDirectly();
    } else if (profile) {
      // Profile is already loaded from context, we're good
      logger.debug('Profile already loaded from context');
      setProfileLoading(false);
    } else if (!user) {
      // No user, no need to wait
      setProfileLoading(false);
    } else if (loading) {
      // Still loading from context
      setProfileLoading(true);
    } else {
      // Edge case: user exists but profile is null and not loading
      setProfileLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, profile, loading]);

  if (loading || profileLoading) {
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

  // Priority: 1. Profile from database (fetched or from context), 2. User metadata, 3. Email fallback
  // Use fetchedProfile if profile from context is null
  const activeProfile = profile || fetchedProfile;
  const userTypeFromProfile = activeProfile?.user_type;
  const userTypeFromMetadata = user.user_metadata?.user_type;
  
  // IMPORTANT: Only use metadata if profile is truly not available
  // Profile from database is the source of truth, not metadata
  let effectiveUserType = userTypeFromProfile;
  
  // Only fall back to metadata if profile doesn't exist at all
  if (!effectiveUserType && !activeProfile) {
    effectiveUserType = userTypeFromMetadata;
  }
  
  if (!effectiveUserType) {
    // Check email to determine user type (temporary fallback)
    if (user?.email === 'realjarirkhann@gmail.com') {
      effectiveUserType = 'distributor';
    } else if (user?.email === 'kjarir23@gmail.com') {
      effectiveUserType = 'farmer';
    } else {
      // Default to farmer for any other users without user_type
      effectiveUserType = 'farmer';
    }
  }
  
  // Log for debugging
  logger.debug('ProtectedRoute check', {
    path: sanitizeString(location.pathname, 255),
    effectiveUserType: sanitizeString(effectiveUserType, 50),
    allowedUserTypes,
    fromProfile: sanitizeString(userTypeFromProfile, 50),
    fromMetadata: sanitizeString(userTypeFromMetadata, 50),
    profileExists: !!activeProfile,
    profileFromContext: !!profile,
    profileFetched: !!fetchedProfile,
    profileId: activeProfile?.id ? sanitizeString(activeProfile.id, 100) : undefined,
    userEmail: user?.email ? sanitizeString(user.email, 255) : undefined,
    userId: user?.id ? sanitizeString(user.id, 100) : undefined
  });
  
  // Check if user type is allowed
  if (allowedUserTypes && allowedUserTypes.length > 0) {
    if (!effectiveUserType || !allowedUserTypes.includes(effectiveUserType)) {
      logger.warn('Access denied', {
        effectiveUserType: sanitizeString(effectiveUserType, 50),
        allowedUserTypes,
        fromProfile: sanitizeString(userTypeFromProfile, 50),
        fromMetadata: sanitizeString(userTypeFromMetadata, 50),
        profileExists: !!activeProfile,
        profileFromContext: !!profile,
        profileFetched: !!fetchedProfile,
        path: sanitizeString(location.pathname, 255)
      });
      return <Navigate to="/unauthorized" replace />;
    }
  }

  logger.debug('Access granted', { 
    effectiveUserType: sanitizeString(effectiveUserType, 50), 
    allowedUserTypes 
  });
  return <>{children}</>;
};
