import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Working Group Manager - Uses metadata-based grouping with working Pinata API
 * This approach uses the standard file upload API with metadata to simulate groups
 */
export class WorkingGroupManager {
  
  /**
   * Generate a group name for metadata-based grouping
   */
  private generateGroupName(farmerName: string, cropType: string, variety: string): string {
    const cleanFarmerName = farmerName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanCropType = cropType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanVariety = variety.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    return `${cleanFarmerName}_${cleanCropType}_${cleanVariety}`;
  }

  /**
   * Upload file with group metadata (simulates group creation)
   */
  public async uploadFileWithGroupMetadata(
    groupName: string,
    fileBlob: Blob,
    fileName: string,
    metadata: any
  ): Promise<{ ipfsHash: string; groupId: string }> {
    try {
      console.log('Uploading file with group metadata...');
      console.log('Group name:', groupName);
      console.log('File name:', fileName);
      console.log('File size:', fileBlob.size);
      
      const formData = new FormData();
      formData.append("file", fileBlob, fileName);

      // Create pinataMetadata with group information
      const pinataMetadata = {
        name: fileName,
        keyvalues: {
          groupName: groupName,
          groupId: groupName, // Use groupName as groupId for metadata-based grouping
          ...metadata.keyvalues || metadata
        }
      };

      // Create pinataOptions
      const pinataOptions = {
        cidVersion: 1,
      };

      formData.append("pinataMetadata", JSON.stringify(pinataMetadata));
      formData.append("pinataOptions", JSON.stringify(pinataOptions));

      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (key === 'file') {
          console.log(key, `[Blob: ${(value as Blob).size} bytes, type: ${(value as Blob).type}]`);
        } else {
          console.log(key, value);
        }
      }

      console.log('Making request to working Pinata API...');
      
      const request = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          "pinata_api_key": PINATA_CONFIG.apiKey,
          "pinata_secret_api_key": PINATA_CONFIG.apiSecret,
        },
        body: formData,
      });

      console.log('Upload response status:', request.status);
      const responseText = await request.text();
      console.log('Upload response body:', responseText);

      if (!request.ok) {
        console.error('Upload failed with status:', request.status);
        console.error('Response body:', responseText);
        throw new Error(`Failed to upload file: ${request.status} ${responseText}`);
      }

      const response = JSON.parse(responseText);
      const ipfsHash = response.IpfsHash;
      
      if (!ipfsHash) {
        console.error('No IPFS hash in response:', response);
        throw new Error('No IPFS hash returned from upload');
      }

      console.log(`✅ Successfully uploaded file ${fileName} with group metadata ${groupName}, IPFS: ${ipfsHash}`);
      
      return { ipfsHash, groupId: groupName };
    } catch (error) {
      console.error('Error uploading file with group metadata:', error);
      throw new Error(`Failed to upload file with group metadata: ${error.message}`);
    }
  }

  /**
   * Upload harvest certificate with group metadata
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
      
      // Generate PDF
      const pdfBlob = await this.createHarvestPDF(batchData, groupName);

      // Upload with group metadata
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
          groupId: groupName,
          groupName: groupName
        }
      };

      const result = await this.uploadFileWithGroupMetadata(groupName, pdfBlob, fileName, metadata);
      
      console.log(`Uploaded harvest certificate for batch ${batchData.batchId}, Group: ${groupName}, IPFS: ${result.ipfsHash}`);
      return { pdfBlob, groupId: result.groupId, ipfsHash: result.ipfsHash };
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

      // Upload with group metadata
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
          groupId: groupId,
          groupName: groupId
        }
      };

      const result = await this.uploadFileWithGroupMetadata(groupId, pdfBlob, fileName, metadata);
      
      console.log(`Uploaded purchase certificate for batch ${purchaseData.batchId}, Group: ${groupId}, IPFS: ${result.ipfsHash}`);
      return { pdfBlob, ipfsHash: result.ipfsHash };
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
    pdf.text(`Group: ${groupName}`, 20, 110);
    pdf.text(`Generated: ${new Date().toISOString()}`, 20, 120);
    
    return pdf.output('blob');
  }

  /**
   * Create purchase PDF
   */
  private async createPurchasePDF(
    purchaseData: any,
    groupName: string
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
    pdf.text(`Group: ${groupName}`, 20, 110);
    pdf.text(`Generated: ${new Date().toISOString()}`, 20, 120);
    
    return pdf.output('blob');
  }

  /**
   * List files by group (metadata-based)
   */
  public async listFilesByGroup(groupName: string): Promise<any[]> {
    try {
      console.log(`Listing files for group: ${groupName}`);
      
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
        return data.rows || [];
      } else {
        console.error('Failed to list files by group:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error listing files by group:', error);
      return [];
    }
  }
}

// Export singleton instance
export const workingGroupManager = new WorkingGroupManager();