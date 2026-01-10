// Test the Ethereum address fix
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
  
  const groupName = `${cleanFarmerName}_${cleanCropType}_${cleanVariety}`;
  console.log('🔍 DEBUG: generateGroupName result:', groupName);
  
  // Ensure group name is not too long
  if (groupName.length > 80) {
    const truncatedName = groupName.substring(0, 80);
    console.log('🔍 DEBUG: Group name too long, truncated to:', truncatedName);
    return truncatedName;
  }
  
  return groupName;
}

// Test with the actual Ethereum address from the error
const testCase = {
  farmerName: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  cropType: 'Rice',
  variety: 'Basmati'
};

console.log('🧪 Testing Ethereum address fix:\n');
const result = generateGroupName(testCase.farmerName, testCase.cropType, testCase.variety);
console.log('\n✅ Final result:', result);
console.log('✅ Starts with 0x?', result.startsWith('0x'));
console.log('✅ Valid characters only?', /^[a-z0-9_]+$/.test(result));
console.log('✅ Length:', result.length);
