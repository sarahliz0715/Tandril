import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/api/entities';
import { BulkUpload } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Loader2, 
  Upload, 
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Info,
  Download,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import BulkUploadInterface from '../components/bulk/BulkUploadInterface';
import { handleAuthError } from '../components/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '../components/hooks/useConfirmDialog';

export default function BulkUploadPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentUploads, setRecentUploads] = useState([]);
  const navigate = useNavigate();
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return currentUser && currentUser.user_mode === 'beta';
  }, [currentUser]);

  // Load user and recent uploads
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, uploadsData] = await Promise.all([
        User.me(),
        BulkUpload.list('-created_date', 5).catch(err => {
          console.error('Error fetching uploads:', err);
          return [];
        })
      ]);

      setCurrentUser(user);
      
      // Filter valid uploads
      const validUploads = uploadsData.filter(upload => 
        upload && typeof upload === 'object' && upload.id
      );
      
      setRecentUploads(validUploads);
    } catch (error) {
      console.error('Failed to load bulk upload data:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }
      
      toast.error("Failed to load page data", {
        description: "Please try refreshing the page."
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle upload success
  const handleUploadSuccess = useCallback((uploadData) => {
    toast.success("File uploaded successfully", {
      description: "Processing your data..."
    });
    loadData(); // Refresh the list
  }, [loadData]);

  // Download sample CSV template
  const handleDownloadTemplate = useCallback(() => {
    const csvContent = [
      ['SKU', 'Product Name', 'Description', 'Category', 'Base Price', 'Total Stock', 'Reorder Point', 'Image URL'].join(','),
      ['SAMPLE-001', 'Sample Product 1', 'Sample description', 'Category A', '29.99', '100', '20', 'https://example.com/image1.jpg'].join(','),
      ['SAMPLE-002', 'Sample Product 2', 'Sample description', 'Category B', '49.99', '50', '10', 'https://example.com/image2.jpg'].join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Template downloaded");
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bulk Upload</h1>
          <p className="text-slate-600 mt-1">Upload CSV files to quickly add or update products</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('Inventory'))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inventory
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          Upload a CSV file with your product data. Our AI will analyze the file, map the columns, and help you import the data into your inventory.
        </AlertDescription>
      </Alert>

      {/* Download Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Need a Template?
          </CardTitle>
          <CardDescription>
            Download our CSV template to see the correct format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload Interface */}
      <BulkUploadInterface onUploadSuccess={handleUploadSuccess} />

      {/* Recent Uploads */}
      {recentUploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
            <CardDescription>Your recent bulk upload history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUploads.map(upload => (
                <div key={upload.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {upload.processing_status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : upload.processing_status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{upload.file_name}</p>
                      <p className="text-sm text-slate-500">
                        {upload.processing_results?.total_records || 0} records • {' '}
                        {new Date(upload.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500 capitalize">
                    {upload.processing_status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
    </div>
  );
}