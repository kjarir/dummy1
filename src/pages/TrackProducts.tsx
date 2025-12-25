import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Package, 
  Award, 
  Star,
  Download,
  Truck,
  Shield,
  QrCode,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { downloadPDFCertificate } from '@/utils/certificateGenerator';

export const TrackProducts = () => {
  const [batchId, setBatchId] = useState('');
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!batchId.trim()) return;
    
    setLoading(true);
    try {
      let data = null;
      let error = null;

      // Check if batchId is a number (integer ID)
      if (!isNaN(Number(batchId))) {
        console.log('Searching by integer ID:', batchId);
        const result = await (supabase as any)
          .from('batches')
          .select('*')
          .eq('id', parseInt(batchId))
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Try searching by blockchain_id or blockchain_batch_id
        console.log('Searching by blockchain ID:', batchId);
        const result = await (supabase as any)
          .from('batches')
          .select('*')
          .or(`blockchain_id.eq.${batchId},blockchain_batch_id.eq.${batchId}`)
          .single();
        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        throw new Error('Batch not found');
      }

      setBatch(data);
      toast({
        title: "Batch found",
        description: "Batch information loaded successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Batch not found",
        description: "No batch found with this ID. Please check and try again.",
      });
      setBatch(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = () => {
    if (batch) {
      try {
        // Transform batch data to match the expected format
        const enhancedBatchData = {
          id: batch.id?.toString() || 'Unknown',
          farmer: batch.farmer || 'Jarir Khan',
          crop: batch.crop_type || 'Unknown Crop',
          variety: batch.variety || 'Unknown Variety',
          harvestQuantity: batch.harvest_quantity?.toString() || '0',
          sowingDate: batch.sowing_date || new Date().toISOString().split('T')[0],
          harvestDate: batch.harvest_date || new Date().toISOString().split('T')[0],
          freshnessDuration: batch.freshness_duration?.toString() || '30',
          grading: batch.grading || 'Standard',
          certification: batch.certification || 'Standard',
          labTest: 'Passed',
          price: batch.price_per_kg || 0,
          ipfsHash: batch.ipfs_hash || batch.group_id || '',
          languageDetected: 'English',
          summary: `Batch of ${batch.crop_type} - ${batch.variety}`,
          callStatus: 'Completed',
          offTopicCount: 0,
          currentOwner: batch.farmer || 'Unknown',
          transactionHistory: [],
          currentQuantity: batch.harvest_quantity || 0,
          originalQuantity: batch.harvest_quantity || 0
        };

        downloadPDFCertificate(enhancedBatchData);
        toast({
          title: "Certificate Downloaded",
          description: "The certificate has been downloaded successfully.",
        });
      } catch (error) {
        console.error('Error downloading certificate:', error);
        toast({
          variant: "destructive",
          title: "Download Failed",
          description: "Failed to generate certificate. Please try again.",
        });
      }
    }
  };

  const handleVerifyCertificate = () => {
    if (batch) {
      // Use the batch ID to navigate to verification
      navigate(`/verification?batchId=${batch.id}`);
    } else {
      toast({
        variant: "destructive",
        title: "No Batch Selected",
        description: "Please select a batch first to verify certificates.",
      });
    }
  };

  const handleViewCertificate = () => {
    const ipfsHash = batch.ipfs_hash || batch.ipfs_certificate_hash;
    if (ipfsHash) {
      window.open(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, '_blank');
    } else {
      toast({
        variant: "destructive",
        title: "No Certificate",
        description: "No certificate available for this batch.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Track Agricultural Products</h1>
          <p className="text-muted-foreground">
            Enter a batch ID to trace the complete journey of your agricultural produce
          </p>
        </div>

        {/* Search Section */}
        <Card className="govt-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="mr-2 h-5 w-5" />
              Product Tracking
            </CardTitle>
            <CardDescription>
              Search by batch ID, QR code, or scan a product code to view complete traceability information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="batch-id" className="text-sm font-medium">
                  Batch ID or QR Code
                </Label>
                <Input
                  id="batch-id"
                  placeholder="Enter Batch ID or QR Code..."
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  className="gradient-primary" 
                  onClick={handleSearch}
                  disabled={loading}
                >
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? 'Searching...' : 'Track Product'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {batch && (
          <Card className="govt-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Product Information</CardTitle>
                  <CardDescription>Batch ID: {batch.id}</CardDescription>
                </div>
                <Badge variant="outline" className="text-success border-success">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Crop Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Package className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Type:</span>
                        <span className="ml-2">{batch.crop_type}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Award className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Variety:</span>
                        <span className="ml-2">{batch.variety}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Star className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Grade:</span>
                        <span className="ml-2">{batch.grading}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Dates & Timeline</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Sowing:</span>
                        <span className="ml-2">{new Date(batch.sowing_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Harvest:</span>
                        <span className="ml-2">{new Date(batch.harvest_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Quality & Quantity</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Package className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Quantity:</span>
                        <span className="ml-2">{batch.harvest_quantity} kg</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Star className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Quality Score:</span>
                        <span className="ml-2">{batch.quality_score}/100</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Status:</span>
                        <Badge variant="outline" className="ml-2">{batch.status}</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Certification</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Award className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-medium">Certification:</span>
                        <span className="ml-2">{batch.certification || 'Standard'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleDownloadCertificate}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Certificate
                        </Button>
                        
                        {(batch.blockchain_id || batch.blockchain_batch_id) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleVerifyCertificate}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Verify
                          </Button>
                        )}
                        
                        {(batch.ipfs_hash || batch.ipfs_certificate_hash) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleViewCertificate}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Certificate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How It Works Section */}
        <Card className="govt-card mt-8">
          <CardHeader>
            <CardTitle>How Product Tracking Works</CardTitle>
            <CardDescription>
              Our blockchain-powered traceability system ensures complete transparency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Scan or Enter ID</h3>
                <p className="text-sm text-muted-foreground">
                  Use the batch ID or scan the QR code on the product packaging
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Verify Authenticity</h3>
                <p className="text-sm text-muted-foreground">
                  Get instant verification of product authenticity and quality certifications
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Track Journey</h3>
                <p className="text-sm text-muted-foreground">
                  View the complete journey from farm to market with full transparency
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};