# Features Organization Guide

This document describes the feature-based folder structure of the AgriTrace codebase.

## 📁 Feature Folders Structure

### 🚚 `features/truck-pooling/`
**Logistics & Delivery Management**
- **components/**: `TruckPoolingModal.tsx`, `DeliveryDetailsModal.tsx`, `DeliveryMap.tsx`
- **pages/**: `DriverDashboard.tsx`, `MyDeliveries.tsx`, `BecomeDriver.tsx`
- **hooks/**: `useDeliveryRequests.ts`, `useDriverNotifications.ts`
- **services/**: `deliveryService.ts`

### ✅ `features/verification/`
**Certificate & Batch Verification Systems**
- **components/**: `UnifiedVerificationSystem.tsx`, `VerificationSystem.tsx`, `GroupVerificationSystem.tsx`, `ComprehensiveVerificationSystem.tsx`
- **pages/**: `GroupVerification.tsx`
- **utils/**: `certificateVerification.ts`, `verificationSystem.ts`

### 🛒 `features/marketplace/`
**Marketplace Pages & Components**
- **pages/**: `Marketplace.tsx`, `FarmerMarketplace.tsx`, `DistributorMarketplace.tsx`, `RetailerMarketplace.tsx`
- **components/**: `MarketPriceDisplay.tsx`, `MarketPriceTest.tsx`
- **utils/**: `marketPriceAPI.ts`

### 📦 `features/batch-registration/`
**Batch Registration & Voice Services**
- **pages/**: `BatchRegistration.tsx`
- **components/**: `BatchDetailsModal.tsx`, `BatchList.tsx`, `BatchQuantityDisplay.tsx`
- **services/**: `voicegenieService.ts`, `voicegenieBatchRegistration.ts`
- **utils/**: `harvestTransactionCreator.ts`

### 📱 `features/qr-code/`
**QR Code Generation & Scanning**
- **components/**: `QRCodeDisplay.tsx`, `QRCodeModal.tsx`, `QRCodeScanner.tsx`, `QuickCertificateQR.tsx`, `InventoryQRDisplay.tsx`
- **utils/**: `qrCodeGenerator.ts`, `qrCodeUtils.ts`

### ⛓️ `features/blockchain/`
**Blockchain Integration & Web3**
- **contexts/**: `Web3Context.tsx`
- **components/**: `BlockchainTransactionHistory.tsx`
- **utils/**: `blockchainTransactionManager.ts`, `transactionManager.ts`, `purchaseTransactionCreator.ts`, `contractUtils.ts`

### 📜 `features/certificate/`
**Certificate Generation & Management**
- **utils/**: `certificateGenerator.ts`, `groupCertificateGenerator.ts`, `immutableCertificateGenerator.ts`, `dynamicCertificateUpdater.ts`, `ipfsCertificateUpdater.ts`

### 🔗 `features/supply-chain/`
**Supply Chain Tracking & Display**
- **components/**: `SupplyChainDisplay.tsx`, `SupplyChainTracker.tsx`, `ImmutableSupplyChainDisplay.tsx`
- **pages/**: `TrackProducts.tsx`
- **utils/**: `supplyChainTracker.ts`

### 📊 `features/inventory/`
**Inventory Management**
- **pages/**: `DistributorInventory.tsx`, `RetailerInventory.tsx`

### 💰 `features/purchase/`
**Purchase Modals & Transactions**
- **components/**: `PurchaseModal.tsx`, `SimplePurchaseModal.tsx`, `UltraSimplePurchaseModal.tsx`
- **utils/**: `purchaseHistory.ts`

### 🤖 `features/ai-services/`
**AI & ML Services**
- **pages/**: `CropHealthDetection.tsx`
- **services/**: `cropHealthService.ts`, `cropAnalysisService.ts`, `diseasePredictorService.ts`, `geminiService.ts`, `iotSoilDataService.ts`

### 🌐 `features/ipfs/`
**IPFS & Pinata Integration**
- **utils/**: `ipfs.ts`, `ipfsRealityCheck.ts`, `singleStepGroupManager.ts`, `manualGroupFileAdder.ts`, and all group manager files

### 🐛 `features/debug/`
**Debug & Development Tools**
- **components/**: `DatabaseDebugger.tsx`, `DatabaseMigrationButton.tsx`, `DataCleanupButton.tsx`, `DebugGroupManager.tsx`, `SingleStepDebugManager.tsx`, `TransactionSystemTest.tsx`, `ManualGroupFileAdder.tsx`
- **utils/**: `workingDebugManager.ts`, `singleStepDebugManager.ts`

### 🗄️ `features/database/`
**Database Utilities**
- **utils/**: `databaseMigration.ts`, `databaseUtils.ts`, `cleanupGradingField.ts`

## 📝 Import Path Examples

### Before:
```typescript
import { TruckPoolingModal } from '@/components/TruckPoolingModal';
import { deliveryService } from '@/services/deliveryService';
import { useDeliveryRequests } from '@/hooks/useDeliveryRequests';
```

### After:
```typescript
import { TruckPoolingModal } from '@/features/truck-pooling/components/TruckPoolingModal';
import { deliveryService } from '@/features/truck-pooling/services/deliveryService';
import { useDeliveryRequests } from '@/features/truck-pooling/hooks/useDeliveryRequests';
```

## 🎯 Benefits of This Organization

1. **Better Code Discovery**: Related files are grouped together
2. **Easier Maintenance**: Changes to a feature are localized to one folder
3. **Clearer Dependencies**: Feature boundaries are explicit
4. **Scalability**: Easy to add new features or refactor existing ones
5. **Team Collaboration**: Multiple developers can work on different features without conflicts

## 📌 Notes

- **Shared Components**: UI components (`src/components/ui/`) remain in the root components folder as they're shared across features
- **Layout Components**: `Header.tsx` and `Footer.tsx` remain in `src/components/layout/`
- **Core Pages**: Pages like `Landing.tsx`, `Profile.tsx`, `Admin.tsx` remain in `src/pages/` as they're not feature-specific
- **Contexts**: `AuthContext.tsx` remains in `src/contexts/` as it's shared across features

