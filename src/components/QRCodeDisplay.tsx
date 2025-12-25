import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  QrCode, 
  Download, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  Loader2
} from 'lucide-react';
import { 
  generateQRCodeDataURL, 
  generateBatchVerificationQR, 
  generateCertificateQR,
  generateBatchDataQR,
  downloadQRCode,
  BatchQRData
} from '@/utils/qrCodeUtils';

interface QRCodeDisplayProps {
  batchId: string;
  cropType: string;
  variety: string;
  harvestDate: string;
  farmerId: string;
  blockchainHash?: string;
  ipfsHash?: string;
  groupId?: string;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  batchId,
  cropType,
  variety,
  harvestDate,
  farmerId,
  blockchainHash,
  ipfsHash,
  groupId,
  className = ""
}) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [verificationQR, setVerificationQR] = useState<string>('');
  const [certificateQR, setCertificateQR] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'verification'>('verification');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    generateQRCodes();
  }, [batchId, cropType, variety, harvestDate, farmerId, blockchainHash, ipfsHash]);

  const generateQRCodes = async () => {
    try {
      setLoading(true);

      // Generate batch data QR code
      const batchData: BatchQRData = {
        batchId,
        cropType,
        variety,
        harvestDate,
        farmerId,
        blockchainHash,
        ipfsHash,
        verificationUrl: `${window.location.origin}/verify?batchId=${batchId}`
      };

      // Generate certificate QR code that opens the IPFS certificate directly
      console.log('🔍 QR Code Debug:', { 
        ipfsHash, 
        groupId, 
        batchId,
        hasIpfsHash: !!ipfsHash,
        ipfsHashLength: ipfsHash?.length || 0
      });
      
      // Always try to use IPFS hash first, but provide better fallback
      let certificateUrl = '';
      
      if (ipfsHash && ipfsHash.trim() !== '') {
        certificateUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        console.log('✅ Using IPFS certificate URL:', certificateUrl);
      } else {
        // Fallback to verification URL if no IPFS hash
        certificateUrl = groupId 
          ? `${window.location.origin}/verify?batchId=${batchId}&groupId=${groupId}`
          : `${window.location.origin}/verify?batchId=${batchId}`;
        console.log('⚠️ No IPFS hash found, using verification URL:', certificateUrl);
      }
      
      const verificationQRCode = await generateQRCodeDataURL(certificateUrl);

      setVerificationQR(verificationQRCode);
    } catch (error) {
      console.error('Error generating QR codes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate QR codes",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (type: 'batch' | 'verification' | 'certificate') => {
    try {
      let dataURL = '';
      let filename = '';

      switch (type) {
        case 'batch':
          dataURL = qrCodeDataURL;
          filename = `batch-${batchId}-qr.png`;
          break;
        case 'verification':
          dataURL = verificationQR;
          filename = `batch-${batchId}-verification-qr.png`;
          break;
        case 'certificate':
          dataURL = certificateQR;
          filename = `batch-${batchId}-certificate-qr.png`;
          break;
      }

      if (dataURL) {
        downloadQRCode(dataURL, filename);
        toast({
          title: "Download Started",
          description: `QR code saved as ${filename}`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download QR code",
      });
    }
  };

  const handleCopyLink = (type: 'verification' | 'certificate') => {
    try {
      let url = '';
      
      // Always try to use certificate URL (IPFS link) for direct certificate access
      if (ipfsHash && ipfsHash.trim() !== '') {
        url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      } else {
        // Fallback to verification URL if no IPFS hash
        url = groupId 
          ? `${window.location.origin}/verify?batchId=${batchId}&groupId=${groupId}`
          : `${window.location.origin}/verify?batchId=${batchId}`;
      }

      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link Copied",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Failed to copy link",
      });
    }
  };

  const getCurrentQRCode = () => {
    switch (activeTab) {
      case 'batch':
        return qrCodeDataURL;
      case 'verification':
        return verificationQR;
      case 'certificate':
        return certificateQR;
      default:
        return qrCodeDataURL;
    }
  };

  const getCurrentFilename = () => {
    switch (activeTab) {
      case 'batch':
        return `batch-${batchId}-qr.png`;
      case 'verification':
        return `batch-${batchId}-verification-qr.png`;
      case 'certificate':
        return `batch-${batchId}-certificate-qr.png`;
      default:
        return `batch-${batchId}-qr.png`;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Generating QR codes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Codes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* QR Code Display */}
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={verificationQR}
              alt="Verification QR Code"
              className="w-48 h-48 border rounded-lg"
            />
          </div>
        </div>

        {/* QR Code Description */}
        <div className="text-center space-y-2">
          <div>
            <p className="text-xs text-gray-600">
              <strong>Scan to view certificate!</strong> Direct link to the IPFS certificate document.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleDownload('verification')}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          
          <Button
            onClick={() => handleCopyLink('verification')}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          
          <Button
            onClick={() => {
              let certificateUrl = '';
              
              if (ipfsHash && ipfsHash.trim() !== '') {
                certificateUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
              } else {
                certificateUrl = groupId 
                  ? `${window.location.origin}/verify?batchId=${batchId}&groupId=${groupId}`
                  : `${window.location.origin}/verify?batchId=${batchId}`;
              }
              
              window.open(certificateUrl, '_blank');
            }}
            variant="outline"
            size="sm"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {/* Batch Info */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">Batch ID:</span>
              <p className="font-mono">{String(batchId).substring(0, 12)}...</p>
            </div>
            <div>
              <span className="font-medium">Crop:</span>
              <p>{cropType} - {variety}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
