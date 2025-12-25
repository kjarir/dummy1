/**
 * Certificate Generator Utilities
 */

export interface SupplyChainTransaction {
  id: string;
  transactionId: string;
  type: 'HARVEST' | 'PURCHASE' | 'TRANSFER' | 'PROCESSING' | 'RETAIL';
  from: string;
  to: string;
  quantity: number;
  price: number;
  timestamp: string;
  location?: string;
  notes?: string;
  batchId: string;
  ipfsHash: string;
  productDetails?: {
    cropType: string;
    variety: string;
    harvestDate: string;
    grading: string;
    certification: string;
  };
}

export interface EnhancedBatchData {
  id: string;
  farmer: string;
  crop: string;
  variety: string;
  harvestQuantity: string;
  sowingDate: string;
  harvestDate: string;
  freshnessDuration: string;
  grading: string;
  certification: string;
  labTest: string;
  price: number;
  ipfsHash: string;
  languageDetected: string;
  summary: string;
  callStatus: string;
  offTopicCount: number;
  currentOwner: string;
  transactionHistory: SupplyChainTransaction[];
  currentQuantity: number;
  originalQuantity: number;
}

/**
 * Generate PDF certificate from batch data
 */
export async function generatePDFCertificate(batchData: EnhancedBatchData): Promise<Blob> {
  try {
    // Import jsPDF dynamically
    const { default: jsPDF } = await import('jspdf');
    
    // Validate required fields
    if (!batchData.id || !batchData.farmer || !batchData.crop) {
      throw new Error('Missing required batch data for certificate generation');
    }
    
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
  doc.text(`Certificate No: ATC-${batchData.id}-${new Date().getFullYear()}`, 30, 80);
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
  
  // Clean grading to show only the actual grade
  const cleanGrading = batchData.grading.split('|')[0].trim();
  
  const productInfo = [
    { label: 'Product Name', value: `${batchData.crop} - ${batchData.variety}` },
    { label: 'Batch Identification Number', value: `ATC-${batchData.id}-${new Date().getFullYear()}` },
    { label: 'Harvest Quantity', value: `${batchData.harvestQuantity} kg` },
    { label: 'Harvest Date', value: new Date(batchData.harvestDate).toLocaleDateString('en-IN') },
    { label: 'Quality Grade', value: cleanGrading },
    { label: 'Certification Level', value: batchData.certification },
    { label: 'Price per Kg', value: `₹${batchData.price}` },
    { label: 'Total Value', value: `₹${parseFloat(batchData.harvestQuantity) * batchData.price}` }
  ];
  
  // Create a formal table layout
  productInfo.forEach((field, index) => {
    if (yPosition > pageHeight - 120) {
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

  // Add transaction history if available
  if (batchData.transactionHistory && batchData.transactionHistory.length > 0) {
    yPosition += 10;
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

    batchData.transactionHistory.forEach((transaction, index) => {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 30;
      }

      // Transaction header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      doc.text(`${index + 1}. ${transaction.type} Transaction`, 35, yPosition);
      yPosition += 6;

      // Transaction details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`From: ${transaction.from}`, 40, yPosition);
      doc.text(`To: ${transaction.to}`, 40, yPosition + 4);
      doc.text(`Quantity: ${transaction.quantity} kg`, 40, yPosition + 8);
      doc.text(`Price: ₹${transaction.price}`, 40, yPosition + 12);
      doc.text(`Date: ${new Date(transaction.timestamp).toLocaleDateString('en-IN')}`, 40, yPosition + 16);
      
      if (transaction.location) {
        doc.text(`Location: ${transaction.location}`, 40, yPosition + 20);
        yPosition += 24;
      } else {
        yPosition += 20;
      }
      
      yPosition += 8;
    });
  }

  // Add verification information
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
  doc.text('Current Owner:', 35, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(batchData.currentOwner || 'Unknown', 35, yPosition + 4);
  yPosition += 8;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Available Quantity:', 35, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(`${batchData.currentQuantity || 0} kg`, 35, yPosition + 4);
  yPosition += 8;
  
  if (batchData.ipfsHash && batchData.ipfsHash.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('IPFS Hash:', 35, yPosition);
    doc.setFont('helvetica', 'normal');
    const hashDisplay = batchData.ipfsHash.length > 20 
      ? batchData.ipfsHash.substring(0, 20) + '...' 
      : batchData.ipfsHash;
    doc.text(hashDisplay, 35, yPosition + 4);
    yPosition += 8;
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
  doc.text('IPFS Hash', pageWidth - 120, yPosition + 12);
  doc.text(batchData.ipfsHash ? batchData.ipfsHash.substring(0, 15) + '...' : 'N/A', pageWidth - 120, yPosition + 16);
  
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
  } catch (error) {
    console.error('Error generating PDF certificate:', error);
    throw new Error(`Failed to generate PDF certificate: ${error.message}`);
  }
}

/**
 * Download PDF certificate
 */
export async function downloadPDFCertificate(batchData: EnhancedBatchData, filename?: string): Promise<void> {
  try {
    const pdfBlob = await generatePDFCertificate(batchData);
    const downloadUrl = window.URL.createObjectURL(pdfBlob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || `certificate_${batchData.id}_${new Date().getFullYear()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading PDF certificate:', error);
    throw new Error('Failed to download PDF certificate');
  }
}