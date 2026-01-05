import { useTranslation } from "react-i18next";
import { Edit, Trash, Eye } from 'lucide-react';
import { Link } from "react-router-dom";

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
        <button 
          onClick={() => onEdit(id)}
          disabled={disableEdit}
          className={`p-2 rounded transition ${
            disableEdit
              ? "cursor-not-allowed text-gray-400 opacity-50"
              : "action-button"
          }`}
          title={t('COMMON.EDIT')}
        >
          <Edit className="h-5 w-5" />
        </button>
      )}

      {/* DELETE BUTTON */}
      {onDelete && canDelete && (
        <button 
          onClick={() => onDelete(id)}
          className="action-button"
          title={t('COMMON.DELETE')}
        >
          <Trash className="h-5 w-5" />
        </button>
      )}

      {/* VIEW BUTTON */}
      {viewLink && (
        disableView ? (
          <div 
            className="p-2 rounded cursor-not-allowed text-gray-400 opacity-50"
            title={t("COMMON.VIEW")}
          >
            <Eye className="h-5 w-5" />
          </div>
        ) : (
          <Link 
            to={viewLink}
            className="view-button"
            title={t("COMMON.VIEW")}
          >
            <Eye className="h-5 w-5" />
          </Link>
        )
      )}

    </div>
  );
};

export default ActionButtons;

