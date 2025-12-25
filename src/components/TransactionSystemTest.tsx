import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { harvestTransactionCreator } from '@/utils/harvestTransactionCreator';
import { purchaseTransactionCreator } from '@/utils/purchaseTransactionCreator';
import { transactionManager } from '@/utils/transactionManager';
import { immutableCertificateGenerator } from '@/utils/immutableCertificateGenerator';
import { TestTube, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const TransactionSystemTest: React.FC = () => {
  const [testBatchId, setTestBatchId] = useState('test-batch-123');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { toast } = useToast();

  const addResult = (message: string, isError = false) => {
    setTestResults(prev => [...prev, `${isError ? '❌' : '✅'} ${message}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runFullTest = async () => {
    setLoading(true);
    clearResults();
    
    try {
      addResult('Starting transaction system test...');
      
      // Test 1: Create harvest transaction
      addResult('Test 1: Creating harvest transaction...');
      const harvestTxId = await harvestTransactionCreator.createHarvestTransaction(
        testBatchId,
        'test-farmer@example.com',
        'Rice',
        'Basmati',
        100,
        '2025-01-24',
        'Premium',
        'Organic',
        50
      );
      addResult(`Harvest transaction created: ${harvestTxId}`);
      
      // Test 2: Get transaction chain
      addResult('Test 2: Getting transaction chain...');
      const chain = await transactionManager.getTransactionChain(testBatchId);
      addResult(`Transaction chain loaded: ${chain.transactions.length} transactions`);
      addResult(`Total quantity: ${chain.totalQuantity}kg, Available: ${chain.availableQuantity}kg`);
      
      // Test 3: Create purchase transaction
      addResult('Test 3: Creating purchase transaction...');
      const purchaseTxId = await purchaseTransactionCreator.createPurchaseTransaction(
        testBatchId,
        'test-farmer@example.com',
        'test-buyer@example.com',
        25,
        50,
        'Test Address, Test City',
        'Test purchase transaction'
      );
      addResult(`Purchase transaction created: ${purchaseTxId}`);
      
      // Test 4: Verify updated chain
      addResult('Test 4: Verifying updated transaction chain...');
      const updatedChain = await transactionManager.getTransactionChain(testBatchId);
      addResult(`Updated chain: ${updatedChain.transactions.length} transactions`);
      addResult(`Available quantity after purchase: ${updatedChain.availableQuantity}kg`);
      
      // Test 5: Generate certificate
      addResult('Test 5: Generating certificate...');
      const certificateBlob = await immutableCertificateGenerator.generateCertificateFromBatchId(testBatchId);
      addResult(`Certificate generated: ${certificateBlob.size} bytes`);
      
      // Test 6: Verify transaction chain integrity
      addResult('Test 6: Verifying transaction chain integrity...');
      const verification = await transactionManager.verifyTransactionChain(testBatchId);
      if (verification.isValid) {
        addResult('Transaction chain integrity verified successfully');
      } else {
        addResult(`Transaction chain integrity check failed: ${verification.errors.join(', ')}`, true);
      }
      
      addResult('All tests completed successfully! 🎉');
      
      toast({
        title: "Test Completed",
        description: "All transaction system tests passed successfully!",
      });
      
    } catch (error) {
      console.error('Test error:', error);
      addResult(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
      
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: "Some tests failed. Check the results below.",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTestCertificate = async () => {
    try {
      setLoading(true);
      const certificateBlob = await immutableCertificateGenerator.generateCertificateFromBatchId(testBatchId);
      
      // Create download link
      const url = URL.createObjectURL(certificateBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `test_certificate_${testBatchId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Certificate Downloaded",
        description: "Test certificate has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to generate test certificate.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Transaction System Test
        </CardTitle>
        <CardDescription>
          Test the complete immutable transaction system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="testBatchId">Test Batch ID</Label>
          <Input
            id="testBatchId"
            value={testBatchId}
            onChange={(e) => setTestBatchId(e.target.value)}
            placeholder="Enter test batch ID"
            className="mt-1"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={runFullTest}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Running Tests...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                Run Full Test
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={downloadTestCertificate}
            disabled={loading}
          >
            Download Certificate
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
            <h4 className="font-medium mb-2">Test Results:</h4>
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>What this test does:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Creates a harvest transaction</li>
            <li>Verifies transaction chain creation</li>
            <li>Creates a purchase transaction</li>
            <li>Verifies chain updates</li>
            <li>Generates a certificate</li>
            <li>Verifies chain integrity</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
