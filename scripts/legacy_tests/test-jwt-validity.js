// Test JWT token validity
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNGE3ODVmNS04ZGZiLTQwZDgtODM3Yy1hNDk0MTZmMTExZGYiLCJlbWFpbCI6ImtqYXJpcjIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMzYzNjFhNjIyZjA1Mzk1MDNkZCIsInNjb3BlZEtleVNlY3JldCI6IjYzMWU1OGY5YTRlNzExY2NmYWEwNGZkMmZmYWFjNzhjMmE3ZDBlZWYyNzMyNTUzYTQxODc3MjY1YjhkNjc5MjEiLCJleHAiOjE3OTAxOTQ3NTF9.fND1AtRjFCAx7KspftaxcWjr4b40mSGQA5qpf5fRHYw';

async function testJWTValidity() {
  console.log('🔍 Testing JWT token validity...');
  
  try {
    // Test 1: List pinned files (basic auth test)
    const response1 = await fetch("https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=1", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      }
    });

    console.log('Pin list response status:', response1.status);
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ JWT is valid, found', data1.count, 'pinned files');
    } else {
      const error1 = await response1.text();
      console.log('❌ JWT test failed:', response1.status, error1);
      return;
    }

    // Test 2: Create a simple group
    console.log('\n🔍 Testing group creation with JWT...');
    const groupName = `jwt_test_${Date.now()}`;
    const payload = JSON.stringify({ name: groupName });
    
    const response2 = await fetch("https://api.pinata.cloud/v3/groups/public", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: payload,
    });

    console.log('Group creation response status:', response2.status);
    const responseText2 = await response2.text();
    console.log('Group creation response:', responseText2);

    if (response2.ok) {
      const data2 = JSON.parse(responseText2);
      console.log('✅ Group creation successful with JWT:', data2);
    } else {
      const error2 = JSON.parse(responseText2);
      console.log('❌ Group creation failed:', error2);
    }

  } catch (error) {
    console.error('❌ Error testing JWT:', error);
  }
}

// Run the test
testJWTValidity();
