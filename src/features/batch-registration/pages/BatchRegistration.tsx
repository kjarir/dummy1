import { useState } from 'react';
import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/features/blockchain/contexts/Web3Context';
import { useContract } from '@/hooks/useContract';
import { ipfsManager } from '@/features/ipfs/utils/ipfsManager';
import { logger } from '@/lib/logger';
import { sanitizeError, sanitizeString, validateInteger, validateNumber } from '@/lib/security';
import { uploadBatchMetadataToIPFS } from '@/features/ipfs/utils/ipfs';
import { blockchainTransactionManager } from '@/features/blockchain/utils/blockchainTransactionManager';
import { BatchInput, CONTRACT_ADDRESS } from '@/contracts/config';
import AgriTraceABI from '@/contracts/AgriTrace.json';
import { 
  Package, 
  Calendar, 
  MapPin,
  DollarSign,
  Loader2,
  Wallet,
  FileText,
  Upload,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { MarketPriceDisplay } from '@/features/marketplace/components/MarketPriceDisplay';
import { fetchSoilData } from '@/features/ai-services/services/iotSoilDataService';
import { analyzeCropQualityFromSoil } from '@/features/ai-services/services/cropAnalysisService';

export const BatchRegistration = () => {
  const { user, profile } = useAuth();
  const { isConnected, connectWallet, account, provider, signer } = useWeb3();
  const { registerBatch, getNextBatchId, loading: contractLoading } = useContract();
  const [formData, setFormData] = useState({
    cropType: '',
    variety: '',
    harvestQuantity: '',
    sowingDate: '',
    harvestDate: '',
    pricePerKg: '',
    certification: '',
    grading: 'Standard',
    labTest: '',
    freshnessDuration: '7',
    state: profile?.farm_location?.split(',')[0]?.trim() || 'Odisha',
    district: profile?.farm_location?.split(',')[1]?.trim() || ''
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'uploading' | 'analyzing' | 'blockchain' | 'complete'>('form');
  const [ipfsHash, setIpfsHash] = useState<string>('');
  const [batchId, setBatchId] = useState<number | null>(null);
  interface CropAnalysisData {
    qualityAssessment?: string;
    recommendations?: string;
    soilRecommendations?: string;
    overallAssessment?: string;
    qualityScore?: number;
    [key: string]: unknown;
  }
  
  const [cropAnalysis, setCropAnalysis] = useState<CropAnalysisData | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePriceSelect = (price: number) => {
    // Convert price from per quintal to per kg (divide by 100)
    const pricePerKg = price / 100;
    setFormData({...formData, pricePerKg: pricePerKg.toString()});
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet to register a batch on the blockchain.",
      });
      return;
    }

    setLoading(true);
    setStep('uploading');

    try {
      // Step 1: Fetch IoT soil data and analyze crop quality
      let soilData: any = null;
      let analysisData: any = null;

      setStep('analyzing');
      toast({
        title: "Analyzing Soil Data",
        description: "Fetching soil data from IoT device and analyzing crop quality...",
      });

      // Fetch soil data from IoT device (with retry logic built-in)
      logger.debug('Fetching soil data from IoT device');
      
      // fetchSoilData now has built-in retry logic and won't throw errors
      // It will return empty object on failure
      soilData = await fetchSoilData();
      
      logger.debug('Soil data received', { 
        hasData: Boolean(soilData && Object.keys(soilData).length > 0),
        keys: soilData ? Object.keys(soilData).length : 0
      });
      
      // Validate that we actually got sensor data
      if (!soilData || Object.keys(soilData).length === 0) {
        logger.warn('Empty soil data received from API');
        toast({
          variant: "destructive",
          title: "No Soil Data",
          description: "IoT device returned no data. Continuing without soil analysis.",
        });
        soilData = null; // Set to null so we skip Gemini analysis
      } else {
        // Check if we have at least one meaningful sensor reading
        const hasSensorData = soilData.temperature !== undefined || 
                              soilData.humidity !== undefined || 
                              soilData.soilMoisture !== undefined ||
                              soilData.moisture !== undefined ||
                              soilData.ldr !== undefined ||
                              soilData.gas !== undefined ||
                              soilData.rain !== undefined;
        
        if (!hasSensorData) {
          logger.warn('No sensor readings found in soil data', { availableFields: Object.keys(soilData) });
          toast({
            variant: "destructive",
            title: "Invalid Soil Data",
            description: "IoT device data is incomplete. Continuing without soil analysis.",
          });
          soilData = null; // Set to null so we skip Gemini analysis
        } else {
          logger.debug('Valid sensor data received', {
            temperature: soilData.temperature,
            humidity: soilData.humidity,
            soilMoisture: soilData.soilMoisture || soilData.moisture,
            hasLdr: soilData.ldr !== undefined,
            hasGas: soilData.gas !== undefined,
            hasRain: soilData.rain !== undefined
          });
        }
      }

      // Send soil data to Gemini for crop quality analysis
      if (soilData && Object.keys(soilData).length > 0 && 
          (soilData.temperature !== undefined || 
           soilData.humidity !== undefined || 
           soilData.soilMoisture !== undefined ||
           soilData.moisture !== undefined)) {
        toast({
          title: "Generating Crop Quality Analysis",
          description: "Analyzing crop quality based on soil data...",
        });

        logger.debug('Sending soil data to Gemini for crop quality analysis', {
          cropType: sanitizeString(formData.cropType, 100),
          variety: sanitizeString(formData.variety, 100),
          hasSoilData: Boolean(soilData)
        });

        try {
          analysisData = await analyzeCropQualityFromSoil(
            soilData,
            sanitizeString(formData.cropType, 100),
            sanitizeString(formData.variety, 100)
          );

          logger.debug('Gemini crop quality analysis completed', {
            hasQualityAssessment: Boolean(analysisData?.qualityAssessment),
            hasRecommendations: Boolean(analysisData?.recommendations),
            qualityScore: analysisData?.qualityScore
          });

          setCropAnalysis(analysisData);
        } catch (geminiError: unknown) {
          logger.error('Gemini analysis failed', geminiError);
          toast({
            variant: "destructive",
            title: "Gemini Analysis Failed",
            description: geminiError instanceof Error ? sanitizeError(geminiError) : "Could not analyze crop quality with Gemini API. Please check your API key and try again.",
          });
          // Don't set analysisData - let it remain null so registration can continue without analysis
          analysisData = null;
        }
      } else {
        logger.debug('No soil data available, skipping Gemini analysis');
        toast({
          title: "No Soil Data",
          description: "Soil data not available. Continuing with registration.",
        });
      }

      setStep('uploading');

      // Step 2: Generate PDF certificate (with analysis data)
      const batchData = {
        id: Math.floor(Date.now() / 1000), // Temporary ID for certificate
        farmer: account || '',
        crop: formData.cropType,
        variety: formData.variety,
        harvestQuantity: formData.harvestQuantity,
        sowingDate: formData.sowingDate,
        harvestDate: formData.harvestDate,
        freshnessDuration: formData.freshnessDuration,
        grading: formData.grading,
        certification: formData.certification || 'Standard',
        labTest: formData.labTest,
        price: parseFloat(formData.harvestQuantity) * parseFloat(formData.pricePerKg) * 100, // Convert to paise (multiply by 100)
        ipfsHash: '',
        languageDetected: 'en',
        summary: `Agricultural produce batch: ${formData.cropType} - ${formData.variety}`,
        callStatus: 'completed',
        offTopicCount: 0,
        currentOwner: account || '',
      };

      // Step 2: Generate harvest certificate and create group using SINGLE-STEP method
      const tempBatchId = Date.now(); // Temporary ID for file naming
      
      logger.debug('BatchRegistration data', {
        hasAccount: Boolean(account),
        cropType: sanitizeString(formData.cropType, 100),
        tempBatchId: tempBatchId.toString()
      });
      
      // Get profile - use from context if available, otherwise fetch
      let currentProfile = profile;
      let farmerName = 'User';
      
      if (!currentProfile && user?.id) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, user_type')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (profileError) {
            logger.warn('Could not fetch profile', { error: profileError.message, userId: user.id });
          } else {
            currentProfile = profileData;
          }
        } catch (error) {
          logger.warn('Error fetching profile', error);
        }
      }
      
      if (currentProfile?.full_name) {
        farmerName = currentProfile.full_name;
      }

      const harvestData = {
        batchId: tempBatchId.toString(),
        farmerName: farmerName,
        cropType: formData.cropType || 'Unknown Crop',
        variety: formData.variety || 'Unknown Variety',
        harvestQuantity: parseFloat(formData.harvestQuantity),
        harvestDate: formData.harvestDate,
        grading: formData.grading,
        certification: formData.certification,
        pricePerKg: parseFloat(formData.pricePerKg),
        // Include analysis data for certificate
        cropAnalysis: analysisData,
        soilData: soilData
      };
      
      logger.debug('Harvest data for certificate', { batchId: harvestData.batchId, cropType: harvestData.cropType });
      
      // Upload certificate with retry logic
      let pdfBlob: Blob;
      let groupId: string;
      let ipfsHash: string;
      
      try {
        const result = await ipfsManager.uploadHarvestCertificate({
          batchId: sanitizeString(harvestData.batchId, 100),
          farmerName: sanitizeString(harvestData.farmerName, 255),
          cropType: sanitizeString(harvestData.cropType, 100),
          variety: sanitizeString(harvestData.variety, 100),
          harvestQuantity: validateNumber(harvestData.harvestQuantity, 0, Infinity, 0),
          harvestDate: harvestData.harvestDate,
          grading: sanitizeString(harvestData.grading, 100) || 'Standard',
          certification: sanitizeString(harvestData.certification, 100) || 'Standard',
          pricePerKg: validateNumber(harvestData.pricePerKg, 0, Infinity, 0)
        });
        pdfBlob = result.pdfBlob;
        groupId = result.groupId;
        ipfsHash = result.ipfsHash;
        logger.debug('Certificate uploaded successfully', { groupId, ipfsHash });
      } catch (uploadError: unknown) {
        logger.error('Certificate upload failed', uploadError);
        // Don't fail the entire registration - continue without certificate
        toast({
          variant: "destructive",
          title: "Certificate Upload Failed",
          description: "Batch registration will continue, but certificate upload failed. You can retry later.",
        });
        // Generate temporary values to continue
        pdfBlob = new Blob(['Certificate upload failed'], { type: 'text/plain' });
        groupId = `temp-${Date.now()}`;
        ipfsHash = '';
      }
      
      // Step 3: Upload batch metadata to IPFS
      const metadataIpfsHash = await uploadBatchMetadataToIPFS(batchData, tempBatchId);
      
      setIpfsHash(groupId); // Store group ID instead of individual IPFS hash
      
      // Store the certificate IPFS hash for later use
      const certificateIpfsHash = ipfsHash;
      setStep('blockchain');

      // Step 4: Register on blockchain
      const calculatedPrice = Math.floor(parseFloat(formData.harvestQuantity) * parseFloat(formData.pricePerKg) * 100);
      
      // Validate price is within reasonable bounds (max 1 billion paise = 10 million rupees)
      if (calculatedPrice > 1000000000) {
        throw new Error('Price too high. Please reduce quantity or price per kg.');
      }
      
      const batchInput: BatchInput = {
        crop: formData.cropType,
        variety: formData.variety,
        harvestQuantity: formData.harvestQuantity,
        sowingDate: formData.sowingDate,
        harvestDate: formData.harvestDate,
        freshnessDuration: formData.freshnessDuration,
        grading: formData.grading,
        certification: formData.certification || 'Standard',
        labTest: formData.labTest,
        price: calculatedPrice,
        ipfsHash: groupId,
        languageDetected: 'en',
        summary: `Agricultural produce batch: ${formData.cropType} - ${formData.variety}`,
        callStatus: 'completed',
        offTopicCount: 0,
      };

      // Register on blockchain
      logger.debug('Registering batch on blockchain', { 
        cropType: sanitizeString(batchInput.crop, 100),
        variety: sanitizeString(batchInput.variety, 100),
        quantity: batchInput.harvestQuantity
      });
      const receipt = await registerBatch(batchInput);
      
      if (receipt) {
        logger.debug('Transaction receipt received', { 
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          logCount: receipt.logs?.length || 0
        });
        
        // Extract batch ID from events - BatchRegistered event signature
        const batchRegisteredEventSignature = ethers.id('BatchRegistered(uint256,address,string,string,uint256)');
        logger.debug('Looking for batch registered event', { eventSignature: batchRegisteredEventSignature });
        
        interface EventLog {
          address: string;
          topics: string[];
          data: string;
        }
        
        const eventLogs: EventLog[] = (receipt.logs || []).map((log: { address: string; topics: string[]; data: string }) => ({
          address: log.address,
          topics: log.topics,
          data: log.data
        }));
        
        logger.debug('Event logs found', { count: eventLogs.length });
        
        const batchRegisteredEvent = receipt.logs.find(
          (log: { topics: string[] }) => log.topics?.[0] === batchRegisteredEventSignature
        );
        
        logger.debug('Batch registered event search', { found: Boolean(batchRegisteredEvent) });
        
        let extractedBatchId = null;
        if (batchRegisteredEvent) {
          extractedBatchId = parseInt(batchRegisteredEvent.topics[1], 16);
          setBatchId(extractedBatchId);
          
          // Update the batch data with the real batch ID
          batchData.id = extractedBatchId;
          batchData.ipfsHash = certificateIpfsHash;
          
          // Record harvest transaction on blockchain
          logger.debug('Recording harvest transaction on blockchain', { batchId: extractedBatchId });
          if (signer) {
            try {
              blockchainTransactionManager.updateSigner(signer);
              const harvestTransaction = await blockchainTransactionManager.recordHarvestTransaction(
                extractedBatchId.toString(),
                user?.id || '', // Farmer address
                sanitizeString(formData.cropType, 100),
                sanitizeString(formData.variety, 100),
                validateNumber(formData.harvestQuantity, 0, Infinity, 0),
                validateNumber(formData.pricePerKg, 0, Infinity, 0),
                sanitizeString(certificateIpfsHash, 100)
              );
              logger.debug('Harvest transaction recorded', { batchId: extractedBatchId });
            } catch (blockchainError) {
              logger.error('Blockchain harvest transaction failed', blockchainError);
              // Continue with database operations even if blockchain fails
              logger.debug('Continuing with database operations despite blockchain error');
            }
          } else {
            logger.debug('No signer available for blockchain transaction');
          }
        } else {
          // Try to decode events using contract interface
          try {
            const contract = new ethers.Contract(CONTRACT_ADDRESS, AgriTraceABI.abi, provider);
            const decodedEvents = (receipt.logs || []).map((log: { topics: string[]; data: string; address: string }) => {
              try {
                return contract.interface.parseLog(log);
              } catch (e) {
                return null;
              }
            }).filter((event): event is { name: string; args: { batchId: bigint } } => event !== null);
            
            logger.debug('Decoded events', { count: decodedEvents.length });
            
            const batchRegisteredEvent = decodedEvents.find(
              (event) => event?.name === 'BatchRegistered'
            );
            
            if (batchRegisteredEvent) {
              extractedBatchId = Number(batchRegisteredEvent.args.batchId);
              setBatchId(extractedBatchId);
              batchData.id = extractedBatchId;
              batchData.ipfsHash = certificateIpfsHash;
              logger.debug('Found batch ID using contract interface', { batchId: extractedBatchId });
            } else {
              // Try alternative event signatures
              const alternativeSignatures = [
                ethers.id('BatchRegistered(uint256,address,string,string,uint256)')
              ];
              
              let foundEvent: { topics: string[] } | null = null;
              for (const sig of alternativeSignatures) {
                foundEvent = receipt.logs.find((log: { topics: string[] }) => log.topics?.[0] === sig) || null;
                if (foundEvent) break;
              }
              
              if (foundEvent && foundEvent.topics?.[1]) {
                extractedBatchId = parseInt(foundEvent.topics[1], 16);
                setBatchId(extractedBatchId);
                batchData.id = extractedBatchId;
                batchData.ipfsHash = certificateIpfsHash;
                logger.debug('Found batch ID using alternative signature', { batchId: extractedBatchId });
              } else {
                // Final fallback: use timestamp as temporary ID
                extractedBatchId = Math.floor(Date.now() / 1000);
                setBatchId(extractedBatchId);
                logger.warn('Could not extract batch ID from any event, using timestamp as fallback', { batchId: extractedBatchId });
                
                // Update the batch data with the fallback ID
                batchData.id = extractedBatchId;
                batchData.ipfsHash = certificateIpfsHash;
              }
            }
          } catch (decodeError) {
            logger.error('Error decoding events', decodeError);
            // Final fallback: use timestamp as temporary ID
            extractedBatchId = Math.floor(Date.now() / 1000);
            setBatchId(extractedBatchId);
            logger.warn('Could not decode events, using timestamp as fallback', { batchId: extractedBatchId });
            
            // Update the batch data with the fallback ID
            batchData.id = extractedBatchId;
            batchData.ipfsHash = certificateIpfsHash;
          }
        }

        // Step 5: Save to Supabase for local reference
        let insertedBatch: Tables<'batches'> | null = null;
        let currentProfile: Tables<'profiles'> | null = profile || null;
        
        try {
          logger.debug('Looking up profile for user', { userId: user?.id });
          
          // Use profile from context if available, otherwise fetch
          if (!currentProfile && user?.id) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('id, full_name, user_type')
              .eq('user_id', user.id)
              .maybeSingle();

            if (profileError) {
              logger.error('Profile lookup error', { error: profileError.message, userId: user.id });
              throw new Error('Profile not found. Please ensure your profile is set up correctly.');
            }
            
            currentProfile = profileData;
          }
          
          // Check if profile exists
          if (!currentProfile || !currentProfile.id) {
            throw new Error('Profile not found. Please ensure your profile is set up correctly.');
          }
          
          logger.debug('Profile found', { profileId: currentProfile.id, userType: currentProfile.user_type });
          
          // Only insert fields that exist in the current database schema
          // Determine user type and set farmer_id and current_owner accordingly
          const userType = currentProfile.user_type || user?.user_metadata?.user_type || 'farmer';
            
          const batchInsertData: Partial<Tables<'batches'>> = {
            farmer_id: currentProfile.id,
            crop_type: sanitizeString(formData.cropType, 100),
            variety: sanitizeString(formData.variety, 100),
            harvest_quantity: validateNumber(formData.harvestQuantity, 0, Infinity, 0),
            sowing_date: sanitizeString(formData.sowingDate, 50),
            harvest_date: sanitizeString(formData.harvestDate, 50),
            price_per_kg: validateNumber(formData.pricePerKg, 0, Infinity, 0),
            grading: sanitizeString(formData.grading, 100) || 'Standard',
            freshness_duration: validateInteger(formData.freshnessDuration, 1, 365, 7),
            certification: sanitizeString(formData.certification, 100) || 'Standard',
            status: 'available',
            current_owner: currentProfile.id,
            group_id: sanitizeString(groupId, 100),
          };

          // Store analysis data as JSON if available
          if (analysisData) {
            try {
              (batchInsertData as { crop_analysis?: string }).crop_analysis = JSON.stringify(analysisData);
            } catch (e) {
              logger.warn('Failed to stringify analysis data', { error: e });
            }
          }

          if (soilData) {
            try {
              (batchInsertData as { soil_data?: string }).soil_data = JSON.stringify(soilData);
            } catch (e) {
              logger.warn('Failed to stringify soil data', { error: e });
            }
          }
          
          logger.debug('Inserting batch data', { batchId: extractedBatchId, groupId });
          
          const { data: batchResult, error: insertError } = await supabase
            .from('batches')
            .insert(batchInsertData)
            .select()
            .maybeSingle();

          if (insertError || !batchResult) {
            logger.error('Database insertion error', { error: insertError, batchData: batchInsertData });
            throw new Error(insertError ? `Database error: ${insertError.message}` : 'Failed to insert batch');
          }

          insertedBatch = batchResult;
          logger.debug('Batch inserted successfully', { batchId: insertedBatch.id, groupId });

          // Step 6: Add to marketplace table
          // Determine seller type based on user's role
          const sellerType = userType === 'distributor' ? 'distributor' : 'farmer';
          
          // Marketplace table structure (not in generated types, using type assertion)
          interface MarketplaceRow {
            batch_id: string;
            current_seller_id: string;
            current_seller_type: string;
            price: number;
            quantity: number;
            status: string;
            id?: string;
            created_at?: string;
          }
          
          const marketplaceData: MarketplaceRow = {
            batch_id: insertedBatch.id,
            current_seller_id: currentProfile.id,
            current_seller_type: sellerType,
            price: validateNumber(formData.harvestQuantity, 0, Infinity, 0) * validateNumber(formData.pricePerKg, 0, Infinity, 0),
            quantity: validateNumber(formData.harvestQuantity, 0, Infinity, 0),
            status: 'available'
          };

          logger.debug('Inserting marketplace data', {
            batchId: insertedBatch.id,
            profileId: currentProfile.id,
            userType,
            sellerType
          });

          const { data: marketplaceResult, error: marketplaceError } = await supabase
            .from('marketplace')
            .insert(marketplaceData)
            .select()
            .maybeSingle();

          if (marketplaceError) {
            logger.error('Marketplace insertion error', {
              error: marketplaceError.message,
              batchId: insertedBatch.id,
              profileId: currentProfile.id
            });
            // Don't throw error, just log it so batch creation still succeeds
            logger.warn('Marketplace insertion failed, but batch was created successfully');
          } else {
            logger.debug('Batch added to marketplace successfully', { marketplaceId: marketplaceResult?.id });
          }
        } catch (dbError) {
          logger.error('Failed to save to local database', dbError);
          // Don't fail the entire process if local DB save fails
        }

      // Group-based system: Certificate is already created and uploaded to group
      logger.debug('Batch registered with Group ID', { groupId, batchId: extractedBatchId });

      // Generate QR code for the batch registration
      // Use insertedBatch.id if available, otherwise use extractedBatchId
      const batchIdForQR = insertedBatch?.id || extractedBatchId || tempBatchId.toString();
      const farmerIdForQR = currentProfile?.id || '';
      
      if (batchIdForQR && farmerIdForQR) {
        try {
          const { generateFarmerRegistrationQR } = await import('@/features/qr-code/utils/qrCodeGenerator');
          const qrCodeDataURL = await generateFarmerRegistrationQR({
            batchId: batchIdForQR.toString(),
            cropType: sanitizeString(formData.cropType, 100),
            variety: sanitizeString(formData.variety, 100),
            harvestDate: sanitizeString(formData.harvestDate, 50),
            farmerId: sanitizeString(farmerIdForQR, 100),
            ipfsHash: sanitizeString(groupId, 100)
          });
          
          logger.debug('QR code generated for batch registration', { batchId: batchIdForQR });
          
          // Store QR code in localStorage for later access
          try {
            localStorage.setItem(`batch_qr_${sanitizeString(batchIdForQR.toString(), 100)}`, qrCodeDataURL);
          } catch (storageError) {
            logger.warn('Failed to store QR code in localStorage', { error: storageError });
          }
        } catch (qrError) {
          logger.error('QR code generation failed', qrError);
          // Continue even if QR code generation fails
        }
      } else {
        logger.warn('Skipping QR code generation: missing batchId or farmerId', {
          batchId: batchIdForQR ? 'present' : 'missing',
          farmerId: farmerIdForQR ? 'present' : 'missing'
        });
      }

      setStep('complete');
      toast({
        title: "Batch registered successfully!",
        description: `Your batch has been registered with Group ID: ${groupId}`,
      });

      // Reset form
      setFormData({
        cropType: '',
        variety: '',
        harvestQuantity: '',
        sowingDate: '',
        harvestDate: '',
        pricePerKg: '',
        certification: '',
        grading: 'Standard',
        labTest: '',
        freshnessDuration: '7'
      });
      } // Close if (receipt) block
    } catch (error) {
      logger.error('Registration error', error);
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? sanitizeError(error) : "Please try again later.",
      });
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Register New Batch</h1>
          <p className="text-muted-foreground">
            Register your agricultural produce on the blockchain for complete traceability
          </p>
        </div>

        {/* Wallet Connection Status */}
        {!isConnected && (
          <Alert className="mb-6">
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to register batches on the blockchain.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={connectWallet}
              >
                Connect Wallet
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isConnected && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <Wallet className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Wallet connected: {account?.substring(0, 6)}...{account?.substring(account.length - 4)}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Steps */}
        {loading && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <div>
                  <h3 className="font-semibold">
                    {step === 'analyzing' && 'Analyzing crop health and soil data...'}
                    {step === 'uploading' && 'Generating certificate and uploading to IPFS...'}
                    {step === 'blockchain' && 'Registering on blockchain...'}
                    {step === 'complete' && 'Registration complete!'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step === 'analyzing' && 'Detecting diseases, fetching soil data, and generating comprehensive analysis'}
                    {step === 'uploading' && 'Creating PDF certificate and uploading to decentralized storage'}
                    {step === 'blockchain' && 'Submitting transaction to blockchain network'}
                    {step === 'complete' && 'Your batch has been successfully registered'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {step === 'complete' && batchId && ipfsHash && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800">Batch Registration Successful!</h3>
                  <p className="text-sm text-green-700">
                    Your batch has been registered on the blockchain and stored on IPFS for complete traceability.
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><strong>Batch ID:</strong> {batchId}</p>
                    <p><strong>Group ID:</strong> {ipfsHash}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/verify?batchId=${batchId}`)}
                  >
                    Verify Certificate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setStep('form')}
                  >
                    Register Another
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="govt-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Batch Information
            </CardTitle>
            <CardDescription>
              Fill in the details about your agricultural produce batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cropType">Crop Type *</Label>
                  <Select 
                    value={formData.cropType} 
                    onValueChange={(value) => setFormData({...formData, cropType: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select crop type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rice">Rice</SelectItem>
                      <SelectItem value="Wheat">Wheat</SelectItem>
                      <SelectItem value="Maize">Maize</SelectItem>
                      <SelectItem value="Turmeric">Turmeric</SelectItem>
                      <SelectItem value="Black Gram">Black Gram</SelectItem>
                      <SelectItem value="Green Chili">Green Chili</SelectItem>
                      <SelectItem value="Coconut">Coconut</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="variety">Variety *</Label>
                  <Input 
                    id="variety"
                    placeholder="e.g., Basmati, Pusa Basmati 1121"
                    value={formData.variety}
                    onChange={(e) => setFormData({...formData, variety: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="harvestQuantity">Harvest Quantity (kg) *</Label>
                  <Input 
                    id="harvestQuantity"
                    type="number"
                    min="1"
                    max="100000"
                    placeholder="e.g., 500"
                    value={formData.harvestQuantity}
                    onChange={(e) => setFormData({...formData, harvestQuantity: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pricePerKg">Price per Kg (₹) *</Label>
                  <Input
                    id="pricePerKg"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="10000"
                    placeholder="e.g., 25"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData({...formData, pricePerKg: e.target.value})}
                    required
                  />
                  <p className="text-xs text-gray-600">
                    💡 Current market prices will be shown below to help you set a competitive price
                  </p>
                </div>
              </div>

              {/* State and District Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => setFormData({...formData, state: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Odisha">Odisha</SelectItem>
                      <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                      <SelectItem value="Karnataka">Karnataka</SelectItem>
                      <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                      <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                      <SelectItem value="West Bengal">West Bengal</SelectItem>
                      <SelectItem value="Gujarat">Gujarat</SelectItem>
                      <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                      <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
                      <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                      <SelectItem value="Punjab">Punjab</SelectItem>
                      <SelectItem value="Haryana">Haryana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                  <Input 
                    id="district"
                    placeholder="e.g., Pune, Bhubaneswar, Cuttack"
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    required
                  />
                  <p className="text-xs text-gray-600">
                    Enter your district name to fetch local mandi prices
                  </p>
                </div>
              </div>

              {/* Market Price Display */}
              {formData.cropType && formData.state && formData.district && (
                <div className="mt-6">
                  <MarketPriceDisplay
                    cropType={formData.cropType}
                    variety={formData.variety}
                    state={formData.state}
                    district={formData.district}
                    onPriceSelect={handlePriceSelect}
                    className="w-full"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sowingDate">Sowing Date *</Label>
                  <Input 
                    id="sowingDate"
                    type="date"
                    value={formData.sowingDate}
                    onChange={(e) => setFormData({...formData, sowingDate: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="harvestDate">Harvest Date *</Label>
                  <Input 
                    id="harvestDate"
                    type="date"
                    value={formData.harvestDate}
                    onChange={(e) => setFormData({...formData, harvestDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grading">Grading</Label>
                  <Select 
                    value={formData.grading} 
                    onValueChange={(value) => setFormData({...formData, grading: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grading" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Premium">Premium</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Basic">Basic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="certification">Certification</Label>
                  <Select 
                    value={formData.certification} 
                    onValueChange={(value) => setFormData({...formData, certification: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select certification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Organic">Organic</SelectItem>
                      <SelectItem value="Fair Trade">Fair Trade</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="labTest">Lab Test Results</Label>
                  <Input 
                    id="labTest"
                    placeholder="e.g., Pesticide-free, Quality Grade A"
                    value={formData.labTest}
                    onChange={(e) => setFormData({...formData, labTest: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="freshnessDuration">Freshness Duration (days)</Label>
                  <Input 
                    id="freshnessDuration"
                    type="number"
                    placeholder="e.g., 7"
                    value={formData.freshnessDuration}
                    onChange={(e) => setFormData({...formData, freshnessDuration: e.target.value})}
                    required
                  />
                </div>
              </div>


              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      cropType: '',
                      variety: '',
                      harvestQuantity: '',
                      sowingDate: '',
                      harvestDate: '',
                      pricePerKg: '',
                      certification: '',
                      grading: 'Standard',
                      labTest: '',
                      freshnessDuration: '7'
                    });
                    setStep('form');
                  }}
                >
                  Reset Form
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !isConnected} 
                  className="gradient-primary"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!isConnected ? 'Connect Wallet First' : 
                   loading ? 'Registering...' : 'Register Batch on Blockchain'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card className="govt-card">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-primary mx-auto mb-4">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Blockchain Registry</h3>
              <p className="text-sm text-muted-foreground">
                Your batch will be recorded on an immutable blockchain ledger
              </p>
            </CardContent>
          </Card>

          <Card className="govt-card">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg gradient-secondary mx-auto mb-4">
                <FileText className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">PDF Certificate</h3>
              <p className="text-sm text-muted-foreground">
                Automatic generation of official certificates
              </p>
            </CardContent>
          </Card>

          <Card className="govt-card">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 mx-auto mb-4">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">IPFS Storage</h3>
              <p className="text-sm text-muted-foreground">
                Decentralized storage for certificates and metadata
              </p>
            </CardContent>
          </Card>

          <Card className="govt-card">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-r from-accent to-accent-light mx-auto mb-4">
                <DollarSign className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Fair Pricing</h3>
              <p className="text-sm text-muted-foreground">
                Get fair market prices with transparent pricing
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};