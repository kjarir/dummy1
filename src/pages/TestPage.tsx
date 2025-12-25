import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseDebugger } from '@/components/DatabaseDebugger';

export const TestPage = () => {
  const { user, profile, loading, signOut } = useAuth();

  const handleTestSignOut = async () => {
    console.log('Testing sign out...');
    await signOut();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Page - Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Authentication Status:</h3>
            <p>Loading: {loading ? 'Yes' : 'No'}</p>
            <p>User: {user ? 'Logged in' : 'Not logged in'}</p>
            <p>Profile: {profile ? 'Found' : 'Not found'}</p>
            {user && (
              <>
                <p>User ID: {user.id}</p>
                <p>Email: {user.email}</p>
                <p>User Type (from metadata): {user.user_metadata?.user_type || 'Not set'}</p>
                <p>Full Name (from metadata): {user.user_metadata?.full_name || 'Not set'}</p>
                <p>Farm Location (from metadata): {user.user_metadata?.farm_location || 'Not set'}</p>
              </>
            )}
            {profile && (
              <p>User Type (from profile): {profile.user_type}</p>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold">Actions:</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleTestSignOut} variant="outline">
                Test Sign Out
              </Button>
              <Button 
                onClick={async () => {
                  if (user?.email === 'realjarirkhann@gmail.com') {
                    console.log('🔍 DEBUG: Fixing user type for realjarirkhann@gmail.com');
                    alert('To fix this user type, go to Supabase Dashboard > Authentication > Users > Find realjarirkhann@gmail.com > Edit user metadata > Set user_type to "distributor"');
                  } else if (user?.email === 'kjarir23@gmail.com') {
                    console.log('🔍 DEBUG: Fixing user type for kjarir23@gmail.com');
                    alert('To fix this user type, go to Supabase Dashboard > Authentication > Users > Find kjarir23@gmail.com > Edit user metadata > Set user_type to "farmer"');
                  } else {
                    alert('This fix is only for realjarirkhann@gmail.com (distributor) or kjarir23@gmail.com (farmer)');
                  }
                }}
                variant="outline"
                className="bg-blue-100 text-blue-800 hover:bg-blue-200"
              >
                Fix User Type
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <DatabaseDebugger />
      </div>
    </div>
  );
};
