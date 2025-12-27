import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Debug Group Manager - Test Pinata API calls
 */
export class DebugGroupManager {
  
  /**
   * Test JWT token validity
   */
  public async testJWTToken(): Promise<boolean> {
    try {
      console.log('Testing JWT token...');
      console.log('JWT:', PINATA_CONFIG.jwt.substring(0, 50) + '...');
      
      // Try multiple endpoints to test JWT validity
      const endpoints = [
        "https://api.pinata.cloud/data/userPinList?status=pinned&pageLimit=1",
        "https://api.pinata.cloud/data/pinList?pageLimit=1",
        "https://api.pinata.cloud/v3/groups/public?limit=1"
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
            }
          });

          console.log(`Testing endpoint ${endpoint}:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('JWT test successful with endpoint:', endpoint);
            return true;
          } else {
            const errorText = await response.text();
            console.error(`JWT test failed for ${endpoint}:`, response.status, errorText);
          }
        } catch (endpointError) {
          console.error(`Error testing endpoint ${endpoint}:`, endpointError);
        }
      }
      
      return false;
    } catch (error) {
      console.error('JWT test error:', error);
      return false;
    }
  }

  /**
   * Test group creation with detailed error logging
   */
  public async testGroupCreation(groupName: string): Promise<{ success: boolean; groupId?: string; error?: string }> {
    try {
      console.log('Testing group creation...');
      console.log('Group name:', groupName);
      
      const payload = JSON.stringify({
        name: groupName,
      });

      console.log('Payload:', payload);

      const response = await fetch("https://api.pinata.cloud/v3/groups/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
        body: payload,
      });

      console.log('Group creation response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('Group created successfully:', data);
        return { success: true, groupId: data.data?.id || data.id };
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
   * Test file upload to group
   */
  public async testFileUploadToGroup(groupId: string): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
    try {
      console.log('Testing file upload to group...');
      console.log('Group ID:', groupId);
      
      const formData = new FormData();
      const testFile = new File(["Test content for group upload"], "test.txt", { type: "text/plain" });
      
      formData.append("file", testFile);
      formData.append("network", "public");
      formData.append("group", groupId);

      // Add proper metadata format
      const pinataMetadata = {
        name: "test.txt",
        keyvalues: {
          testFile: "true",
          groupId: groupId,
          timestamp: new Date().toISOString()
        }
      };
      formData.append("pinataMetadata", JSON.stringify(pinataMetadata));

      // Add pinata options
      const pinataOptions = {
        cidVersion: 1,
      };
      formData.append("pinataOptions", JSON.stringify(pinataOptions));

      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const response = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
        body: formData,
      });

      console.log('File upload response status:', response.status);
      
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
    } catch (error) {
      console.error('File upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test list groups
   */
  public async testListGroups(): Promise<{ success: boolean; groups?: any[]; error?: string }> {
    try {
      console.log('Testing list groups...');
      
      const response = await fetch("https://api.pinata.cloud/v3/groups/public", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        }
      });

      console.log('List groups response status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('Groups listed successfully:', data);
        return { success: true, groups: data.groups || [] };
      } else {
        console.error('List groups failed:', response.status, responseText);
        return { success: false, error: `Status ${response.status}: ${responseText}` };
      }
    } catch (error) {
      console.error('List groups error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all tests
   */
  public async runAllTests(): Promise<void> {
    console.log('=== DEBUG GROUP MANAGER TESTS ===');
    
    // Test 1: JWT Token
    console.log('\n1. Testing JWT token...');
    const jwtValid = await this.testJWTToken();
    if (!jwtValid) {
      console.error('JWT token test failed - stopping here');
      return;
    }

    // Test 2: List existing groups
    console.log('\n2. Testing list groups...');
    await this.testListGroups();

    // Test 3: Create test group
    console.log('\n3. Testing group creation...');
    const testGroupName = `Test Group ${Date.now()}`;
    const groupResult = await this.testGroupCreation(testGroupName);
    
    if (groupResult.success && groupResult.groupId) {
      // Test 4: Upload file to group
      console.log('\n4. Testing file upload to group...');
      await this.testFileUploadToGroup(groupResult.groupId);
    }

    console.log('\n=== TESTS COMPLETE ===');
  }
}

// Export singleton instance
export const debugGroupManager = new DebugGroupManager();
