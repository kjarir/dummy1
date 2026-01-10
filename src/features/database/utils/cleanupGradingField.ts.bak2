import { supabase } from '@/integrations/supabase/client';

/**
 * Clean up grading field by removing supply chain data
 */
export const cleanupGradingField = async (batchId: string): Promise<void> => {
  try {
    // Get current batch data
    const { data: batch, error: fetchError } = await (supabase as any)
      .from('batches')
      .select('grading')
      .eq('id', batchId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!batch?.grading) {
      return; // No grading data to clean
    }

    let cleanGrading = batch.grading;

    // Remove supply chain data patterns
    const patternsToRemove = [
      / \| SupplyChain:.*$/,
      / \| Purchase History:.*$/,
      / \| Purchase:.*$/,
      / \| Buyer:.*$/,
      / \| Qty:.*$/,
      / \| Total:.*$/,
      / \| Address:.*$/,
      / \| Payment:.*$/,
      / \| Date:.*$/
    ];

    patternsToRemove.forEach(pattern => {
      cleanGrading = cleanGrading.replace(pattern, '');
    });

    // Trim any extra spaces
    cleanGrading = cleanGrading.trim();

    // Update the batch with clean grading
    const { error: updateError } = await (supabase as any)
      .from('batches')
      .update({ 
        grading: cleanGrading
      })
      .eq('id', batchId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Cleaned grading field for batch ${batchId}: "${cleanGrading}"`);
  } catch (error) {
    console.error('Error cleaning grading field:', error);
    throw new Error('Failed to clean grading field');
  }
};

/**
 * Clean up all batches' grading fields
 */
export const cleanupAllGradingFields = async (): Promise<void> => {
  try {
    // Get all batches
    const { data: batches, error: fetchError } = await (supabase as any)
      .from('batches')
      .select('id, grading');

    if (fetchError) {
      throw fetchError;
    }

    if (!batches || batches.length === 0) {
      return;
    }

    // Clean each batch
    for (const batch of batches) {
      if (batch.grading) {
        let cleanGrading = batch.grading;

        // Remove supply chain data patterns
        const patternsToRemove = [
          / \| SupplyChain:.*$/,
          / \| Purchase History:.*$/,
          / \| Purchase:.*$/,
          / \| Buyer:.*$/,
          / \| Qty:.*$/,
          / \| Total:.*$/,
          / \| Address:.*$/,
          / \| Payment:.*$/,
          / \| Date:.*$/
        ];

        patternsToRemove.forEach(pattern => {
          cleanGrading = cleanGrading.replace(pattern, '');
        });

        // Trim any extra spaces
        cleanGrading = cleanGrading.trim();

        // Only update if grading actually changed
        if (cleanGrading !== batch.grading) {
          const { error: updateError } = await (supabase as any)
            .from('batches')
            .update({ 
              grading: cleanGrading
            })
            .eq('id', batch.id);

          if (updateError) {
            console.error(`Failed to clean batch ${batch.id}:`, updateError);
          } else {
            console.log(`Cleaned batch ${batch.id}: "${cleanGrading}"`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning all grading fields:', error);
    throw new Error('Failed to clean all grading fields');
  }
};
