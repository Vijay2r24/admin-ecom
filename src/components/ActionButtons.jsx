import { useTranslation } from "react-i18next";
import { Edit, Trash, MoreVertical, Eye } from 'lucide-react';
import { Link } from "react-router-dom";
import Tooltip from './Tooltip';

const ActionButtons = ({ 
  id, 
  onEdit,
  disableEdit,
  onDelete,
  onMore,
  viewLink,
  canDelete = true,
  hasViewPermission = true 
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      {/* View Button */}
      {viewLink && (
        <Tooltip text={hasViewPermission ? t('COMMON.VIEW') : t('COMMON.NO_VIEW_PERMISSION')} position="top">
          {hasViewPermission ? (
            <Link to={viewLink} className="text-custom-bg hover:text-custom-bg font-medium transition-colors duration-150">
              <Eye className="h-4 w-4" />
            </Link>
          ) : (
            <span className="text-gray-300 cursor-not-allowed">
              <Eye className="h-4 w-4" />
            </span>
          )}
        </Tooltip>
      )}
      
      {/* Edit Button */}
      {onEdit && (
        <Tooltip text={!disableEdit ? t('COMMON.EDIT') : t('COMMON.NO_EDIT_PERMISSION')} position="top">
          {!disableEdit ? (
            <button 
              onClick={() => onEdit(id)}
              className="text-custom-bg hover:text-custom-bg font-medium transition-colors duration-150"
            >
              <Edit className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-gray-300 cursor-not-allowed">
              <Edit className="h-4 w-4" />
            </span>
          )}
        </Tooltip>
      )}
      
      {/* Delete Button */}
      {onDelete && (
        <Tooltip text={canDelete ? t('COMMON.DELETE') : t('COMMON.NO_DELETE_PERMISSION')} position="top">
          {canDelete ? (
            <button 
              onClick={() => onDelete(id)}
              className="text-red-600 hover:text-red-800 font-medium transition-colors duration-150"
            >
              <Trash className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-gray-300 cursor-not-allowed">
              <Trash className="h-4 w-4" />
            </span>
          )}
        </Tooltip>
      )}
      
      {/* More Options */}
      {onMore && (
        <Tooltip text={t('COMMON.MORE')} position="top">
          <button 
            onClick={() => onMore(id)}
            className="text-gray-600 hover:text-gray-800 font-medium transition-colors duration-150"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export default ActionButtons;
