// Test script for single-step group uploads
// Option 1: FormData with group_id parameter
// Option 2: TUS protocol with group_id in metadata

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkNGE3ODVmNS04ZGZiLTQwZDgtODM3Yy1hNDk0MTZmMTExZGYiLCJlbWFpbCI6ImtqYXJpcjIzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMzYzNjFhNjIyZjA1Mzk1MDNkZCIsInNjb3BlZEtleVNlY3JldCI6IjYzMWU1OGY5YTRlNzExY2NmYWEwNGZkMmZmYWFjNzhjMmE3ZDBlZWYyNzMyNTUzYTQxODc3MjY1YjhkNjc5MjEiLCJleHAiOjE3OTAxOTQ3NTF9.fND1AtRjFCAx7KspftaxcWjr4b40mSGQA5qpf5fRHYw';
const GROUP_ID = '28d3a8cb-ec5d-4274-b3cc-4bc6286c0cec';

async function testFormDataGroupId() {
  console.log('\n=== OPTION 1: FormData with group_id parameter ===');
  try {
    console.log('Testing FormData upload with group_id parameter...');
    
    const testContent = `Single-step FormData upload test for group ${GROUP_ID}
Generated: ${new Date().toISOString()}
Group ID: ${GROUP_ID}
Method: FormData with group_id parameter`;

    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    console.log('Test file created:', testFile.size, 'bytes');
    
    const formData = new FormData();
    formData.append("file", testFile, `formdata_single_step_${Date.now()}.txt`);
    formData.append("network", "public");
    formData.append("group_id", GROUP_ID); // Try group_id parameter

    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log(key, `[Blob: ${value.size} bytes, type: ${value.type}]`);
      } else {
        console.log(key, value);
      }
    }

    console.log('Making request to v3/files endpoint with group_id parameter...');
    
    const response = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ FormData upload successful!');
      console.log('File ID:', data.data.id);
      console.log('IPFS Hash:', data.data.cid);
      
      // Check if group_id worked
      if (data.data.group_id === GROUP_ID) {
        console.log(`✅ File successfully uploaded to group ${GROUP_ID} in single step!`);
      } else {
        console.log(`⚠️ File uploaded but group_id in response: ${data.data.group_id}, expected: ${GROUP_ID}`);
      }
    } else {
      console.error('❌ FormData upload failed:', response.status, responseText);
    }
  } catch (error) {
    console.error('❌ FormData upload error:', error);
  }
}

async function testFormDataGroup() {
  console.log('\n=== OPTION 1B: FormData with "group" parameter ===');
  try {
    console.log('Testing FormData upload with "group" parameter...');
    
    const testContent = `Single-step FormData upload test for group ${GROUP_ID}
Generated: ${new Date().toISOString()}
Group ID: ${GROUP_ID}
Method: FormData with "group" parameter`;

    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    console.log('Test file created:', testFile.size, 'bytes');
    
    const formData = new FormData();
    formData.append("file", testFile, `formdata_group_${Date.now()}.txt`);
    formData.append("network", "public");
    formData.append("group", GROUP_ID); // Try "group" parameter

    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log(key, `[Blob: ${value.size} bytes, type: ${value.type}]`);
      } else {
        console.log(key, value);
      }
    }

    console.log('Making request to v3/files endpoint with "group" parameter...');
    
    const response = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ FormData upload successful!');
      console.log('File ID:', data.data.id);
      console.log('IPFS Hash:', data.data.cid);
      
      // Check if group worked
      if (data.data.group_id === GROUP_ID || data.data.group === GROUP_ID) {
        console.log(`✅ File successfully uploaded to group ${GROUP_ID} in single step!`);
      } else {
        console.log(`⚠️ File uploaded but group info in response:`, data.data);
      }
    } else {
      console.error('❌ FormData upload failed:', response.status, responseText);
    }
  } catch (error) {
    console.error('❌ FormData upload error:', error);
  }
}

async function testMetadataGroupId() {
  console.log('\n=== OPTION 2: Metadata with group_id ===');
  try {
    console.log('Testing metadata upload with group_id...');
    
    const testContent = `Single-step metadata upload test for group ${GROUP_ID}
Generated: ${new Date().toISOString()}
Group ID: ${GROUP_ID}
Method: Metadata with group_id`;

    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    console.log('Test file created:', testFile.size, 'bytes');
    
    const formData = new FormData();
    formData.append("file", testFile, `metadata_group_${Date.now()}.txt`);
    formData.append("network", "public");
    
    // Try adding group_id in metadata
    const metadata = {
      name: `metadata_group_${Date.now()}.txt`,
      group_id: GROUP_ID,
      timestamp: new Date().toISOString(),
      method: "metadata_group_id"
    };
    
    formData.append("metadata", JSON.stringify(metadata));

    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log(key, `[Blob: ${value.size} bytes, type: ${value.type}]`);
      } else {
        console.log(key, value);
      }
    }

    console.log('Making request to v3/files endpoint with group_id in metadata...');
    
    const response = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Metadata upload successful!');
      console.log('File ID:', data.data.id);
      console.log('IPFS Hash:', data.data.cid);
      
      // Check if group_id worked
      if (data.data.group_id === GROUP_ID) {
        console.log(`✅ File successfully uploaded to group ${GROUP_ID} in single step!`);
      } else {
        console.log(`⚠️ File uploaded but group_id in response: ${data.data.group_id}, expected: ${GROUP_ID}`);
      }
    } else {
      console.error('❌ Metadata upload failed:', response.status, responseText);
    }
  } catch (error) {
    console.error('❌ Metadata upload error:', error);
  }
}

async function runAllSingleStepTests() {
  console.log('🚀 Testing all single-step group upload methods...');
  console.log(`Target Group ID: ${GROUP_ID}`);
  
  await testFormDataGroupId();
  await testFormDataGroup();
  await testMetadataGroupId();
  
  console.log('\n✅ All single-step tests completed!');
}

// Run all tests
runAllSingleStepTests();
