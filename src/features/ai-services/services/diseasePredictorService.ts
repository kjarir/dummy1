/**
 * Disease Predictor API Service
 * Sends crop images to detect diseases and get health remarks
 */

const DISEASE_PREDICTOR_API_URL = 'https://diseasepredictor-silr.onrender.com/predict';

export interface DiseasePredictionResponse {
  disease?: string;
  confidence?: number;
  healthStatus?: string;
  remarks?: string;
  recommendations?: string[];
  [key: string]: any; // Allow for additional fields from API
}

/**
 * Predict crop disease from image
 */
export async function predictCropDisease(imageFile: File): Promise<DiseasePredictionResponse> {
  try {
    console.log('🌱 Sending crop image to disease predictor API...');
    console.log('📸 Image file:', imageFile.name, imageFile.size, 'bytes');

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(DISEASE_PREDICTOR_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Disease predictor API error:', response.status, errorText);
      throw new Error(`Disease predictor API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Disease prediction API response received');
    console.log('📊 Full API Response:', JSON.stringify(result, null, 2));
    console.log('📊 Response Keys:', Object.keys(result));
    console.log('📊 Response Type:', typeof result);
    
    // Log specific fields
    console.log('🌱 Disease:', result.disease || result.predicted_disease || result.class || 'Not found');
    console.log('📈 Confidence:', result.confidence || result.confidence_score || result.probability || 'Not found');
    console.log('💚 Health Status:', result.health_status || result.status || result.healthStatus || 'Not found');
    console.log('📝 Remarks:', result.remarks || result.comment || result.description || result.message || 'Not found');
    console.log('💡 Recommendations:', result.recommendations || result.suggestions || result.advice || 'Not found');

    // Normalize the response
    const normalized: DiseasePredictionResponse = {
      disease: result.disease || result.predicted_disease || result.class || null,
      confidence: result.confidence || result.confidence_score || result.probability || null,
      healthStatus: result.health_status || result.status || result.healthStatus || null,
      remarks: result.remarks || result.comment || result.description || result.message || null,
      recommendations: result.recommendations || result.suggestions || result.advice || null,
    };

    // Copy any additional fields
    Object.keys(result).forEach((key) => {
      if (!normalized.hasOwnProperty(key)) {
        normalized[key] = result[key];
      }
    });

    console.log('✅ Normalized Disease Data:', JSON.stringify(normalized, null, 2));
    return normalized;
  } catch (error) {
    console.error('❌ Error predicting crop disease:', error);
    throw error;
  }
}

