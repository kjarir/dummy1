import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Manual Group File Adder - Add file to specific group ID
 */
export class ManualGroupFileAdder {
  
  /**
   * Add file to specific group ID using two-step approach
   */
  public async addFileToGroup(groupId: string): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
    try {
      console.log('Adding file to specific group using two-step approach:', groupId);
      
      // Create a test file
      const testContent = `Test file for group ${groupId}
Generated: ${new Date().toISOString()}
Group ID: ${groupId}
Purpose: Manual file addition test using two-step approach`;
      
      const testFile = new File([testContent], `manual_test_${Date.now()}.txt`, { 
        type: "text/plain" 
      });
      
      console.log('Test file created:', testFile.name, 'Size:', testFile.size, 'bytes');
      
      // Single-step upload with group_id parameter
      console.log('Uploading file with group_id parameter for direct group association...');
      
      const formData = new FormData();
      formData.append("file", testFile);
      formData.append("network", "public");
      formData.append("group_id", groupId); // ← SINGLE-STEP KEY: group_id parameter

      console.log('🚀 Making SINGLE-STEP request to v3/files endpoint with group_id...');
      
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
        console.error('❌ Single-step upload failed:', uploadResponse.status, uploadResponseText);
        return { success: false, error: `Upload failed: ${uploadResponse.status} ${uploadResponseText}` };
      }

      const uploadData = JSON.parse(uploadResponseText);
      const fileId = uploadData.data.id;
      const ipfsHash = uploadData.data.cid;
      const responseGroupId = uploadData.data.group_id;
      
      console.log(`✅ SINGLE-STEP upload successful!`);
      console.log(`File ID: ${fileId}`);
      console.log(`IPFS Hash: ${ipfsHash}`);
      console.log(`Group ID in response: ${responseGroupId}`);
      
      // Verify group association
      if (responseGroupId === groupId) {
        console.log(`🎉 PERFECT! File successfully uploaded to group ${groupId} in SINGLE STEP!`);
        console.log(`IPFS Hash: ${ipfsHash}`);
        return { success: true, ipfsHash: ipfsHash };
      } else {
        console.log(`⚠️ File uploaded but group_id mismatch. Expected: ${groupId}, Got: ${responseGroupId}`);
        return { success: true, ipfsHash: ipfsHash };
      }
    } catch (error) {
      console.error('Error uploading file to group:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add PDF file to specific group ID using SINGLE-STEP method
   */
  public async addPDFToGroup(groupId: string): Promise<{ success: boolean; ipfsHash?: string; error?: string }> {
    try {
      console.log('Adding PDF to specific group using SINGLE-STEP method:', groupId);
      
      // Create a simple PDF using jsPDF
      const { jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF();
      
      // Add content to PDF
      pdf.setFontSize(20);
      pdf.text('MANUAL GROUP FILE TEST - SINGLE STEP', 20, 30);
      
      pdf.setFontSize(12);
      pdf.text(`Group ID: ${groupId}`, 20, 50);
      pdf.text(`Test Type: Manual PDF Addition (Single-Step)`, 20, 60);
      pdf.text(`Generated: ${new Date().toISOString()}`, 20, 70);
      pdf.text(`Purpose: Test single-step group upload`, 20, 80);
      pdf.text(`Status: Testing single-step group association`, 20, 90);
      
      const pdfBlob = pdf.output('blob');
      
      console.log('PDF created:', pdfBlob.size, 'bytes');
      
      const formData = new FormData();
      formData.append("file", pdfBlob, `manual_test_${Date.now()}.pdf`);
      formData.append("network", "public");
      formData.append("group_id", groupId); // ← SINGLE-STEP KEY: group_id parameter

      // Add metadata with group information
      const metadata = {
        name: `manual_test_${Date.now()}.pdf`,
        keyvalues: {
          groupId: groupId,
          manualTest: "true",
          fileType: "pdf",
          method: "single_step",
          timestamp: new Date().toISOString(),
          purpose: "manual_pdf_addition"
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
      
      // Use v3/files endpoint with JWT authentication and group_id parameter
      const response = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PINATA_CONFIG.jwt}`,
        },
        body: formData,
      });

      console.log('PDF upload response status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('✅ SINGLE-STEP PDF upload successful!');
        console.log('File ID:', data.data.id);
        console.log('IPFS Hash:', data.data.cid);
        console.log('Group ID in response:', data.data.group_id);
        
        // Check if file was uploaded to group
        if (data.data.group_id === groupId) {
          console.log(`🎉 PERFECT! PDF successfully uploaded to group ${groupId} in SINGLE STEP!`);
          console.log(`IPFS Hash: ${data.data.cid}`);
          return { success: true, ipfsHash: data.data.cid };
        } else {
          console.log(`⚠️ PDF uploaded but group_id mismatch. Expected: ${groupId}, Got: ${data.data.group_id}`);
          return { success: true, ipfsHash: data.data.cid };
        }
      } else {
        console.error('❌ PDF upload failed:', response.status, responseText);
        return { success: false, error: `Status ${response.status}: ${responseText}` };
      }
    } catch (error) {
      console.error('❌ Error uploading PDF to group:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test adding both text and PDF files to the group
   */
  public async testAddFilesToGroup(groupId: string): Promise<void> {
    try {
      console.log(`Testing file addition to group: ${groupId}`);
      
      // Test 1: Add text file
      console.log('1. Adding text file to group...');
      const textResult = await this.addFileToGroup(groupId);
      console.log('Text file result:', textResult);
      
      // Test 2: Add PDF file
      console.log('2. Adding PDF file to group...');
      const pdfResult = await this.addPDFToGroup(groupId);
      console.log('PDF file result:', pdfResult);
      
      console.log('File addition tests completed');
    } catch (error) {
      console.error('Error testing file addition:', error);
    }
  }
}

// Export singleton instance
export const manualGroupFileAdder = new ManualGroupFileAdder();
