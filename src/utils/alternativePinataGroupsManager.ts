import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Alternative Pinata Groups Manager - Uses standard pinFileToIPFS with group parameter
 */
export class AlternativePinataGroupsManager {
  
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
   * Upload file to a specific Pinata group using standard pinFileToIPFS
   */
  public async uploadFileToGroup(
    groupId: string,
    fileBlob: Blob,
    fileName: string,
    metadata: any
  ): Promise<string> {
    try {
      console.log('Uploading file to Pinata group using standard API:', groupId);
      console.log('File name:', fileName);
      console.log('File size:', fileBlob.size);
      
      const formData = new FormData();
      formData.append("file", fileBlob, fileName);

      // Add metadata with group information
      if (metadata) {
        const pinataMetadata = {
          name: fileName,
          keyvalues: {
            ...metadata.keyvalues,
            groupId: groupId,
            groupName: metadata.keyvalues?.groupName || 'unknown'
          }
        };
        formData.append("pinataMetadata", JSON.stringify(pinataMetadata));
      }

      // Add pinata options
      const pinataOptions = {
        cidVersion: 1,
      };
      formData.append("pinataOptions", JSON.stringify(pinataOptions));

      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (key === 'file') {
          console.log(key, `[Blob: ${(value as Blob).size} bytes, type: ${(value as Blob).type}]`);
        } else {
          console.log(key, value);
        }
      }

      console.log('Making request to standard pinFileToIPFS API...');
      
      // Use standard pinFileToIPFS endpoint
      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          "pinata_api_key": PINATA_CONFIG.apiKey,
          "pinata_secret_api_key": PINATA_CONFIG.apiSecret,
        },
        body: formData,
      });

      console.log('Upload response status:', response.status);
      const responseText = await response.text();
      console.log('Upload response body:', responseText);

      if (!response.ok) {
        console.error('Upload failed with status:', response.status);
        console.error('Response body:', responseText);
        throw new Error(`Failed to upload file: ${response.status} ${responseText}`);
      }

      const data = JSON.parse(responseText);
      const ipfsHash = data.IpfsHash;
      
      if (!ipfsHash) {
        console.error('No IPFS hash in response:', data);
        throw new Error('No IPFS hash returned from upload');
      }

      console.log(`✅ Successfully uploaded file ${fileName} with group metadata, IPFS: ${ipfsHash}`);
      
      // Try to add file to group after upload
      await this.addFileToGroup(groupId, ipfsHash);
      
      return ipfsHash;
    } catch (error) {
      console.error('Error uploading file to group:', error);
      throw new Error(`Failed to upload file to group: ${error.message}`);
    }
  }

  /**
   * Add file to group after upload
   */
  private async addFileToGroup(groupId: string, fileId: string): Promise<void> {
    try {
      console.log(`Adding file ${fileId} to group ${groupId}...`);
      
      const response = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}/ids/${fileId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ File ${fileId} added to group ${groupId}`);
      } else {
        const errorText = await response.text();
        console.warn(`Failed to add file to group: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.warn('Error adding file to group:', error);
      // Don't throw error as this is optional
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
export const alternativePinataGroupsManager = new AlternativePinataGroupsManager();
