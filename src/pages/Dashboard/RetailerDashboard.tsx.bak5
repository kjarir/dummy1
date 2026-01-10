import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  TrendingUp, 
  Users, 
  Store,
  Award,
  Eye,
  ShoppingCart,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RetailerDashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalRevenue: 0,
    activeInventory: 0,
    customerSatisfaction: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get retailer's purchases from transactions table (simplified query)
      const { data: purchases } = await supabase
        .from('transactions')
        .select('*')
        .eq('buyer_id', user?.id)
        .eq('transaction_type', 'PURCHASE')
        .order('created_at', { ascending: false });

      // Get batch details separately for each purchase
      let purchasesWithDetails = [];
      if (purchases && purchases.length > 0) {
        const batchIds = purchases.map(p => p.batch_id);
        const { data: batches } = await supabase
          .from('batches')
          .select('*')
          .in('id', batchIds);
        
        // Merge transaction and batch data
        purchasesWithDetails = purchases.map(purchase => {
          const batch = batches?.find(b => b.id === purchase.batch_id);
          return {
            ...purchase,
            batch: batch
          };
        });
      }

      // Get retailer's inventory (batches they own)
      const { data: inventory } = await supabase
        .from('batches')
        .select('*')
        .eq('current_owner', user?.id)
        .eq('status', 'available');

      setStats({
        totalPurchases: purchasesWithDetails?.length || 0,
        totalRevenue: purchasesWithDetails?.reduce((sum, transaction) => sum + transaction.price, 0) || 0,
        activeInventory: inventory?.length || 0,
        customerSatisfaction: 95 // Mock data for now
      });

      setRecentTransactions(purchasesWithDetails?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching retailer dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {profile?.full_name || 'Retailer'}!
        </h1>
        <p className="text-gray-600">Manage your retail business and serve your customers with fresh produce.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPurchases}</div>
            <p className="text-xs text-muted-foreground">Batches purchased</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeInventory}</div>
            <p className="text-xs text-muted-foreground">Available batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customerSatisfaction}%</div>
            <p className="text-xs text-muted-foreground">Quality rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Buy from Distributors
            </CardTitle>
            <CardDescription>
              Purchase quality produce from trusted distributors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/retailer-marketplace">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Browse Distributor Marketplace
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Manage Inventory
            </CardTitle>
            <CardDescription>
              Track and manage your retail inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/retailer-inventory">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                View Inventory
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Track Supply Chain
            </CardTitle>
            <CardDescription>
              Monitor your products from farm to store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/track">
                <Eye className="h-4 w-4 mr-2" />
                Track Products
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
          <CardDescription>Your latest purchases from distributors</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No purchases yet</p>
              <p className="text-sm">Start by purchasing from distributors</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{transaction.batch?.crop_type || 'Unknown Crop'} - {transaction.batch?.variety || 'Unknown Variety'}</h4>
                      <p className="text-sm text-gray-500">
                        From: {transaction.batch?.current_owner || 'Unknown Distributor'} • {transaction.quantity} kg
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{transaction.price}</p>
                    <Badge variant="default">
                      {transaction.transaction_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
