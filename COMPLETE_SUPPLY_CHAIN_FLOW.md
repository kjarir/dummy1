# Complete Supply Chain Flow

## 🌱 **Step 1: Farmer Registers Batch**
1. **Farmer** fills batch registration form
2. **Blockchain Transaction** - `registerBatch()` called
3. **IPFS Group Created** - Certificate uploaded to Pinata
4. **Database Updated** - Batch stored in Supabase
5. **Batch Available** - Shows in Farmer Marketplace

## 🛒 **Step 2: Distributor Buys from Farmer**
1. **Distributor** browses Farmer Marketplace (`/marketplace`)
2. **Sees Farmer Batches** - Only batches where `current_owner = farmer_id`
3. **Makes Purchase** - Clicks "Buy" on farmer batch
4. **Blockchain Transaction** - `recordPurchase()` called
5. **IPFS Certificate** - Purchase certificate added to same group
6. **Database Updated** - Transaction recorded, ownership transferred
7. **Batch Moved** - Now owned by distributor

## 🏪 **Step 3: Distributor Lists for Retailers**
1. **Distributor** goes to Distributor Inventory (`/distributor-inventory`)
2. **Sees Purchased Batches** - Batches they own
3. **Can Edit Price** - Update pricing for retailers
4. **Batch Available** - Shows in Retailer Marketplace (`/retailer-marketplace`)

## 🛍️ **Step 4: Retailer Buys from Distributor**
1. **Retailer** browses Retailer Marketplace (`/retailer-marketplace`)
2. **Sees Distributor Batches** - Only batches where `current_owner != farmer_id`
3. **Makes Purchase** - Clicks "Buy" on distributor batch
4. **Blockchain Transaction** - `recordPurchase()` called
5. **IPFS Certificate** - Purchase certificate added to same group
6. **Database Updated** - Transaction recorded, ownership transferred
7. **Batch Moved** - Now owned by retailer

## 📊 **Step 5: Complete Traceability**
1. **All Transactions** - Recorded on blockchain
2. **All Certificates** - Stored in same IPFS group
3. **Complete History** - Available in inventory modals
4. **Blockchain Verification** - All transactions verifiable

## 🔄 **Current Status:**
- ✅ **Farmer Registration** - Working with blockchain + IPFS
- ✅ **Distributor Purchase** - Working with blockchain + IPFS
- ✅ **Retailer Purchase** - Working with blockchain + IPFS
- ✅ **Inventory Management** - Working for all user types
- ✅ **Transaction History** - Complete blockchain + database history
- ✅ **Certificate Downloads** - All certificates available

## 🎯 **Key Features:**
- **Immutable Blockchain Records** - All transactions on blockchain
- **IPFS Certificate Storage** - All certificates in same group
- **Complete Traceability** - From farm to consumer
- **Role-based Access** - Each user type sees appropriate content
- **Real-time Updates** - Ownership changes immediately
- **Certificate Verification** - All certificates downloadable

## 🚀 **Testing the Flow:**
1. **Register as Farmer** - Create a batch
2. **Login as Distributor** - Buy from farmer marketplace
3. **Check Distributor Inventory** - See purchased batches
4. **Login as Retailer** - Buy from retailer marketplace
5. **Check Retailer Inventory** - See purchased batches
6. **View Transaction History** - See complete blockchain + database history
