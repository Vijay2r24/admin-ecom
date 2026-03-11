import React, { useState, useRef, useEffect } from "react";
import { PaintBucket, UploadCloud, Heart, ShoppingCart } from "lucide-react";
import TextInputWithIcon from "../components/TextInputWithIcon";
import electronics from "../../assets/images/electronics.jpg";
import women from "../../assets/images/women.jpg";
import men from "../../assets/images/men.jpg";
import kids from "../../assets/images/kids.jpg";
import beauty from "../../assets/images/beauty.jpg";
import accessories from "../../assets/images/accessories.jpg";
import banner1 from "../../assets/images/banner1.jpg";
import mobile from "../../assets/images/mobile.jpg";
import { useTitle } from "../context/TitleContext";
import { useTranslation } from "react-i18next";
import { CUSTOM_COLORS,STATUS } from "../contants/constants";
import { apiPatch, apiGet } from "../utils/ApiUtils";
import { UPDATE_TENANT_THEME, UPDATE_TENANT_LOGO, GET_TENANT_SETTINGS } from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import Loader from "../components/Loader";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ThemeSettings = () => {
  const { t } = useTranslation()
  const defaultColor = t(CUSTOM_COLORS.primary);
  const [primaryColor, setPrimaryColor] = useState(defaultColor);
  const [logo, setLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [currentLogoDocumentId, setCurrentLogoDocumentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setTitle } = useTitle();

  const fileInputRef = useRef(null);

  // Get tenant ID from localStorage (adjust based on your auth structure)
  const getTenantId = () => {
    return localStorage.getItem('tenantID');
  };

  // Get DocumentID from current logo - no hardcoded fallback
  const getDocumentId = () => {
    return currentLogoDocumentId;
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const updateThemeColor = async () => {
    try {
      setLoading(true);
      const tenantId = getTenantId();
      
      const response = await apiPatch(
        `${UPDATE_TENANT_THEME}/${tenantId}`,
        { ThemeColour: primaryColor }
      );
      
      // Check if response exists and has data
      if (response && response.data) {
        const message = response.data.message;
        
        // Try with different duration and position
        showEmsg(message, STATUS.SUCCESS); // 5 seconds duration
      } else {
        showEmsg(response.data.message, STATUS.SUCCESS); // 5 seconds duration
      }
    } catch (error) {
      const errorMessage = error?.message;
      showEmsg(errorMessage, STATUS.ERROR); // 5 seconds duration
    } finally {
      setLoading(false);
    }
  };

  const updateLogo = async () => {
    if (!logoFile) {
      showEmsg(t("THEMESETTINGS.SELECT_LOGO_FIRST"), STATUS.WARNING);
      return;
    }

    if (!currentLogoDocumentId) {
      showEmsg(t("THEMESETTINGS.NO_LOGO_DOCUMENT_ID"), STATUS.ERROR);
      return;
    }

    try {
      setLoading(true);
      const tenantId = getTenantId();
      const formData = new FormData();
      formData.append('data', JSON.stringify({
        documentMetadata: [{
          image: "application_logo",
          sortOrder: 1,
          DocumentID: getDocumentId()
        }]
      }));
      formData.append('application_logo', logoFile);

      const response = await apiPatch(
        `${UPDATE_TENANT_LOGO}/${tenantId}`,
        formData,
        null,
        true
      );
      
      // Check if response exists and has data
      if (response && response.data) {
        const message = response.data.message;
        showEmsg(message, STATUS.SUCCESS);
      } else {
        showEmsg(response.data.message, STATUS.SUCCESS);
      }
    } catch (error) {
      const errorMessage = error?.message;
      showEmsg(errorMessage, STATUS.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = () => {
    setPrimaryColor(defaultColor);
    setLogo(null);
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    getTenantSettings(); // Fetch tenant settings from API
  };

  const getTenantSettings = async () => {
    try {
      const response = await apiGet(GET_TENANT_SETTINGS);
      
      // Handle different response structures
      let settings = null;
      if (response?.data) {
        // Check if data is directly the settings object
        if (response.data.ThemeColour || response.data.LogoUrl) {
          settings = response.data;
        } else if (response.data.data) {
          settings = response.data.data;
        }
      }
      
      if (settings) {
        // Set theme color if available
        if (settings.ThemeColour) {
          setPrimaryColor(settings.ThemeColour);
        }
        
        // Set logo if available - LogoUrl is an array, get the first one or find one with sortOrder 1
        if (settings.LogoUrl && settings.LogoUrl.length > 0) {
          // Find logo with sortOrder 1 or take the first one
          const logo = settings.LogoUrl.find(logo => logo.sortOrder === 1) || settings.LogoUrl[0];
          if (logo && logo.documentUrl) {
            setLogo(logo.documentUrl);
            // Store the current documentId for updates
            if (logo.documentId) {
              setCurrentLogoDocumentId(logo.documentId);
            }
          }
        }
      }
    } catch (error) {
    }
  };

  const categories = [women, beauty, kids, men, accessories, mobile];
  useEffect(() => {
    setTitle(t("THEMESETTINGS.TITLE"));
    getTenantSettings(); // Fetch tenant settings on component mount
  }, [setTitle, t]); // Remove getTenantSettings from dependencies to prevent infinite calls

  return (
    <React.Fragment>
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Loader height={48} width={48} color="#FF5A5F" />
        </div>
      )}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-2 min-h-screen bg-gray-50 py-6">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="w-full lg:w-[450px] bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <TextInputWithIcon
            label={t("THEMESETTINGS.PRIMARY_COLOR")}
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            Icon={PaintBucket}
            placeholder={defaultColor}
            inputSlot={
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-7 h-7 border rounded-full cursor-pointer"
              />
            }
          />
          <div className="space-y-2">
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {t("THEMESETTINGS.STORE_LOGO")}
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                    {logo ? (
                      <img
                        src={logo}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs text-center px-1">
                        {t("THEMESETTINGS.NO_LOGO")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="px-4 py-2 border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    >
                      <UploadCloud size={18} />
                      {t("THEMESETTINGS.UPLOAD_LOGO")}
                    </button>
                    {logo && (
                      <button
                        onClick={removeLogo}
                        className="text-xs text-red-500 hover:text-red-700 font-medium text-left"
                      >
                        {t("COMMON.REMOVE")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={updateThemeColor}
              disabled={loading}
              className="flex-1 bg-custom-bg hover:bg-bg-hover disabled:opacity-50 rounded-lg py-2 text-sm text-white font-semibold transition-colors shadow-sm"
            >
              {t("COMMON.UPDATE_COLOUR")}
            </button>
            <button
              onClick={updateLogo}
              disabled={loading || !logoFile}
              className="flex-1 bg-custom-bg hover:bg-bg-hover disabled:opacity-50 rounded-lg py-2 text-sm text-white font-semibold transition-colors shadow-sm"
            >
               {t("COMMON.UPDATE_LOGO")}
            </button>
          </div>
          <button
            onClick={handleReset}
            className="w-full mt-3 bg-gray-200 hover:bg-gray-300 rounded-lg py-2 text-sm text-gray-700 font-semibold transition-colors shadow-sm"
          >
            {t("THEMESETTINGS.RESET_AS_DEFAULT")}
          </button>
        </div>


        {/* WEB PREVIEW */}
        <div className="flex-1 flex flex-col items-center min-w-0">
          <div className="w-full max-w-[800px] h-[750px] overflow-y-auto bg-white shadow-xl rounded-2xl border border-gray-200 p-0 custom-scrollbar">
            <div
              className="w-full px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20"
              style={{ backgroundColor: primaryColor }}
            >
              {/* LEFT: Logo + ShopNow */}
              <div className="flex items-center gap-2">
                {logo && (
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-10 w-10 object-contain rounded-md bg-white/20 p-1"
                  />
                )}
                <h2 className="text-xl font-bold text-white">
                  {t("THEMESETTINGS.WEB_TEXT")}
                </h2>
              </div>

              {/* RIGHT: Icons */}
              <div className="flex items-center gap-4 text-white text-xl">
                <Heart size={18} className="text-red-500 cursor-pointer" />
                <ShoppingCart size={18} className="text-gray-700 cursor-pointer" />

              </div>
            </div>


            {/* BODY */}
            <div className="p-6">
              <div className="flex justify-between items-center px-2">
                <h1 className="text-base font-bold" style={{ color: primaryColor }}>
                  {(t("THEMESETTINGS.DESCRIPTION"))}
                </h1>

                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  🔔
                </div>
              </div>

              {/* Banner */}
              <div className="mt-6">
                <div className="rounded-2xl overflow-hidden flex items-center justify-center bg-white">
                  <img src={banner1} alt="Sale Banner" className="w-full object-contain rounded-2xl" />
                </div>
              </div>

              {/* Categories */}
              <div className="mt-10">
                <h3 className="text-lg font-bold mb-4">{t("THEMESETTINGS.CATEGORIES")}</h3>
                <div className="flex gap-5 flex-wrap">
                  {categories.map((cat, i) => (
                    <div key={i} className="flex flex-col items-center w-24">
                      <div className="w-full aspect-square overflow-hidden rounded-xl shadow-md">
                        <img src={cat} alt={`Category ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs mt-2 font-semibold">{t("THEMESETTINGS.CATEGORY")} {i + 1}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trending */}
              <div className="mt-10">
                <h3 className="text-lg font-bold mb-4">{t("THEMESETTINGS.TRENDING_NOW")}</h3>
                <div className="grid grid-cols-3 gap-5">
                  {[women, accessories, kids, men, mobile, electronics].map((img, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-md border">
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-t-xl">
                        <img src={img} alt="product" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold">{t("THEMESETTINGS.PRODUCT")} {i + 1}</p>
                        <p className="text-xs font-semibold" style={{ color: primaryColor }}>
                          {t("THEMESETTINGS.COST")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={1400}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </React.Fragment>
  );
};

export default ThemeSettings;
