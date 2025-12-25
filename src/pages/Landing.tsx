import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Leaf, 
  Shield, 
  QrCode, 
  TrendingUp, 
  Users, 
  MapPin, 
  CheckCircle2,
  ArrowRight,
  Smartphone,
  Globe,
  Award
} from 'lucide-react';
import heroImage from '@/assets/hero-agriculture.jpg';

export const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-section relative py-20 md:py-32">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={heroImage} 
            alt="Modern agricultural technology in Odisha" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center text-primary-foreground">
            <Badge variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
              <Globe className="w-4 h-4 mr-2" />
              Government of Odisha Initiative
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Transparent Agricultural
              <span className="block text-gradient-primary">Supply Chain</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto leading-relaxed">
              Track your produce from farm to table with blockchain-powered 
              certificates, AI quality analysis, and complete provenance transparency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
                <Link to="/signup">
                  Start Tracking
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white bg-white/10" asChild>
                <Link to="/about">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Revolutionizing Agricultural Transparency
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              AgriTrace combines cutting-edge technology with traditional farming 
              to create an unbreakable chain of trust in Odisha's agricultural ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Blockchain Certificates */}
            <Card className="govt-card hover-lift">
              <CardContent className="p-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-primary mb-6">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Blockchain Certificates</h3>
                <p className="text-muted-foreground mb-4">
                  Immutable, tamper-proof certificates stored on blockchain 
                  ensure complete authenticity of your agricultural produce.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                    Tamper-proof records
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                    Government verified
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                    Instant verification
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* AI Quality Analysis */}
            <Card className="govt-card hover-lift">
              <CardContent className="p-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-secondary mb-6">
                  <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-4">AI Quality Analysis</h3>
                <p className="text-muted-foreground mb-4">
                  Advanced machine learning algorithms analyze crop quality, 
                  grading, and freshness to provide accurate quality metrics.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                    Automated quality scoring
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                    Defect detection
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                    Price recommendations
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* QR Code Tracking */}
            <Card className="govt-card hover-lift">
              <CardContent className="p-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-accent to-accent-light mb-6">
                  <QrCode className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-4">QR Code Tracking</h3>
                <p className="text-muted-foreground mb-4">
                  Simple QR codes provide instant access to complete provenance 
                  information for consumers, retailers, and distributors.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                    Complete supply chain
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                    Mobile-friendly
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                    Real-time updates
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              From Farm to Table in 4 Simple Steps
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our streamlined process makes agricultural tracking accessible to farmers 
              across Odisha while maintaining the highest standards of transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full gradient-primary mx-auto mb-6">
                <Leaf className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold text-primary">
                1
              </div>
              <h3 className="font-semibold text-lg mb-3">Register Batch</h3>
              <p className="text-muted-foreground text-sm">
                Farmers register their harvest with crop details, upload images, 
                and receive AI quality analysis.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full gradient-secondary mx-auto mb-6">
                <Smartphone className="h-8 w-8 text-secondary-foreground" />
              </div>
              <div className="bg-secondary/10 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold text-secondary">
                2
              </div>
              <h3 className="font-semibold text-lg mb-3">Generate Certificate</h3>
              <p className="text-muted-foreground text-sm">
                Blockchain certificate with QR code is generated containing 
                all provenance and quality information.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-accent to-accent-light mx-auto mb-6">
                <Users className="h-8 w-8 text-accent-foreground" />
              </div>
              <div className="bg-accent/10 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold text-accent">
                3
              </div>
              <h3 className="font-semibold text-lg mb-3">Trade & Transfer</h3>
              <p className="text-muted-foreground text-sm">
                Retailers and distributors can buy produce through the marketplace 
                with automatic ownership transfers.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full gradient-primary mx-auto mb-6">
                <MapPin className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-4 text-sm font-bold text-primary">
                4
              </div>
              <h3 className="font-semibold text-lg mb-3">Track & Verify</h3>
              <p className="text-muted-foreground text-sm">
                Consumers scan QR codes to view complete provenance, 
                quality reports, and ownership history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">10,000+</div>
              <div className="text-muted-foreground">Registered Farmers</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">50,000+</div>
              <div className="text-muted-foreground">Batches Tracked</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">95%</div>
              <div className="text-muted-foreground">Quality Accuracy</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Platform Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full gradient-primary mx-auto mb-8">
              <Award className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Agricultural Business?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of farmers, retailers, and distributors who trust 
              AgriTrace for transparent, secure agricultural supply chain management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gradient-primary" asChild>
                <Link to="/signup">
                  Get Started Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/contact">
                  Contact Support
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};