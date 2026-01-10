import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  MapPin, 
  Calendar,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  fetchMarketPrices, 
  getPriceSuggestions, 
  formatPrice, 
  getPriceRangeText,
  type MarketPriceData 
} from '@/features/marketplace/utils/marketPriceAPI';

interface MarketPriceDisplayProps {
  cropType: string;
  variety?: string;
  state?: string;
  district?: string;
  onPriceSelect?: (price: number) => void;
  className?: string;
}

export const MarketPriceDisplay: React.FC<MarketPriceDisplayProps> = ({
  cropType,
  variety,
  state,
  district,
  onPriceSelect,
  className = ''
}) => {
  const [priceData, setPriceData] = useState<{
    minPrice: number;
    maxPrice: number;
    averagePrice: number;
    suggestions: MarketPriceData[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchPrices = React.useCallback(async () => {
    if (!cropType || !state || !district) {
      setError('Please select crop type, state, and district to fetch prices');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      logger.debug('🔄 Fetching mandi prices for:', { cropType, variety, state, district });
      const data = await getPriceSuggestions(cropType, variety, state, district);
      logger.debug('✅ Mandi price data received:', data);
      setPriceData(data);
      setLastUpdated(new Date());
      
      if (data.suggestions.length === 0) {
        toast({
          title: "No Price Data",
          description: `No current market prices found for ${cropType}${variety ? ` (${variety})` : ''}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Price Data Updated",
          description: `Found ${data.suggestions.length} market prices for ${cropType}`,
        });
      }
    } catch (err) {
      logger.error('❌ Error fetching mandi prices:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market prices';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [cropType, variety, state, district, toast]);

  useEffect(() => {
    // Fetch immediately when component mounts or dependencies change
    if (cropType && state && district) {
    fetchPrices();
    }
  }, [cropType, variety, state, district, fetchPrices]);

  const handlePriceSelect = (price: number) => {
    if (onPriceSelect) {
      onPriceSelect(price);
      toast({
        title: "Price Selected",
        description: `Selected price: ${formatPrice(price)}`,
      });
    }
  };

  if (loading && !priceData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Fetching current market prices...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Market Price Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchPrices} 
            variant="outline" 
            size="sm" 
            className="mt-3"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!priceData || priceData.suggestions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Market Prices
          </CardTitle>
          <CardDescription>
            Current market prices for {cropType}{variety ? ` (${variety})` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No current market price data available for {cropType}{variety ? ` (${variety})` : ''}.
              Please check back later or set your price based on local market conditions.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={fetchPrices} 
            variant="outline" 
            size="sm" 
            className="mt-3"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Get modal price from suggestions if available
  const modalPrice = priceData.suggestions.length > 0 
    ? priceData.suggestions[0].modal_price 
    : priceData.averagePrice;

  return (
    <Card className={`${className} border border-gray-300 shadow-md overflow-hidden`}>
      <CardHeader className="bg-gray-50 border-b border-gray-300 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-start sm:items-center gap-2 sm:gap-3 text-base sm:text-lg">
              <div className="p-1.5 bg-white rounded border border-gray-300 flex-shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate">Mandi Price Information</div>
                <CardDescription className="text-xs text-gray-600 mt-0.5 break-words">
                  <span className="truncate block">{cropType}{variety ? ` - ${variety}` : ''}</span>
                  <span className="text-gray-500"> | {state}, {district}</span>
                </CardDescription>
              </div>
            </CardTitle>
          </div>
          <Button 
            onClick={fetchPrices} 
            variant="outline" 
            size="sm"
            disabled={loading}
            className="border-gray-300 hover:bg-gray-100 flex-shrink-0 self-start sm:self-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Refresh</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-white">
        {/* Main Price Display - Always show Min, Modal, and Max */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 sm:mb-4">Market Price Range</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Minimum Price */}
            <div className="text-center p-4 sm:p-5 bg-gray-50 rounded-lg border border-gray-300 min-w-0">
              <div className="flex items-center justify-center gap-1.5 mb-2 sm:mb-3">
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Minimum</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 break-words">
              {formatPrice(priceData.minPrice)}
              </div>
              <div className="text-xs text-gray-500 whitespace-nowrap">Per Quintal</div>
            </div>
            
            {/* Modal Price */}
            <div className="text-center p-4 sm:p-5 bg-white rounded-lg border-2 border-gray-400 shadow-sm min-w-0">
              <div className="flex items-center justify-center gap-1.5 mb-2 sm:mb-3">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide whitespace-nowrap">Modal Price</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 break-words">
                {formatPrice(modalPrice)}
          </div>
              <div className="text-xs text-gray-600 font-medium whitespace-nowrap">Per Quintal</div>
            </div>
            
            {/* Maximum Price */}
            <div className="text-center p-4 sm:p-5 bg-gray-50 rounded-lg border border-gray-300 min-w-0">
              <div className="flex items-center justify-center gap-1.5 mb-2 sm:mb-3">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">Maximum</span>
          </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 break-words">
              {formatPrice(priceData.maxPrice)}
              </div>
              <div className="text-xs text-gray-500 whitespace-nowrap">Per Quintal</div>
            </div>
          </div>
          
          {/* Price Range Summary */}
          <div className="text-center pt-3 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-700 break-words px-2">
              <span className="font-semibold">Price Range:</span> {formatPrice(priceData.minPrice)} - {formatPrice(priceData.maxPrice)} 
              <span className="text-gray-500"> (Modal: {formatPrice(modalPrice)})</span>
            </p>
          </div>
        </div>

        {/* Market Details Card */}
        {priceData.suggestions.length > 0 && (
          <div className="bg-gray-50 rounded-lg border border-gray-300 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h4 className="font-semibold text-sm sm:text-base text-gray-900 flex items-center gap-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700 flex-shrink-0" />
                <span>Market Information</span>
              </h4>
            </div>
            <div className="space-y-3">
              {priceData.suggestions.slice(0, 3).map((suggestion, index) => (
                <div 
                  key={index} 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-white rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-gray-100 rounded border border-gray-300 flex-shrink-0">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm sm:text-base text-gray-900 truncate">{suggestion.market}</div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs border-gray-400 text-gray-700 bg-gray-50 max-w-full truncate">
                          <span className="truncate block">{suggestion.district}</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs border-gray-400 text-gray-700 bg-gray-50 max-w-full truncate">
                          <span className="truncate block">{suggestion.state}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">
                        {formatPrice(suggestion.modal_price)}
                      </div>
                      <div className="text-xs text-gray-600 whitespace-nowrap">
                        Modal Price
                      </div>
                    </div>
                    {onPriceSelect && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePriceSelect(suggestion.modal_price)}
                        className="border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-500 flex-shrink-0"
                      >
                        Use
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
        </div>
        )}

        {/* Quick Price Selection */}
        {onPriceSelect && (
          <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700 flex-shrink-0" />
              <span>Quick Select Price</span>
            </h4>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePriceSelect(priceData.minPrice)}
                className="border-gray-400 text-gray-700 hover:bg-gray-100 w-full sm:w-auto justify-center"
              >
                Min: {formatPrice(priceData.minPrice)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePriceSelect(modalPrice)}
                className="border-gray-600 text-gray-900 hover:bg-gray-200 font-semibold w-full sm:w-auto justify-center"
              >
                Modal: {formatPrice(modalPrice)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePriceSelect(priceData.maxPrice)}
                className="border-gray-400 text-gray-700 hover:bg-gray-100 w-full sm:w-auto justify-center"
              >
                Max: {formatPrice(priceData.maxPrice)}
              </Button>
            </div>
          </div>
        )}

        {/* Footer Information */}
        <div className="pt-3 sm:pt-4 border-t border-gray-200 space-y-2">
          {lastUpdated && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 flex-wrap px-2">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="text-center">Last updated: {lastUpdated.toLocaleString('en-IN', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
                </div>
          )}
          <div className="text-xs text-gray-500 text-center px-2 break-words">
            <span className="font-medium">Data Source:</span> Government of India - Ministry of Agriculture and Farmers Welfare
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
