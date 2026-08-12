import Swal from 'sweetalert2';
import i18next from 'i18next';
import tailwindConfig from '../../tailwind.config.js';
import { UI_COLORS, NOTIFICATION_TYPES } from '../contants/constants';

const colors = tailwindConfig.theme.extend.colors;
const CUSTOM_BG_COLOR = colors['custom-bg'];
const CUSTOM_BG_HOVER  = colors['bg-hover'];

export const showPlanLimitToast = ({ label, limit, used, remaining, percent, isExhausted }) => {
  if (!isExhausted) return;

  const t = i18next.t.bind(i18next);
  const labelLower = label.toLowerCase();

  Swal.fire({
    icon: NOTIFICATION_TYPES.WARNING,
    title: t('PLAN_LIMIT.TITLE'),
    html: `
      <div style="font-size: 15px; margin-bottom: 20px; color: ${UI_COLORS.GRAY_600}; text-align: left;">
        ${t('PLAN_LIMIT.BODY_REACHED', { limit, label: labelLower })}
      </div>
      <div style="background: ${UI_COLORS.GRAY_50}; border: 1px solid ${UI_COLORS.GRAY_200}; border-radius: 12px; padding: 16px; margin-top: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: 600;">
          <span style="color: ${UI_COLORS.GRAY_700};">${t('PLAN_LIMIT.USAGE_LABEL')}</span>
          <span style="color: ${UI_COLORS.RED_500};">${percent}%</span>
        </div>
        <div style="background: ${UI_COLORS.GRAY_200}; border-radius: 999px; height: 8px; overflow: hidden;">
          <div style="width: ${percent}%; background: ${UI_COLORS.RED_500}; height: 100%; border-radius: 999px; transition: width 0.4s ease;"></div>
        </div>
        <div style="font-size: 13px; color: ${UI_COLORS.GRAY_500}; margin-top: 10px; display: flex; justify-content: space-between;">
          <span><b>${used}</b> ${t('PLAN_LIMIT.USED_LABEL')}</span>
          <span><b>${remaining}</b> ${t('PLAN_LIMIT.REMAINING_LABEL')}</span>
        </div>
      </div>
      <div style="font-size: 14px; margin-top: 20px; color: ${UI_COLORS.GRAY_600}; text-align: left;">
        ${t('PLAN_LIMIT.UPGRADE_CTA', { label: labelLower })}
      </div>
    `,
    confirmButtonText: t('PLAN_LIMIT.CONFIRM_BUTTON'),
    showCancelButton: true,
    cancelButtonText: t('PLAN_LIMIT.CANCEL_BUTTON'),
    confirmButtonColor: CUSTOM_BG_COLOR,
    cancelButtonColor: UI_COLORS.GRAY_400,
    reverseButtons: true,
    customClass: {
      popup: 'rounded-2xl shadow-2xl border border-gray-100',
      title: 'text-xl font-bold text-gray-900',
    },
  }).then((result) => {
    if (result.isConfirmed) {
      window.location.href = '/applicationSettings';
    }
  });
};

export function PlanLimitToast() {
  return null;
}

export default PlanLimitToast;
