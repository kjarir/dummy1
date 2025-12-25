// Test script to verify the groups list fix
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNGE3ODVmNS04ZGZiLTQwZDgtODM3Yy1hNDk0MTZmMTExZGYiLCJlbWFpbCI6ImtqYXJpcjIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMzYzNjFhNjIyZjA1Mzk1MDNkZCIsInNjb3BlZEtleVNlY3JldCI6IjYzMWU1OGY5YTRlNzExY2NmYWEwNGZkMmZmYWFjNzhjMmE3ZDBlZWYyNzMyNTUzYTQxODc3MjY1YjhkNjc5MjEiLCJleHAiOjE3OTAxOTQ3NTF9.fND1AtRjFCAx7KspftaxcWjr4b40mSGQA5qpf5fRHYw';

async function testGroupsListFix() {
  console.log('🔧 Testing the groups list fix...');
  
  try {
    const response = await fetch("https://api.pinata.cloud/v3/groups/public", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      }
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('Parsed data:', data);
      
      // Check both possible response structures (FIXED VERSION)
      let groups = null;
      if (data.groups && Array.isArray(data.groups)) {
        groups = data.groups;
      } else if (data.data && data.data.groups && Array.isArray(data.data.groups)) {
        groups = data.data.groups;
      }
      
      if (groups) {
        console.log(`✅ FIXED! Found ${groups.length} groups`);
        groups.forEach((group, index) => {
          console.log(`  Group ${index + 1}:`, group);
        });
      } else {
        console.log('⚠️ No groups array found in response');
      }
    } else {
      console.error('❌ Failed to list groups:', response.status, responseText);
    }

  } catch (error) {
    console.error('❌ Error testing groups list fix:', error);
  }
}

// Run the test
testGroupsListFix();
