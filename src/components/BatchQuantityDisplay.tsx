import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { transactionManager } from '@/utils/transactionManager';

interface BatchQuantityDisplayProps {
  batchId: string;
  originalQuantity: number;
  className?: string;
}

export const BatchQuantityDisplay: React.FC<BatchQuantityDisplayProps> = ({ 
  batchId, 
  originalQuantity, 
  className = "" 
}) => {
  const [currentQuantity, setCurrentQuantity] = useState(originalQuantity);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateCurrentQuantity = async () => {
      try {
        setLoading(true);
        const chain = await transactionManager.getTransactionChain(batchId);
        
        // If no transactions exist, show original quantity as available
        if (chain.transactions.length === 0) {
          setCurrentQuantity(originalQuantity);
        } else {
          setCurrentQuantity(chain.availableQuantity);
        }
      } catch (error) {
        console.error('Error calculating current quantity:', error);
        // If there's an error (like table doesn't exist), show original quantity
        setCurrentQuantity(originalQuantity);
      } finally {
        setLoading(false);
      }
    };

    calculateCurrentQuantity();
  }, [batchId, originalQuantity]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="text-sm">
          Loading...
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={currentQuantity > 0 ? "default" : "destructive"} 
        className="text-sm"
      >
        {currentQuantity} kg available
      </Badge>
      {currentQuantity < originalQuantity && (
        <Badge variant="outline" className="text-xs">
          {originalQuantity - currentQuantity} kg sold
        </Badge>
      )}
    </div>
  );
};
