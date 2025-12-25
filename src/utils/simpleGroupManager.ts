import { IPFSService } from './ipfs';

/**
 * Simple Group Manager
 * Uses metadata to group certificates instead of Pinata's group API
 */
export class SimpleGroupManager {
  private static instance: SimpleGroupManager;
  private ipfsService: IPFSService;

  private constructor() {
    this.ipfsService = IPFSService.getInstance();
  }

  public static getInstance(): SimpleGroupManager {
    if (!SimpleGroupManager.instance) {
      SimpleGroupManager.instance = new SimpleGroupManager();
    }
    return SimpleGroupManager.instance;
  }

  /**
   * Generate a group ID for a batch
   */
  public generateGroupId(batchId: string, farmerName: string): string {
    const timestamp = Date.now();
    const farmerHash = farmerName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `batch-${batchId}-${farmerHash}-${timestamp}`;
  }

  /**
   * Upload harvest certificate
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
      // Generate group ID
      const groupId = this.generateGroupId(batchData.batchId, batchData.farmerName);
      
      // Generate PDF
      const pdfBlob = await this.createHarvestPDF(batchData, groupId);

      // Upload to IPFS with group metadata
      const fileName = `harvest_${batchData.batchId}_${Date.now()}.pdf`;
      const metadata = {
        name: fileName,
        keyvalues: {
          groupId: groupId,
          batchId: batchData.batchId,
          transactionType: 'HARVEST',
          from: 'Farm',
          to: batchData.farmerName,
          quantity: batchData.harvestQuantity.toString(),
          price: (batchData.harvestQuantity * batchData.pricePerKg).toString(),
          timestamp: new Date().toISOString(),
          cropType: batchData.cropType,
          variety: batchData.variety
        }
      };

      const uploadResponse = await this.ipfsService.uploadFile(pdfBlob, fileName, metadata);
      
      console.log(`Uploaded harvest certificate for batch ${batchData.batchId}, Group ID: ${groupId}`);
      return { pdfBlob, groupId, ipfsHash: uploadResponse.IpfsHash };
    } catch (error) {
      console.error('Error uploading harvest certificate:', error);
      throw new Error('Failed to upload harvest certificate');
    }
  }

  /**
   * Upload purchase certificate
   */
  public async uploadPurchaseCertificate(
    groupId: string,
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
      const pdfBlob = await this.createPurchasePDF(purchaseData, groupId);

      // Upload to IPFS with group metadata
      const fileName = `purchase_${purchaseData.batchId}_${Date.now()}.pdf`;
      const metadata = {
        name: fileName,
        keyvalues: {
          groupId: groupId,
          batchId: purchaseData.batchId,
          transactionType: 'PURCHASE',
          from: purchaseData.from,
          to: purchaseData.to,
          quantity: purchaseData.quantity.toString(),
          price: (purchaseData.quantity * purchaseData.unitPrice).toString(),
          timestamp: new Date().toISOString(),
          deliveryAddress: purchaseData.deliveryAddress
        }
      };

      const uploadResponse = await this.ipfsService.uploadFile(pdfBlob, fileName, metadata);
      
      console.log(`Uploaded purchase certificate for batch ${purchaseData.batchId}, Group ID: ${groupId}`);
      return { pdfBlob, ipfsHash: uploadResponse.IpfsHash };
    } catch (error) {
      console.error('Error uploading purchase certificate:', error);
      throw new Error('Failed to upload purchase certificate');
    }
  }

  /**
   * Get all certificates in a group
   */
  public async getGroupCertificates(groupId: string): Promise<any[]> {
    try {
      // This would require a Pinata API call to search by metadata
      // For now, we'll return a placeholder
      console.log(`Getting certificates for group: ${groupId}`);
      return [];
    } catch (error) {
      console.error('Error getting group certificates:', error);
      return [];
    }
  }

  /**
   * Generate certificate URL for viewing
   */
  public getCertificateUrl(ipfsHash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }

  /**
   * Generate group verification URL (placeholder)
   */
  public getGroupVerificationUrl(groupId: string): string {
    return `https://gateway.pinata.cloud/ipfs/?group=${groupId}`;
  }

  /**
   * Create harvest PDF
   */
  private async createHarvestPDF(batchData: any, groupId: string): Promise<Blob> {
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
  private async createPurchasePDF(purchaseData: any, groupId: string): Promise<Blob> {
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
export const simpleGroupManager = SimpleGroupManager.getInstance();
