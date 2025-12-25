import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FarmerDashboard } from './FarmerDashboard';
import { DistributorDashboard } from './DistributorDashboard';
import { RetailerDashboard } from './RetailerDashboard';
import { Loader2 } from 'lucide-react';

export const UnifiedDashboard = () => {
  const { user, loading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
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
      
      setUserType(effectiveUserType);
    }
  }, [user]);

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
    case 'helper':
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Helper Dashboard</h2>
            <p className="text-gray-600">Helper dashboard is coming soon!</p>
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
          </div>
        </div>
      );
  }
};
