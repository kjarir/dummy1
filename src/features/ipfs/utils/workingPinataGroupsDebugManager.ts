import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Working Pinata Groups Debug Manager - Tests direct group upload approach
 */
export class WorkingPinataGroupsDebugManager {
  
  /**
   * Test JWT token validity
   */
  public async testJWTToken(): Promise<boolean> {
    try {
      console.log('Testing JWT token...');
      
      const response = await fetch("https://api.pinata.cloud/data/pinList?pageLimit=1", {
        method: "GET",
        headers: {
          "pinata_api_key": PINATA_CONFIG.apiKey,
          "pinata_secret_api_key": PINATA_CONFIG.apiSecret,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('JWT test successful, found', data.count, 'pinned files');
        return true;
      } else {
        console.error('JWT test failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('JWT test error:', error);
      return false;
    }
  }

  /**
   * Test group creation with real Pinata Groups API
   */
  public async testGroupCreation(groupName: string): Promise<{ success: boolean; groupId?: string; error?: string }> {
    try {
      console.log('Testing real Pinata group creation...');
      console.log('Group name:', groupName);
      
      const payload = JSON.stringify({
        name: groupName,
      });

      console.log('Group creation payload:', payload);

      const response = await fetch("https://api.pinata.cloud/v3/groups/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
        body: payload,
      });

      console.log('Group creation response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('Group creation successful:', data);
        
        if (data.data && data.data.id) {
          console.log(`✅ Group created successfully: ${data.data.id}`);
          return { success: true, groupId: data.data.id };
        } else {
          return { success: false, error: 'No group ID in response' };
        }
      } else {
        console.error('Group creation failed:', response.status, responseText);
        return { success: false, error: `Status ${response.status}: ${responseText}` };
      }
    } catch (error) {
      console.error('Group creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test file upload to group using two-step approach
   */
  public async testFileUploadToGroup(groupId: string): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
    try {
      console.log('Testing file upload to group using two-step approach...');
      console.log('Group ID:', groupId);
      
      // Step 1: Upload file to get file ID
      console.log('Step 1: Uploading file to get file ID...');
      
      const testFile = new File(["Test content for working group upload using two-step approach"], "test.txt", { type: "text/plain" });
      
      const formData = new FormData();
      formData.append("file", testFile);
      formData.append("network", "public");

      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (key === 'file') {
          console.log(key, `[Blob: ${(value as Blob).size} bytes, type: ${(value as Blob).type}]`);
        } else {
          console.log(key, value);
        }
      }

      console.log('Making request to v3/files endpoint...');
      
      const uploadResponse = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PINATA_CONFIG.jwt}`,
        },
        body: formData,
      });

      console.log('File upload response status:', uploadResponse.status);
      
      const uploadResponseText = await uploadResponse.text();
      console.log('Upload response:', uploadResponseText);

      if (!uploadResponse.ok) {
        console.error('File upload failed:', uploadResponse.status, uploadResponseText);
        return { success: false, error: `Upload failed: ${uploadResponse.status} ${uploadResponseText}` };
      }

      const uploadData = JSON.parse(uploadResponseText);
      const fileId = uploadData.data.id;
      const ipfsHash = uploadData.data.cid;
      
      console.log(`✅ File uploaded successfully! File ID: ${fileId}, IPFS: ${ipfsHash}`);
      
      // Step 2: Add file to group using PUT endpoint
      console.log('Step 2: Adding file to group using PUT endpoint...');
      console.log(`Adding file ${fileId} to group ${groupId}`);
      
      const addToGroupResponse = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}/ids/${fileId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${PINATA_CONFIG.jwt}`,
        },
      });

      console.log('Add to group response status:', addToGroupResponse.status);
      
      const addToGroupResponseText = await addToGroupResponse.text();
      console.log('Add to group response:', addToGroupResponseText);

      if (!addToGroupResponse.ok) {
        console.error('Failed to add file to group:', addToGroupResponse.status, addToGroupResponseText);
        return { success: false, error: `Add to group failed: ${addToGroupResponse.status} ${addToGroupResponseText}` };
      }

      console.log(`✅ File ${fileId} successfully added to group ${groupId}!`);
      
      return { success: true, ipfsHash: ipfsHash };
    } catch (error) {
      console.error('File upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test list groups using real Pinata Groups API
   */
  public async testListGroups(): Promise<{ success: boolean; groups?: any[]; error?: string }> {
    try {
      console.log('Testing list groups with real Pinata Groups API...');
      
      const response = await fetch("https://api.pinata.cloud/v3/groups/public", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Groups response:', data);
        
        // Check both possible response structures
        let groups = null;
        if (data.groups && Array.isArray(data.groups)) {
          groups = data.groups;
        } else if (data.data && data.data.groups && Array.isArray(data.data.groups)) {
          groups = data.data.groups;
        }
        
        if (groups) {
          console.log(`✅ Found ${groups.length} groups`);
          groups.forEach((group, index) => {
            console.log(`  Group ${index + 1}:`, group);
          });
          return { success: true, groups: groups };
        } else {
          console.log('⚠️ No groups array found in response');
          return { success: true, groups: [] };
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to list groups:', response.status, errorText);
        return { success: false, error: `Status ${response.status}: ${errorText}` };
      }
    } catch (error) {
      console.error('Error listing groups:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test get group details
   */
  public async testGetGroup(groupId: string): Promise<{ success: boolean; group?: any; error?: string }> {
    try {
      console.log('Testing get group details:', groupId);
      
      const response = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Group details:', data);
        return { success: true, group: data };
      } else {
        const errorText = await response.text();
        console.error('Failed to get group:', response.status, errorText);
        return { success: false, error: `Status ${response.status}: ${errorText}` };
      }
    } catch (error) {
      console.error('Error getting group:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all tests
   */
  public async runAllTests(): Promise<void> {
    try {
      console.log('Running all working Pinata Groups tests...');
      
      const testGroupName = `Working Test Group ${Date.now()}`;
      
      // Test 1: JWT
      console.log('1. Testing JWT token...');
      const jwtValid = await this.testJWTToken();
      console.log('JWT test result:', jwtValid);
      
      if (jwtValid) {
        // Test 2: List existing groups
        console.log('2. Testing list groups...');
        const listResult = await this.testListGroups();
        console.log('List groups result:', listResult);
        
        // Test 3: Create group
        console.log('3. Testing group creation...');
        const groupResult = await this.testGroupCreation(testGroupName);
        console.log('Group creation result:', groupResult);
        
        if (groupResult.success && groupResult.groupId) {
          // Test 4: Upload file directly to group
          console.log('4. Testing file upload directly to group...');
          const uploadResult = await this.testFileUploadToGroup(groupResult.groupId);
          console.log('File upload result:', uploadResult);
          
          // Test 5: Get group details
          console.log('5. Testing get group details...');
          const getGroupResult = await this.testGetGroup(groupResult.groupId);
          console.log('Get group result:', getGroupResult);
          
          // Test 6: List groups again
          console.log('6. Testing list groups again...');
          const listResult2 = await this.testListGroups();
          console.log('List groups result 2:', listResult2);
        }
      }
      
      console.log('All working Pinata Groups tests completed');
    } catch (error) {
      console.error('Error running tests:', error);
    }
  }
}

// Export singleton instance
export const workingPinataGroupsDebugManager = new WorkingPinataGroupsDebugManager();
