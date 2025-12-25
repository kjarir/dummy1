import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { workingPinataGroupsDebugManager } from '@/utils/workingPinataGroupsDebugManager';

export const DebugGroupManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const addResult = (test: string, success: boolean, message: string, data?: any) => {
    setResults(prev => [...prev, {
      test,
      success,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('Starting Tests', true, 'Running all Pinata API tests...');

      // Test 1: JWT Token
      addResult('JWT Test', true, 'Testing JWT token validity...');
      const jwtValid = await workingPinataGroupsDebugManager.testJWTToken();
      addResult('JWT Test', jwtValid, jwtValid ? 'JWT token is valid' : 'JWT token is invalid');

      if (jwtValid) {
        // Test 2: List Groups
        addResult('List Groups', true, 'Testing list groups API...');
        const listResult = await workingPinataGroupsDebugManager.testListGroups();
        addResult('List Groups', listResult.success,
          listResult.success ? `Found ${listResult.groups?.length || 0} groups` : listResult.error || 'Failed to list groups');

        // Test 3: Create Group
        addResult('Create Group', true, 'Testing group creation...');
        const testGroupName = `Debug Test Group ${Date.now()}`;
        const groupResult = await workingPinataGroupsDebugManager.testGroupCreation(testGroupName);
        addResult('Create Group', groupResult.success, 
          groupResult.success ? `Group created with ID: ${groupResult.groupId}` : groupResult.error || 'Failed to create group',
          groupResult.groupId);

        if (groupResult.success && groupResult.groupId) {
          // Test 4: Upload File
          addResult('Upload File', true, 'Testing file upload to group...');
          const uploadResult = await workingPinataGroupsDebugManager.testFileUploadToGroup(groupResult.groupId);
          addResult('Upload File', uploadResult.success,
            uploadResult.success ? `File uploaded with IPFS: ${uploadResult.ipfsHash}` : uploadResult.error || 'Failed to upload file',
            uploadResult.ipfsHash);
        }
      }

      addResult('Tests Complete', true, 'All tests completed');
    } catch (error) {
      addResult('Error', false, `Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testJWTOnly = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('JWT Test', true, 'Testing JWT token only...');
      const jwtValid = await workingPinataGroupsDebugManager.testJWTToken();
      addResult('JWT Test', jwtValid, jwtValid ? 'JWT token is valid' : 'JWT token is invalid');
    } catch (error) {
      addResult('JWT Test', false, `JWT test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGroupCreationOnly = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('Group Creation', true, 'Testing group creation only...');
      const testGroupName = `Debug Test Group ${Date.now()}`;
      const groupResult = await workingPinataGroupsDebugManager.testGroupCreation(testGroupName);
      addResult('Group Creation', groupResult.success, 
        groupResult.success ? `Group created with ID: ${groupResult.groupId}` : groupResult.error || 'Failed to create group',
        groupResult.groupId);
      
      // If group creation succeeded, test file upload
      if (groupResult.success && groupResult.groupId) {
        addResult('File Upload', true, 'Testing file upload to group...');
        const uploadResult = await workingPinataGroupsDebugManager.testFileUploadToGroup(groupResult.groupId);
        addResult('File Upload', uploadResult.success, 
          uploadResult.success ? `File uploaded successfully: ${uploadResult.ipfsHash}` : uploadResult.error || 'Failed to upload file',
          uploadResult.ipfsHash);
      }
    } catch (error) {
      addResult('Group Creation', false, `Group creation test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testFileUploadOnly = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      // First create a test group
      addResult('Group Creation', true, 'Creating test group for file upload...');
      const testGroupName = `File Upload Test Group ${Date.now()}`;
      const groupResult = await workingPinataGroupsDebugManager.testGroupCreation(testGroupName);
      
      if (groupResult.success && groupResult.groupId) {
        addResult('Group Creation', true, `Test group created: ${groupResult.groupId}`);
        
        // Test file upload to the group
        addResult('File Upload', true, 'Testing file upload to group...');
        const uploadResult = await workingPinataGroupsDebugManager.testFileUploadToGroup(groupResult.groupId);
        addResult('File Upload', uploadResult.success, 
          uploadResult.success ? `File uploaded successfully: ${uploadResult.ipfsHash}` : uploadResult.error || 'Failed to upload file',
          uploadResult.ipfsHash);
      } else {
        addResult('Group Creation', false, `Failed to create test group: ${groupResult.error}`);
      }
    } catch (error) {
      addResult('File Upload Test', false, `File upload test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const listAllGroups = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('List Groups', true, 'Listing all groups and their files...');
      
      const listResult = await workingPinataGroupsDebugManager.testListGroups();
      
      if (listResult.success) {
        const groupCount = listResult.groups?.length || 0;
        addResult('List Groups', true, `Found ${groupCount} groups. Check console for detailed group information.`);
        
        // Log detailed group information
        if (listResult.groups && listResult.groups.length > 0) {
          console.log('=== GROUP DETAILS ===');
          listResult.groups.forEach((group: any) => {
            console.log(`Group: ${group.name}`);
            console.log(`Files: ${group.count}`);
            console.log('Files:', group.files);
          });
        } else {
          console.log('No groups found with groupName metadata');
        }
      } else {
        addResult('List Groups', false, `Failed to list groups: ${listResult.error}`);
      }
    } catch (error) {
      addResult('List Groups', false, `Failed to list groups: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🔧 Working Pinata Groups Debug Manager</CardTitle>
        <CardDescription>
          Test working approach: upload files directly to groups with group parameter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={runAllTests} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          <Button 
            onClick={testJWTOnly} 
            disabled={isLoading}
            variant="outline"
          >
            Test JWT Only
          </Button>
          <Button 
            onClick={testGroupCreationOnly} 
            disabled={isLoading}
            variant="outline"
          >
            Test Group Creation Only
          </Button>
          <Button 
            onClick={testFileUploadOnly} 
            disabled={isLoading}
            variant="outline"
          >
            Test File Upload Only
          </Button>
          <Button 
            onClick={listAllGroups} 
            disabled={isLoading}
            variant="outline"
          >
            List All Groups
          </Button>
          <Button 
            onClick={() => setResults([])} 
            disabled={isLoading}
            variant="destructive"
          >
            Clear Results
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="font-semibold">Test Results:</h3>
          {results.length === 0 ? (
            <p className="text-muted-foreground">No tests run yet. Click a button above to start testing.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "✅" : "❌"}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{result.test}</div>
                    <div className="text-sm text-muted-foreground">{result.message}</div>
                    {result.data && (
                      <div className="text-xs mt-1 p-2 bg-muted rounded font-mono break-all">
                        {typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">{result.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
