// Debug script to identify the 400 error in group creation
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNGE3ODVmNS04ZGZiLTQwZDgtODM3Yy1hNDk0MTZmMTExZGYiLCJlbWFpbCI6ImtqYXJpcjIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMzYzNjFhNjIyZjA1Mzk1MDNkZCIsInNjb3BlZEtleVNlY3JldCI6IjYzMWU1OGY5YTRlNzExY2NmYWEwNGZkMmZmYWFjNzhjMmE3ZDBlZWYyNzMyNTUzYTQxODc3MjY1YjhkNjc5MjEiLCJleHAiOjE3OTAxOTQ3NTF9.fND1AtRjFCAx7KspftaxcWjr4b40mSGQA5qpf5fRHYw';

async function debugGroupCreation() {
  console.log('🔍 Debugging group creation 400 error...');
  
  // Test different group name formats
  const testGroupNames = [
    'test_simple',
    'Test Simple',
    'test_simple_group',
    'john_doe_rice_basmati',
    'test-group-name',
    'test group name',
    'test@group#name',
    'test_group_123',
    'a', // Very short name
    'a'.repeat(100), // Very long name
    'test_group_2025-01-25', // With date
    'test_group_1758833000000' // With timestamp
  ];

  for (const groupName of testGroupNames) {
    console.log(`\n=== Testing group name: "${groupName}" ===`);
    
    try {
      const payload = JSON.stringify({ name: groupName });
      console.log('Payload:', payload);
      
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
        break; // Stop on first success
      } else {
        const errorData = JSON.parse(responseText);
        console.log('❌ FAILED:', errorData);
      }
    } catch (error) {
      console.error('❌ ERROR:', error);
    }
  }

  // Test with minimal payload
  console.log('\n=== Testing minimal payload ===');
  try {
    const payload = JSON.stringify({ name: "minimal_test" });
    console.log('Minimal payload:', payload);
    
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
  } catch (error) {
    console.error('❌ ERROR:', error);
  }

  // Test with different headers
  console.log('\n=== Testing different headers ===');
  try {
    const payload = JSON.stringify({ name: "header_test" });
    
    const response = await fetch("https://api.pinata.cloud/v3/groups/public", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: payload,
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Run the debug
debugGroupCreation();
