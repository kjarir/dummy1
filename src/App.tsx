import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Web3Provider } from "@/features/blockchain/contexts/Web3Context";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Landing = lazy(() => import("./pages/Landing").then(m => ({ default: m.Landing })));
const Login = lazy(() => import("./pages/Auth/Login").then(m => ({ default: m.Login })));
const Signup = lazy(() => import("./pages/Auth/Signup").then(m => ({ default: m.Signup })));
const UnifiedDashboard = lazy(() => import("./pages/Dashboard/UnifiedDashboard").then(m => ({ default: m.UnifiedDashboard })));
const Marketplace = lazy(() => import("./features/marketplace/pages/Marketplace").then(m => ({ default: m.Marketplace })));
const FarmerMarketplace = lazy(() => import("./features/marketplace/pages/FarmerMarketplace").then(m => ({ default: m.FarmerMarketplace })));
const DistributorMarketplace = lazy(() => import("./features/marketplace/pages/DistributorMarketplace").then(m => ({ default: m.DistributorMarketplace })));
const DistributorInventory = lazy(() => import("./features/inventory/pages/DistributorInventory").then(m => ({ default: m.DistributorInventory })));
const RetailerMarketplace = lazy(() => import("./features/marketplace/pages/RetailerMarketplace").then(m => ({ default: m.RetailerMarketplace })));
const RetailerInventory = lazy(() => import("./features/inventory/pages/RetailerInventory").then(m => ({ default: m.RetailerInventory })));
const TrackProducts = lazy(() => import("./features/supply-chain/pages/TrackProducts").then(m => ({ default: m.TrackProducts })));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const CropHealthDetection = lazy(() => import("./features/ai-services/pages/CropHealthDetection").then(m => ({ default: m.CropHealthDetection })));
const BatchRegistration = lazy(() => import("./features/batch-registration/pages/BatchRegistration").then(m => ({ default: m.BatchRegistration })));
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const Unauthorized = lazy(() => import("./pages/Unauthorized").then(m => ({ default: m.Unauthorized })));
// TestPage removed from production build - only available in development
const TestPage = import.meta.env.DEV 
  ? lazy(() => import("./pages/TestPage").then(m => ({ default: m.TestPage })))
  : null;
const UnifiedVerificationSystem = lazy(() => import("./features/verification/components/UnifiedVerificationSystem").then(m => ({ default: m.UnifiedVerificationSystem })));
const HelperDesk = lazy(() => import("./pages/HelperDesk"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DriverDashboard = lazy(() => import("./features/truck-pooling/pages/DriverDashboard").then(m => ({ default: m.DriverDashboard })));
const MyDeliveries = lazy(() => import("./features/truck-pooling/pages/MyDeliveries").then(m => ({ default: m.MyDeliveries })));
const BecomeDriver = lazy(() => import("./features/truck-pooling/pages/BecomeDriver").then(m => ({ default: m.BecomeDriver })));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <AuthProvider>
          <Web3Provider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                <ErrorBoundary>
                  <Suspense fallback={<div className="flex justify-center py-10 text-sm text-muted-foreground">Loading...</div>}>
                    <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    
                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <UnifiedDashboard />
                      </ProtectedRoute>
                    } />
                    
                    {/* Marketplace Routes - Role Based Access */}
                    <Route path="/marketplace" element={
                      <ProtectedRoute allowedUserTypes={['farmer', 'distributor']}>
                        <Marketplace />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/retailer-marketplace" element={
                      <ProtectedRoute allowedUserTypes={['retailer', 'distributor']}>
                        <RetailerMarketplace />
                      </ProtectedRoute>
                    } />
                    
                    {/* Inventory Routes - Role Based Access */}
                    <Route path="/distributor-inventory" element={
                      <ProtectedRoute allowedUserTypes={['distributor']}>
                        <DistributorInventory />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/retailer-inventory" element={
                      <ProtectedRoute allowedUserTypes={['retailer']}>
                        <RetailerInventory />
                      </ProtectedRoute>
                    } />
                    
                    {/* General Protected Routes */}
                    <Route path="/track" element={
                      <ProtectedRoute>
                        <TrackProducts />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/crop-health" element={
                      <ProtectedRoute allowedUserTypes={['farmer', 'distributor']}>
                        <CropHealthDetection />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/batch-registration" element={
                      <ProtectedRoute allowedUserTypes={['farmer', 'distributor']}>
                        <BatchRegistration />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/verification" element={<UnifiedVerificationSystem />} />
                    <Route path="/verify" element={<UnifiedVerificationSystem />} />
                    
                    <Route path="/admin" element={
                      <ProtectedRoute allowedUserTypes={['admin']}>
                        <Admin />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="/helper-desk" element={
                      <ProtectedRoute allowedUserTypes={['helper', 'admin']}>
                        <HelperDesk />
                      </ProtectedRoute>
                    } />
                    
                    {/* Logistics Routes */}
                    <Route path="/driver-dashboard" element={
                      <ProtectedRoute allowedUserTypes={['driver']}>
                        <DriverDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/my-deliveries" element={
                      <ProtectedRoute>
                        <MyDeliveries />
                      </ProtectedRoute>
                    } />
                    <Route path="/become-driver" element={
                      <ProtectedRoute>
                        <BecomeDriver />
                      </ProtectedRoute>
                    } />
                    
                      {import.meta.env.DEV && TestPage && <Route path="/test" element={<TestPage />} />}
                      <Route path="/about" element={<Index />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </main>
              <Footer />
            </div>
          </Web3Provider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
