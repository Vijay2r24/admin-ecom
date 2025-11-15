
import { useTranslation } from "react-i18next";

import { CUSTOM_COLORS } from "../contants/constants";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF5A5F05] via-white to-[#FF5A5F02] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">

        {/* Error Number */}
        <div className="mb-8">
          <h1 className="text-7xl font-black text-gray-900 mb-4">
            {t("NOTFOUND.ERROR_CODE")}
          </h1>

          {/* Divider */}
          <div
            className="w-20 h-1 mx-auto mb-5"
            style={{ backgroundColor: CUSTOM_COLORS.divider }}
          ></div>
        </div>

        {/* Message */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            {t("NOTFOUND.PAGE_NOT_FOUND")}
          </h2>
          <p className="text-gray-600 text-base leading-relaxed mb-2">
            {t("NOTFOUND.PAGE_DESCRIPTION")}
          </p>
          <p className="text-gray-500 text-sm">
            {t("NOTFOUND.PAGE_HINT")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-14">

          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="px-7 py-3 bg-white hover:bg-gray-50 text-gray-700 text-base font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 w-full sm:w-auto"
          >
            {t("NOTFOUND.GO_BACK")}
          </button>

          {/* Homepage Button */}
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              backgroundColor: CUSTOM_COLORS.primary,
              color: CUSTOM_COLORS.text,
            }}
            className="px-7 py-3 text-base font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md w-full sm:w-auto"
            onMouseOver={(e) =>
              (e.target.style.backgroundColor = CUSTOM_COLORS.primaryHover)
            }
            onMouseOut={(e) =>
              (e.target.style.backgroundColor = CUSTOM_COLORS.primary)
            }
          >
            {t("NOTFOUND.HOMEPAGE")}
          </button>
        </div>

        {/* Quick Links */}
        <div className="border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500 mb-4">
            {t("NOTFOUND.QUICK_LINKS")}
          </p>

          <div className="flex justify-center gap-5 text-sm">

            {["PRODUCTS", "CATEGORIES", "SUPPORT"].map((key) => (
              <a
                key={key}
                href={`/${key.toLowerCase()}`}
                style={{ color: CUSTOM_COLORS.primary }}
                className="font-medium transition-colors hover:underline"
                onMouseOver={(e) =>
                  (e.target.style.color = CUSTOM_COLORS.primaryHover)
                }
                onMouseOut={(e) =>
                  (e.target.style.color = CUSTOM_COLORS.primary)
                }
              >
                {t(`NOTFOUND.${key}`)}
              </a>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
};

export default NotFound;
