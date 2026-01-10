import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FarmerDashboard } from './FarmerDashboard';
import { DistributorDashboard } from './DistributorDashboard';
import { RetailerDashboard } from './RetailerDashboard';
import { Loader2 } from 'lucide-react';

export const UnifiedDashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Priority: 1. Profile from database, 2. User metadata, 3. Email fallback
      const userTypeFromProfile = profile?.user_type;
      const userTypeFromMetadata = user.user_metadata?.user_type;
      
      // Use profile first (most reliable), then metadata, then fallback
      let effectiveUserType = userTypeFromProfile || userTypeFromMetadata;
      
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
      
      console.log('🔍 User type detection:', {
        fromProfile: userTypeFromProfile,
        fromMetadata: userTypeFromMetadata,
        effective: effectiveUserType,
        profile: profile
      });
      
      setUserType(effectiveUserType);
      
      // Redirect helpers to Helper Desk
      if (effectiveUserType === 'helper') {
        navigate('/helper-desk', { replace: true });
      }
    } else {
      setUserType(null);
    }
  }, [user, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to access your dashboard</h2>
          <p className="text-gray-600">You need to be logged in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user type
  switch (userType) {
    case 'farmer':
      return <FarmerDashboard />;
    case 'distributor':
      return <DistributorDashboard />;
    case 'retailer':
      return <RetailerDashboard />;
    case 'driver':
      // Redirect drivers to their dedicated dashboard
      navigate('/driver-dashboard', { replace: true });
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Redirecting to Driver Dashboard...</p>
          </div>
        </div>
      );
    case 'helper':
      // This should redirect via useEffect above, but show loading state just in case
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Redirecting to Helper Desk...</p>
          </div>
        </div>
      );
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Unknown User Type</h2>
            <p className="text-gray-600">Please contact support to set up your account properly.</p>
            <p className="text-sm text-gray-500 mt-2">User Type: {userType || 'Not set'}</p>
            <p className="text-xs text-gray-400 mt-4">Profile: {profile ? JSON.stringify(profile.user_type) : 'No profile'}</p>
            <p className="text-xs text-gray-400">Metadata: {user?.user_metadata?.user_type || 'No metadata'}</p>
          </div>
        </div>
      );
  }
};
