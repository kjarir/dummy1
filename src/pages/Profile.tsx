import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { sanitizeError, sanitizeString } from '@/lib/security';
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
  TrendingUp,
  Camera,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  X
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { analyzeCropHealth, type CropHealthAnalysis } from '@/features/ai-services/services/cropHealthService';

export const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    farmLocation: '',
    bio: ''
  });
  const { toast } = useToast();
  
  // Crop Health Detection State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CropHealthAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id || '')
        .single<Tables<'profiles'>>();

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
      logger.error('Error fetching profile', error);
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
      logger.error('Error updating profile', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
      });
    }
  };

  const handleAnalyzeCrop = async () => {
    if (!selectedImage) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const response = await analyzeCropHealth(selectedImage);
      
      if (response.success && response.analysis) {
        setAnalysisResult(response.analysis);
        toast({
          title: "Analysis Complete",
          description: `Detected: ${response.analysis.diseaseName || 'Crop health analyzed'}`,
        });
      } else {
        setAnalysisError(response.error || 'Failed to analyze crop image');
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: response.error || 'Please try again',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAnalysisError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityAlertClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-green-500 bg-green-50';
      default:
        return '';
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="farm">Farm Info</TabsTrigger>
            <TabsTrigger value="cropHealth">Crop Health</TabsTrigger>
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

          <TabsContent value="cropHealth">
            <Card className="govt-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Crop Health Detection
                </CardTitle>
                <CardDescription>
                  Upload a photo of your crop to detect diseases and get AI-powered remedies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image Upload Section */}
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    {!imagePreview ? (
                      <div className="space-y-4">
                        <Camera className="h-12 w-12 mx-auto text-gray-400" />
                        <div>
                          <Label htmlFor="crop-image" className="cursor-pointer">
                            <span className="text-primary hover:underline">Click to upload</span>
                            <span className="text-gray-600"> or drag and drop</span>
                          </Label>
                          <p className="text-sm text-gray-500 mt-2">
                            PNG, JPG up to 10MB
                          </p>
                        </div>
                        <Input
                          id="crop-image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedImage(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImagePreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                              setAnalysisResult(null);
                              setAnalysisError(null);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative inline-block">
                          <img
                            src={imagePreview}
                            alt="Crop preview"
                            className="max-h-64 rounded-lg mx-auto"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setSelectedImage(null);
                              setImagePreview(null);
                              setAnalysisResult(null);
                              setAnalysisError(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={handleAnalyzeCrop}
                            disabled={analyzing || !selectedImage}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {analyzing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Analyze Crop Health
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Analysis Results */}
                {analysisError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Analysis Failed</AlertTitle>
                    <AlertDescription>{analysisError}</AlertDescription>
                  </Alert>
                )}

                {analysisResult && (
                  <div className="space-y-4">
                    <Alert className={getSeverityAlertClass(analysisResult.severity)}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="text-lg font-semibold">
                        {analysisResult.diseaseName || 'Analysis Complete'}
                      </AlertTitle>
                      <AlertDescription className="mt-2">
                        <p className="mb-2">{analysisResult.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm">
                            <strong>Confidence:</strong> {Math.round(analysisResult.confidence * 100)}%
                          </span>
                          <span className="text-sm">
                            <strong>Severity:</strong> {analysisResult.severity.toUpperCase()}
                          </span>
                          {analysisResult.affectedArea && (
                            <span className="text-sm">
                              <strong>Affected:</strong> {analysisResult.affectedArea}
                            </span>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>

                    {analysisResult.remedies.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Recommended Remedies
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ol className="list-decimal list-inside space-y-2">
                            {analysisResult.remedies.map((remedy, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                {remedy}
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    )}

                    {analysisResult.prevention.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-600" />
                            Prevention Tips
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-2">
                            {analysisResult.prevention.map((tip, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-600" />
                            Additional Recommendations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-2">
                            {analysisResult.recommendations.map((rec, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
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