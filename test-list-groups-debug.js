// Test script to debug why groups are not being listed
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNGE3ODVmNS04ZGZiLTQwZDgtODM3Yy1hNDk0MTZmMTExZGYiLCJlbWFpbCI6ImtqYXJpcjIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMzYzNjFhNjIyZjA1Mzk1MDNkZCIsInNjb3BlZEtleVNlY3JldCI6IjYzMWU1OGY5YTRlNzExY2NmYWEwNGZkMmZmYWFjNzhjMmE3ZDBlZWYyNzMyNTUzYTQxODc3MjY1YjhkNjc5MjEiLCJleHAiOjE3OTAxOTQ3NTF9.fND1AtRjFCAx7KspftaxcWjr4b40mSGQA5qpf5fRHYw';

async function testListGroups() {
  console.log('🔍 Testing different ways to list groups...');
  
  try {
    // Method 1: Basic list groups
    console.log('\n=== METHOD 1: Basic List Groups ===');
    const response1 = await fetch("https://api.pinata.cloud/v3/groups/public", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      }
    });

    console.log('Response status:', response1.status);
    const responseText1 = await response1.text();
    console.log('Response:', responseText1);

    if (response1.ok) {
      const data1 = JSON.parse(responseText1);
      console.log('Parsed data:', data1);
      
      if (data1.groups && Array.isArray(data1.groups)) {
        console.log(`✅ Found ${data1.groups.length} groups using basic method`);
        data1.groups.forEach((group, index) => {
          console.log(`  Group ${index + 1}:`, group);
        });
      } else {
        console.log('⚠️ No groups array in response');
      }
    } else {
      console.error('❌ Failed to list groups:', response1.status, responseText1);
    }

    // Method 2: List groups with pagination
    console.log('\n=== METHOD 2: List Groups with Pagination ===');
    const response2 = await fetch("https://api.pinata.cloud/v3/groups/public?limit=50", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      }
    });

    console.log('Response status:', response2.status);
    const responseText2 = await response2.text();
    console.log('Response:', responseText2);

    if (response2.ok) {
      const data2 = JSON.parse(responseText2);
      console.log('Parsed data:', data2);
      
      if (data2.groups && Array.isArray(data2.groups)) {
        console.log(`✅ Found ${data2.groups.length} groups using pagination method`);
        data2.groups.forEach((group, index) => {
          console.log(`  Group ${index + 1}:`, group);
        });
      } else {
        console.log('⚠️ No groups array in response');
      }
    } else {
      console.error('❌ Failed to list groups with pagination:', response2.status, responseText2);
    }

    // Method 3: Check if groups are private vs public
    console.log('\n=== METHOD 3: Check Private Groups ===');
    const response3 = await fetch("https://api.pinata.cloud/v3/groups", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      }
    });

    console.log('Response status:', response3.status);
    const responseText3 = await response3.text();
    console.log('Response:', responseText3);

    if (response3.ok) {
      const data3 = JSON.parse(responseText3);
      console.log('Parsed data:', data3);
      
      if (data3.groups && Array.isArray(data3.groups)) {
        console.log(`✅ Found ${data3.groups.length} groups using private endpoint`);
        data3.groups.forEach((group, index) => {
          console.log(`  Group ${index + 1}:`, group);
        });
      } else {
        console.log('⚠️ No groups array in private response');
      }
    } else {
      console.error('❌ Failed to list private groups:', response3.status, responseText3);
    }

    // Method 4: Test specific known group ID
    console.log('\n=== METHOD 4: Test Specific Known Group ===');
    const knownGroupId = '28d3a8cb-ec5d-4274-b3cc-4bc6286c0cec';
    const response4 = await fetch(`https://api.pinata.cloud/v3/groups/public/${knownGroupId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      }
    });

    console.log('Response status:', response4.status);
    const responseText4 = await response4.text();
    console.log('Response:', responseText4);

    if (response4.ok) {
      const data4 = JSON.parse(responseText4);
      console.log('✅ Specific group found:', data4);
    } else {
      console.error('❌ Failed to get specific group:', response4.status, responseText4);
    }

  } catch (error) {
    console.error('❌ Error testing list groups:', error);
  }
}

// Run the test
testListGroups();
