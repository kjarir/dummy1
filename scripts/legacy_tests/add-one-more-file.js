// Add one more file to the group using the working single-step method
const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNGE3ODVmNS04ZGZiLTQwZDgtODM3Yy1hNDk0MTZmMTExZGYiLCJlbWFpbCI6ImtqYXJpcjIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMzYzNjFhNjIyZjA1Mzk1MDNkZCIsInNjb3BlZEtleVNlY3JldCI6IjYzMWU1OGY5YTRlNzExY2NmYWEwNGZkMmZmYWFjNzhjMmE3ZDBlZWYyNzMyNTUzYTQxODc3MjY1YjhkNjc5MjEiLCJleHAiOjE3OTAxOTQ3NTF9.fND1AtRjFCAx7KspftaxcWjr4b40mSGQA5qpf5fRHYw';
const GROUP_ID = '28d3a8cb-ec5d-4274-b3cc-4bc6286c0cec';

async function addOneMoreFile() {
  console.log('🎯 Adding ONE MORE FILE to group using SINGLE-STEP method...');
  console.log(`Target Group ID: ${GROUP_ID}`);
  
  try {
    const testContent = `🚀 ADDITIONAL FILE - Single-step upload test #${Date.now()}
Group ID: ${GROUP_ID}
Method: FormData with group_id parameter (WORKING METHOD)
Timestamp: ${new Date().toISOString()}
Purpose: Adding one more file to verify single-step upload works consistently
Status: This file should appear directly in the Pinata group!`;

    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    console.log('📄 Test file created:', testFile.size, 'bytes');
    
    const formData = new FormData();
    formData.append("file", testFile, `additional_file_${Date.now()}.txt`);
    formData.append("network", "public");
    formData.append("group_id", GROUP_ID); // ← WORKING SINGLE-STEP METHOD

    console.log('📋 FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log(`  ${key}: [Blob: ${value.size} bytes, type: ${value.type}]`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    console.log('🚀 Making SINGLE-STEP request to v3/files endpoint with group_id...');
    
    const response = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    console.log('📊 Response status:', response.status);
    const responseText = await response.text();
    console.log('📋 Response:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n✅ SUCCESS! Additional file uploaded!');
      console.log('📁 File ID:', data.data.id);
      console.log('🔗 IPFS Hash:', data.data.cid);
      console.log('🏷️ Group ID in response:', data.data.group_id);
      
      if (data.data.group_id === GROUP_ID) {
        console.log(`🎉 PERFECT! File successfully uploaded to group ${GROUP_ID} in SINGLE STEP!`);
        console.log('🔍 This file should now be visible in your Pinata Groups dashboard!');
      } else {
        console.log(`⚠️ File uploaded but group_id mismatch. Expected: ${GROUP_ID}, Got: ${data.data.group_id}`);
      }
    } else {
      console.error('❌ Upload failed:', response.status, responseText);
    }
  } catch (error) {
    console.error('❌ Error uploading additional file:', error);
  }
}

// Run the function
addOneMoreFile();
