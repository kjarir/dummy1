import { supabase } from '@/integrations/supabase/client';

/**
 * Safely query batches table with fallback approaches
 */
export const findBatchById = async (batchId: string | number): Promise<any | null> => {
  try {
    // First try direct ID match
    const { data, error } = await (supabase as any)
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (!error && data) {
      return data;
    }

    // If not found, return null
    return null;
  } catch (error) {
    console.error('Error finding batch by ID:', error);
    return null;
  }
};

/**
 * Safely query batches table by any field
 */
export const findBatchByField = async (field: string, value: any): Promise<any | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('batches')
      .select('*')
      .eq(field, value)
      .single();

    if (!error && data) {
      return data;
    }

    return null;
  } catch (error) {
    console.error(`Error finding batch by ${field}:`, error);
    return null;
  }
};

/**
 * Get all batches with basic error handling
 */
export const getAllBatches = async (): Promise<any[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('batches')
      .select('*');

    if (error) {
      console.error('Error fetching batches:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching batches:', error);
    return [];
  }
};

/**
 * Update batch with safe field handling
 */
export const updateBatch = async (batchId: string | number, updates: any): Promise<any | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('batches')
      .update(updates)
      .eq('id', batchId)
      .select()
      .single();

    if (error) {
      console.error('Error updating batch:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating batch:', error);
    return null;
  }
};

/**
 * Parse buyer information from grading field
 */
export const parseBuyerInfo = (grading: string): any => {
  if (!grading || !grading.includes('| Buyer:')) {
    return null;
  }

  try {
    const parts = grading.split(' | ');
    const buyerInfo: any = {};

    parts.forEach(part => {
      if (part.startsWith('Buyer: ')) {
        buyerInfo.buyer = part.replace('Buyer: ', '');
      } else if (part.startsWith('Qty: ')) {
        buyerInfo.quantity = part.replace('Qty: ', '');
      } else if (part.startsWith('Total: ')) {
        buyerInfo.total = part.replace('Total: ', '');
      } else if (part.startsWith('Address: ')) {
        buyerInfo.address = part.replace('Address: ', '');
      } else if (part.startsWith('Payment: ')) {
        buyerInfo.paymentMethod = part.replace('Payment: ', '');
      } else if (part.startsWith('Date: ')) {
        buyerInfo.purchaseDate = part.replace('Date: ', '');
      }
    });

    return buyerInfo;
  } catch (error) {
    console.error('Error parsing buyer info:', error);
    return null;
  }
};
