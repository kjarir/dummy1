import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Proper Group Manager
 * Uses the correct Pinata API endpoints as provided in the documentation
 */
export class ProperGroupManager {
  private static instance: ProperGroupManager;

  private constructor() {}

  public static getInstance(): ProperGroupManager {
    if (!ProperGroupManager.instance) {
      ProperGroupManager.instance = new ProperGroupManager();
    }
    return ProperGroupManager.instance;
  }

  /**
   * Generate a group name based on owner and crop
   */
  public generateGroupName(farmerName: string, cropType: string, variety: string): string {
    const cleanFarmerName = farmerName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const cleanCropType = cropType.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const cleanVariety = variety.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    
    return `${cleanFarmerName} - ${cleanCropType} ${cleanVariety}`;
  }

  /**
   * Create a new group using the correct Pinata API
   */
  public async createGroup(groupName: string): Promise<string> {
    try {
      const payload = JSON.stringify({
        name: groupName,
      });

      console.log('Creating group with payload:', payload);
      console.log('Using JWT:', PINATA_CONFIG.jwt.substring(0, 50) + '...');

      const request = await fetch("https://api.pinata.cloud/v3/groups/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
        body: payload,
      });

      console.log('Group creation response status:', request.status);
      const responseText = await request.text();
      console.log('Group creation response:', responseText);

      if (!request.ok) {
        // Try to parse error response
        let errorMessage = `Failed to create group: ${request.status} ${request.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Use default error message
        }
        throw new Error(errorMessage);
      }

      const response = JSON.parse(responseText);
      console.log(`Created Pinata group: ${groupName} with ID: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      console.error('Error creating Pinata group:', error);
      throw new Error(`Failed to create Pinata group: ${error.message}`);
    }
  }

  /**
   * Upload file to a specific group using the correct Pinata API
   */
  public async uploadFileToGroup(
    groupId: string,
    fileBlob: Blob,
    fileName: string,
    metadata: any
  ): Promise<string> {
    try {
      console.log('Uploading file to group:', groupId);
      console.log('File name:', fileName);
      console.log('File size:', fileBlob.size);
      
      // Validate group ID format
      if (!groupId || typeof groupId !== 'string') {
        throw new Error('Invalid group ID provided');
      }

      const formData = new FormData();

      formData.append("file", fileBlob, fileName);
      formData.append("network", "public");
      formData.append("group", groupId);

      // Add metadata if provided - use pinataMetadata format
      if (metadata) {
        const pinataMetadata = {
          name: fileName,
          keyvalues: metadata.keyvalues || metadata
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

      console.log('Making request to:', "https://uploads.pinata.cloud/v3/files");
      console.log('JWT Token (first 50 chars):', PINATA_CONFIG.jwt.substring(0, 50) + '...');

      const request = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
        body: formData,
      });

      console.log('Upload response status:', request.status);
      console.log('Upload response headers:', Object.fromEntries(request.headers.entries()));
      
      const responseText = await request.text();
      console.log('Upload response body:', responseText);

      if (!request.ok) {
        console.error('Upload failed with status:', request.status);
        console.error('Response body:', responseText);
        throw new Error(`Failed to upload file: ${request.status} ${responseText}`);
      }

      const response = JSON.parse(responseText);
      const ipfsHash = response.ipfsHash || response.IpfsHash;
      
      if (!ipfsHash) {
        console.error('No IPFS hash in response:', response);
        throw new Error('No IPFS hash returned from upload');
      }

      console.log(`✅ Successfully uploaded file ${fileName} to group ${groupId}, IPFS: ${ipfsHash}`);
      
      // Verify the file was actually uploaded to the group
      await this.verifyFileInGroup(groupId, ipfsHash);
      
      return ipfsHash;
    } catch (error) {
      console.error('Error uploading file to group:', error);
      throw new Error(`Failed to upload file to group: ${error.message}`);
    }
  }

  /**
   * Verify that a file was uploaded to a specific group
   */
  private async verifyFileInGroup(groupId: string, ipfsHash: string): Promise<void> {
    try {
      console.log(`Verifying file ${ipfsHash} is in group ${groupId}...`);
      
      // Get group details
      const groupResponse = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        }
      });

      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        console.log('Group details:', groupData);
        
        // Check if the file is in the group's file list
        if (groupData.files && Array.isArray(groupData.files)) {
          const fileInGroup = groupData.files.find((file: any) => 
            file.ipfsHash === ipfsHash || file.IpfsHash === ipfsHash
          );
          
          if (fileInGroup) {
            console.log(`✅ File ${ipfsHash} confirmed in group ${groupId}`);
          } else {
            console.warn(`⚠️ File ${ipfsHash} not found in group ${groupId} file list`);
          }
        } else {
          console.log('Group does not have files array or is empty');
        }
      } else {
        console.warn(`Could not verify group ${groupId}: ${groupResponse.status}`);
      }
    } catch (error) {
      console.warn('Error verifying file in group:', error);
      // Don't throw error as this is just verification
    }
  }

  /**
   * List all groups and their files for debugging
   */
  public async listAllGroups(): Promise<void> {
    try {
      console.log('Listing all groups...');
      
      const response = await fetch("https://api.pinata.cloud/v3/groups/public", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('All groups:', data);
        
        if (data.groups && Array.isArray(data.groups)) {
          for (const group of data.groups) {
            console.log(`Group: ${group.name} (ID: ${group.id})`);
            console.log(`Created: ${group.created_at}`);
            
            // Get files in this group
            try {
              const groupResponse = await fetch(`https://api.pinata.cloud/v3/groups/public/${group.id}`, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
                }
              });
              
              if (groupResponse.ok) {
                const groupData = await groupResponse.json();
                console.log(`Files in group ${group.name}:`, groupData.files || 'No files');
              }
            } catch (error) {
              console.error(`Error getting files for group ${group.id}:`, error);
            }
          }
        }
      } else {
        console.error('Failed to list groups:', response.status);
      }
    } catch (error) {
      console.error('Error listing groups:', error);
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
        name: fileName,
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
    groupName: string,
    purchaseData: {
      batchId: string;
      from: string;
      to: string;
      quantity: number;
      unitPrice: number;
      deliveryAddress: string;
      productDetails: {
        cropType: string;
        variety: string;
        harvestDate: string;
        grading: string;
        certification: string;
      };
    }
  ): Promise<{ pdfBlob: Blob; ipfsHash: string }> {
    try {
      // Generate PDF
      const pdfBlob = await this.createPurchasePDF(purchaseData, groupId, groupName);

      // Upload to existing group
      const fileName = `purchase_certificate_${purchaseData.batchId}_${Date.now()}.pdf`;
      const metadata = {
        name: fileName,
        keyvalues: {
          batchId: purchaseData.batchId,
          transactionType: 'PURCHASE',
          from: purchaseData.from,
          to: purchaseData.to,
          quantity: purchaseData.quantity.toString(),
          price: (purchaseData.quantity * purchaseData.unitPrice).toString(),
          timestamp: new Date().toISOString(),
          deliveryAddress: purchaseData.deliveryAddress,
          type: 'certificate',
          groupId: groupId,
          groupName: groupName
        }
      };

      const ipfsHash = await this.uploadFileToGroup(groupId, pdfBlob, fileName, metadata);
      
      console.log(`Uploaded purchase certificate for batch ${purchaseData.batchId}, Group: ${groupName}, Group ID: ${groupId}, IPFS: ${ipfsHash}`);
      return { pdfBlob, ipfsHash };
    } catch (error) {
      console.error('Error uploading purchase certificate:', error);
      throw new Error('Failed to upload purchase certificate');
    }
  }

  /**
   * Create harvest PDF
   */
  private async createHarvestPDF(batchData: any, groupId: string, groupName: string): Promise<Blob> {
    // Import jsPDF dynamically
    const { default: jsPDF } = await import('jspdf');
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Government-style colors
    const primaryColor = [0, 51, 102]; // Deep blue
    const accentColor = [255, 215, 0]; // Gold
    const textColor = [0, 0, 0]; // Black
    const lightGray = [240, 240, 240]; // Light gray for backgrounds
    
    // Background pattern (subtle)
    doc.setFillColor(...lightGray);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Ornamental border
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // Inner decorative border
    doc.setLineWidth(1);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
    
    // Header section with government seal area
    doc.setFillColor(...primaryColor);
    doc.rect(20, 20, pageWidth - 40, 50, 'F');
    
    // Government emblem area (circular)
    doc.setFillColor(...accentColor);
    doc.circle(pageWidth / 2, 45, 15, 'F');
    
    // Emblem text
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVT', pageWidth / 2, 42, { align: 'center' });
    doc.text('OF', pageWidth / 2, 45, { align: 'center' });
    doc.text('ODISHA', pageWidth / 2, 48, { align: 'center' });
    
    // Main title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF AGRICULTURAL TRACEABILITY', pageWidth / 2, 25, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Government of Odisha - Department of Agriculture & Farmers Empowerment', pageWidth / 2, 32, { align: 'center' });
    
    // Certificate number and date
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Certificate No: ATC-${batchData.batchId}-${new Date().getFullYear()}`, 30, 80);
    doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 30, 80, { align: 'right' });
    
    // Certificate body
    let yPosition = 90;
    
    // Official declaration
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('This is to certify that:', 30, yPosition);
    yPosition += 15;
    
    // Product information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const productInfo = [
      { label: 'Product Name', value: `${batchData.cropType} - ${batchData.variety}` },
      { label: 'Batch Identification Number', value: `ATC-${batchData.batchId}-${new Date().getFullYear()}` },
      { label: 'Harvest Quantity', value: `${batchData.harvestQuantity} kg` },
      { label: 'Harvest Date', value: new Date(batchData.harvestDate).toLocaleDateString('en-IN') },
      { label: 'Quality Grade', value: batchData.grading },
      { label: 'Certification Level', value: batchData.certification },
      { label: 'Price per Kg', value: `₹${batchData.pricePerKg}` },
      { label: 'Total Value', value: `₹${batchData.harvestQuantity * batchData.pricePerKg}` }
    ];
    
    // Create a formal table layout
    productInfo.forEach((field, index) => {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Draw table row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(30, yPosition - 3, pageWidth - 60, 12, 'F');
      }
      
      // Field label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${field.label}:`, 35, yPosition);
      
      // Field value
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(field.value, 35, yPosition + 4);
      yPosition += 8;
      
      yPosition += 8;
    });

    // Add group information
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('VERIFICATION INFORMATION', 30, yPosition);
    yPosition += 8;

    // Draw line under header
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(30, yPosition, pageWidth - 30, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Group Name:', 35, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(groupName, 35, yPosition + 4);
    yPosition += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Group ID for Verification:', 35, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(groupId, 35, yPosition + 4);
    yPosition += 12;
    
    // Official declaration
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('This certificate is issued under the authority of the Government of Odisha', 30, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('and certifies the authenticity and traceability of the above-mentioned agricultural produce.', 30, yPosition);
    
    // Footer with official signatures
    yPosition = pageHeight - 60;
    
    // Signature lines
    doc.setDrawColor(...textColor);
    doc.setLineWidth(0.5);
    doc.line(50, yPosition, 120, yPosition);
    doc.line(pageWidth - 120, yPosition, pageWidth - 50, yPosition);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', 50, yPosition + 8);
    doc.text('Department of Agriculture', 50, yPosition + 12);
    doc.text('Government of Odisha', 50, yPosition + 16);
    
    doc.text('Digital Verification', pageWidth - 120, yPosition + 8);
    doc.text('Group ID', pageWidth - 120, yPosition + 12);
    doc.text(groupId.substring(0, 15) + '...', pageWidth - 120, yPosition + 16);
    
    // Official seal area
    yPosition = pageHeight - 40;
    doc.setFillColor(...accentColor);
    doc.circle(pageWidth / 2, yPosition, 12, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL', pageWidth / 2, yPosition - 2, { align: 'center' });
    doc.text('SEAL', pageWidth / 2, yPosition + 2, { align: 'center' });
    doc.text('ODISHA', pageWidth / 2, yPosition + 6, { align: 'center' });
    
    // Generate blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  /**
   * Create purchase PDF
   */
  private async createPurchasePDF(purchaseData: any, groupId: string, groupName: string): Promise<Blob> {
    // Import jsPDF dynamically
    const { default: jsPDF } = await import('jspdf');
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Government-style colors
    const primaryColor = [0, 51, 102]; // Deep blue
    const accentColor = [255, 215, 0]; // Gold
    const textColor = [0, 0, 0]; // Black
    const lightGray = [240, 240, 240]; // Light gray for backgrounds
    
    // Background pattern (subtle)
    doc.setFillColor(...lightGray);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Ornamental border
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    // Inner decorative border
    doc.setLineWidth(1);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
    
    // Header section with government seal area
    doc.setFillColor(...primaryColor);
    doc.rect(20, 20, pageWidth - 40, 50, 'F');
    
    // Government emblem area (circular)
    doc.setFillColor(...accentColor);
    doc.circle(pageWidth / 2, 45, 15, 'F');
    
    // Emblem text
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVT', pageWidth / 2, 42, { align: 'center' });
    doc.text('OF', pageWidth / 2, 45, { align: 'center' });
    doc.text('ODISHA', pageWidth / 2, 48, { align: 'center' });
    
    // Main title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF PURCHASE TRANSACTION', pageWidth / 2, 25, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Government of Odisha - Department of Agriculture & Farmers Empowerment', pageWidth / 2, 32, { align: 'center' });
    
    // Certificate number and date
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Transaction No: TXN-${Date.now()}-${new Date().getFullYear()}`, 30, 80);
    doc.text(`Date of Transaction: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 30, 80, { align: 'right' });
    
    // Certificate body
    let yPosition = 90;
    
    // Official declaration
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('This is to certify that the following purchase transaction has been recorded:', 30, yPosition);
    yPosition += 15;
    
    // Transaction information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const transactionInfo = [
      { label: 'Product Name', value: `${purchaseData.productDetails.cropType} - ${purchaseData.productDetails.variety}` },
      { label: 'Batch ID', value: purchaseData.batchId },
      { label: 'Quantity Purchased', value: `${purchaseData.quantity} kg` },
      { label: 'Unit Price', value: `₹${purchaseData.unitPrice}` },
      { label: 'Total Amount', value: `₹${purchaseData.quantity * purchaseData.unitPrice}` },
      { label: 'From (Seller)', value: purchaseData.from },
      { label: 'To (Buyer)', value: purchaseData.to },
      { label: 'Delivery Address', value: purchaseData.deliveryAddress }
    ];
    
    // Create a formal table layout
    transactionInfo.forEach((field, index) => {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 30;
      }
      
      // Draw table row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(30, yPosition - 3, pageWidth - 60, 12, 'F');
      }
      
      // Field label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${field.label}:`, 35, yPosition);
      
      // Field value
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(field.value, 35, yPosition + 4);
      yPosition += 8;
      
      yPosition += 8;
    });

    // Add group information
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('VERIFICATION INFORMATION', 30, yPosition);
    yPosition += 8;

    // Draw line under header
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(30, yPosition, pageWidth - 30, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Group Name:', 35, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(groupName, 35, yPosition + 4);
    yPosition += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Group ID for Verification:', 35, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(groupId, 35, yPosition + 4);
    yPosition += 12;
    
    // Official declaration
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('This transaction is recorded under the authority of the Government of Odisha', 30, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('and forms part of the complete supply chain traceability record.', 30, yPosition);
    
    // Footer with official signatures
    yPosition = pageHeight - 60;
    
    // Signature lines
    doc.setDrawColor(...textColor);
    doc.setLineWidth(0.5);
    doc.line(50, yPosition, 120, yPosition);
    doc.line(pageWidth - 120, yPosition, pageWidth - 50, yPosition);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signatory', 50, yPosition + 8);
    doc.text('Department of Agriculture', 50, yPosition + 12);
    doc.text('Government of Odisha', 50, yPosition + 16);
    
    doc.text('Digital Verification', pageWidth - 120, yPosition + 8);
    doc.text('Group ID', pageWidth - 120, yPosition + 12);
    doc.text(groupId.substring(0, 15) + '...', pageWidth - 120, yPosition + 16);
    
    // Official seal area
    yPosition = pageHeight - 40;
    doc.setFillColor(...accentColor);
    doc.circle(pageWidth / 2, yPosition, 12, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL', pageWidth / 2, yPosition - 2, { align: 'center' });
    doc.text('SEAL', pageWidth / 2, yPosition + 2, { align: 'center' });
    doc.text('ODISHA', pageWidth / 2, yPosition + 6, { align: 'center' });
    
    // Generate blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }
}

// Export singleton instance
export const properGroupManager = ProperGroupManager.getInstance();