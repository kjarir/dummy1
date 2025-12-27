/**
 * IoT Soil Data API Service
 * Fetches soil data from IoT hardware device
 */

// Use proxy in development, direct URL in production
const IOT_SOIL_API_URL = import.meta.env.DEV 
  ? '/api/iot-soil' 
  : 'https://hardwareapi-4xbs.onrender.com/latest';

export interface SoilDataResponse {
  temperature?: number;
  humidity?: number;
  soilMoisture?: number; // API returns "soilMoisture"
  moisture?: number; // Alias for soilMoisture
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organicMatter?: number;
  ldr?: number; // Light Dependent Resistor value
  gas?: number; // Gas sensor reading
  rain?: number; // Rain sensor reading
  receivedAt?: string; // API returns "receivedAt"
  timestamp?: string; // Alias for receivedAt
  [key: string]: any; // Allow for additional fields from API
}

/**
 * Fetch latest soil data from IoT device with retry logic
 */
export async function fetchSoilData(): Promise<SoilDataResponse> {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌍 Fetching soil data from IoT device... (Attempt ${attempt}/${maxRetries})`);
      console.log('📡 API URL:', IOT_SOIL_API_URL);

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // Try fetch - use proxy in dev, direct URL in production
      let response: Response;
      let apiUrl = IOT_SOIL_API_URL;
      
      try {
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-cache',
        });
      } catch (fetchError: any) {
        // If proxy fails in dev, try direct URL as fallback
        if (import.meta.env.DEV && apiUrl.startsWith('/api/')) {
          console.warn('⚠️ Proxy failed, trying direct URL...');
          apiUrl = 'https://hardwareapi-4xbs.onrender.com/latest';
          response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal,
            credentials: 'omit',
            cache: 'no-cache',
          });
        } else {
          throw fetchError;
        }
      }

      clearTimeout(timeoutId);

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ IoT soil API error:', response.status, errorText);
        
        // If API returns "No data received yet", return empty object
        if (response.status === 200 && errorText.includes('No data')) {
          console.warn('⚠️ No soil data available yet from IoT device');
          return {};
        }
        
        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < maxRetries) {
          console.warn(`⚠️ Server error ${response.status}, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        throw new Error(`IoT soil API failed: ${response.status} - ${errorText}`);
      }

    const result = await response.json();
    console.log('✅ IoT Soil Data API response received');
    console.log('📊 Full API Response:', JSON.stringify(result, null, 2));
    console.log('📊 Response Keys:', Object.keys(result));
    console.log('📊 Response Type:', typeof result);

    // Check if result is valid and has data
    if (!result || typeof result !== 'object') {
      console.warn('⚠️ Invalid response format from IoT API');
      return {};
    }

    // Handle "No data received yet" message (if present)
    if (result.message && typeof result.message === 'string' && result.message.includes('No data')) {
      console.warn('⚠️ No soil data available yet from IoT device');
      console.log('📊 Response Message:', result.message);
      return {};
    }

    // Check if we have at least one sensor reading
    const hasData = result.temperature !== undefined || 
                    result.humidity !== undefined || 
                    result.soilMoisture !== undefined ||
                    result.ldr !== undefined ||
                    result.gas !== undefined ||
                    result.rain !== undefined;

    if (!hasData) {
      console.warn('⚠️ No sensor data found in API response');
      return {};
    }

    // Log specific fields from actual API response
    console.log('🌡️ Temperature:', result.temperature !== undefined ? result.temperature : 'Not found');
    console.log('💧 Humidity:', result.humidity !== undefined ? result.humidity : 'Not found');
    console.log('🌱 Soil Moisture:', result.soilMoisture !== undefined ? result.soilMoisture : 'Not found');
    console.log('☀️ LDR (Light):', result.ldr !== undefined ? result.ldr : 'Not found');
    console.log('💨 Gas:', result.gas !== undefined ? result.gas : 'Not found');
    console.log('🌧️ Rain:', result.rain !== undefined ? result.rain : 'Not found');
    console.log('📅 Received At:', result.receivedAt || 'Not found');

    // Normalize the response - map actual API fields directly (API returns exact field names)
    const normalized: SoilDataResponse = {
      temperature: result.temperature !== undefined ? result.temperature : undefined,
      humidity: result.humidity !== undefined ? result.humidity : undefined,
      soilMoisture: result.soilMoisture !== undefined ? result.soilMoisture : undefined,
      moisture: result.soilMoisture !== undefined ? result.soilMoisture : undefined, // Alias
      ldr: result.ldr !== undefined ? result.ldr : undefined,
      gas: result.gas !== undefined ? result.gas : undefined,
      rain: result.rain !== undefined ? result.rain : undefined,
      receivedAt: result.receivedAt || undefined,
      timestamp: result.receivedAt || undefined,
      // Optional fields that might not be in API response
      ph: result.ph !== undefined ? result.ph : undefined,
      nitrogen: result.nitrogen !== undefined ? result.nitrogen : undefined,
      phosphorus: result.phosphorus !== undefined ? result.phosphorus : undefined,
      potassium: result.potassium !== undefined ? result.potassium : undefined,
      organicMatter: result.organicMatter !== undefined ? result.organicMatter : undefined,
    };

    // Copy any additional fields that aren't already mapped
    Object.keys(result).forEach((key) => {
      if (!normalized.hasOwnProperty(key) && result[key] !== undefined && result[key] !== null) {
        normalized[key] = result[key];
      }
    });

      console.log('✅ Normalized Soil Data:', JSON.stringify(normalized, null, 2));
      console.log('✅ Data validation - Has temperature:', normalized.temperature !== undefined);
      console.log('✅ Data validation - Has humidity:', normalized.humidity !== undefined);
      console.log('✅ Data validation - Has soilMoisture:', normalized.soilMoisture !== undefined);
      console.log('✅ Data validation - Total fields:', Object.keys(normalized).length);
      
      return normalized;
      
    } catch (error: any) {
      console.error(`❌ Error fetching soil data (Attempt ${attempt}/${maxRetries}):`, error);
      console.error('❌ Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        type: typeof error
      });

      // Check if it's a network error or timeout
      if (error?.name === 'AbortError') {
        console.error('❌ Request timed out after 30 seconds');
        if (attempt < maxRetries) {
          console.warn(`⚠️ Retrying after timeout...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
      }

      // Check if it's a network/CORS error
      if (error?.message?.includes('Failed to fetch') || 
          error?.name === 'TypeError' ||
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('CORS')) {
        console.error('❌ Network/CORS error detected');
        if (attempt < maxRetries) {
          console.warn(`⚠️ Network error, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        // On final attempt, return empty object instead of throwing
        console.warn('⚠️ All retry attempts failed. Continuing without soil data.');
        return {};
      }

      // For other errors, if it's the last attempt, return empty object
      if (attempt === maxRetries) {
        console.warn('⚠️ All retry attempts failed. Continuing without soil data.');
        return {};
      }

      // Retry for other errors
      console.warn(`⚠️ Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // If we get here, all retries failed
  console.warn('⚠️ All retry attempts exhausted. Continuing without soil data.');
  return {};
}

