// Test script to add file to group using two-step approach
// Step 1: Upload file to get file ID
// Step 2: Add file to group using PUT endpoint
// Run this with: node test-two-step-group-addition.js

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNGE3ODVmNS04ZGZiLTQwZDgtODM3Yy1hNDk0MTZmMTExZGYiLCJlbWFpbCI6ImtqYXJpcjIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMzYzNjFhNjIyZjA1Mzk1MDNkZCIsInNjb3BlZEtleVNlY3JldCI6IjYzMWU1OGY5YTRlNzExY2NmYWEwNGZkMmZmYWFjNzhjMmE3ZDBlZWYyNzMyNTUzYTQxODc3MjY1YjhkNjc5MjEiLCJleHAiOjE3OTAxOTQ3NTF9.fND1AtRjFCAx7KspftaxcWjr4b40mSGQA5qpf5fRHYw';
const GROUP_ID = '28d3a8cb-ec5d-4274-b3cc-4bc6286c0cec';

async function addFileToGroupTwoStep() {
  try {
    console.log('Adding file to group using two-step approach:', GROUP_ID);
    
    // Step 1: Upload file to get file ID
    console.log('Step 1: Uploading file to get file ID...');
    
    const testContent = `Test file for group ${GROUP_ID} using two-step approach
Generated: ${new Date().toISOString()}
Group ID: ${GROUP_ID}
Purpose: Two-step group addition test`;

    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    console.log('Test file created:', testFile.size, 'bytes');
    
    const formData = new FormData();
    formData.append("file", testFile, `two_step_test_${Date.now()}.txt`);
    formData.append("network", "public");

    console.log('Making request to v3/files endpoint...');
    
    const uploadResponse = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    console.log('File upload response status:', uploadResponse.status);
    
    const uploadResponseText = await uploadResponse.text();
    console.log('Upload response:', uploadResponseText);

    if (!uploadResponse.ok) {
      console.error('File upload failed:', uploadResponse.status, uploadResponseText);
      return;
    }

    const uploadData = JSON.parse(uploadResponseText);
    const fileId = uploadData.data.id;
    const ipfsHash = uploadData.data.cid;
    
    console.log(`✅ File uploaded successfully! File ID: ${fileId}, IPFS: ${ipfsHash}`);
    
    // Step 2: Add file to group using PUT endpoint
    console.log('Step 2: Adding file to group using PUT endpoint...');
    console.log(`Adding file ${fileId} to group ${GROUP_ID}`);
    
    const addToGroupResponse = await fetch(`https://api.pinata.cloud/v3/groups/public/${GROUP_ID}/ids/${fileId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
      },
    });

    console.log('Add to group response status:', addToGroupResponse.status);
    
    const addToGroupResponseText = await addToGroupResponse.text();
    console.log('Add to group response:', addToGroupResponseText);

    if (addToGroupResponse.ok) {
      console.log(`✅ File ${fileId} successfully added to group ${GROUP_ID}!`);
    } else {
      console.error('Failed to add file to group:', addToGroupResponse.status, addToGroupResponseText);
    }
    
  } catch (error) {
    console.error('Error in two-step group addition:', error);
  }
}

// Run the test
addFileToGroupTwoStep();
