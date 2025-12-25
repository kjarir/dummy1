import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { runDatabaseMigrations, checkTransactionsTableExists } from '@/utils/databaseMigration';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const DatabaseMigrationButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const { toast } = useToast();

  const checkTableStatus = async () => {
    try {
      const exists = await checkTransactionsTableExists();
      setTableExists(exists);
    } catch (error) {
      console.error('Error checking table status:', error);
    }
  };

  const handleMigration = async () => {
    setLoading(true);
    try {
      await runDatabaseMigrations();
      await checkTableStatus();
      
      toast({
        title: "Migration Successful",
        description: "Database has been updated with the new transaction system.",
      });
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        variant: "destructive",
        title: "Migration Failed",
        description: error instanceof Error ? error.message : "Failed to run database migrations.",
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    checkTableStatus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Migration
        </CardTitle>
        <CardDescription>
          Update database schema for the new immutable transaction system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Transactions Table Status:</span>
          {tableExists === null ? (
            <Badge variant="secondary">Checking...</Badge>
          ) : tableExists ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Exists
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Missing
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Button 
            onClick={handleMigration}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running Migration...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Run Database Migration
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={checkTableStatus}
            disabled={loading}
            className="w-full"
          >
            Check Status
          </Button>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>What this migration does:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Checks if the transactions table exists</li>
            <li>Provides SQL commands to create the table manually</li>
            <li>Adds initial_transaction_hash column to batches table</li>
          </ul>
          <p className="mt-2 text-red-600">
            <strong>Note:</strong> You need to run the SQL commands manually in your Supabase dashboard SQL editor.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
