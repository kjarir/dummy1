import React, { useState, useEffect } from 'react';
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
} from '@/utils/marketPriceAPI';

interface MarketPriceDisplayProps {
  cropType: string;
  variety?: string;
  state?: string;
  onPriceSelect?: (price: number) => void;
  className?: string;
}

export const MarketPriceDisplay: React.FC<MarketPriceDisplayProps> = ({
  cropType,
  variety,
  state,
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

  const fetchPrices = async () => {
    if (!cropType) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getPriceSuggestions(cropType, variety, state);
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
  };

  useEffect(() => {
    fetchPrices();
  }, [cropType, variety, state]);

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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Market Prices
            </CardTitle>
            <CardDescription>
              Current market prices for {cropType}{variety ? ` (${variety})` : ''}
            </CardDescription>
          </div>
          <Button 
            onClick={fetchPrices} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(priceData.minPrice)}
            </div>
            <div className="text-sm text-green-600">Min Price</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatPrice(priceData.averagePrice)}
            </div>
            <div className="text-sm text-blue-600">Average</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatPrice(priceData.maxPrice)}
            </div>
            <div className="text-sm text-orange-600">Max Price</div>
          </div>
        </div>

        {/* Price Range */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {getPriceRangeText(priceData.minPrice, priceData.maxPrice, priceData.averagePrice)}
          </p>
        </div>

        {/* Quick Price Selection */}
        {onPriceSelect && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Select Price:</h4>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePriceSelect(priceData.minPrice)}
              >
                Min: {formatPrice(priceData.minPrice)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePriceSelect(priceData.averagePrice)}
              >
                Avg: {formatPrice(priceData.averagePrice)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePriceSelect(priceData.maxPrice)}
              >
                Max: {formatPrice(priceData.maxPrice)}
              </Button>
            </div>
          </div>
        )}

        {/* Market Details */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Recent Market Data:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {priceData.suggestions.slice(0, 5).map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-gray-500" />
                  <span className="font-medium">{suggestion.market}</span>
                  <Badge variant="outline" className="text-xs">
                    {suggestion.state}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatPrice(suggestion.modal_price)}</span>
                  {onPriceSelect && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePriceSelect(suggestion.modal_price)}
                      className="h-6 px-2 text-xs"
                    >
                      Use
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>Last updated: {lastUpdated.toLocaleString()}</span>
          </div>
        )}

        {/* Data Source */}
        <div className="text-xs text-gray-500 text-center">
          {priceData.suggestions.length > 0 && priceData.suggestions[0].state === 'Odisha' && 
           priceData.suggestions[0].market === 'Bhubaneswar' ? (
            <span className="text-amber-600">
            </span>
          ) : (
            <span>Data source: Government of India - Ministry of Agriculture and Farmers Welfare</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
