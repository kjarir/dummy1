import jsPDF from 'jspdf';
import { transactionManager } from './transactionManager';
import { TransactionChain, CertificateData } from '@/types/transaction';

/**
 * Immutable Certificate Generator
 * Generates certificates by tracing transaction chains
 */
export class ImmutableCertificateGenerator {
  private static instance: ImmutableCertificateGenerator;

  private constructor() {}

  public static getInstance(): ImmutableCertificateGenerator {
    if (!ImmutableCertificateGenerator.instance) {
      ImmutableCertificateGenerator.instance = new ImmutableCertificateGenerator();
    }
    return ImmutableCertificateGenerator.instance;
  }

  /**
   * Generate certificate from batch ID
   */
  public async generateCertificateFromBatchId(batchId: string): Promise<Blob> {
    try {
      const chain = await transactionManager.getTransactionChain(batchId);
      const certificateData = await this.buildCertificateData(chain);
      return await this.generatePDF(certificateData);
    } catch (error) {
      console.error('Error generating certificate from batch ID:', error);
      throw new Error('Failed to generate certificate from batch ID');
    }
  }

  /**
   * Generate certificate from IPFS hash
   */
  public async generateCertificateFromIPFSHash(ipfsHash: string): Promise<Blob> {
    try {
      // Get transaction from IPFS hash
      const transaction = await transactionManager.getTransactionByIPFSHash(ipfsHash);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get complete chain for the batch
      const chain = await transactionManager.getTransactionChain(transaction.batchId);
      const certificateData = await this.buildCertificateData(chain);
      return await this.generatePDF(certificateData);
    } catch (error) {
      console.error('Error generating certificate from IPFS hash:', error);
      throw new Error('Failed to generate certificate from IPFS hash');
    }
  }

  /**
   * Build certificate data from transaction chain
   */
  private async buildCertificateData(chain: TransactionChain): Promise<CertificateData> {
    // Handle case where no transactions exist (group-based system)
    if (chain.transactions.length === 0) {
      console.warn('No transactions found for batch, using group-based system fallback');
      return {
        batchId: chain.batchId,
        productDetails: {
          cropType: 'Unknown Crop',
          variety: 'Unknown Variety',
          farmer: 'Jarir Khan',
          harvestDate: new Date().toISOString(),
          grading: 'Unknown Grade',
          certification: 'Unknown Certification'
        },
        ownershipHistory: [],
        currentOwners: {},
        transactionChain: [],
        totalQuantity: 0,
        availableQuantity: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }

    const firstTransaction = chain.transactions[0];
    const lastTransaction = chain.transactions[chain.transactions.length - 1];

    return {
      batchId: chain.batchId,
      productDetails: firstTransaction.productDetails,
      ownershipHistory: await transactionManager.getOwnershipHistory(chain.batchId),
      currentOwners: Object.fromEntries(
        Object.entries(chain.currentOwners).map(([owner, data]) => [owner, data.quantity])
      ),
      transactionChain: chain.transactions,
      totalQuantity: chain.totalQuantity,
      availableQuantity: chain.availableQuantity,
      createdAt: firstTransaction.timestamp,
      lastUpdated: lastTransaction.timestamp
    };
  }

  /**
   * Generate PDF certificate
   */
  private async generatePDF(certificateData: CertificateData): Promise<Blob> {
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
    doc.text(`Certificate No: ATC-${certificateData.batchId}-${new Date().getFullYear()}`, 30, 80);
    doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 30, 80, { align: 'right' });
    
    // Certificate body
    let yPosition = 90;
    const lineHeight = 6;
    
    // Official declaration
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('This is to certify that:', 30, yPosition);
    yPosition += 15;
    
    // Product information in a formal table format
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const productInfo = [
      { label: 'Product Name', value: `${certificateData.productDetails.crop} - ${certificateData.productDetails.variety}` },
      { label: 'Batch Identification Number', value: `ATC-${certificateData.batchId}-${new Date().getFullYear()}` },
      { label: 'Original Harvest Quantity', value: `${certificateData.totalQuantity} kg` },
      { label: 'Current Available Quantity', value: `${certificateData.availableQuantity} kg` },
      { label: 'Harvest Date', value: new Date(certificateData.productDetails.harvestDate).toLocaleDateString('en-IN') },
      { label: 'Quality Grade', value: certificateData.productDetails.grading || 'Standard' },
      { label: 'Certification Level', value: certificateData.productDetails.certification || 'Standard' },
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
      const textWidth = doc.getTextWidth(field.value);
      if (textWidth > pageWidth - 120) {
        // Split long text
        const splitText = doc.splitTextToSize(field.value, pageWidth - 120);
        doc.text(splitText, 35, yPosition + 4);
        yPosition += lineHeight * splitText.length;
      } else {
        doc.text(field.value, 35, yPosition + 4);
        yPosition += lineHeight;
      }
      
      yPosition += 8;
    });

    // Add current ownership information
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('CURRENT OWNERSHIP DISTRIBUTION', 30, yPosition);
    yPosition += 8;

    // Draw line under header
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.line(30, yPosition, pageWidth - 30, yPosition);
    yPosition += 10;

    // Current owners
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    Object.entries(certificateData.currentOwners).forEach(([owner, quantity]) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`Owner: ${owner}`, 35, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`Quantity: ${quantity} kg`, 35, yPosition + 4);
      yPosition += 12;
    });

    // Add transaction history if available
    if (certificateData.transactionChain.length > 0) {
      // Check if we need a new page
      if (yPosition > pageHeight - 120) {
        doc.addPage();
        yPosition = 30;
      }

      yPosition += 15;
      
      // Transaction History Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('SUPPLY CHAIN TRANSACTION HISTORY', 30, yPosition);
      yPosition += 8;

      // Draw line under header
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.line(30, yPosition, pageWidth - 30, yPosition);
      yPosition += 10;

      // Transaction details in formal format
      doc.setFontSize(9);
      doc.setTextColor(...textColor);
      
      certificateData.transactionChain.forEach((transaction, index) => {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 30;
        }

        // Transaction header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Transaction ${index + 1}: ${transaction.type}`, 35, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(new Date(transaction.timestamp).toLocaleDateString('en-IN'), pageWidth - 35, yPosition, { align: 'right' });
        yPosition += 6;

        // Transaction details in table format
        const details = [
          { label: 'From', value: transaction.from },
          { label: 'To', value: transaction.to },
          { label: 'Quantity', value: `${transaction.quantity} kg` },
          { label: 'Price', value: `₹${(transaction.price / 100).toFixed(2)}` }
        ];

        details.forEach(detail => {
          doc.setFont('helvetica', 'bold');
          doc.text(`${detail.label}:`, 40, yPosition);
          doc.setFont('helvetica', 'normal');
          doc.text(detail.value, 40 + 25, yPosition);
          yPosition += 4;
        });
        
        if (transaction.metadata?.location) {
          doc.setFont('helvetica', 'bold');
          doc.text('Location:', 40, yPosition);
          doc.setFont('helvetica', 'normal');
          doc.text(transaction.metadata.location, 40 + 25, yPosition);
          yPosition += 4;
        }
        
        if (transaction.metadata?.notes) {
          doc.setFont('helvetica', 'bold');
          doc.text('Notes:', 40, yPosition);
          doc.setFont('helvetica', 'normal');
          doc.text(transaction.metadata.notes, 40 + 25, yPosition);
          yPosition += 4;
        }

        yPosition += 8;
      });
    }
    
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
    doc.text('Blockchain Hash', pageWidth - 120, yPosition + 12);
    doc.text(certificateData.transactionChain[0]?.ipfsHash ? `${certificateData.transactionChain[0].ipfsHash.substring(0, 15)}...` : 'N/A', pageWidth - 120, yPosition + 16);
    
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
export const immutableCertificateGenerator = ImmutableCertificateGenerator.getInstance();
