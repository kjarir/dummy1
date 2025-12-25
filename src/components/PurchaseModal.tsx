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
import { useWeb3 } from '@/contexts/Web3Context';
import { supabase } from '@/integrations/supabase/client';
import { createPurchaseTransaction } from '@/utils/supplyChainTracker';
// Removed complex database queries to avoid errors
import { 
  ShoppingCart, 
  Package, 
  User, 
  MapPin, 
  Calendar, 
  DollarSign,
  CreditCard,
  CheckCircle,
  X,
  Loader2,
  Truck,
  Shield
} from 'lucide-react';

interface PurchaseModalProps {
  batch: any;
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ 
  batch, 
  isOpen, 
  onClose, 
  onPurchaseComplete 
}) => {
  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'complete'>('details');
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const [loading, setLoading] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState(0);
  
  const { user } = useAuth();
  const { account } = useWeb3();
  const { toast } = useToast();

  // Set available quantity to original quantity to avoid database errors
  useEffect(() => {
    if (batch) {
      setAvailableQuantity(batch.harvest_quantity);
    }
  }, [batch?.harvest_quantity]);

  // Early return after all hooks
  if (!batch) return null;

  const unitPrice = batch.price_per_kg;
  const totalPrice = quantity * unitPrice;
  const deliveryFee = totalPrice > 1000 ? 0 : 50; // Free delivery above ₹1000
  const finalTotal = totalPrice + deliveryFee;

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value);
    if (num >= 1 && num <= availableQuantity) {
      setQuantity(num);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to make a purchase.",
      });
      return;
    }

    if (!deliveryAddress.trim()) {
      toast({
        variant: "destructive",
        title: "Delivery address required",
        description: "Please provide a delivery address.",
      });
      return;
    }

    setStep('processing');
    setLoading(true);

    try {
      // Use the new supply chain tracking system
      const currentOwner = batch.farmer || batch.current_owner || 'Jarir Khan';
      
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
      
      await createPurchaseTransaction(
        batch.id,
        currentOwner,
        buyerName,
        quantity,
        unitPrice,
        deliveryAddress
      );

      // Update batch status
      const purchaseData = {
        status: 'available' // Keep available for other purchases
      };

      // Update the batch with purchase information
      const { data: purchase, error: purchaseError } = await (supabase as any)
        .from('batches')
        .update(purchaseData)
        .eq('id', batch.id)
        .select()
        .single();

      if (purchaseError) {
        throw new Error(`Failed to update batch: ${purchaseError.message}`);
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      setStep('complete');
      toast({
        title: "Purchase successful!",
        description: `Your order for ${quantity}kg ${batch.crop_type} has been placed. The certificate has been updated with your purchase details.`,
      });

      onPurchaseComplete();

    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
      setStep('details');
    } finally {
      setLoading(false);
    }
  };

  const getCertificationColor = (level: string) => {
    switch (level) {
      case 'Premium':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
      case 'Organic':
        return 'bg-success text-success-foreground';
      case 'Fresh':
        return 'bg-gradient-to-r from-accent to-accent-light text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-primary" />
                {step === 'complete' ? 'Purchase Complete!' : 'Purchase Product'}
              </DialogTitle>
              <DialogDescription>
                {step === 'complete' 
                  ? 'Your order has been successfully placed'
                  : 'Complete your purchase of agricultural produce'
                }
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {step === 'details' && (
          <div className="space-y-6">
            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{batch.crop_type} - {batch.variety}</h3>
                    <p className="text-sm text-muted-foreground">Farmer: {batch.profiles?.full_name || 'Not specified'}</p>
                  </div>
                  <Badge className={getCertificationColor(batch.certification)}>
                    {batch.certification}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Available:</span> {batch.harvest_quantity} kg
                  </div>
                  <div>
                    <span className="font-medium">Price:</span> ₹{unitPrice}/kg
                  </div>
                  <div>
                    <span className="font-medium">Grading:</span> {batch.grading}
                  </div>
                  <div>
                    <span className="font-medium">Harvest Date:</span> {new Date(batch.harvest_date).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quantity Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Quantity & Pricing</CardTitle>
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
                    onChange={(e) => handleQuantityChange(e.target.value)}
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
                    <span>₹{finalTotal}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => setStep('payment')} className="flex-1">
                Continue to Payment
              </Button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="address">Full Address</Label>
                <Input
                  id="address"
                  placeholder="Enter your complete delivery address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="mt-1"
                />
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="payment"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                    />
                    <span>UPI Payment</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                    />
                    <span>Credit/Debit Card</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                    />
                    <span>Cash on Delivery</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>{quantity}kg {batch.crop_type} - {batch.variety}</span>
                  <span>₹{totalPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>₹{finalTotal}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
                Back
              </Button>
              <Button onClick={handlePurchase} className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Complete Purchase
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center space-y-6 py-8">
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
            <div>
              <h3 className="text-xl font-semibold">Processing Your Order</h3>
              <p className="text-muted-foreground">Please wait while we process your purchase...</p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-600">Purchase Successful!</h3>
              <p className="text-muted-foreground">
                Your order for {quantity}kg {batch.crop_type} has been placed successfully.
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Order ID:</span>
                    <span className="font-mono">#{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span>₹{finalTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="capitalize">{paymentMethod}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button onClick={() => {
                onClose();
                // Navigate to orders page or dashboard
              }} className="flex-1">
                View Orders
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
