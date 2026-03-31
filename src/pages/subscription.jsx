import { useState, useEffect } from "react";
import { useTitle } from "../context/TitleContext";
import { useTranslation } from "react-i18next";
import SuccessPopup from "../components/SuccessPopup";
import { PLAN_EMAIL_MAP, TENANT_DEFAULTS } from "../contants/constants";
import { FiInfo, FiCheckCircle, FiCheck, FiX } from "react-icons/fi";
import planData from "./data.json";

const { monthlyPlans, yearlyPlans } = planData;

const SubscriptionPlan = () => {
  const MONTHLY = "monthly";
  const [billingCycle, setBillingCycle] = useState(MONTHLY);
  const { setTitle } = useTitle();
  const { t } = useTranslation();
  const [userEmail, setUserEmail] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [activePlan, setActivePlan] = useState(null);
  const [upgradedPlan, setUpgradedPlan] = useState("");

  useEffect(() => {
    setTitle(t("SUBSCRIPTIONPLANS.TITLE"));

    // Get user email and tenant details from localStorage
    try {
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const email = userDetails.Email || userDetails.email;
      setUserEmail(email);
     
    } catch (error) {

    }

    return () => setTitle("");

  }, [setTitle, t]);

  // Get tenant details from localStorage
  const getTenantDetails = () => {
    try {
      const userDetails = JSON.parse(localStorage.getItem("userDetails"));
      const tenantID = localStorage.getItem("tenantID");
      return {
        email: userDetails.Email || userDetails.email,
        tenantID: tenantID,
        name: userDetails.Name || userDetails.name || TENANT_DEFAULTS.NAME,
      };
    } catch (error) {
      return { email: TENANT_DEFAULTS.EMAIL, tenantID: TENANT_DEFAULTS.TENANT_ID, name: TENANT_DEFAULTS.NAME };
    }
  };

  const tenantDetails = getTenantDetails();

  const getUserPlan = () => {
    const match = PLAN_EMAIL_MAP.find((entry) => entry.email === userEmail);
    return match ? match.plan : null;
  };

  const currentUserPlan = getUserPlan();

  const currentPlans = billingCycle === MONTHLY ? monthlyPlans : yearlyPlans;
  const availablePlans = currentPlans;



  const getCardStyle = (color) => {
    const styles = {
      blue: "bg-blue-50 border-blue-200",
      purple: "bg-purple-50 border-purple-200",
      yellow: "bg-yellow-50 border-yellow-200",
    };
    return styles[color] || styles.blue;
  };

  const getBadgeStyle = (color) => {
    const styles = {
      blue: "bg-blue-100 text-blue-600",
      purple: "bg-purple-100 text-purple-600",
      yellow: "bg-yellow-100 text-yellow-600",
    };
    return styles[color] || styles.blue;
  };

  const handleUpgradePlan = (planName, planPrice, planPeriod) => {
    setUpgradedPlan(planName);
    setShowSuccessPopup(true);
  };

  const handleClosePopup = () => {
    setShowSuccessPopup(false);
    setUpgradedPlan("");
  };

  return (
    <div className="bg-gray-50 py-18 px-4">
      <div className="max-w-7xl mx-auto">



        {/* Subscription Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <FiInfo className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">{t("SUBSCRIPTIONPLANS.CHOOSE_PLAN_TITLE")}</h3>
              <p className="text-sm text-gray-600">
                {t("SUBSCRIPTIONPLANS.CHOOSE_PLAN_DESC")}
              </p>
            </div>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setBillingCycle(MONTHLY)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === MONTHLY
                ? "bg-red-500 text-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              {t("SUBSCRIPTIONPLANS.BILLING_MONTHLY")}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === "yearly"
                ? "bg-red-500 text-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              {t("SUBSCRIPTIONPLANS.BILLING_YEARLY")}
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className={`grid gap-6 ${availablePlans.length === 1 ? 'max-w-md mx-auto' : 'md:grid-cols-2 max-w-4xl mx-auto'}`}>
          {availablePlans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg border-2 ${getCardStyle(plan.color)} p-6 shadow-sm relative ${currentUserPlan === plan.name ? "ring-4 ring-green-400" : ""
                }`}
            >
              {/* Current Plan Badge - Top Right Corner */}
              {currentUserPlan === plan.name && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1">
                  <FiCheckCircle className="w-4 h-4" />
                  {t("SUBSCRIPTIONPLANS.ACTIVE")}
                </div>
              )}

              {/* Plan Name */}
              <div className="flex justify-center mb-4">
                <span className={`px-6 py-2 rounded-md text-base font-semibold ${plan.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  plan.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                  {plan.name}
                </span>
              </div>

              {/* Price */}
              <div className="text-center mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {t("SUBSCRIPTIONPLANS.CURRENCY")} {plan.price}
                </span>
              </div>
              <p className="text-center text-sm text-gray-600 mb-4">{plan.period}</p>

              {/* Free Trial Badge */}
              <div className="flex justify-center mb-6">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${getBadgeStyle(plan.color)}`}>
                  {t("SUBSCRIPTIONPLANS.FREE_TRIAL")}
                </span>
              </div>

              {/* Features List */}
              <div className="mb-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      {feature.enabled ? (
                        <FiCheck className="w-5 h-5 mr-2 flex-shrink-0 text-green-500" />
                      ) : (
                        <FiX className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                      )}
                      <span className={feature.enabled ? "text-gray-700" : "text-gray-400 line-through"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Choose Plan Button */}
              <button
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${currentUserPlan === plan.name
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 cursor-pointer"
                  }`}
                disabled={currentUserPlan === plan.name}
                onClick={() => handleUpgradePlan(plan.name, plan.price, plan.period)}
              >
                {currentUserPlan === plan.name ? t("SUBSCRIPTIONPLANS.CURRENT_PLAN") : t("SUBSCRIPTIONPLANS.UPGRADE_PLAN")}
              </button>
            </div>
          ))}
        </div>

        {/* Carousel Dots Indicator - For Future Use */}
        <div className="flex justify-center gap-2 mt-8">
          {availablePlans.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full ${currentSlide === index
                  ? "w-8 h-3 bg-gradient-to-r from-purple-500 to-pink-500"
                  : "w-3 h-3 bg-gray-300 hover:bg-gray-400"
                }`}
              aria-label={`Go to plan ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Success Popup */}
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