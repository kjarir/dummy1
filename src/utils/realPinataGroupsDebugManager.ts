import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Real Pinata Groups Debug Manager - Tests actual Pinata Groups API
 */
export class RealPinataGroupsDebugManager {
  
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
   * Test file upload to real Pinata group
   */
  public async testFileUploadToGroup(groupId: string): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
    try {
      console.log('Testing file upload to real Pinata group...');
      console.log('Group ID:', groupId);
      
      const formData = new FormData();
      const testFile = new File(["Test content for real Pinata group upload"], "test.txt", { type: "text/plain" });
      
      formData.append("file", testFile);
      formData.append("network", "public");
      formData.append("group", groupId);

      // Add metadata
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

      console.log('Making request to uploads.pinata.cloud/v3/files...');
      console.log('JWT Token (first 50 chars):', PINATA_CONFIG.jwt.substring(0, 50) + '...');

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch("https://uploads.pinata.cloud/v3/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

      console.log('File upload response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('File uploaded successfully:', data);
        return { success: true, ipfsHash: data.ipfsHash || data.IpfsHash };
      } else {
        console.error('File upload failed:', response.status, responseText);
        return { success: false, error: `Status ${response.status}: ${responseText}` };
      }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('File upload timeout after 30 seconds');
          return { success: false, error: 'Upload timeout - request took too long' };
        } else {
          console.error('File upload error:', fetchError);
          return { success: false, error: fetchError.message };
        }
      }
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
      console.log('Running all real Pinata Groups tests...');
      
      const testGroupName = `Real Test Group ${Date.now()}`;
      
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
          // Test 4: Upload file
          console.log('4. Testing file upload...');
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
      
      console.log('All real Pinata Groups tests completed');
    } catch (error) {
      console.error('Error running tests:', error);
    }
  }
}

// Export singleton instance
export const realPinataGroupsDebugManager = new RealPinataGroupsDebugManager();
