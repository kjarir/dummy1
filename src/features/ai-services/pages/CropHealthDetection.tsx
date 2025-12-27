import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Camera,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Leaf,
  Shield,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { analyzeCropHealth, type CropHealthAnalysis } from '@/features/ai-services/services/cropHealthService';

export const CropHealthDetection = () => {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CropHealthAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid File",
          description: "Please upload an image file (PNG, JPG, JPEG)",
        });
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please upload an image smaller than 10MB",
        });
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setAnalysisResult(null);
      setAnalysisError(null);
    }
  };

  const handleAnalyzeCrop = async () => {
    if (!selectedImage) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const response = await analyzeCropHealth(selectedImage);
      
      if (response.success && response.analysis) {
        setAnalysisResult(response.analysis);
        toast({
          title: "Analysis Complete",
          description: `Detected: ${response.analysis.diseaseName || 'Crop health analyzed'}`,
        });
      } else {
        setAnalysisError(response.error || 'Failed to analyze crop image');
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: response.error || 'Please try again',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAnalysisError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityAlertClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-green-500 bg-green-50';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Leaf className="h-8 w-8 text-green-600" />
            Crop Health Detection
          </h1>
          <p className="text-gray-600">
            Upload a photo of your crop to detect diseases and get AI-powered remedies and recommendations
          </p>
        </div>

        {/* Image Upload Section */}
        <Card className="govt-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Upload Crop Image
            </CardTitle>
            <CardDescription>
              Take or upload a clear photo of your crop leaves showing any signs of disease or damage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.add('border-primary', 'bg-primary/5');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  const file = files[0];
                  if (file.type.startsWith('image/')) {
                    if (file.size <= 10 * 1024 * 1024) {
                      setSelectedImage(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                      setAnalysisResult(null);
                      setAnalysisError(null);
                    } else {
                      toast({
                        variant: "destructive",
                        title: "File Too Large",
                        description: "Please upload an image smaller than 10MB",
                      });
                    }
                  } else {
                    toast({
                      variant: "destructive",
                      title: "Invalid File",
                      description: "Please upload an image file (PNG, JPG, JPEG)",
                    });
                  }
                }
              }}
            >
              {!imagePreview ? (
                <div className="space-y-4">
                  <Camera className="h-16 w-16 mx-auto text-gray-400" />
                  <div>
                    <div className="text-primary hover:underline font-semibold text-lg mb-1">
                      Click to upload
                    </div>
                    <div className="text-gray-600 text-sm mb-2">
                      or drag and drop
                    </div>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, JPEG up to 10MB
                    </p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    id="crop-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Crop preview"
                      className="max-h-96 rounded-lg mx-auto shadow-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                        setAnalysisResult(null);
                        setAnalysisError(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={handleAnalyzeCrop}
                      disabled={analyzing || !selectedImage}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white px-8"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Analyze Crop Health
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysisError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Failed</AlertTitle>
            <AlertDescription>{analysisError}</AlertDescription>
          </Alert>
        )}

        {analysisResult && (
          <div className="space-y-6">
            {/* Main Analysis Result */}
            <Alert className={getSeverityAlertClass(analysisResult.severity)}>
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-xl font-bold">
                {analysisResult.diseaseName || 'Analysis Complete'}
              </AlertTitle>
              <AlertDescription className="mt-3 space-y-2">
                <p className="text-base">{analysisResult.description}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Confidence:</span>
                    <span className="text-lg">{Math.round(analysisResult.confidence * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Severity:</span>
                    <span className="text-lg uppercase">{analysisResult.severity}</span>
                  </div>
                  {analysisResult.affectedArea && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Affected Area:</span>
                      <span>{analysisResult.affectedArea}</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Remedies */}
            {analysisResult.remedies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Recommended Remedies
                  </CardTitle>
                  <CardDescription>
                    Follow these steps to treat the detected issue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-3">
                    {analysisResult.remedies.map((remedy, index) => (
                      <li key={index} className="text-base text-gray-700 leading-relaxed">
                        {remedy}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Prevention Tips */}
            {analysisResult.prevention.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Prevention Tips
                  </CardTitle>
                  <CardDescription>
                    Prevent future occurrences with these practices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-3">
                    {analysisResult.prevention.map((tip, index) => (
                      <li key={index} className="text-base text-gray-700 leading-relaxed">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Additional Recommendations */}
            {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-600" />
                    Additional Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-3">
                    {analysisResult.recommendations.map((rec, index) => (
                      <li key={index} className="text-base text-gray-700 leading-relaxed">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-2">Tips for Best Results:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Take photos in good lighting conditions</li>
                  <li>Focus on affected leaves or areas</li>
                  <li>Ensure the image is clear and not blurry</li>
                  <li>Include multiple angles if possible</li>
                  <li>Upload images showing the entire affected area</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

