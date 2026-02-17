import React from 'react';
import { Edit, Trash, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Tooltip from './Tooltip';
import { TOOLTIP_MESSAGES } from '../contants/constants';

const ActionButtons = ({ 
  id, 
  onEdit,
  disableEdit,
  disableView , 
  onDelete,
  onMore,
  viewLink,
  canDelete = true 
}) => {

  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-2 mt-2">

      {/* EDIT BUTTON */}
      {onEdit && (
        <Tooltip 
          text={TOOLTIP_MESSAGES.EDIT} 
          position="top"
        >
          <button 
            onClick={() => onEdit(id)}
            disabled={disableEdit}
            className={`p-2 rounded transition ${
              disableEdit
                ? "cursor-not-allowed text-gray-400 opacity-50"
                : "action-button"
            }`}
          >
            <Edit className="h-5 w-5" />
          </button>
        </Tooltip>
      )}

      {/* DELETE BUTTON */}
      {onDelete && canDelete && (
        <Tooltip text={TOOLTIP_MESSAGES.DELETE} position="top">
          <button 
            onClick={() => onDelete(id)}
            className="action-button"
          >
            <Trash className="h-5 w-5" />
          </button>
        </Tooltip>
      )}

      {/* VIEW BUTTON */}
      {viewLink && (
        disableView ? (
          <Tooltip text={TOOLTIP_MESSAGES.VIEW} position="top">
            <div 
              className="p-2 rounded cursor-not-allowed text-gray-400 opacity-50"
            >
              <Eye className="h-5 w-5" />
            </div>
          </Tooltip>
        ) : (
          <Tooltip text={TOOLTIP_MESSAGES.VIEW} position="top">
            <Link 
              to={viewLink}
              className="view-button"
            >
              <Eye className="h-5 w-5" />
            </Link>
          </Tooltip>
        )
      )}

    </div>
  );
};

export default ActionButtons;

