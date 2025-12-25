import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { singleStepGroupManager } from '@/utils/singleStepGroupManager';
import { 
  ShoppingCart, 
  Package, 
  User, 
  MapPin, 
  CreditCard, 
  Truck, 
  DollarSign,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface SimplePurchaseModalProps {
  batch: any;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

export const SimplePurchaseModal: React.FC<SimplePurchaseModalProps> = ({ 
  batch, 
  isOpen, 
  onClose, 
  onPurchaseComplete 
}) => {
  const [step, setStep] = useState<'details' | 'processing' | 'complete'>('details');
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState(batch?.harvest_quantity || 0);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // For group-based system, we'll show the original harvest quantity
  // The actual available quantity will be managed by the group certificates
  useEffect(() => {
    if (batch) {
      setAvailableQuantity(batch.harvest_quantity);
    }
  }, [batch]);

  // Reset modal state when it opens - no useEffect needed
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setStep('details');
      setQuantity(1);
      setDeliveryAddress('');
      setLoading(false);
    }
    onClose();
  };

  if (!batch) return null;

  const unitPrice = batch.price_per_kg;
  const totalPrice = quantity * unitPrice;
  const deliveryFee = totalPrice > 1000 ? 0 : 50;
  const finalTotal = totalPrice + deliveryFee;

  const handlePurchase = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to make a purchase.",
      });
      return;
    }

    if (!deliveryAddress.trim()) {
      toast({
        variant: "destructive",
        title: "Delivery Address Required",
        description: "Please enter a delivery address.",
      });
      return;
    }

    setStep('processing');
    setLoading(true);

    try {
      // Group-based system: Generate purchase certificate
      const currentOwner = batch.farmer || 'Jarir Khan';
      
      // Get buyer name from profile
      let buyerName = 'Unknown Buyer';
      try {
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('full_name')
          .eq('user_id', user?.id)
          .single();
        
        if (profile?.full_name) {
          buyerName = profile.full_name;
        } else if (user?.name) {
          buyerName = user.name;
        } else if (user?.email) {
          // Extract name from email as fallback
          const emailName = user.email.split('@')[0];
          buyerName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
      } catch (error) {
        console.warn('Could not fetch buyer name from profile:', error);
        if (user?.name) {
          buyerName = user.name;
        } else if (user?.email) {
          const emailName = user.email.split('@')[0];
          buyerName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
      }
      
      if (!batch.group_id) {
        throw new Error('No group ID found for this batch');
      }
      
      // Generate purchase certificate and add to group
      const { pdfBlob, ipfsHash } = await singleStepGroupManager.uploadPurchaseCertificate(
        batch.group_id,
        {
          batchId: batch.id,
          from: currentOwner,
          to: buyerName,
          quantity: quantity,
          pricePerKg: unitPrice,
          timestamp: new Date().toISOString()
        }
      );

      // Update batch status
      const purchaseData = {
        status: 'available' // Keep available for other purchases
      };

      const { error: purchaseError } = await (supabase as any)
        .from('batches')
        .update(purchaseData)
        .eq('id', batch.id);

      if (purchaseError) {
        throw new Error(`Failed to update batch: ${purchaseError.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      setStep('complete');
      onPurchaseComplete();
      toast({
        title: "Purchase Successful!",
        description: `Your order for ${quantity}kg of ${batch.crop_type} has been placed. A new certificate has been added to the group.`,
      });
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        variant: "destructive",
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during purchase.",
      });
      setStep('details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase {batch.crop_type}
          </DialogTitle>
          <DialogDescription>
            Complete your purchase of {batch.crop_type} - {batch.variety}
          </DialogDescription>
        </DialogHeader>

        {step === 'details' && (
          <div className="space-y-6">
            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Crop Type</Label>
                    <p className="font-medium">{batch.crop_type}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Variety</Label>
                    <p className="font-medium">{batch.variety}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Available Quantity</Label>
                    <p className="font-medium">{batch.harvest_quantity} kg</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Price per kg</Label>
                    <p className="font-medium text-green-600">₹{batch.price_per_kg}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quantity & Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Quantity & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="quantity">Quantity (kg)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={availableQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Available: {availableQuantity} kg
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal ({quantity}kg × ₹{unitPrice}):</span>
                    <span>₹{totalPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>{deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">₹{finalTotal}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="address">Full Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter your complete delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handlePurchase}
                disabled={loading || !deliveryAddress.trim()}
                className="flex-1"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchase Now
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold mb-2">Processing Your Order</h3>
            <p className="text-gray-600">Please wait while we process your purchase...</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">Purchase Successful!</h3>
            <p className="text-gray-600 mb-4">
              Your order for {quantity}kg of {batch.crop_type} has been placed successfully.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
