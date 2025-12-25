import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { manualGroupFileAdder } from '@/utils/manualGroupFileAdder';

export const ManualGroupFileAdder: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('28d3a8cb-ec5d-4274-b3cc-4bc6286c0cec');

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

  const handleAddTextFile = async () => {
    if (!groupId.trim()) {
      addResult('Add Text File', false, 'Please enter a Group ID');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Adding text file to group: ${groupId}`);
      const result = await manualGroupFileAdder.addFileToGroup(groupId);
      
      if (result.success) {
        addResult('Add Text File', true, `Text file added successfully! IPFS: ${result.ipfsHash}`, result);
      } else {
        addResult('Add Text File', false, `Failed to add text file: ${result.error}`, result);
      }
    } catch (error) {
      console.error('Error adding text file:', error);
      addResult('Add Text File', false, `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPDFFile = async () => {
    if (!groupId.trim()) {
      addResult('Add PDF File', false, 'Please enter a Group ID');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Adding PDF file to group: ${groupId}`);
      const result = await manualGroupFileAdder.addPDFToGroup(groupId);
      
      if (result.success) {
        addResult('Add PDF File', true, `PDF file added successfully! IPFS: ${result.ipfsHash}`, result);
      } else {
        addResult('Add PDF File', false, `Failed to add PDF file: ${result.error}`, result);
      }
    } catch (error) {
      console.error('Error adding PDF file:', error);
      addResult('Add PDF File', false, `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBothFiles = async () => {
    if (!groupId.trim()) {
      addResult('Test Both Files', false, 'Please enter a Group ID');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Testing both files for group: ${groupId}`);
      await manualGroupFileAdder.testAddFilesToGroup(groupId);
      addResult('Test Both Files', true, `Both text and PDF files added to group ${groupId}`);
    } catch (error) {
      console.error('Error testing both files:', error);
      addResult('Test Both Files', false, `Error: ${error.message}`);
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
        <CardTitle>📁 Manual Group File Adder</CardTitle>
        <CardDescription>
          Manually add files to a specific Pinata group ID using direct upload approach
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="groupId">Group ID</Label>
          <Input
            id="groupId"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="Enter Pinata Group ID"
            className="w-full"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleAddTextFile}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Adding...' : 'Add Text File'}
          </Button>
          
          <Button 
            onClick={handleAddPDFFile}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Adding...' : 'Add PDF File'}
          </Button>
          
          <Button 
            onClick={handleTestBothFiles}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Testing...' : 'Test Both Files'}
          </Button>
          
          <Button 
            onClick={clearResults}
            variant="outline"
            disabled={isLoading}
          >
            Clear Results
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            {results.map((result, index) => (
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
