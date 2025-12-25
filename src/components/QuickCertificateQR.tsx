import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  QrCode, 
  Download, 
  ExternalLink, 
  Loader2,
  FileText
} from 'lucide-react';
import { generateCertificateQR, downloadQRCode } from '@/utils/qrCodeUtils';

interface QuickCertificateQRProps {
  ipfsHash: string;
  batchId: string;
  cropType: string;
  variety: string;
  className?: string;
}

export const QuickCertificateQR: React.FC<QuickCertificateQRProps> = ({
  ipfsHash,
  batchId,
  cropType,
  variety,
  className = ""
}) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generateQRCode();
  }, [ipfsHash]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const qrCode = await generateCertificateQR(ipfsHash);
      setQrCodeDataURL(qrCode);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate QR code",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    try {
      downloadQRCode(qrCodeDataURL, `certificate-${batchId}-${cropType}-${variety}.png`);
      toast({
        title: "Download Started",
        description: "Certificate QR code downloaded",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download QR code",
      });
    }
  };

  const handleOpenCertificate = () => {
    const certificateUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    window.open(certificateUrl, '_blank');
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm">Generating QR code...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-green-600" />
          Certificate QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Display */}
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={qrCodeDataURL}
              alt="Certificate QR Code"
              className="w-32 h-32 border rounded-lg"
            />
            <div className="absolute top-1 right-1">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                📄 Cert
              </Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="text-center">
          <p className="text-sm font-medium text-green-600">Scan to View Certificate</p>
          <p className="text-xs text-gray-600">
            Opens PDF certificate directly in browser
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handleOpenCertificate}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open
          </Button>
        </div>

        {/* Batch Info */}
        <div className="pt-2 border-t text-center">
          <p className="text-xs text-gray-500">
            {cropType} - {variety}
          </p>
          <p className="text-xs font-mono text-gray-400">
            {String(batchId).substring(0, 8)}...
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

