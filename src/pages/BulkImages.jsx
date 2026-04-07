import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTitle } from '../context/TitleContext';
import { Upload, Image as ImageIcon, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { showEmsg } from '../utils/ShowEmsg';
import { STATUS } from '../contants/constants';
import Loader from '../components/Loader';
import { apiPost } from '../utils/ApiUtils';
import { CREATE_BULK_UPLOAD_IMAGES } from '../contants/apiRoutes';
import { ToastContainer, toast } from "react-toastify";
const BATCH_SIZE = 10;

const BulkImages = () => {
  const { t } = useTranslation();
  const { setTitle } = useTitle();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [batches, setBatches] = useState([]);
  const [totalBatches, setTotalBatches] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [batchUploadStatus, setBatchUploadStatus] = useState({});
  const [showGallery, setShowGallery] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setTitle(t('BULK_IMAGES.TITLE'));
  }, [setTitle, t]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    
    // Create batches of 5 images each
    const fileBatches = [];
    for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
      fileBatches.push(selectedFiles.slice(i, i + BATCH_SIZE));
    }
    setBatches(fileBatches);
    setTotalBatches(fileBatches.length);
    setCurrentBatch(0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
    
    // Create batches of 5 images each
    const fileBatches = [];
    for (let i = 0; i < droppedFiles.length; i += BATCH_SIZE) {
      fileBatches.push(droppedFiles.slice(i, i + BATCH_SIZE));
    }
    setBatches(fileBatches);
    setTotalBatches(fileBatches.length);
    setCurrentBatch(0);
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    
    // Recreate batches
    const fileBatches = [];
    for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
      fileBatches.push(newFiles.slice(i, i + BATCH_SIZE));
    }
    setBatches(fileBatches);
    setTotalBatches(fileBatches.length);
  };

  const uploadBatch = async (batchFiles, batchIndex) => {
    try {
      const token = localStorage.getItem("token");
      
      // Create FormData for batch upload
      const formData = new FormData();
      batchFiles.forEach(file => {
        formData.append('productImages', file);
      });
      
      const response = await apiPost(CREATE_BULK_UPLOAD_IMAGES, formData, token, true);
      
      // Handle response - only show backend messages for errors, not for individual batches
      if (response.data) {
        // Only show backend message for errors, not success
        // Success messages will be shown only after all batches complete
        // Return uploaded images with metadata
        const uploadedBatch = batchFiles.map((file, index) => ({
          id: response.data.uploadedImages?.[index]?.id || Date.now() + batchIndex * BATCH_SIZE + index,
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + ' ' + t('BULK_IMAGES.SIZE_UNIT'),
          url: response.data.uploadedImages?.[index]?.url || URL.createObjectURL(file),
          uploadTime: new Date().toLocaleString(),
          batch: batchIndex + 1
        }));
        
        return uploadedBatch;
      }
    } catch (error) {
      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      showEmsg(t('BULK_IMAGES.PLEASE_SELECT_FILES'), STATUS.WARNING);
      return;
    }

    setUploading(true);
    
    try {
      // Process in batches of 5 images each using real API
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Upload batch using real API
        const uploadedBatch = await uploadBatch(batch, i);
        
        // Add uploaded images to state
        setUploadedImages(prev => [...prev, ...uploadedBatch]);
      }
      
      // Clear selected files after successful upload
      setFiles([]);
      setBatches([]);
      setTotalBatches(0);
      
      // Show success message when all batches are completed
      showEmsg(t('BULK_IMAGES.UPLOAD_SUCCESS'), STATUS.SUCCESS);
    } catch {
      // ApiUtils interceptor already shows the error toast — no duplicate needed
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setBatches([]);
    setUploadedImages([]);
    setBatchUploadStatus({});
    setCurrentBatch(0);
    setTotalBatches(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 h-screen bg-gray-50 flex flex-col">
      <ToastContainer/>
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Loader height={48} width={48} color="#FF5A5F" />
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm p-6 flex-1">
        <h1 className="text-lg font-bold text-gray-900 mb-4">
          {t('BULK_IMAGES.TITLE')}
        </h1>

        {/* Upload Area */}
        <div className="mb-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              {t('BULK_IMAGES.DRAG_DROP')}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {t('BULK_IMAGES.OR')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-2.5 bg-custom-bg text-white rounded-xl font-bold text-xs tracking-wide hover:bg-custom-bg-dark transition-all active:scale-95"
            >
              {t('BULK_IMAGES.SELECT_FILES_BTN')}
            </button>
          </div>
        </div>

        
        {/* Selected Files Preview */}
        {files.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-4">
              {t('BULK_IMAGES.SELECTED_FILES')} ({files.length})
            </h3>
            
            {/* Calculate max images for 3 rows based on screen size */}
            {(() => {
              const maxImagesPerRow = window.innerWidth >= 1024 ? 8 : window.innerWidth >= 768 ? 6 : 4;
              const maxImagesFor3Rows = maxImagesPerRow * 3;
              const showGallery = files.length > maxImagesFor3Rows;
              const displayFiles = showGallery ? files.slice(0, maxImagesFor3Rows - 1) : files;
              const remainingCount = files.length - displayFiles.length;

              return (
                <>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-6">
                    {displayFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                      </div>
                    ))}
                    
                    {/* Gallery Card for remaining images */}
                    {showGallery && (
                      <div className="relative group cursor-pointer" onClick={() => {
                        setGalleryStartIndex(displayFiles.length);
                        setShowGallery(true);
                      }}>
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">+{remainingCount}</div>
                            <div className="text-xs text-gray-500">{t('BULK_IMAGES.MORE')}</div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">{t('BULK_IMAGES.GALLERY')}</p>
                        <p className="text-xs text-gray-400">
                          {remainingCount} {t('BULK_IMAGES.IMAGES')}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="flex-1 sm:flex-none px-8 py-2.5 bg-custom-bg text-white rounded-xl font-bold text-xs tracking-wide hover:bg-custom-bg-dark transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>{uploading ? t('BULK_IMAGES.UPLOADING') : t('BULK_IMAGES.UPLOAD')}</span>
          </button>
          
          {(files.length > 0 || uploadedImages.length > 0) && (
            <button
              onClick={clearAll}
              className="flex-1 sm:flex-none px-8 py-2.5 border-2 border-custom-bg/20 text-custom-bg rounded-xl font-bold text-xs tracking-wide hover:bg-custom-bg/5 hover:border-custom-bg transition-all active:scale-95"
            >
              {t('BULK_IMAGES.CLEAR')}
            </button>
          )}
        </div>

        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-4">
              {t('BULK_IMAGES.UPLOADED_IMAGES')} ({uploadedImages.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {uploadedImages.map((image) => (
                <div key={image.id} className="border rounded-lg overflow-hidden">
                  <div className="relative">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {t('BULK_IMAGES.BATCH')} {image.batch}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{image.name}</p>
                    <p className="text-xs text-gray-500">{image.size}</p>
                    <p className="text-xs text-gray-400">{image.uploadTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Image Gallery ({files.length})</h3>
              <button
                onClick={() => setShowGallery(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      {index >= galleryStartIndex && (
                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          {index - galleryStartIndex + 1}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImages;
