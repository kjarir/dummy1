// Test unique group name generation
function generateGroupName(farmerName, cropType, variety) {
  console.log('🔍 DEBUG: generateGroupName inputs:', { farmerName, cropType, variety });
  
  // Handle empty/undefined values
  const safeFarmerName = farmerName || 'unknown_farmer';
  const safeCropType = cropType || 'unknown_crop';
  const safeVariety = variety || 'unknown_variety';
  
  // Clean the farmer name - handle Ethereum addresses specially
  let cleanFarmerName = safeFarmerName;
  if (safeFarmerName.startsWith('0x')) {
    // For Ethereum addresses, use the last 8 characters without 0x, convert to lowercase
    cleanFarmerName = `addr_${safeFarmerName.slice(-8).toLowerCase()}`;
    console.log('🔍 DEBUG: Ethereum address detected, converted to:', cleanFarmerName);
  } else {
    cleanFarmerName = safeFarmerName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
  
  const cleanCropType = safeCropType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cleanVariety = safeVariety.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  
  // Add timestamp to make group name unique
  const timestamp = Date.now();
  const groupName = `${cleanFarmerName}_${cleanCropType}_${cleanVariety}_${timestamp}`;
  console.log('🔍 DEBUG: generateGroupName result:', groupName);
  
  // Ensure group name is not too long
  if (groupName.length > 80) {
    const truncatedName = groupName.substring(0, 80);
    console.log('🔍 DEBUG: Group name too long, truncated to:', truncatedName);
    return truncatedName;
  }
  
  return groupName;
}

// Test with the same inputs multiple times to verify uniqueness
const testCase = {
  farmerName: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  cropType: 'Rice',
  variety: 'Basmati'
};

console.log('🧪 Testing unique group name generation:\n');

for (let i = 1; i <= 3; i++) {
  console.log(`=== Test ${i} ===`);
  const result = generateGroupName(testCase.farmerName, testCase.cropType, testCase.variety);
  console.log('✅ Result:', result);
  console.log('✅ Length:', result.length);
  console.log('✅ Unique timestamp:', result.includes(Date.now().toString().slice(0, -3))); // Check if contains current timestamp (roughly)
  console.log('');
}
