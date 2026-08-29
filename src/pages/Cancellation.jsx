import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTitle } from '../context/TitleContext';
import { useTranslation } from 'react-i18next';
import Switch from '../components/Switch';
import FullscreenErrorPopup from '../components/FullscreenErrorPopup';
import Toolbar from '../components/Toolbar';
import Pagination from '../components/Pagination';
import ActionButtons from '../components/ActionButtons';
import { apiGet, apiPatch } from '../utils/ApiUtils';
import {
  GET_REASONS_LIST,
  UPDATE_REASONS_STATUS,
} from '../contants/apiRoutes';
import { showEmsg } from '../utils/ShowEmsg';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { ITEMS_PER_PAGE, VISIBLE_LIMIT, REASON_TYPES, STATUS, FILTERS } from '../contants/constants';
import { ToastContainer } from 'react-toastify';




const CategoryCell = ({ categories, t }) => {
  const [expanded, setExpanded] = useState(false);

  if (!categories || categories.length === 0) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  const visible = expanded ? categories : categories.slice(0, VISIBLE_LIMIT);
  const hidden  = categories.length - VISIBLE_LIMIT;

  return (
    <div className="flex flex-wrap gap-1 justify-start items-center">
      {visible.map(cat => (
        <span
          key={cat.ReasonContextMappingID}
          className="text-xs text-gray-700 whitespace-nowrap"
        >
          {cat.CategoryName}
        </span>
      ))}
      {!expanded && hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-custom-bg/10 text-custom-bg border border-custom-bg/20 hover:bg-custom-bg/20 transition-colors whitespace-nowrap"
        >
          +{hidden} {t('COMMON.MORE')}
        </button>
      )}
      {expanded && hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600 border border-gray-300 hover:bg-gray-300 transition-colors whitespace-nowrap"
        >
          {t('COMMON.SHOW_LESS')}
        </button>
      )}
    </div>
  );
};

/* ── Cancellations ────────────────────────────────────────────────── */

const Cancellations = () => {
  const { setTitle } = useTitle();
  const { t } = useTranslation();
  const navigate = useNavigate();

  /* ── state ── */
  const [allReasons, setAllReasons]                     = useState([]);
  const [sSearchTerm, setSearchTerm]                    = useState('');
  const [selectedReasonType, setSelectedReasonType]     = useState('');
  const [sShowFilterDropdown, setShowFilterDropdown]    = useState(false);
  const [bSubmitting, setBSubmitting]                   = useState(false);
  const [nCurrentPage, setCurrentPage]                  = useState(1);
  const [nTotalRecords, setTotalRecords]                = useState(0);
  const [sError, setError]                              = useState(null);
  const [backendMessage, setBackendMessage]             = useState(null);
  const [statusPopup, setStatusPopup]                   = useState({ open: false, reasonID: null, newStatus: null });

  /* ── derived pagination ── */
  const nTotalPages  = Math.max(1, Math.ceil(nTotalRecords / ITEMS_PER_PAGE));

  /* ── title ── */
  useEffect(() => {
    setTitle(t('REASON_MANAGEMENT.TITLE'));
    return () => setTitle('');
  }, [setTitle, t]);

  // Hide body scrollbar when component mounts (same as Stores list)
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  /* ── fetch ── */
  const fetchReasons = async (params = {}, silent = false) => {
    try {
      if (!silent) setBSubmitting(true);
      setError(null);
    
      const response = await apiGet(GET_REASONS_LIST, {
        pageNumber: nCurrentPage,
        pageSize: ITEMS_PER_PAGE,
        ...(params.ReasonType && { ReasonType: params.ReasonType }),
        ...(params.searchText && { searchText: params.searchText }),
      });

      if (response?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        const rows = Array.isArray(response.data.data) ? response.data.data : [];
        const mapped = rows.map(r => ({
          reasonID:           r.ReasonID,
          categories:         r.Categories || [],
          reasonType:         r.ReasonType,
          reasonCode:         r.ReasonCode,
          reasonLabel:        r.ReasonLabel,
          requiresComment:    r.RequiresComment    || false,
          requiresAttachment: r.RequiresAttachment || false,
          isActive:           r.IsActive,
        }));
      
        setAllReasons(mapped);
        setTotalRecords(response.data.pagination?.totalRecords || response.data.total || mapped.length);
        setBackendMessage(mapped.length === 0 ? (response.data.message || response.data.MESSAGE || null) : null);
        setError(null);
      } else {
        const apiMessage = response?.data?.message || response?.data?.MESSAGE || null;
        setAllReasons([]);
        setTotalRecords(0);
        setBackendMessage(apiMessage);
        setError(null);
      }
    } catch (error) {
      const apiMessage = error?.response?.data?.message || error?.response?.data?.MESSAGE || null;
      setAllReasons([]);
      setTotalRecords(0);
      setBackendMessage(apiMessage);
      setError(apiMessage ? null : t("COMMON.API_ERROR"));
    } finally {
      if (!silent) setBSubmitting(false);
    }
  };

  /* ── re-fetch on filter change ── */
  useEffect(() => {
    fetchReasons({ ReasonType: selectedReasonType, searchText: sSearchTerm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sSearchTerm, selectedReasonType, nCurrentPage]);

  /* ── pagination handlers ── */
  const handlePrevPage  = () => setCurrentPage(p => Math.max(p - 1, 1));
  const handleNextPage  = () => setCurrentPage(p => Math.min(p + 1, nTotalPages));
  const handlePageClick = (page) => setCurrentPage(page);

  /* ── filter handler ── */
  const handleFilterChange = (e, filterName) => {
    if (filterName === FILTERS.REASON_TYPE) {
      setSelectedReasonType(e.target.value);
      setCurrentPage(1);
    }
  };

  /* ── CRUD ── */
  const handleAddNew = () => navigate('/cancellations/create');
  const handleEdit   = (reasonID) => navigate(`/cancellations/edit/${reasonID}`);

  const handleToggleStatus = (reasonID, currentIsActive) =>
    setStatusPopup({ open: true, reasonID, newStatus: !currentIsActive });

  const handleStatusConfirm = async () => {
    const { reasonID, newStatus } = statusPopup;
    try {
      setBSubmitting(true);
      const response = await apiPatch(`${UPDATE_REASONS_STATUS}/${reasonID}`, { IsActive: newStatus });
      if (response?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        setAllReasons(prev => prev.map(r => r.reasonID === reasonID ? { ...r, isActive: newStatus } : r));
        showEmsg(newStatus ? t('REASON_MANAGEMENT.SUCCESS_ACTIVATE') : t('REASON_MANAGEMENT.SUCCESS_DEACTIVATE'), STATUS.SUCCESS);
      }
    } catch {
      showEmsg(t('REASON_MANAGEMENT.ERROR_UPDATE_STATUS'), STATUS.ERROR);
    } finally {
      setBSubmitting(false);
      setStatusPopup({ open: false, reasonID: null, newStatus: null });
    }
  };

  const handleStatusPopupClose = () =>
    setStatusPopup({ open: false, reasonID: null, newStatus: null });

  const getReasonTypeBadgeColor = (type) => ({
    [REASON_TYPES.CANCEL]:  'bg-red-100 text-red-700 border-red-200',
    [REASON_TYPES.RETURN]:  'bg-blue-100 text-blue-700 border-blue-200',
    [REASON_TYPES.REPLACE]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  }[type] || 'bg-gray-100 text-gray-700 border-gray-200');

  const getReasonTypeLabel = (type) => {
    const labels = {
      [REASON_TYPES.CANCEL]:  t('REASON_MANAGEMENT.REASON_TYPES.CANCEL'),
      [REASON_TYPES.RETURN]:  t('REASON_MANAGEMENT.REASON_TYPES.RETURN'),
      [REASON_TYPES.REPLACE]: t('REASON_MANAGEMENT.REASON_TYPES.REPLACE'),
    };
    return labels[type] || type;
  };

  /* ── render ── */
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 h-screen bg-gray-50 flex flex-col">
      {bSubmitting && (
        <div className="global-loader-overlay">
          <Loader />
        </div>
      )}
      <ToastContainer/>

      {/* Toolbar */}
      <Toolbar
        searchTerm={sSearchTerm}
        setSearchTerm={(val) => { setSearchTerm(val); setCurrentPage(1); }}
        showViewToggle={false}
        showFilterButton={true}
        showFilterDropdown={sShowFilterDropdown}
        setShowFilterDropdown={setShowFilterDropdown}
        searchPlaceholder={t('REASON_MANAGEMENT.SEARCH_PLACEHOLDER')}
        onCreate={handleAddNew}
        createLabel={t('REASON_MANAGEMENT.ADD_BTN')}
        additionalFilters={[
          {
            label: t('REASON_MANAGEMENT.TABLE.REASON_TYPE'),
            name: FILTERS.REASON_TYPE,
            value: selectedReasonType,
            options: [
              { value: '',                      label: t('REASON_MANAGEMENT.REASON_TYPES.ALL')     },
              { value: REASON_TYPES.CANCEL,     label: t('REASON_MANAGEMENT.REASON_TYPES.CANCEL')  },
              { value: REASON_TYPES.RETURN,     label: t('REASON_MANAGEMENT.REASON_TYPES.RETURN')  },
              { value: REASON_TYPES.REPLACE,    label: t('REASON_MANAGEMENT.REASON_TYPES.REPLACE') },
            ],
          },
        ]}
        handleFilterChange={handleFilterChange}
        onClearFilters={() => { setSelectedReasonType(''); setSearchTerm(''); setCurrentPage(1); }}
      />

      {/* Table */}
      <div className="table-container-floating">
        <div className="table-wrapper-floating">
          <table className="table-base">
            <thead className="table-head-floating">
              <tr>
                <th className="table-head-cell-floating text-left">{t('REASON_MANAGEMENT.TABLE.CATEGORY')}</th>
                <th className="table-head-cell-floating text-left">{t('REASON_MANAGEMENT.TABLE.REASON_TYPE')}</th>

                <th className="table-head-cell-floating text-left">{t('REASON_MANAGEMENT.TABLE.REASON_LABEL')}</th>
                <th className="table-head-cell-floating text-center">{t('REASON_MANAGEMENT.TABLE.STATUS')}</th>
                <th className="table-head-cell-floating text-center">{t('REASON_MANAGEMENT.TABLE.ACTIONS')}</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {bSubmitting ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 text-sm">
                    {t('COMMON.LOADING')}
                  </td>
                </tr>
              ) : sError ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-red-500 text-sm">
                    {sError}
                  </td>
                </tr>
              ) : allReasons.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState type="empty-box" title={backendMessage || ""} compact />
                  </td>
                </tr>
              ) : (
                allReasons.map((reason) => (
                  <tr key={reason.reasonID} className="table-row">
                    <td className="table-cell text-left align-middle">
                      <CategoryCell categories={reason.categories} t={t} />
                    </td>
                    <td className="table-cell text-left align-middle">
                      <span className={`status-badge ${getReasonTypeBadgeColor(reason.reasonType)}`}>
                        {getReasonTypeLabel(reason.reasonType)}
                      </span>
                    </td>
                   
                    <td className="table-cell text-left align-middle">
                      <span className="text-xs text-gray-900">{reason.reasonLabel}</span>
                    </td>
                    <td className="table-cell text-center align-middle">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={reason.isActive}
                          onChange={() => handleToggleStatus(reason.reasonID, reason.isActive)}
                        />
                      </div>
                    </td>
                    <td className="table-cell text-center align-middle">
                      <ActionButtons
                        id={reason.reasonID}
                        onEdit={handleEdit}
                        disableEdit={false}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {nTotalRecords > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 z-10">
          <Pagination
            currentPage={nCurrentPage}
            totalPages={nTotalPages}
            totalItems={nTotalRecords}
            itemsPerPage={ITEMS_PER_PAGE}
            handlePrevPage={handlePrevPage}
            handleNextPage={handleNextPage}
            handlePageClick={handlePageClick}
          />
        </div>
      )}

      {/* Status Confirmation */}
      {statusPopup.open && (
        <FullscreenErrorPopup
          message={
            statusPopup.newStatus
              ? t('REASON_MANAGEMENT.CONFIRM_ACTIVATE')
              : t('REASON_MANAGEMENT.CONFIRM_DEACTIVATE')
          }
          onClose={handleStatusPopupClose}
          onConfirm={handleStatusConfirm}
        />
      )}
    </div>
  );
};

export default Cancellations;
