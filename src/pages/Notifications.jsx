import { useState, useEffect } from "react";
import {
  Upload,
  X,
  Send,
  MapPin,
  Bell,
  Clock,
  BellOff,
  Code,
  FileText,
} from "lucide-react";
import TextInputWithIcon from "../components/TextInputWithIcon";
import TextAreaWithIcon from "../components/TextAreaWithIcon";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../utils/ApiUtils";
import { SEND_NOTIFICATIONS } from "../contants/apiRoutes";
import { STATUS } from "../contants/constants";
import { showEmsg } from "../utils/ShowEmsg";
import { ToastContainer } from "react-toastify";
import { useTitle } from "../context/TitleContext";
import BackButton from "../components/BackButton";

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setTitle, setBackButton } = useTitle();

  const [activeTab, setActiveTab] = useState("notification");
  const [oPushFormData, setPushFormData] = useState({
    title: "",
    message: "",
    image: null,
    componentName: "",
    jsonData: "{\n  \"key\": \"value\"\n}",
  });
  const [nPreviewUrl, setPreviewUrl] = useState(null);
  const [pushError, setPushError] = useState(null);
  const [pushSuccess, setPushSuccess] = useState(null);
  const [pushValidationErrors, setPushValidationErrors] = useState({});
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    setTitle(t("NOTIFICATIONS.TITLE"));
    setBackButton(<BackButton onClick={() => navigate("/dashboard")} />);
    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [setTitle, setBackButton, t, navigate]);

  const handlePushChange = (e) => {
    const { name, value } = e.target;
    setPushFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPushValidationErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));

    // Clear JSON error when user types
    if (name === "jsonData") {
      setJsonError("");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPushFormData((prev) => ({
        ...prev,
        image: file,
      }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setPushFormData((prev) => ({
      ...prev,
      image: null,
    }));
    setPreviewUrl(null);
  };

  const validateJSON = (jsonString) => {
    try {
      if (jsonString.trim()) {
        JSON.parse(jsonString);
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  const validatePushForm = () => {
    const errors = {};
    setJsonError("");
    
    if (activeTab === "notification") {
      if (!oPushFormData.title || !oPushFormData.title.trim()) {
        errors.title = t("PUSH_NOTIFICATION.TITLE_LABEL");
      }
      if (!oPushFormData.message || !oPushFormData.message.trim()) {
        errors.message = t("PUSH_NOTIFICATION.MESSAGE_LABEL");
      }
    } else {
      // Silent notification validation
      if (!oPushFormData.componentName || !oPushFormData.componentName.trim()) {
        errors.componentName = t("PUSH_NOTIFICATION.COMPONENT_NAME_REQUIRED");
      }
      if (oPushFormData.jsonData && !validateJSON(oPushFormData.jsonData)) {
        setJsonError(t("PUSH_NOTIFICATION.INVALID_JSON"));
      }
    }
    
    setPushValidationErrors(errors);
    return Object.keys(errors).length === 0 && !jsonError;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset form when switching tabs
    setPushFormData({
      title: "",
      message: "",
      image: null,
      componentName: "",
      jsonData: "{\n  \"key\": \"value\"\n}",
    });
    setPreviewUrl(null);
    setPushError(null);
    setPushSuccess(null);
    setPushValidationErrors({});
    setJsonError("");
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(oPushFormData.jsonData);
      setPushFormData(prev => ({
        ...prev,
        jsonData: JSON.stringify(parsed, null, 2)
      }));
      setJsonError("");
    } catch (error) {
      setJsonError(t("PUSH_NOTIFICATION.INVALID_JSON"));
    }
  };

  const handlePushSubmit = async (e) => {
    e.preventDefault();
    setPushError(null);
    setPushSuccess(null);
    if (!validatePushForm()) return;
    
    const token = localStorage.getItem("token");
    const data = new FormData();
    
    if (activeTab === "notification") {
      data.append("title", oPushFormData.title);
      data.append("body", oPushFormData.message.trim());
      if (oPushFormData.image) {
        data.append("NotificationImage", oPushFormData.image);
      }
      data.append("type", "notification");
    } else {
      // Silent notification
      let jsonPayload = {};
      if (oPushFormData.jsonData.trim()) {
        try {
          jsonPayload = JSON.parse(oPushFormData.jsonData);
        } catch (error) {
          showEmsg(t("PUSH_NOTIFICATION.INVALID_JSON"), STATUS.ERROR);
          return;
        }
      }
      
      const silentNotificationData = {
        component: oPushFormData.componentName.trim(),
        ...jsonPayload
      };
      
      data.append("data", JSON.stringify(silentNotificationData));
      data.append("type", "silent");
    }

    try {
      const oResponse = await apiPost(SEND_NOTIFICATIONS, data, token, true);
      if (oResponse?.data?.status === STATUS.SUCCESS.toUpperCase()) {
        showEmsg(oResponse?.data?.message, STATUS.SUCCESS);
        setPushFormData({
          title: "",
          message: "",
          image: null,
          componentName: "",
          jsonData: "{\n  \"key\": \"value\"\n}",
        });
        setPreviewUrl(null);
      } else {
        showEmsg(oResponse?.data?.message, STATUS.ERROR);
        setPushError(oResponse?.data?.MESSAGE);
      }
    } catch (error) {
      showEmsg(error?.response?.data?.message);
      setPushError(error?.response?.data?.message);
    }
  };

  // Sample JSON templates
  const jsonTemplates = {
    basic: `{
  "action": "refresh",
  "timestamp": "${new Date().toISOString()}"
}`,
    navigation: `{
  "screen": "Profile",
  "params": {
    "userId": "12345",
    "tab": "settings"
  }
}`,
    dataUpdate: `{
  "type": "data_update",
  "entity": "user",
  "id": "12345",
  "changes": {
    "name": "John Doe",
    "status": "active"
  }
}`
  };

  const applyJsonTemplate = (templateKey) => {
    setPushFormData(prev => ({
      ...prev,
      jsonData: jsonTemplates[templateKey]
    }));
    setJsonError("");
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
      <ToastContainer />
      <form onSubmit={handlePushSubmit} className="space-y-8">
        {/* Error/Success Messages */}
        <div className="space-y-4">
          {pushError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {pushError}
            </div>
          )}
          {pushSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {pushSuccess}
            </div>
          )}
        </div>

        {/* Notification Type Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                type="button"
                onClick={() => handleTabChange("notification")}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors duration-200 flex items-center justify-center gap-2 ${
                  activeTab === "notification"
                    ? "border-[#5B45E0] text-[#5B45E0] bg-purple-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Bell className="h-4 w-4" />
                {t("PUSH_NOTIFICATION.NOTIFICATION_TAB") || "Notification"}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("silent")}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm border-b-2 transition-colors duration-200 flex items-center justify-center gap-2 ${
                  activeTab === "silent"
                    ? "border-[#5B45E0] text-[#5B45E0] bg-purple-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <BellOff className="h-4 w-4" />
                {t("PUSH_NOTIFICATION.SILENT_NOTIFICATION_TAB") || "Silent Notification"}
              </button>
            </nav>
          </div>

          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Send className="h-5 w-5 text-custom-bg" />
              {activeTab === "notification" 
                ? t("PUSH_NOTIFICATION.DETAILS_TITLE")
                : t("PUSH_NOTIFICATION.SILENT_DETAILS_TITLE") || "Silent Notification Details"}
            </h2>
          </div>

          <div className="p-6 space-y-8">
            {/* Main Content Grid - Inputs on left, Preview on right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Form Inputs (2/3 width on large screens) */}
              <div className="lg:col-span-2 space-y-6">
                {activeTab === "notification" ? (
                  /* Regular Notification Form */
                  <>
                    {/* Title and Message in separate rows */}
                    <div className="space-y-6">
                      <TextInputWithIcon
                        label={t("PUSH_NOTIFICATION.TITLE_LABEL")}
                        id="title"
                        name="title"
                        value={oPushFormData.title}
                        onChange={handlePushChange}
                        placeholder={t("PUSH_NOTIFICATION.TITLE_PLACEHOLDER")}
                        Icon={Send}
                        error={pushValidationErrors.title}
                        required
                      />

                      <TextAreaWithIcon
                        label={t("PUSH_NOTIFICATION.MESSAGE_LABEL")}
                        name="message"
                        value={oPushFormData.message}
                        onChange={handlePushChange}
                        placeholder={t("PUSH_NOTIFICATION.MESSAGE_PLACEHOLDER")}
                        icon={MapPin}
                        error={pushValidationErrors.message}
                        required
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">
                        {t("PUSH_NOTIFICATION.IMAGE_LABEL")}
                      </label>
                      <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[#5B45E0] transition-colors duration-200 min-h-[200px]">
                        <div className="space-y-3 text-center flex flex-col justify-center">
                          {nPreviewUrl ? (
                            <div className="relative inline-block">
                              <img
                                src={nPreviewUrl}
                                alt={t("PUSH_NOTIFICATION.IMAGE_PREVIEW_ALT")}
                                className="mx-auto h-32 w-auto object-contain rounded-lg shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors duration-200 shadow-lg"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex flex-col sm:flex-row text-sm text-gray-600 justify-center items-center gap-1">
                                <label
                                  htmlFor="image-upload"
                                  className="relative cursor-pointer bg-white rounded-md font-medium text-[#5B45E0] hover:text-[#4c39c7] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#5B45E0] transition-colors duration-200"
                                >
                                  <span>{t("COMMON.UPLOAD_A_FILE")}</span>
                                  <input
                                    id="image-upload"
                                    name="image"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                  />
                                </label>
                                <p className="text-gray-500">
                                  {t("COMMON.OR_DRAG_AND_DROP")}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Silent Notification Form */
                  <div className="space-y-6">
                    {/* Component Name */}
                    <TextInputWithIcon
                      label={t("PUSH_NOTIFICATION.COMPONENT_NAME_LABEL") || "Component Name"}
                      id="componentName"
                      name="componentName"
                      value={oPushFormData.componentName}
                      onChange={handlePushChange}
                      placeholder={t("PUSH_NOTIFICATION.COMPONENT_NAME_PLACEHOLDER") || "e.g., HomeScreen, Profile, Settings"}
                      Icon={Code}
                      error={pushValidationErrors.componentName}
                      required
                    />

                    {/* JSON Data */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          {t("PUSH_NOTIFICATION.JSON_DATA_LABEL") || "JSON Data"}
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={formatJSON}
                            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                          >
                            {t("PUSH_NOTIFICATION.FORMAT_JSON") || "Format JSON"}
                          </button>
                        </div>
                      </div>

                      {/* JSON Template Buttons */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs text-gray-500 mr-2">Templates:</span>
                        <button
                          type="button"
                          onClick={() => applyJsonTemplate('basic')}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200 transition-colors duration-200"
                        >
                          Basic
                        </button>
                        <button
                          type="button"
                          onClick={() => applyJsonTemplate('navigation')}
                          className="text-xs px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded border border-green-200 transition-colors duration-200"
                        >
                          Navigation
                        </button>
                        <button
                          type="button"
                          onClick={() => applyJsonTemplate('dataUpdate')}
                          className="text-xs px-2 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded border border-purple-200 transition-colors duration-200"
                        >
                          Data Update
                        </button>
                      </div>

                      <textarea
                        name="jsonData"
                        value={oPushFormData.jsonData}
                        onChange={handlePushChange}
                        placeholder={t("PUSH_NOTIFICATION.JSON_DATA_PLACEHOLDER") || "Enter JSON data..."}
                        className={`w-full h-64 font-mono text-sm border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#5B45E0] focus:border-transparent transition-colors duration-200 ${
                          jsonError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        style={{ 
                          fontFamily: 'monospace',
                          lineHeight: '1.5',
                          resize: 'vertical'
                        }}
                      />
                      {jsonError && (
                        <p className="text-red-600 text-sm flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {jsonError}
                        </p>
                      )}
                    </div>

                    {/* Help Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        {t("PUSH_NOTIFICATION.SILENT_NOTIFICATION_HELP_TITLE") || "About Silent Notifications"}
                      </h4>
                      <p className="text-sm text-blue-700">
                        {t("PUSH_NOTIFICATION.SILENT_NOTIFICATION_HELP") || 
                         "Silent notifications don't display a message to users. They're used to send data payloads to the app in the background. The component name specifies which part of your app should handle the data."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Mobile Notification Preview (1/3 width on large screens) */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  {t("PUSH_NOTIFICATION.PREVIEW_TITLE")}
                </label>
                <div className="flex justify-center items-center h-300">
                  {activeTab === "notification" ? (
                    (!oPushFormData.title && !oPushFormData.message && !nPreviewUrl) ? (
                      <div className="w-full h-full flex flex-col justify-center items-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Bell className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-400 italic">
                          {t("PUSH_NOTIFICATION.NO_PREVIEW")}
                        </p>
                      </div>
                    ) : (
                      <div className="w-full max-w-xs bg-[#1E1E1E] text-white rounded-xl p-3 shadow-lg border border-gray-700">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-[#5B45E0] p-1 rounded-md">
                            <Bell className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium text-sm">
                            {t("PUSH_NOTIFICATION.APP_NAME")}
                          </span>
                          <div className="ml-auto flex items-center text-xs text-gray-400 gap-1">
                            <Clock className="h-3 w-3" /> {t("PUSH_NOTIFICATION.TIME_AGO")}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {oPushFormData.title || t("PUSH_NOTIFICATION.TITLE")}
                          </p>
                          <p className="text-xs text-gray-300">
                            {oPushFormData.message || t("PUSH_NOTIFICATION.MESSAGE")}
                          </p>
                        </div>

                        {/* Image if present */}
                        {nPreviewUrl && (
                          <img
                            src={nPreviewUrl}
                            alt="Notification"
                            className="mt-2 w-full rounded-lg object-cover max-h-32 border border-gray-600"
                          />
                        )}
                      </div>
                    )
                  ) : (
                    /* Silent Notification Preview */
                    <div className="w-full h-full flex flex-col justify-center items-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <BellOff className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-400 italic mb-4">
                        {t("PUSH_NOTIFICATION.SILENT_NO_PREVIEW") || 
                         "Silent notifications work in the background and don't have a visual preview"}
                      </p>
                      
                      {/* Preview of the data that will be sent */}
                      {(oPushFormData.componentName || oPushFormData.jsonData) && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 max-w-full w-full">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Data to be sent:
                          </h5>
                          <div className="text-left">
                            {oPushFormData.componentName && (
                              <p className="text-xs text-gray-600 mb-1">
                                <span className="font-medium">Component:</span> {oPushFormData.componentName}
                              </p>
                            )}
                            {oPushFormData.jsonData && oPushFormData.jsonData.trim() !== "{\n  \"key\": \"value\"\n}" && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-700 mb-1">JSON Data:</p>
                                <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded border overflow-x-auto">
                                  {oPushFormData.jsonData}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5B45E0] transition-colors duration-200 order-2 sm:order-1"
          >
            {t("COMMON.CANCEL")}
          </button>
          <button
            type="submit"
            className="btn-primary order-1 sm:order-2 flex items-center justify-center"
          >
            <Send className="h-4 w-4 mr-2" />
            {activeTab === "notification" 
              ? t("BUTTONS.SEND_NOTIFICATION")
              : t("BUTTONS.SEND_SILENT_NOTIFICATION") || "Send Silent Notification"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Notifications;