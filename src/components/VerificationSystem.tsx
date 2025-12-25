import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { transactionManager } from '@/utils/transactionManager';
import { immutableCertificateGenerator } from '@/utils/immutableCertificateGenerator';
import { TransactionChain, SupplyChainTransaction } from '@/types/transaction';
import { 
  Search, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Package,
  Users,
  Clock,
  MapPin,
  DollarSign
} from 'lucide-react';

export const VerificationSystem: React.FC = () => {
  const [searchType, setSearchType] = useState<'batchId' | 'ipfsHash'>('batchId');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [chain, setChain] = useState<TransactionChain | null>(null);
  const [transaction, setTransaction] = useState<SupplyChainTransaction | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast({
        variant: "destructive",
        title: "Search Value Required",
        description: "Please enter a batch ID or IPFS hash to search.",
      });
      return;
    }

    setLoading(true);
    setChain(null);
    setTransaction(null);

    try {
      if (searchType === 'batchId') {
        const transactionChain = await transactionManager.getTransactionChain(searchValue);
        setChain(transactionChain);
        
        toast({
          title: "Batch Found",
          description: `Found ${transactionChain.transactions.length} transactions for batch ${searchValue}.`,
        });
      } else {
        const foundTransaction = await transactionManager.getTransactionByIPFSHash(searchValue);
        if (foundTransaction) {
          setTransaction(foundTransaction);
          const transactionChain = await transactionManager.getTransactionChain(foundTransaction.batchId);
          setChain(transactionChain);
          
          toast({
            title: "Transaction Found",
            description: `Found transaction ${foundTransaction.transactionId} for batch ${foundTransaction.batchId}.`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Transaction Not Found",
            description: "No transaction found with the provided IPFS hash.",
          });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!chain) return;

    try {
      setDownloading(true);
      const certificateBlob = await immutableCertificateGenerator.generateCertificateFromBatchId(chain.batchId);
      
      // Create download link
      const url = URL.createObjectURL(certificateBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate_${chain.batchId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Certificate Downloaded",
        description: "Your certificate has been downloaded successfully.",
      });
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Supply Chain Verification</h1>
        <p className="text-gray-600">
          Verify agricultural produce by searching with Batch ID or IPFS Hash
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Verify
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={searchType === 'batchId' ? 'default' : 'outline'}
              onClick={() => setSearchType('batchId')}
              className="flex-1"
            >
              Batch ID
            </Button>
            <Button
              variant={searchType === 'ipfsHash' ? 'default' : 'outline'}
              onClick={() => setSearchType('ipfsHash')}
              className="flex-1"
            >
              IPFS Hash
            </Button>
          </div>

          <div>
            <Label htmlFor="searchValue">
              {searchType === 'batchId' ? 'Batch ID' : 'IPFS Hash'}
            </Label>
            <Input
              id="searchValue"
              placeholder={
                searchType === 'batchId' 
                  ? 'Enter batch ID (e.g., 12345)' 
                  : 'Enter IPFS hash (e.g., QmXxXxXx...)'
              }
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button 
            onClick={handleSearch}
            disabled={loading || !searchValue.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search & Verify
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {chain && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Verification Results
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
                  <div className="text-2xl font-bold text-purple-600">{chain.transactions.length}</div>
                  <div className="text-sm text-purple-700">Total Transactions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Ownership */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Current Ownership
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
                Complete Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chain.transactions.map((tx, index) => (
                  <div key={tx.transactionId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={getTransactionBadgeColor(tx.type)}>
                              {tx.type}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              Transaction #{index + 1}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {formatTimestamp(tx.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">{tx.quantity} kg</div>
                        <div className="text-sm text-gray-500">
                          ₹{(tx.price / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-700">From:</div>
                        <div className="text-gray-600">{tx.from}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-700">To:</div>
                        <div className="text-gray-600">{tx.to}</div>
                      </div>
                    </div>

                    {tx.metadata?.location && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{tx.metadata.location}</span>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-gray-500">
                        Transaction ID: {tx.transactionId}
                      </div>
                      <div className="text-xs text-gray-500">
                        IPFS Hash: {tx.ipfsHash.substring(0, 20)}...
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certificate Download */}
          <Card>
            <CardHeader>
              <CardTitle>Download Certificate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Generate Current Certificate</div>
                  <div className="text-sm text-gray-500">
                    Download the latest certificate with complete transaction history
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
      )}

      {/* No Results */}
      {!loading && !chain && searchValue && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-gray-500">
              <AlertCircle className="h-6 w-6 mr-2" />
              <span>No results found for the provided {searchType === 'batchId' ? 'Batch ID' : 'IPFS Hash'}.</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
