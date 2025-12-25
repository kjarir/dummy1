import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Working Pinata Groups Manager - Uses group parameter during upload
 * This approach uploads files directly to groups during the upload process
 */
export class WorkingPinataGroupsManager {
  
  /**
   * Generate a group name
   */
  private generateGroupName(farmerName: string, cropType: string, variety: string): string {
    const cleanFarmerName = farmerName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanCropType = cropType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanVariety = variety.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    return `${cleanFarmerName}_${cleanCropType}_${cleanVariety}`;
  }

  /**
   * Create a Pinata group using the official API
   */
  public async createGroup(groupName: string): Promise<string> {
    try {
      console.log('Creating Pinata group:', groupName);
      
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
          return data.data.id;
        } else {
          throw new Error('No group ID in response');
        }
      } else {
        console.error('Group creation failed:', response.status, responseText);
        throw new Error(`Failed to create group: ${response.status} ${responseText}`);
      }
    } catch (error) {
      console.error('Error creating Pinata group:', error);
      throw new Error(`Failed to create Pinata group: ${error.message}`);
    }
  }

  /**
   * Upload file to a Pinata group using two-step approach
   */
  public async uploadFileToGroup(
    groupId: string,
    fileBlob: Blob,
    fileName: string,
    metadata: any
  ): Promise<string> {
    try {
      console.log('Uploading file to Pinata group using two-step approach:', groupId);
      console.log('File name:', fileName);
      console.log('File size:', fileBlob.size);
      
      // Step 1: Upload file to get file ID
      console.log('Step 1: Uploading file to get file ID...');
      
      const formData = new FormData();
      formData.append("file", fileBlob, fileName);
      formData.append("network", "public");

      console.log('Making request to v3/files endpoint...');
      
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
        console.error('File upload failed:', uploadResponse.status, uploadResponseText);
        throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponseText}`);
      }

      const uploadData = JSON.parse(uploadResponseText);
      const fileId = uploadData.data.id;
      const ipfsHash = uploadData.data.cid;
      
      console.log(`✅ File uploaded successfully! File ID: ${fileId}, IPFS: ${ipfsHash}`);
      
      // Step 2: Add file to group using PUT endpoint
      console.log('Step 2: Adding file to group using PUT endpoint...');
      console.log(`Adding file ${fileId} to group ${groupId}`);
      
      const addToGroupResponse = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}/ids/${fileId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${PINATA_CONFIG.jwt}`,
        },
      });

      console.log('Add to group response status:', addToGroupResponse.status);
      
      const addToGroupResponseText = await addToGroupResponse.text();
      console.log('Add to group response:', addToGroupResponseText);

      if (!addToGroupResponse.ok) {
        console.error('Failed to add file to group:', addToGroupResponse.status, addToGroupResponseText);
        throw new Error(`Failed to add file to group: ${addToGroupResponse.status} ${addToGroupResponseText}`);
      }

      console.log(`✅ File ${fileId} successfully added to group ${groupId}!`);
      console.log(`IPFS Hash: ${ipfsHash}`);
      
      return ipfsHash;
    } catch (error) {
      console.error('Error uploading file to group:', error);
      throw new Error(`Failed to upload file to group: ${error.message}`);
    }
  }

  /**
   * Upload harvest certificate to a new group
   */
  public async uploadHarvestCertificate(
    batchData: {
      batchId: string;
      farmerName: string;
      cropType: string;
      variety: string;
      harvestQuantity: number;
      harvestDate: string;
      grading: string;
      certification: string;
      pricePerKg: number;
    }
  ): Promise<{ pdfBlob: Blob; groupId: string; ipfsHash: string }> {
    try {
      // Generate group name
      const groupName = this.generateGroupName(batchData.farmerName, batchData.cropType, batchData.variety);
      
      // Create new group
      const groupId = await this.createGroup(groupName);
      
      // Generate PDF
      const pdfBlob = await this.createHarvestPDF(batchData, groupId, groupName);

      // Upload to group
      const fileName = `harvest_certificate_${batchData.batchId}_${Date.now()}.pdf`;
      const metadata = {
        keyvalues: {
          batchId: batchData.batchId,
          transactionType: 'HARVEST',
          from: 'Farm',
          to: batchData.farmerName,
          quantity: batchData.harvestQuantity.toString(),
          price: (batchData.harvestQuantity * batchData.pricePerKg).toString(),
          timestamp: new Date().toISOString(),
          cropType: batchData.cropType,
          variety: batchData.variety,
          type: 'certificate',
          groupId: groupId,
          groupName: groupName
        }
      };

      const ipfsHash = await this.uploadFileToGroup(groupId, pdfBlob, fileName, metadata);
      
      console.log(`Uploaded harvest certificate for batch ${batchData.batchId}, Group: ${groupName}, Group ID: ${groupId}, IPFS: ${ipfsHash}`);
      return { pdfBlob, groupId, ipfsHash };
    } catch (error) {
      console.error('Error uploading harvest certificate:', error);
      throw new Error('Failed to upload harvest certificate');
    }
  }

  /**
   * Upload purchase certificate to existing group
   */
  public async uploadPurchaseCertificate(
    groupId: string,
    purchaseData: {
      batchId: string;
      from: string;
      to: string;
      quantity: number;
      pricePerKg: number;
      timestamp: string;
    }
  ): Promise<{ pdfBlob: Blob; ipfsHash: string }> {
    try {
      // Generate PDF
      const pdfBlob = await this.createPurchasePDF(purchaseData, groupId);

      // Upload to group
      const fileName = `purchase_certificate_${purchaseData.batchId}_${Date.now()}.pdf`;
      const metadata = {
        keyvalues: {
          batchId: purchaseData.batchId,
          transactionType: 'PURCHASE',
          from: purchaseData.from,
          to: purchaseData.to,
          quantity: purchaseData.quantity.toString(),
          price: (purchaseData.quantity * purchaseData.pricePerKg).toString(),
          timestamp: purchaseData.timestamp,
          type: 'certificate',
          groupId: groupId
        }
      };

      const ipfsHash = await this.uploadFileToGroup(groupId, pdfBlob, fileName, metadata);
      
      console.log(`Uploaded purchase certificate for batch ${purchaseData.batchId}, Group ID: ${groupId}, IPFS: ${ipfsHash}`);
      return { pdfBlob, ipfsHash };
    } catch (error) {
      console.error('Error uploading purchase certificate:', error);
      throw new Error('Failed to upload purchase certificate');
    }
  }

  /**
   * Create harvest PDF
   */
  private async createHarvestPDF(
    batchData: any,
    groupId: string,
    groupName: string
  ): Promise<Blob> {
    // Import jsPDF dynamically
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF();
    
    // Add content to PDF
    pdf.setFontSize(20);
    pdf.text('AGRITRACE HARVEST CERTIFICATE', 20, 30);
    
    pdf.setFontSize(12);
    pdf.text(`Batch ID: ${batchData.batchId}`, 20, 50);
    pdf.text(`Farmer: ${batchData.farmerName}`, 20, 60);
    pdf.text(`Crop: ${batchData.cropType} - ${batchData.variety}`, 20, 70);
    pdf.text(`Quantity: ${batchData.harvestQuantity} kg`, 20, 80);
    pdf.text(`Harvest Date: ${batchData.harvestDate}`, 20, 90);
    pdf.text(`Grading: ${batchData.grading}`, 20, 100);
    pdf.text(`Group ID: ${groupId}`, 20, 110);
    pdf.text(`Group Name: ${groupName}`, 20, 120);
    pdf.text(`Generated: ${new Date().toISOString()}`, 20, 130);
    
    return pdf.output('blob');
  }

  /**
   * Create purchase PDF
   */
  private async createPurchasePDF(
    purchaseData: any,
    groupId: string
  ): Promise<Blob> {
    // Import jsPDF dynamically
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF();
    
    // Add content to PDF
    pdf.setFontSize(20);
    pdf.text('AGRITRACE PURCHASE CERTIFICATE', 20, 30);
    
    pdf.setFontSize(12);
    pdf.text(`Batch ID: ${purchaseData.batchId}`, 20, 50);
    pdf.text(`From: ${purchaseData.from}`, 20, 60);
    pdf.text(`To: ${purchaseData.to}`, 20, 70);
    pdf.text(`Quantity: ${purchaseData.quantity} kg`, 20, 80);
    pdf.text(`Price: ₹${purchaseData.pricePerKg}/kg`, 20, 90);
    pdf.text(`Total: ₹${purchaseData.quantity * purchaseData.pricePerKg}`, 20, 100);
    pdf.text(`Group ID: ${groupId}`, 20, 110);
    pdf.text(`Generated: ${new Date().toISOString()}`, 20, 120);
    
    return pdf.output('blob');
  }
}

// Export singleton instance
export const workingPinataGroupsManager = new WorkingPinataGroupsManager();
