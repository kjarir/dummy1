import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileText,
  ExternalLink,
  Copy,
  Download,
  Package,
  Calendar,
  User,
  MapPin,
  Upload,
  QrCode
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getIPFSFileUrl } from '@/utils/ipfs';

interface CertificateData {
  id: string;
  fileName: string;
  ipfsHash: string;
  fileSize: number;
  transactionType: string;
  batchId: string;
  metadata: any;
  createdAt: string;
}

interface BatchData {
  id: string;
  crop_type: string;
  variety: string;
  farmer: string;
  harvest_quantity: string;
  harvest_date: string;
  grading: string;
  certification: string;
  group_id: string;
  created_at: string;
}

export const UnifiedVerificationSystem: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [batchData, setBatchData] = useState<BatchData | null>(null);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();



  // Handle URL parameters
  useEffect(() => {
    const batchId = searchParams.get('batchId');
    const groupId = searchParams.get('groupId');
    
    if (batchId) {
      setInputValue(batchId);
    } else if (groupId) {
      setInputValue(groupId);
    }
  }, [searchParams]);


  const handleVerify = async () => {
    if (!inputValue.trim()) {
      toast({
        variant: "destructive",
        title: "Input required",
        description: "Please enter a Group ID or Batch ID to verify.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setBatchData(null);
    setCertificates([]);

    try {
      let groupId: string | null = null;
      let batchInfo: BatchData | null = null;

      // Check if input is a number (likely batch ID)
      if (!isNaN(Number(inputValue))) {
        console.log('Treating as batch ID:', inputValue);
        
        // Get batch data from database using integer ID
        const { data: batch, error: batchError } = await supabase
          .from('batches')
          .select('*')
          .eq('id', parseInt(inputValue))
          .single();

        if (batchError || !batch) {
          throw new Error(`Batch not found with ID: ${inputValue}`);
        }

        batchInfo = batch;
        // Try to get group_id, if not available, use a fallback
        groupId = batch.group_id || `batch_${batch.id}`;
        
        console.log('Found batch:', batch);
        console.log('Using group ID:', groupId);
      } else {
        // Treat as Group ID
        console.log('Treating as Group ID:', inputValue);
        groupId = inputValue;
        
        // Try to find batch data for this group (but don't fail if not found)
        try {
          const { data: batch, error: batchError } = await supabase
            .from('batches')
            .select('*')
            .eq('group_id', groupId)
            .single();

          if (!batchError && batch) {
            batchInfo = batch;
            console.log('Found batch for group:', batch);
          } else {
            console.log('No batch found for group ID, will show certificates only');
          }
        } catch (error) {
          console.log('Error finding batch for group ID, will show certificates only:', error);
        }
      }

      if (!groupId) {
        throw new Error('No Group ID found for verification.');
      }

      // Use the updated SingleStepGroupManager to get certificates
      console.log('Fetching certificates using SingleStepGroupManager...');
      const { singleStepGroupManager } = await import('@/utils/singleStepGroupManager');
      const certificates = await singleStepGroupManager.getGroupCertificates(groupId);
      
      console.log(`Found ${certificates.length} certificates for group ${groupId}`);
      
      // Convert certificates to the expected format
      const groupFiles = certificates.map((cert: any) => ({
        id: cert.ipfs_pin_hash,
        file_name: cert.metadata?.name || cert.ipfs_pin_hash,
        ipfs_hash: cert.ipfs_pin_hash,
        file_size: cert.size || 0,
        transaction_type: cert.metadata?.keyvalues?.transactionType || 'HARVEST',
        batch_id: cert.metadata?.keyvalues?.batchId || '',
        metadata: cert.metadata?.keyvalues || {},
        created_at: cert.date_pinned
      }));
      
      const hasGroupFiles = groupFiles.length > 0;

      // If no group files found, try to create mock certificates from batch data
      if (!hasGroupFiles || groupFiles.length === 0) {
        console.log('No group files found, creating mock certificates from batch data');
        
        if (batchInfo) {
          // Create a mock certificate from batch data
          const mockCertificate: CertificateData = {
            id: `mock_${batchInfo.id}`,
            fileName: `harvest_certificate_${batchInfo.id}.pdf`,
            ipfsHash: batchInfo.ipfs_hash || batchInfo.group_id || '',
            fileSize: 0,
            transactionType: 'HARVEST',
            batchId: batchInfo.id.toString(),
            metadata: {
              farmer: batchInfo.farmer,
              crop: batchInfo.crop_type,
              variety: batchInfo.variety,
              harvestQuantity: batchInfo.harvest_quantity,
              harvestDate: batchInfo.harvest_date,
              grading: batchInfo.grading,
              certification: batchInfo.certification
            },
            createdAt: batchInfo.created_at
          };
          
          groupFiles = [mockCertificate];
        }
      }

      // Convert group files to certificate format
      console.log('Converting group files to certificates:', groupFiles);
      const certificateList: CertificateData[] = groupFiles.map((file: any, index: number) => {
        const certificate = {
          id: file.id,
          fileName: file.file_name || file.fileName,
          ipfsHash: file.ipfs_hash || file.ipfsHash,
          fileSize: file.file_size || file.fileSize || 0,
          transactionType: file.transaction_type || file.transactionType || 'HARVEST',
          batchId: file.batch_id || file.batchId || '',
          metadata: file.metadata || {},
          createdAt: file.created_at || file.createdAt
        };
        console.log(`Certificate ${index + 1}:`, certificate);
        return certificate;
      });
      
      console.log(`Total certificates created: ${certificateList.length}`);

      setBatchData(batchInfo);
      setCertificates(certificateList);

      toast({
        title: "Verification successful!",
        description: `Found ${certificateList.length} certificate(s) for Group ID: ${groupId}`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard.",
    });
  };

  const openIPFSLink = (ipfsHash: string) => {
    try {
      if (!ipfsHash || ipfsHash.length < 10) {
        toast({
          variant: "destructive",
          title: "Invalid IPFS Hash",
          description: "IPFS hash is too short or empty.",
        });
        return;
      }
      
      const url = getIPFSFileUrl(ipfsHash);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid IPFS Hash",
        description: "Cannot open IPFS link - hash appears to be malformed.",
      });
    }
  };

  const downloadCertificate = async (certificate: CertificateData) => {
    try {
      const url = getIPFSFileUrl(certificate.ipfsHash);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch certificate: ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = certificate.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Certificate Downloaded",
        description: `${certificate.fileName} has been downloaded successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download certificate. Please try again.",
      });
    }
  };

  const handleQRUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, JPEG, GIF).",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Please select an image smaller than 10MB.",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Import QR scanner dynamically
      const QrScanner = (await import('qr-scanner')).default;
      
      // Create a temporary URL for the file
      const imageUrl = URL.createObjectURL(file);
      
      // Scan the QR code
      const result = await QrScanner.scanImage(imageUrl);
      
      // Clean up the temporary URL
      URL.revokeObjectURL(imageUrl);
      
      if (result) {
        console.log('QR Code detected:', result);
        
        // Set the detected data in the input field
        setInputValue(result);
        
        // Automatically trigger verification
        await handleVerify();
        
        toast({
          title: "QR Code Detected",
          description: "QR code data extracted and verification started.",
        });
      } else {
        throw new Error('No QR code found in the image');
      }
    } catch (error) {
      console.error('QR scan error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan QR code';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "QR Scan Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Certificate Verification</h1>
        <p className="text-muted-foreground">
          Enter a Group ID or Batch ID to view all certificates in the group
        </p>
      </div>

      {/* Verification Input */}
      <Card>
        <CardHeader>
          <CardTitle>Verify Certificates</CardTitle>
          <CardDescription>
            Enter either a Group ID or Batch ID to fetch all certificates from IPFS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-input">
              Group ID or Batch ID
            </Label>
            <div className="flex space-x-2">
              <Input
                id="verification-input"
                placeholder="Enter Group ID (e.g., farmer_crop_variety) or Batch ID (e.g., 123)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
              />
              <Button onClick={handleVerify} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Verify
              </Button>
            </div>
          </div>
          
        </CardContent>
      </Card>

      {/* QR Code Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Upload QR Code
          </CardTitle>
          <CardDescription>
            Upload a QR code image to automatically extract and verify the information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qr-upload">
              Select QR Code Image
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="qr-upload"
                type="file"
                accept="image/*"
                onChange={handleQRUpload}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('qr-upload')?.click()}
                disabled={loading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: PNG, JPG, JPEG, GIF
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Batch Information */}
      {batchData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Batch Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Farmer</Label>
                  <p className="text-sm">{batchData.farmer}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Crop</Label>
                  <p className="text-sm">{batchData.crop_type} - {batchData.variety}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Harvest Date</Label>
                  <p className="text-sm">{new Date(batchData.harvest_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Quantity</Label>
                  <p className="text-sm">{batchData.harvest_quantity} kg</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{batchData.grading}</Badge>
                <div>
                  <Label className="text-sm font-medium">Grading</Label>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Group ID</Label>
                  <p className="text-sm font-mono">{batchData.group_id || 'Not assigned'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificates List */}
      {certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Certificates ({certificates.length})</span>
            </CardTitle>
            <CardDescription>
              All certificates associated with this Group ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certificates.map((certificate, index) => (
                <div key={certificate.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge variant={certificate.transactionType === 'HARVEST' ? 'default' : 'secondary'}>
                        {certificate.transactionType}
                      </Badge>
                      <h3 className="font-medium">{certificate.fileName}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(certificate.ipfsHash)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openIPFSLink(certificate.ipfsHash)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadCertificate(certificate)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">IPFS Hash</Label>
                      <p className="font-mono text-xs break-all">{certificate.ipfsHash}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">File Size</Label>
                      <p className="text-xs">{(certificate.fileSize / 1024).toFixed(1)} KB</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Created</Label>
                      <p className="text-xs">{new Date(certificate.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {certificate.metadata && Object.keys(certificate.metadata).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-xs font-medium text-muted-foreground">Metadata</Label>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {Object.entries(certificate.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="font-medium">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold mb-2">Group-Based Verification</h3>
            <p className="text-sm text-muted-foreground">
              All certificates in a group are fetched and displayed together
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold mb-2">IPFS Storage</h3>
            <p className="text-sm text-muted-foreground">
              Certificates stored on decentralized IPFS network
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold mb-2">Complete Chain</h3>
            <p className="text-sm text-muted-foreground">
              View the complete certificate chain for any batch
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
