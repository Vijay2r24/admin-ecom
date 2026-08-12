import React from "react";
import { useTranslation } from "react-i18next";
import { getPlanResourceLimit, isPlanResourceUnlimited } from "../utils/planAccessUtils";

const PlanUsageDonut = ({ resourceKey, currentUsage, label }) => {
  const { t } = useTranslation();

  const isUnlimited = isPlanResourceUnlimited(resourceKey);
  const rawLimit = getPlanResourceLimit(resourceKey);

  const displayLimit = isUnlimited || rawLimit === null || rawLimit <= 0 ? "∞" : rawLimit;
  const isInfinite = displayLimit === "∞";

  const usage = Math.max(0, currentUsage || 0);
  const percentage = isInfinite ? 0 : Math.min(100, Math.max(0, Math.round((usage / displayLimit) * 100)));
  const remaining = isInfinite ? "∞" : Math.max(0, displayLimit - usage);
  const isExhausted = !isInfinite && usage >= displayLimit;
  const isNearLimit = !isInfinite && percentage >= 80 && !isExhausted;

  // Colors based on state
  let strokeColor = "text-custom-bg"; 
  let bgColor = "bg-custom-bg";
  let textColor = "text-custom-bg";
  
  if (isExhausted) {
    strokeColor = "text-red-500";
    bgColor = "bg-red-500";
    textColor = "text-red-500";
  } else if (isNearLimit) {
    strokeColor = "text-yellow-500";
    bgColor = "bg-yellow-500";
    textColor = "text-yellow-600";
  } else if (isInfinite) {
    strokeColor = "text-green-500";
    bgColor = "bg-green-500";
    textColor = "text-green-600";
  }

  // Small Trigger SVG
  const smallRadius = 10;
  const smallCircumference = 2 * Math.PI * smallRadius;
  const smallOffset = smallCircumference - (percentage / 100) * smallCircumference;

  // Large Popup SVG
  const largeRadius = 24;
  const largeCircumference = 2 * Math.PI * largeRadius;
  const largeOffset = largeCircumference - (percentage / 100) * largeCircumference;

  return (
    <div className="relative group inline-block z-10 hover:z-50">
      {/* Trigger Element */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-2.5 py-1.5 shadow-sm cursor-default hover:bg-gray-50 transition-colors">
        {/* Small Donut */}
        <div className="relative flex items-center justify-center w-7 h-7">
          <svg className="w-7 h-7 transform -rotate-90">
            <circle className="text-gray-100" strokeWidth="2.5" stroke="currentColor" fill="transparent" r={smallRadius} cx="14" cy="14" />
            <circle className={`${strokeColor} transition-all duration-1000 ease-in-out`} strokeWidth="2.5" strokeDasharray={smallCircumference} strokeDashoffset={smallOffset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={smallRadius} cx="14" cy="14" />
          </svg>
          <div className={`absolute flex items-center justify-center ${textColor}`}>
            <span className="text-[8px] font-bold tracking-tighter">{isInfinite ? '\u221e' : `${percentage}%`}</span>
          </div>
        </div>
        {/* Trigger Text */}
        <div className="flex flex-col items-start leading-[1.1]">
          <span className={`text-[10px] font-semibold ${textColor}`}>{label}</span>
          <span className={`text-[11px] font-bold ${textColor}`}>{usage} / {displayLimit}</span>
        </div>
      </div>

      {/* Hover Popup */}
      <div className="absolute right-0 top-full mt-2 w-[280px] bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-5 cursor-default z-50">
        {/* Title */}
        <h3 className="text-[13px] font-bold text-gray-900 mb-4">{t('PLAN_USAGE.USAGE_TITLE', { label })}</h3>
        
        <div className="flex items-center gap-5 mb-5">
          {/* Large Donut */}
          <div className="relative flex items-center justify-center w-[60px] h-[60px] shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-gray-100" strokeWidth="5" stroke="currentColor" fill="transparent" r={largeRadius} cx="30" cy="30" />
              <circle className={`${strokeColor} transition-all duration-1000 ease-in-out`} strokeWidth="5" strokeDasharray={largeCircumference} strokeDashoffset={largeOffset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={largeRadius} cx="30" cy="30" />
            </svg>
            <span className="absolute text-[13px] font-bold text-gray-900">{isInfinite ? '∞' : `${percentage}%`}</span>
          </div>
          
          {/* Stats Columns */}
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 mb-0.5">{t('PLAN_USAGE.USED')}</span>
              <span className="text-xl font-bold text-gray-900 leading-none">{usage}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-gray-500 mb-0.5">{t('PLAN_USAGE.REMAINING')}</span>
              <span className="text-xl font-bold text-gray-900 leading-none">{remaining}</span>
            </div>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full mb-3">
          <div className="flex justify-between text-[10px] font-medium text-gray-500 mb-1.5 px-0.5">
            <span>0</span>
            <span>{displayLimit}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${bgColor} rounded-full transition-all duration-1000 ease-in-out`} style={{ width: `${percentage}%` }}></div>
          </div>
        </div>

        {/* Badge */}
        {isExhausted && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            <span className="text-[10px] font-semibold text-red-600">{t('PLAN_USAGE.BADGE_LIMIT_REACHED')}</span>
          </div>
        )}
        {!isExhausted && isNearLimit && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
            <span className="text-[10px] font-semibold text-yellow-600">{t('PLAN_USAGE.BADGE_APPROACHING')}</span>
          </div>
        )}
        {!isExhausted && !isNearLimit && !isInfinite && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-[10px] font-semibold text-green-600">{t('PLAN_USAGE.BADGE_WITHIN_LIMITS')}</span>
          </div>
        )}
        {isInfinite && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-[10px] font-semibold text-green-600">{t('PLAN_USAGE.BADGE_UNLIMITED')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanUsageDonut;
