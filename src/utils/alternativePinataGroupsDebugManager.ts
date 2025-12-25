import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Alternative Pinata Groups Debug Manager - Tests alternative approach
 */
export class AlternativePinataGroupsDebugManager {
  
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
   * Test file upload using standard pinFileToIPFS
   */
  public async testFileUploadToGroup(groupId: string): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
    try {
      console.log('Testing file upload using standard pinFileToIPFS...');
      console.log('Group ID:', groupId);
      
      const formData = new FormData();
      const testFile = new File(["Test content for alternative group upload"], "test.txt", { type: "text/plain" });
      
      formData.append("file", testFile);

      // Add metadata with group information
      const pinataMetadata = {
        name: "test.txt",
        keyvalues: {
          groupId: groupId,
          testFile: "true",
          timestamp: new Date().toISOString()
        }
      };

      const pinataOptions = {
        cidVersion: 1,
      };

      formData.append("pinataMetadata", JSON.stringify(pinataMetadata));
      formData.append("pinataOptions", JSON.stringify(pinataOptions));

      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        if (key === 'file') {
          console.log(key, `[Blob: ${(value as Blob).size} bytes, type: ${(value as Blob).type}]`);
        } else {
          console.log(key, value);
        }
      }

      console.log('Making request to standard pinFileToIPFS API...');
      
      // Use standard pinFileToIPFS endpoint
      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          "pinata_api_key": PINATA_CONFIG.apiKey,
          "pinata_secret_api_key": PINATA_CONFIG.apiSecret,
        },
        body: formData,
      });

      console.log('File upload response status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('File uploaded successfully:', data);
        
        // Try to add file to group
        await this.addFileToGroup(groupId, data.IpfsHash);
        
        return { success: true, ipfsHash: data.IpfsHash };
      } else {
        console.error('File upload failed:', response.status, responseText);
        return { success: false, error: `Status ${response.status}: ${responseText}` };
      }
    } catch (error) {
      console.error('File upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add file to group after upload
   */
  private async addFileToGroup(groupId: string, fileId: string): Promise<void> {
    try {
      console.log(`Adding file ${fileId} to group ${groupId}...`);
      
      const response = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}/ids/${fileId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ File ${fileId} added to group ${groupId}`);
      } else {
        const errorText = await response.text();
        console.warn(`Failed to add file to group: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.warn('Error adding file to group:', error);
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
        
        if (data.groups && Array.isArray(data.groups)) {
          console.log(`Found ${data.groups.length} groups`);
          return { success: true, groups: data.groups };
        } else {
          console.log('No groups found');
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
   * Run all tests
   */
  public async runAllTests(): Promise<void> {
    try {
      console.log('Running all alternative Pinata Groups tests...');
      
      const testGroupName = `Alternative Test Group ${Date.now()}`;
      
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
          // Test 4: Upload file using standard API
          console.log('4. Testing file upload with standard API...');
          const uploadResult = await this.testFileUploadToGroup(groupResult.groupId);
          console.log('File upload result:', uploadResult);
          
          // Test 5: List groups again
          console.log('5. Testing list groups again...');
          const listResult2 = await this.testListGroups();
          console.log('List groups result 2:', listResult2);
        }
      }
      
      console.log('All alternative Pinata Groups tests completed');
    } catch (error) {
      console.error('Error running tests:', error);
    }
  }
}

// Export singleton instance
export const alternativePinataGroupsDebugManager = new AlternativePinataGroupsDebugManager();
