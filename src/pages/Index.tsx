import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Leaf, 
  Shield, 
  Users, 
  Globe, 
  Award, 
  Smartphone, 
  QrCode,
  TrendingUp,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-white py-16">
      <div className="container space-y-16">
      {/* About Header */}
      <div className="text-center space-y-6">
        <Badge variant="outline" className="mb-4">
          <Globe className="w-4 h-4 mr-2" />
          Government of Odisha Digital Initiative
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold">About AgriTrace</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          AgriTrace represents a revolutionary approach to agricultural supply chain management, 
          combining cutting-edge blockchain technology with traditional farming practices to ensure 
          complete transparency and traceability from farm to table.
        </p>
      </div>

      {/* Mission Section */}
      <Card className="govt-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl mb-4">Our Mission</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            To empower farmers across Odisha with modern technology that provides complete transparency 
            in the agricultural supply chain, ensures fair pricing, builds consumer trust, and promotes 
            food security through verifiable, blockchain-powered certificates that track every step 
            from cultivation to consumption.
          </p>
        </CardContent>
      </Card>

      {/* Key Features */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Transforming Agriculture Through Technology</h2>
          <p className="text-xl text-muted-foreground">
            AgriTrace integrates multiple advanced technologies to create an ecosystem of trust
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Blockchain Security */}
          <Card className="govt-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-primary mb-6">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Blockchain Security</h3>
              <p className="text-muted-foreground mb-4">
                Immutable, tamper-proof records stored on blockchain ensure complete authenticity 
                and prevent fraud in the agricultural supply chain.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  Immutable transaction records
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  Government-verified certificates
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  Transparent ownership tracking
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Quality Analysis */}
          <Card className="govt-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-secondary mb-6">
                <TrendingUp className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI-Powered Quality Assessment</h3>
              <p className="text-muted-foreground mb-4">
                Advanced machine learning algorithms analyze crop images to provide accurate 
                quality metrics, grading, and pricing recommendations.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  Automated quality scoring
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  Defect detection and analysis
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  Market price recommendations
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Accessibility */}
          <Card className="govt-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-accent to-accent-light mb-6">
                <Smartphone className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Mobile-First Design</h3>
              <p className="text-muted-foreground mb-4">
                Designed specifically for farmers with smartphones, featuring offline capabilities 
                and progressive web app support for areas with limited connectivity.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  Offline form caching
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  Progressive web app support
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  Multi-language support (Oriya + English)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Impact Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-bold mb-6">Empowering Odisha's Agricultural Community</h2>
          <div className="space-y-4 text-muted-foreground">
            <p className="text-lg">
              AgriTrace is more than just a tracking system – it's a comprehensive platform that 
              empowers farmers, builds consumer confidence, and strengthens Odisha's position as 
              a leading agricultural state in India.
            </p>
            <p>
              By providing complete transparency and verification at every step of the supply chain, 
              we enable farmers to command fair prices for their produce while giving consumers 
              the confidence that comes from knowing exactly where their food originates.
            </p>
            <p>
              The platform supports sustainable farming practices, helps prevent food fraud, 
              and creates a direct connection between rural producers and urban consumers.
            </p>
          </div>
          <div className="mt-8">
            <Button className="gradient-primary" size="lg">
              Join AgriTrace Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-6 govt-card">
            <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
            <div className="text-muted-foreground">Farmers Registered</div>
          </div>
          <div className="text-center p-6 govt-card">
            <div className="text-3xl font-bold text-secondary mb-2">50,000+</div>
            <div className="text-muted-foreground">Batches Tracked</div>
          </div>
          <div className="text-center p-6 govt-card">
            <div className="text-3xl font-bold text-accent mb-2">30</div>
            <div className="text-muted-foreground">Districts Covered</div>
          </div>
          <div className="text-center p-6 govt-card">
            <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-muted-foreground">Platform Uptime</div>
          </div>
        </div>
      </div>

      {/* Government Partnership */}
      <Card className="govt-card">
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full gradient-primary mx-auto mb-6">
            <Award className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="text-2xl font-bold mb-4">Government of Odisha Partnership</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AgriTrace is an official initiative of the Government of Odisha, developed in partnership 
            with leading technology providers to ensure the highest standards of security, reliability, 
            and accessibility for all farmers across the state.
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Index;
