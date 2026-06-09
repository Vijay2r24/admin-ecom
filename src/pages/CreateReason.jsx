 import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tag, FileText, Info } from 'lucide-react';
import { useCategories } from '../context/AllDataContext';
import SelectWithIcon from '../components/SelectWithIcon';
import TextInputWithIcon from '../components/TextInputWithIcon';
import TextAreaWithIcon from '../components/TextAreaWithIcon';
import BackButton from '../components/BackButton';
import Loader from '../components/Loader';
import { ToastContainer } from 'react-toastify';
import { apiGet, apiPost, apiPut } from '../utils/ApiUtils';
import {
  CREATE_REASON,
  UPDATE_REASON,
  GET_REASONSBYID,
} from '../contants/apiRoutes';
import { showEmsg } from '../utils/ShowEmsg';
import { REASON_TYPES, YES_NO_VALUES, STATUS } from '../contants/constants';

const CreateReason = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: reasonId } = useParams();
  const isEditing = Boolean(reasonId);

  const categoriesData = useCategories();
  const allCategories = categoriesData?.data || [];
  const childCategories = allCategories.filter(
    cat =>
      cat.ParentCategoryID !== null &&
      cat.ParentCategoryID !== undefined &&
      cat.ParentCategoryID !== ''
  );

  const [bSubmitting, setBSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    categoryIDs: [],
    reasonType: REASON_TYPES.CANCEL,
    reasonCode: '',
    reasonLabel: '',
    reasonDescription: '',
    requiresComment: YES_NO_VALUES.NO,
    requiresAttachment: YES_NO_VALUES.NO,
  });

  // Required fields configuration
  const requiredFields = {
    categoryIDs: true,
    reasonType: true,
    reasonCode: true,
    reasonLabel: true,
    requiresComment: true,
    requiresAttachment: true,
  };

  /* ── load categories ── */
  useEffect(() => {
    if (categoriesData?.fetch && allCategories.length === 0) {
      categoriesData.fetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── load existing reason for edit ── */
  useEffect(() => {
    if (!isEditing) return;
    const load = async () => {
      try {
        setBSubmitting(true);
        const response = await apiGet(`${GET_REASONSBYID}/${reasonId}`);
        if (response?.data?.status === STATUS.SUCCESS && response?.data?.data) {
          const r = response.data.data;
          const categoryIDs = (r.Categories || [])
            .sort((a, b) => a.SortOrder - b.SortOrder)
            .map(c => c.CategoryID);
          setFormData({
            categoryIDs,
            reasonType:         r.ReasonType,
            reasonCode:         r.ReasonCode,
            reasonLabel:        r.ReasonLabel,
            reasonDescription:  r.ReasonDescription || '',
            requiresComment:    r.RequiresComment    ? YES_NO_VALUES.YES : YES_NO_VALUES.NO,
            requiresAttachment: r.RequiresAttachment ? YES_NO_VALUES.YES : YES_NO_VALUES.NO,
          });
        }
      } catch {
        showEmsg(t('REASON_MANAGEMENT.ERROR_FETCH_DETAILS'), STATUS.ERROR);
      } finally {
        setBSubmitting(false);
      }
    };
    load();
  }, [isEditing, reasonId, t]);

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.categoryIDs?.length) {
      showEmsg(t('REASON_MANAGEMENT.ERROR_CATEGORY_REQUIRED'), STATUS.ERROR);
      return;
    }

    try {
      setBSubmitting(true);

      const payload = {
        ReasonType:         formData.reasonType,
        ReasonCode:         formData.reasonCode,
        ReasonLabel:        formData.reasonLabel,
        ReasonDescription:  formData.reasonDescription,
        RequiresComment:    formData.requiresComment    === YES_NO_VALUES.YES,
        RequiresAttachment: formData.requiresAttachment === YES_NO_VALUES.YES,
        Categories: formData.categoryIDs.map((id, i) => ({
          SortOrder: i + 1,
          CategoryID: id,
        })),
      };

      const response = isEditing
        ? await apiPut(`${UPDATE_REASON}/${reasonId}`, payload)
        : await apiPost(CREATE_REASON, payload);

      const status = (response?.data?.status ?? '').toUpperCase();
      if (status === STATUS.SUCCESS) {
        showEmsg(
          response?.data?.message ||
            (isEditing
              ? t('REASON_MANAGEMENT.SUCCESS_UPDATE')
              : t('REASON_MANAGEMENT.SUCCESS_CREATE')),
          'success',
          3000,
          () => navigate('/cancellations')
        );
      } else if (response !== undefined) {
        showEmsg(
          response?.data?.message || t('REASON_MANAGEMENT.ERROR_CREATE'),
          STATUS.ERROR,
          3000
        );
      }
    } catch (err) {
      showEmsg(
        err?.response?.data?.message ||
          err?.message ||
          t('REASON_MANAGEMENT.ERROR_CREATE'),
        STATUS.ERROR,
        3000
      );
    } finally {
      setBSubmitting(false);
    }
  };

  // Helper function to render label with required asterisk
  const renderLabel = (fieldName, translationKey) => {
    const isRequired = requiredFields[fieldName];
    return (
      <span>
        {t(translationKey)}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </span>
    );
  };

  /* ── render ── */
  return (
    <div className="w-full min-h-screen bg-gray-50">
      {bSubmitting && (
        <div className="global-loader-overlay">
          <Loader />
        </div>
      )}

      <ToastContainer />

      {/* Page Header */}
      <div className="flex items-center mb-6">
        <BackButton onClick={() => navigate('/cancellations')} />
        <h2 className="text-xl font-bold text-gray-900">
          {isEditing
            ? t('REASON_MANAGEMENT.MODAL.EDIT_TITLE')
            : t('REASON_MANAGEMENT.MODAL.CREATE_TITLE')}
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Reason Type + Reason Code */}
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <SelectWithIcon
              id="reasonType"
              name="reasonType"
              label={renderLabel('reasonType', 'REASON_MANAGEMENT.MODAL.REASON_TYPE_LABEL')}
              value={formData.reasonType}
              onChange={(e) =>
                setFormData({ ...formData, reasonType: e.target.value })
              }
              options={[
                { value: REASON_TYPES.CANCEL,  label: t('REASON_MANAGEMENT.REASON_TYPES.CANCEL')  },
                { value: REASON_TYPES.RETURN,  label: t('REASON_MANAGEMENT.REASON_TYPES.RETURN')  },
                { value: REASON_TYPES.REPLACE, label: t('REASON_MANAGEMENT.REASON_TYPES.REPLACE') },
              ]}
              Icon={Tag}
              required
            />
          </div>

          <div className="flex-1">
            <TextInputWithIcon
              id="reasonCode"
              name="reasonCode"
              label={renderLabel('reasonCode', 'REASON_MANAGEMENT.MODAL.REASON_CODE_LABEL')}
              value={formData.reasonCode}
              onChange={(e) =>
                setFormData({ ...formData, reasonCode: e.target.value.toUpperCase() })
              }
              placeholder={t('REASON_MANAGEMENT.MODAL.REASON_CODE_PLACEHOLDER')}
              Icon={FileText}
              required
            />
          </div>
        </div>

        {/* Row 2: Reason Label + Categories */}
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <TextInputWithIcon
              id="reasonLabel"
              name="reasonLabel"
              label={renderLabel('reasonLabel', 'REASON_MANAGEMENT.MODAL.REASON_LABEL_LABEL')}
              value={formData.reasonLabel}
              onChange={(e) =>
                setFormData({ ...formData, reasonLabel: e.target.value })
              }
              placeholder={t('REASON_MANAGEMENT.MODAL.REASON_LABEL_PLACEHOLDER')}
              Icon={FileText}
              required
            />
          </div>

          <div className="flex-1">
            <SelectWithIcon
              id="categoryIDs"
              name="categoryIDs"
              label={renderLabel('categoryIDs', 'REASON_MANAGEMENT.MODAL.CATEGORY_LABEL')}
              value={formData.categoryIDs}
              onChange={(e) =>
                setFormData({ ...formData, categoryIDs: e.target.value })
              }
              options={childCategories.map(cat => ({
                value: cat.CategoryID,
                label: cat.CategoryName,
              }))}
              placeholder={t('REASON_MANAGEMENT.MODAL.CATEGORY_PLACEHOLDER')}
              Icon={Tag}
              multiple={true}
              maxVisibleItems={formData.categoryIDs.length || 3}
            />
          </div>
        </div>

        {/* Row 3: Requires Comment + Requires Attachment */}
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1">
            <SelectWithIcon
              id="requiresComment"
              name="requiresComment"
              label={renderLabel('requiresComment', 'REASON_MANAGEMENT.MODAL.REQUIRES_COMMENT_LABEL')}
              value={formData.requiresComment}
              onChange={(e) =>
                setFormData({ ...formData, requiresComment: e.target.value })
              }
              options={[
                { value: YES_NO_VALUES.YES, label: t('COMMON.YES') },
                { value: YES_NO_VALUES.NO,  label: t('COMMON.NO')  },
              ]}
              Icon={FileText}
              required
            />
          </div>

          <div className="flex-1">
            <SelectWithIcon
              id="requiresAttachment"
              name="requiresAttachment"
              label={renderLabel('requiresAttachment', 'REASON_MANAGEMENT.MODAL.REQUIRES_ATTACHMENT_LABEL')}
              value={formData.requiresAttachment}
              onChange={(e) =>
                setFormData({ ...formData, requiresAttachment: e.target.value })
              }
              options={[
                { value: YES_NO_VALUES.YES, label: t('COMMON.YES') },
                { value: YES_NO_VALUES.NO,  label: t('COMMON.NO')  },
              ]}
              Icon={FileText}
              required
            />
          </div>
        </div>

        {/* Row 4: Description (Full Width) */}
        <div>
          <TextAreaWithIcon
            label={t('COMMON.DESCRIPTION')}
            name="reasonDescription"
            value={formData.reasonDescription}
            onChange={(e) =>
              setFormData({ ...formData, reasonDescription: e.target.value })
            }
            placeholder={t('REASON_MANAGEMENT.MODAL.REASON_LABEL_PLACEHOLDER')}
            icon={Info}
            showCharCount={true}
            maxChars={500}
            currentChars={formData.reasonDescription.length}
            rows={4}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/cancellations')}
            className="btn-cancel"
            disabled={bSubmitting}
          >
            {t('REASON_MANAGEMENT.MODAL.CANCEL_BTN')}
          </button>
          <button
            type="submit"
            disabled={bSubmitting}
            className="btn-primary"
          >
            {bSubmitting
              ? t('COMMON.SUBMITTING')
              : isEditing
                ? t('REASON_MANAGEMENT.MODAL.UPDATE_BTN')
                : t('REASON_MANAGEMENT.MODAL.CREATE_BTN')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateReason;
