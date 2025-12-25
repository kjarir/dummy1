import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Star, 
  Award, 
  Shield, 
  Edit, 
  Save,
  Wallet,
  Package,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

export const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    farmLocation: '',
    bio: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setFormData({
        fullName: data?.full_name || '',
        email: data?.email || '',
        phone: data?.phone || '',
        farmLocation: data?.farm_location || '',
        bio: ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          farm_location: formData.farmLocation
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        farm_location: formData.farmLocation
      });

      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Profile Header */}
        <Card className="govt-card mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="relative">
                  <img 
                    src={profile?.avatar_url || '/placeholder.svg'} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div className="absolute inset-0 rounded-full border-4 border-white shadow-lg"></div>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold">{profile?.full_name || 'Unknown User'}</h2>
                  <p className="text-sm text-muted-foreground capitalize">{profile?.role || 'User'}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant={profile?.is_verified ? "default" : "outline"}>
                    {profile?.is_verified ? "Verified" : "Pending"}
                  </Badge>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    {profile?.reputation_score || 0} points
                  </div>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {profile?.farm_location || 'Location not specified'}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  Member since {new Date(profile?.created_at || Date.now()).toLocaleDateString()}
                </div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold">{profile?.reputation_score || 0}/100</div>
                <div className="text-sm text-muted-foreground">Reputation</div>
                <Progress value={profile?.reputation_score || 0} className="mt-2" />
              </div>
            </div>

            {/* Achievements */}
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Achievements</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Verified Farmer', icon: Shield, color: 'text-green-600' },
                  { name: 'Quality Producer', icon: Star, color: 'text-yellow-600' }
                ].map((badge, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 px-3 py-1 rounded-full bg-muted text-sm"
                  >
                    <badge.icon className={`h-4 w-4 ${badge.color}`} />
                    <span>{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              {isEditing ? (
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="farm">Farm Info</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="govt-card">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Manage your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.farmLocation}
                      onChange={(e) => setFormData({...formData, farmLocation: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="farm">
            <Card className="govt-card">
              <CardHeader>
                <CardTitle>Farm Information</CardTitle>
                <CardDescription>
                  Details about your farming operation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Farm Location</Label>
                    <Input
                      value={formData.farmLocation}
                      onChange={(e) => setFormData({...formData, farmLocation: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Farm Size</Label>
                    <Input
                      placeholder="e.g., 5 acres"
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Primary Crops</Label>
                    <Input
                      placeholder="e.g., Rice, Wheat, Vegetables"
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Certifications</Label>
                    <Input
                      placeholder="e.g., Organic, Fair Trade"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <Card className="govt-card">
              <CardHeader>
                <CardTitle>Wallet Information</CardTitle>
                <CardDescription>
                  Manage your blockchain wallet and payment details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Connected Wallet</span>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono">{profile?.wallet_address || 'Not connected'}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Current Balance</span>
                    <span className="font-mono">₹0.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Earnings</span>
                    <span className="font-mono">₹0.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending Payments</span>
                    <span className="font-mono">₹0.00</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="govt-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">Total Batches</div>
                  </CardContent>
                </Card>
                <Card className="govt-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold">₹0</div>
                    <div className="text-sm text-muted-foreground">Total Sales</div>
                  </CardContent>
                </Card>
                <Card className="govt-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-2xl font-bold">0/5</div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="govt-card">
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>Recent activities and milestones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4" />
                    <p>No activity to show yet</p>
                    <p className="text-sm">Start by registering your first batch</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};