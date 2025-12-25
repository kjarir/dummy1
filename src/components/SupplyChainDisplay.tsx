import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { getSupplyChainHistory, getEnhancedBatchData, generateCurrentCertificate } from '@/utils/supplyChainTracker';
import { SupplyChainTransaction } from '@/utils/certificateGenerator';
import { 
  History, 
  Download, 
  User, 
  MapPin, 
  Calendar, 
  Package, 
  DollarSign,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface SupplyChainDisplayProps {
  batchId: string;
  batch: any;
}

export const SupplyChainDisplay: React.FC<SupplyChainDisplayProps> = ({ batchId, batch }) => {
  const [transactions, setTransactions] = useState<SupplyChainTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSupplyChainHistory();
  }, [batchId]);

  const loadSupplyChainHistory = async () => {
    setLoading(true);
    try {
      const history = await getSupplyChainHistory(batchId);
      setTransactions(history);
    } catch (error) {
      console.error('Error loading supply chain history:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load supply chain history",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    setDownloading(true);
    try {
      const certificateBlob = await generateCurrentCertificate(batchId);
      if (certificateBlob) {
        // Create download link
        const url = URL.createObjectURL(certificateBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `AgriTrace_Certificate_${batchId}_Complete.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Certificate Downloaded",
          description: "Complete supply chain certificate has been downloaded",
        });
      } else {
        throw new Error('Failed to generate certificate');
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download the complete certificate",
      });
    } finally {
      setDownloading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'harvest':
        return '🌾';
      case 'purchase':
        return '🛒';
      case 'processing':
        return '🏭';
      case 'retail':
        return '🏪';
      case 'transfer':
        return '🔄';
      default:
        return '📦';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'harvest':
        return 'bg-green-100 text-green-800';
      case 'purchase':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'retail':
        return 'bg-purple-100 text-purple-800';
      case 'transfer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Supply Chain History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading supply chain history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Supply Chain History
          </CardTitle>
          <Button 
            onClick={handleDownloadCertificate}
            disabled={downloading}
            size="sm"
            variant="outline"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Complete Certificate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No supply chain transactions recorded yet.</p>
            <p className="text-sm">Transactions will appear here as the product moves through the supply chain.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction, index) => (
              <div key={transaction.id} className="relative">
                {/* Connection line */}
                {index < transactions.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
                )}
                
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  {/* Transaction icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  {/* Transaction details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getTransactionColor(transaction.type)}>
                        {transaction.type.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(transaction.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">From:</span>
                        <span>{transaction.from}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">To:</span>
                        <span>{transaction.to}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Quantity:</span>
                        <span>{transaction.quantity} kg</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Price:</span>
                        <span>₹{(transaction.price / 100).toFixed(2)}</span>
                      </div>
                      
                      {transaction.location && (
                        <div className="flex items-center gap-2 md:col-span-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">Location:</span>
                          <span>{transaction.location}</span>
                        </div>
                      )}
                      
                      {transaction.notes && (
                        <div className="md:col-span-2 text-gray-600 italic">
                          {transaction.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Separator className="my-6" />
        
        {/* Summary */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Supply Chain Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Total Transactions:</span>
              <p className="text-blue-900">{transactions.length}</p>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Original Quantity:</span>
              <p className="text-blue-900">{batch.harvest_quantity || 0} kg</p>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Current Quantity:</span>
              <p className="text-blue-900">
                {transactions.length > 0 
                  ? Math.max(0, (batch.harvest_quantity || 0) - transactions
                      .filter(tx => tx.type === 'purchase' || tx.type === 'transfer')
                      .reduce((sum, tx) => sum + tx.quantity, 0)) 
                  : batch.harvest_quantity || 0} kg
              </p>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Current Owner:</span>
              <p className="text-blue-900">
                {transactions.length > 0 
                  ? transactions[transactions.length - 1]?.to || batch.farmer || 'Unknown'
                  : batch.farmer || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
