import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Building,
  CheckCircle,
  XCircle,
  Store,
  Users,
  Edit3,
  Save,
  Globe,
  Navigation,
  Hash,
  Eye,
  EyeOff
} from "lucide-react";
import TextInputWithIcon from "../components/TextInputWithIcon";
import SelectWithIcon from "../components/SelectWithIcon";
import PhoneInputWithIcon from "../components/PhoneInputWithIcon";
import { useTranslation } from "react-i18next";
import { FaCamera, FaTimes } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "../utils/ApiUtils";
import {
  CREATE_USER,
  GET_USER_BY_ID,
  UPDATE_USER,
} from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import { useTitle } from "../context/TitleContext";
import { COUNTRY_CODES, GENDER_OPTIONS, PERMISSIONS, STATUS } from "../contants/constants";
import md5 from "md5";
import BackButton from "../components/BackButton";
import { ToastContainer } from "react-toastify";
import userProfile from "../../assets/images/userProfile.svg";
import Loader from "../components/Loader";
import { hideLoaderWithDelay } from "../utils/loaderUtils";
import {
  fetchResource,
  fetchStatesByCountryId,
  fetchCitiesByStateId,
  clearStates,
  clearCities,
} from "../store/slices/allDataSlice";
import FloatingFooter from "../components/FloatingFooter";

// Import password utilities
import {
  passwordRequirements,
  calculatePasswordStrength,
  getPasswordStrengthText,
  validateFormPassword,
} from "../utils/passwordUtils";

// Import phone validation
import { isValidPhoneNumber } from "react-phone-number-input";

const getArray = (data) =>
  Array.isArray(data)
    ? data
    : data && Array.isArray(data.data)
      ? data.data
      : [];

// Section header component with only edit button
const SectionHeader = ({ title, isEditable, onEditToggle, sectionKey, id, t }) => (
  <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center">
    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    {id && !isEditable && (
      <button
        type="button"
        onClick={() => onEditToggle(sectionKey)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#FF5A5F] text-white hover:bg-[#e04a4f] transition-colors"
      >
        <Edit3 size={14} />
        {t("COMMON.EDIT")}
      </button>
    )}
  </div>
);

// Section footer with update and cancel buttons
const SectionFooter = ({ isEditable, onEditToggle, onUpdate, sectionKey, id, t }) =>
  id &&
  isEditable && (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
      <button
        type="button"
        onClick={() => onEditToggle(sectionKey)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors"
      >
        <Edit3 size={14} />
        {t("COMMON.CANCEL")}
      </button>
      <button
        type="button"
        onClick={() => onUpdate(sectionKey)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#FF5A5F] text-white hover:bg-[#e04a4f] transition-colors"
      >
        <Save size={14} />
        {t("COMMON.UPDATE")}
      </button>
    </div>
  );

// Data display component for non-editable mode with larger font
const DataField = ({
  label,
  value,
  placeholder = "-",
  icon: Icon = User,
}) => (
  <div className="flex flex-col mb-2">
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
      <Icon size={16} className="text-gray-500" />
      {label}
    </label>
    <div className="pl-6">
      <span className="text-gray-900 text-base font-medium align-middle">
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
      </span>
    </div>
  </div>
);

// Data display component for select fields in non-editable mode
const DataSelectField = ({
  label,
  value,
  options,
  multiple = false,
  placeholder = "-",
  icon: Icon = Building,
  getDisplayValue,
  displayName, // Fallback name to show immediately
}) => (
  <div className="flex flex-col mb-2">
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
      <Icon size={16} className="text-gray-500" />
      {label}
    </label>
    <div className="pl-6">
      <span className="text-gray-900 text-base font-medium align-middle">
        {displayName || getDisplayValue(value, options, multiple) || (
          <span className="text-gray-400 italic">{placeholder}</span>
        )}
      </span>
    </div>
  </div>
);

// Data display component for password fields in non-editable mode
const DataPasswordField = ({ label, placeholder = "********", icon: Icon = Lock }) => (
  <div className="flex flex-col mb-2">
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
      <Icon size={16} className="text-gray-500" />
      {label}
    </label>
    <div className="pl-6">
      <span className="text-gray-900 text-base font-medium align-middle">
        {placeholder}
      </span>
    </div>
  </div>
);

const AddUser = () => {
  const [oFormData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    CountryCode: "",
    role: "",
    stores: [],
    password: "",
    confirmPassword: "",
    streetAddress: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    countryName: "",
    stateName: "",
    cityName: "",
    documentIds: [],
    IsActive: true,
    gender: "",
    roleName: "",
  });
  const [nProfileImage, setProfileImage] = useState(null);
  const [nProfileImagePreview, setProfileImagePreview] = useState(null);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [removedDocumentIds, setRemovedDocumentIds] = useState([]);
  const { t } = useTranslation();
  const { id } = useParams();
  const [bImgLoading, setImgLoading] = useState(true);
  const [bImgError, setImgError] = useState(false);
  // NEW: Form data loading state for edit mode
  const [isFormDataLoading, setIsFormDataLoading] = useState(!!id);
  const [fetchUserError, setFetchUserError] = useState("");

  const [bShowConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ShowPassword, setShowPassword] = useState(false);


  // Edit states for each section
  const [isPersonalInfoEditable, setIsPersonalInfoEditable] = useState(!id);
  const [isAccountSecurityEditable, setIsAccountSecurityEditable] = useState(
    !id
  );
  const [isAddressInfoEditable, setIsAddressInfoEditable] = useState(!id);

  // Live validation states
  const [oFieldValid, setFieldValid] = useState({});
  const [oFieldTouched, setFieldTouched] = useState({});

  // Required fields configuration
  const requiredFields = {
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    gender: true,
    role: true,
    stores: true,
    password: !id, // Required only for new users
    confirmPassword: !id, // Required only for new users
    streetAddress: true,
    country: true,
    state: true,
    city: true,
    pincode: true,
  };

  // Redux hooks
  const dispatch = useDispatch();

  // Get data from the allDataSlice
  const rolesData = useSelector((state) => state.allData.resources.roles || {});
  const storesData = useSelector(
    (state) => state.allData.resources.stores || {}
  );
  const countriesData = useSelector(
    (state) => state.allData.resources.countries || {}
  );
  const statesData = useSelector(
    (state) => state.allData.resources.states || {}
  );
  const citiesData = useSelector(
    (state) => state.allData.resources.cities || {}
  );

  const roles = rolesData.data || [];
  const stores = storesData.data || [];
  const countries = countriesData.data || [];
  const states = statesData.data || [];
  const cities = citiesData.data || [];

  const rolesLoading = rolesData.loading || false;
  const storesLoading = storesData.loading || false;
  const countriesLoading = countriesData.loading || false;
  const statesLoading = statesData.loading || false;
  const citiesLoading = citiesData.loading || false;

  const rolesError = rolesData.error || null;
  const storesError = storesData.error || null;
  const countriesError = countriesData.error || null;
  const statesError = statesData.error || null;
  const citiesError = citiesData.error || null;

  const [oErrors, setErrors] = useState({});
  const { setTitle, setBackButton } = useTitle();
  const navigate = useNavigate();
  const [bSubmitting, setSubmitting] = useState(false);

  // Get permissions from localStorage
  const userPermissions = JSON.parse(
    localStorage.getItem("PermissionIDs") || "[]"
  );

  // Check if user has Edit Role permission
  const hasEditRolePermission = userPermissions.includes(PERMISSIONS.EDIT_ROLE);

  // Check if user has Edit Store permission
  const hasEditStorePermission = userPermissions.includes(
    PERMISSIONS.EDIT_STORE
  );

  // Determine if we should show the entire Account Security section
  const shouldShowAccountSecuritySection =
    !id || (id && (hasEditRolePermission || hasEditStorePermission));

  // Gender options
  const genderOptions = useMemo(
    () =>
      GENDER_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      })),
    [t]
  );

  // Refs to track if data has been fetched to prevent multiple API calls
  const hasFetchedRoles = useRef(false);
  const hasFetchedStores = useRef(false);
  const hasFetchedCountries = useRef(false);
  const hasFetchedUser = useRef(false);
  const hasFetchedInitialData = useRef(false);

  // Password strength calculation using the imported utility
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(oFormData.password),
    [oFormData.password]
  );

  // Get password strength text using the imported utility
  const passwordStrengthText = useMemo(
    () => getPasswordStrengthText(passwordStrength, t),
    [passwordStrength, t]
  );

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

  /**
   * Live validation functions
   */
  const validateFirstName = (firstName) => {
    if (isFormDataLoading && id && !firstName) return "";
    if (!firstName?.trim()) {
      return t("ADD_USER.VALIDATION.FIRST_NAME_REQUIRED");
    }
    if (firstName.trim().length < 2) {
      return t("ADD_USER.VALIDATION.FIRST_NAME_MIN_LENGTH");
    }
    if (firstName.trim().length > 50) {
      return t("ADD_USER.VALIDATION.FIRST_NAME_MAX_LENGTH");
    }
    return "";
  };

  const validateLastName = (lastName) => {
    if (isFormDataLoading && id && !lastName) return "";
    if (!lastName?.trim()) {
      return t("ADD_USER.VALIDATION.LAST_NAME_REQUIRED");
    }
    if (lastName.trim().length < 1) {
      return t("ADD_USER.VALIDATION.LAST_NAME_MIN_LENGTH");
    }
    if (lastName.trim().length > 50) {
      return t("ADD_USER.VALIDATION.LAST_NAME_MAX_LENGTH");
    }
    return "";
  };

  const validateEmail = (email) => {
    if (isFormDataLoading && id && !email) return "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email?.trim()) {
      return t("ADD_USER.VALIDATION.EMAIL_REQUIRED");
    }
    if (!emailRegex.test(email)) {
      return t("ADD_USER.VALIDATION.EMAIL_INVALID");
    }
    return "";
  };

  const validatePhone = (phone) => {
    if (isFormDataLoading && id && !phone) return "";
    if (!phone?.trim()) {
      return t("ADD_USER.PHONE_REQUIRED");
    }
    if (!isValidPhoneNumber(phone)) {
      return t("ADD_USER.VALIDATION.PHONE_INVALID");
    }
    if (!phone.startsWith("+")) {
      return t("ADD_USER.VALIDATION.COUNTRY_CODE_REQUIRED");
    }
    const phoneWithoutSpaces = phone.replace(/\s/g, "");
    const digitsAfterPlus = phoneWithoutSpaces.substring(1);
    if (digitsAfterPlus.length < 8) {
      return t("ADD_USER.VALIDATION.PHONE_TOO_SHORT");
    }
    const countryCodeMatch = phone.match(/^\+\d{1,3}/);
    if (!countryCodeMatch) {
      return t("ADD_USER.VALIDATION.INVALID_COUNTRY_CODE");
    }
    return "";
  };

  const validateGender = (gender) => {
    if (isFormDataLoading && id && !gender) return "";
    if (!gender) {
      return t("ADD_USER.VALIDATION.GENDER_REQUIRED");
    }
    return "";
  };

  const validateRole = (role) => {
    if (isFormDataLoading && id && !role) return "";
    if (!role && shouldShowAccountSecuritySection && isAccountSecurityEditable) {
      return t("ADD_USER.VALIDATION.ROLE_REQUIRED");
    }
    return "";
  };

  const validateStores = (stores) => {
    if (isFormDataLoading && id && (!stores || stores.length === 0)) return "";
    if ((!stores || stores.length === 0) && shouldShowAccountSecuritySection && isAccountSecurityEditable) {
      return t("ADD_USER.VALIDATION.STORES_REQUIRED");
    }
    return "";
  };

  const validateStreetAddress = (address) => {
    if (isFormDataLoading && id && !address) return "";
    if (!address?.trim()) {
      return t("ADD_USER.VALIDATION.ADDRESS_REQUIRED");
    }
    if (address.trim().length < 5) {
      return t("ADD_USER.VALIDATION.ADDRESS_MIN_LENGTH");
    }
    return "";
  };

  const validateCountry = (country) => {
    if (isFormDataLoading && id && !country) return "";
    if (!country) {
      return t("ADD_USER.VALIDATION.COUNTRY_REQUIRED");
    }
    return "";
  };

  const validateState = (state) => {
    if (isFormDataLoading && id && !state) return "";
    if (!state) {
      return t("ADD_USER.VALIDATION.STATE_REQUIRED");
    }
    return "";
  };

  const validateCity = (city) => {
    if (isFormDataLoading && id && !city) return "";
    if (!city) {
      return t("ADD_USER.VALIDATION.CITY_REQUIRED");
    }
    return "";
  };

  const validatePincode = (pincode) => {
    if (isFormDataLoading && id && !pincode) return "";
    if (!pincode?.trim()) {
      return t("ADD_USER.VALIDATION.PINCODE_REQUIRED");
    }
    const pincodeRegex = /^[A-Z0-9\s-]{3,10}$/i;
    if (!pincodeRegex.test(pincode.trim())) {
      return t("ADD_USER.VALIDATION.PINCODE_INVALID");
    }
    return "";
  };

  /**
   * Live validation for a specific field
   */
  const validateField = useCallback((name, value, forceShowError = false) => {
    let error = "";

    switch (name) {
      case "firstName":
        error = validateFirstName(value);
        break;
      case "lastName":
        error = validateLastName(value);
        break;
      case "email":
        error = validateEmail(value);
        break;
      case "phone":
        error = validatePhone(value);
        break;
      case "gender":
        error = validateGender(value);
        break;
      case "role":
        error = validateRole(value);
        break;
      case "stores":
        error = validateStores(value);
        break;
      case "streetAddress":
        error = validateStreetAddress(value);
        break;
      case "country":
        error = validateCountry(value);
        break;
      case "state":
        error = validateState(value);
        break;
      case "city":
        error = validateCity(value);
        break;
      case "pincode":
        error = validatePincode(value);
        break;
      case "password":
      case "confirmPassword":
        const passwordErrors = validateFormPassword(
          name === "password" ? value : oFormData.password,
          name === "confirmPassword" ? value : oFormData.confirmPassword,
          t,
          !id
        );
        error = passwordErrors[name] || "";
        break;
      default:
        break;
    }

    // Only show error if field is touched or we're forcing the error display
    const shouldShowError = forceShowError || oFieldTouched[name];

    setErrors(prev => ({
      ...prev,
      [name]: shouldShowError ? error : ""
    }));

    setFieldValid(prev => ({
      ...prev,
      [name]: !error && (value !== "" && value !== null && value !== undefined)
    }));

    return error;
  }, [oFormData.password, oFormData.confirmPassword, t, id, shouldShowAccountSecuritySection, isAccountSecurityEditable, oFieldTouched]);

  /**
   * Mark field as touched
   */
  const markFieldTouched = useCallback((fieldName) => {
    setFieldTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
    // Validate the field when it's touched (force error display)
    validateField(fieldName, oFormData[fieldName], true);
  }, [oFormData, validateField]);

  /**
   * Handle field blur for additional validation
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    markFieldTouched(name);
    validateField(name, value, true);
  }, [markFieldTouched, validateField]);

  /**
   * Handle select field changes
   */
  const handleSelectChange = useCallback((e) => {
    const { name, value } = e.target;

    let processedValue = value;
    if (Array.isArray(processedValue)) {
      processedValue = processedValue.filter(Boolean);
    }

    if (name === "country") {
      setFormData((prev) => ({
        ...prev,
        [name]: processedValue,
        state: "",
        city: "",
        stateName: "",
        cityName: "",
      }));
      validateField(name, processedValue, true);
      validateField("state", "", false);
      validateField("city", "", false);
    } else if (name === "state") {
      setFormData((prev) => ({
        ...prev,
        [name]: processedValue,
        city: "",
        cityName: "",
      }));
      validateField(name, processedValue, true);
      validateField("city", "", false);
    } else {
      setFormData((prev) => ({ ...prev, [name]: processedValue }));
      validateField(name, processedValue, true);
    }

    // Mark field as touched
    setFieldTouched(prev => ({
      ...prev,
      [name]: true
    }));
  }, [validateField]);

  /**
   * Handle select blur - specifically for dropdowns
   */
  const handleSelectBlur = useCallback((fieldName) => {
    markFieldTouched(fieldName);
    validateField(fieldName, oFormData[fieldName], true);
  }, [markFieldTouched, validateField, oFormData]);

  useEffect(() => {
    setTitle(id ? t("USERS.EDIT_USER") : t("USERS.ADD_NEW_USER"));
    setBackButton(<BackButton onClick={() => navigate("/users")} />);
    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [setTitle, setBackButton, t, id, navigate]);

  const validate = useCallback(() => {
    const errors = {};

    // Personal Info validation
    if (isPersonalInfoEditable) {
      const firstNameError = validateFirstName(oFormData.firstName);
      if (firstNameError) errors.firstName = firstNameError;

      const lastNameError = validateLastName(oFormData.lastName);
      if (lastNameError) errors.lastName = lastNameError;

      const emailError = validateEmail(oFormData.email);
      if (emailError) errors.email = emailError;

      const phoneError = validatePhone(oFormData.phone);
      if (phoneError) errors.phone = phoneError;

      const genderError = validateGender(oFormData.gender);
      if (genderError) errors.gender = genderError;
    }

    // Account Security validation
    if (shouldShowAccountSecuritySection && isAccountSecurityEditable) {
      const roleError = validateRole(oFormData.role);
      if (roleError) errors.role = roleError;

      const storesError = validateStores(oFormData.stores);
      if (storesError) errors.stores = storesError;

      // Password validation only for new users or when editing password
      if (!id || (id && oFormData.password)) {
        const passwordErrors = validateFormPassword(
          oFormData.password,
          oFormData.confirmPassword,
          t,
          !id
        );
        Object.assign(errors, passwordErrors);
      }
    }

    // Address Info validation
    if (isAddressInfoEditable) {
      const addressError = validateStreetAddress(oFormData.streetAddress);
      if (addressError) errors.streetAddress = addressError;

      const countryError = validateCountry(oFormData.country);
      if (countryError) errors.country = countryError;

      const stateError = validateState(oFormData.state);
      if (stateError) errors.state = stateError;

      const cityError = validateCity(oFormData.city);
      if (cityError) errors.city = cityError;

      const pincodeError = validatePincode(oFormData.pincode);
      if (pincodeError) errors.pincode = pincodeError;
    }

    return errors;
  }, [
    oFormData,
    t,
    id,
    shouldShowAccountSecuritySection,
    isAccountSecurityEditable,
    isPersonalInfoEditable,
    isAddressInfoEditable
  ]);

  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      if (!countries.length && !countriesLoading) {
        hasFetchedCountries.current = true;
        dispatch(fetchResource({ key: "countries" }));
      }
      if (
        !roles.length &&
        !rolesLoading &&
        !hasFetchedRoles.current &&
        shouldShowAccountSecuritySection
      ) {
        hasFetchedRoles.current = true;
        dispatch(
          fetchResource({
            key: "roles",
            params: { searchText: "" },
          })
        );
      }
      if (
        !stores.length &&
        !storesLoading &&
        !hasFetchedStores.current &&
        shouldShowAccountSecuritySection
      ) {
        hasFetchedStores.current = true;
        dispatch(
          fetchResource({
            key: "stores",
            params: { searchText: "" },
          })
        );
      }
    }
  }, [
    dispatch,
    countries,
    countriesLoading,
    roles,
    rolesLoading,
    stores,
    storesLoading,
    shouldShowAccountSecuritySection,
  ]);

  useEffect(() => {
    if (oFormData.country) {
      // Find the selected country to get its code
      const countriesArray = getArray(countries);
      const selectedCountry = countriesArray.find(
        (c) => String(c.CountryID) === String(oFormData.country)
      );

      if (selectedCountry && selectedCountry.CountryCode) {
        dispatch(fetchStatesByCountryId(selectedCountry.CountryCode))
          .unwrap()
          .then((result) => {
            // States loaded successfully
          })
          .catch((error) => { });
      }
    } else {
      dispatch(clearStates());
      setFormData((prev) => ({ ...prev, state: "", city: "" }));
    }
  }, [dispatch, oFormData.country, countries]);

  useEffect(() => {
    if (oFormData.state && oFormData.country) {
      // Find the selected country and state to get their codes
      const countriesArray = getArray(countries);
      const selectedCountry = countriesArray.find(
        (c) => String(c.CountryID) === String(oFormData.country)
      );

      const statesArray = getArray(states);
      const selectedState = statesArray.find(
        (s) => String(s.StateID) === String(oFormData.state)
      );

      if (selectedCountry && selectedCountry.CountryCode && selectedState && selectedState.StateCode) {
        dispatch(fetchCitiesByStateId({
          countryCode: selectedCountry.CountryCode,
          stateCode: selectedState.StateCode
        }))
          .unwrap()
          .then((result) => {
            // Cities loaded successfully
          })
          .catch((error) => { });
      }
    } else {
      dispatch(clearCities());
      setFormData((prev) => ({ ...prev, city: "" }));
    }
  }, [dispatch, oFormData.state, oFormData.country, countries, states]);

  // Extract country code from phone number
  const extractCountryCode = (phoneNumber) => {
    if (!phoneNumber) return "";

    // The phone number from react-phone-number-input is in E.164 format (+911234567890)
    // Extract the country code (everything between + and the first set of digits)
    const match = phoneNumber.match(/^\+(.+?)(?=\d)/);
    return match ? match[1] : "";
  };

  // Updated handleChange for phone input
  const handlePhoneChange = useCallback(
    (data) => {
      // Normalize data to ensure it always has consistent structure
      const formatted = data?.formatted || "";
      const countryCode = data?.countryCode || "";
      const phoneNumber = data?.phoneNumber || "";

      setFormData((prev) => ({
        ...prev,
        phone: formatted,
        CountryCallingCode: countryCode,
        PhoneNumber: phoneNumber,
      }));

      validateField("phone", formatted, oFieldTouched.phone);
    },
    [validateField, oFieldTouched.phone]
  );

  // Optimized fetchUser function - FIXED to handle phone number binding properly
  const fetchUser = useCallback(async () => {
    if (!id || hasFetchedUser.current) return;

    hasFetchedUser.current = true;
    setIsFormDataLoading(true);
    const token = localStorage.getItem("token");

    try {
      const oResponse = await apiGet(`${GET_USER_BY_ID}/${id}`, {}, token);
      const resData = oResponse.data;

      if (resData?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase() && resData.data) {
        const user = resData.data;

        let formattedPhone = "";
        const callingCode = user.CountryCallingCode || user.CountryCode || "";

        if (user.PhoneNumber && callingCode) {
          // Format: "+91 63644 37189" (with spaces for better readability)
          const cleanPhone = user.PhoneNumber.replace(/\D/g, ""); // Remove any non-digits
          formattedPhone = `${callingCode} ${cleanPhone}`;
        } else if (user.PhoneNumber && user.PhoneNumber.startsWith("+")) {
          // If phone number already has country code but no separate CountryCode field
          formattedPhone = user.PhoneNumber;
        } else if (user.PhoneNumber) {
          // If no country code but has phone number, use default country code
          formattedPhone = `+${COUNTRY_CODES.INDIA} ${user.PhoneNumber}`;
        }

        // Set basic form data immediately
        setFormData((prev) => ({
          ...prev,
          firstName: user.FirstName || "",
          lastName: user.LastName || "",
          email: user.Email || "",
          phone: formattedPhone, // Use formatted phone number
          CountryCallingCode: callingCode, // Ensure calling code is set (e.g. +91)
          CountryCode: user.CountryCode || "", // ISO code (e.g. IN)
          StateCode: user.StateCode || "",
          CityName: user.CityName || "",
          PhoneNumber: user.PhoneNumber || "", // Keep raw phone number
          role: user.RoleID || "",
          IsActive: user.IsActive !== undefined ? user.IsActive : true,
          stores: user.Stores ? user.Stores.map((store) => store.StoreId) : [],
          streetAddress: user.AddressLine || "",
          pincode: user.Zipcode || "",
          countryName: user.CountryName || "",
          stateName: user.StateName || "",
          cityName: user.CityName || "",
          documentIds: user.ProfileImageUrl
            ? user.ProfileImageUrl.map((doc) => doc.documentId)
            : [],
          gender: user.Gender || "",
          roleName: user.RoleName || "",
        }));

        // Mark all fields as touched for edit mode to show validation immediately
        setTimeout(() => {
          const fieldsToValidate = [
            "firstName", "lastName", "email", "phone", "gender",
            "role", "stores", "streetAddress", "pincode",
            "country", "state", "city"
          ];
          fieldsToValidate.forEach(field => {
            markFieldTouched(field);
            validateField(field,
              field === "firstName" ? user.FirstName || "" :
                field === "lastName" ? user.LastName || "" :
                  field === "email" ? user.Email || "" :
                    field === "phone" ? formattedPhone :
                      field === "gender" ? user.Gender || "" :
                        field === "role" ? user.RoleID || "" :
                          field === "stores" ? (user.Stores ? user.Stores.map((store) => store.StoreId) : []) :
                            field === "streetAddress" ? user.AddressLine || "" :
                              field === "pincode" ? user.Zipcode || "" :
                                "",
              true
            );
          });
        }, 100);

        // For the profile image
        if (user.ProfileImageUrl && user.ProfileImageUrl.length > 0) {
          setImgLoading(true);
          setProfileImagePreview(user.ProfileImageUrl[0].documentUrl);
          setExistingDocuments(user.ProfileImageUrl);
        } else {
          setImgLoading(false);
          setExistingDocuments([]);
        }

        // Set loading to false after a slight delay
        setTimeout(() => {
          setIsFormDataLoading(false);
        }, 1000);

        // Store location names for later population
        const locationData = {
          countryName: user.CountryName,
          stateName: user.StateName,
          cityName: user.CityName,
        };

        // Find and set country ID if available
        const countriesArray = getArray(countries);
        if (countriesArray.length > 0) {
          const foundCountry = countriesArray.find(
            (c) => c.CountryName === user.CountryName
          );
          if (foundCountry) {
            setFormData((prev) => ({
              ...prev,
              country: foundCountry.CountryID,
            }));
            markFieldTouched("country");
            validateField("country", foundCountry.CountryID, true);
          }
        } else {
          // If countries aren't loaded yet, store the names for later
          setTimeout(() => {
            setFormData((prev) => ({
              ...prev,
              countryName: user.CountryName,
              stateName: user.StateName,
              cityName: user.CityName,
            }));
          }, 100);
        }

        setRemovedDocumentIds([]);
        setFetchUserError("");
      } else {
        setIsFormDataLoading(false);
        setFetchUserError(resData?.message || t("COMMON.FAILED_OPERATION"));
      }
    } catch (error) {
      setIsFormDataLoading(false);
      const backendMessage = error?.response?.data?.message;
      setFetchUserError(backendMessage || t("COMMON.ERROR_MESSAGE"));
    }
  }, [id, t, countries, validateField, markFieldTouched]);

  useEffect(() => {
    const populateStateAndCity = async () => {
      if (
        !id ||
        !oFormData.country ||
        !oFormData.stateName ||
        !oFormData.countryName
      )
        return;

      try {
        const statesArray = getArray(states);
        const foundState = statesArray.find(
          (s) => s.StateName === oFormData.stateName
        );

        if (foundState && !oFormData.state) {
          setFormData((prev) => ({
            ...prev,
            state: foundState.StateID,
          }));
          markFieldTouched("state");
          validateField("state", foundState.StateID, true);
        }
      } catch (error) { }
    };

    populateStateAndCity();
  }, [
    id,
    oFormData.country,
    oFormData.stateName,
    oFormData.countryName,
    states,
    validateField,
    markFieldTouched,
  ]);

  useEffect(() => {
    const populateCity = async () => {
      if (!id || !oFormData.state || !oFormData.cityName) return;

      try {
        const citiesArray = getArray(cities);
        const foundCity = citiesArray.find(
          (c) => c.CityName === oFormData.cityName
        );

        if (foundCity && !oFormData.city) {
          setFormData((prev) => ({
            ...prev,
            city: foundCity.CityID,
          }));
          markFieldTouched("city");
          validateField("city", foundCity.CityID, true);
        }
      } catch (error) { }
    };

    populateCity();
  }, [id, oFormData.state, oFormData.cityName, cities, validateField, markFieldTouched]);

  useEffect(() => {
    if (id && !hasFetchedUser.current && countries.length > 0) {
      const timer = setTimeout(() => {
        fetchUser();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [id, countries.length, fetchUser]);

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      if (name === "country") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          state: "",
          city: "",
          stateName: "",
          cityName: "",
        }));
        validateField(name, value, oFieldTouched[name]);
        validateField("state", "", oFieldTouched.state);
        validateField("city", "", oFieldTouched.city);
      } else if (name === "state") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          city: "",
          cityName: "",
        }));
        validateField(name, value, oFieldTouched[name]);
        validateField("city", "", oFieldTouched.city);
      }
      // For all other fields
      else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
        validateField(name, value, oFieldTouched[name]);
      }

      // Mark field as touched
      markFieldTouched(name);
    },
    [validateField, markFieldTouched, oFieldTouched]
  );

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setRemovedDocumentIds([]);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleClose = useCallback(() => {
    navigate("/users");
  }, [navigate]);

  // Function to get display value for select fields
  const getDisplayValue = (value, options, isMultiple = false) => {
    if (!value || value === "" || (isMultiple && value.length === 0))
      return "-";

    if (isMultiple && Array.isArray(value)) {
      return value
        .map((val) => {
          const option = options.find((opt) => opt.value == val);
          return option ? option.label : val;
        })
        .join(", ");
    }

    const option = options.find((opt) => opt.value == value);
    return option ? option.label : value;
  };

  // Function to handle section update
  const handleSectionUpdate = async (section) => {
    // Mark all fields in the section as touched before validation
    const sectionFields = {
      personal: ['firstName', 'lastName', 'email', 'phone', 'gender'],
      account: ['role', 'stores', 'password', 'confirmPassword'],
      address: ['streetAddress', 'country', 'state', 'city', 'pincode']
    };

    sectionFields[section].forEach(field => {
      markFieldTouched(field);
    });

    const validationErrors = validate();

    // Filter errors only for the current section
    const sectionErrors = {};
    switch (section) {
      case "personal":
        if (validationErrors.firstName)
          sectionErrors.firstName = validationErrors.firstName;
        if (validationErrors.lastName)
          sectionErrors.lastName = validationErrors.lastName;
        if (validationErrors.email)
          sectionErrors.email = validationErrors.email;
        if (validationErrors.phone)
          sectionErrors.phone = validationErrors.phone;
        if (validationErrors.gender)
          sectionErrors.gender = validationErrors.gender;
        break;
      case "account":
        if (validationErrors.role) sectionErrors.role = validationErrors.role;
        if (validationErrors.stores)
          sectionErrors.stores = validationErrors.stores;
        if (validationErrors.password)
          sectionErrors.password = validationErrors.password;
        if (validationErrors.confirmPassword)
          sectionErrors.confirmPassword = validationErrors.confirmPassword;
        break;
      case "address":
        if (validationErrors.streetAddress)
          sectionErrors.streetAddress = validationErrors.streetAddress;
        if (validationErrors.country)
          sectionErrors.country = validationErrors.country;
        if (validationErrors.state)
          sectionErrors.state = validationErrors.state;
        if (validationErrors.city) sectionErrors.city = validationErrors.city;
        if (validationErrors.pincode)
          sectionErrors.pincode = validationErrors.pincode;
        break;
    }

    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      return;
    }

    // If no errors, submit the form
    await handleSubmit();
  };

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();

      // Mark all required fields as touched before validation
      Object.keys(requiredFields).forEach(field => {
        if (requiredFields[field]) {
          markFieldTouched(field);
        }
      });

      const validationErrors = validate();
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) return;

      setSubmitting(true);
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      const formData = new FormData();

      let documentMetadata = [];
      if (nProfileImage) {
        if (existingDocuments.length > 0 && existingDocuments[0]?.documentId) {
          documentMetadata.push({
            image: "profile-image",
            sortOrder: 1,
            DocumentID: existingDocuments[0].documentId,
          });
        } else {
          documentMetadata.push({
            image: "profile-image",
            sortOrder: 1,
          });
        }
      } else if (removedDocumentIds.length > 0) {
        const remainingDocuments = existingDocuments.filter(
          (doc) => !removedDocumentIds.includes(doc.documentId)
        );
        documentMetadata = remainingDocuments.map((doc, index) => ({
          image: "profile-image",
          sortOrder: doc.sortOrder || index + 1,
          DocumentID: doc.documentId,
        }));
      }

      const selectedCountry = getArray(countries).find(
        (c) => String(c.CountryID) === String(oFormData.country)
      );
      const selectedState = getArray(states).find(
        (s) => String(s.StateID) === String(oFormData.state)
      );
      const selectedCity = getArray(cities).find(
        (c) => String(c.CityID) === String(oFormData.city)
      );

      // Base user data structure restructured as per user request
      const userData = {
        FirstName: oFormData.firstName || "",
        LastName: oFormData.lastName || "",
        Email: oFormData.email || "",
        Password: oFormData.password ? md5(oFormData.password) : "",
        CountryCallingCode: oFormData.CountryCallingCode || "",
        PhoneNumber: oFormData.PhoneNumber || "",
        Gender: oFormData.gender || "",
        IsActive: oFormData.IsActive !== undefined ? oFormData.IsActive : true,
        RoleID: oFormData.role || "",
        StoreIDs: oFormData.stores || [],
        AddressLine: oFormData.streetAddress || "",
        CityName: selectedCity ? selectedCity.CityName : (oFormData.cityName || ""),
        StateCode: selectedState ? selectedState.StateCode : (oFormData.StateCode || ""),
        CountryCode: selectedCountry ? selectedCountry.CountryCode : (oFormData.CountryCode || ""),
        Zipcode: oFormData.pincode || "",
        documentMetadata: documentMetadata,
      };

      // Add UserID for update and handle password for edit mode
      if (id) {
        userData.UserID = id;
        userData.UpdatedBy = userId;

        // In update mode, if password is not touched, remove it from payload
        if (!oFormData.password || oFormData.password.trim() === "") {
          delete userData.Password;
        }
      } else {
        userData.CreatedBy = userId;
      }

      formData.append("data", JSON.stringify(userData));

      if (nProfileImage) {
        formData.append("profile-image", nProfileImage);
      }

      try {
        let oResponse;

        if (id) {
          oResponse = await apiPut(UPDATE_USER, formData, token, true);
        } else {
          oResponse = await apiPost(CREATE_USER, formData, token, true);
        }

        const resData = oResponse?.data;

        if (resData?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
          setRemovedDocumentIds([]);
          // Reset edit states after successful submission
          if (id) {
            setIsPersonalInfoEditable(false);
            setIsAccountSecurityEditable(false);
            setIsAddressInfoEditable(false);
          }
          showEmsg(resData?.message, STATUS.SUCCESS, 3000, async () => {
            navigate("/users");
          });
        } else {
          showEmsg(
            resData?.message || t("COMMON.FAILED_OPERATION"),
            STATUS.WARNING
          );
        }
      } catch (error) {
        const backendMessage = error?.response?.data?.message;
        showEmsg(backendMessage || t("COMMON.ERROR_MESSAGE"), STATUS.ERROR);
      } finally {
        hideLoaderWithDelay(setSubmitting);
      }
    },
    [
      validate,
      id,
      oFormData,
      nProfileImage,
      existingDocuments,
      removedDocumentIds,
      t,
      navigate,
      markFieldTouched,
      requiredFields,
    ]
  );

  const toggleSectionEdit = (section) => {
    switch (section) {
      case "personal":
        setIsPersonalInfoEditable((prev) => !prev);
        break;
      case "account":
        setIsAccountSecurityEditable((prev) => !prev);
        break;
      case "address":
        setIsAddressInfoEditable((prev) => !prev);
        break;
      default:
        break;
    }
  };





  return (
    <div className="max-w-8xl mx-auto pb-20">
      <ToastContainer />
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <p className="text-gray-600 text-sm">
            {id ? t("USERS.EDIT_USER_DESCRIPTION") : t("USERS.DESCRIPTION")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-8 relative">
        <div className="relative" style={{ minWidth: 80, minHeight: 80 }}>
          {bImgLoading && !bImgError && (
            <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
              <User className="h-10 w-10 text-gray-400" />
            </div>
          )}
          <img
            src={
              !bImgError &&
                (nProfileImagePreview ||
                  (existingDocuments.length > 0 &&
                    existingDocuments[0].documentUrl))
                ? nProfileImagePreview || existingDocuments[0].documentUrl
                : userProfile
            }
            alt={t("ADD_USER.PROFILE_PREVIEW")}
            className={`h-20 w-20 rounded-full object-cover border-2 border-gray-200 shadow-sm ${bImgLoading ? "hidden" : ""
              }`}
            style={{ display: bImgLoading ? "none" : "block" }}
            onLoad={() => setImgLoading(false)}
            onError={() => {
              setImgError(true);
              setImgLoading(false);
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("ADD_USER.PROFILE_IMAGE")}
          </label>
          <input
            id="profile-image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            disabled={!isPersonalInfoEditable && id}
          />
          <label
            htmlFor="profile-image-upload"
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors ${!isPersonalInfoEditable && id
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300"
              : "text-white bg-blue-600 hover:bg-blue-700 border border-blue-600"
              }`}
          >
            <FaCamera className="text-sm" />
            {t("COMMON.UPLOAD")}
          </label>

          <p className="text-xs text-gray-500 mt-2">
            {t("ADD_USER.IMAGE_UPLOAD_NOTE")}
          </p>
        </div>
      </div>

      {/* Added autoComplete="off" and hidden dummy inputs to stop browser autofill */}
      <form onSubmit={handleSubmit} autoComplete="off">
        {/* Anti-autofill hack for Chrome/Firefox: Hidden inputs that trap the browser's autofill attempt */}
        <div style={{ width: 0, height: 0, overflow: "hidden", opacity: 0 }}>
          <input type="text" name="fakeusernameremembered" tabIndex="-1" />
          <input type="password" name="fakepasswordremembered" tabIndex="-1" />
        </div>

        <div className="space-y-8">
          {/* Personal Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader
              title={t("ADD_USER.PERSONAL_INFO")}
              isEditable={isPersonalInfoEditable}
              onEditToggle={toggleSectionEdit}
              sectionKey="personal"
              id={id}
              t={t}
            />
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isPersonalInfoEditable ? (
                  <TextInputWithIcon
                    label={renderLabel("firstName", "ADD_USER.FIRST_NAME")}
                    id="firstName"
                    name="firstName"
                    value={oFormData.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t("ADD_USER.ENTER_FIRST_NAME")}
                    Icon={User}
                    error={oErrors.firstName}
                    isValid={oFieldValid.firstName}
                    required={requiredFields.firstName}
                  />
                ) : (
                  <DataField
                    label={renderLabel("firstName", "ADD_USER.FIRST_NAME")}
                    value={oFormData.firstName}
                    placeholder={t("ADD_USER.ENTER_FIRST_NAME")}
                    icon={User}
                  />
                )}

                {isPersonalInfoEditable ? (
                  <TextInputWithIcon
                    label={renderLabel("lastName", "ADD_USER.LAST_NAME")}
                    id="lastName"
                    name="lastName"
                    value={oFormData.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t("ADD_USER.ENTER_LAST_NAME")}
                    Icon={User}
                    error={oErrors.lastName}
                    isValid={oFieldValid.lastName}
                    required={requiredFields.lastName}
                  />
                ) : (
                  <DataField
                    label={renderLabel("lastName", "ADD_USER.LAST_NAME")}
                    value={oFormData.lastName}
                    placeholder={t("ADD_USER.ENTER_LAST_NAME")}
                    icon={User}
                  />
                )}

                {isPersonalInfoEditable ? (
                  <SelectWithIcon
                    label={renderLabel("gender", "ADD_USER.GENDER")}
                    id="gender"
                    name="gender"
                    value={oFormData.gender}
                    onChange={handleSelectChange}
                    options={genderOptions}
                    Icon={Users}
                    error={oErrors.gender}
                    isValid={oFieldValid.gender}
                    required={requiredFields.gender}
                    placeholder={t("ADD_USER.SELECT_GENDER")}
                  />
                ) : (
                  <DataSelectField
                    label={renderLabel("gender", "ADD_USER.GENDER")}
                    value={oFormData.gender}
                    options={genderOptions}
                    placeholder={t("ADD_USER.SELECT_GENDER")}
                    icon={Users}
                    getDisplayValue={getDisplayValue}
                    displayName={oFormData.gender}
                  />
                )}

                {isPersonalInfoEditable ? (
                  <TextInputWithIcon
                    label={renderLabel("email", "COMMON.EMAIL_ADDRESS")}
                    id="email"
                    name="email"
                    value={oFormData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t("COMMON.ENTER_EMAIL_ADDRESS")}
                    Icon={Mail}
                    type="email"
                    error={oErrors.email}
                    isValid={oFieldValid.email}
                    required={requiredFields.email}
                    // FIX: Disable autocomplete for email
                    autoComplete="off"
                  />
                ) : (
                  <DataField
                    label={renderLabel("email", "COMMON.EMAIL_ADDRESS")}
                    value={oFormData.email}
                    placeholder={t("COMMON.ENTER_EMAIL_ADDRESS")}
                    icon={Mail}
                  />
                )}

                {/* Phone Input with International Support */}
                {isPersonalInfoEditable ? (
                  <PhoneInputWithIcon
                    label={t("COMMON.PHONE_NUMBER")}
                    id="phone"
                    name="phone"
                    value={oFormData.phone} // holds formatted number
                    onChange={handlePhoneChange} // updated handler
                    placeholder={t("COMMON.ENTER_PHONE_NUMBER")}
                    Icon={Phone}
                    error={oErrors.phone}
                    defaultCountry="IN"
                  />
                ) : (
                  <DataField
                    label={t("COMMON.PHONE_NUMBER")}
                    value={oFormData.phone}
                    placeholder={t("COMMON.ENTER_PHONE_NUMBER")}
                    icon={Phone}
                  />
                )}
              </div>
            </div>
            <SectionFooter
              isEditable={isPersonalInfoEditable}
              onEditToggle={toggleSectionEdit}
              onUpdate={handleSectionUpdate}
              sectionKey="personal"
              id={id}
              t={t}
            />
          </div>

          {shouldShowAccountSecuritySection && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <SectionHeader
                title={t("ADD_USER.ACCOUNT_SECURITY")}
                isEditable={isAccountSecurityEditable}
                onEditToggle={toggleSectionEdit}
                sectionKey="account"
                id={id}
                t={t}
              />
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Role Field - Conditionally rendered */}
                  {(!id || hasEditRolePermission) &&
                    (isAccountSecurityEditable ? (
                      <SelectWithIcon
                        label={renderLabel("role", "ADD_USER.USER_ROLE")}
                        id="role"
                        name="role"
                        value={oFormData.role}
                        onChange={handleSelectChange}
                        options={roles.map((r) => ({
                          value: r.RoleID,
                          label: r.RoleName,
                        }))}
                        Icon={Building}
                        disabled={
                          rolesLoading || (id && !hasEditRolePermission)
                        }
                        error={oErrors.role || rolesError}
                        isValid={oFieldValid.role}
                        required={requiredFields.role}
                        placeholder={
                          rolesLoading
                            ? t("COMMON.LOADING")
                            : id && !hasEditRolePermission
                              ? t("COMMON.NO_PERMISSION")
                              : t("ADD_USER.SELECT_ROLE")
                        }
                        searchable
                        searchPlaceholder={
                          t("COMMON.SEARCH_ROLE")
                        }
                        onInputChange={(inputValue) => {
                          if (
                            (!id || hasEditRolePermission) &&
                            isAccountSecurityEditable
                          ) {
                            dispatch(
                              fetchResource({
                                key: "roles",
                                params: {
                                  searchText: inputValue,
                                },
                              })
                            );
                          }
                        }}
                      />
                    ) : (
                      <DataSelectField
                        label={renderLabel("role", "ADD_USER.USER_ROLE")}
                        value={oFormData.role}
                        options={roles.map((r) => ({
                          value: r.RoleID,
                          label: r.RoleName,
                        }))}
                        placeholder={t("ADD_USER.SELECT_ROLE")}
                        icon={Building}
                        getDisplayValue={getDisplayValue}
                        displayName={oFormData.roleName}
                      />
                    ))}

                  {/* Stores Field - Conditionally rendered */}
                  {(!id || hasEditStorePermission) &&
                    (isAccountSecurityEditable ? (
                      <SelectWithIcon
                        label={renderLabel("stores", "ADD_USER.ASSIGNED_STORES")}
                        id="stores"
                        name="stores"
                        value={oFormData.stores}
                        onChange={handleSelectChange}
                        options={stores.map((s) => ({
                          value: s.StoreID,
                          label: s.StoreName,
                        }))}
                        Icon={Store}
                        disabled={
                          storesLoading || (id && !hasEditStorePermission)
                        }
                        error={oErrors.stores || storesError}
                        isValid={oFieldValid.stores}
                        required={requiredFields.stores}
                        placeholder={
                          storesLoading
                            ? t("COMMON.LOADING")
                            : id && !hasEditStorePermission
                              ? t("COMMON.NO_PERMISSION")
                              : t("ADD_USER.SELECT_STORES")
                        }
                        multiple={true}
                        searchable
                        searchPlaceholder={
                          t("COMMON.SEARCH_STORES") || "Search stores"
                        }
                        onInputChange={(inputValue) => {
                          if (
                            (!id || hasEditStorePermission) &&
                            isAccountSecurityEditable
                          ) {
                            dispatch(
                              fetchResource({
                                key: "stores",
                                params: {
                                  searchText: inputValue,
                                },
                              })
                            );
                          }
                        }}
                      />
                    ) : (
                      <DataSelectField
                        label={renderLabel("stores", "ADD_USER.ASSIGNED_STORES")}
                        value={oFormData.stores}
                        options={stores.map((s) => ({
                          value: s.StoreID,
                          label: s.StoreName,
                        }))}
                        multiple={true}
                        placeholder={t("ADD_USER.SELECT_STORES")}
                        icon={Store}
                        getDisplayValue={getDisplayValue}
                      />
                    ))}

                  {/* Password Section - Show ONLY for new users */}
                  {!id && (
                    <div className="col-span-1 md:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isAccountSecurityEditable ? (
                          <TextInputWithIcon
                            label={renderLabel("password", "COMMON.PASSWORD")}
                            id="password"
                            name="password"
                            value={oFormData.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder={t("COMMON.ENTER_PASSWORD")}
                            Icon={Lock}
                            type={ShowPassword ? "text" : "password"}
                            error={oErrors.password}
                            isValid={oFieldValid.password}
                            required={requiredFields.password}
                            autoComplete="new-password"


                            inputSlot={
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="text-gray-500 hover:text-custom-bg"
                                aria-label={ShowPassword ? "Hide password" : "Show password"}
                              >
                                {ShowPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            }

                          />

                        ) : (
                          <DataPasswordField
                            label={renderLabel("password", "COMMON.PASSWORD")}
                            placeholder={t("COMMON.ENTER_PASSWORD")}
                            icon={Lock}
                          />
                        )}

                        {isAccountSecurityEditable ? (
                          <TextInputWithIcon
                            label={renderLabel("confirmPassword", "COMMON.CONFIRM_PASSWORD")}
                            id="confirmPassword"
                            name="confirmPassword"
                            value={oFormData.confirmPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder={t("COMMON.CONFIRM_PASSWORD")}
                            Icon={Lock}
                            type={bShowConfirmPassword ? "text" : "password"}
                            error={oErrors.confirmPassword}
                            isValid={oFieldValid.confirmPassword}
                            required={requiredFields.confirmPassword}
                            autoComplete="new-password"
                            inputSlot={
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                className="cursor-pointer text-gray-500 hover:text-custom-bg"
                                aria-label={bShowConfirmPassword ? "Hide password" : "Show password"}
                              >
                                {bShowConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            }
                          />

                        ) : (
                          <DataPasswordField
                            label={renderLabel("confirmPassword", "COMMON.CONFIRM_PASSWORD")}
                            placeholder={t("COMMON.CONFIRM_PASSWORD")}
                            icon={Lock}
                          />
                        )}
                      </div>

                      {isAccountSecurityEditable &&
                        typeof oFormData.password === "string" &&
                        oFormData.password.length > 0 && (
                          <div
                            className="col-span-1 md:col-span-2"
                            style={{ marginTop: 4 }}
                          >
                            <span
                              style={{
                                color:
                                  passwordStrength === "strong"
                                    ? "#16a34a"
                                    : passwordStrength === "medium"
                                      ? "#f59e42"
                                      : "#dc2626",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              {passwordStrengthText}
                            </span>
                            <ul
                              style={{
                                margin: "8px 0 0 0",
                                padding: 0,
                                listStyle: "none",
                              }}
                            >
                              {passwordRequirements(t).map((req, idx) => {
                                const passed = req.test(oFormData.password);
                                return (
                                  <li
                                    key={idx}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      color: passed ? "#16a34a" : "#dc2626",
                                      fontSize: 13,
                                      marginBottom: 2,
                                    }}
                                  >
                                    {passed ? (
                                      <CheckCircle
                                        size={16}
                                        color="#16a34a"
                                        style={{ marginRight: 6 }}
                                      />
                                    ) : (
                                      <XCircle
                                        size={16}
                                        color="#dc2626"
                                        style={{ marginRight: 6 }}
                                      />
                                    )}
                                    {req.label}
                                  </li>
                                );
                              })}
                            </ul>
                            {passwordStrength !== "strong" && (
                              <div
                                style={{
                                  color: "#6b7280",
                                  fontSize: 12,
                                  marginTop: 2,
                                }}
                              >
                                {t("COMMON.PASSWORD_SUGGESTION")}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
              <SectionFooter
                isEditable={isAccountSecurityEditable}
                onEditToggle={toggleSectionEdit}
                onUpdate={handleSectionUpdate}
                sectionKey="account"
                id={id}
                t={t}
              />
            </div>
          )}

          {/* Address Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader
              title={t("ADD_USER.ADDRESS_INFO")}
              isEditable={isAddressInfoEditable}
              onEditToggle={toggleSectionEdit}
              sectionKey="address"
              id={id}
              t={t}
            />
            <div className="p-6 space-y-6">
              {isAddressInfoEditable ? (
                <TextInputWithIcon
                  label={renderLabel("streetAddress", "COMMON.STREET_ADDRESS")}
                  id="streetAddress"
                  name="streetAddress"
                  value={oFormData.streetAddress}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t("COMMON.ENTER_STREET_ADDRESS")}
                  Icon={MapPin}
                  error={oErrors.streetAddress}
                  isValid={oFieldValid.streetAddress}
                  required={requiredFields.streetAddress}
                />
              ) : (
                <DataField
                  label={renderLabel("streetAddress", "COMMON.STREET_ADDRESS")}
                  value={oFormData.streetAddress}
                  placeholder={t("COMMON.ENTER_STREET_ADDRESS")}
                  icon={MapPin}
                />
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isAddressInfoEditable ? (
                  <SelectWithIcon
                    label={renderLabel("country", "COMMON.COUNTRY")}
                    id="country"
                    name="country"
                    value={oFormData.country}
                    onChange={handleSelectChange}
                    options={countries.map((c) => ({
                      value: c.CountryID,
                      label: c.CountryName,
                    }))}
                    Icon={Globe}
                    error={oErrors.country || countriesError}
                    isValid={oFieldValid.country}
                    required={requiredFields.country}
                    placeholder={
                      countriesLoading
                        ? t("COMMON.LOADING")
                        : t("COMMON.SELECT_COUNTRY")
                    }
                    disabled={countriesLoading}
                  />
                ) : (
                  <DataSelectField
                    label={renderLabel("country", "COMMON.COUNTRY")}
                    value={oFormData.country}
                    options={countries.map((c) => ({
                      value: c.CountryID,
                      label: c.CountryName,
                    }))}
                    placeholder={t("COMMON.SELECT_COUNTRY")}
                    icon={Globe}
                    getDisplayValue={getDisplayValue}
                    displayName={oFormData.countryName}
                  />
                )}

                {isAddressInfoEditable ? (
                  <SelectWithIcon
                    label={renderLabel("state", "COMMON.STATE")}
                    id="state"
                    name="state"
                    value={oFormData.state}
                    onChange={handleSelectChange}
                    options={states.map((s) => ({
                      value: s.StateID,
                      label: s.StateName,
                    }))}
                    Icon={Navigation}
                    error={oErrors.state || statesError}
                    isValid={oFieldValid.state}
                    required={requiredFields.state}
                    placeholder={
                      statesLoading
                        ? t("COMMON.LOADING")
                        : t("COMMON.SELECT_STATE")
                    }
                    disabled={statesLoading || !oFormData.country}
                  />
                ) : (
                  <DataSelectField
                    label={renderLabel("state", "COMMON.STATE")}
                    value={oFormData.state}
                    options={states.map((s) => ({
                      value: s.StateID,
                      label: s.StateName,
                    }))}
                    placeholder={t("COMMON.SELECT_STATE")}
                    icon={Navigation}
                    getDisplayValue={getDisplayValue}
                    displayName={oFormData.stateName}
                  />
                )}

                {isAddressInfoEditable ? (
                  <SelectWithIcon
                    label={renderLabel("city", "COMMON.CITY")}
                    id="city"
                    name="city"
                    value={oFormData.city}
                    onChange={handleSelectChange}
                    options={cities.map((c) => ({
                      value: c.CityID,
                      label: c.CityName,
                    }))}
                    Icon={Building}
                    error={oErrors.city || citiesError}
                    isValid={oFieldValid.city}
                    required={requiredFields.city}
                    placeholder={
                      citiesLoading
                        ? t("COMMON.LOADING")
                        : t("COMMON.SELECT_CITY")
                    }
                    disabled={citiesLoading || !oFormData.state}
                  />
                ) : (
                  <DataSelectField
                    label={renderLabel("city", "COMMON.CITY")}
                    value={oFormData.city}
                    options={cities.map((c) => ({
                      value: c.CityID,
                      label: c.CityName,
                    }))}
                    placeholder={t("COMMON.SELECT_CITY")}
                    icon={Building}
                    getDisplayValue={getDisplayValue}
                    displayName={oFormData.cityName}
                  />
                )}

                {isAddressInfoEditable ? (
                  <TextInputWithIcon
                    label={renderLabel("pincode", "COMMON.PINCODE")}
                    id="pincode"
                    name="pincode"
                    value={oFormData.pincode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t("ADD_USER.ENTER_PINCODE")}
                    Icon={Hash}
                    error={oErrors.pincode}
                    isValid={oFieldValid.pincode}
                    required={requiredFields.pincode}
                  />
                ) : (
                  <DataField
                    label={renderLabel("pincode", "COMMON.PINCODE")}
                    value={oFormData.pincode}
                    placeholder={t("ADD_USER.ENTER_PINCODE")}
                    icon={Hash}
                  />
                )}
              </div>
            </div>
            <SectionFooter
              isEditable={isAddressInfoEditable}
              onEditToggle={toggleSectionEdit}
              onUpdate={handleSectionUpdate}
              sectionKey="address"
              id={id}
              t={t}
            />
          </div>
        </div>
      </form>

      {!id && (
        <FloatingFooter
          onCancel={handleClose}
          onSubmit={handleSubmit}
          isSubmitting={bSubmitting}
          isEditMode={!!id}
        />
      )}
    </div>
  );
};

export default AddUser;