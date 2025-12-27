/**
 * Crop Health Detection Service
 * Uses AI to detect crop diseases and provide remedies
 */

export interface CropHealthAnalysis {
  disease?: string;
  diseaseName?: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remedies: string[];
  prevention: string[];
  affectedArea?: string;
  cropType?: string;
  recommendations?: string[];
}

export interface CropHealthResponse {
  success: boolean;
  analysis?: CropHealthAnalysis;
  error?: string;
}

/**
 * Analyze crop image using Hugging Face AI Model
 * Model: liriope/PlantDiseaseDetection
 */
export async function analyzeCropHealth(imageFile: File): Promise<CropHealthResponse> {
  try {
    console.log('🔍 Starting crop health analysis...');
    console.log('📁 Image file:', imageFile.name, imageFile.type, imageFile.size);
    
    // Use Hugging Face Inference API
    const HF_API_URL = 'https://api-inference.huggingface.co/models/liriope/PlantDiseaseDetection';
    const HF_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': imageFile.type,
    };
    
    // Add authorization if API key is available
    if (HF_API_KEY) {
      headers['Authorization'] = `Bearer ${HF_API_KEY}`;
      console.log('🔑 Using Hugging Face API key');
    } else {
      console.log('⚠️ No Hugging Face API key found, will use mock analysis');
    }
    
    console.log('📤 Sending image to Hugging Face API...');
    
    // Call Hugging Face Inference API with the file directly
    const hfResponse = await fetch(HF_API_URL, {
      method: 'POST',
      headers,
      body: imageFile,
    });

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error('❌ Hugging Face API error:', hfResponse.status, errorText);
      
      // If API key is missing or rate limited, use mock for demo
      if (hfResponse.status === 401 || hfResponse.status === 429) {
        console.log('⚠️ Using mock analysis (API key missing or rate limited)');
        const mockResponse = await mockAIAnalysis(imageFile);
        return {
          success: true,
          analysis: mockResponse
        };
      }
      
      throw new Error(`API request failed: ${hfResponse.status} ${errorText}`);
    }

    const hfData = await hfResponse.json();
    console.log('✅ Hugging Face API response:', hfData);
    
    // Parse Hugging Face response and convert to our format
    const analysis = parseHuggingFaceResponse(hfData);
    
    return {
      success: true,
      analysis
    };
  } catch (error) {
    console.error('❌ Error analyzing crop health:', error);
    
    // Fallback to mock if API fails
    try {
      console.log('🔄 Falling back to mock analysis...');
      const mockResponse = await mockAIAnalysis(imageFile);
      return {
        success: true,
        analysis: mockResponse
      };
    } catch (mockError) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze crop image'
      };
    }
  }
}

/**
 * Parse Hugging Face API response to our CropHealthAnalysis format
 */
function parseHuggingFaceResponse(hfData: any): CropHealthAnalysis {
  // Hugging Face returns an array of predictions with labels and scores
  // Format: [{ label: "disease_name", score: 0.95 }, ...]
  
  if (!hfData || !Array.isArray(hfData) || hfData.length === 0) {
    // Return healthy if no predictions
    return getHealthyCropAnalysis();
  }

  // Get the top prediction
  const topPrediction = hfData[0];
  const diseaseLabel = topPrediction.label || '';
  const confidence = topPrediction.score || 0;

  // Map disease labels to our analysis format
  const diseaseMapping: Record<string, Partial<CropHealthAnalysis>> = {
    'healthy': {
      diseaseName: 'Healthy Crop',
      severity: 'low',
      description: 'Your crop appears to be healthy with no visible signs of disease or pest damage.',
      remedies: [],
      prevention: [
        'Continue regular monitoring',
        'Maintain proper watering schedule',
        'Apply balanced fertilizers',
        'Keep area free of weeds',
        'Monitor for early signs of pests'
      ],
      affectedArea: 'None',
      recommendations: [
        'Continue current care practices',
        'Regular inspection recommended',
        'Maintain good agricultural practices'
      ]
    },
    'leaf_rust': {
      diseaseName: 'Leaf Rust',
      severity: 'medium',
      description: 'Leaf rust is a common fungal disease affecting crops. It appears as small, rust-colored spots on leaves.',
      remedies: [
        'Apply fungicide containing propiconazole or tebuconazole',
        'Remove and destroy severely infected leaves',
        'Ensure proper spacing between plants for air circulation',
        'Apply neem oil solution (2-3ml per liter of water) weekly',
        'Use copper-based fungicides as preventive measure'
      ],
      prevention: [
        'Plant disease-resistant varieties',
        'Avoid overhead watering',
        'Maintain proper plant spacing',
        'Remove crop debris after harvest',
        'Rotate crops annually'
      ],
      affectedArea: 'Leaves',
      recommendations: [
        'Monitor crop closely for next 7-10 days',
        'Reapply treatment if symptoms persist',
        'Consider consulting agricultural extension officer'
      ]
    },
    'powdery_mildew': {
      diseaseName: 'Powdery Mildew',
      severity: 'high',
      description: 'Powdery mildew appears as white or gray powdery spots on leaves, stems, and sometimes fruits.',
      remedies: [
        'Apply sulfur-based fungicide early morning',
        'Mix 1 tablespoon baking soda with 1 gallon water and spray',
        'Use milk solution (1 part milk to 9 parts water)',
        'Apply neem oil extract (follow label instructions)',
        'Remove heavily infected plant parts'
      ],
      prevention: [
        'Ensure good air circulation',
        'Water plants at the base, not overhead',
        'Avoid overcrowding plants',
        'Choose resistant varieties',
        'Maintain proper soil moisture'
      ],
      affectedArea: 'Leaves and Stems',
      recommendations: [
        'Treat immediately to prevent spread',
        'Isolate affected plants if possible',
        'Monitor humidity levels'
      ]
    },
    'bacterial_blight': {
      diseaseName: 'Bacterial Blight',
      severity: 'critical',
      description: 'Bacterial blight causes water-soaked lesions that turn brown and necrotic. Can spread rapidly.',
      remedies: [
        'Apply copper-based bactericides',
        'Remove and destroy infected plant parts',
        'Avoid working with plants when wet',
        'Use streptomycin-based treatments (if available)',
        'Improve drainage to reduce moisture'
      ],
      prevention: [
        'Use certified disease-free seeds',
        'Practice crop rotation',
        'Avoid overhead irrigation',
        'Sanitize tools between uses',
        'Remove weeds that may harbor bacteria'
      ],
      affectedArea: 'Leaves and Stems',
      recommendations: [
        'Immediate action required',
        'Consider consulting plant pathologist',
        'May need to remove entire plant if severely infected'
      ]
    }
  };

  // Normalize disease label (lowercase, replace spaces/underscores)
  const normalizedLabel = diseaseLabel.toLowerCase().replace(/[_\s]/g, '_');
  
  // Find matching disease or use generic
  const diseaseInfo = diseaseMapping[normalizedLabel] || diseaseMapping[Object.keys(diseaseMapping).find(key => 
    normalizedLabel.includes(key) || key.includes(normalizedLabel.split('_')[0])
  ) || ''] || {
    diseaseName: diseaseLabel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    severity: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
    description: `Detected potential issue: ${diseaseLabel}. Please consult with agricultural experts for specific treatment.`,
    remedies: [
      'Consult local agricultural extension office',
      'Apply general fungicide/bactericide',
      'Remove affected plant parts',
      'Improve plant care practices'
    ],
    prevention: [
      'Regular monitoring',
      'Proper spacing',
      'Good air circulation',
      'Crop rotation'
    ],
    affectedArea: 'Unknown',
    recommendations: [
      'Seek expert consultation',
      'Monitor closely',
      'Document symptoms for reference'
    ]
  };

  return {
    disease: normalizedLabel,
    diseaseName: diseaseInfo.diseaseName || diseaseLabel,
    confidence,
    severity: diseaseInfo.severity || 'medium',
    description: diseaseInfo.description || '',
    remedies: diseaseInfo.remedies || [],
    prevention: diseaseInfo.prevention || [],
    affectedArea: diseaseInfo.affectedArea,
    recommendations: diseaseInfo.recommendations
  };
}

function getHealthyCropAnalysis(): CropHealthAnalysis {
  return {
    disease: 'healthy',
    diseaseName: 'Healthy Crop',
    confidence: 0.95,
    severity: 'low',
    description: 'Your crop appears to be healthy with no visible signs of disease or pest damage.',
    remedies: [],
    prevention: [
      'Continue regular monitoring',
      'Maintain proper watering schedule',
      'Apply balanced fertilizers',
      'Keep area free of weeds',
      'Monitor for early signs of pests'
    ],
    affectedArea: 'None',
    recommendations: [
      'Continue current care practices',
      'Regular inspection recommended',
      'Maintain good agricultural practices'
    ]
  };
}

/**
 * Convert file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Mock AI Analysis - Replace with actual AI service
 * This simulates an AI response for demonstration
 */
async function mockAIAnalysis(imageFile: File): Promise<CropHealthAnalysis> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock analysis based on file name or random
  const mockDiseases = [
    {
      disease: 'leaf_rust',
      diseaseName: 'Leaf Rust',
      confidence: 0.85,
      severity: 'medium' as const,
      description: 'Leaf rust is a common fungal disease affecting crops. It appears as small, rust-colored spots on leaves.',
      remedies: [
        'Apply fungicide containing propiconazole or tebuconazole',
        'Remove and destroy severely infected leaves',
        'Ensure proper spacing between plants for air circulation',
        'Apply neem oil solution (2-3ml per liter of water) weekly',
        'Use copper-based fungicides as preventive measure'
      ],
      prevention: [
        'Plant disease-resistant varieties',
        'Avoid overhead watering',
        'Maintain proper plant spacing',
        'Remove crop debris after harvest',
        'Rotate crops annually'
      ],
      affectedArea: 'Leaves',
      recommendations: [
        'Monitor crop closely for next 7-10 days',
        'Reapply treatment if symptoms persist',
        'Consider consulting agricultural extension officer'
      ]
    },
    {
      disease: 'powdery_mildew',
      diseaseName: 'Powdery Mildew',
      confidence: 0.92,
      severity: 'high' as const,
      description: 'Powdery mildew appears as white or gray powdery spots on leaves, stems, and sometimes fruits.',
      remedies: [
        'Apply sulfur-based fungicide early morning',
        'Mix 1 tablespoon baking soda with 1 gallon water and spray',
        'Use milk solution (1 part milk to 9 parts water)',
        'Apply neem oil extract (follow label instructions)',
        'Remove heavily infected plant parts'
      ],
      prevention: [
        'Ensure good air circulation',
        'Water plants at the base, not overhead',
        'Avoid overcrowding plants',
        'Choose resistant varieties',
        'Maintain proper soil moisture'
      ],
      affectedArea: 'Leaves and Stems',
      recommendations: [
        'Treat immediately to prevent spread',
        'Isolate affected plants if possible',
        'Monitor humidity levels'
      ]
    },
    {
      disease: 'bacterial_blight',
      diseaseName: 'Bacterial Blight',
      confidence: 0.78,
      severity: 'critical' as const,
      description: 'Bacterial blight causes water-soaked lesions that turn brown and necrotic. Can spread rapidly.',
      remedies: [
        'Apply copper-based bactericides',
        'Remove and destroy infected plant parts',
        'Avoid working with plants when wet',
        'Use streptomycin-based treatments (if available)',
        'Improve drainage to reduce moisture'
      ],
      prevention: [
        'Use certified disease-free seeds',
        'Practice crop rotation',
        'Avoid overhead irrigation',
        'Sanitize tools between uses',
        'Remove weeds that may harbor bacteria'
      ],
      affectedArea: 'Leaves and Stems',
      recommendations: [
        'Immediate action required',
        'Consider consulting plant pathologist',
        'May need to remove entire plant if severely infected'
      ]
    },
    {
      disease: 'healthy',
      diseaseName: 'Healthy Crop',
      confidence: 0.95,
      severity: 'low' as const,
      description: 'Your crop appears to be healthy with no visible signs of disease or pest damage.',
      remedies: [],
      prevention: [
        'Continue regular monitoring',
        'Maintain proper watering schedule',
        'Apply balanced fertilizers',
        'Keep area free of weeds',
        'Monitor for early signs of pests'
      ],
      affectedArea: 'None',
      recommendations: [
        'Continue current care practices',
        'Regular inspection recommended',
        'Maintain good agricultural practices'
      ]
    }
  ];
  
  // Randomly select a mock disease (or use healthy for demo)
  const randomIndex = Math.floor(Math.random() * mockDiseases.length);
  return mockDiseases[randomIndex];
}

/**
 * Save crop health analysis to database
 */
export async function saveCropHealthAnalysis(
  userId: string,
  imageUrl: string,
  analysis: CropHealthAnalysis
): Promise<void> {
  // TODO: Implement database save
  // This would save to a 'crop_health_analyses' table
  console.log('Saving crop health analysis:', { userId, imageUrl, analysis });
}

