import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Camera } from 'lucide-react';

const PhotosTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Progress Photos</h3>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Photo
        </Button>
      </div>

      <Card>
        <CardContent className="text-center py-16">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            Progress photos help you visually track your transformation
          </p>
          <p className="text-sm text-gray-400">
            Photo upload functionality coming soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotosTab;