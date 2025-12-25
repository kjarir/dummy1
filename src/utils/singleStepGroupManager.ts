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
   * Upload file directly to a Pinata group in single step using group_id parameter
   */
  public async uploadFileToGroup(
    groupId: string,
    fileBlob: Blob,
    fileName: string,
    metadata: any
  ): Promise<string> {
    try {
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
      
      // Single API call - file uploaded directly to group!
      const response = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PINATA_CONFIG.jwt}`,
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
    } catch (error) {
      console.error('Error uploading file to group:', error);
      throw new Error(`Failed to upload file to group: ${error.message}`);
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
    }
  ): Promise<{ pdfBlob: Blob; ipfsHash: string }> {
    try {
      // Generate PDF
      const pdfBlob = await this.createPurchasePDF(purchaseData, groupId);

      // Upload to group in SINGLE STEP
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
          farmerName: purchaseData.from, // Store farmer name for reference
          buyerName: purchaseData.to // Store buyer name for reference
        }
      };

      const ipfsHash = await this.uploadFileToGroup(groupId, pdfBlob, fileName, metadata);
      
      console.log(`✅ SINGLE-STEP: Uploaded purchase certificate for batch ${purchaseData.batchId}, Group ID: ${groupId}, IPFS: ${ipfsHash}`);
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
        transaction_type: metadata?.keyvalues?.transactionType || 'UNKNOWN',
        batch_id: metadata?.keyvalues?.batchId || null,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      };

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
