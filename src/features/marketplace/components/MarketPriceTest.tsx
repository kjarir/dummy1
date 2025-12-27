import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketPriceDisplay } from './MarketPriceDisplay';

export const MarketPriceTest: React.FC = () => {
  const [cropType, setCropType] = useState('Rice');
  const [variety, setVariety] = useState('Basmati');
  const [state, setState] = useState('Odisha');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Market Price API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cropType">Crop Type</Label>
              <Input
                id="cropType"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                placeholder="e.g., Rice, Wheat, Maize"
              />
            </div>
            <div>
              <Label htmlFor="variety">Variety</Label>
              <Input
                id="variety"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="e.g., Basmati, Sona Masuri"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., Odisha, Punjab"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <MarketPriceDisplay
        cropType={cropType}
        variety={variety}
        state={state}
        onPriceSelect={(price) => {
          console.log('Selected price:', price);
          alert(`Selected price: ₹${price}/quintal`);
        }}
      />
    </div>
  );
};
