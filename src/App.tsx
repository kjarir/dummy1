import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Web3Provider } from "@/contexts/Web3Context";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";

// Pages
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Auth/Login";
import { Signup } from "./pages/Auth/Signup";
import { UnifiedDashboard } from "./pages/Dashboard/UnifiedDashboard";
import { Marketplace } from "./pages/Marketplace";
import { FarmerMarketplace } from "./pages/FarmerMarketplace";
import { DistributorMarketplace } from "./pages/DistributorMarketplace";
import { DistributorInventory } from "./pages/DistributorInventory";
import { RetailerMarketplace } from "./pages/RetailerMarketplace";
import { RetailerInventory } from "./pages/RetailerInventory";
import { TrackProducts } from "./pages/TrackProducts";
import { Profile } from "./pages/Profile";
import { BatchRegistration } from "./pages/BatchRegistration";
import { Admin } from "./pages/Admin";
import { Unauthorized } from "./pages/Unauthorized";
import { TestPage } from "./pages/TestPage";
import { UnifiedVerificationSystem } from "./components/UnifiedVerificationSystem";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

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
                  
                  <Route path="/batch-registration" element={
                    <ProtectedRoute allowedUserTypes={['farmer']}>
                      <BatchRegistration />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/verification" element={<UnifiedVerificationSystem />} />
                  
                  <Route path="/admin" element={
                    <ProtectedRoute allowedUserTypes={['admin']}>
                      <Admin />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/test" element={<TestPage />} />
                  <Route path="/about" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
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
