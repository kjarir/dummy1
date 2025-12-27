import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const DatabaseDebugger = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('🔍 DEBUG: All transactions:', transactionsData, transactionsError);
      setTransactions(transactionsData || []);

      // Fetch all batches
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('🔍 DEBUG: All batches:', batchesData, batchesError);
      setBatches(batchesData || []);

    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Database Debugger</h1>
      
      <div className="mb-4">
        <Button onClick={fetchData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Current User ID: {user?.id}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions ({transactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground">No transactions found</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-2 border rounded text-sm">
                    <p><strong>ID:</strong> {transaction.id}</p>
                    <p><strong>Batch ID:</strong> {transaction.batch_id}</p>
                    <p><strong>Buyer ID:</strong> {transaction.buyer_id}</p>
                    <p><strong>Seller ID:</strong> {transaction.seller_id}</p>
                    <p><strong>Type:</strong> {transaction.transaction_type}</p>
                    <p><strong>Quantity:</strong> {transaction.quantity}</p>
                    <p><strong>Price:</strong> ₹{transaction.price}</p>
                    <p><strong>Created:</strong> {new Date(transaction.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batches */}
        <Card>
          <CardHeader>
            <CardTitle>Batches ({batches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <p className="text-muted-foreground">No batches found</p>
            ) : (
              <div className="space-y-2">
                {batches.map((batch) => (
                  <div key={batch.id} className="p-2 border rounded text-sm">
                    <p><strong>ID:</strong> {batch.id}</p>
                    <p><strong>Farmer ID:</strong> {batch.farmer_id}</p>
                    <p><strong>Current Owner:</strong> {batch.current_owner}</p>
                    <p><strong>Crop Type:</strong> {batch.crop_type}</p>
                    <p><strong>Variety:</strong> {batch.variety}</p>
                    <p><strong>Quantity:</strong> {batch.harvest_quantity} kg</p>
                    <p><strong>Price:</strong> ₹{batch.price_per_kg}/kg</p>
                    <p><strong>Status:</strong> {batch.status}</p>
                    <p><strong>Created:</strong> {new Date(batch.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
