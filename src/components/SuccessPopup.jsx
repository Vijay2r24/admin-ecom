import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import { useEffect } from 'react';

const SuccessPopup = ({ message, onClose, title, autoClose = false, duration = 3000, adminEmail }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 animate-fadeIn">
      <div className="relative w-96 bg-white rounded-2xl overflow-hidden text-center shadow-xl animate-scaleIn">
        <div className="relative h-24 bg-custom-bg rounded-t-2xl flex items-end justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px] opacity-30"></div>
          <div className="w-16 h-16 bg-white border-4 border-custom-bg rounded-full flex items-center justify-center translate-y-1/2 shadow-lg animate-checkmark">
            <svg className="w-8 h-8 text-custom-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div className="px-6 pt-10 pb-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">{title || t('COMMON.INFO')}</h2>
          <p className="text-gray-600 mb-4 leading-relaxed">
            {message}
          </p>
          {adminEmail && (
            <div className="bg-custom-bg/10 border border-custom-bg/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700 mb-1 font-medium">{t('COMMON.CONTACT_ADMIN')}</p>
              <a 
                href={`mailto:${adminEmail}`}
                className="text-custom-bg hover:text-custom-bg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {adminEmail}
              </a>
            </div>
          )}
          <div className="flex justify-end">
            <button
              className="px-8 py-2.5 bg-custom-bg text-white rounded-full hover:bg-bg-hover transition-all shadow-md hover:shadow-lg font-medium"
              onClick={onClose}
            >
              {t('COMMON.OK') }
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById('portal-root')
  );
};

export default SuccessPopup;
