import React, { useState, useEffect, useCallback, useRef } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle, X, Calendar, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTitle } from "../context/TitleContext";
import Toolbar from "../components/Toolbar";
import { showEmsg } from "../utils/ShowEmsg";
import Loader from "../components/Loader";
import { ITEMS_PER_PAGE, STATUS, FILE_CONSTANTS } from "../contants/constants";
import { useDispatch } from "react-redux";
import { exportProductTemplate } from "../store/slices/exportSlice";
import { apiGet, apiPost } from "../utils/ApiUtils";
import { ToastContainer } from "react-toastify";
import Pagination from "../components/Pagination";
import { GET_PRODUCT_IMPORT, CREATE_BULK_PRODUCT, GENERATE_PRODUCT_IMPORT_FAILURE_REPORT } from "../contants/apiRoutes";

const BulkImport = () => {
  const { t } = useTranslation();
  const { setTitle } = useTitle();
  const dispatch = useDispatch();
  
  // Local state for product import list
  const [productImportList, setProductImportList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(ITEMS_PER_PAGE);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sSearchTerm, setSearchTerm] = useState("");
  const [bShowFilterDropdown, setShowFilterDropdown] = useState(false);
  const [bSubmitting, setSubmitting] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [viewMode, setViewMode] = useState("table");
  const [filesSelectedTime, setFilesSelectedTime] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleClearFilters = () => {
    setSearchTerm("");
  };

  const handleFilterChange = (e, filterName) => {
    const { name, value } = e.target;
    setSearchTerm(value);
  };

  const handleExportFiles = async () => {
    setExportLoading(true);
    try {
      // Mock export functionality
      await new Promise(resolve => setTimeout(resolve, 2000));
      showEmsg(t('BULK_IMPORT.EXPORT_SUCCESS'), STATUS.SUCCESS);
    } catch (error) {
      showEmsg(t('BULK_IMPORT.EXPORT_ERROR'), STATUS.ERROR);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle table scroll for floating header
  const handleTableScroll = useCallback((e) => {
    setTableScrollTop(e.target.scrollTop);
  }, []);

  // Pagination handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };
   useEffect(() => {
      document.body.style.overflow = "hidden";
  
      // Re-enable scrollbar when component unmounts
      return () => {
        document.body.style.overflow = "unset";
      };
    }, []);

  // Fetch data when page changes
  useEffect(() => {
    fetchProductImportList(currentPage);
  }, [currentPage]);

  // Fetch product import list on component mount and page change
  const fetchProductImportList = async (page = currentPage) => {
    try {
      setListLoading(true);
      setListError(null);
      
      const token = localStorage.getItem("token");
      const response = await apiGet(GET_PRODUCT_IMPORT, { pageNumber: page, pageSize }, token);
      
      if (response.data) {
        setProductImportList(response.data.data || []);
        setCurrentPage(response.data.pagination?.currentPage || page);
        setTotalPages(response.data.pagination?.totalPages || 0);
        setTotalItems(response.data.pagination?.totalRecords || 0);
        
        // Show message if no data found
        if (response.data.data?.length === 0) {
          showEmsg(t('BULK_IMPORT.NO_IMPORT_DATA'), STATUS.INFO);
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message;
      setListError(errorMessage);
      showEmsg(errorMessage, STATUS.ERROR);
    } finally {
      setListLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchProductImportList(newPage);
  };

  useEffect(() => {
    setTitle(t('BULK_IMPORT.TITLE'));
    // Fetch product import list on component mount
    fetchProductImportList();
  }, [setTitle, t]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    // Filter to only allow Excel files
    const excelFiles = selectedFiles.filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['xlsx', 'xls', 'csv'].includes(extension);
    });
    
    if (excelFiles.length === 0) {
      showEmsg(t('BULK_IMPORT.SELECT_EXCEL_ONLY'), STATUS.ERROR);
      return;
    }
    
    if (excelFiles.length < selectedFiles.length) {
      showEmsg(t('BULK_IMPORT.SOME_FILES_REMOVED'), STATUS.WARNING);
    }
    
    // Only keep the first file for single file upload
    setFiles(excelFiles.slice(0, 1));
    setFilesSelectedTime(new Date().toLocaleTimeString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Filter to only allow Excel files
    const excelFiles = droppedFiles.filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['xlsx', 'xls', 'csv'].includes(extension);
    });
    
    if (excelFiles.length === 0) {
      showEmsg(t('BULK_IMPORT.SELECT_EXCEL_ONLY'), STATUS.ERROR);
      return;
    }
    
    if (excelFiles.length < droppedFiles.length) {
      showEmsg(t('BULK_IMPORT.SOME_FILES_REMOVED'), STATUS.WARNING);
    }
    
    setFiles(excelFiles);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      await dispatch(exportProductTemplate()).unwrap();
      
      setDownloading(false);
      showEmsg(t('BULK_IMPORT.DOWNLOAD_SUCCESS'), STATUS.SUCCESS);
      
    } catch (error) {
      setDownloading(false);
      showEmsg(t('BULK_IMPORT.DOWNLOAD_ERROR'), STATUS.ERROR);
     
    }
  };

  const handleUploadFiles = async () => {
    if (files.length === 0) {
      showEmsg(t('BULK_IMPORT.PLEASE_SELECT_FILES'), STATUS.ERROR);
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('productExcel', files[0]);
      
      const response = await apiPost(CREATE_BULK_PRODUCT, formData, token, true);
      
      if (response.data) {
        showEmsg(t('BULK_IMPORT.UPLOAD_SUCCESS'), STATUS.SUCCESS);
        setFiles([]);
        // Refresh the import list
        fetchProductImportList();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message;
      showEmsg(errorMessage, STATUS.ERROR);
    } finally {
      setUploading(false);
    }
  };

  const handleClearFiles = () => {
    setFiles([]);
    setFilesSelectedTime(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    // Open upload modal instead of direct upload
    setShowUploadModal(true);
  };

  // Handle view logs
  const handleViewLogs = async (productImportId) => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await apiPost(
        GENERATE_PRODUCT_IMPORT_FAILURE_REPORT, 
        { ProductImportID: productImportId }, 
        token, 
        false, 
        "blob"
      );
      
      if (response.data) {
        // Handle both direct blob and axios blob response
        const blob = response.data instanceof Blob 
          ? response.data 
          : new Blob([response.data], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `import_failure_report_${productImportId}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showEmsg(t('BULK_IMPORT.DOWNLOAD_SUCCESS'), STATUS.SUCCESS);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to download failure report";
      showEmsg(errorMessage, STATUS.ERROR);
    }
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 h-screen bg-gray-50 flex flex-col overflow-hidden">
      <ToastContainer/>
      {(uploading || downloading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Loader height={48} width={48} color="#FF5A5F" />
        </div>
      )}

      <div className="flex justify-end">
        <Toolbar
          searchTerm=""
          setSearchTerm={() => {}}
          viewMode="table"
          setViewMode={() => {}}
          showFilterDropdown={false}
          setShowFilterDropdown={() => {}}
          handleFilterChange={() => {}}
          onClearFilters={() => {}}
          searchPlaceholder=""
          onExport={handleDownload}
          exportLabel={downloading ? t("BULK_IMPORT.DOWNLOADING") : t("BULK_IMPORT.DOWNLOAD")}
          onCreate={handleUpload}
          createLabel={t("BULK_IMPORT.UPLOAD")}
          showSearch={false}
          showViewToggle={false}
          showFilterButton={false}
        />
      </div>

      <div className="table-container-floating">
          <div className="table-wrapper-floating" onScroll={handleTableScroll}>
          <table className="table-base">
            {/* Floating Header */}
            <thead className={`table-head-floating ${tableScrollTop > 10 ? "table-head-floating-shadow" : ""}`}>
              <tr>
                <th scope="col" className="table-head-cell-floating w-1/4">
                  {t("BULK_IMPORT.file_name")}
                </th>
                <th scope="col" className="table-head-cell-floating w-1/5">
                  {t("BULK_IMPORT.status")}
                </th>
                <th scope="col" className="table-head-cell-floating w-1/6">
                  {t("BULK_IMPORT.created_at")}
                </th>
                <th scope="col" className="table-head-cell-floating w-1/6">
                  {t("BULK_IMPORT.updated_by")}
                </th>
                <th scope="col" className="table-head-cell-floating w-1/6">
                  {t("BULK_IMPORT.logs")}
                </th>
              </tr>
            </thead>
            
            <tbody className="table-body">
              {listLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <div className="flex justify-center">
                      <Loader size="small" />
                    </div>
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-red-500">
                    {listError}
                  </td>
                </tr>
              ) : productImportList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm">{t('BULK_IMPORT.NO_IMPORT_DATA')}</p>
                  </td>
                </tr>
              ) : (
                productImportList.map((item, index) => (
                  <tr key={item.ProductImportID || index} className="table-row">
                    <td className="table-cell w-1/4">
                      <div className="table-cell-text font-medium text-gray-900 flex items-center">
                        <FileSpreadsheet className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0" />
                        <span>
                          {item.FileName || `Import #${index + 1}`}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell w-1/5 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.Status === 'Success' 
                          ? 'bg-green-100 text-green-800' 
                          : item.Status === 'Failure'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.Status || 'Unknown'}
                      </span>
                    </td>
                    <td className="table-cell w-1/6 text-center">
                      <div className="table-cell-text flex items-center justify-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                        <span>
                          {item.CreatedAt ? new Date(item.CreatedAt).toLocaleString() : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell w-1/6 text-center">
                      <div className="table-cell-text flex items-center justify-center">
                        <User className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                        <span>
                          {item.FirstName && item.LastName ? (item.FirstName + ' ' + item.LastName) : (item.CreatedBy ? (item.CreatedBy.FirstName || '') + ' ' + (item.CreatedBy.LastName || '') : '-')}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell w-1/6 text-center">
                      {item.Status === 'Failure' ? (
                        <button
                          onClick={() => handleViewLogs(item.ProductImportID)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {t("BULK_IMPORT.view_logs")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 z-10">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={pageSize}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
            handlePageClick={handlePageClick}
          />
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-5 max-w-sm w-full mx-4 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {t('BULK_IMPORT.UPLOAD_FILES')}
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mb-4 bg-gray-50">
              <FileSpreadsheet className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p className="text-xs text-gray-600 mb-2">
                {t('BULK_IMPORT.DRAG_DROP_FILES')}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {t('BULK_IMPORT.OR')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_CONSTANTS.BULK_IMPORT_FILE_TYPES}
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-custom-bg hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-bg transition-colors"
              >
                <Upload className="h-3 w-3 mr-1.5" />
                {t('BULK_IMPORT.CHOOSE_FILES')}
              </button>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-900 mb-2">
                  {t('BULK_IMPORT.SELECTED_FILE')} ({files.length})
                </h4>
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded border border-gray-200">
                      <span className="truncate flex-1">{file.name}</span>
                      <button
                        onClick={() => {
                          const newFiles = files.filter((_, i) => i !== index);
                          setFiles(newFiles);
                          if (newFiles.length === 0) {
                            setFilesSelectedTime(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }
                        }}
                        className="text-red-500 hover:text-red-700 ml-2 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {filesSelectedTime && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('BULK_IMPORT.FILE_SELECTED_AT')} {filesSelectedTime}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {t('COMMON.CANCEL')}
              </button>
              <button
                onClick={() => {
                  handleUploadFiles();
                  setShowUploadModal(false);
                }}
                disabled={files.length === 0}
                className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-custom-bg hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
                    {t('COMMON.UPLOADING')}
                  </div>
                ) : (
                  t('COMMON.UPLOAD')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImport;
