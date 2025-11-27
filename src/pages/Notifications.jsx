import { useState, useEffect, useCallback, useMemo } from "react";
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
import { REGEX_CONSTANTS, SCROLL_CONSTANTS, STATUS } from "../contants/constants";
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
  const [fieldValid, setFieldValid] = useState({});
  const [jsonError, setJsonError] = useState("");

  // Required fields configuration
  const requiredFields = useMemo(() => ({
    title: activeTab === "notification",
    message: activeTab === "notification",
    componentName: activeTab === "silent",
    jsonData: activeTab === "silent",
  }), [activeTab]);

  useEffect(() => {
    setTitle(t("NOTIFICATIONS.TITLE"));
    setBackButton(<BackButton onClick={() => navigate("/dashboard")} />);
    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [setTitle, setBackButton, t, navigate]);

  /**
   * Live validation functions
   */
  const validateTitle = useCallback((title) => {
    if (!title?.trim() && activeTab === "notification") {
      return t("PUSH_NOTIFICATION.VALIDATION.TITLE_REQUIRED");
    }
    if (title?.trim() && title.trim().length < 2) {
      return t("PUSH_NOTIFICATION.VALIDATION.TITLE_MIN_LENGTH");
    }
    if (title?.trim() && title.trim().length > 100) {
      return t("PUSH_NOTIFICATION.VALIDATION.TITLE_MAX_LENGTH");
    }
    return "";
  }, [t, activeTab]);

  const validateMessage = useCallback((message) => {
    if (!message?.trim() && activeTab === "notification") {
      return t("PUSH_NOTIFICATION.VALIDATION.MESSAGE_REQUIRED");
    }
    if (message?.trim() && message.trim().length < 5) {
      return t("PUSH_NOTIFICATION.VALIDATION.MESSAGE_MIN_LENGTH");
    }
    if (message?.trim() && message.trim().length > 500) {
      return t("PUSH_NOTIFICATION.VALIDATION.MESSAGE_MAX_LENGTH");
    }
    return "";
  }, [t, activeTab]);

  const validateComponentName = useCallback((componentName) => {
    if (!componentName?.trim() && activeTab === "silent") {
      return t("PUSH_NOTIFICATION.VALIDATION.COMPONENT_NAME_REQUIRED");
    }
    if (componentName?.trim() && componentName.trim().length < 2) {
      return t("PUSH_NOTIFICATION.VALIDATION.COMPONENT_NAME_MIN_LENGTH");
    }
    if (componentName?.trim() && componentName.trim().length > 50) {
      return t("PUSH_NOTIFICATION.VALIDATION.COMPONENT_NAME_MAX_LENGTH");
    }
    // Validate component name format (alphanumeric and underscores)
    if (componentName?.trim() && !REGEX_CONSTANTS.COMPONENT_NAME.test(componentName.trim())) {
      return t("PUSH_NOTIFICATION.VALIDATION.COMPONENT_NAME_INVALID");
    }
    return "";
  }, [t, activeTab]);

  const validateJsonData = useCallback((jsonData) => {
    if (!jsonData?.trim() && activeTab === "silent") {
      return t("PUSH_NOTIFICATION.VALIDATION.JSON_DATA_REQUIRED");
    }
    
    if (jsonData?.trim()) {
      try {
        JSON.parse(jsonData);
        return "";
      } catch (error) {
        return t("PUSH_NOTIFICATION.VALIDATION.JSON_DATA_INVALID");
      }
    }
    return "";
  }, [t, activeTab]);

  const validateImage = useCallback((image, previewUrl) => {
    // Image is optional, but if provided, validate it
    if (image && !previewUrl) {
      return t("PUSH_NOTIFICATION.VALIDATION.IMAGE_INVALID");
    }
    return "";
  }, [t]);

  /**
   * Live validation for a specific field
   */
  const validateField = useCallback((name, value) => {
    let error = "";
    
    switch (name) {
      case "title":
        error = validateTitle(value);
        break;
      case "message":
        error = validateMessage(value);
        break;
      case "componentName":
        error = validateComponentName(value);
        break;
      case "jsonData":
        error = validateJsonData(value);
        break;
      case "image":
        error = validateImage(value, nPreviewUrl);
        break;
      default:
        break;
    }

    setPushValidationErrors(prev => ({
      ...prev,
      [name]: error
    }));

    setFieldValid(prev => ({
      ...prev,
      [name]: !error && (value !== "" && value !== null && value !== undefined)
    }));

    // Special handling for JSON errors
    if (name === "jsonData") {
      setJsonError(error);
    }
  }, [
    validateTitle,
    validateMessage,
    validateComponentName,
    validateJsonData,
    validateImage,
    nPreviewUrl
  ]);

  /**
   * Handle field blur for additional validation
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    validateField(name, value);
  }, [validateField]);

  const handlePushChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setPushFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Validate the field immediately
    validateField(name, value);
  }, [validateField]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.match("image.*")) {
        setPushValidationErrors(prev => ({
          ...prev,
          image: t("PUSH_NOTIFICATION.VALIDATION.IMAGE_TYPE_INVALID")
        }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setPushValidationErrors(prev => ({
          ...prev,
          image: t("PUSH_NOTIFICATION.VALIDATION.IMAGE_SIZE_TOO_LARGE")
        }));
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setPushFormData((prev) => ({
        ...prev,
        image: file,
      }));
      setPreviewUrl(previewUrl);
      
      // Validate the image after setting
      setTimeout(() => validateField("image", file), 100);
    }
  }, [t, validateField]);

  const removeImage = useCallback(() => {
    setPushFormData((prev) => ({
      ...prev,
      image: null,
    }));
    setPreviewUrl(null);
    // Clear image validation
    validateField("image", null);
  }, [validateField]);

  const validateJSON = useCallback((jsonString) => {
    try {
      if (jsonString.trim()) {
        JSON.parse(jsonString);
      }
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const validatePushForm = useCallback(() => {
    const errors = {};
    
    // Validate based on active tab
    if (activeTab === "notification") {
      errors.title = validateTitle(oPushFormData.title);
      errors.message = validateMessage(oPushFormData.message);
      errors.image = validateImage(oPushFormData.image, nPreviewUrl);
    } else {
      errors.componentName = validateComponentName(oPushFormData.componentName);
      errors.jsonData = validateJsonData(oPushFormData.jsonData);
    }

    // Update field validation states
    setFieldValid({
      title: !errors.title && oPushFormData.title.trim() !== "",
      message: !errors.message && oPushFormData.message.trim() !== "",
      componentName: !errors.componentName && oPushFormData.componentName.trim() !== "",
      jsonData: !errors.jsonData && oPushFormData.jsonData.trim() !== "",
      image: !errors.image,
    });

    // Return only errors that have messages
    const filteredErrors = Object.fromEntries(
      Object.entries(errors).filter(([_, value]) => value !== "")
    );

    setPushValidationErrors(filteredErrors);
    setJsonError(errors.jsonData || "");
    
    return Object.keys(filteredErrors).length === 0;
  }, [
    activeTab,
    oPushFormData,
    nPreviewUrl,
    validateTitle,
    validateMessage,
    validateComponentName,
    validateJsonData,
    validateImage
  ]);

  const handleTabChange = useCallback((tab) => {
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
    setFieldValid({});
    setJsonError("");
  }, []);

  const formatJSON = useCallback(() => {
    try {
      const parsed = JSON.parse(oPushFormData.jsonData);
      const formattedJson = JSON.stringify(parsed, null, 2);
      setPushFormData(prev => ({
        ...prev,
        jsonData: formattedJson
      }));
      validateField("jsonData", formattedJson);
    } catch (error) {
      const errorMsg = t("PUSH_NOTIFICATION.VALIDATION.JSON_DATA_INVALID");
      setPushValidationErrors(prev => ({ ...prev, jsonData: errorMsg }));
      setJsonError(errorMsg);
    }
  }, [oPushFormData.jsonData, t, validateField]);

  const handlePushSubmit = async (e) => {
    e.preventDefault();
    setPushError(null);
    setPushSuccess(null);
    
    // Run comprehensive validation
    const isValid = validatePushForm();
    if (!isValid) {
      // Scroll to first error
      const firstErrorField = Object.keys(pushValidationErrors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.scrollIntoView({ behavior: SCROLL_CONSTANTS.BEHAVIOR,
          block: SCROLL_CONSTANTS.BLOCK, });
          element.focus();
        }
      }
      return;
    }
    
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
          showEmsg(t("PUSH_NOTIFICATION.VALIDATION.JSON_DATA_INVALID"), STATUS.ERROR);
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
        setFieldValid({});
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

  const applyJsonTemplate = useCallback((templateKey) => {
    const template = jsonTemplates[templateKey];
    setPushFormData(prev => ({
      ...prev,
      jsonData: template
    }));
    // Validate the template immediately
    setTimeout(() => validateField("jsonData", template), 100);
  }, [jsonTemplates, validateField]);

  // Helper function to render label with required asterisk
  const renderLabel = (fieldName, translationKey) => {
    const isRequired = requiredFields[fieldName];
    return (
      <span>
        {t(translationKey)}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </span>
    );
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
                        label={renderLabel("title", "PUSH_NOTIFICATION.TITLE_LABEL")}
                        id="title"
                        name="title"
                        value={oPushFormData.title}
                        onChange={handlePushChange}
                        onBlur={handleBlur}
                        placeholder={t("PUSH_NOTIFICATION.TITLE_PLACEHOLDER")}
                        Icon={Send}
                        error={pushValidationErrors.title}
                        isValid={fieldValid.title}
                        required={requiredFields.title}
                      />

                      <TextAreaWithIcon
                        label={renderLabel("message", "PUSH_NOTIFICATION.MESSAGE_LABEL")}
                        id="message"
                        name="message"
                        value={oPushFormData.message}
                        onChange={handlePushChange}
                        onBlur={handleBlur}
                        placeholder={t("PUSH_NOTIFICATION.MESSAGE_PLACEHOLDER")}
                        icon={MapPin}
                        error={pushValidationErrors.message}
                        isValid={fieldValid.message}
                        required={requiredFields.message}
                      />
                    </div>

                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">
                        {t("PUSH_NOTIFICATION.IMAGE_LABEL")}
                      </label>
                      <div className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors duration-200 min-h-[200px] ${
                        pushValidationErrors.image ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-[#5B45E0]'
                      }`}>
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
                      {pushValidationErrors.image && (
                        <p className="text-red-600 text-sm">{pushValidationErrors.image}</p>
                      )}
                    </div>
                  </>
                ) : (
                  /* Silent Notification Form */
                  <div className="space-y-6">
                    {/* Component Name */}
                    <TextInputWithIcon
                      label={renderLabel("componentName", "PUSH_NOTIFICATION.COMPONENT_NAME_LABEL") || "Component Name"}
                      id="componentName"
                      name="componentName"
                      value={oPushFormData.componentName}
                      onChange={handlePushChange}
                      onBlur={handleBlur}
                      placeholder={t("PUSH_NOTIFICATION.COMPONENT_NAME_PLACEHOLDER") || "e.g., HomeScreen, Profile, Settings"}
                      Icon={Code}
                      error={pushValidationErrors.componentName}
                      isValid={fieldValid.componentName}
                      required={requiredFields.componentName}
                    />

                    {/* JSON Data */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          {renderLabel("jsonData", "PUSH_NOTIFICATION.JSON_DATA_LABEL") || "JSON Data"}
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
                        onBlur={handleBlur}
                        placeholder={t("PUSH_NOTIFICATION.JSON_DATA_PLACEHOLDER") || "Enter JSON data..."}
                        className={`w-full h-64 font-mono text-sm border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#5B45E0] focus:border-transparent transition-colors duration-200 ${
                          jsonError ? 'border-red-300 bg-red-50' : fieldValid.jsonData ? 'border-green-300 bg-green-50' : 'border-gray-300'
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
                      {fieldValid.jsonData && !jsonError && (
                        <p className="text-green-600 text-sm flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {t("PUSH_NOTIFICATION.VALIDATION.JSON_DATA_VALID") || "Valid JSON"}
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
                            {oPushFormData.title || t("PUSH_NOTIFICATION.TITLE_LABEL")}
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
                        {t("PUSH_NOTIFICATION.SILENT_NO_PREVIEW")}
                      </p>
                      
                      {/* Preview of the data that will be sent */}
                      {(oPushFormData.componentName || oPushFormData.jsonData) && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 max-w-full w-full">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Data to be sent:
                          </h5>
                          <div className="text-left">
                            {oPushFormData.componentName && (
                              <p className={`text-xs mb-1 ${
                                fieldValid.componentName ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                <span className="font-medium">Component:</span> {oPushFormData.componentName}
                                {fieldValid.componentName && " ✓"}
                              </p>
                            )}
                            {oPushFormData.jsonData && oPushFormData.jsonData.trim() !== "{\n  \"key\": \"value\"\n}" && (
                              <div className="mt-2">
                                <p className={`text-xs font-medium mb-1 ${
                                  fieldValid.jsonData ? 'text-green-600' : 'text-gray-700'
                                }`}>
                                  JSON Data: {fieldValid.jsonData && "✓"}
                                </p>
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