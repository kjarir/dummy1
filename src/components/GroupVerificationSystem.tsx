import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { singleStepGroupManager } from '@/utils/singleStepGroupManager';
import { 
  Search, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Package,
  Users,
  Clock,
  MapPin,
  DollarSign,
  ExternalLink
} from 'lucide-react';

export const GroupVerificationSystem: React.FC = () => {
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!groupId.trim()) {
      toast({
        variant: "destructive",
        title: "Group ID Required",
        description: "Please enter a Group ID to search.",
      });
      return;
    }

    setLoading(true);
    setCertificates([]);
    setGroupInfo(null);

    try {
      // Get group information
      const info = await singleStepGroupManager.getGroupInfo(groupId);
      setGroupInfo(info);

      // Get all certificates in the group
      const certs = await singleStepGroupManager.getGroupCertificates(groupId);
      
      // Sort certificates by timestamp
      const sortedCerts = certs.sort((a, b) => {
        const timestampA = a.metadata?.keyvalues?.timestamp || a.date_pinned;
        const timestampB = b.metadata?.keyvalues?.timestamp || b.date_pinned;
        return new Date(timestampA).getTime() - new Date(timestampB).getTime();
      });
      
      setCertificates(sortedCerts);
      
      toast({
        title: "Group Found",
        description: `Found ${sortedCerts.length} certificates in group ${groupId}.`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCertificate = (ipfsHash: string, fileName: string) => {
    const url = singleStepGroupManager.getCertificateUrl(ipfsHash);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'HARVEST':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'PURCHASE':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'TRANSFER':
        return <Users className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case 'HARVEST':
        return 'bg-green-100 text-green-800';
      case 'PURCHASE':
        return 'bg-blue-100 text-blue-800';
      case 'TRANSFER':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Group-Based Verification</h1>
        <p className="text-gray-600">
          Verify agricultural produce by entering the Group ID from any certificate
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search by Group ID
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="groupId">Group ID</Label>
            <Input
              id="groupId"
              placeholder="Enter Group ID from certificate (e.g., group-12345-abc)"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button 
            onClick={handleSearch}
            disabled={loading || !groupId.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search Certificates
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Group Information */}
      {groupInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Group Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Group Name</Label>
                <p className="font-medium">{groupInfo.name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Description</Label>
                <p className="font-medium">{groupInfo.description || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Total Certificates</Label>
                <p className="font-medium">{certificates.length}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Created</Label>
                <p className="font-medium">{formatTimestamp(groupInfo.created_at || groupInfo.date_created)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificates List */}
      {certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Complete Certificate History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certificates.map((cert, index) => (
                <div key={cert.ipfs_pin_hash} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(cert.metadata?.keyvalues?.transactionType)}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={getTransactionBadgeColor(cert.metadata?.keyvalues?.transactionType)}>
                            {cert.metadata?.keyvalues?.transactionType || 'UNKNOWN'}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Certificate #{index + 1}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatTimestamp(cert.metadata?.keyvalues?.timestamp || cert.date_pinned)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {cert.metadata?.keyvalues?.quantity || 'N/A'} kg
                      </div>
                      <div className="text-sm text-gray-500">
                        ₹{cert.metadata?.keyvalues?.price || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">From:</div>
                      <div className="text-gray-600">{cert.metadata?.keyvalues?.from || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">To:</div>
                      <div className="text-gray-600">{cert.metadata?.keyvalues?.to || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      IPFS Hash: {cert.ipfs_pin_hash.substring(0, 20)}...
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadCertificate(cert.ipfs_pin_hash, cert.metadata?.name || 'certificate.pdf')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(singleStepGroupManager.getCertificateUrl(cert.ipfs_pin_hash), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Online
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!loading && !certificates.length && groupId && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center text-gray-500">
              <AlertCircle className="h-6 w-6 mr-2" />
              <span>No certificates found for the provided Group ID.</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
