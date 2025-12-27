import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { QrCode, Camera, Loader2, CheckCircle, X } from 'lucide-react';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose?: () => void;
  className?: string;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScan,
  onClose,
  className = ""
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isScanning) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isScanning]);

  const startScanning = async () => {
    try {
      setError(null);
      
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Use back camera on mobile
        } 
      });
      
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start scanning loop
        scanLoop();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access denied or not available');
      setHasPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Unable to access camera for QR code scanning",
      });
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const scanLoop = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR code detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simple QR code detection (in a real app, you'd use a proper QR code library)
    // For now, we'll simulate detection
    setTimeout(() => {
      if (isScanning) {
        scanLoop();
      }
    }, 100);
  };

  const handleScan = (data: string) => {
    setIsScanning(false);
    onScan(data);
    toast({
      title: "QR Code Scanned",
      description: "Successfully scanned QR code",
    });
  };

  const handleStartScan = () => {
    setIsScanning(true);
  };

  const handleStopScan = () => {
    setIsScanning(false);
  };

  if (hasPermission === false) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <X className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-red-600">Camera access denied</p>
          <p className="text-sm text-gray-600">
            Please allow camera access to scan QR codes
          </p>
          <Button onClick={handleStartScan} variant="outline">
            <Camera className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isScanning ? (
          <div className="text-center space-y-4">
            <Camera className="h-12 w-12 text-gray-400 mx-auto" />
            <p className="text-gray-600">Click to start scanning QR codes</p>
            <Button onClick={handleStartScan} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none">
                <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-green-500"></div>
                <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-green-500"></div>
                <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-green-500"></div>
                <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-green-500"></div>
              </div>
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                Scanning...
              </div>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="flex gap-2">
              <Button onClick={handleStopScan} variant="outline" className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Stop
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="outline" className="flex-1">
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-center text-red-600 text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};