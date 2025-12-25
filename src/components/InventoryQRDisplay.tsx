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
  Loader2,
  Package,
  User,
  Calendar
} from 'lucide-react';
import { generateInventoryQR } from '@/utils/qrCodeGenerator';

interface InventoryQRDisplayProps {
  inventoryItem: {
    id: string;
    batchId: string;
    ownerId: string;
    ownerType: 'farmer' | 'distributor' | 'retailer';
    quantity: number;
    purchasePrice: number;
    purchaseDate: string;
    batch?: {
      crop_type: string;
      variety: string;
      harvest_date: string;
    };
  };
  className?: string;
}

export const InventoryQRDisplay: React.FC<InventoryQRDisplayProps> = ({
  inventoryItem,
  className = ""
}) => {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    generateQRCode();
  }, [inventoryItem]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      
      const qrDataURL = await generateInventoryQR({
        inventoryId: inventoryItem.id,
        batchId: inventoryItem.batchId,
        ownerId: inventoryItem.ownerId,
        ownerType: inventoryItem.ownerType,
        quantity: inventoryItem.quantity,
        purchasePrice: inventoryItem.purchasePrice,
        purchaseDate: inventoryItem.purchaseDate
      });
      
      setQrCodeDataURL(qrDataURL);
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
      const link = document.createElement('a');
      link.href = qrCodeDataURL;
      link.download = `inventory-${inventoryItem.id}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "QR code saved successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download QR code",
      });
    }
  };

  const handleCopyLink = () => {
    try {
      const verificationUrl = `${window.location.origin}/verify?inventoryId=${inventoryItem.id}`;
      navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link Copied",
        description: "Verification link copied to clipboard",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Failed to copy link",
      });
    }
  };

  const getOwnerTypeColor = (type: string) => {
    switch (type) {
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
            <span>Generating QR code...</span>
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
          Inventory QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Display */}
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={qrCodeDataURL}
              alt="Inventory QR Code"
              className="w-48 h-48 border rounded-lg"
            />
            <div className="absolute top-2 right-2">
              <Badge className={getOwnerTypeColor(inventoryItem.ownerType)}>
                {inventoryItem.ownerType}
              </Badge>
            </div>
          </div>
        </div>

        {/* QR Code Description */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-blue-600">📦 Inventory QR Code</p>
          <p className="text-xs text-gray-600">
            <strong>Scan to verify inventory item!</strong> Contains complete inventory information.
          </p>
        </div>

        {/* Inventory Details */}
        <div className="space-y-3 pt-4 border-t">
          <h3 className="font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory Information
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium">Crop:</span>
              <p>{inventoryItem.batch?.crop_type} - {inventoryItem.batch?.variety}</p>
            </div>
            <div>
              <span className="font-medium">Quantity:</span>
              <p>{inventoryItem.quantity} kg</p>
            </div>
            <div>
              <span className="font-medium">Purchase Price:</span>
              <p>₹{inventoryItem.purchasePrice.toLocaleString()}</p>
            </div>
            <div>
              <span className="font-medium">Purchase Date:</span>
              <p>{new Date(inventoryItem.purchaseDate).toLocaleDateString()}</p>
            </div>
          </div>
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
            onClick={handleCopyLink}
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
            onClick={() => window.open(`${window.location.origin}/verify?inventoryId=${inventoryItem.id}`, '_blank')}
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
              <span className="font-medium">Inventory ID:</span>
              <p className="font-mono">{String(inventoryItem.id).substring(0, 12)}...</p>
            </div>
            <div>
              <span className="font-medium">Batch ID:</span>
              <p className="font-mono">{String(inventoryItem.batchId).substring(0, 12)}...</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
