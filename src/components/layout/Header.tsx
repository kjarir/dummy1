import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Leaf, User, ShoppingCart, Shield, LogIn, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const { isConnected, connectWallet, account, disconnectWallet } = useWeb3();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Get user type from user metadata
      const userTypeFromMetadata = user.user_metadata?.user_type;
      
      // Temporary fixes for users without user_type set
      let effectiveUserType = userTypeFromMetadata;
      
      if (!userTypeFromMetadata) {
        // Check email to determine user type
        if (user?.email === 'realjarirkhann@gmail.com') {
          effectiveUserType = 'distributor';
        } else if (user?.email === 'kjarir23@gmail.com') {
          effectiveUserType = 'farmer';
        } else {
          // Default to farmer for any other users without user_type
          effectiveUserType = 'farmer';
        }
      }
      
      setUserType(effectiveUserType);
    } else {
      setUserType(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 transition-smooth hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-gradient-primary">AgriTrace</span>
            <span className="text-xs text-muted-foreground">Government of Odisha</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {/* Show marketplace based on user type */}
          {userType === 'farmer' && (
            <Link to="/marketplace" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
              Farmer Marketplace
            </Link>
          )}
          {userType === 'distributor' && (
            <>
              <Link to="/marketplace" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
                Farmer Marketplace
              </Link>
              <Link to="/retailer-marketplace" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
                Distributor Marketplace
              </Link>
              <Link to="/distributor-inventory" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
                My Inventory
              </Link>
            </>
          )}
          {userType === 'retailer' && (
            <>
              <Link to="/retailer-marketplace" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
                Retailer Marketplace
              </Link>
              <Link to="/retailer-inventory" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
                My Inventory
              </Link>
            </>
          )}
          {/* Show general marketplace for non-logged in users */}
          {!user && (
            <Link to="/marketplace" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
              Marketplace
            </Link>
          )}
          
          <Link to="/track" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
            Track Products
          </Link>
          <Link to="/verification" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
            Certificate Verification
          </Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
            About
          </Link>
          {user && (
            <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-smooth">
              Dashboard
            </Link>
          )}
        </nav>

        {/* Desktop Auth & Actions */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Wallet Connection */}
          {isConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-green-200 text-green-700">
                  <Wallet className="mr-2 h-4 w-4" />
                  {account?.substring(0, 6)}...{account?.substring(account.length - 4)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={disconnectWallet}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect Wallet
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" size="sm" onClick={connectWallet}>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/batch-registration">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Register Batch
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Link>
              </Button>
              <Button size="sm" className="gradient-primary" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 space-y-3">
            <Link
              to="/about"
              className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setIsMenuOpen(false)}
            >
              About AgriTrace
            </Link>
            {/* Show marketplace based on user type */}
            {userType === 'farmer' && (
              <Link
                to="/marketplace"
                className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
                onClick={() => setIsMenuOpen(false)}
              >
                Farmer Marketplace
              </Link>
            )}
            {userType === 'distributor' && (
              <>
                <Link
                  to="/marketplace"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Farmer Marketplace
                </Link>
                <Link
                  to="/retailer-marketplace"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Distributor Marketplace
                </Link>
                <Link
                  to="/distributor-inventory"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Inventory
                </Link>
              </>
            )}
            {userType === 'retailer' && (
              <>
                <Link
                  to="/retailer-marketplace"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Retailer Marketplace
                </Link>
                <Link
                  to="/retailer-inventory"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Inventory
                </Link>
              </>
            )}
            {/* Show general marketplace for non-logged in users */}
            {!user && (
              <Link
                to="/marketplace"
                className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
                onClick={() => setIsMenuOpen(false)}
              >
                Marketplace
              </Link>
            )}
            <Link
              to="/track"
              className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setIsMenuOpen(false)}
            >
              Track Produce
            </Link>
            <Link
              to="/verification"
              className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setIsMenuOpen(false)}
            >
              Certificate Verification
            </Link>
            <Link
              to="/dashboard"
              className="block text-sm font-medium text-muted-foreground hover:text-primary transition-smooth"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <div className="pt-3 border-t space-y-2">
              {/* Wallet Connection */}
              {isConnected ? (
                <Button variant="outline" size="sm" className="w-full justify-start border-green-200 text-green-700" onClick={disconnectWallet}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Disconnect Wallet
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={connectWallet}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              )}

              {user ? (
                <>
                  <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                    <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </Link>
                  </Button>
                  <Button size="sm" className="w-full gradient-primary" asChild>
                    <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </header>
  );
};