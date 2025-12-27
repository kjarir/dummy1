import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const BecomeDriver = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleType: '',
    vehicleCapacity: '',
    vehicleRegistration: '',
    driverLicense: '',
    vehicleEquipment: [] as string[],
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id || !user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to become a driver",
      });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Update profile user_type to driver (this triggers auto-creation of driver_profile)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: 'driver',
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Step 2: Create or update driver_profile in separate table
      const { error: driverProfileError } = await supabase
        .from('driver_profiles')
        .upsert({
          profile_id: profile.id,
          vehicle_type: formData.vehicleType,
          vehicle_capacity_kg: parseFloat(formData.vehicleCapacity),
          vehicle_registration_number: formData.vehicleRegistration,
          driver_license_number: formData.driverLicense,
          vehicle_equipment: formData.vehicleEquipment,
          working_hours: {
            start: formData.workingHoursStart,
            end: formData.workingHoursEnd,
            days: [1, 2, 3, 4, 5], // Monday to Friday
          },
          is_available: true,
        }, {
          onConflict: 'profile_id'
        });

      if (driverProfileError) throw driverProfileError;

      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          user_type: 'driver',
        },
      });

      if (metadataError) throw metadataError;

      toast({
        title: "Success",
        description: "You are now registered as a driver!",
      });

      navigate('/driver-dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to register as driver",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEquipment = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      vehicleEquipment: prev.vehicleEquipment.includes(equipment)
        ? prev.vehicleEquipment.filter(e => e !== equipment)
        : [...prev.vehicleEquipment, equipment],
    }));
  };

  // Check if driver is already fully registered
  const [isFullyRegistered, setIsFullyRegistered] = useState(false);
  
  useEffect(() => {
    const checkDriverRegistration = async () => {
      if (profile?.user_type === 'driver' && profile?.id) {
        const { data: driverProfile } = await supabase
          .from('driver_profiles')
          .select('vehicle_type')
          .eq('profile_id', profile.id)
          .single();
        
        setIsFullyRegistered(!!driverProfile?.vehicle_type);
      }
    };
    
    checkDriverRegistration();
  }, [profile?.id, profile?.user_type]);

  if (profile?.user_type === 'driver' && isFullyRegistered) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Already a Driver</CardTitle>
            <CardDescription>You are already registered as a driver.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/driver-dashboard')}>
              Go to Driver Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          Become a Driver
        </h1>
        <p className="text-muted-foreground mt-2">
          Register as a delivery driver and start earning
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Driver Registration</CardTitle>
          <CardDescription>
            Fill in your vehicle and driver information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vehicleType">Vehicle Type *</Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vehicleType: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="refrigerated_truck">Refrigerated Truck</SelectItem>
                  <SelectItem value="covered_truck">Covered Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleCapacity">Vehicle Capacity (kg) *</Label>
              <Input
                id="vehicleCapacity"
                type="number"
                min="1"
                value={formData.vehicleCapacity}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleCapacity: e.target.value }))}
                placeholder="e.g., 1000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleRegistration">Vehicle Registration Number *</Label>
              <Input
                id="vehicleRegistration"
                value={formData.vehicleRegistration}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleRegistration: e.target.value }))}
                placeholder="e.g., MH12AB1234"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driverLicense">Driver License Number *</Label>
              <Input
                id="driverLicense"
                value={formData.driverLicense}
                onChange={(e) => setFormData(prev => ({ ...prev, driverLicense: e.target.value }))}
                placeholder="e.g., DL1234567890"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Vehicle Equipment</Label>
              <div className="grid grid-cols-2 gap-2">
                {['refrigeration', 'pallets', 'crates', 'forklift'].map((equipment) => (
                  <Button
                    key={equipment}
                    type="button"
                    variant={formData.vehicleEquipment.includes(equipment) ? 'default' : 'outline'}
                    onClick={() => toggleEquipment(equipment)}
                  >
                    {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workingHoursStart">Working Hours Start *</Label>
                <Input
                  id="workingHoursStart"
                  type="time"
                  value={formData.workingHoursStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, workingHoursStart: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workingHoursEnd">Working Hours End *</Label>
                <Input
                  id="workingHoursEnd"
                  type="time"
                  value={formData.workingHoursEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, workingHoursEnd: e.target.value }))}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register as Driver'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

