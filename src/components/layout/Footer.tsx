import { Link } from 'react-router-dom';
import { Leaf, Mail, Phone, MapPin, Globe } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-lg text-gradient-primary">AgriTrace</span>
                <p className="text-xs text-muted-foreground">Government of Odisha</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Empowering farmers and ensuring food security through blockchain-powered 
              agricultural supply chain transparency. Building trust from farm to table.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Secretariat, Bhubaneswar, Odisha 751001</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+91-674-2536000</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>agritrace@odisha.gov.in</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Platform</h3>
            <div className="space-y-2 text-sm">
              <Link to="/about" className="block text-muted-foreground hover:text-primary transition-smooth">
                About AgriTrace
              </Link>
              <Link to="/marketplace" className="block text-muted-foreground hover:text-primary transition-smooth">
                Marketplace
              </Link>
              <Link to="/track" className="block text-muted-foreground hover:text-primary transition-smooth">
                Track Produce
              </Link>
              <Link to="/dashboard" className="block text-muted-foreground hover:text-primary transition-smooth">
                Dashboard
              </Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Support</h3>
            <div className="space-y-2 text-sm">
              <Link to="/help" className="block text-muted-foreground hover:text-primary transition-smooth">
                Help Center
              </Link>
              <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-smooth">
                Contact Us
              </Link>
              <Link to="/privacy" className="block text-muted-foreground hover:text-primary transition-smooth">
                Privacy Policy
              </Link>
              <Link to="/terms" className="block text-muted-foreground hover:text-primary transition-smooth">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-muted-foreground">
            © 2024 Government of Odisha. All rights reserved. AgriTrace Platform.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-xs text-muted-foreground flex items-center">
              <Globe className="h-3 w-3 mr-1" />
              Powered by Blockchain Technology
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};