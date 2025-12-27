/**
 * Mandi Price API integration for current agricultural commodity prices
 * API: https://agriinfoextractor.onrender.com/api/mandi/price
 */

export interface MarketPriceData {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety?: string;
  grade?: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  price_date: string;
}

export interface MandiPriceAPIResponse {
  state: string;
  district: string;
  market: string;
  commodity: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  date: string;
}

export interface MarketPriceResponse {
  records: MarketPriceData[];
  total: number;
  count: number;
  limit: number;
  offset: number;
}

const BASE_URL = 'https://agriinfoextractor.onrender.com/api/mandi/price';

/**
 * Map crop types to commodity names for the API
 */
function mapCropTypeToCommodity(cropType: string): string {
  const commodityMap: Record<string, string> = {
    'Rice': 'Rice',
    'Wheat': 'Wheat',
    'Maize': 'Maize',
    'Turmeric': 'Turmeric',
    'Black Gram': 'Black Gram',
    'Green Chili': 'Green Chili',
    'Coconut': 'Coconut',
    'Onion': 'Onion',
    'Tomato': 'Tomato',
    'Potato': 'Potato',
  };
  
  return commodityMap[cropType] || cropType;
}

/**
 * Fetch current market prices for agricultural commodities from Mandi Price API
 */
export async function fetchMarketPrices(options: {
  commodity?: string;
  variety?: string;
  state?: string;
  district?: string;
  market?: string;
  grade?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<MarketPriceResponse> {
  try {
    // Require state, district, and commodity for the new API
    if (!options.state || !options.district || !options.commodity) {
      console.warn('⚠️ Missing required parameters: state, district, or commodity');
      return {
        records: [],
        total: 0,
        count: 0,
        limit: options.limit || 10,
        offset: options.offset || 0,
      };
    }

    const commodity = mapCropTypeToCommodity(options.commodity);
    const params = new URLSearchParams({
      state: options.state,
      district: options.district,
      commodity: commodity,
    });

    const url = `${BASE_URL}?${params.toString()}`;
    console.log('🔍 Fetching mandi prices from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MandiPriceAPIResponse = await response.json();
    console.log('📊 Mandi price API response:', data);

    // Convert API response to MarketPriceData format
    const marketPriceData: MarketPriceData = {
      state: data.state,
      district: data.district,
      market: data.market,
      commodity: data.commodity,
      min_price: data.minPrice,
      max_price: data.maxPrice,
      modal_price: data.modalPrice,
      price_date: data.date,
      };

    return {
      records: [marketPriceData],
      total: 1,
      count: 1,
      limit: options.limit || 10,
      offset: options.offset || 0,
    };
  } catch (error) {
    console.error('❌ Error fetching market prices:', error);
    throw new Error(`Failed to fetch market prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fallback market data for common crops when API is unavailable
 */
const FALLBACK_MARKET_DATA: Record<string, MarketPriceData[]> = {
  'Rice': [
    {
      state: 'Odisha',
      district: 'Khordha',
      market: 'Bhubaneswar',
      commodity: 'Rice',
      variety: 'Basmati',
      grade: 'A',
      min_price: 2500,
      max_price: 3200,
      modal_price: 2850,
      price_date: new Date().toISOString().split('T')[0],
    },
    {
      state: 'Odisha',
      district: 'Cuttack',
      market: 'Cuttack',
      commodity: 'Rice',
      variety: 'Basmati',
      grade: 'A',
      min_price: 2400,
      max_price: 3100,
      modal_price: 2750,
      price_date: new Date().toISOString().split('T')[0],
    },
    {
      state: 'Odisha',
      district: 'Puri',
      market: 'Puri',
      commodity: 'Rice',
      variety: 'Sona Masuri',
      grade: 'A',
      min_price: 2200,
      max_price: 2800,
      modal_price: 2500,
      price_date: new Date().toISOString().split('T')[0],
    },
  ],
  'Wheat': [
    {
      state: 'Odisha',
      district: 'Khordha',
      market: 'Bhubaneswar',
      commodity: 'Wheat',
      variety: 'Durum',
      grade: 'A',
      min_price: 2000,
      max_price: 2500,
      modal_price: 2250,
      price_date: new Date().toISOString().split('T')[0],
    },
  ],
  'Maize': [
    {
      state: 'Odisha',
      district: 'Khordha',
      market: 'Bhubaneswar',
      commodity: 'Maize',
      variety: 'Hybrid',
      grade: 'A',
      min_price: 1800,
      max_price: 2200,
      modal_price: 2000,
      price_date: new Date().toISOString().split('T')[0],
    },
  ],
  'Tomato': [
    {
      state: 'Odisha',
      district: 'Khordha',
      market: 'Bhubaneswar',
      commodity: 'Tomato',
      variety: 'Hybrid',
      grade: 'A',
      min_price: 1500,
      max_price: 2500,
      modal_price: 2000,
      price_date: new Date().toISOString().split('T')[0],
    },
  ],
  'Onion': [
    {
      state: 'Odisha',
      district: 'Khordha',
      market: 'Bhubaneswar',
      commodity: 'Onion',
      variety: 'Red',
      grade: 'A',
      min_price: 1200,
      max_price: 1800,
      modal_price: 1500,
      price_date: new Date().toISOString().split('T')[0],
    },
  ],
  'Potato': [
    {
      state: 'Odisha',
      district: 'Khordha',
      market: 'Bhubaneswar',
      commodity: 'Potato',
      variety: 'Kufri',
      grade: 'A',
      min_price: 800,
      max_price: 1200,
      modal_price: 1000,
      price_date: new Date().toISOString().split('T')[0],
    },
  ],
};

/**
 * Get price suggestions for a specific crop and variety
 */
export async function getPriceSuggestions(
  cropType: string,
  variety?: string,
  state?: string,
  district?: string
): Promise<{
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  suggestions: MarketPriceData[];
}> {
  try {
    const response = await fetchMarketPrices({
      commodity: cropType,
      variety: variety,
      state: state,
      district: district,
      limit: 20,
    });

    // If API returns no data, use fallback data
    if (response.records.length === 0) {
      console.log('🔄 Using fallback market data for:', cropType);
      const fallbackData = FALLBACK_MARKET_DATA[cropType] || [];
      
      if (fallbackData.length === 0) {
        return {
          minPrice: 0,
          maxPrice: 0,
          averagePrice: 0,
          suggestions: [],
        };
      }

      // Filter by variety if specified
      const filteredData = variety 
        ? fallbackData.filter(item => item.variety.toLowerCase().includes(variety.toLowerCase()))
        : fallbackData;

      if (filteredData.length === 0) {
        return {
          minPrice: 0,
          maxPrice: 0,
          averagePrice: 0,
          suggestions: fallbackData,
        };
      }

      const prices = filteredData.map(record => record.modal_price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

      return {
        minPrice: Math.round(minPrice),
        maxPrice: Math.round(maxPrice),
        averagePrice: Math.round(averagePrice),
        suggestions: filteredData,
      };
    }

    // Use the actual min_price, max_price, and modal_price from API response
    // The API already provides these values, so use them directly
    if (response.records.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        averagePrice: 0,
        suggestions: response.records,
      };
    }

    // Get the first record (API returns single record)
    const record = response.records[0];
    
    // Use the actual min_price, max_price from the API response
    const minPrice = record.min_price || 0;
    const maxPrice = record.max_price || 0;
    const modalPrice = record.modal_price || 0;
    
    // Use modal_price as averagePrice (since API doesn't provide average, modal is the most common price)
    const averagePrice = modalPrice;

    console.log('📊 Using API prices directly:', { minPrice, maxPrice, modalPrice, averagePrice });

    return {
      minPrice: Math.round(minPrice),
      maxPrice: Math.round(maxPrice),
      averagePrice: Math.round(averagePrice),
      suggestions: response.records,
    };
  } catch (error) {
    console.error('❌ Error getting price suggestions:', error);
    
    // Use fallback data on error
    console.log('🔄 Using fallback market data due to error for:', cropType);
    const fallbackData = FALLBACK_MARKET_DATA[cropType] || [];
    
    if (fallbackData.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        averagePrice: 0,
        suggestions: [],
      };
    }

    const prices = fallbackData.map(record => record.modal_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    return {
      minPrice: Math.round(minPrice),
      maxPrice: Math.round(maxPrice),
      averagePrice: Math.round(averagePrice),
      suggestions: fallbackData,
    };
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}/quintal`;
}

/**
 * Get price range text
 */
export function getPriceRangeText(minPrice: number, maxPrice: number, averagePrice: number): string {
  if (minPrice === 0 && maxPrice === 0) {
    return 'No price data available';
  }
  
  if (minPrice === maxPrice) {
    return `Current market price: ${formatPrice(minPrice)}`;
  }
  
  return `Market range: ${formatPrice(minPrice)} - ${formatPrice(maxPrice)} (Avg: ${formatPrice(averagePrice)})`;
}
