import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { transactionManager } from '@/utils/transactionManager';
import { immutableCertificateGenerator } from '@/utils/immutableCertificateGenerator';
import { TransactionChain, SupplyChainTransaction } from '@/types/transaction';
import { 
  Download, 
  Users, 
  Package, 
  Clock, 
  MapPin, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface ImmutableSupplyChainDisplayProps {
  batchId: string;
}

export const ImmutableSupplyChainDisplay: React.FC<ImmutableSupplyChainDisplayProps> = ({ batchId }) => {
  const [chain, setChain] = useState<TransactionChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadTransactionChain = async () => {
      try {
        setLoading(true);
        const transactionChain = await transactionManager.getTransactionChain(batchId);
        setChain(transactionChain);
      } catch (error) {
        console.error('Error loading transaction chain:', error);
        toast({
          variant: "destructive",
          title: "Error Loading Supply Chain",
          description: "Failed to load transaction history for this batch.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (batchId) {
      loadTransactionChain();
    }
  }, [batchId, toast]);

  const handleDownloadCertificate = async () => {
    try {
      setDownloading(true);
      
      // For the new group-based system, we can't generate certificates from batch ID alone
      // The certificates are stored in Pinata groups
      toast({
        title: "Certificate Download",
        description: "Please use the Group Verification system to download certificates from Pinata groups.",
        variant: "default"
      });
      
      // TODO: Implement group-based certificate download
      console.log('Certificate download requested for batch:', batchId);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to generate certificate. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'HARVEST':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'PURCHASE':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'TRANSFER':
        return <Users className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case 'HARVEST':
        return 'bg-green-100 text-green-800';
      case 'PURCHASE':
        return 'bg-blue-100 text-blue-800';
      case 'TRANSFER':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading supply chain data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chain) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-gray-500">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>No supply chain data found for this batch.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Supply Chain Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{chain.totalQuantity}</div>
              <div className="text-sm text-green-700">Total Quantity (kg)</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{chain.availableQuantity}</div>
              <div className="text-sm text-blue-700">Available (kg)</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{Object.keys(chain.currentOwners).length}</div>
              <div className="text-sm text-purple-700">Current Owners</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Ownership */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Ownership Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(chain.currentOwners).length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No current owners found
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(chain.currentOwners).map(([owner, data]) => (
                <div key={owner} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">{owner}</div>
                      <div className="text-sm text-gray-500">
                        Last transaction: {data.lastTransaction}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg font-semibold">
                    {data.quantity} kg
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chain.transactions.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No transactions found
            </div>
          ) : (
            <div className="space-y-4">
              {chain.transactions.map((transaction, index) => (
                <div key={transaction.transactionId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={getTransactionBadgeColor(transaction.type)}>
                            {transaction.type}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Transaction #{index + 1}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatTimestamp(transaction.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">{transaction.quantity} kg</div>
                      <div className="text-sm text-gray-500">
                        ₹{(transaction.price / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">From:</div>
                      <div className="text-gray-600">{transaction.from}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">To:</div>
                      <div className="text-gray-600">{transaction.to}</div>
                    </div>
                  </div>

                  {transaction.metadata?.location && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{transaction.metadata.location}</span>
                    </div>
                  )}

                  {transaction.metadata?.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-700">{transaction.metadata.notes}</div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      Transaction ID: {transaction.transactionId}
                    </div>
                    <div className="text-xs text-gray-500">
                      IPFS Hash: {transaction.ipfsHash.substring(0, 20)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate Download */}
      <Card>
        <CardHeader>
          <CardTitle>Certificate & Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Download Current Certificate</div>
              <div className="text-sm text-gray-500">
                Generate and download the latest certificate with complete transaction history
              </div>
            </div>
            <Button 
              onClick={handleDownloadCertificate}
              disabled={downloading}
              className="flex items-center gap-2"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? 'Generating...' : 'Download Certificate'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
