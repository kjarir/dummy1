import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { sanitizeError, sanitizeString, isValidPhone } from '@/lib/security';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { fetchVoiceGenieCalls, validateVoiceGenieData, type VoiceGenieCall } from '@/features/batch-registration/services/voicegenieService';
import { registerBatchFromVoiceGenie } from '@/features/batch-registration/services/voicegenieBatchRegistration';
import { useWeb3 } from '@/features/blockchain/contexts/Web3Context';
import { 
  Phone, 
  User, 
  Package, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  Play,
  AlertCircle,
  Clock,
  TrendingUp,
  Shield,
  FileText,
  MapPin,
  Globe,
  BarChart3,
  Sparkles,
  Leaf,
  Award
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const HelperDesk = () => {
  const { user, profile } = useAuth();
  const { signer, isConnected } = useWeb3();
  const { toast } = useToast();
  const [calls, setCalls] = useState<VoiceGenieCall[]>([]);
  const [loading, setLoading] = useState(false); // Start with false since no auto-refresh
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<VoiceGenieCall | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [processingCallId, setProcessingCallId] = useState<string | null>(null);
  const isFetchingRef = useRef(false); // Prevent multiple simultaneous fetches

  // Removed automatic refresh - user must manually click refresh button

  const fetchCalls = async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      logger.debug('Already fetching calls, skipping duplicate request');
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      logger.debug('Fetching calls from VoiceGenie API');
      const fetchedCalls = await fetchVoiceGenieCalls();
      logger.debug('Fetched calls from API', { count: fetchedCalls.length });
      
      // Filter to only show calls that are not already registered/rejected
      // Show all calls, even if they don't have collectedData (they might be in progress or incomplete)
      const activeCalls = fetchedCalls.filter(call => 
        call.status !== 'registered' &&
        call.status !== 'rejected'
      );
      
      logger.debug('Active calls after filtering', { count: activeCalls.length });
      
      setCalls(activeCalls);
      
      if (activeCalls.length === 0) {
        toast({
          title: "No Active Calls",
          description: "All calls have been processed or no new calls available.",
        });
      } else {
        toast({
          title: "Calls Loaded",
          description: `Found ${activeCalls.length} active call(s)`,
        });
      }
    } catch (error) {
      logger.error('Error fetching VoiceGenie calls', error);
      const errorMessage = error instanceof Error ? sanitizeError(error) : "Failed to fetch calls from VoiceGenie API";
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error Fetching Calls",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleViewDetails = (call: VoiceGenieCall) => {
    setSelectedCall(call);
    setIsDetailsModalOpen(true);
  };

  const handleApprove = async (call: VoiceGenieCall) => {
    if (!call.collectedData) {
      toast({
        variant: "destructive",
        title: "Invalid Data",
        description: "This call does not have collected data.",
      });
      return;
    }

    // Validate data
    const validation = validateVoiceGenieData(call.collectedData);
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: validation.errors.join(', '),
      });
      return;
    }

    if (!isConnected || !signer) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet to register batches on the blockchain.",
      });
      return;
    }

    try {
      setProcessingCallId(call.id);
      
      // Register batch on blockchain and Pinata
      const result = await registerBatchFromVoiceGenie(
        call.collectedData,
        call.phone,
        call.farmerName || 'Unknown Farmer',
        call.farmerLocation,
        signer
      );

      // Save submission record to database
      // Note: voicegenie_submissions table may not be in generated types, using type assertion
      const submissionData = {
        call_id: sanitizeString(call.id, 100),
        farmer_phone: sanitizeString(call.phone, 20),
        farmer_name: call.farmerName ? sanitizeString(call.farmerName, 255) : null,
        farmer_location: call.farmerLocation ? sanitizeString(call.farmerLocation, 500) : null,
        submission_data: call.collectedData || {},
        language: sanitizeString(call.language || 'hi', 10),
        confidence_score: call.confidenceScore || 0.5,
        call_recording_url: call.callRecordingUrl ? sanitizeString(call.callRecordingUrl, 500) : null,
        status: 'registered' as const,
        helper_id: profile?.id || null,
        helper_notes: 'Approved and registered via Helper Desk',
        reviewed_at: new Date().toISOString(),
        registered_at: new Date().toISOString(),
        batch_id: sanitizeString(result.batchId, 100)
      };

      const { error: dbError } = await supabase
        .from('voicegenie_submissions')
        .insert(submissionData as Record<string, unknown>);

      if (dbError) {
        logger.warn('Failed to save submission record', { error: dbError.message });
        // Don't fail the whole process if DB save fails
      }

      toast({
        title: "Batch Registered Successfully!",
        description: `Batch ID: ${result.batchId}. Blockchain: ${result.blockchainHash.substring(0, 10)}...`,
      });

      // Refresh calls list
      fetchCalls();
      setIsDetailsModalOpen(false);
    } catch (error) {
      logger.error('Error registering batch', error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error instanceof Error ? sanitizeError(error) : "Failed to register batch. Please try again.",
      });
    } finally {
      setProcessingCallId(null);
    }
  };

  const handleReject = async (call: VoiceGenieCall, reason: string) => {
    try {
      // Save rejection record
      const rejectionData = {
        call_id: sanitizeString(call.id, 100),
        farmer_phone: sanitizeString(call.phone, 20),
        farmer_name: call.farmerName ? sanitizeString(call.farmerName, 255) : null,
        farmer_location: call.farmerLocation ? sanitizeString(call.farmerLocation, 500) : null,
        submission_data: call.collectedData || {},
        language: sanitizeString(call.language || 'hi', 10),
        confidence_score: call.confidenceScore || 0.5,
        call_recording_url: call.callRecordingUrl ? sanitizeString(call.callRecordingUrl, 500) : null,
        status: 'rejected' as const,
        helper_id: profile?.id || null,
        helper_notes: 'Rejected via Helper Desk',
        rejection_reason: sanitizeString(reason, 500),
        reviewed_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('voicegenie_submissions')
        .insert(rejectionData as Record<string, unknown>);

      if (error) {
        logger.error('Failed to save rejection', { error: error.message });
      }

      toast({
        title: "Call Rejected",
        description: "The submission has been rejected.",
      });

      fetchCalls();
      setIsDetailsModalOpen(false);
    } catch (error) {
      logger.error('Error rejecting call', error);
      toast({
        variant: "destructive",
        title: "Rejection Failed",
        description: error instanceof Error ? sanitizeError(error) : "Failed to save rejection. Please try again.",
      });
    }
  };

  // Wait for profile to load before checking authorization
  // Check user_type field (profiles table uses user_type, not role)
  type ProfileRow = Tables<'profiles'>;
  const userRole = (profile as ProfileRow | null)?.user_type || null;
  const isHelper = userRole === 'helper' || userRole === 'admin';
  
  // Debug logging (removed sensitive data)
  logger.debug('HelperDesk auth check', {
    profileId: profile?.id,
    userType: userRole,
    isHelper: isHelper,
    userId: user?.id,
  });
  
  // Show loading while profile is being fetched
  if (!profile && user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  // Check authorization after profile is loaded
  if (profile && !isHelper) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need helper or admin role to access this page.
            </p>
            <div className="mt-4 text-sm text-gray-500 space-y-2">
              <p><strong>Current role:</strong> {userRole || 'Not set'}</p>
              <p><strong>Profile loaded:</strong> {profile ? 'Yes' : 'No'}</p>
              <p><strong>User email:</strong> {user?.email || 'Not available'}</p>
              {profile && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer font-semibold">Profile Details</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If no user, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Please Log In</h2>
            <p className="text-muted-foreground">
              You need to be logged in to access Helper Desk.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading calls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-2">
                  Helper Desk
                  <Badge variant="outline" className="text-xs">VoiceGenie</Badge>
                </h1>
                <p className="text-muted-foreground text-lg">
                  Review and approve batch registrations from voice calls
                </p>
              </div>
            </div>
            <Button 
              onClick={fetchCalls} 
              variant="outline"
              size="lg"
              className="shadow-md hover:shadow-lg transition-all"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh Calls'}
            </Button>
          </div>

          {/* Wallet Status */}
          {!isConnected && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Wallet Not Connected:</strong> Please connect your wallet to approve and register batches on the blockchain.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="govt-card hover-lift border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Pending
                </Badge>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{calls.length}</div>
              <div className="text-sm text-muted-foreground">Pending Calls</div>
            </CardContent>
          </Card>

          <Card className="govt-card hover-lift border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                  High Quality
                </Badge>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {calls.filter(c => (c.confidenceScore || 0) >= 0.8).length}
              </div>
              <div className="text-sm text-muted-foreground">High Confidence</div>
            </CardContent>
          </Card>

          <Card className="govt-card hover-lift border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-orange-100">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700">
                  Needs Review
                </Badge>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {calls.filter(c => {
                  const validation = c.collectedData ? validateVoiceGenieData(c.collectedData) : { isValid: false, errors: [] };
                  return !validation.isValid;
                }).length}
              </div>
              <div className="text-sm text-muted-foreground">Has Errors</div>
            </CardContent>
          </Card>

          <Card className="govt-card hover-lift border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-100">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Avg Score
                </Badge>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {calls.length > 0 
                  ? Math.round((calls.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / calls.length) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Average Confidence</div>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
              <Button 
                onClick={fetchCalls} 
                variant="outline" 
                size="sm" 
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Calls List */}
        {calls.length === 0 && !loading && !error ? (
          <Card className="govt-card">
            <CardContent className="p-16 text-center">
              <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
                <Sparkles className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">All Caught Up!</h3>
              <p className="text-muted-foreground text-lg mb-6 max-w-md mx-auto">
                All calls have been processed. New voice calls will appear here automatically.
              </p>
              <Button onClick={fetchCalls} variant="outline" size="lg">
                <RefreshCw className="h-4 w-4 mr-2" />
                Check for New Calls
              </Button>
            </CardContent>
          </Card>
        ) : calls.length > 0 ? (
          <div className="space-y-6">
            {calls.map((call) => {
              const validation = call.collectedData ? validateVoiceGenieData(call.collectedData) : { isValid: false, errors: [] };
              const confidencePercent = Math.round((call.confidenceScore || 0) * 100);
              
              return (
                <Card 
                  key={call.id} 
                  className="govt-card hover-lift border-l-4 transition-all duration-300"
                  style={{
                    borderLeftColor: validation.isValid 
                      ? confidencePercent >= 80 ? 'rgb(34, 197, 94)' 
                      : 'rgb(59, 130, 246)' 
                      : 'rgb(239, 68, 68)'
                  }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-xl ${
                          validation.isValid && confidencePercent >= 80 
                            ? 'bg-green-100' 
                            : validation.isValid 
                            ? 'bg-blue-100' 
                            : 'bg-red-100'
                        }`}>
                          <User className={`h-6 w-6 ${
                            validation.isValid && confidencePercent >= 80 
                              ? 'text-green-600' 
                              : validation.isValid 
                              ? 'text-blue-600' 
                              : 'text-red-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2 flex items-center gap-2">
                            {call.farmerName || 'Unknown Farmer'}
                            {call.farmerLocation && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {call.farmerLocation}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {call.phone}
                            </span>
                            {call.language && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-4 w-4" />
                                {call.language.toUpperCase()}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant={validation.isValid ? "default" : "destructive"}
                          className="text-xs px-3 py-1"
                        >
                          {validation.isValid ? (
                            <CheckCircle className="h-3 w-3 mr-1 inline" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1 inline" />
                          )}
                          {validation.isValid ? "Valid" : "Invalid"}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                confidencePercent >= 80 ? 'bg-green-500' :
                                confidencePercent >= 60 ? 'bg-blue-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${confidencePercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            {confidencePercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {call.collectedData ? (
                      <>
                        {/* Essential Fields for Batch Registration - Prominently Displayed */}
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Essential Batch Registration Fields</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                            {/* Crop Type */}
                            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-300">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="h-4 w-4 text-blue-600" />
                                <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">Crop Type *</div>
                              </div>
                              <div className="text-lg font-bold text-blue-900">
                                {call.collectedData?.cropType && String(call.collectedData.cropType).trim() ? (
                                  String(call.collectedData.cropType).trim()
                                ) : (
                                  <span className="text-red-500 text-sm font-normal">Missing</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Variety */}
                            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border-2 border-green-300">
                              <div className="flex items-center gap-2 mb-2">
                                <Leaf className="h-4 w-4 text-green-600" />
                                <div className="text-xs font-bold text-green-700 uppercase tracking-wide">Variety *</div>
                              </div>
                              <div className="text-lg font-bold text-green-900">
                                {call.collectedData?.variety && String(call.collectedData.variety).trim() ? (
                                  String(call.collectedData.variety).trim()
                                ) : (
                                  <span className="text-red-500 text-sm font-normal">Missing</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Harvest Quantity */}
                            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 border-2 border-purple-300">
                              <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="h-4 w-4 text-purple-600" />
                                <div className="text-xs font-bold text-purple-700 uppercase tracking-wide">Harvest Qty *</div>
                              </div>
                              <div className="text-lg font-bold text-purple-900">
                                {call.collectedData.harvestQuantity ? (
                                  `${call.collectedData.harvestQuantity.toLocaleString()} kg`
                                ) : (
                                  <span className="text-red-500 text-sm">Missing</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Sowing Date */}
                            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-300">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">Sowing Date *</div>
                              </div>
                              <div className="text-lg font-bold text-blue-900">
                                {call.collectedData.sowingDate || <span className="text-red-500 text-sm">Missing</span>}
                              </div>
                            </div>
                            
                            {/* Harvest Date */}
                            <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-2 border-indigo-300">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-indigo-600" />
                                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Harvest Date *</div>
                              </div>
                              <div className="text-lg font-bold text-indigo-900">
                                {call.collectedData.harvestDate || <span className="text-red-500 text-sm">Missing</span>}
                              </div>
                            </div>
                            
                            {/* Price Per Kg */}
                            <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 border-2 border-orange-300">
                              <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-4 w-4 text-orange-600" />
                                <div className="text-xs font-bold text-orange-700 uppercase tracking-wide">Price/Kg *</div>
                              </div>
                              <div className="text-lg font-bold text-orange-900">
                                {call.collectedData.pricePerKg ? (
                                  `₹${call.collectedData.pricePerKg}/kg`
                                ) : (
                                  <span className="text-red-500 text-sm">Missing</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Fields */}
                        {(call.collectedData.certification || call.collectedData.grading || call.collectedData.farmLocation) && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Additional Information</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {call.collectedData.certification && (
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Certification</div>
                                  <div className="text-base font-semibold text-gray-900">{call.collectedData.certification}</div>
                                </div>
                              )}
                              {call.collectedData.grading && (
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Grading</div>
                                  <div className="text-base font-semibold text-gray-900">{call.collectedData.grading}</div>
                                </div>
                              )}
                              {call.collectedData.farmLocation && (
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Farm Location</div>
                                  <div className="text-base font-semibold text-gray-900">{call.collectedData.farmLocation}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {validation.errors.length > 0 && (
                          <Alert variant="destructive" className="mb-4 border-2">
                            <AlertCircle className="h-5 w-5" />
                            <AlertDescription>
                              <strong className="text-base">Validation Errors:</strong>
                              <ul className="list-disc list-inside mt-2 space-y-1">
                                {validation.errors.map((error, idx) => (
                                  <li key={idx} className="text-sm">{error}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    ) : (
                      <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No collected data available for this call.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-wrap gap-3 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleViewDetails(call)}
                        className="flex-1 md:flex-none"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {call.callRecordingUrl && (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => window.open(call.callRecordingUrl, '_blank')}
                          className="flex-1 md:flex-none"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Play Recording
                        </Button>
                      )}
                      <Button
                        size="lg"
                        className="flex-1 md:flex-1 gradient-primary text-white hover:opacity-90 disabled:opacity-50"
                        onClick={() => handleApprove(call)}
                        disabled={!validation.isValid || processingCallId === call.id || !isConnected}
                      >
                        {processingCallId === call.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve & Register
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={() => {
                          const reason = prompt('Rejection reason:');
                          if (reason) {
                            handleReject(call, reason);
                          }
                        }}
                        disabled={processingCallId === call.id}
                        className="flex-1 md:flex-none"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Call Details</DialogTitle>
                <DialogDescription className="text-base mt-1">
                  Review all collected information from the VoiceGenie call
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedCall && (
            <div className="space-y-6 pt-4">
              {/* Farmer Information */}
              <Card className="govt-card border-l-4 border-l-blue-500">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Farmer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Name</div>
                        <div className="font-semibold text-foreground">{selectedCall.farmerName || 'Not provided'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Phone</div>
                        <div className="font-semibold text-foreground">{selectedCall.phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Location</div>
                        <div className="font-semibold text-foreground">{selectedCall.farmerLocation || 'Not provided'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Language</div>
                        <div className="font-semibold text-foreground">{(selectedCall.language || 'hi').toUpperCase()}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Confidence Score</div>
                        <div className="text-2xl font-bold text-green-700">{(selectedCall.confidenceScore || 0) * 100}%</div>
                      </div>
                      <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all"
                          style={{ width: `${(selectedCall.confidenceScore || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Batch Information */}
              {selectedCall.collectedData && (
                <Card className="govt-card border-l-4 border-l-green-500">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-transparent">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-green-600" />
                      Batch Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-blue-600" />
                          <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Crop Type *</div>
                        </div>
                        <div className="text-lg font-bold text-blue-900">
                          {selectedCall.collectedData?.cropType ? (
                            selectedCall.collectedData.cropType
                          ) : (
                            <span className="text-red-500 text-sm font-normal">Missing</span>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Leaf className="h-4 w-4 text-green-600" />
                          <div className="text-xs font-medium text-green-700 uppercase tracking-wide">Variety *</div>
                        </div>
                        <div className="text-lg font-bold text-green-900">
                          {selectedCall.collectedData?.variety ? (
                            selectedCall.collectedData.variety
                          ) : (
                            <span className="text-red-500 text-sm font-normal">Missing</span>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="h-4 w-4 text-purple-600" />
                          <div className="text-xs font-medium text-purple-700 uppercase tracking-wide">Quantity</div>
                        </div>
                        <div className="text-lg font-bold text-purple-900">{selectedCall.collectedData.harvestQuantity || 'N/A'} kg</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-orange-600" />
                          <div className="text-xs font-medium text-orange-700 uppercase tracking-wide">Price per Kg</div>
                        </div>
                        <div className="text-lg font-bold text-orange-900">₹{selectedCall.collectedData.pricePerKg || 'N/A'}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-indigo-600" />
                          <div className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Sowing Date</div>
                        </div>
                        <div className="text-lg font-bold text-indigo-900">
                          {selectedCall.collectedData.sowingDate 
                            ? new Date(selectedCall.collectedData.sowingDate).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-teal-600" />
                          <div className="text-xs font-medium text-teal-700 uppercase tracking-wide">Harvest Date</div>
                        </div>
                        <div className="text-lg font-bold text-teal-900">
                          {selectedCall.collectedData.harvestDate 
                            ? new Date(selectedCall.collectedData.harvestDate).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-4 w-4 text-pink-600" />
                          <div className="text-xs font-medium text-pink-700 uppercase tracking-wide">Grading</div>
                        </div>
                        <div className="text-lg font-bold text-pink-900">{selectedCall.collectedData.grading || 'Standard'}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100/50 border border-cyan-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-cyan-600" />
                          <div className="text-xs font-medium text-cyan-700 uppercase tracking-wide">Certification</div>
                        </div>
                        <div className="text-lg font-bold text-cyan-900">{selectedCall.collectedData.certification || 'Standard'}</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <div className="text-xs font-medium text-amber-700 uppercase tracking-wide">Freshness</div>
                        </div>
                        <div className="text-lg font-bold text-amber-900">{selectedCall.collectedData.freshnessDuration || 7} days</div>
                      </div>
                      {selectedCall.collectedData.labTest && (
                        <div className="col-span-2 md:col-span-3 p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-gray-600" />
                            <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">Lab Test Results</div>
                          </div>
                          <div className="text-base font-semibold text-gray-900">{selectedCall.collectedData.labTest}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Validation */}
              {selectedCall.collectedData && (
                <Card className={`govt-card border-l-4 ${
                  validateVoiceGenieData(selectedCall.collectedData).isValid 
                    ? 'border-l-green-500' 
                    : 'border-l-red-500'
                }`}>
                  <CardHeader className={`bg-gradient-to-r ${
                    validateVoiceGenieData(selectedCall.collectedData).isValid 
                      ? 'from-green-50 to-transparent' 
                      : 'from-red-50 to-transparent'
                  }`}>
                    <CardTitle className="flex items-center gap-2">
                      {validateVoiceGenieData(selectedCall.collectedData).isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      Validation Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {(() => {
                      const validation = validateVoiceGenieData(selectedCall.collectedData);
                      return validation.isValid ? (
                        <Alert className="border-2 border-green-200 bg-green-50">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <AlertDescription className="text-green-800">
                            <strong className="text-base">All checks passed!</strong>
                            <p className="mt-1">All required fields are present and valid. Ready for registration.</p>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive" className="border-2">
                          <AlertCircle className="h-5 w-5" />
                          <AlertDescription>
                            <strong className="text-base">Validation Errors:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              {validation.errors.map((error, idx) => (
                                <li key={idx} className="text-sm">{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  size="lg"
                  className="flex-1 gradient-primary text-white hover:opacity-90 disabled:opacity-50"
                  onClick={() => selectedCall && handleApprove(selectedCall)}
                  disabled={!selectedCall?.collectedData || !validateVoiceGenieData(selectedCall.collectedData).isValid || processingCallId === selectedCall?.id || !isConnected}
                >
                  {processingCallId === selectedCall?.id ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approve & Register
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    if (selectedCall) {
                      const reason = prompt('Rejection reason:');
                      if (reason) {
                        handleReject(selectedCall, reason);
                      }
                    }
                  }}
                  disabled={processingCallId === selectedCall?.id}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HelperDesk;

