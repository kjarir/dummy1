import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Package, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  FileText,
  BarChart3,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataCleanupButton } from '@/components/DataCleanupButton';
import { DatabaseMigrationButton } from '@/components/DatabaseMigrationButton';
import { TransactionSystemTest } from '@/components/TransactionSystemTest';
import { DebugGroupManager } from '@/components/DebugGroupManager';
import { ManualGroupFileAdder } from '@/components/ManualGroupFileAdder';
import { SingleStepDebugManager } from '@/components/SingleStepDebugManager';

export const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBatches: 0,
    totalTransactions: 0,
    averageQuality: 0,
    monthlyGrowth: 0,
    activeUsers: 0
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch users
      const { data: users } = await (supabase as any)
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch batches
      const { data: batches } = await (supabase as any)
        .from('batches')
        .select(`
          *,
          profiles:farmer_id (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch transactions
      const { data: transactions } = await (supabase as any)
        .from('transactions')
        .select('*');

      // Fetch audit logs
      const { data: logs } = await (supabase as any)
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (users && Array.isArray(users)) {
        // Ensure all users have required fields
        const safeUsers = users.map(user => ({
          ...user,
          full_name: user.full_name || user.name || 'Unknown User',
          email: user.email || `${(user.full_name || user.name || 'unknown').toLowerCase().replace(/\s+/g, '.')}@email.com`,
          role: user.role || 'farmer',
          is_verified: user.is_verified || false,
          created_at: user.created_at || new Date().toISOString()
        }));
        
        setRecentUsers(safeUsers);
        const totalUsers = safeUsers.length;
        const verifiedUsers = safeUsers.filter((u: any) => u.is_verified).length;
        
        setStats(prev => ({ 
          ...prev, 
          totalUsers,
          activeUsers: verifiedUsers
        }));
      } else {
        setRecentUsers([]);
      }

      if (batches) {
        setRecentBatches(batches);
          const avgQuality = batches.length > 0 
            ? Math.round(batches.reduce((sum: number, batch: any) => sum + (batch.quality_score || 0), 0) / batches.length)
            : 0;
        
        setStats(prev => ({ 
          ...prev, 
          totalBatches: batches.length,
          averageQuality: avgQuality
        }));
      }

      if (transactions) {
        setStats(prev => ({ 
          ...prev, 
          totalTransactions: transactions.length
        }));
      }

      if (logs) {
        setAuditLogs(logs);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Government of Odisha - AgriTrace Platform Management</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-muted rounded-lg p-1">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="batches">Batches</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="govt-card shadow-large">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600">+{stats.monthlyGrowth}%</span>
                    <span className="text-muted-foreground ml-1">this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="govt-card shadow-large">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Batches</p>
                      <p className="text-2xl font-bold">{stats.totalBatches.toLocaleString()}</p>
                    </div>
                    <Package className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600">+15.2%</span>
                    <span className="text-muted-foreground ml-1">this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="govt-card shadow-large">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Transactions</p>
                      <p className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-green-600">+8.4%</span>
                    <span className="text-muted-foreground ml-1">this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="govt-card shadow-large">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Quality</p>
                      <p className="text-2xl font-bold">{stats.averageQuality}/100</p>
                    </div>
                    <Shield className="h-8 w-8 text-orange-600" />
                  </div>
                  <Progress value={stats.averageQuality} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="govt-card shadow-large">
                <CardHeader>
                  <CardTitle>Recent User Registrations</CardTitle>
                  <CardDescription>Latest users awaiting verification</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.role}</p>
                          </div>
                        </div>
                        <Badge variant={user.status === 'verified' ? 'default' : 'outline'}>
                          {user.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="govt-card shadow-large">
                <CardHeader>
                  <CardTitle>Recent Batch Registrations</CardTitle>
                  <CardDescription>Latest produce entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentBatches.map((batch) => (
                      <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{batch.id}</p>
                            <p className="text-sm text-muted-foreground">{batch.crop} by {batch.farmer}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{batch.quality}/100</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{batch.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="govt-card shadow-large">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user roles, verification, and access</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Input placeholder="Search users..." className="w-64" />
                    <Button variant="outline">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_verified ? 'default' : 'outline'}>
                            {user.is_verified ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            )}
                            {user.is_verified ? 'verified' : 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            {!user.is_verified && (
                              <Button size="sm" className="gradient-primary">
                                Verify
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches" className="space-y-6">
            <Card className="govt-card shadow-large">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Batch Management</CardTitle>
                    <CardDescription>Monitor and manage agricultural batches</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Select>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="transferred">Transferred</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Search batches..." className="w-64" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Crop Type</TableHead>
                      <TableHead>Quality Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.id}</TableCell>
                        <TableCell>{batch.farmer}</TableCell>
                        <TableCell>{batch.crop}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={batch.quality} className="w-16" />
                            <span className="text-sm">{batch.quality}/100</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            batch.status === 'available' ? 'default' : 
                            batch.status === 'sold' ? 'outline' : 'secondary'
                          }>
                            {batch.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <FileText className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="govt-card shadow-large">
                <CardHeader>
                  <CardTitle>Quality Distribution</CardTitle>
                  <CardDescription>Quality scores across all batches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Grade A+ (90-100)</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <Progress value={45} />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Grade A (80-89)</span>
                      <span className="text-sm font-medium">35%</span>
                    </div>
                    <Progress value={35} />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Grade B+ (70-79)</span>
                      <span className="text-sm font-medium">15%</span>
                    </div>
                    <Progress value={15} />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Grade B & Below</span>
                      <span className="text-sm font-medium">5%</span>
                    </div>
                    <Progress value={5} />
                  </div>
                </CardContent>
              </Card>

              <Card className="govt-card shadow-large">
                <CardHeader>
                  <CardTitle>Regional Distribution</CardTitle>
                  <CardDescription>Farmers by district</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cuttack</span>
                      <span className="text-sm font-medium">324 farmers</span>
                    </div>
                    <Progress value={85} />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Bhubaneswar</span>
                      <span className="text-sm font-medium">287 farmers</span>
                    </div>
                    <Progress value={75} />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Puri</span>
                      <span className="text-sm font-medium">198 farmers</span>
                    </div>
                    <Progress value={52} />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Others</span>
                      <span className="text-sm font-medium">438 farmers</span>
                    </div>
                    <Progress value={60} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card className="govt-card shadow-large">
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>System activity and user actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>{log.timestamp}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="govt-card shadow-large">
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure platform settings and policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Data Cleanup Section */}
                <div className="space-y-4">
                  <DatabaseMigrationButton />
                  <TransactionSystemTest />
                  <DebugGroupManager />
                  <ManualGroupFileAdder />
                  <SingleStepDebugManager />
                  <div className="border rounded-lg p-4 bg-red-50">
                    <h3 className="font-semibold text-red-800 mb-2">Data Cleanup</h3>
                    <p className="text-sm text-red-700 mb-3">
                      Clean up grading fields that contain old supply chain data. This will remove any purchase history or transaction data from the grading field.
                    </p>
                    <DataCleanupButton />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Verification Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Auto-verify farmers</span>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Manual review threshold</span>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Blockchain Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Network configuration</span>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Gas price settings</span>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};