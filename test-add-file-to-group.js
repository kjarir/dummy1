// Test script to manually add a file to the specific group ID
// Run this with: node test-add-file-to-group.js

const PINATA_API_KEY = 'f36361a622f0539503dd';
const PINATA_SECRET_KEY = '631e58f9a4e711ccfaa04fd2ffaac78c2a7d0eef2732553a41877265b8d67921';
const GROUP_ID = '28d3a8cb-ec5d-4274-b3cc-4bc6286c0cec';

async function addFileToGroup() {
  try {
    console.log('Adding file to group:', GROUP_ID);
    
    // Create a test file
    const testContent = `Test file for group ${GROUP_ID}
Generated: ${new Date().toISOString()}
Group ID: ${GROUP_ID}
Purpose: Manual file addition test`;

    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    console.log('Test file created:', testFile.size, 'bytes');
    
    const formData = new FormData();
    formData.append("file", testFile, `manual_test_${Date.now()}.txt`);
    formData.append("group", GROUP_ID); // Add group parameter

    // Add metadata with group information
    const pinataMetadata = {
      name: `manual_test_${Date.now()}.txt`,
      keyvalues: {
        groupId: GROUP_ID,
        manualTest: "true",
        timestamp: new Date().toISOString(),
        purpose: "manual_file_addition"
      }
    };

    const pinataOptions = {
      cidVersion: 1,
    };

    formData.append("pinataMetadata", JSON.stringify(pinataMetadata));
    formData.append("pinataOptions", JSON.stringify(pinataOptions));

    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log(key, `[Blob: ${value.size} bytes, type: ${value.type}]`);
      } else {
        console.log(key, value);
      }
    }

    console.log('Making request to pinFileToIPFS with group parameter...');
    
    // Use standard pinFileToIPFS endpoint with group parameter
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_KEY,
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
addFileToGroup();
