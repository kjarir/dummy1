// Test script to manually add a file to the specific group ID using v3 endpoint
// Run this with: node test-add-file-to-group-v3.js

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNGE3ODVmNS04ZGZiLTQwZDgtODM3Yy1hNDk0MTZmMTExZGYiLCJlbWFpbCI6ImtqYXJpcjIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMzYzNjFhNjIyZjA1Mzk1MDNkZCIsInNjb3BlZEtleVNlY3JldCI6IjYzMWU1OGY5YTRlNzExY2NmYWEwNGZkMmZmYWFjNzhjMmE3ZDBlZWYyNzMyNTUzYTQxODc3MjY1YjhkNjc5MjEiLCJleHAiOjE3OTAxOTQ3NTF9.fND1AtRjFCAx7KspftaxcWjr4b40mSGQA5qpf5fRHYw';
const GROUP_ID = '28d3a8cb-ec5d-4274-b3cc-4bc6286c0cec';

async function addFileToGroupV3() {
  try {
    console.log('Adding file to group using v3 endpoint:', GROUP_ID);
    
    // Create a test file
    const testContent = `Test file for group ${GROUP_ID} using v3 endpoint
Generated: ${new Date().toISOString()}
Group ID: ${GROUP_ID}
Purpose: Manual file addition test with v3 API`;

    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    console.log('Test file created:', testFile.size, 'bytes');
    
    const formData = new FormData();
    formData.append("file", testFile, `v3_test_${Date.now()}.txt`);
    formData.append("network", "public");
    formData.append("group", GROUP_ID); // Add group parameter

    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log(key, `[Blob: ${value.size} bytes, type: ${value.type}]`);
      } else {
        console.log(key, value);
      }
    }

    console.log('Making request to v3/files endpoint with group parameter...');
    
    // Use v3/files endpoint with JWT authentication
    const response = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    console.log('File upload response status:', response.status);
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('File uploaded successfully:', data);
      
      // Check if file was uploaded to group
      if (data.GroupId && data.GroupId === GROUP_ID) {
        console.log(`✅ File successfully uploaded to group ${GROUP_ID}`);
        console.log(`IPFS Hash: ${data.IpfsHash}`);
      } else {
        console.log(`⚠️ File uploaded but GroupId in response: ${data.GroupId}, expected: ${GROUP_ID}`);
      }
    } else {
      console.error('File upload failed:', response.status, responseText);
    }
  } catch (error) {
    console.error('Error uploading file to group:', error);
  }
}

// Run the test
addFileToGroupV3();
