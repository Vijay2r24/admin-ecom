import { useState, useEffect } from "react";
import { useTitle } from "../context/TitleContext";
import { useTranslation } from "react-i18next";
import SuccessPopup from "../components/SuccessPopup";

const SubscriptionPlan = () => {
  const [billingCycle, setBillingCycle] = useState("monthly");
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
      const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
      const email = userDetails.Email || userDetails.email || "";
      setUserEmail(email);
      console.log("User email:", email); // Debug log
    } catch (error) {
      console.error("Error parsing userDetails:", error);
    }

    return () => setTitle("");

  }, [setTitle, t]);

  // Get tenant details from localStorage
  const getTenantDetails = () => {
    try {
      const userDetails = JSON.parse(localStorage.getItem("userDetails") || "{}");
      const tenantID = localStorage.getItem("tenantID") || "N/A";
      return {
        email: userDetails.Email || userDetails.email || "N/A",
        tenantID: tenantID,
        name: userDetails.Name || userDetails.name || "User"
      };
    } catch (error) {
      return { email: "N/A", tenantID: "N/A", name: "User" };
    }
  };

  const tenantDetails = getTenantDetails();

  // Function to determine user's current plan based on email
  const getUserPlan = () => {
    // Fallback to email-based plan (for demo purposes)
    if (userEmail === "b2yinfy@gmail.com") {
      return "Basic";
    } else if (userEmail === "vinayvinuus132@gmail.com") {
      return "Premium";
    } else if (userEmail === "astratechadmin@gmail.com") {
      return "Pro";
    }
    return null;
  };

  const currentUserPlan = getUserPlan();

  const monthlyPlans = [
    {
      name: "Basic",
      price: "10,000",
      period: "per monthly",
      color: "blue",
      features: [
        { text: "Max Product Creation (100)", enabled: true },
        { text: "Max Role Creation (20)", enabled: true },
        { text: "Show Dashboard Total Orders", enabled: true },
        { text: "Show Dashboard Total Customers", enabled: true },
        { text: "Show Dashboard Recent Orders", enabled: false },
        { text: "Show Dashboard Top Products", enabled: false },
        { text: "Max Store Creation (26)", enabled: true },
        { text: "Show Dashboard Total Revenue", enabled: false },
        { text: "Report Generation Access", enabled: false },
      ],
    },
    {
      name: "Premium",
      price: "15,000",
      period: "per monthly",
      color: "purple",
      features: [
        { text: "Max Product Creation (500)", enabled: true },
        { text: "Max Store Creation (200)", enabled: true },
        { text: "Max Role Creation (50)", enabled: true },
        { text: "Show Dashboard Total Revenue", enabled: true },
        { text: "Show Dashboard Total Orders", enabled: true },
        { text: "Show Dashboard Total Customers", enabled: true },
        { text: "Show Dashboard Recent Orders", enabled: true },
        { text: "Show Dashboard Top Products", enabled: false },
        { text: "Report Generation Access", enabled: false },
      ],
    },
  ];

  const yearlyPlans = [
    {
      name: "Pro",
      price: "30,000",
      period: "per yearly",
      color: "yellow",
      features: [
        { text: "Max Product Creation (1000)", enabled: true },
        { text: "Max Store Creation (500)", enabled: true },
        { text: "Max Role Creation (100)", enabled: true },
        { text: "Show Dashboard Total Revenue", enabled: true },
        { text: "Show Dashboard Total Orders", enabled: true },
        { text: "Show Dashboard Total Customers", enabled: true },
        { text: "Show Dashboard Recent Orders", enabled: true },
        { text: "Show Dashboard Top Products", enabled: true },
        { text: "Report Generation Access", enabled: true },
      ],
    },
  ];

  const currentPlans = billingCycle === "monthly" ? monthlyPlans : yearlyPlans;
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
        
        {/* Tenant Details Card */}
        {/* <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200 -mt-2">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {tenantDetails.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{tenantDetails.name}</h2>
                <p className="text-sm text-gray-600">{tenantDetails.email}</p>
                <p className="text-xs text-gray-500 mt-1">Tenant ID: {tenantDetails.tenantID}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {currentUserPlan ? `${currentUserPlan} Plan` : "No Active Plan"}
              </div>
            </div>
          </div>
        </div> */}

        {/* Subscription Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Choose the Perfect Plan for Your Business</h3>
              <p className="text-sm text-gray-600">
                Select a subscription plan that fits your needs. Upgrade anytime to unlock more features and grow your business without limits.
              </p>
            </div>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === "monthly"
                ? "bg-red-500 text-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === "yearly"
                ? "bg-red-500 text-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className={`grid gap-6 ${availablePlans.length === 1 ? 'max-w-md mx-auto' : 'md:grid-cols-2 max-w-4xl mx-auto'}`}>
          {availablePlans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg border-2 ${getCardStyle(plan.color)} p-6 shadow-sm relative ${
                currentUserPlan === plan.name ? "ring-4 ring-green-400" : ""
              }`}
            >
              {/* Current Plan Badge - Top Right Corner */}
              {currentUserPlan === plan.name && (
                <div className="absolute -top-3 -right-3 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Active
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
                  INR {plan.price}
                </span>
              </div>
              <p className="text-center text-sm text-gray-600 mb-4">{plan.period}</p>

              {/* Free Trial Badge */}
              <div className="flex justify-center mb-6">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${getBadgeStyle(plan.color)}`}>
                  7 days free trial
                </span>
              </div>

              {/* Features List */}
              <div className="mb-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      {feature.enabled ? (
                        <svg
                          className="w-5 h-5 mr-2 flex-shrink-0 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
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
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  currentUserPlan === plan.name
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 cursor-pointer"
                }`}
                disabled={currentUserPlan === plan.name}
                onClick={() => handleUpgradePlan(plan.name, plan.price, plan.period)}
              >
                {currentUserPlan === plan.name ? "Your Current Plan" : "Upgrade Plan"}
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
              className={`transition-all duration-300 rounded-full ${
                currentSlide === index
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
          title="Plan Upgrade Request"
          message={`To upgrade your plan to ${upgradedPlan}, please contact the administrator for assistance.`}
          onClose={handleClosePopup}
          autoClose={false}
          adminEmail="b2y@gmail.com"
        />
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionPlan;