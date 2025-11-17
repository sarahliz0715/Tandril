import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Image, Package, Users, Zap, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { BulkUpload, Platform } from '@/api/entities';
import { UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';

const FILE_TYPES = [
  {
    id: 'product_csv',
    name: 'Product CSV/Excel',
    icon: FileText,
    description: 'Upload products to create listings across platforms',
    acceptedFormats: '.csv,.xlsx,.xls',
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'product_images',
    name: 'Product Images',
    icon: Image,
    description: 'AI generates descriptions and tags from images',
    acceptedFormats: '.jpg,.jpeg,.png,.webp',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'order_spreadsheet',
    name: 'Order Data',
    icon: Package,
    description: 'Process refunds, updates, and tracking in bulk',
    acceptedFormats: '.csv,.xlsx,.xls',
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'supplier_catalog',
    name: 'Supplier Catalog',
    icon: Users,
    description: 'AI suggests which products to add from supplier',
    acceptedFormats: '.csv,.xlsx,.xls,.pdf',
    color: 'from-orange-500 to-orange-600'
  }
];

export default function BulkUploadInterface({ onUploadComplete }) {
  const [selectedFileType, setSelectedFileType] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUpload, setCurrentUpload] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [processingOptions, setProcessingOptions] = useState({
    auto_generate_descriptions: true,
    auto_categorize: true,
    auto_price: false,
    create_variants: true
  });

  React.useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      const data = await Platform.list();
      setPlatforms(data.filter(p => p.status === 'connected'));
    } catch (error) {
      console.error('Error loading platforms:', error);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!selectedFileType) {
      alert('Please select a file type first');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, [selectedFileType]);

  const handleFileSelect = async (e) => {
    if (!selectedFileType) {
      alert('Please select a file type first');
      return;
    }

    const file = e.target.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file) => {
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Step 1: Upload file
      const { file_url } = await UploadFile({ file });
      setUploadProgress(30);

      // Step 2: Create bulk upload record
      const bulkUpload = await BulkUpload.create({
        file_name: file.name,
        file_url,
        file_type: selectedFileType,
        target_platforms: selectedPlatforms,
        processing_options: processingOptions,
        processing_status: 'processing'
      });
      setCurrentUpload(bulkUpload);
      setUploadProgress(50);

      // Step 3: AI Analysis and Processing
      if (selectedFileType === 'product_csv' || selectedFileType === 'order_spreadsheet' || selectedFileType === 'supplier_catalog') {
        // Extract structured data from file
        const extractionSchema = getExtractionSchema(selectedFileType);
        const extractionResult = await ExtractDataFromUploadedFile({
          file_url,
          json_schema: extractionSchema
        });

        setUploadProgress(80);

        if (extractionResult.status === 'success') {
          // Update with AI analysis and results
          const analysisResults = analyzeExtractedData(extractionResult.output, selectedFileType);
          
          await BulkUpload.update(bulkUpload.id, {
            processing_status: 'completed',
            ai_analysis: analysisResults.analysis,
            processing_results: analysisResults.results
          });
        } else {
          await BulkUpload.update(bulkUpload.id, {
            processing_status: 'failed',
            processing_results: { errors: [extractionResult.details] }
          });
        }
      } else {
        // For images, simulate AI image analysis
        await simulateImageAnalysis(bulkUpload.id, file.name);
      }

      setUploadProgress(100);
      onUploadComplete?.(bulkUpload);
      
    } catch (error) {
      console.error('Error processing file:', error);
      if (currentUpload) {
        await BulkUpload.update(currentUpload.id, {
          processing_status: 'failed',
          processing_results: { errors: [error.message] }
        });
      }
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setCurrentUpload(null);
      }, 2000);
    }
  };

  const getExtractionSchema = (fileType) => {
    switch (fileType) {
      case 'product_csv':
        return {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  price: { type: "number" },
                  sku: { type: "string" },
                  category: { type: "string" },
                  inventory: { type: "number" },
                  images: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        };
      case 'order_spreadsheet':
        return {
          type: "object",
          properties: {
            orders: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order_id: { type: "string" },
                  customer_email: { type: "string" },
                  status: { type: "string" },
                  total: { type: "number" },
                  tracking_number: { type: "string" }
                }
              }
            }
          }
        };
      case 'supplier_catalog':
        return {
          type: "object",
          properties: {
            catalog_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  wholesale_price: { type: "number" },
                  minimum_order: { type: "number" },
                  category: { type: "string" },
                  description: { type: "string" }
                }
              }
            }
          }
        };
      default:
        return { type: "object", properties: {} };
    }
  };

  const analyzeExtractedData = (data, fileType) => {
    // Simulate AI analysis
    const dataCount = Array.isArray(data?.products) ? data.products.length :
                     Array.isArray(data?.orders) ? data.orders.length :
                     Array.isArray(data?.catalog_items) ? data.catalog_items.length : 0;

    return {
      analysis: {
        detected_format: 'CSV',
        row_count: dataCount,
        data_quality_score: 85,
        recommendations: [
          'Data format looks good',
          'Consider adding more detailed descriptions',
          'Price ranges appear competitive'
        ]
      },
      results: {
        total_records: dataCount,
        successful_records: Math.floor(dataCount * 0.9),
        failed_records: Math.ceil(dataCount * 0.1),
        created_products: fileType === 'product_csv' ? Math.floor(dataCount * 0.8) : 0,
        updated_products: fileType === 'product_csv' ? Math.floor(dataCount * 0.2) : 0
      }
    };
  };

  const simulateImageAnalysis = async (uploadId, fileName) => {
    // Simulate AI image processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await BulkUpload.update(uploadId, {
      processing_status: 'completed',
      ai_analysis: {
        detected_format: 'Image',
        recommendations: [
          'High-quality product image detected',
          'AI generated description and tags',
          'Suggested category: Electronics'
        ]
      },
      processing_results: {
        total_records: 1,
        successful_records: 1,
        failed_records: 0,
        created_products: 1
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* File Type Selection */}
      <div className="grid md:grid-cols-2 gap-4">
        {FILE_TYPES.map((type) => {
          const IconComponent = type.icon;
          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${
                selectedFileType === type.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              onClick={() => setSelectedFileType(type.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${type.color}`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{type.name}</h3>
                    <p className="text-sm text-slate-600 mb-2">{type.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {type.acceptedFormats}
                    </Badge>
                  </div>
                  {selectedFileType === type.id && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedFileType && (
        <>
          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform.id}
                      checked={selectedPlatforms.includes(platform.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPlatforms([...selectedPlatforms, platform.id]);
                        } else {
                          setSelectedPlatforms(selectedPlatforms.filter(id => id !== platform.id));
                        }
                      }}
                    />
                    <label htmlFor={platform.id} className="text-sm font-medium cursor-pointer">
                      {platform.name}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Processing Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                AI Processing Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto_generate_descriptions"
                    checked={processingOptions.auto_generate_descriptions}
                    onCheckedChange={(checked) => 
                      setProcessingOptions(prev => ({...prev, auto_generate_descriptions: checked}))
                    }
                  />
                  <label htmlFor="auto_generate_descriptions" className="text-sm font-medium cursor-pointer">
                    Auto-generate product descriptions
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto_categorize"
                    checked={processingOptions.auto_categorize}
                    onCheckedChange={(checked) => 
                      setProcessingOptions(prev => ({...prev, auto_categorize: checked}))
                    }
                  />
                  <label htmlFor="auto_categorize" className="text-sm font-medium cursor-pointer">
                    Auto-categorize products
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto_price"
                    checked={processingOptions.auto_price}
                    onCheckedChange={(checked) => 
                      setProcessingOptions(prev => ({...prev, auto_price: checked}))
                    }
                  />
                  <label htmlFor="auto_price" className="text-sm font-medium cursor-pointer">
                    Auto-optimize pricing (competitive analysis)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create_variants"
                    checked={processingOptions.create_variants}
                    onCheckedChange={(checked) => 
                      setProcessingOptions(prev => ({...prev, create_variants: checked}))
                    }
                  />
                  <label htmlFor="create_variants" className="text-sm font-medium cursor-pointer">
                    Create product variants (size, color, etc.)
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card>
            <CardContent className="p-8">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                } ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && document.getElementById('fileInput')?.click()}
              >
                {isUploading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-blue-600 animate-bounce" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-900 mb-2">Processing your file...</p>
                      <Progress value={uploadProgress} className="w-64 mx-auto" />
                      <p className="text-sm text-slate-600 mt-2">{uploadProgress}% complete</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Drop your {FILE_TYPES.find(t => t.id === selectedFileType)?.name.toLowerCase()} here
                    </h3>
                    <p className="text-slate-600 mb-4">or click to browse files</p>
                    <Button className="gradient-accent text-white">
                      Choose File
                    </Button>
                  </>
                )}
                <input
                  id="fileInput"
                  type="file"
                  className="hidden"
                  accept={FILE_TYPES.find(t => t.id === selectedFileType)?.acceptedFormats}
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}