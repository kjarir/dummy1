import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Single-Step Pinata Groups Debug Manager - Test the single-step group upload approach
 */
export class SingleStepDebugManager {
  
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
      console.log('Testing single-step group creation...');
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
   * Test single-step file upload to group using group_id parameter
   */
  public async testSingleStepFileUpload(groupId: string): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
    try {
      console.log('Testing SINGLE-STEP file upload to group...');
      console.log('Group ID:', groupId);
      
      const testContent = `Single-step upload test for group ${groupId}
Generated: ${new Date().toISOString()}
Group ID: ${groupId}
Method: FormData with group_id parameter (SINGLE-STEP)
Status: This file should be uploaded directly to the group in one API call!`;

      const testFile = new File([testContent], `single_step_test_${Date.now()}.txt`, { type: "text/plain" });
      
      console.log('Test file created:', testFile.name, 'Size:', testFile.size, 'bytes');
      
      const formData = new FormData();
      formData.append("file", testFile);
      formData.append("network", "public");
      formData.append("group_id", groupId); // ← SINGLE-STEP KEY: group_id parameter

      // Add metadata
      const metadata = {
        name: testFile.name,
        keyvalues: {
          groupId: groupId,
          testFile: "true",
          method: "single_step",
          timestamp: new Date().toISOString()
        }
      };
      formData.append("metadata", JSON.stringify(metadata));

      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (key === 'file') {
          console.log(`  ${key}: [Blob: ${(value as Blob).size} bytes, type: ${(value as Blob).type}]`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      console.log('🚀 Making SINGLE-STEP request to v3/files endpoint with group_id...');
      
      const response = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PINATA_CONFIG.jwt}`,
        },
        body: formData,
      });

      console.log('File upload response status:', response.status);
      
      const responseText = await response.text();
      console.log('Upload response:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('✅ SINGLE-STEP upload successful!');
        console.log('File ID:', data.data.id);
        console.log('IPFS Hash:', data.data.cid);
        console.log('Group ID in response:', data.data.group_id);
        
        // Verify group association
        if (data.data.group_id === groupId) {
          console.log(`🎉 PERFECT! File successfully uploaded to group ${groupId} in SINGLE STEP!`);
          return { success: true, ipfsHash: data.data.cid };
        } else {
          console.log(`⚠️ File uploaded but group_id mismatch. Expected: ${groupId}, Got: ${data.data.group_id}`);
          return { success: true, ipfsHash: data.data.cid };
        }
      } else {
        console.error('❌ Single-step upload failed:', response.status, responseText);
        return { success: false, error: `Status ${response.status}: ${responseText}` };
      }
    } catch (error) {
      console.error('❌ Single-step upload error:', error);
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
   * Run all single-step tests
   */
  public async runAllTests(): Promise<void> {
    try {
      console.log('🚀 Running all SINGLE-STEP Pinata Groups tests...');
      
      const testGroupName = `SingleStep Test Group ${Date.now()}`;
      
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
        console.log('3. Testing single-step group creation...');
        const groupResult = await this.testGroupCreation(testGroupName);
        console.log('Group creation result:', groupResult);
        
        if (groupResult.success && groupResult.groupId) {
          // Test 4: Single-step file upload to group
          console.log('4. Testing SINGLE-STEP file upload to group...');
          const uploadResult = await this.testSingleStepFileUpload(groupResult.groupId);
          console.log('Single-step upload result:', uploadResult);
          
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
      
      console.log('✅ All SINGLE-STEP Pinata Groups tests completed!');
    } catch (error) {
      console.error('Error running tests:', error);
    }
  }
}

// Export singleton instance
export const singleStepDebugManager = new SingleStepDebugManager();
