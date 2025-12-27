import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeDisplay } from './QRCodeDisplay';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  cropType: string;
  variety: string;
  harvestDate: string;
  farmerId: string;
  blockchainHash?: string;
  ipfsHash?: string;
  groupId?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  batchId,
  cropType,
  variety,
  harvestDate,
  farmerId,
  blockchainHash,
  ipfsHash,
  groupId
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QR Codes for {cropType} - {variety}</DialogTitle>
          <DialogDescription>
            Scan these QR codes to verify batch information or view certificates
          </DialogDescription>
        </DialogHeader>
        
        <QRCodeDisplay
          batchId={batchId}
          cropType={cropType}
          variety={variety}
          harvestDate={harvestDate}
          farmerId={farmerId}
          blockchainHash={blockchainHash}
          ipfsHash={ipfsHash}
          groupId={groupId}
        />
      </DialogContent>
    </Dialog>
  );
};
