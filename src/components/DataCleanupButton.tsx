import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cleanupAllGradingFields } from '@/utils/cleanupGradingField';
import { Loader2, Trash2 } from 'lucide-react';

export const DataCleanupButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCleanup = async () => {
    setLoading(true);
    try {
      await cleanupAllGradingFields();
      toast({
        title: "Data Cleanup Complete",
        description: "All grading fields have been cleaned of supply chain data.",
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        variant: "destructive",
        title: "Cleanup Failed",
        description: "Failed to clean up grading fields. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCleanup}
      disabled={loading}
      variant="outline"
      size="sm"
      className="text-red-600 hover:text-red-700"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Trash2 className="h-4 w-4 mr-2" />
      )}
      Clean Grading Fields
    </Button>
  );
};
