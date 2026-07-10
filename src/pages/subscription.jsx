import { useState, useEffect, useCallback } from "react";
import { useTitle } from "../context/TitleContext";
import { useTranslation } from "react-i18next";
import SuccessPopup from "../components/SuccessPopup";
import { PLAN_EMAIL_MAP, SUBSCRIPTION_PLAN, STATUS } from "../contants/constants";
import { FiInfo, FiCheckCircle, FiCheck, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { apiGet } from "../utils/ApiUtils";
import { GET_ALL_SUBSCRIPTION_PLAN_FEATURES } from "../contants/apiRoutes";

const MONTHLY = "monthly";
const YEARLY  = "yearly";

const CARD_STYLES = {
  blue:   { card: "bg-blue-50 border-blue-200",     badge: "bg-blue-100 text-blue-600" },
  purple: { card: "bg-purple-50 border-purple-200", badge: "bg-purple-100 text-purple-600" },
  yellow: { card: "bg-yellow-50 border-yellow-200", badge: "bg-yellow-100 text-yellow-600" },
};
const COLOR_KEYS = ["blue", "purple", "yellow"];

const SubscriptionPlan = () => {
  const [billingCycle, setBillingCycle] = useState(MONTHLY);
  const { setTitle } = useTitle();
  const { t } = useTranslation();
  const [userEmail, setUserEmail]       = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [upgradedPlan, setUpgradedPlan] = useState("");

  const [plans, setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    setTitle(t("SUBSCRIPTIONPLANS.TITLE"));
    try {
      const ud = JSON.parse(localStorage.getItem("userDetails"));
      setUserEmail(ud?.Email || ud?.email || "");
    } catch (_) {}
    return () => setTitle("");
  }, [setTitle, t]);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res  = await apiGet(GET_ALL_SUBSCRIPTION_PLAN_FEATURES, {}, token);
        const data = res?.data;
        if (data?.status?.toLowerCase() === STATUS.SUCCESS) {
          setPlans(normalizePlans(Array.isArray(data.data) ? data.data : []));
        } else {
          setError(data?.message || t("COMMON.API_ERROR"));
        }
      } catch (err) {
        setError(err?.response?.data?.message || t("COMMON.API_ERROR"));
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [t]);

  const normalizePlans = (raw) =>
    raw
      .filter((p) => p.IsActive)
      .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
      .map((plan) => ({
        id:        plan.SubscriptionPlanID,
        name:      plan.PlanName,
        billing:   plan.BillingCycle.toLowerCase(),
        price:     parseFloat(plan.Price).toLocaleString(SUBSCRIPTION_PLAN.LOCALE_FORMAT),
        currency:  plan.Currency || SUBSCRIPTION_PLAN.DEFAULT_CURRENCY,
        trialDays: plan.TrialPeriodDays ?? 0,
        isCurrentPlan: plan.isCurrentPlan || false,
        currentPlanStatus: plan.currentPlanStatus || null,
        features:  (plan.Features || []).map((f) => {
          const val = f.SubscriptionPlanFeature?.FeatureValue ?? "";
          if (val === SUBSCRIPTION_PLAN.FEATURE_VALUE_TRUE || val === SUBSCRIPTION_PLAN.FEATURE_VALUE_FALSE)
            return { text: f.FeatureName, enabled: val === SUBSCRIPTION_PLAN.FEATURE_VALUE_TRUE };
          const num = parseInt(val, 10);
          return {
            text: `${f.FeatureName}: ${num === SUBSCRIPTION_PLAN.UNLIMITED_VALUE ? SUBSCRIPTION_PLAN.UNLIMITED_LABEL : val}`,
            enabled: true,
          };
        }),
      }));

  // Reset slide when billing cycle changes
  useEffect(() => { setCurrentSlide(0); }, [billingCycle]);

  const availablePlans = plans
    .filter((p) => p.billing === billingCycle)
    .map((p, i) => ({ ...p, color: COLOR_KEYS[i % COLOR_KEYS.length] }));

  const total = availablePlans.length;

  // Find current plan from API data
  const currentUserPlan = plans.find((p) => p.isCurrentPlan === true)?.name || null;

  const prev = useCallback(() =>
    setCurrentSlide((s) => Math.max(s - 2, 0)), []);

  const next = useCallback(() =>
    setCurrentSlide((s) => Math.min(s + 2, total - 1)), [total]);

  const handleUpgradePlan = (planName) => { setUpgradedPlan(planName); setShowSuccessPopup(true); };
  const handleClosePopup  = () => { setShowSuccessPopup(false); setUpgradedPlan(""); };

  return (
    <div className="bg-gray-50 dark:bg-black min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 border border-blue-200 dark:border-gray-700 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <FiInfo className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
                {t("SUBSCRIPTIONPLANS.CHOOSE_PLAN_TITLE")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("SUBSCRIPTIONPLANS.CHOOSE_PLAN_DESC")}
              </p>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1">
            {[MONTHLY, YEARLY].map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  billingCycle === cycle
                    ? "bg-red-500 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {t(`SUBSCRIPTIONPLANS.BILLING_${cycle.toUpperCase()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-sm">{t("COMMON.LOADING")}</div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-16 text-red-500 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* Empty */}
        {!loading && !error && total === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
            {t("SUBSCRIPTIONPLANS.NO_PLANS")}
          </div>
        )}

        {/* ── Carousel ── */}
        {!loading && !error && total > 0 && (
          <div className="relative">

            {/* Prev Arrow */}
            {total > 2 && (
              <button
                onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-2 shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                aria-label="Previous plan"
              >
                <FiChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}

            {/* 2 cards per slide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {availablePlans
                .slice(currentSlide, currentSlide + 2)
                .map((plan) => {
                const style     = CARD_STYLES[plan.color] || CARD_STYLES.blue;
                const isCurrent = plan.isCurrentPlan === true;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border-2 ${style.card} dark:bg-gray-900 dark:border-gray-700 p-6 shadow-sm relative transition-all duration-300 ${
                      isCurrent ? "ring-4 ring-green-400" : ""
                    }`}
                  >
                    {/* Active Badge */}
                    {isCurrent && (
                      <div className="absolute -top-3 -right-3 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1">
                        <FiCheckCircle className="w-4 h-4" />
                        {t("SUBSCRIPTIONPLANS.ACTIVE")}
                      </div>
                    )}

                    {/* Plan Name */}
                    <div className="flex justify-center mb-4">
                      <span className={`px-6 py-2 rounded-md text-base font-semibold ${style.badge} dark:bg-gray-800 dark:text-blue-400`}>
                        {plan.name}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="text-center mb-1">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {plan.currency} {plan.price}
                      </span>
                    </div>
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4 capitalize">{plan.billing}</p>

                    {/* Trial Badge */}
                    {plan.trialDays > 0 && (
                      <div className="flex justify-center mb-6">
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${style.badge} dark:bg-gray-800 dark:text-blue-400`}>
                          {plan.trialDays} {t("SUBSCRIPTIONPLANS.FREE_TRIAL")}
                        </span>
                      </div>
                    )}

                    {/* Features */}
                    <div className="mb-6 max-h-64 overflow-y-auto pr-1">
                      <ul className="space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start text-sm">
                            {feature.enabled ? (
                              <FiCheck className="w-4 h-4 mr-2 flex-shrink-0 text-green-500 mt-0.5" />
                            ) : (
                              <FiX className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400 mt-0.5" />
                            )}
                            <span className={feature.enabled ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500 line-through"}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <button
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        isCurrent
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                          : "bg-custom-bg text-white hover:opacity-90 cursor-pointer"
                      }`}
                      disabled={isCurrent}
                      onClick={() => handleUpgradePlan(plan.name)}
                    >
                      {isCurrent ? t("SUBSCRIPTIONPLANS.CURRENT_PLAN") : t("SUBSCRIPTIONPLANS.UPGRADE_PLAN")}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Next Arrow */}
            {total > 2 && (
              <button
                onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-2 shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                aria-label="Next plan"
              >
                <FiChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}

            {/* Dots — one dot per page (every 2 plans) */}
            {total > 2 && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: Math.ceil(total / 2) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i * 2)}
                    aria-label={`Go to page ${i + 1}`}
                    className={`transition-all duration-300 rounded-full ${
                      Math.floor(currentSlide / 2) === i
                        ? "w-8 h-3 bg-custom-bg"
                        : "w-3 h-3 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showSuccessPopup && (
        <SuccessPopup
          title={t("SUBSCRIPTIONPLANS.UPGRADE_REQUEST_TITLE")}
          message={t("SUBSCRIPTIONPLANS.UPGRADE_REQUEST_MSG", { plan: upgradedPlan })}
          onClose={handleClosePopup}
          autoClose={false}
          adminEmail="b2y@gmail.com"
        />
      )}
    </div>
  );
};

export default SubscriptionPlan;
