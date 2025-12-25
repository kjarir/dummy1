import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Phone, 
  Leaf, 
  Wallet,
  Shield,
  Users,
  UserCheck
} from 'lucide-react';

export const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
      } else {
        toast({
          title: "Login successful",
          description: "Welcome back to AgriTrace!",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        <Card className="govt-card shadow-large">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-primary">
                <Leaf className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to your AgriTrace account to continue tracking and managing your agricultural produce.
              </CardDescription>
            </div>
            <Badge variant="outline" className="mx-auto">
              <Shield className="w-3 h-3 mr-1" />
              Government Verified Platform
            </Badge>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs defaultValue="credentials" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="credentials" className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Credentials</span>
                </TabsTrigger>
                <TabsTrigger value="wallet" className="flex items-center space-x-2">
                  <Wallet className="h-4 w-4" />
                  <span>Web3 Wallet</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="credentials" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="farmer@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary" 
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="wallet" className="space-y-4">
                <div className="text-center py-8 space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-accent to-accent-light mx-auto">
                    <Wallet className="h-8 w-8 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Connect Your Web3 Wallet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Use your MetaMask, WalletConnect, or other Web3 wallet to sign in securely.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full" size="lg">
                      <Wallet className="h-5 w-5 mr-2" />
                      Connect MetaMask
                    </Button>
                    <Button variant="outline" className="w-full" size="lg">
                      <Users className="h-5 w-5 mr-2" />
                      WalletConnect
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Don't have a wallet? <Link to="/wallet-setup" className="text-primary hover:underline">Set one up</Link>
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up here
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-white/80">
            Protected by Government of Odisha security protocols
          </p>
        </div>
      </div>
    </div>
  );
};
