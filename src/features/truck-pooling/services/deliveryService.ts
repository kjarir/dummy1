import { supabase } from '@/integrations/supabase/client';

export interface DeliveryRequest {
  id: string;
  transaction_id?: number; // INTEGER in database (SERIAL)
  batch_id: string;
  source_location: {
    lat: number;
    lng: number;
    address: string;
    owner_id: string;
  };
  destination_location: {
    lat: number;
    lng: number;
    address: string;
    owner_id: string;
  };
  quantity_kg: number;
  status: 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled';
  assigned_driver_id?: string;
  requested_at: string;
  accepted_at?: string;
  delivered_at?: string;
  delivery_fee?: number;
  payment_status: 'pending' | 'split_pending' | 'paid';
  delivery_deadline?: string;
  preferred_time_window?: {
    start: string;
    end: string;
  };
  urgency_score: number;
  delivered_on_time?: boolean;
  pod_signature?: string;
  pod_photos?: string[];
  pod_timestamp?: string;
  pod_location?: {
    lat: number;
    lng: number;
  };
  buyer_confirmation?: boolean;
  created_at: string;
  updated_at: string;
  batches?: any;
  profiles?: any;
}

export interface CreateDeliveryRequestParams {
  transactionId?: number | string; // INTEGER in database, but can be string from fallback
  batchId: string;
  sourceLocation: {
    lat: number;
    lng: number;
    address: string;
    ownerId: string;
  };
  destinationLocation: {
    lat: number;
    lng: number;
    address: string;
    ownerId: string;
  };
  quantityKg: number;
  harvestDate: string;
  freshnessDuration: number;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Calculate delivery deadline based on harvest date and freshness duration
 */
export function calculateDeliveryDeadline(
  harvestDate: string,
  freshnessDuration: number
): Date {
  const harvest = new Date(harvestDate);
  // Deadline = harvest_date + freshness_duration - 2 days buffer
  const deadline = new Date(harvest);
  deadline.setDate(deadline.getDate() + freshnessDuration - 2);
  return deadline;
}

/**
 * Calculate urgency score (1-10) based on deadline
 */
export function calculateUrgencyScore(deadline: Date): number {
  const hoursUntilDeadline = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
  
  if (hoursUntilDeadline < 12) return 10; // Critical
  if (hoursUntilDeadline < 24) return 9; // Very urgent
  if (hoursUntilDeadline < 48) return 7; // Urgent
  if (hoursUntilDeadline < 72) return 5; // Normal
  return 3; // Low priority
}

/**
 * Calculate delivery fee
 */
export function calculateDeliveryFee(
  distanceKm: number,
  weightKg: number,
  urgencyScore: number
): number {
  const baseFee = 100;
  const distanceFee = distanceKm * 5; // ₹5 per km
  const weightFee = weightKg * 2; // ₹2 per kg
  const urgencyFee = urgencyScore >= 8 ? 200 : urgencyScore >= 6 ? 100 : 0;
  
  return baseFee + distanceFee + weightFee + urgencyFee;
}

/**
 * Create a delivery request
 */
export async function createDeliveryRequest(
  params: CreateDeliveryRequestParams
): Promise<DeliveryRequest> {
  try {
    // Calculate distance
    const distance = calculateDistance(
      params.sourceLocation.lat,
      params.sourceLocation.lng,
      params.destinationLocation.lat,
      params.destinationLocation.lng
    );

    // Calculate deadline and urgency
    const deadline = calculateDeliveryDeadline(params.harvestDate, params.freshnessDuration);
    const urgencyScore = calculateUrgencyScore(deadline);

    // Calculate delivery fee
    const deliveryFee = calculateDeliveryFee(distance, params.quantityKg, urgencyScore);

    // Create delivery request
    console.log('🚚 Creating delivery request:', {
      batchId: params.batchId,
      sourceLocation: params.sourceLocation,
      destinationLocation: params.destinationLocation,
      quantityKg: params.quantityKg,
    });

    // Convert transactionId to number if it's a valid number string, otherwise use null
    let transactionIdNum: number | null = null;
    if (params.transactionId) {
      if (typeof params.transactionId === 'number') {
        transactionIdNum = params.transactionId;
      } else if (typeof params.transactionId === 'string') {
        // Only convert if it's a valid number string (not "TXN-123-abc" format)
        const parsed = parseInt(params.transactionId, 10);
        if (!isNaN(parsed) && parsed.toString() === params.transactionId) {
          transactionIdNum = parsed;
        }
      }
    }
    
    const insertData = {
      transaction_id: transactionIdNum,
      batch_id: params.batchId,
      source_location: params.sourceLocation,
      destination_location: params.destinationLocation,
      quantity_kg: params.quantityKg,
      delivery_deadline: deadline.toISOString(),
      urgency_score: urgencyScore,
      delivery_fee: deliveryFee,
      status: 'pending',
      payment_status: 'pending',
    };

    console.log('🚚 Inserting delivery request data:', insertData);

    const { data, error } = await supabase
      .from('delivery_requests')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating delivery request:', error);
      throw error;
    }

    console.log('✅ Delivery request created successfully:', data.id);

    // Notify available drivers
    await notifyDrivers(data.id);

    return data;
  } catch (error) {
    console.error('Error creating delivery request:', error);
    throw error;
  }
}

/**
 * Notify available drivers about a new delivery request
 */
export async function notifyDrivers(deliveryRequestId: string): Promise<void> {
  try {
    // Find available drivers near the source location
    const { data: deliveryRequest } = await supabase
      .from('delivery_requests')
      .select('source_location, quantity_kg')
      .eq('id', deliveryRequestId)
      .single();

    if (!deliveryRequest) return;

    const sourceLocation = deliveryRequest.source_location as any;
    
    // Find available drivers using driver_profiles table (separate from profiles)
    // Only notify drivers who have completed registration (have vehicle_type)
    const { data: drivers } = await supabase
      .from('driver_profiles')
      .select(`
        profile_id,
        vehicle_capacity_kg,
        is_available,
        vehicle_type
      `)
      .eq('is_available', true)
      .not('vehicle_type', 'is', null) // Only fully registered drivers
      .gte('vehicle_capacity_kg', deliveryRequest.quantity_kg);

    if (!drivers || drivers.length === 0) {
      console.log('⚠️ No available drivers found for delivery request:', deliveryRequestId);
      return;
    }

    console.log(`📢 Notifying ${drivers.length} drivers about new delivery request`);

    // Create notifications for each driver (use profile_id from driver_profiles)
    const notifications = drivers.map(driver => ({
      driver_id: driver.profile_id, // Use profile_id from driver_profiles
      delivery_request_id: deliveryRequestId,
      notification_type: 'new_delivery',
      message: `New delivery request available: ${deliveryRequest.quantity_kg}kg`,
      is_read: false,
    }));

    await supabase.from('driver_notifications').insert(notifications);
  } catch (error) {
    console.error('Error notifying drivers:', error);
  }
}

/**
 * Get pending delivery requests for drivers
 */
export async function getPendingDeliveryRequests(): Promise<DeliveryRequest[]> {
  try {
    // First get delivery requests
    const { data: deliveries, error: deliveryError } = await supabase
      .from('delivery_requests')
      .select('*')
      .eq('status', 'pending')
      .order('urgency_score', { ascending: false })
      .order('created_at', { ascending: true });

    if (deliveryError) {
      console.error('Error fetching pending delivery requests:', deliveryError);
      throw deliveryError;
    }

    if (!deliveries || deliveries.length === 0) {
      return [];
    }

    // Then fetch batch data for each delivery
    const batchIds = deliveries.map(d => d.batch_id).filter(Boolean);
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id, crop_type, variety, harvest_date, freshness_duration')
      .in('id', batchIds);

    if (batchError) {
      console.error('Error fetching batches:', batchError);
    }

    // Combine the data
    const batchMap = new Map((batches || []).map(b => [b.id, b]));
    
    const result = deliveries.map(delivery => ({
      ...delivery,
      batches: batchMap.get(delivery.batch_id) || {}
    }));

    return result;
  } catch (error) {
    console.error('Error fetching pending delivery requests:', error);
    return [];
  }
}

/**
 * Accept a delivery request
 */
export async function acceptDeliveryRequest(
  deliveryRequestId: string,
  driverId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('delivery_requests')
      .update({
        assigned_driver_id: driverId,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', deliveryRequestId)
      .eq('status', 'pending');

    if (error) throw error;

    // Mark driver as unavailable in driver_profiles table
    await supabase
      .from('driver_profiles')
      .update({ is_available: false })
      .eq('profile_id', driverId);

    // Create notification
    await supabase.from('driver_notifications').insert({
      driver_id: driverId,
      delivery_request_id: deliveryRequestId,
      notification_type: 'status_update',
      message: 'Delivery request accepted',
      is_read: false,
    });
  } catch (error) {
    console.error('Error accepting delivery request:', error);
    throw error;
  }
}

/**
 * Start delivery (change status to in_transit)
 */
export async function startDelivery(deliveryRequestId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('delivery_requests')
      .update({
        status: 'in_transit',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryRequestId);

    if (error) throw error;
  } catch (error) {
    console.error('Error starting delivery:', error);
    throw error;
  }
}

/**
 * Complete delivery with POD
 */
export async function completeDelivery(
  deliveryRequestId: string,
  podData: {
    signature?: string;
    photos?: string[];
    location?: { lat: number; lng: number };
  }
): Promise<void> {
  try {
    const { data: delivery } = await supabase
      .from('delivery_requests')
      .select('delivery_deadline')
      .eq('id', deliveryRequestId)
      .single();

    const deliveredOnTime = delivery?.delivery_deadline
      ? new Date() <= new Date(delivery.delivery_deadline)
      : true;

    const { error } = await supabase
      .from('delivery_requests')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        pod_signature: podData.signature,
        pod_photos: podData.photos,
        pod_location: podData.location,
        pod_timestamp: new Date().toISOString(),
        delivered_on_time: deliveredOnTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryRequestId);

    if (error) throw error;

    // Mark driver as available again in driver_profiles table
    const { data: deliveryRequest } = await supabase
      .from('delivery_requests')
      .select('assigned_driver_id')
      .eq('id', deliveryRequestId)
      .single();

    if (deliveryRequest?.assigned_driver_id) {
      await supabase
        .from('driver_profiles')
        .update({ is_available: true })
        .eq('profile_id', deliveryRequest.assigned_driver_id);
    }

    // Calculate and create split payments
    await calculateAndCreateSplitPayments(deliveryRequestId);
  } catch (error) {
    console.error('Error completing delivery:', error);
    throw error;
  }
}

/**
 * Calculate and create split payments for multi-batch deliveries
 */
async function calculateAndCreateSplitPayments(deliveryRequestId: string): Promise<void> {
  try {
    const { data: delivery } = await supabase
      .from('delivery_requests')
      .select('delivery_fee, batch_id')
      .eq('id', deliveryRequestId)
      .single();

    if (!delivery) return;

    // Check if there are multiple batches
    const { data: deliveryBatches } = await supabase
      .from('delivery_batches')
      .select('batch_id, quantity_kg, owner_contribution_percentage')
      .eq('delivery_request_id', deliveryRequestId);

    if (deliveryBatches && deliveryBatches.length > 0) {
      // Multi-batch delivery - split payment
      const totalQuantity = deliveryBatches.reduce(
        (sum, db) => sum + parseFloat(db.quantity_kg.toString()),
        0
      );

      for (const db of deliveryBatches) {
        const percentage = db.owner_contribution_percentage || 
          (parseFloat(db.quantity_kg.toString()) / totalQuantity) * 100;
        const amount = (delivery.delivery_fee || 0) * (percentage / 100);

        // Get batch owner
        const { data: batch } = await supabase
          .from('batches')
          .select('current_owner')
          .eq('id', db.batch_id)
          .single();

        if (batch?.current_owner) {
          await supabase.from('delivery_payments').insert({
            delivery_request_id: deliveryRequestId,
            batch_id: db.batch_id,
            owner_id: batch.current_owner,
            amount,
            payment_status: 'pending',
          });
        }
      }
    } else {
      // Single batch delivery
      const { data: batch } = await supabase
        .from('batches')
        .select('current_owner')
        .eq('id', delivery.batch_id)
        .single();

      if (batch?.current_owner) {
        await supabase.from('delivery_payments').insert({
          delivery_request_id: deliveryRequestId,
          batch_id: delivery.batch_id,
          owner_id: batch.current_owner,
          amount: delivery.delivery_fee || 0,
          payment_status: 'pending',
        });
      }
    }

    // Update payment status
    await supabase
      .from('delivery_requests')
      .update({ payment_status: 'split_pending' })
      .eq('id', deliveryRequestId);
  } catch (error) {
    console.error('Error calculating split payments:', error);
  }
}

/**
 * Get delivery requests for a user (as buyer or seller)
 */
export async function getUserDeliveryRequests(userId: string): Promise<DeliveryRequest[]> {
  try {
    console.log('🔍 Fetching delivery requests for user:', userId);
    
    // Query all delivery requests and filter in JavaScript
    // This is more reliable than JSONB queries in PostgREST
    const { data, error } = await supabase
      .from('delivery_requests')
      .select(`
        *,
        batches:crop_type,
        batches:variety
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching delivery requests:', error);
      throw error;
    }

    console.log('🔍 All delivery requests:', data?.length || 0);

    // Filter deliveries where user is either source or destination owner
    const userDeliveries = (data || []).filter((delivery) => {
      const sourceOwnerId = typeof delivery.source_location === 'string' 
        ? JSON.parse(delivery.source_location)?.owner_id
        : delivery.source_location?.owner_id;
      
      const destOwnerId = typeof delivery.destination_location === 'string'
        ? JSON.parse(delivery.destination_location)?.owner_id
        : delivery.destination_location?.owner_id;

      const matches = sourceOwnerId === userId || destOwnerId === userId;
      
      if (matches) {
        console.log('✅ Found matching delivery:', {
          deliveryId: delivery.id,
          sourceOwnerId,
          destOwnerId,
          userId,
          status: delivery.status
        });
      }
      
      return matches;
    });

    console.log('✅ User delivery requests:', userDeliveries.length);
    return userDeliveries;
  } catch (error) {
    console.error('Error fetching user delivery requests:', error);
    return [];
  }
}

/**
 * Get driver's active deliveries
 */
export async function getDriverActiveDeliveries(driverId: string): Promise<DeliveryRequest[]> {
  try {
    // First get delivery requests
    const { data: deliveries, error: deliveryError } = await supabase
      .from('delivery_requests')
      .select('*')
      .eq('assigned_driver_id', driverId)
      .in('status', ['accepted', 'in_transit'])
      .order('accepted_at', { ascending: true });

    if (deliveryError) {
      console.error('Error fetching driver active deliveries:', deliveryError);
      throw deliveryError;
    }

    if (!deliveries || deliveries.length === 0) {
      return [];
    }

    // Then fetch batch data for each delivery
    const batchIds = deliveries.map(d => d.batch_id).filter(Boolean);
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id, crop_type, variety')
      .in('id', batchIds);

    if (batchError) {
      console.error('Error fetching batches:', batchError);
    }

    // Combine the data
    const batchMap = new Map((batches || []).map(b => [b.id, b]));
    
    const result = deliveries.map(delivery => ({
      ...delivery,
      batches: batchMap.get(delivery.batch_id) || {}
    }));

    return result;
  } catch (error) {
    console.error('Error fetching driver active deliveries:', error);
    return [];
  }
}

/**
 * Find compatible batches for truck pooling (same destination, pending status)
 */
export async function findCompatibleBatches(
  deliveryRequestId: string,
  driverCapacity: number
): Promise<any[]> {
  try {
    // Get the current delivery request
    const { data: currentDelivery, error: deliveryError } = await supabase
      .from('delivery_requests')
      .select('destination_location, quantity_kg, batch_id')
      .eq('id', deliveryRequestId)
      .single();

    if (deliveryError || !currentDelivery) {
      throw new Error('Delivery request not found');
    }

    // Get all batches already in this delivery
    const { data: existingBatches } = await supabase
      .from('delivery_batches')
      .select('batch_id, quantity_kg')
      .eq('delivery_request_id', deliveryRequestId);

    const existingBatchIds = new Set([
      currentDelivery.batch_id,
      ...(existingBatches || []).map((eb: any) => eb.batch_id)
    ]);

    // Calculate used capacity
    const usedCapacity = (existingBatches || []).reduce(
      (sum: number, eb: any) => sum + parseFloat(eb.quantity_kg.toString()),
      parseFloat(currentDelivery.quantity_kg.toString())
    );

    const availableCapacity = driverCapacity - usedCapacity;

    if (availableCapacity <= 0) {
      return [];
    }

    // Find other pending deliveries with same destination
    const destLocation = currentDelivery.destination_location;
    
    // Extract lat/lng for comparison (more reliable than JSON string comparison)
    let currentDestLat: number;
    let currentDestLng: number;
    
    if (typeof destLocation === 'string') {
      try {
        const parsed = JSON.parse(destLocation);
        currentDestLat = parsed.lat;
        currentDestLng = parsed.lng;
      } catch {
        throw new Error('Invalid destination location format');
      }
    } else {
      currentDestLat = destLocation?.lat;
      currentDestLng = destLocation?.lng;
    }

    // Get all pending deliveries
    const { data: allPendingDeliveries, error: compatibleError } = await supabase
      .from('delivery_requests')
      .select('id, batch_id, quantity_kg, source_location, destination_location, delivery_fee, urgency_score')
      .eq('status', 'pending')
      .neq('id', deliveryRequestId);

    if (compatibleError) {
      console.error('Error finding compatible batches:', compatibleError);
      return [];
    }

    // Filter by same destination and exclude existing batches
    // Compare by lat/lng for more reliable matching (within 0.001 degrees ≈ 111 meters)
    const compatibleDeliveries = (allPendingDeliveries || [])
      .filter((delivery: any) => {
        const deliveryDest = delivery.destination_location || {};
        let deliveryLat: number;
        let deliveryLng: number;
        
        if (typeof deliveryDest === 'string') {
          try {
            const parsed = JSON.parse(deliveryDest);
            deliveryLat = parsed.lat;
            deliveryLng = parsed.lng;
          } catch {
            return false; // Skip invalid destinations
          }
        } else {
          deliveryLat = deliveryDest.lat;
          deliveryLng = deliveryDest.lng;
        }
        
        const quantity = parseFloat(delivery.quantity_kg.toString());
        const latDiff = Math.abs((currentDestLat || 0) - (deliveryLat || 0));
        const lngDiff = Math.abs((currentDestLng || 0) - (deliveryLng || 0));
        const isSameDestination = latDiff <= 0.001 && lngDiff <= 0.001; // Same location within 111m
        const fitsCapacity = quantity <= availableCapacity;
        const notExisting = !existingBatchIds.has(delivery.batch_id);
        
        return isSameDestination && fitsCapacity && notExisting;
      });

    // Get batch details for compatible deliveries
    const batchIds = compatibleDeliveries.map((d: any) => d.batch_id);
    const { data: batches } = await supabase
      .from('batches')
      .select('id, crop_type, variety, current_owner')
      .in('id', batchIds);

    const batchMap = new Map((batches || []).map((b: any) => [b.id, b]));

    // Combine and format
    const compatible = compatibleDeliveries
      .map((delivery: any) => {
        const batch = batchMap.get(delivery.batch_id);
        return {
          delivery_id: delivery.id,
          batch_id: delivery.batch_id,
          crop_type: batch?.crop_type || 'Unknown',
          variety: batch?.variety || 'N/A',
          quantity_kg: parseFloat(delivery.quantity_kg.toString()),
          source_location: delivery.source_location,
          delivery_fee: delivery.delivery_fee,
          urgency_score: delivery.urgency_score,
          owner_id: batch?.current_owner,
        };
      })
      .sort((a, b) => b.urgency_score - a.urgency_score); // Sort by urgency

    return compatible;
  } catch (error) {
    console.error('Error finding compatible batches:', error);
    return [];
  }
}

/**
 * Add a batch to existing delivery (truck pooling)
 */
export async function addBatchToDelivery(
  deliveryRequestId: string,
  batchDeliveryId: string,
  driverId: string
): Promise<void> {
  try {
    // Verify driver owns the delivery
    const { data: delivery, error: deliveryError } = await supabase
      .from('delivery_requests')
      .select('assigned_driver_id, quantity_kg, delivery_fee, destination_location')
      .eq('id', deliveryRequestId)
      .single();

    if (deliveryError || !delivery) {
      throw new Error('Delivery request not found');
    }

    if (delivery.assigned_driver_id !== driverId) {
      throw new Error('You can only add batches to your own deliveries');
    }

    // Get the batch delivery to add
    const { data: batchDelivery, error: batchDeliveryError } = await supabase
      .from('delivery_requests')
      .select('batch_id, quantity_kg, delivery_fee, destination_location')
      .eq('id', batchDeliveryId)
      .eq('status', 'pending')
      .single();

    if (batchDeliveryError || !batchDelivery) {
      throw new Error('Batch delivery not found or already accepted');
    }

    // Verify same destination - compare lat/lng instead of full JSON (more robust)
    const currentDest = delivery.destination_location;
    const batchDest = batchDelivery.destination_location;
    
    if (!currentDest || !batchDest) {
      throw new Error('Destination location missing');
    }

    // Compare coordinates (more reliable than JSON string comparison)
    const currentLat = typeof currentDest === 'string' 
      ? JSON.parse(currentDest).lat 
      : currentDest.lat;
    const currentLng = typeof currentDest === 'string' 
      ? JSON.parse(currentDest).lng 
      : currentDest.lng;
    const batchLat = typeof batchDest === 'string' 
      ? JSON.parse(batchDest).lat 
      : batchDest.lat;
    const batchLng = typeof batchDest === 'string' 
      ? JSON.parse(batchDest).lng 
      : batchDest.lng;

    // Allow small tolerance for floating point comparison (0.001 degrees ≈ 111 meters)
    const latDiff = Math.abs(currentLat - batchLat);
    const lngDiff = Math.abs(currentLng - batchLng);
    
    if (latDiff > 0.001 || lngDiff > 0.001) {
      console.error('Destination mismatch:', {
        current: { lat: currentLat, lng: currentLng },
        batch: { lat: batchLat, lng: batchLng },
        diff: { lat: latDiff, lng: lngDiff }
      });
      throw new Error('Batches must have the same destination for pooling');
    }

    // Get all batches in current delivery
    const { data: existingBatches } = await supabase
      .from('delivery_batches')
      .select('batch_id, quantity_kg')
      .eq('delivery_request_id', deliveryRequestId);

    const allBatchIds = [
      delivery.batch_id,
      ...(existingBatches || []).map((eb: any) => eb.batch_id)
    ];

    if (allBatchIds.includes(batchDelivery.batch_id)) {
      throw new Error('Batch already in this delivery');
    }

    // Calculate new total quantity and update delivery fee
    const currentQuantity = parseFloat(delivery.quantity_kg.toString());
    const newQuantity = parseFloat(batchDelivery.quantity_kg.toString());
    const totalQuantity = currentQuantity + newQuantity;

    // Recalculate delivery fee based on total weight
    // Simple calculation: base fee + (distance * rate) + (weight * rate)
    // For now, we'll proportionally add the fees
    const currentFee = delivery.delivery_fee || 0;
    const batchFee = batchDelivery.delivery_fee || 0;
    const newTotalFee = currentFee + batchFee;

    // Add batch to delivery_batches table
    const { error: addBatchError } = await supabase
      .from('delivery_batches')
      .insert({
        delivery_request_id: deliveryRequestId,
        batch_id: batchDelivery.batch_id,
        quantity_kg: newQuantity,
        owner_contribution_percentage: (newQuantity / totalQuantity) * 100,
      });

    if (addBatchError) {
      throw addBatchError;
    }

    // Update delivery request with new total
    const { error: updateError } = await supabase
      .from('delivery_requests')
      .update({
        quantity_kg: totalQuantity,
        delivery_fee: newTotalFee,
        payment_status: 'split_pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryRequestId);

    if (updateError) {
      throw updateError;
    }

    // Update the batch delivery status to accepted (linked to main delivery)
    const { error: updateBatchDeliveryError } = await supabase
      .from('delivery_requests')
      .update({
        status: 'accepted',
        assigned_driver_id: driverId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', batchDeliveryId);

    if (updateBatchDeliveryError) {
      console.warn('Could not update batch delivery status:', updateBatchDeliveryError);
    }

    // Update owner contribution percentages for all batches
    const { data: allDeliveryBatches } = await supabase
      .from('delivery_batches')
      .select('id, quantity_kg')
      .eq('delivery_request_id', deliveryRequestId);

    // Calculate total including main batch
    const mainBatchQuantity = currentQuantity;
    const allQuantities = [
      mainBatchQuantity,
      ...(allDeliveryBatches || []).map((db: any) => parseFloat(db.quantity_kg.toString()))
    ];
    const grandTotal = allQuantities.reduce((sum, qty) => sum + qty, 0);

    // Update percentages for all batches in delivery_batches table
    for (const db of allDeliveryBatches || []) {
      const qty = parseFloat(db.quantity_kg.toString());
      const percentage = (qty / grandTotal) * 100;
      await supabase
        .from('delivery_batches')
        .update({ owner_contribution_percentage: percentage })
        .eq('id', db.id);
    }

    // Create notification
    await supabase.from('driver_notifications').insert({
      driver_id: driverId,
      delivery_request_id: deliveryRequestId,
      notification_type: 'batch_added',
      message: `Added ${newQuantity}kg batch to your delivery. Total: ${totalQuantity}kg`,
      is_read: false,
    });
  } catch (error) {
    console.error('Error adding batch to delivery:', error);
    throw error;
  }
}

/**
 * Get all batches in a delivery (for multi-batch/pooled deliveries)
 */
export async function getDeliveryBatches(deliveryRequestId: string): Promise<any[]> {
  try {
    // Get main batch
    const { data: delivery } = await supabase
      .from('delivery_requests')
      .select('batch_id, quantity_kg')
      .eq('id', deliveryRequestId)
      .single();

    if (!delivery) return [];

    // Get additional batches
    const { data: additionalBatches } = await supabase
      .from('delivery_batches')
      .select('batch_id, quantity_kg, owner_contribution_percentage')
      .eq('delivery_request_id', deliveryRequestId);

    // Get batch details
    const batchIds = [
      delivery.batch_id,
      ...(additionalBatches || []).map((ab: any) => ab.batch_id)
    ].filter(Boolean);

    const { data: batches } = await supabase
      .from('batches')
      .select('id, crop_type, variety, current_owner')
      .in('id', batchIds);

    const batchMap = new Map((batches || []).map((b: any) => [b.id, b]));

    // Combine data - main batch first, then additional batches
    const mainBatchData = batchMap.get(delivery.batch_id);
    const result = [];
    
    // Add main batch
    if (mainBatchData) {
      result.push({
        batch_id: delivery.batch_id,
        quantity_kg: parseFloat(delivery.quantity_kg.toString()),
        is_main: true,
        crop_type: mainBatchData.crop_type,
        variety: mainBatchData.variety,
        current_owner: mainBatchData.current_owner,
      });
    }

    // Add additional batches
    if (additionalBatches && additionalBatches.length > 0) {
      additionalBatches.forEach((ab: any) => {
        const batchData = batchMap.get(ab.batch_id);
        if (batchData) {
          result.push({
            batch_id: ab.batch_id,
            quantity_kg: parseFloat(ab.quantity_kg.toString()),
            owner_contribution_percentage: ab.owner_contribution_percentage,
            is_main: false,
            crop_type: batchData.crop_type,
            variety: batchData.variety,
            current_owner: batchData.current_owner,
          });
        }
      });
    }

    console.log('📦 Delivery batches loaded:', {
      deliveryId: deliveryRequestId,
      mainBatch: delivery.batch_id,
      additionalBatchesCount: additionalBatches?.length || 0,
      totalBatches: result.length,
      batches: result,
      batchIds: batchIds,
      batchMapSize: batchMap.size
    });

    // Ensure we return all batches even if some data is missing
    return result.filter(b => b.batch_id); // Filter out any null/undefined batches
  } catch (error) {
    console.error('Error getting delivery batches:', error);
    return [];
  }
}

/**
 * Get delivery capacity info (used vs available)
 */
export async function getDeliveryCapacityInfo(
  deliveryRequestId: string,
  driverCapacity: number
): Promise<{ used: number; available: number; percentage: number }> {
  try {
    const { data: delivery } = await supabase
      .from('delivery_requests')
      .select('quantity_kg')
      .eq('id', deliveryRequestId)
      .single();

    if (!delivery) {
      return { used: 0, available: driverCapacity, percentage: 0 };
    }

    const { data: additionalBatches } = await supabase
      .from('delivery_batches')
      .select('quantity_kg')
      .eq('delivery_request_id', deliveryRequestId);

    const mainQuantity = parseFloat(delivery.quantity_kg.toString());
    const additionalQuantity = (additionalBatches || []).reduce(
      (sum, ab) => sum + parseFloat(ab.quantity_kg.toString()),
      0
    );

    const used = mainQuantity + additionalQuantity;
    const available = Math.max(0, driverCapacity - used);
    const percentage = (used / driverCapacity) * 100;

    return { used, available, percentage };
  } catch (error) {
    console.error('Error getting delivery capacity:', error);
    return { used: 0, available: driverCapacity, percentage: 0 };
  }
}

/**
 * Get driver's delivery history
 */
export async function getDriverDeliveryHistory(driverId: string): Promise<DeliveryRequest[]> {
  try {
    // First get delivery requests
    const { data: deliveries, error: deliveryError } = await supabase
      .from('delivery_requests')
      .select('*')
      .eq('assigned_driver_id', driverId)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(50);

    if (deliveryError) {
      console.error('Error fetching driver delivery history:', deliveryError);
      throw deliveryError;
    }

    if (!deliveries || deliveries.length === 0) {
      return [];
    }

    // Then fetch batch data for each delivery
    const batchIds = deliveries.map(d => d.batch_id).filter(Boolean);
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id, crop_type, variety')
      .in('id', batchIds);

    if (batchError) {
      console.error('Error fetching batches:', batchError);
    }

    // Combine the data
    const batchMap = new Map((batches || []).map(b => [b.id, b]));
    
    const result = deliveries.map(delivery => ({
      ...delivery,
      batches: batchMap.get(delivery.batch_id) || {}
    }));

    return result;
  } catch (error) {
    console.error('Error fetching driver delivery history:', error);
    return [];
  }
}

/**
 * Geocode address to coordinates (simplified - in production use Google Maps API)
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // This is a placeholder - in production, use Google Maps Geocoding API
  // For now, return null and let the frontend handle it
  return null;
}

