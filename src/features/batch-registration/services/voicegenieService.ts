/**
 * VoiceGenie API Service
 * Fetches call data from VoiceGenie API and handles batch registration
 */

import { extractCropDataFromTranscript } from '@/features/ai-services/services/geminiService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { Tables } from '@/integrations/supabase/types';

const VOICEGENIE_API_BASE_URL = import.meta.env.VITE_VOICEGENIE_API_BASE_URL || 'https://voiceagent-6h5b.onrender.com/api';
const VOICEGENIE_API_KEY = import.meta.env.VITE_VOICEGENIE_API_KEY;

if (!VOICEGENIE_API_KEY) {
  throw new Error('VITE_VOICEGENIE_API_KEY environment variable is required');
}

// Global flag to skip Gemini when daily quota is exceeded
let geminiDailyQuotaExceeded = false;

export interface VoiceGenieCall {
  id: string;
  phone: string;
  farmerName?: string;
  farmerLocation?: string;
  language?: string;
  status?: string;
  collectedData?: {
    cropType?: string;
    variety?: string;
    harvestQuantity?: number;
    sowingDate?: string;
    harvestDate?: string;
    pricePerKg?: number;
    certification?: string;
    grading?: string;
    labTest?: string;
    freshnessDuration?: number;
  };
  confidenceScore?: number;
  callRecordingUrl?: string;
  callDuration?: number;
  timestamp?: string;
  validationErrors?: string[];
  uncertainFields?: string[];
  notes?: string;
}

// Actual API response structure from VoiceGenie
interface VoiceGenieApiRawCall {
  _id: string;
  phoneNumber: string;
  status: string;
  duration: number;
  campaignId?: string;
  transcript?: Array<{
    sender: string;
    message: string;
    timestamp: string;
  }>;
  callSummary?: string;
  answers?: any; // Can be array or object
  informationGathered?: {
    language?: string;
    intent?: string;
    [key: string]: any;
  };
  rawPayload?: {
    transcript?: Array<{
      sender: string;
      message: string;
      timestamp: string;
    }>;
    customerSpecificData?: {
      PhoneNumber?: string;
      Name?: string;
      Email?: string;
      [key: string]: any;
    };
    answersToQuestion?: {
      crop?: string;
      quantity?: string;
      location?: string;
      variety?: string;
      price?: string;
      [key: string]: any;
    };
    informationGathered?: {
      language?: string;
      intent?: string;
      [key: string]: any;
    };
    callStatus?: string;
    duration?: string;
    callSummary?: string;
    [key: string]: any;
  };
  receivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface VoiceGenieApiResponse {
  success?: boolean;
  count?: number;
  data?: VoiceGenieApiRawCall[];
  calls?: VoiceGenieCall[];
  call?: VoiceGenieCall;
  error?: string;
  message?: string;
}

/**
 * Check database for cached call data
 */
interface VoiceGenieCallRow {
  id?: string;
  call_id: string;
  phone_number?: string | null;
  farmer_name?: string | null;
  farmer_location?: string | null;
  language?: string;
  status?: string;
  raw_call_data?: unknown;
  transcript?: string | null;
  call_summary?: string | null;
  call_duration?: number | null;
  call_recording_url?: string | null;
  received_at?: string | null;
  collected_data?: Record<string, unknown>;
  confidence_score?: number | null;
  validation_errors?: string[];
  uncertain_fields?: string[];
  notes?: string | null;
  gemini_extracted?: boolean;
  gemini_extracted_at?: string | null;
}

async function getCachedCallData(callId: string): Promise<VoiceGenieCallRow | null> {
  try {
    const { data, error } = await supabase
      .from('voicegenie_calls')
      .select('*')
      .eq('call_id', callId)
      .single<VoiceGenieCallRow>();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      logger.warn('⚠️ Error checking cache:', error);
      return null;
    }
    
    if (data) {
      logger.debug('✅ Found cached data for call:', callId);
      return data;
    }
    
    return null;
  } catch (error) {
    logger.warn('⚠️ Error checking cache:', error);
    return null;
  }
}

/**
 * Extract structured data from VoiceGenie JSON response efficiently
 */
interface ExtractedData {
  cropType?: string;
  variety?: string;
  farmLocation?: string;
  location?: string;
  harvestQuantity?: number;
  pricePerKg?: number;
  farmerName?: string;
  farmerPhone?: string;
  farmerEmail?: string;
  [key: string]: unknown;
}

function extractStructuredDataFromJson(rawCall: VoiceGenieApiRawCall): ExtractedData {
  const extracted: ExtractedData = {};
  
  // Extract from rawPayload.answersToQuestion (most reliable)
  if (rawCall.rawPayload?.answersToQuestion) {
    const answers = rawCall.rawPayload.answersToQuestion;
    extracted.cropType = answers.crop || answers.cropType;
    extracted.variety = answers.variety;
    extracted.farmLocation = answers.location || answers.farmLocation;
    
    // Extract quantity (handle quintal conversion)
    if (answers.quantity) {
      const qtyMatch = String(answers.quantity).match(/(\d+)/);
      if (qtyMatch) {
        const qty = parseInt(qtyMatch[1]);
        // Check if it's in quintal (क्विंटल) or kg
        const isQuintal = String(answers.quantity).toLowerCase().includes('quintal') || 
                         String(answers.quantity).includes('क्विंटल');
        extracted.harvestQuantity = isQuintal ? qty * 100 : qty;
      }
    }
    
    // Extract price
    if (answers.price) {
      const priceMatch = String(answers.price).match(/(\d+)/);
      if (priceMatch) {
        extracted.pricePerKg = parseInt(priceMatch[1]);
      }
    }
  }
  
  // Extract from informationGathered
  if (rawCall.informationGathered) {
    Object.assign(extracted, rawCall.informationGathered);
  }
  
  // Extract from rawPayload.informationGathered
  if (rawCall.rawPayload?.informationGathered) {
    Object.assign(extracted, rawCall.rawPayload.informationGathered);
  }
  
  // Extract from customerSpecificData
  if (rawCall.rawPayload?.customerSpecificData) {
    const csData = rawCall.rawPayload.customerSpecificData;
    extracted.farmerName = csData.Name || csData.name || extracted.farmerName;
    extracted.farmerPhone = csData.PhoneNumber || csData.phone || extracted.farmerPhone;
    extracted.farmerEmail = csData.Email || csData.email || extracted.farmerEmail;
  }
  
  // Extract from answers array/object
  if (rawCall.answers) {
    if (Array.isArray(rawCall.answers)) {
      rawCall.answers.forEach((answer: any) => {
        if (typeof answer === 'object') {
          Object.assign(extracted, answer);
        }
      });
    } else if (typeof rawCall.answers === 'object') {
      Object.assign(extracted, rawCall.answers);
    }
  }
  
  return extracted;
}

/**
 * Save call data to database cache with efficient JSON extraction
 */
async function saveCallToCache(rawCall: VoiceGenieApiRawCall, mappedCall: VoiceGenieCall, geminiExtracted: boolean = false): Promise<void> {
  try {
    // Extract structured data from JSON for better storage
    const structuredData = extractStructuredDataFromJson(rawCall);
    
    // Merge with mapped call data (Gemini data takes priority)
    const finalCollectedData = {
      ...structuredData,
      ...(mappedCall.collectedData || {})
    };
    
    // Prepare cache data with extracted JSON values
    interface CacheDataRow {
      call_id: string;
      phone_number?: string | null;
      farmer_name?: string | null;
      farmer_location?: string | null;
      language?: string;
      status?: string;
      raw_call_data?: unknown;
      transcript?: string | null;
      call_summary?: string | null;
      call_duration?: number | null;
      call_recording_url?: string | null;
      received_at?: string | null;
      collected_data?: Record<string, unknown>;
      confidence_score?: number | null;
      validation_errors?: string[];
      uncertain_fields?: string[];
      notes?: string | null;
      gemini_extracted?: boolean;
      gemini_extracted_at?: string | null;
    }
    
    const cacheData: CacheDataRow = {
      call_id: rawCall._id,
      phone_number: rawCall.phoneNumber || structuredData.farmerPhone || null,
      farmer_name: mappedCall.farmerName || structuredData.farmerName || null,
      farmer_location: mappedCall.farmerLocation || structuredData.farmLocation || structuredData.location || null,
      language: mappedCall.language || rawCall.informationGathered?.language || rawCall.rawPayload?.informationGathered?.language || 'hi',
      status: mappedCall.status || rawCall.status || 'pending',
      
      // Store raw JSON for reference
      raw_call_data: rawCall || null,
      transcript: rawCall.transcript || null,
      call_summary: rawCall.callSummary || rawCall.rawPayload?.callSummary || null,
      call_duration: rawCall.duration || null,
      call_recording_url: mappedCall.callRecordingUrl || null,
      received_at: rawCall.receivedAt || rawCall.createdAt || null,
      
      // Store extracted structured data (merged from JSON + Gemini)
      collected_data: finalCollectedData,
      confidence_score: mappedCall.confidenceScore || null,
      validation_errors: mappedCall.validationErrors || [],
      uncertain_fields: mappedCall.uncertainFields || [],
      notes: mappedCall.notes || null,
      
      // Gemini extraction metadata
      gemini_extracted: geminiExtracted,
      gemini_extracted_at: geminiExtracted ? new Date().toISOString() : null,
    };

    logger.debug('💾 Saving to database - cacheData:', {
      call_id: cacheData.call_id,
      gemini_extracted: cacheData.gemini_extracted,
      collected_data_keys: cacheData.collected_data ? Object.keys(cacheData.collected_data) : [],
      cropType: cacheData.collected_data?.cropType,
      variety: cacheData.collected_data?.variety,
      collected_data_full: cacheData.collected_data ? JSON.stringify(cacheData.collected_data, null, 2) : 'empty'
    });
    
    // Try to insert first
    const { data: insertData, error: insertError } = await supabase
      .from('voicegenie_calls')
      .insert(cacheData)
      .select<VoiceGenieCallRow>();
    
    // If insert fails due to conflict (unique constraint), update instead
    if (insertError) {
      if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
        // Record exists, update it (especially important for Gemini data)
        logger.debug('🔄 Call already exists, updating with latest data (including Gemini)...');
        const { data: updateData, error: updateError } = await supabase
          .from('voicegenie_calls')
          .update(cacheData)
          .eq('call_id', rawCall._id)
          .select<VoiceGenieCallRow>();
        
        if (updateError) {
          logger.error('❌ Failed to update cache:', updateError);
          throw updateError; // Throw so caller knows it failed
        } else {
          logger.debug('✅ Updated cached call data in database:', rawCall._id);
          logger.debug('📊 Updated record ID:', updateData?.[0]?.id);
          logger.debug('📊 Gemini extracted flag in DB:', updateData?.[0]?.gemini_extracted);
          logger.debug('📊 Collected data in DB:', updateData?.[0]?.collected_data ? Object.keys(updateData[0].collected_data) : 'empty');
        }
      } else {
        logger.error('❌ Failed to save to cache:', insertError);
        throw insertError; // Throw so caller knows it failed
      }
    } else {
      logger.debug('✅ Successfully inserted call data to database:', rawCall._id);
      logger.debug('📊 Inserted record ID:', insertData?.[0]?.id);
      logger.debug('📊 Gemini extracted flag in DB:', insertData?.[0]?.gemini_extracted);
      logger.debug('📊 Collected data in DB:', insertData?.[0]?.collected_data ? Object.keys(insertData[0].collected_data) : 'empty');
      logger.debug('📊 Full collected_data saved:', JSON.stringify(finalCollectedData, null, 2));
    }
  } catch (error) {
    logger.warn('⚠️ Error saving to cache:', error);
  }
}

/**
 * Map VoiceGenie API raw call to our VoiceGenieCall format
 * Checks database cache first to avoid unnecessary Gemini API calls
 */
async function mapRawCallToVoiceGenieCall(rawCall: VoiceGenieApiRawCall): Promise<VoiceGenieCall> {
  logger.debug('🔄 Mapping raw call:', rawCall._id);
  
  // Check database cache first
  const cachedData = await getCachedCallData(rawCall._id);
  if (cachedData && cachedData.gemini_extracted && cachedData.collected_data) {
    logger.debug('✅ Using cached data (Gemini already extracted)');
    logger.debug('📊 Cached collected_data:', {
      keys: Object.keys(cachedData.collected_data || {}),
      cropType: cachedData.collected_data?.cropType,
      variety: cachedData.collected_data?.variety,
      fullData: JSON.stringify(cachedData.collected_data, null, 2)
    });
    return {
      id: cachedData.call_id,
      phone: cachedData.phone_number,
      farmerName: cachedData.farmer_name,
      farmerLocation: cachedData.farmer_location,
      language: cachedData.language,
      status: cachedData.status,
      collectedData: cachedData.collected_data,
      confidenceScore: cachedData.confidence_score,
      callDuration: cachedData.call_duration,
      callRecordingUrl: cachedData.call_recording_url,
      timestamp: cachedData.received_at,
      validationErrors: cachedData.validation_errors || [],
      uncertainFields: cachedData.uncertain_fields || [],
      notes: cachedData.notes,
    };
  }
  
  // Extract collected data from multiple sources
  let collectedData: any = {};
  let geminiExtracted = false;
  
  // Priority 0: Use Gemini AI to extract structured data from transcript
  // Only if not already cached and daily quota not exceeded
  if (rawCall.transcript && rawCall.transcript.length > 0 && !geminiDailyQuotaExceeded && !cachedData?.gemini_extracted) {
    try {
      logger.debug('🤖 Extracting data using Gemini AI from transcript...');
      const geminiData = await extractCropDataFromTranscript(
        rawCall.transcript,
        rawCall.callSummary || rawCall.rawPayload?.callSummary
      );
      
      if (geminiData && Object.keys(geminiData).length > 0) {
        logger.debug('✅ Gemini extracted data:', geminiData);
        geminiExtracted = true;
        // Merge Gemini data (it's the most reliable source)
        Object.assign(collectedData, geminiData);
        // Remove confidence from collectedData (it's metadata, not crop data)
        if (collectedData.confidence) {
          delete collectedData.confidence;
        }
        
        // Log that Gemini data was extracted (will be saved at end of function)
        logger.debug('💾 Gemini data extracted - will be saved to database cache');
      }
    } catch (geminiError: any) {
      // Check if it's a daily quota error (not just rate limit)
      const isDailyQuotaExceeded = geminiError?.message?.includes('daily') || 
                                    geminiError?.message?.includes('quota') ||
                                    (geminiError?.message?.includes('429') && geminiError?.message?.includes('20')) ||
                                    geminiError?.message?.includes('20 requests');
      
      if (isDailyQuotaExceeded) {
        geminiDailyQuotaExceeded = true; // Set global flag
        logger.warn('⚠️ Gemini daily quota exceeded (20 requests/day). Skipping Gemini extraction for remaining calls and using manual extraction only.');
      } else {
        logger.warn('⚠️ Gemini extraction failed, falling back to manual extraction:', geminiError);
      }
    }
  } else if (geminiDailyQuotaExceeded) {
    logger.debug('⏭️ Skipping Gemini extraction (daily quota exceeded), using manual extraction only');
  } else if (cachedData?.gemini_extracted) {
    logger.debug('⏭️ Skipping Gemini extraction (already cached), using cached data');
  }
  
  // Priority 1: Extract structured data from JSON (efficient extraction)
  // Only merge if Gemini hasn't already extracted (to preserve Gemini data)
  const jsonExtractedData = extractStructuredDataFromJson(rawCall);
  if (Object.keys(jsonExtractedData).length > 0) {
    logger.debug('📋 Extracted data from JSON:', jsonExtractedData);
    // Only merge fields that don't already exist (don't overwrite Gemini data)
    Object.keys(jsonExtractedData).forEach(key => {
      if (!collectedData[key] || (geminiExtracted && ['cropType', 'variety', 'harvestQuantity', 'sowingDate', 'harvestDate', 'pricePerKg'].includes(key))) {
        // If Gemini extracted, don't overwrite critical fields
        if (!geminiExtracted || !['cropType', 'variety', 'harvestQuantity', 'sowingDate', 'harvestDate', 'pricePerKg'].includes(key)) {
          collectedData[key] = jsonExtractedData[key];
        }
      }
    });
  }
  
  // Priority 2: Extract from answersToQuestion (most structured data)
  if (rawCall.rawPayload?.answersToQuestion) {
    const answers = rawCall.rawPayload.answersToQuestion;
    logger.debug('📋 Found answersToQuestion:', answers);
    
    // Map answers to our collectedData format (only if not already set)
    if (answers.crop && !collectedData.cropType) {
      collectedData.cropType = answers.crop;
    }
    if (answers.quantity && !collectedData.harvestQuantity) {
      // Extract number from quantity string (e.g., "50 क्विंटल" -> 50)
      const qtyMatch = String(answers.quantity).match(/(\d+)/);
      if (qtyMatch) {
        const qty = parseInt(qtyMatch[1]);
        const isQuintal = String(answers.quantity).toLowerCase().includes('quintal') || 
                         String(answers.quantity).includes('क्विंटल');
        collectedData.harvestQuantity = isQuintal ? qty * 100 : qty;
      }
    }
    if (answers.location && !collectedData.farmLocation) {
      collectedData.farmLocation = answers.location;
    }
    if (answers.variety && !collectedData.variety) {
      collectedData.variety = answers.variety;
    }
    if (answers.price && !collectedData.pricePerKg) {
      const priceMatch = String(answers.price).match(/(\d+)/);
      if (priceMatch) {
        collectedData.pricePerKg = parseInt(priceMatch[1]);
      }
    }
  }
  
  // Priority 3: Extract from top-level answers field
  // Only merge if Gemini hasn't already extracted critical fields
  if (rawCall.answers) {
    logger.debug('📋 Found answers field:', rawCall.answers);
    const mergeAnswers = (answers: any) => {
      Object.keys(answers).forEach(key => {
        // If Gemini extracted, don't overwrite critical fields
        if (!geminiExtracted || !['cropType', 'variety', 'harvestQuantity', 'sowingDate', 'harvestDate', 'pricePerKg'].includes(key)) {
          if (!collectedData[key]) {
            collectedData[key] = answers[key];
          }
        }
      });
    };
    
    if (typeof rawCall.answers === 'object' && !Array.isArray(rawCall.answers)) {
      mergeAnswers(rawCall.answers);
    } else if (Array.isArray(rawCall.answers)) {
      rawCall.answers.forEach((answer: any) => {
        if (typeof answer === 'object') {
          mergeAnswers(answer);
        }
      });
    }
  }
  
  // Priority 4: Extract from rawPayload.customerSpecificData
  if (rawCall.rawPayload?.customerSpecificData) {
    const csData = rawCall.rawPayload.customerSpecificData;
    logger.debug('📋 Found customerSpecificData:', csData);
    
    // Extract farmer name
    if (csData.Name && !collectedData.farmerName) {
      collectedData.farmerName = csData.Name;
    }
    
    // Merge other customer data (don't overwrite existing)
    Object.keys(csData).forEach(key => {
      if (!collectedData[key]) {
        collectedData[key] = csData[key];
      }
    });
  }
  
  // Priority 5: Extract from informationGathered
  if (rawCall.informationGathered || rawCall.rawPayload?.informationGathered) {
    const info = rawCall.informationGathered || rawCall.rawPayload.informationGathered;
    logger.debug('📋 Found informationGathered:', info);
    
    if (info.language && !collectedData.language) {
      collectedData.language = info.language.toLowerCase();
    }
  }
  
  // Priority 5: Try to parse callSummary for additional data
  const summary = rawCall.callSummary || rawCall.rawPayload?.callSummary;
  if (summary) {
    logger.debug('📋 Found callSummary:', summary);
    
    // Try to extract structured data from summary text
    // Example: "Farmer wants to sell 50 quintals of Basmati rice from Nagpur"
    const cropMatch = summary.match(/(Rice|Wheat|Maize|Turmeric|Black Gram|Green Chili|Coconut|Basmati|rice|wheat|maize|turmeric)/i);
    if (cropMatch && !collectedData.cropType) {
      const crop = cropMatch[1];
      collectedData.cropType = crop.charAt(0).toUpperCase() + crop.slice(1).toLowerCase();
      if (collectedData.cropType.toLowerCase() === 'basmati') {
        collectedData.cropType = 'Rice';
        collectedData.variety = 'Basmati';
      }
    }
    
    const qtyMatch = summary.match(/(\d+)\s*(quintal|kg|क्विंटल)/i);
    if (qtyMatch && !collectedData.harvestQuantity) {
      const qty = parseInt(qtyMatch[1]);
      collectedData.harvestQuantity = qtyMatch[2].toLowerCase().includes('quintal') || qtyMatch[2].includes('क्विंटल') 
        ? qty * 100 
        : qty;
    }
  }
  
  // Extract farmer name from multiple sources
  const farmerName = rawCall.rawPayload?.customerSpecificData?.Name ||
                    rawCall.rawPayload?.customerSpecificData?.farmerName ||
                    rawCall.rawPayload?.customerSpecificData?.fullName ||
                    rawCall.rawPayload?.customerSpecificData?.name ||
                    collectedData.farmerName ||
                    collectedData.Name ||
                    undefined;
  
  // Extract location
  const farmerLocation = collectedData.farmLocation ||
                        collectedData.location ||
                        rawCall.rawPayload?.answersToQuestion?.location ||
                        undefined;
  
  // Extract language
  const language = collectedData.language ||
                  rawCall.informationGathered?.language?.toLowerCase() ||
                  rawCall.rawPayload?.informationGathered?.language?.toLowerCase() ||
                  'hi';
  
  // Calculate confidence score based on data completeness
  // Use Gemini confidence if available, otherwise calculate
  let confidenceScore = collectedData.geminiConfidence || 0.5;
  
  const dataFields = Object.keys(collectedData).filter(k => collectedData[k] && k !== 'geminiConfidence');
  if (dataFields.length >= 5) {
    confidenceScore = Math.max(confidenceScore, 0.9);
  } else if (dataFields.length >= 3) {
    confidenceScore = Math.max(confidenceScore, 0.7);
  } else if (dataFields.length >= 1) {
    confidenceScore = Math.max(confidenceScore, 0.6);
  }
  
  // If we have answersToQuestion, increase confidence
  if (rawCall.rawPayload?.answersToQuestion && Object.keys(rawCall.rawPayload.answersToQuestion).length > 0) {
    confidenceScore = Math.max(confidenceScore, 0.85);
  }
  
  // Remove geminiConfidence from collectedData if it exists
  if (collectedData.geminiConfidence) {
    delete collectedData.geminiConfidence;
  }
  
  // Ensure cropType and variety are preserved if they exist
  if (geminiExtracted) {
    logger.debug('🔒 Gemini extracted - preserving critical fields:', {
      cropType: collectedData.cropType,
      variety: collectedData.variety,
      hasCropType: !!collectedData.cropType,
      hasVariety: !!collectedData.variety
    });
  }
  
  logger.debug('✅ Mapped collectedData:', collectedData);
  logger.debug('✅ Confidence score:', confidenceScore);
  logger.debug('✅ Gemini extracted:', geminiExtracted);
  logger.debug('📊 Final collectedData keys:', Object.keys(collectedData));
  logger.debug('📊 Final collectedData:', JSON.stringify(collectedData, null, 2));
  logger.debug('🔍 CropType value:', collectedData.cropType, 'Type:', typeof collectedData.cropType);
  logger.debug('🔍 Variety value:', collectedData.variety, 'Type:', typeof collectedData.variety);
  
  const mappedCall: VoiceGenieCall = {
    id: rawCall._id,
    phone: rawCall.phoneNumber || rawCall.rawPayload?.customerSpecificData?.PhoneNumber || '',
    farmerName: farmerName,
    farmerLocation: farmerLocation,
    language: language,
    status: rawCall.status || rawCall.rawPayload?.callStatus || 'unknown',
    collectedData: Object.keys(collectedData).length > 0 ? collectedData : undefined,
    confidenceScore: confidenceScore,
    callDuration: rawCall.duration || parseInt(rawCall.rawPayload?.duration || '0'),
    timestamp: rawCall.receivedAt || rawCall.createdAt || new Date().toISOString(),
    validationErrors: [],
    uncertainFields: [],
    notes: summary || undefined
  };
  
  // Save to database cache - WAIT for it to complete to ensure data is stored
  logger.debug('💾 Saving call data to database cache...');
  logger.debug('📊 Saving details:', {
    call_id: rawCall._id,
    gemini_extracted: geminiExtracted,
    has_collected_data: !!mappedCall.collectedData,
    collected_data_keys: mappedCall.collectedData ? Object.keys(mappedCall.collectedData) : [],
    collected_data_size: mappedCall.collectedData ? Object.keys(mappedCall.collectedData).length : 0
  });
  
  try {
    await saveCallToCache(rawCall, mappedCall, geminiExtracted);
    logger.debug('✅ Successfully saved call data to database cache:', rawCall._id);
    logger.debug('✅ Gemini extracted flag saved:', geminiExtracted);
    logger.debug('✅ Collected data saved:', mappedCall.collectedData ? 'Yes' : 'No');
  } catch (err) {
    logger.error('❌ Failed to save cache:', err);
    // Don't throw - continue even if cache save fails, but log the error
  }
  
  return mappedCall;
}

/**
 * Fetch all calls from VoiceGenie API
 */
export async function fetchVoiceGenieCalls(): Promise<VoiceGenieCall[]> {
  try {
    // TEMPORARY: Use test data if enabled (set to false to use real API)
    const USE_TEST_DATA = import.meta.env.VITE_USE_VOICEGENIE_TEST_DATA === 'true';
    
    if (USE_TEST_DATA) {
      logger.debug('🧪 Using test data instead of API');
      try {
        // Try to load test data from public folder or use inline test data
        const testResponse = {
          success: true,
          count: 3,
          data: [
            {
              _id: "694cd08a1f85bd8ffff17d99",
              phoneNumber: "+919876543210",
              status: "Ended",
              duration: 180,
              transcript: [],
              callSummary: "Farmer registered Basmati rice crop. Harvested 500 kg.",
              rawPayload: {
                customerSpecificData: {
                  PhoneNumber: "+919876543210",
                  farmerName: "Rajesh Kumar",
                  location: "Bhubaneswar, Odisha",
                  language: "hi",
                  cropType: "Rice",
                  variety: "Basmati",
                  harvestQuantity: 500,
                  sowingDate: "2025-06-01",
                  harvestDate: "2025-12-15",
                  pricePerKg: 80,
                  certification: "Organic",
                  grading: "Grade A",
                  labTest: "Passed - No pesticides detected",
                  freshnessDuration: 7
                },
                callStatus: "Ended",
                confidenceScore: 0.95
              },
              receivedAt: "2025-12-25T10:05:00.000Z",
              createdAt: "2025-12-25T10:05:00.000Z",
              updatedAt: "2025-12-25T10:05:00.000Z"
            },
            {
              _id: "694cd08a1f85bd8ffff17d98",
              phoneNumber: "+919123456789",
              status: "Ended",
              duration: 200,
              transcript: [],
              callSummary: "Farmer registered Turmeric crop. Harvested 300 kg.",
              rawPayload: {
                customerSpecificData: {
                  PhoneNumber: "+919123456789",
                  farmerName: "Priya Devi",
                  location: "Cuttack, Odisha",
                  language: "hi",
                  cropType: "Turmeric",
                  variety: "Lakadong",
                  harvestQuantity: 300,
                  sowingDate: "2025-05-15",
                  harvestDate: "2025-12-10",
                  pricePerKg: 120,
                  certification: "Organic",
                  grading: "Premium",
                  labTest: "Passed - High curcumin content",
                  freshnessDuration: 10
                },
                callStatus: "Ended",
                confidenceScore: 0.92
              },
              receivedAt: "2025-12-25T11:05:00.000Z",
              createdAt: "2025-12-25T11:05:00.000Z",
              updatedAt: "2025-12-25T11:05:00.000Z"
            },
            {
              _id: "694cd08a1f85bd8ffff17d97",
              phoneNumber: "+919765432109",
              status: "Ended",
              duration: 150,
              transcript: [],
              callSummary: "Farmer registered Wheat crop. Harvested 1000 kg.",
              rawPayload: {
                customerSpecificData: {
                  PhoneNumber: "+919765432109",
                  farmerName: "Amit Singh",
                  location: "Sambalpur, Odisha",
                  language: "hi",
                  cropType: "Wheat",
                  variety: "HD-3086",
                  harvestQuantity: 1000,
                  sowingDate: "2025-11-01",
                  harvestDate: "2025-12-20",
                  pricePerKg: 25,
                  certification: "Standard",
                  grading: "Grade A",
                  labTest: "Passed - Quality tested",
                  freshnessDuration: 15
                },
                callStatus: "Ended",
                confidenceScore: 0.88
              },
              receivedAt: "2025-12-25T12:05:00.000Z",
              createdAt: "2025-12-25T12:05:00.000Z",
              updatedAt: "2025-12-25T12:05:00.000Z"
            }
          ]
        };
        
        const mappedCalls = testResponse.data.map(mapRawCallToVoiceGenieCall);
        logger.debug('✅ Test data loaded:', mappedCalls);
        return mappedCalls;
      } catch (error) {
        logger.error('Failed to load test data:', error);
        // Fall through to real API
      }
    }
    
    logger.debug('🔍 Fetching calls from VoiceGenie API...');
    
    // API endpoint - GET request, no authentication needed
    const url = `${VOICEGENIE_API_BASE_URL}/calls`;
    
    logger.debug('📡 Fetching from:', url);
    
    // Simple GET request - no headers needed for public API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    logger.debug('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ VoiceGenie API error:', response.status, errorText);
      throw new Error(`Failed to fetch calls: ${response.status} ${errorText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('VoiceGenie API error:', response.status, errorText);
      throw new Error(`Failed to fetch calls: ${response.status} ${errorText}`);
    }

    const responseText = await response.text();
    logger.debug('📡 Raw response text:', responseText.substring(0, 500));
    
    let apiResponse: any;
    try {
      apiResponse = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('❌ Failed to parse JSON response:', parseError);
      throw new Error('Invalid JSON response from API');
    }
    
    logger.debug('✅ VoiceGenie API parsed response:', apiResponse);
    logger.debug('📊 Response structure:', {
      success: apiResponse.success,
      count: apiResponse.count,
      hasData: !!apiResponse.data,
      dataLength: apiResponse.data?.length,
      dataType: Array.isArray(apiResponse.data) ? 'array' : typeof apiResponse.data,
      responseKeys: Object.keys(apiResponse)
    });
    
    // Handle the actual API response structure: { success, count, data: [...] }
    if (apiResponse.success === true && apiResponse.data && Array.isArray(apiResponse.data)) {
      logger.debug(`📞 Found ${apiResponse.data.length} calls from API`);
      
      if (apiResponse.data.length === 0) {
        logger.warn('⚠️ API returned empty data array');
        return [];
      }
      
      // Map each call sequentially to avoid rate limiting (Gemini free tier: 5 req/min)
      // Process calls one at a time with delays to respect rate limits
      const mappedCalls: VoiceGenieCall[] = [];
      
      for (let index = 0; index < apiResponse.data.length; index++) {
        const rawCall = apiResponse.data[index];
        logger.debug(`🔄 Mapping call ${index + 1}/${apiResponse.data.length}:`, rawCall._id);
        
        try {
          const mappedCall = await mapRawCallToVoiceGenieCall(rawCall);
          mappedCalls.push(mappedCall);
          
          // Note: Rate limiting is handled inside mapRawCallToVoiceGenieCall when Gemini is called
          // We only add a small delay here to prevent overwhelming the system
          // The actual Gemini rate limiting (15s between calls) is handled in geminiService.ts
          if (index < apiResponse.data.length - 1) {
            const delayMs = 2000; // 2 seconds between processing calls (Gemini has its own 15s delay)
            logger.debug(`⏳ Waiting ${delayMs}ms before processing next call...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (mapError) {
          logger.error(`❌ Error mapping call ${rawCall._id}:`, mapError);
          // Return a basic call structure even if mapping fails
          mappedCalls.push({
            id: rawCall._id || `unknown-${index}`,
            phone: rawCall.phoneNumber || '',
            farmerName: rawCall.rawPayload?.customerSpecificData?.Name || undefined,
            farmerLocation: rawCall.rawPayload?.answersToQuestion?.location || undefined,
            language: rawCall.informationGathered?.language || 'hi',
            status: rawCall.status || 'unknown',
            collectedData: undefined,
            confidenceScore: 0.5,
            callDuration: rawCall.duration || 0,
            timestamp: rawCall.receivedAt || rawCall.createdAt || new Date().toISOString(),
            validationErrors: [],
            uncertainFields: [],
            notes: rawCall.callSummary || undefined
          });
          
          // Still add delay even on error to maintain rate limit
          if (index < apiResponse.data.length - 1) {
            const delayMs = 13000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
      
      logger.debug('✅ Successfully mapped all calls:', mappedCalls.length);
      logger.debug('📋 Mapped calls summary:', mappedCalls.map(c => ({
        id: c.id,
        phone: c.phone,
        farmerName: c.farmerName,
        hasData: !!c.collectedData,
        dataKeys: c.collectedData ? Object.keys(c.collectedData) : [],
        confidence: c.confidenceScore
      })));
      
      return mappedCalls;
    }
    
    // Fallback: Handle different response formats
    if (Array.isArray(apiResponse)) {
      logger.debug('📞 API returned array directly');
      const mappedPromises = apiResponse.map(mapRawCallToVoiceGenieCall);
      return await Promise.all(mappedPromises);
    } else if (apiResponse.calls && Array.isArray(apiResponse.calls)) {
      logger.debug('📞 API returned calls array');
      return apiResponse.calls;
    } else if (apiResponse.call) {
      logger.debug('📞 API returned single call');
      return [apiResponse.call];
    } else {
      logger.error('❌ Unexpected VoiceGenie API response format:', apiResponse);
      logger.error('❌ Response keys:', Object.keys(apiResponse));
      logger.error('❌ Full response:', JSON.stringify(apiResponse, null, 2));
      return [];
    }
  } catch (error) {
    logger.error('Error fetching VoiceGenie calls:', error);
    throw error;
  }
}

/**
 * Fetch a specific call by ID
 */
export async function fetchVoiceGenieCall(callId: string): Promise<VoiceGenieCall | null> {
  if (!VOICEGENIE_API_KEY) {
    throw new Error('VoiceGenie API key is not configured. Please set VITE_VOICEGENIE_API_KEY in your environment variables.');
  }

  try {
    const response = await fetch(`${VOICEGENIE_API_BASE_URL}/calls/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VOICEGENIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch call: ${response.status}`);
    }

    const apiResponse: VoiceGenieApiResponse = await response.json();
    
    // Handle different response formats
    if (apiResponse.data && Array.isArray(apiResponse.data) && apiResponse.data.length > 0) {
      return mapRawCallToVoiceGenieCall(apiResponse.data[0]);
    } else if ('_id' in apiResponse && typeof (apiResponse as VoiceGenieApiRawCall)._id === 'string') {
      return mapRawCallToVoiceGenieCall(apiResponse as VoiceGenieApiRawCall);
    } else if (apiResponse.call) {
      return apiResponse.call;
    }
    
    return null;
  } catch (error) {
    logger.error('Error fetching VoiceGenie call:', error);
    throw error;
  }
}

/**
 * Validate collected data from VoiceGenie call
 */
export function validateVoiceGenieData(collectedData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredFields = ['cropType', 'variety', 'harvestQuantity', 'sowingDate', 'harvestDate', 'pricePerKg'];

  // Check required fields
  for (const field of requiredFields) {
    if (!collectedData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate harvestQuantity
  if (collectedData.harvestQuantity) {
    const qty = parseFloat(collectedData.harvestQuantity);
    if (isNaN(qty) || qty <= 0 || qty > 100000) {
      errors.push('Harvest quantity must be between 1 and 100000 kg');
    }
  }

  // Validate pricePerKg
  if (collectedData.pricePerKg) {
    const price = parseFloat(collectedData.pricePerKg);
    if (isNaN(price) || price <= 0 || price > 10000) {
      errors.push('Price per kg must be between ₹0.01 and ₹10000');
    }
  }

  // Validate dates
  if (collectedData.sowingDate && collectedData.harvestDate) {
    const sowing = new Date(collectedData.sowingDate);
    const harvest = new Date(collectedData.harvestDate);
    
    if (harvest < sowing) {
      errors.push('Harvest date must be after sowing date');
    }
    
    // Warn if harvest date is more than 30 days ago
    const daysSinceHarvest = (Date.now() - harvest.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceHarvest > 30) {
      errors.push('Warning: Harvest date is more than 30 days ago');
    }
  }

  // Validate cropType
  const validCropTypes = ['Rice', 'Wheat', 'Maize', 'Turmeric', 'Black Gram', 'Green Chili', 'Coconut'];
  if (collectedData.cropType && !validCropTypes.includes(collectedData.cropType)) {
    errors.push(`Invalid crop type. Must be one of: ${validCropTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

