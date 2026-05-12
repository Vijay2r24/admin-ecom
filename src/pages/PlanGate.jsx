import { useEffect } from 'react';
import { Crown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTitle } from '../context/TitleContext';

/**
 * @param {{ embed?: boolean, sectionTitle?: string }} [props]
 */
const PlanGate = ({ embed = false, sectionTitle = '' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setTitle, setBackButton } = useTitle();

  let planName = '';
  try {
    const sub = JSON.parse(localStorage.getItem('subscription'));
    planName = sub?.planName || '';
  } catch {
    planName = '';
  }

  useEffect(() => {
    if (embed) {
      return undefined;
    }
    setTitle(t('PLAN_GATE.TITLE'));
    setBackButton(null);
    return () => {
      setTitle('');
      setBackButton(null);
    };
  }, [embed, setTitle, setBackButton, t]);

  const heading = sectionTitle || t('PLAN_GATE.TITLE');
  const description = sectionTitle
    ? t('PLAN_GATE.DESCRIPTION_SECTION', { section: sectionTitle })
    : t('PLAN_GATE.DESCRIPTION');

  const iconWrap = embed
    ? 'w-11 h-11 mb-3 rounded-full bg-yellow-100 text-yellow-700'
    : 'w-14 h-14 rounded-full bg-yellow-100 text-yellow-700 mb-4';
  const iconSize = embed ? 'w-6 h-6' : 'w-7 h-7';

  const inner = (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${
        embed ? 'max-w-xl mx-auto' : ''
      }`}
    >
      <div className="bg-gradient-to-r from-custom-bg/10 to-blue-50 px-4 sm:px-6 py-6 sm:py-8 text-center border-b border-gray-100">
        <div
          className={`inline-flex items-center justify-center rounded-full bg-yellow-100 text-yellow-700 ${iconWrap}`}
        >
          <Crown className={iconSize} />
        </div>
        <h1
          className={`font-bold text-gray-900 ${
            embed ? 'text-lg sm:text-xl' : 'text-xl'
          }`}
        >
          {heading}
        </h1>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          {description}
        </p>
        {planName ? (
          <p className="text-xs text-gray-500 mt-3">
            {t('PLAN_GATE.CURRENT_PLAN')}:{' '}
            <span className="font-semibold text-gray-800">{planName}</span>
          </p>
        ) : null}
      </div>
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-center">
        <button
          type="button"
          onClick={() => navigate('/subscription')}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-custom-bg px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-custom-bg-dark"
        >
          {t('PLAN_GATE.VIEW_PLANS')}
        </button>
      </div>
    </div>
  );

  if (embed) {
    return <div className="py-6 sm:py-8">{inner}</div>;
  }

  return (
    <div className="main-container">
      <div className="max-w-xl mx-auto mt-8 lg:mt-16 px-2">{inner}</div>
    </div>
  );
};

export default PlanGate;
