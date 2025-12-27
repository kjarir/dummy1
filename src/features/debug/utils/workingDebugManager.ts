import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Working Debug Manager - Tests metadata-based grouping
 */
export class WorkingDebugManager {
  
  /**
   * Test JWT token validity (simplified)
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
   * Test metadata-based group creation
   */
  public async testGroupCreation(groupName: string): Promise<{ success: boolean; groupId?: string; error?: string }> {
    try {
      console.log('Testing metadata-based group creation...');
      console.log('Group name:', groupName);
      
      // For metadata-based grouping, we don't actually create a group
      // We just return the group name as the "groupId"
      // The actual grouping happens when files are uploaded with group metadata
      
      console.log('Metadata-based group "created" successfully');
      return { success: true, groupId: groupName };
    } catch (error) {
      console.error('Group creation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test file upload with group metadata
   */
  public async testFileUploadToGroup(groupName: string): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
    try {
      console.log('Testing file upload with group metadata...');
      console.log('Group name:', groupName);
      
      const formData = new FormData();
      const testFile = new File(["Test content for group upload"], "test.txt", { type: "text/plain" });
      
      formData.append("file", testFile);

      // Create pinataMetadata with group information
      const pinataMetadata = {
        name: "test.txt",
        keyvalues: {
          groupName: groupName,
          groupId: groupName,
          testFile: "true",
          timestamp: new Date().toISOString()
        }
      };

      // Create pinataOptions
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
   * List files by group (metadata-based)
   */
  public async testListFilesByGroup(groupName: string): Promise<{ success: boolean; files?: any[]; error?: string }> {
    try {
      console.log(`Testing file listing for group: ${groupName}`);
      
      const response = await fetch(`https://api.pinata.cloud/data/pinList?metadata[keyvalues][groupName]={"value":"${groupName}","op":"eq"}`, {
        method: "GET",
        headers: {
          "pinata_api_key": PINATA_CONFIG.apiKey,
          "pinata_secret_api_key": PINATA_CONFIG.apiSecret,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Found ${data.count} files for group ${groupName}`);
        return { success: true, files: data.rows || [] };
      } else {
        console.error('Failed to list files by group:', response.status);
        return { success: false, error: `Status ${response.status}` };
      }
    } catch (error) {
      console.error('Error listing files by group:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test list groups (metadata-based)
   */
  public async testListGroups(): Promise<{ success: boolean; groups?: any[]; error?: string }> {
    try {
      console.log('Testing list groups (metadata-based)...');
      
      // List all files and group them by metadata
      const response = await fetch("https://api.pinata.cloud/data/pinList", {
        method: "GET",
        headers: {
          "pinata_api_key": PINATA_CONFIG.apiKey,
          "pinata_secret_api_key": PINATA_CONFIG.apiSecret,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Found files:', data.count);
        
        // Group files by groupName metadata
        const groups = new Map();
        if (data.rows && Array.isArray(data.rows)) {
          for (const file of data.rows) {
            if (file.metadata && file.metadata.keyvalues && file.metadata.keyvalues.groupName) {
              const groupName = file.metadata.keyvalues.groupName;
              if (!groups.has(groupName)) {
                groups.set(groupName, []);
              }
              groups.set(groupName, [...groups.get(groupName), file]);
            }
          }
        }
        
        const groupList = Array.from(groups.entries()).map(([name, files]) => ({
          name,
          files,
          count: files.length
        }));
        
        console.log('Found groups:', groupList);
        return { success: true, groups: groupList };
      } else {
        console.error('Failed to list groups:', response.status);
        return { success: false, error: `Status ${response.status}` };
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
      console.log('Running all working debug tests...');
      
      const testGroupName = `Working Test Group ${Date.now()}`;
      
      // Test group creation
      console.log('1. Testing group creation...');
      const groupResult = await this.testGroupCreation(testGroupName);
      console.log('Group creation result:', groupResult);
      
      if (groupResult.success) {
        // Test file upload
        console.log('2. Testing file upload...');
        const uploadResult = await this.testFileUploadToGroup(testGroupName);
        console.log('File upload result:', uploadResult);
        
        if (uploadResult.success) {
          // Test file listing
          console.log('3. Testing file listing...');
          const listResult = await this.testListFilesByGroup(testGroupName);
          console.log('File listing result:', listResult);
          
          // Test general group listing
          console.log('4. Testing general group listing...');
          const generalListResult = await this.testListGroups();
          console.log('General group listing result:', generalListResult);
        }
      }
      
      console.log('All tests completed');
    } catch (error) {
      console.error('Error running tests:', error);
    }
  }
}

// Export singleton instance
export const workingDebugManager = new WorkingDebugManager();
