import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  Download,
  QrCode,
  Package,
  User,
  Calendar,
  MapPin,
  Hash,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { parseQRCodeData } from '@/utils/qrCodeUtils';

interface VerificationResult {
  isValid: boolean;
  type: 'batch' | 'certificate' | 'transaction' | 'verification';
  data: any;
  stage: 'farmer' | 'distributor' | 'retailer';
  message: string;
  details?: any;
}

interface ComprehensiveVerificationSystemProps {
  qrData?: string;
  onClose?: () => void;
  className?: string;
}

export const ComprehensiveVerificationSystem: React.FC<ComprehensiveVerificationSystemProps> = ({
  qrData,
  onClose,
  className = ""
}) => {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (qrData) {
      verifyQRCode(qrData);
    }
  }, [qrData]);

  const verifyQRCode = async (data: string) => {
    try {
      setLoading(true);
      setVerificationResult(null);
      setBatchDetails(null);
      setTransactionHistory([]);

      // Try to parse as JSON first (structured QR data)
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        // If not JSON, treat as URL or simple string
        parsedData = { type: 'url', data: data };
      }

      let result: VerificationResult;

      if (parsedData.type === 'batch') {
        result = await verifyBatchQR(parsedData);
      } else if (parsedData.type === 'certificate') {
        result = await verifyCertificateQR(parsedData);
      } else if (parsedData.type === 'transaction') {
        result = await verifyTransactionQR(parsedData);
      } else if (parsedData.type === 'verification') {
        result = await verifyVerificationQR(parsedData);
      } else if (data.includes('verify?batchId=')) {
        // Handle verification URLs
        const batchId = extractBatchIdFromUrl(data);
        if (batchId) {
          result = await verifyBatchById(batchId);
        } else {
          result = {
            isValid: false,
            type: 'verification',
            data: data,
            stage: 'farmer',
            message: 'Invalid verification URL format'
          };
        }
      } else if (data.includes('gateway.pinata.cloud/ipfs/')) {
        // Handle IPFS certificate URLs
        result = await verifyIPFSCertificate(data);
      } else {
        result = {
          isValid: false,
          type: 'verification',
          data: data,
          stage: 'farmer',
          message: 'Unknown QR code format'
        };
      }

      setVerificationResult(result);

      // If it's a valid batch, fetch additional details
      if (result.isValid && (result.type === 'batch' || result.type === 'verification')) {
        await fetchBatchDetails(result.data.batchId || result.data.id);
      }

    } catch (error) {
      console.error('Error verifying QR code:', error);
      setVerificationResult({
        isValid: false,
        type: 'verification',
        data: data,
        stage: 'farmer',
        message: 'Error during verification: ' + (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyBatchQR = async (data: any): Promise<VerificationResult> => {
    try {
      // Verify batch exists in database
      const { data: batch, error } = await supabase
        .from('batches')
        .select('*, profiles(*)')
        .eq('id', data.batchId)
        .single();

      if (error || !batch) {
        return {
          isValid: false,
          type: 'batch',
          data: data,
          stage: 'farmer',
          message: 'Batch not found in database'
        };
      }

      // Determine stage based on current owner
      let stage: 'farmer' | 'distributor' | 'retailer' = 'farmer';
      if (batch.current_owner !== batch.farmer_id) {
        // Check if owner is distributor or retailer
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', batch.current_owner)
          .single();
        
        if (ownerProfile?.full_name?.toLowerCase().includes('distributor')) {
          stage = 'distributor';
        } else if (ownerProfile?.full_name?.toLowerCase().includes('retailer')) {
          stage = 'retailer';
        }
      }

      return {
        isValid: true,
        type: 'batch',
        data: { ...data, batch },
        stage: stage,
        message: `Valid batch found - currently at ${stage} stage`
      };
    } catch (error) {
      return {
        isValid: false,
        type: 'batch',
        data: data,
        stage: 'farmer',
        message: 'Error verifying batch: ' + (error as Error).message
      };
    }
  };

  const verifyCertificateQR = async (data: any): Promise<VerificationResult> => {
    try {
      // Verify certificate exists and is accessible
      if (data.ipfsHash) {
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${data.ipfsHash}`, {
          method: 'HEAD'
        });
        
        if (response.ok) {
          return {
            isValid: true,
            type: 'certificate',
            data: data,
            stage: 'farmer',
            message: 'Certificate is valid and accessible'
          };
        }
      }

      return {
        isValid: false,
        type: 'certificate',
        data: data,
        stage: 'farmer',
        message: 'Certificate not accessible or invalid'
      };
    } catch (error) {
      return {
        isValid: false,
        type: 'certificate',
        data: data,
        stage: 'farmer',
        message: 'Error verifying certificate: ' + (error as Error).message
      };
    }
  };

  const verifyTransactionQR = async (data: any): Promise<VerificationResult> => {
    try {
      // Verify transaction exists in database
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', data.id)
        .single();

      if (error || !transaction) {
        return {
          isValid: false,
          type: 'transaction',
          data: data,
          stage: 'distributor',
          message: 'Transaction not found in database'
        };
      }

      return {
        isValid: true,
        type: 'transaction',
        data: { ...data, transaction },
        stage: data.metadata?.stage === 'retailer_purchase' ? 'retailer' : 'distributor',
        message: 'Valid transaction found'
      };
    } catch (error) {
      return {
        isValid: false,
        type: 'transaction',
        data: data,
        stage: 'distributor',
        message: 'Error verifying transaction: ' + (error as Error).message
      };
    }
  };

  const verifyVerificationQR = async (data: any): Promise<VerificationResult> => {
    return {
      isValid: true,
      type: 'verification',
      data: data,
      stage: data.metadata?.stage || 'farmer',
      message: 'Verification QR code is valid'
    };
  };

  const verifyBatchById = async (batchId: string): Promise<VerificationResult> => {
    try {
      const { data: batch, error } = await supabase
        .from('batches')
        .select('*, profiles(*)')
        .eq('id', batchId)
        .single();

      if (error || !batch) {
        return {
          isValid: false,
          type: 'verification',
          data: { batchId },
          stage: 'farmer',
          message: 'Batch not found'
        };
      }

      return {
        isValid: true,
        type: 'verification',
        data: { batchId, batch },
        stage: 'farmer',
        message: 'Batch verification successful'
      };
    } catch (error) {
      return {
        isValid: false,
        type: 'verification',
        data: { batchId },
        stage: 'farmer',
        message: 'Error verifying batch: ' + (error as Error).message
      };
    }
  };

  const verifyIPFSCertificate = async (url: string): Promise<VerificationResult> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      
      if (response.ok) {
        return {
          isValid: true,
          type: 'certificate',
          data: { url },
          stage: 'farmer',
          message: 'Certificate is accessible'
        };
      }

      return {
        isValid: false,
        type: 'certificate',
        data: { url },
        stage: 'farmer',
        message: 'Certificate not accessible'
      };
    } catch (error) {
      return {
        isValid: false,
        type: 'certificate',
        data: { url },
        stage: 'farmer',
        message: 'Error accessing certificate: ' + (error as Error).message
      };
    }
  };

  const extractBatchIdFromUrl = (url: string): string | null => {
    const match = url.match(/batchId=([^&]+)/);
    return match ? match[1] : null;
  };

  const fetchBatchDetails = async (batchId: string) => {
    try {
      // Fetch batch details
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*, profiles(*)')
        .eq('id', batchId)
        .single();

      if (!batchError && batch) {
        setBatchDetails(batch);
      }

      // Fetch transaction history
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

      if (!transError && transactions) {
        setTransactionHistory(transactions);
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
    }
  };

  const getStatusIcon = (isValid: boolean) => {
    if (isValid) {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else {
      return <XCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'farmer':
        return 'bg-green-100 text-green-800';
      case 'distributor':
        return 'bg-blue-100 text-blue-800';
      case 'retailer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Verifying QR code...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!verificationResult) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No QR code data to verify</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Verification Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verification Status */}
        <div className="flex items-center gap-3 p-4 rounded-lg border">
          {getStatusIcon(verificationResult.isValid)}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={getStatusColor(verificationResult.isValid)}>
                {verificationResult.isValid ? 'Valid' : 'Invalid'}
              </Badge>
              <Badge className={getStageColor(verificationResult.stage)}>
                {verificationResult.stage}
              </Badge>
              <Badge variant="outline">
                {verificationResult.type}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{verificationResult.message}</p>
          </div>
        </div>

        {/* Batch Details */}
        {batchDetails && (
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Batch Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">Crop:</span>
                <p>{batchDetails.crop_type} - {batchDetails.variety}</p>
              </div>
              <div>
                <span className="font-medium">Harvest Date:</span>
                <p>{new Date(batchDetails.harvest_date).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-medium">Farmer:</span>
                <p>{batchDetails.profiles?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <span className="font-medium">Location:</span>
                <p>{batchDetails.profiles?.farm_location || 'Not specified'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History */}
        {transactionHistory.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Transaction History
            </h3>
            <div className="space-y-2">
              {transactionHistory.map((transaction, index) => (
                <div key={index} className="p-3 border rounded-lg text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{transaction.transaction_type}</p>
                      <p className="text-gray-600">
                        {transaction.quantity} kg - ₹{transaction.price}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          {verificationResult.data.certificateUrl && (
            <Button
              onClick={() => window.open(verificationResult.data.certificateUrl, '_blank')}
              variant="outline"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Certificate
            </Button>
          )}
          
          {verificationResult.data.verificationUrl && (
            <Button
              onClick={() => window.open(verificationResult.data.verificationUrl, '_blank')}
              variant="outline"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Verify Online
            </Button>
          )}
          
          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm" className="ml-auto">
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};