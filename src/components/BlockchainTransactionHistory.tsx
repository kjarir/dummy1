import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { blockchainTransactionManager, BlockchainTransaction } from '@/utils/blockchainTransactionManager';
import { ethers } from 'ethers';

interface BlockchainTransactionHistoryProps {
  batchId: string;
  className?: string;
}

export const BlockchainTransactionHistory: React.FC<BlockchainTransactionHistoryProps> = ({
  batchId,
  className = ''
}) => {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactionHistory();
  }, [batchId]);

  const fetchTransactionHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 DEBUG: Fetching blockchain transaction history for batch:', batchId);
      const history = await blockchainTransactionManager.getBatchTransactionHistory(batchId);
      
      console.log('🔍 DEBUG: Blockchain transaction history:', history);
      setTransactions(history);
    } catch (err) {
      console.error('Error fetching blockchain transaction history:', err);
      setError('Failed to fetch transaction history from blockchain');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'HARVEST':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PURCHASE':
        return <ExternalLink className="h-4 w-4 text-blue-600" />;
      case 'TRANSFER':
        return <ExternalLink className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
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

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const openTransactionInExplorer = (txHash: string) => {
    // You can customize this URL based on your blockchain network
    const explorerUrl = `https://megaeth.org/tx/${txHash}`;
    window.open(explorerUrl, '_blank');
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Blockchain Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading transaction history from blockchain...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Blockchain Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button onClick={fetchTransactionHistory} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Blockchain Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No blockchain transactions found for this batch.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Blockchain Transaction History
          </CardTitle>
          <Button onClick={fetchTransactionHistory} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Complete immutable transaction chain recorded on the blockchain
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((tx, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getTransactionIcon(tx.transactionType)}
                  <Badge className={getTransactionColor(tx.transactionType)}>
                    {tx.transactionType}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Block #{tx.blockNumber}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openTransactionInExplorer(tx.transactionHash)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View on Explorer
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">From:</span>
                  <p className="font-mono text-xs">{formatAddress(tx.from)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">To:</span>
                  <p className="font-mono text-xs">{formatAddress(tx.to)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Quantity:</span>
                  <p className="font-semibold">{tx.quantity} kg</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Price:</span>
                  <p className="font-semibold">₹{tx.price}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-muted-foreground">Timestamp:</span>
                  <p className="text-xs">{formatTimestamp(tx.timestamp)}</p>
                </div>
                {tx.ipfsHash && (
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">Certificate:</span>
                    <p className="font-mono text-xs break-all">{tx.ipfsHash}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Transaction Hash:</span>
                  <code className="text-xs font-mono bg-white px-2 py-1 rounded border">
                    {tx.transactionHash}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800">Blockchain Verified</span>
          </div>
          <p className="text-sm text-green-700">
            All transactions are permanently recorded on the blockchain and cannot be modified or deleted.
            This provides complete transparency and traceability for the entire supply chain.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
