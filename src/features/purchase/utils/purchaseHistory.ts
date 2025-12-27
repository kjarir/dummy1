import { supabase } from '@/integrations/supabase/client';

export interface PurchaseRecord {
  id?: string;
  batch_id: string;
  buyer_email: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  delivery_address: string;
  payment_method: string;
  purchase_date: string;
  status: 'pending' | 'completed' | 'delivered';
}

/**
 * Store purchase record in existing grading field (since we can't create new tables)
 */
export const storePurchaseRecord = async (purchase: PurchaseRecord): Promise<string> => {
  try {
    // Get existing batch data
    const { data: batch, error: fetchError } = await (supabase as any)
      .from('batches')
      .select('grading')
      .eq('id', purchase.batch_id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Parse existing purchase history from grading field or create new array
    let purchaseHistory: PurchaseRecord[] = [];
    if (batch?.grading && batch.grading.includes('| Purchase History:')) {
      try {
        const historyPart = batch.grading.split('| Purchase History:')[1];
        purchaseHistory = JSON.parse(historyPart);
      } catch (e) {
        console.warn('Failed to parse existing purchase history, starting fresh');
        purchaseHistory = [];
      }
    }

    // Add new purchase record
    const newPurchase: PurchaseRecord = {
      ...purchase,
      id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      purchase_date: new Date().toISOString(),
      status: 'completed'
    };

    purchaseHistory.push(newPurchase);

    // Update batch with new purchase history in grading field
    const originalGrading = batch.grading.split('| Purchase History:')[0] || batch.grading;
    const updatedGrading = `${originalGrading} | Purchase History:${JSON.stringify(purchaseHistory)}`;

    const { error: updateError } = await (supabase as any)
      .from('batches')
      .update({ 
        grading: updatedGrading
      })
      .eq('id', purchase.batch_id);

    if (updateError) {
      throw updateError;
    }

    return newPurchase.id!;
  } catch (error) {
    console.error('Error storing purchase record:', error);
    throw new Error('Failed to store purchase record');
  }
};

/**
 * Get purchase history for a batch
 */
export const getPurchaseHistory = async (batchId: string): Promise<PurchaseRecord[]> => {
  try {
    const { data: batch, error } = await (supabase as any)
      .from('batches')
      .select('grading')
      .eq('id', batchId)
      .single();

    if (error) {
      console.error('Error fetching purchase history:', error);
      return [];
    }

    if (!batch?.grading || !batch.grading.includes('| Purchase History:')) {
      return [];
    }

    try {
      const historyPart = batch.grading.split('| Purchase History:')[1];
      return JSON.parse(historyPart);
    } catch (e) {
      console.error('Error parsing purchase history:', e);
      return [];
    }
  } catch (error) {
    console.error('Error getting purchase history:', error);
    return [];
  }
};

/**
 * Calculate total sold quantity for a batch
 */
export const getTotalSoldQuantity = async (batchId: string): Promise<number> => {
  try {
    const purchaseHistory = await getPurchaseHistory(batchId);
    return purchaseHistory.reduce((total, purchase) => total + purchase.quantity, 0);
  } catch (error) {
    console.error('Error calculating sold quantity:', error);
    return 0;
  }
};

/**
 * Get available quantity for a batch
 */
export const getAvailableQuantity = async (batchId: string, originalQuantity: number): Promise<number> => {
  try {
    const soldQuantity = await getTotalSoldQuantity(batchId);
    return Math.max(0, originalQuantity - soldQuantity);
  } catch (error) {
    console.error('Error calculating available quantity:', error);
    return originalQuantity;
  }
};
