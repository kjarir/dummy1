// Test the fixed group name with Pinata API
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNGE3ODVmNS04ZGZiLTQwZDgtODM3Yy1hNDk0MTZmMTExZGYiLCJlbWFpbCI6ImtqYXJpcjIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMzYzNjFhNjIyZjA1Mzk1MDNkZCIsInNjb3BlZEtleVNlY3JldCI6IjYzMWU1OGY5YTRlNzExY2NmYWEwNGZkMmZmYWFjNzhjMmE3ZDBlZWYyNzMyNTUzYTQxODc3MjY1YjhkNjc5MjEiLCJleHAiOjE3OTAxOTQ3NTF9.fND1AtRjFCAx7KspftaxcWjr4b40mSGQA5qpf5fRHYw';

async function testFixedGroupName() {
  console.log('🧪 Testing fixed group name with Pinata API...');
  
  // Test with the fixed group name
  const fixedGroupName = 'addr_17dc79c8_rice_basmati';
  console.log('🔍 Testing group name:', fixedGroupName);
  console.log('🔍 Starts with 0x?', fixedGroupName.startsWith('0x'));
  console.log('🔍 Valid characters only?', /^[a-z0-9_]+$/.test(fixedGroupName));
  console.log('🔍 Length:', fixedGroupName.length);
  
  try {
    const payload = JSON.stringify({ name: fixedGroupName });
    console.log('🔍 Payload:', payload);
    
    const response = await fetch("https://api.pinata.cloud/v3/groups/public", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: payload,
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ SUCCESS! Group created:', data);
      console.log('✅ Group ID:', data.data.id);
    } else {
      const errorData = JSON.parse(responseText);
      console.log('❌ FAILED:', errorData);
    }

  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Run the test
testFixedGroupName();
