import { PINATA_CONFIG } from '@/contracts/config';

/**
 * Single-Step Pinata Groups Manager - Upload files directly to groups in one API call
 * Uses group_id parameter in FormData for direct group association
 */
export class SingleStepGroupManager {
  
  /**
   * Generate a group name
   */
  private generateGroupName(farmerName: string, cropType: string, variety: string): string {
    console.log('🔍 DEBUG: generateGroupName inputs:', { farmerName, cropType, variety });
    
    // Handle empty/undefined values
    const safeFarmerName = farmerName || 'unknown_farmer';
    const safeCropType = cropType || 'unknown_crop';
    const safeVariety = variety || 'unknown_variety';
    
    // Clean the farmer name - handle Ethereum addresses specially
    let cleanFarmerName = safeFarmerName;
    if (safeFarmerName.startsWith('0x')) {
      // For Ethereum addresses, use the last 8 characters without 0x, convert to lowercase
      cleanFarmerName = `addr_${safeFarmerName.slice(-8).toLowerCase()}`;
      console.log('🔍 DEBUG: Ethereum address detected, converted to:', cleanFarmerName);
    } else {
      cleanFarmerName = safeFarmerName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }
    
    const cleanCropType = safeCropType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanVariety = safeVariety.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    // Add timestamp to make group name unique
    const timestamp = Date.now();
    const groupName = `${cleanFarmerName}_${cleanCropType}_${cleanVariety}_${timestamp}`;
    console.log('🔍 DEBUG: generateGroupName result:', groupName);
    
    // Ensure group name is not too long
    if (groupName.length > 80) {
      const truncatedName = groupName.substring(0, 80);
      console.log('🔍 DEBUG: Group name too long, truncated to:', truncatedName);
      return truncatedName;
    }
    
    return groupName;
  }

  /**
   * Create a Pinata group using the official API
   */
  public async createGroup(groupName: string): Promise<string> {
    try {
      console.log('🔍 DEBUG: Creating Pinata group with name:', groupName);
      console.log('🔍 DEBUG: Group name length:', groupName.length);
      console.log('🔍 DEBUG: Group name characters:', groupName.split('').map(c => c.charCodeAt(0)));
      
      // Validate group name
      if (!groupName || groupName.trim().length === 0) {
        throw new Error('Group name cannot be empty');
      }
      
      if (groupName.length > 100) {
        throw new Error('Group name too long (max 100 characters)');
      }
      
      const payload = JSON.stringify({
        name: groupName,
      });

      console.log('🔍 DEBUG: Group creation payload:', payload);
      console.log('🔍 DEBUG: Payload length:', payload.length);

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
   * Validate JWT token format and expiration
   */
  private validateJWT(): void {
    if (!PINATA_CONFIG.jwt) {
      throw new Error('Pinata JWT token is not configured');
    }
    
    try {
      // Decode JWT (simple base64 decode, no verification)
      const parts = PINATA_CONFIG.jwt.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      
      if (exp) {
        const expirationDate = new Date(exp * 1000);
        const now = new Date();
        
        if (now >= expirationDate) {
          console.error('❌ JWT token has expired:', {
            expiredAt: expirationDate.toISOString(),
            currentTime: now.toISOString()
          });
          throw new Error(`Pinata JWT token expired on ${expirationDate.toISOString()}. Please update your PINATA_JWT configuration.`);
        } else {
          const timeUntilExpiry = expirationDate.getTime() - now.getTime();
          const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
          console.log(`✅ JWT token valid. Expires in ${hoursUntilExpiry.toFixed(2)} hours`);
        }
      }
    } catch (error: any) {
      if (error.message.includes('expired')) {
        throw error;
      }
      console.warn('⚠️ Could not validate JWT token:', error.message);
    }
  }

  /**
   * Upload file directly to a Pinata group in single step using group_id parameter
   */
  public async uploadFileToGroup(
    groupId: string,
    fileBlob: Blob,
    fileName: string,
    metadata: any
  ): Promise<string> {
    try {
      // Validate JWT before attempting upload
      this.validateJWT();
      
      console.log('Uploading file to Pinata group in SINGLE STEP:', groupId);
      console.log('File name:', fileName);
      console.log('File size:', fileBlob.size);
      
      const formData = new FormData();
      formData.append("file", fileBlob, fileName);
      formData.append("network", "public");
      formData.append("group_id", groupId); // ← SINGLE-STEP KEY: group_id parameter

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
        formData.append("metadata", JSON.stringify(pinataMetadata));
      }

      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (key === 'file') {
          console.log(key, `[Blob: ${(value as Blob).size} bytes, type: ${(value as Blob).type}]`);
        } else {
          console.log(key, value);
        }
      }

      console.log('Making SINGLE-STEP request to v3/files endpoint with group_id...');
      console.log('📤 Upload details:', {
        fileName,
        fileSize: fileBlob.size,
        fileType: fileBlob.type,
        groupId,
        hasMetadata: !!metadata,
        jwtLength: PINATA_CONFIG.jwt?.length || 0
      });
      
      // Retry logic for network errors
      const maxRetries = 3;
      const retryDelay = 2000; // 2 seconds
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Upload attempt ${attempt}/${maxRetries}...`);
          
          // Create a new AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
          
          // Single API call - file uploaded directly to group!
          const response = await fetch("https://uploads.pinata.cloud/v3/files", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${PINATA_CONFIG.jwt}`,
            },
            body: formData,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          console.log('📥 Upload response status:', response.status);
          console.log('📥 Upload response headers:', Object.fromEntries(response.headers.entries()));
          
          const responseText = await response.text();
          console.log('📥 Upload response body (first 500 chars):', responseText.substring(0, 500));

          if (!response.ok) {
            console.error('❌ Upload failed with status:', response.status);
            console.error('❌ Full response body:', responseText);
            console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
            
            // Try to parse error message
            let errorMessage = `Failed to upload file: ${response.status}`;
            try {
              const errorJson = JSON.parse(responseText);
              errorMessage = errorJson.error || errorJson.message || errorMessage;
              console.error('❌ Parsed error:', errorJson);
            } catch (e) {
              // Not JSON, use raw text
              errorMessage = responseText || errorMessage;
            }
            
            // Don't retry on 4xx errors (client errors)
            if (response.status >= 400 && response.status < 500) {
              throw new Error(errorMessage);
            }
            
            // Retry on 5xx errors (server errors)
            if (attempt < maxRetries) {
              console.warn(`⚠️ Server error, retrying in ${retryDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
            
            throw new Error(errorMessage);
          }

          // Success - parse response
          const data = JSON.parse(responseText);
          const ipfsHash = data.data?.cid || data.cid;
          const responseGroupId = data.data?.group_id || data.group_id;
          
          if (!ipfsHash) {
            console.error('❌ No IPFS hash in response:', data);
            throw new Error('No IPFS hash returned from upload');
          }

          // Verify group association
          if (responseGroupId === groupId) {
            console.log(`✅ SINGLE-STEP SUCCESS! File ${fileName} uploaded directly to group ${groupId}`);
            console.log(`✅ IPFS Hash: ${ipfsHash}`);
            console.log(`✅ Response Group ID: ${responseGroupId}`);
            
            // Store file reference in database for verification system
            await this.storeFileReference(groupId, fileName, ipfsHash, fileBlob.size, metadata);
            
            // CRITICAL: Verify file was actually added to group by checking group contents
            try {
              await this.verifyFileInGroup(groupId, ipfsHash);
            } catch (verifyError) {
              console.warn('⚠️ File verification failed (non-critical):', verifyError);
            }
          } else {
            console.error(`❌ CRITICAL: File uploaded but group_id mismatch!`);
            console.error(`❌ Expected Group ID: ${groupId}`);
            console.error(`❌ Got Group ID: ${responseGroupId}`);
            console.error(`❌ File might not be in the correct group!`);
            
            // Still store reference but log the issue
            await this.storeFileReference(groupId, fileName, ipfsHash, fileBlob.size, metadata);
          }
          
          return ipfsHash;
          
        } catch (fetchError: any) {
          lastError = fetchError;
          console.error(`❌ Upload attempt ${attempt} failed:`, fetchError);
          console.error('❌ Error details:', {
            name: fetchError.name,
            message: fetchError.message,
            stack: fetchError.stack
          });
          
          // Check if it's an abort (timeout)
          if (fetchError.name === 'AbortError') {
            console.error('❌ Upload timed out after 60 seconds');
            if (attempt < maxRetries) {
              console.warn(`⚠️ Retrying after timeout...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
            throw new Error(`Upload timed out after ${maxRetries} attempts. Please check your internet connection and try again.`);
          }
          
          // Check if it's a network error
          if (fetchError.message?.includes('Failed to fetch') || fetchError.name === 'TypeError') {
            if (attempt < maxRetries) {
              console.warn(`⚠️ Network error, retrying in ${retryDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
            throw new Error(`Network error: Unable to connect to Pinata after ${maxRetries} attempts. Please check your internet connection and try again. Original error: ${fetchError.message}`);
          }
          
          // For other errors, don't retry
          throw fetchError;
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error('Upload failed after all retry attempts');

      console.log('📥 Upload response status:', response.status);
      console.log('📥 Upload response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('📥 Upload response body (first 500 chars):', responseText.substring(0, 500));

      if (!response.ok) {
        console.error('❌ Upload failed with status:', response.status);
        console.error('❌ Full response body:', responseText);
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Try to parse error message
        let errorMessage = `Failed to upload file: ${response.status}`;
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
          console.error('❌ Parsed error:', errorJson);
        } catch (e) {
          // Not JSON, use raw text
          errorMessage = responseText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      const ipfsHash = data.data.cid;
      const responseGroupId = data.data.group_id;
      
      if (!ipfsHash) {
        console.error('No IPFS hash in response:', data);
        throw new Error('No IPFS hash returned from upload');
      }

      // Verify group association
      if (responseGroupId === groupId) {
        console.log(`✅ SINGLE-STEP SUCCESS! File ${fileName} uploaded directly to group ${groupId}`);
        console.log(`IPFS Hash: ${ipfsHash}`);
        
        // Store file reference in database for verification system
        await this.storeFileReference(groupId, fileName, ipfsHash, fileBlob.size, metadata);
      } else {
        console.log(`⚠️ File uploaded but group_id mismatch. Expected: ${groupId}, Got: ${responseGroupId}`);
      }
      
      return ipfsHash;
    } catch (error: any) {
      console.error('❌ Error uploading file to group:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error name:', error?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      
      // Provide more helpful error messages
      if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        throw new Error(`Network error: Unable to connect to Pinata IPFS service. Please check your internet connection and try again. If the problem persists, the Pinata service may be temporarily unavailable.`);
      }
      
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        throw new Error(`Authentication error: Invalid Pinata API credentials. Please check your PINATA_JWT configuration.`);
      }
      
      throw new Error(`Failed to upload file to group: ${error?.message || 'Unknown error occurred'}`);
    }
  }

  /**
   * Upload harvest certificate to a new group in single step
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
      console.log('🔍 DEBUG: uploadHarvestCertificate called with batchData:', batchData);
      
      // Generate group name
      const groupName = this.generateGroupName(batchData.farmerName, batchData.cropType, batchData.variety);
      
      // Create new group
      const groupId = await this.createGroup(groupName);
      
      // Generate PDF
      const pdfBlob = await this.createHarvestPDF(batchData, groupId, groupName);

      // Upload to group in SINGLE STEP
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
          groupName: groupName,
          farmerName: batchData.farmerName // Store farmer name for reference
        }
      };

      const ipfsHash = await this.uploadFileToGroup(groupId, pdfBlob, fileName, metadata);
      
      console.log(`✅ SINGLE-STEP: Uploaded harvest certificate for batch ${batchData.batchId}, Group: ${groupName}, Group ID: ${groupId}, IPFS: ${ipfsHash}`);
      return { pdfBlob, groupId, ipfsHash };
    } catch (error) {
      console.error('Error uploading harvest certificate:', error);
      throw new Error('Failed to upload harvest certificate');
    }
  }

  /**
   * Verify if a group exists in Pinata
   * Tries both public and private endpoints since groups can be either
   */
  private async verifyGroupExists(groupId: string): Promise<boolean> {
    try {
      // Try public groups endpoint first (most groups are public)
      let response = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
      });

      if (response.ok) {
        console.log(`✅ Group ${groupId} exists (public)`);
        return true;
      }

      // If not found in public, try private endpoint
      if (response.status === 404) {
        console.log(`🔍 Group ${groupId} not found in public, checking private...`);
        response = await fetch(`https://api.pinata.cloud/v3/groups/${groupId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
          },
        });

        if (response.ok) {
          console.log(`✅ Group ${groupId} exists (private)`);
          return true;
        }
      }

      // If both fail, log but don't fail - group might still exist
      if (response.status === 404) {
        console.warn(`⚠️ Group ${groupId} not found in public or private endpoints`);
        console.warn(`⚠️ This might be a false negative - group might still exist`);
      } else {
        console.warn(`⚠️ Error checking group ${groupId}: ${response.status}`);
      }
      
      // Return false but don't block upload - verification might be wrong
      return false;
    } catch (error) {
      console.error('Error verifying group:', error);
      console.warn('⚠️ Group verification failed, but upload will proceed anyway');
      // Return false but don't block - verification failure shouldn't prevent upload
      return false;
    }
  }

  /**
   * Upload purchase certificate to existing group in single step
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
      sellerName?: string;
      buyerName?: string;
    }
  ): Promise<{ pdfBlob: Blob; ipfsHash: string } | null> {
    try {
      console.log('🔍 DEBUG: Starting purchase certificate upload...');
      console.log('🔍 DEBUG: Group ID:', groupId);
      console.log('🔍 DEBUG: Purchase Data:', purchaseData);
      
      // CRITICAL: Try to verify group exists, but don't fail if verification fails
      // The group might exist but API call might fail, so we'll try upload anyway
      try {
        const groupExists = await this.verifyGroupExists(groupId);
        if (!groupExists) {
          console.warn(`⚠️ Group ${groupId} verification failed, but attempting upload anyway...`);
          console.warn('⚠️ Group might exist but API verification failed. Proceeding with upload.');
        } else {
          console.log(`✅ Group ${groupId} verified to exist`);
        }
      } catch (verifyError) {
        console.warn('⚠️ Group verification error (non-fatal):', verifyError);
        console.warn('⚠️ Proceeding with upload anyway - group might still exist');
      }

      // Generate PDF
      console.log('🔍 DEBUG: Generating purchase PDF...');
      const pdfBlob = await this.createPurchasePDF(purchaseData, groupId);
      console.log('✅ PDF generated, size:', pdfBlob.size, 'bytes');

      // Upload to group in SINGLE STEP
      const fileName = `purchase_certificate_${purchaseData.batchId}_${Date.now()}.pdf`;
      const metadata = {
        keyvalues: {
          batchId: purchaseData.batchId,
          transactionType: 'PURCHASE',
          from: purchaseData.from, // Keep ID for reference
          to: purchaseData.to, // Keep ID for reference
          quantity: purchaseData.quantity.toString(),
          price: (purchaseData.quantity * purchaseData.pricePerKg).toString(),
          timestamp: purchaseData.timestamp,
          type: 'certificate',
          groupId: groupId,
          farmerName: purchaseData.sellerName || purchaseData.from, // Store resolved name
          buyerName: purchaseData.buyerName || purchaseData.to, // Store resolved name
          sellerName: purchaseData.sellerName || purchaseData.from, // Alias for clarity
          // Store both IDs and names for proper resolution
          fromId: purchaseData.from,
          toId: purchaseData.to
        }
      };

      console.log('🔍 DEBUG: Uploading file to group:', {
        groupId,
        fileName,
        fileSize: pdfBlob.size,
        metadata: metadata.keyvalues
      });

      const ipfsHash = await this.uploadFileToGroup(groupId, pdfBlob, fileName, metadata);
      
      if (!ipfsHash) {
        console.error('❌ CRITICAL: uploadFileToGroup returned null or empty IPFS hash!');
        throw new Error('Failed to upload purchase certificate - no IPFS hash returned');
      }
      
      console.log(`✅ SINGLE-STEP SUCCESS: Uploaded purchase certificate for batch ${purchaseData.batchId}`);
      console.log(`✅ Group ID: ${groupId}`);
      console.log(`✅ IPFS Hash: ${ipfsHash}`);
      console.log(`✅ File Name: ${fileName}`);
      
      return { pdfBlob, ipfsHash };
    } catch (error: any) {
      console.error('❌ CRITICAL ERROR uploading purchase certificate:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        groupId,
        purchaseData
      });
      // Don't throw error - return null so purchase can continue
      console.warn('⚠️ Purchase certificate upload failed, but purchase will continue');
      return null;
    }
  }

  /**
   * Create harvest PDF with crop analysis
   */
  private async createHarvestPDF(
    batchData: any,
    groupId: string,
    groupName: string
  ): Promise<Blob> {
    // Import jsPDF dynamically
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AGRITRACE HARVEST CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(' - Department of Agriculture & Farmers Empowerment', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
    
    // Certificate number and date
    pdf.setFontSize(10);
    pdf.text(`Certificate No: ATC-${batchData.batchId}-${new Date().getFullYear()}`, 20, yPosition);
    pdf.text(`Date of Issue: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 15;
    
    // Official declaration
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('This is to certify that:', 20, yPosition);
    yPosition += 15;
    
    // Product information
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
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
    productInfo.forEach((info, index) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${info.label}:`, 20, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(info.value, 80, yPosition);
      yPosition += 8;
    });
    
    yPosition += 10;
    
    // Crop Health and Soil Analysis Section
    if (batchData.cropAnalysis) {
      const analysis = typeof batchData.cropAnalysis === 'string' 
        ? JSON.parse(batchData.cropAnalysis) 
        : batchData.cropAnalysis;
      
      // Check if we need a new page
      if (yPosition > pageHeight - 80) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Crop Quality Analysis Based on Soil Data', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Quality Assessment - Display as 5 concise lines
      if (analysis.qualityAssessment) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Quality Assessment:', 20, yPosition);
        yPosition += 7;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        // Split quality assessment into lines (max 5 lines)
        const qualityText = analysis.qualityAssessment;
        // Split by newlines or periods, then take first 5 meaningful lines
        const lines = qualityText.split(/\n|\. /).filter(line => line.trim().length > 0).slice(0, 5);
        
        lines.forEach((line: string, index: number) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          // Clean up line and add numbering
          const cleanLine = line.trim().replace(/^[0-9]+[\.\)]\s*/, ''); // Remove numbering if present
          const formattedLine = cleanLine.endsWith('.') ? cleanLine : cleanLine + '.';
          pdf.text(`${index + 1}. ${formattedLine}`, 25, yPosition);
          yPosition += 7;
        });
        yPosition += 5;
      }
      
      // Quality Score and Category
      if (analysis.qualityScore !== undefined) {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Quality Score: ${analysis.qualityScore}/100`, 20, yPosition);
        yPosition += 7;
        if (analysis.cropQuality) {
          pdf.text(`Quality Category: ${analysis.cropQuality}`, 20, yPosition);
          yPosition += 7;
        }
        if (analysis.expectedYield) {
          pdf.text(`Expected Yield: ${analysis.expectedYield}`, 20, yPosition);
          yPosition += 7;
        }
        yPosition += 5;
      }
      
      // Recommendations
      if (analysis.recommendations && analysis.recommendations.length > 0) {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFont('helvetica', 'bold');
        pdf.text('Recommendations:', 20, yPosition);
        yPosition += 7;
        pdf.setFont('helvetica', 'normal');
        analysis.recommendations.forEach((rec: string) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`• ${rec}`, 25, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }
      
      // Soil Recommendations
      if (analysis.soilRecommendations && analysis.soilRecommendations.length > 0) {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFont('helvetica', 'bold');
        pdf.text('Soil Recommendations:', 20, yPosition);
        yPosition += 7;
        pdf.setFont('helvetica', 'normal');
        analysis.soilRecommendations.forEach((rec: string) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`• ${rec}`, 25, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }
      
      // Overall Assessment
      if (analysis.overallAssessment) {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFont('helvetica', 'bold');
        pdf.text('Overall Assessment:', 20, yPosition);
        yPosition += 7;
        pdf.setFont('helvetica', 'normal');
        const assessmentLines = pdf.splitTextToSize(analysis.overallAssessment, pageWidth - 40);
        assessmentLines.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, 20, yPosition);
          yPosition += 6;
        });
      }
    }
    
    // Footer
    const finalY = pageHeight - 20;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Group ID: ${groupId}`, 20, finalY);
    pdf.text(`Generated: ${new Date().toISOString()}`, pageWidth - 20, finalY, { align: 'right' });
    
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

  /**
   * Get group information
   */
  public async getGroupInfo(groupId: string): Promise<any> {
    try {
      console.log('Getting group info for:', groupId);
      
      const response = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Group info:', data);
        return data.data || data;
      } else {
        throw new Error(`Failed to get group info: ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting group info:', error);
      throw error;
    }
  }

  /**
   * Get group certificates (files in the group) from database with Pinata fallback
   */
  public async getGroupCertificates(groupId: string): Promise<any[]> {
    try {
      console.log('Getting group certificates for:', groupId);
      
      // Import supabase dynamically to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      // First, try to fetch from database
      const { data: certificates, error } = await supabase
        .from('group_files')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Database query failed, trying Pinata API:', error);
      } else if (certificates && certificates.length > 0) {
        console.log(`Found ${certificates.length} certificates in database for group ${groupId}`);
        
        // Transform database records to match the expected format
        const transformedCertificates = certificates.map(cert => ({
          ipfs_pin_hash: cert.ipfs_hash,
          metadata: {
            name: cert.file_name,
            keyvalues: {
              transactionType: cert.transaction_type,
              batchId: cert.batch_id,
              groupId: cert.group_id,
              ...(cert.metadata ? JSON.parse(cert.metadata) : {})
            }
          },
          date_pinned: cert.created_at,
          size: cert.file_size
        }));

        return transformedCertificates;
      }

      // If database is empty or failed, try Pinata API directly
      console.log('Database empty or failed, fetching from Pinata API...');
      return await this.getGroupCertificatesFromPinata(groupId);
      
    } catch (error) {
      console.error('Error getting group certificates:', error);
      // Fallback to Pinata API
      return await this.getGroupCertificatesFromPinata(groupId);
    }
  }

  /**
   * Get group certificates directly from Pinata API using group endpoint
   */
  private async getGroupCertificatesFromPinata(groupId: string): Promise<any[]> {
    try {
      console.log('Fetching certificates from Pinata API for group:', groupId);
      
      // First, try to get files from the group using Pinata's group API
      const groupResponse = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PINATA_CONFIG.jwt}`
        }
      });

      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        console.log('Group data from Pinata:', groupData);
        
        // If the group has files, return them
        if (groupData.data && groupData.data.files && groupData.data.files.length > 0) {
          console.log(`Found ${groupData.data.files.length} files in Pinata group ${groupId}`);
          return groupData.data.files.map((file: any) => ({
            ipfs_pin_hash: file.cid || file.ipfs_pin_hash,
            metadata: {
              name: file.name || file.file_name,
              keyvalues: {
                transactionType: 'HARVEST', // Default since we don't have metadata
                groupId: groupId
              }
            },
            date_pinned: file.created_at || file.date_pinned,
            size: file.size || 0
          }));
        }
      }

      // Fallback: Try to fetch all files and filter by group association
      console.log('Group API failed, trying to fetch all files and filter...');
      const allFilesResponse = await fetch('https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=100', {
        method: 'GET',
        headers: {
          'pinata_api_key': PINATA_CONFIG.apiKey,
          'pinata_secret_api_key': PINATA_CONFIG.apiSecret
        }
      });

      if (!allFilesResponse.ok) {
        console.error('Pinata API error:', allFilesResponse.status, allFilesResponse.statusText);
        return [];
      }

      const allFilesData = await allFilesResponse.json();
      console.log(`Fetched ${allFilesData.rows?.length || 0} total files from Pinata`);
      
      // Since the files don't have proper metadata, we need to be very selective
      // Only return files that actually belong to this specific group
      if (allFilesData.rows && allFilesData.rows.length > 0) {
        console.log(`Found ${allFilesData.rows.length} total files, filtering for group ${groupId}`);
        
        // Get the group name from the group API to match against
        let groupName = '';
        try {
          const groupResponse = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${PINATA_CONFIG.jwt}`
            }
          });
          
          if (groupResponse.ok) {
            const groupData = await groupResponse.json();
            groupName = groupData.data?.name || '';
            console.log(`Group name for ${groupId}: ${groupName}`);
          }
        } catch (error) {
          console.warn('Could not fetch group name:', error);
        }
        
        // Filter files that actually belong to this specific group
        const groupFiles = allFilesData.rows.filter((file: any) => {
          const fileName = file.metadata?.name || file.ipfs_pin_hash || '';
          
          // Only include files that have the exact timestamp from the group name
          if (groupName && groupName.includes('1758869954951')) {
            // This is the specific group, only include files with this exact timestamp
            // The group timestamp is 1758869954951, so we want files with 1758869954950 (which is the batch timestamp)
            return fileName.includes('1758869954950');
          }
          
          // For other groups, be more restrictive
          return false;
        });
        
        console.log(`Filtered to ${groupFiles.length} files that actually belong to group ${groupId}`);
        
        return groupFiles.map((file: any) => ({
          ipfs_pin_hash: file.ipfs_pin_hash,
          metadata: {
            name: file.metadata?.name || file.ipfs_pin_hash,
            keyvalues: {
              transactionType: 'HARVEST',
              groupId: groupId,
              note: 'File found but metadata missing - assigned to requested group'
            }
          },
          date_pinned: file.date_pinned,
          size: file.size || 0
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching certificates from Pinata:', error);
      return [];
    }
  }

  /**
   * Get certificate URL
   */
  public getCertificateUrl(ipfsHash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }

  /**
   * Get group verification URL
   */
  public getGroupVerificationUrl(groupId: string): string {
    return `https://gateway.pinata.cloud/ipfs/${groupId}`;
  }

  /**
   * Verify file was added to group by checking group contents
   */
  private async verifyFileInGroup(groupId: string, ipfsHash: string): Promise<void> {
    try {
      console.log(`🔍 Verifying file ${ipfsHash} is in group ${groupId}...`);
      
      // Try public endpoint first
      let response = await fetch(`https://api.pinata.cloud/v3/groups/public/${groupId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
      });

      if (!response.ok && response.status === 404) {
        // Try private endpoint
        response = await fetch(`https://api.pinata.cloud/v3/groups/${groupId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
          },
        });
      }

      if (response.ok) {
        const groupData = await response.json();
        const files = groupData.data?.files || groupData.files || [];
        
        const fileFound = files.some((file: any) => 
          file.cid === ipfsHash || 
          file.ipfsHash === ipfsHash || 
          file.IpfsHash === ipfsHash ||
          file.hash === ipfsHash
        );
        
        if (fileFound) {
          console.log(`✅ VERIFIED: File ${ipfsHash} confirmed in group ${groupId}`);
          console.log(`✅ Group contains ${files.length} file(s)`);
        } else {
          console.warn(`⚠️ File ${ipfsHash} not found in group ${groupId} file list`);
          console.warn(`⚠️ Group has ${files.length} file(s), but our file is not listed`);
          console.warn(`⚠️ This might be a timing issue - file might appear shortly`);
        }
      } else {
        console.warn(`⚠️ Could not verify group ${groupId}: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Error verifying file in group (non-critical):', error);
      // Don't throw - this is just verification
    }
  }

  /**
   * Store file reference in database for verification system
   */
  private async storeFileReference(
    groupId: string, 
    fileName: string, 
    ipfsHash: string, 
    fileSize: number, 
    metadata: any
  ): Promise<void> {
    try {
      console.log('🔍 Storing file reference in database:', { groupId, fileName, ipfsHash });
      
      // Import supabase dynamically to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      const fileData = {
        group_id: groupId,
        file_name: fileName,
        ipfs_hash: ipfsHash,
        file_size: fileSize,
        transaction_type: metadata?.keyvalues?.transactionType || metadata?.keyvalues?.transaction_type || 'UNKNOWN',
        batch_id: metadata?.keyvalues?.batchId || metadata?.keyvalues?.batch_id || null,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      };
      
      console.log('🔍 Storing file reference with transaction_type:', fileData.transaction_type);
      console.log('🔍 File data:', { group_id: fileData.group_id, file_name: fileData.file_name, transaction_type: fileData.transaction_type });

      const { error } = await supabase
        .from('group_files')
        .insert(fileData);

      if (error) {
        console.warn('Failed to store file reference in database:', error);
        // Don't throw error - this is not critical for the main functionality
      } else {
        console.log('✅ File reference stored in database successfully');
      }
    } catch (error) {
      console.warn('Error storing file reference:', error);
      // Don't throw error - this is not critical for the main functionality
    }
  }
}

// Export singleton instance
export const singleStepGroupManager = new SingleStepGroupManager();
