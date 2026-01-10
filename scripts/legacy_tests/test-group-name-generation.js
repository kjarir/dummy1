// Test script to check what group names are being generated
function generateGroupName(farmerName, cropType, variety) {
  console.log('🔍 DEBUG: generateGroupName inputs:', { farmerName, cropType, variety });
  
  const cleanFarmerName = farmerName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cleanCropType = cropType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cleanVariety = variety.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  
  const groupName = `${cleanFarmerName}_${cleanCropType}_${cleanVariety}`;
  console.log('🔍 DEBUG: generateGroupName result:', groupName);
  
  return groupName;
}

// Test with various inputs
const testCases = [
  { farmerName: 'John Doe', cropType: 'Rice', variety: 'Basmati' },
  { farmerName: 'Jane Smith', cropType: 'Wheat', variety: 'Durum' },
  { farmerName: 'Test Farmer', cropType: 'Corn', variety: 'Sweet Corn' },
  { farmerName: 'Farmer@123', cropType: 'Rice-Basmati', variety: 'Premium Grade' },
  { farmerName: 'Test User', cropType: 'Rice', variety: 'Basmati Rice' },
  { farmerName: '', cropType: 'Rice', variety: 'Basmati' }, // Empty farmer name
  { farmerName: 'Test', cropType: '', variety: 'Basmati' }, // Empty crop type
  { farmerName: 'Test', cropType: 'Rice', variety: '' }, // Empty variety
  { farmerName: 'Test Farmer With Very Long Name That Might Cause Issues', cropType: 'Rice', variety: 'Basmati' }, // Long name
  { farmerName: 'Test', cropType: 'Rice', variety: 'Basmati Rice Premium Grade Extra Long Name' }, // Long variety
];

console.log('🧪 Testing group name generation with various inputs:\n');

testCases.forEach((testCase, index) => {
  console.log(`=== Test Case ${index + 1} ===`);
  try {
    const result = generateGroupName(testCase.farmerName, testCase.cropType, testCase.variety);
    console.log('✅ Result:', result);
    console.log('Length:', result.length);
    console.log('Valid characters only:', /^[a-z0-9_]+$/.test(result));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('');
});
