import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { singleStepDebugManager } from '@/utils/singleStepDebugManager';

export const SingleStepDebugManager: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const addResult = (test: string, success: boolean, message: string, data?: any) => {
    const result = {
      test,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    setResults(prev => [result, ...prev]);
  };

  const handleJWTTest = async () => {
    setIsLoading(true);
    try {
      console.log('Testing JWT token...');
      const result = await singleStepDebugManager.testJWTToken();
      addResult('JWT Token Test', result, result ? 'JWT token is valid' : 'JWT token is invalid');
    } catch (error) {
      console.error('JWT test error:', error);
      addResult('JWT Token Test', false, `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupCreationTest = async () => {
    setIsLoading(true);
    try {
      const testGroupName = `SingleStep Test Group ${Date.now()}`;
      console.log('Testing group creation...');
      const result = await singleStepDebugManager.testGroupCreation(testGroupName);
      addResult('Group Creation Test', result.success, result.success ? `Group created: ${result.groupId}` : result.error || 'Failed to create group', result);
    } catch (error) {
      console.error('Group creation test error:', error);
      addResult('Group Creation Test', false, `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleStepUploadTest = async () => {
    setIsLoading(true);
    try {
      // First create a group, then test upload
      const testGroupName = `Upload Test Group ${Date.now()}`;
      const groupResult = await singleStepDebugManager.testGroupCreation(testGroupName);
      
      if (groupResult.success && groupResult.groupId) {
        const uploadResult = await singleStepDebugManager.testSingleStepFileUpload(groupResult.groupId);
        addResult('Single-Step Upload Test', uploadResult.success, uploadResult.success ? `File uploaded: ${uploadResult.ipfsHash}` : uploadResult.error || 'Failed to upload file', uploadResult);
      } else {
        addResult('Single-Step Upload Test', false, 'Failed to create group for upload test');
      }
    } catch (error) {
      console.error('Single-step upload test error:', error);
      addResult('Single-Step Upload Test', false, `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleListGroupsTest = async () => {
    setIsLoading(true);
    try {
      console.log('Testing list groups...');
      const result = await singleStepDebugManager.testListGroups();
      addResult('List Groups Test', result.success, result.success ? `Found ${result.groups?.length || 0} groups` : result.error || 'Failed to list groups', result);
    } catch (error) {
      console.error('List groups test error:', error);
      addResult('List Groups Test', false, `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAllTests = async () => {
    setIsLoading(true);
    try {
      console.log('Running all single-step tests...');
      await singleStepDebugManager.runAllTests();
      addResult('All Tests', true, 'All single-step tests completed - check console for detailed results');
    } catch (error) {
      console.error('Run all tests error:', error);
      addResult('All Tests', false, `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🚀 Single-Step Pinata Groups Debug Manager</CardTitle>
        <CardDescription>
          Test the single-step group upload approach - files uploaded directly to groups in one API call using group_id parameter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleJWTTest}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Testing...' : 'Test JWT Token'}
          </Button>
          
          <Button 
            onClick={handleGroupCreationTest}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Creating...' : 'Test Group Creation'}
          </Button>
          
          <Button 
            onClick={handleSingleStepUploadTest}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Uploading...' : 'Test Single-Step Upload'}
          </Button>
          
          <Button 
            onClick={handleListGroupsTest}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Loading...' : 'Test List Groups'}
          </Button>
          
          <Button 
            onClick={handleRunAllTests}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Running...' : 'Run All Tests'}
          </Button>
          
          <Button 
            onClick={clearResults}
            variant="outline"
            disabled={isLoading}
          >
            Clear Results
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Test Results:</h3>
          {results.length === 0 ? (
            <p className="text-muted-foreground">No test results yet. Run some tests to see results here.</p>
          ) : (
            results.map((result, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "✅ Success" : "❌ Failed"}
                  </Badge>
                  <span className="font-medium">{result.test}</span>
                  <span className="text-sm text-gray-500">{result.timestamp}</span>
                </div>
                <p className="text-sm">{result.message}</p>
                {result.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-600">View Details</summary>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
