# How to Update Contract ABI

## The Issue
The blockchain transaction manager is trying to call functions (`recordPurchase`, `recordHarvest`, `getBatchOwner`) that don't exist in the current contract ABI.

## Solution Options

### Option 1: Deploy Updated Contract and Get New ABI
1. **Deploy the updated contract** (`AgriTrace_Updated.sol`) to MegaETH testnet
2. **Get the new ABI** from the deployment
3. **Update the ABI file** (`src/contracts/AgriTrace.json`)
4. **Update contract address** (already done)

### Option 2: Use Remix IDE to Get ABI
1. **Open Remix IDE** (https://remix.ethereum.org)
2. **Create new file** and paste `AgriTrace_Updated.sol`
3. **Compile the contract**
4. **Copy the ABI** from the compilation artifacts
5. **Update** `src/contracts/AgriTrace.json`

### Option 3: Use Hardhat/Truffle
If you have Hardhat or Truffle setup:
```bash
# Compile and get ABI
npx hardhat compile
# ABI will be in artifacts/contracts/AgriTrace.sol/AgriTrace.json
```

## Required Functions in ABI
The ABI must include these functions:
- `recordPurchase(uint256,address,address,uint256,uint256)`
- `recordHarvest(uint256,address,string,string,uint256,uint256,string)`
- `getBatchOwner(uint256)`

## Current Status
- ✅ Contract address updated: `0xf8e81D47203A594245E36C48e151709F0C19fBe8`
- ❌ ABI needs to be updated with new functions
- ⏸️ Blockchain calls temporarily disabled
- ✅ IPFS + Database functionality working

## Next Steps
1. Deploy updated contract or get new ABI
2. Update `src/contracts/AgriTrace.json`
3. Re-enable blockchain calls in code
4. Test complete blockchain flow
