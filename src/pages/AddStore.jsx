import { useState, useEffect, useCallback, useRef } from "react";
import { Building, MapPin, Phone, Mail } from "lucide-react";
import TextInputWithIcon from "../components/TextInputWithIcon";
import SelectWithIcon from "../components/SelectWithIcon";
import PhoneInputWithIcon from "../components/PhoneInputWithIcon";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "../utils/ApiUtils";
import {
  GET_STORE_BY_ID,
  UPDATE_STORE,
  CREATE_STORE,
} from "../contants/apiRoutes";
import { showEmsg } from "../utils/ShowEmsg";
import { useTitle } from "../context/TitleContext";
import { COUNTRY_CODES, STATUS } from "../contants/constants";
import BackButton from "../components/BackButton";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loader from "../components/Loader";
import { hideLoaderWithDelay } from "../utils/loaderUtils";
import TextAreaWithIcon from "../components/TextAreaWithIcon";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResource,
  fetchStatesByCountryId,
  fetchCitiesByStateId,
  clearStates,
  clearCities,
} from "../store/slices/allDataSlice";
import FloatingFooter from "../components/FloatingFooter";
import { isValidPhoneNumber } from "react-phone-number-input";

const getArray = (data) =>
  Array.isArray(data)
    ? data
    : data && Array.isArray(data.data)
      ? data.data
      : [];

const AddStore = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const {
    countries: countriesData,
    states: statesData,
    cities: citiesData,
  } = useSelector((state) => state.allData.resources);

  const { id } = useParams();
  const navigate = useNavigate();
  const { setTitle, setBackButton } = useTitle();
  const [status, setStatus] = useState(true);
  const [oFormData, setFormData] = useState({
    name: "",
    address: "",
    country: "",
    state: "",
    city: "",
    zipCode: "",      
    phone: "",
    email: "",
    status: "",
    countryName: "",
    stateName: "",
    cityName: "",
    StoreID: "",
    CountryCode: "",
    PhoneNumber: "", // Add separate field for raw phone number
  });

  const [oErrors, setErrors] = useState({});
  const [oFieldValid, setFieldValid] = useState({}); // Track field validation state
  const [oFieldTouched, setFieldTouched] = useState({}); // Track touched fields
  const [bSubmitting, setbSubmitting] = useState(false);
  const [isFetchingStore, setIsFetchingStore] = useState(false);

  // NEW: Form data loading state for edit mode
  const [isFormDataLoading, setIsFormDataLoading] = useState(!!id);

  // Refs to track what has been loaded
  const hasFetchedStore = useRef(false);
  const hasFetchedCountries = useRef(false);

  // Required fields configuration
  const requiredFields = {
    name: true,
    address: true,
    country: true,
    state: true,
    city: true,
    zipCode: true,
    phone: true,
    email: true,
  };

  // Live validation functions - UPDATED to handle loading states
  const validateName = (name) => {
    if (!name.trim()) {
      return t("STORES.VALIDATION.STORE_NAME");
    }
    if (name.trim().length < 2) {
      return t("STORES.VALIDATION.STORE_NAME_MIN");
    }
    if (name.trim().length > 100) {
      return t("STORES.VALIDATION.STORE_NAME_MAX");
    }
    return "";
  };

  const validateAddress = (address) => {
    if (!address.trim()) {
      return t("STORES.VALIDATION.ADDRESS");
    }
    if (address.trim().length < 10) {
      return t("STORES.VALIDATION.ADDRESS_MIN");
    }
    return "";
  };

  const validateZipCode = (zipCode) => {
    if (!zipCode.trim()) {
      return t("STORES.VALIDATION.ZIP_CODE");
    }
    const zipRegex = /^[A-Z0-9\s-]{3,10}$/i;
    if (!zipRegex.test(zipCode.trim())) {
      return t("STORES.VALIDATION.ZIP_CODE_INVALID");
    }
    return "";
  };

  const validateEmail = (email) => {
    if (!email.trim()) {
      return t("STORES.VALIDATION.EMAIL");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return t("STORES.VALIDATION.EMAIL_INVALID");
    }
    return "";
  };

  const validatePhone = (phone) => {
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return t("STORES.VALIDATION.PHONE");
    }

    if (!isValidPhoneNumber(phone)) {
      return t("STORES.VALIDATION.PHONE_INVALID");
    }

    if (!phone.startsWith("+")) {
      return t("STORES.VALIDATION.COUNTRY_CODE_REQUIRED");
    }

    const phoneWithoutSpaces = phone.replace(/\s/g, "");
    const digitsAfterPlus = phoneWithoutSpaces.substring(1);
    if (digitsAfterPlus.length < 8) {
      return t("STORES.VALIDATION.PHONE_TOO_SHORT");
    }

    const countryCodeMatch = phone.match(/^\+\d{1,3}/);
    if (!countryCodeMatch) {
      return t("STORES.VALIDATION.INVALID_COUNTRY_CODE");
    }

    return "";
  };

  // UPDATED: Country validation with loading state handling
  const validateCountry = (country) => {
    // Don't validate country if form data is still loading in edit mode
    if (isFormDataLoading && id && !country) {
      return "";
    }
    if (!country) {
      return t("STORES.VALIDATION.COUNTRY");
    }
    return "";
  };

  // UPDATED: State validation with loading state handling
  const validateState = (state) => {
    // Don't validate state if form data is still loading in edit mode
    if (isFormDataLoading && id && !state) {
      return "";
    }
    if (!state) {
      return t("STORES.VALIDATION.STATE");
    }
    return "";
  };

  // UPDATED: City validation with loading state handling
  const validateCity = (city) => {
    // Don't validate city if form data is still loading in edit mode
    if (isFormDataLoading && id && !city) {
      return "";
    }
    if (!city) {
      return t("STORES.VALIDATION.CITY");
    }
    return "";
  };

  /**
   * Live validation for a specific field - UPDATED with loading state dependency
   */
  const validateField = useCallback((name, value, forceShowError = false) => {
    let error = "";

    switch (name) {
      case "name":
        error = validateName(value);
        break;
      case "address":
        error = validateAddress(value);
        break;
      case "zipCode":
        error = validateZipCode(value);
        break;
      case "email":
        error = validateEmail(value);
        break;
      case "phone":
        error = validatePhone(value);
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
      default:
        break;
    }

    // Only show error if field is touched or we're forcing the error display
    const shouldShowError = forceShowError || oFieldTouched[name];

    setErrors((prev) => ({
      ...prev,
      [name]: shouldShowError ? error : "",
    }));

    setFieldValid((prev) => ({
      ...prev,
      [name]: !error && value !== "" && value !== null && value !== undefined,
    }));

    return error;
  }, [oFieldTouched, isFormDataLoading, id, t]);

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

    // When country changes, reset state and city
    if (name === "country") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        state: "",
        city: "",
        stateName: "",
        cityName: "",
      }));
      // Validate the changed field and reset dependent fields (don't force errors for empty)
      validateField(name, value, true);
      validateField("state", "", false);
      validateField("city", "", false);
    }
    // When state changes, reset city
    else if (name === "state") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        city: "",
        cityName: "",
      }));
      validateField(name, value, true);
      validateField("city", "", false);
    }
    // For all other select fields
    else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      validateField(name, value, true);
    }

    // Mark field as touched immediately
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

  // Updated handleChange with live validation
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      validateField(name, value, oFieldTouched[name]);
      markFieldTouched(name);
    },
    [validateField, markFieldTouched, oFieldTouched]
  );

  // Updated handlePhoneChange with live validation - FIXED to store both formatted and raw numbers
  const handlePhoneChange = useCallback((data) => {
    if (!data) {
      setFormData((prev) => ({
        ...prev,
        phone: "",
        CountryCode: "",
        PhoneNumber: "",
      }));
      validateField("phone", "", oFieldTouched.phone);
      markFieldTouched("phone");
      return;
    }

    const formattedPhone = data.formatted || data.phone || "";
    const countryCode = data.countryCode || "";
    const rawPhoneNumber = data.phoneNumber || "";

    setFormData((prev) => ({
      ...prev,
      phone: formattedPhone,
      CountryCode: countryCode,
      PhoneNumber: rawPhoneNumber,
    }));

    validateField("phone", formattedPhone, oFieldTouched.phone);
    markFieldTouched("phone");
  }, [validateField, markFieldTouched, oFieldTouched.phone]);

  // Extract country code from phone number - FIXED WITH TYPE CHECKING
  const extractCountryCode = (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== "string") return "";
    const match = phoneNumber.match(/^\+(.+?)(?=\d)/);
    return match ? match[1] : "";
  };

  // Fetch countries on component mount - only once
  useEffect(() => {
    if (!hasFetchedCountries.current && !countriesData.data.length) {
      dispatch(fetchResource({ key: "countries" }));
      hasFetchedCountries.current = true;
    }
  }, [dispatch, countriesData.data.length]);

  // Fetch states when country changes
  useEffect(() => {
    if (oFormData.country && oFormData.country !== "") {
      // Find the selected country to get its code
      const countriesArray = getArray(countriesData.data);
      const selectedCountry = countriesArray.find(
        (c) => String(c.CountryID) === String(oFormData.country)
      );

      if (selectedCountry && selectedCountry.CountryCode) {
        dispatch(fetchStatesByCountryId(selectedCountry.CountryCode));
      }
    } else {
      dispatch(clearStates());
    }
  }, [dispatch, oFormData.country, countriesData.data]);

  // Fetch cities when state changes
  useEffect(() => {
    if (oFormData.state && oFormData.state !== "" && oFormData.country) {
      // Find the selected country and state to get their codes
      const countriesArray = getArray(countriesData.data);
      const selectedCountry = countriesArray.find(
        (c) => String(c.CountryID) === String(oFormData.country)
      );

      const statesArray = getArray(statesData.data);
      const selectedState = statesArray.find(
        (s) => String(s.StateID) === String(oFormData.state)
      );

      if (selectedCountry && selectedCountry.CountryCode && selectedState && selectedState.StateCode) {
        dispatch(fetchCitiesByStateId({
          countryCode: selectedCountry.CountryCode,
          stateCode: selectedState.StateCode
        }));
      }
    } else {
      dispatch(clearCities());
    }
  }, [dispatch, oFormData.state, oFormData.country, countriesData.data, statesData.data]);

  // NEW: Effect to validate country when countries data loads
  useEffect(() => {
    if (id && oFormData.countryName && countriesData.data.length > 0 && !oFormData.country) {
      // Find country by name when countries data loads
      const foundCountry = countriesData.data.find(
        (c) => c.CountryName === oFormData.countryName
      );
      if (foundCountry) {
        setFormData((prev) => ({
          ...prev,
          country: foundCountry.CountryID,
        }));
        // Validate the country field after setting it
        setTimeout(() => {
          validateField("country", foundCountry.CountryID, true);
        }, 100);
      }
    }
  }, [countriesData.data, oFormData.countryName, id, oFormData.country, validateField]);

  // Optimized fetchStore function - FIXED to handle phone number binding properly
  const fetchStore = useCallback(async () => {
    if (!id || isFetchingStore || hasFetchedStore.current) return;

    setIsFetchingStore(true);
    setIsFormDataLoading(true); // Start loading
    hasFetchedStore.current = true;

    try {
      const token = localStorage.getItem("token");
      const oResponse = await apiGet(`${GET_STORE_BY_ID}/${id}`, {}, token);

      if (oResponse.data.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        const store = oResponse.data.data;

        // FIX: Properly format phone number for the phone input component
        let formattedPhone = "";
        let rawPhoneNumber = store.PhoneNumber || "";
        let countryCode = store.CountryCallingCode || store.CountryCode || "";

        if (store.PhoneNumber && (store.CountryCallingCode || store.CountryCode)) {
          const cleanPhone = store.PhoneNumber.replace(/\D/g, "");
          const callingCode = (store.CountryCallingCode || store.CountryCode).replace(/\D/g, "");
          formattedPhone = `+${callingCode}${cleanPhone}`; // E.164: +919494602714
          rawPhoneNumber = cleanPhone;
          countryCode = `+${callingCode}`;
        } else if (store.PhoneNumber && store.PhoneNumber.startsWith("+")) {
          formattedPhone = store.PhoneNumber.replace(/\s/g, ""); // strip spaces → E.164
          const phoneWithoutSpaces = formattedPhone;
          const countryCodeMatch = phoneWithoutSpaces.match(/^\+\d{1,3}/);
          countryCode = countryCodeMatch ? countryCodeMatch[0] : "";
          rawPhoneNumber = phoneWithoutSpaces.substring(countryCode.length);
        } else if (store.PhoneNumber) {
          const cleanPhone = store.PhoneNumber.replace(/\D/g, "");
          formattedPhone = `+${COUNTRY_CODES.INDIA}${cleanPhone}`; // E.164
          countryCode = `+${COUNTRY_CODES.INDIA}`;
          rawPhoneNumber = cleanPhone;
        }

        setFormData((prev) => ({
          ...prev,
          name: store.StoreName || "",
          address: store.AddressLine1 || "",
          zipCode: store.Zipcode || "",
          phone: formattedPhone,
          CountryCallingCode: countryCode, // Calling code (e.g., +91)
          CountryCode: store.CountryCode || "", // ISO code (e.g., IN)
          StateCode: store.StateCode || "",
          PhoneNumber: rawPhoneNumber,
          StoreID: store.StoreID || "",
          email: store.Email || "",
          countryName: store.CountryName || "",
          stateName: store.StateName || "",
          cityName: store.CityName || "",
        }));
        setStatus(store.IsActive);

        // Mark all fields as touched for edit mode to show validation immediately
        setTimeout(() => {
          const fieldsToValidate = [
            "name", "address", "zipCode", "email", "phone",
            "country", "state", "city"
          ];
          fieldsToValidate.forEach(field => {
            markFieldTouched(field);
            validateField(field,
              field === "name" ? store.StoreName || "" :
                field === "address" ? store.AddressLine1 || "" :
                  field === "zipCode" ? store.Zipcode || "" :
                    field === "email" ? store.Email || "" :
                      field === "phone" ? formattedPhone :
                        "",
              true
            );
          });
        }, 100);

        const countriesArray = getArray(countriesData.data);
        if (countriesArray.length > 0) {
          const foundCountry = countriesArray.find(
            (c) => (c.CountryName || "").toLowerCase() === (store.CountryName || "").toLowerCase()
          );
          if (foundCountry) {
            setFormData((prev) => ({
              ...prev,
              country: foundCountry.CountryID,
            }));
            markFieldTouched("country");
            validateField("country", foundCountry.CountryID, true);
          }
        }

        // Set loading to false after a short delay to ensure all data is processed
        setTimeout(() => {
          setIsFormDataLoading(false);
        }, 500);
      } else {
        showEmsg(
          oResponse.data?.MESSAGE || t("COMMON.ERROR_MESSAGE"),
          STATUS.ERROR
        );
        setIsFormDataLoading(false);
      }
    } catch (error) {
      showEmsg(
        error?.response?.data?.MESSAGE || error?.message || t("COMMON.ERROR_MESSAGE"),
        STATUS.ERROR
      );
      setIsFormDataLoading(false);
    } finally {
      setIsFetchingStore(false);
    }
  }, [id, isFetchingStore, countriesData.data, t, validateField, markFieldTouched]);

  // Effect to populate state when states are loaded
  useEffect(() => {
    if (!id || !oFormData.country || !oFormData.stateName || oFormData.state)
      return;

    const statesArray = getArray(statesData.data);
    if (statesArray.length > 0) {
      const foundState = statesArray.find(
        (s) => (s.StateName || "").toLowerCase() === (oFormData.stateName || "").toLowerCase()
      );

      if (foundState) {
        setFormData((prev) => ({
          ...prev,
          state: foundState.StateID,
        }));
        markFieldTouched("state");
        validateField("state", foundState.StateID, true);
      }
    }
  }, [
    id,
    oFormData.country,
    oFormData.stateName,
    oFormData.state,
    statesData.data,
    validateField,
    markFieldTouched,
  ]);

  // Effect to populate city when cities are loaded
  useEffect(() => {
    if (!id || !oFormData.state || !oFormData.cityName || oFormData.city)
      return;

    const citiesArray = getArray(citiesData.data);
    if (citiesArray.length > 0) {
      const foundCity = citiesArray.find(
        (c) => (c.CityName || "").toLowerCase() === (oFormData.cityName || "").toLowerCase()
      );

      if (foundCity) {
        setFormData((prev) => ({
          ...prev,
          city: foundCity.CityID,
        }));
        markFieldTouched("city");
        validateField("city", foundCity.CityID, true);
      }
    }
  }, [
    id,
    oFormData.state,
    oFormData.cityName,
    oFormData.city,
    citiesData.data,
    validateField,
    markFieldTouched,
  ]);

  // Fetch store only once when component mounts with ID and countries are loaded
  useEffect(() => {
    if (id && !hasFetchedStore.current && countriesData.data.length > 0) {
      fetchStore();
    }
  }, [id, countriesData.data.length, fetchStore]);

  useEffect(() => {
    setTitle(id ? t("STORES.EDIT_STORE") : t("STORES.ADD_STORE"));
    setBackButton(<BackButton onClick={() => window.history.back()} />);
    return () => {
      setBackButton(null);
      setTitle("");
    };
  }, [setTitle, setBackButton, t, id]);

  // UPDATED: validateForm function with loading state consideration
  const validateForm = useCallback(() => {
    const newErrors = {};

    newErrors.name = validateName(oFormData.name);
    newErrors.address = validateAddress(oFormData.address);
    newErrors.zipCode = validateZipCode(oFormData.zipCode);
    newErrors.phone = validatePhone(oFormData.phone);
    newErrors.email = validateEmail(oFormData.email);

    if (!isFormDataLoading) {
      newErrors.country = validateCountry(oFormData.country);
      newErrors.state = validateState(oFormData.state);
      newErrors.city = validateCity(oFormData.city);
    }

    // Filter out empty strings
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, v]) => v !== "" && v !== undefined)
    );

    setErrors(filteredErrors);

    setFieldValid({
      name: !newErrors.name && oFormData.name.trim() !== "",
      address: !newErrors.address && oFormData.address.trim() !== "",
      country: !newErrors.country && oFormData.country !== "",
      state: !newErrors.state && oFormData.state !== "",
      city: !newErrors.city && oFormData.city !== "",
      zipCode: !newErrors.zipCode && oFormData.zipCode.trim() !== "",
      phone: !newErrors.phone && oFormData.phone?.trim() !== "",
      email: !newErrors.email && oFormData.email.trim() !== "",
    });

    // Mark all fields as touched so errors show
    setFieldTouched({
      name: true, address: true, zipCode: true,
      phone: true, email: true, country: true,
      state: true, city: true,
    });

    return Object.keys(filteredErrors).length === 0;
  }, [oFormData, isFormDataLoading]);

  const handleClose = useCallback(() => {
    navigate("/stores");
  }, [navigate]);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();

      if (!validateForm()) return;

      setbSubmitting(true);
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      const selectedCountry = getArray(countriesData.data).find(
        (c) => String(c.CountryID) === String(oFormData.country)
      );
      const selectedState = getArray(statesData.data).find(
        (s) => String(s.StateID) === String(oFormData.state)
      );
      const selectedCity = getArray(citiesData.data).find(
        (c) => String(c.CityID) === String(oFormData.city)
      );

      // Prepare phone data for payload - ensure PhoneNumber contains only digits without country code
      let phoneNumber = oFormData.PhoneNumber || "";
      let countryCode = oFormData.CountryCode || "";

      // If PhoneNumber is not set but phone is, extract from the formatted phone
      if (!phoneNumber && oFormData.phone) {
        const cleanPhone = oFormData.phone.replace(/\D/g, "");
        if (countryCode) {
          // Remove country code from the beginning if present
          const countryCodeDigits = countryCode.replace(/\D/g, "");
          phoneNumber = cleanPhone.startsWith(countryCodeDigits)
            ? cleanPhone.substring(countryCodeDigits.length)
            : cleanPhone;
        } else {
          phoneNumber = cleanPhone;
        }
      }

      // Ensure phoneNumber contains only digits
      phoneNumber = phoneNumber.replace(/\D/g, "");

      const payload = {
        StoreID: id || "",
        StoreName: oFormData.name,
        Email: oFormData.email,
        CountryCallingCode: oFormData.CountryCallingCode || countryCode,
        PhoneNumber: phoneNumber,
        AddressLine1: oFormData.address,
        AddressLine2: oFormData.addressLine2 || "",
        CityName: selectedCity ? selectedCity.CityName : (oFormData.cityName || ""),
        StateCode: selectedState ? selectedState.StateCode : (oFormData.StateCode || ""),
        CountryCode: selectedCountry ? selectedCountry.CountryCode : (oFormData.CountryCode || ""),
        Zipcode: oFormData.zipCode,
        IsActive: status,
        TenantID: localStorage.getItem("tenantID"),
      };

      try {
        let oResponse;

        if (id) {
          oResponse = await apiPut(UPDATE_STORE, payload, token);
        } else {
          oResponse = await apiPost(CREATE_STORE, payload, token);
        }

        if (oResponse?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
          showEmsg(oResponse.data?.message, STATUS.SUCCESS, 3000, async () => {
            navigate("/stores");
          });
        } else if (oResponse) {
          showEmsg(oResponse.data?.message, STATUS.WARNING);
        }
      } catch (err) {
        showEmsg(
          err?.response?.data?.message || err?.message || t("COMMON.API_ERROR"),
          STATUS.ERROR
        );
      } finally {
        hideLoaderWithDelay(setbSubmitting);
      }
    },
    [
      validateForm,
      oFormData,
      id,
      navigate,
      t,
      status,
      countriesData.data,
      statesData.data,
      citiesData.data,
    ]
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

  const loaderOverlay = bSubmitting ? (
    <div className="global-loader-overlay">
      <Loader />
    </div>
  ) : null;

  return (
    <div className="max-w-8xl mx-auto pb-20">
      <ToastContainer />
      {loaderOverlay}
      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          {/* Store Info */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("CREATE_STORE.STORE_INFORMATION")}
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:space-x-4">
                <div className="w-full">
                  <TextInputWithIcon
                    label={renderLabel("name", "CREATE_STORE.STORE_NAME")}
                    id="name"
                    name="name"
                    value={oFormData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t("CREATE_STORE.ENTER_STORE_NAME")}
                    Icon={Building}
                    error={oErrors.name}
                    isValid={oFieldValid.name}
                    required={requiredFields.name}
                  />
                </div>
              </div>
              <div className="w-full mt-4 md:mt-0">
                <TextAreaWithIcon
                  label={renderLabel("address", "CREATE_STORE.STREET_ADDRESS")}
                  name="address"
                  value={oFormData.address}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={t("CREATE_STORE.ENTER_STREET_ADDRESS")}
                  icon={MapPin}
                  error={oErrors.address}
                  isValid={oFieldValid.address}
                  required={requiredFields.address}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <SelectWithIcon
                    label={renderLabel("country", "COMMON.COUNTRY")}
                    id="country"
                    name="country"
                    value={oFormData.country}
                    onChange={handleSelectChange}
                    options={getArray(countriesData.data).map((c) => ({
                      value: c.CountryID,
                      label: c.CountryName,
                    }))}
                    Icon={Building}
                    error={isFormDataLoading ? "" : oErrors.country} // Don't show error while loading
                    isValid={oFieldValid.country}
                    loading={countriesData.loading}
                    required={requiredFields.country}
                  />
                </div>
                <div>
                  <SelectWithIcon
                    label={renderLabel("state", "COMMON.STATE")}
                    id="state"
                    name="state"
                    value={oFormData.state}
                    onChange={handleSelectChange}
                    options={getArray(statesData.data).map((s) => ({
                      value: s.StateID,
                      label: s.StateName,
                    }))}
                    Icon={Building}
                    error={isFormDataLoading ? "" : oErrors.state} // Don't show error while loading
                    isValid={oFieldValid.state}
                    disabled={!oFormData.country || statesData.loading}
                    loading={statesData.loading}
                    required={requiredFields.state}
                  />
                </div>
                <div>
                  <SelectWithIcon
                    label={renderLabel("city", "COMMON.CITY")}
                    id="city"
                    name="city"
                    value={oFormData.city}
                    onChange={handleSelectChange}
                    options={getArray(citiesData.data).map((c) => ({
                      value: c.CityID,
                      label: c.CityName,
                    }))}
                    Icon={Building}
                    error={isFormDataLoading ? "" : oErrors.city} // Don't show error while loading
                    isValid={oFieldValid.city}
                    disabled={!oFormData.state || citiesData.loading}
                    loading={citiesData.loading}
                    required={requiredFields.city}
                  />
                </div>
                <div>
                  <TextInputWithIcon
                    label={renderLabel("zipCode", "COMMON.ZIP_CODE")}
                    id="zipCode"
                    name="zipCode"
                    value={oFormData.zipCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={t("COMMON.ENTER_ZIP_CODE")}
                    Icon={MapPin}
                    error={oErrors.zipCode}
                    isValid={oFieldValid.zipCode}
                    required={requiredFields.zipCode}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("CREATE_STORE.CONTACT_INFORMATION")}
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <PhoneInputWithIcon
                    label={renderLabel("phone", "COMMON.PHONE_NUMBER")}
                    id="phone"
                    name="phone"
                    value={oFormData.phone}
                    onChange={handlePhoneChange}
                    onBlur={handleBlur}
                    placeholder={t("COMMON.ENTER_PHONE_NUMBER")}
                    Icon={Phone}
                    error={oErrors.phone}
                    isValid={oFieldValid.phone}
                    defaultCountry="IN"
                    required={requiredFields.phone}
                  />
                </div>
                <div>
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
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
      {/* Floating Footer */}
      <FloatingFooter
        onCancel={handleClose}
        onSubmit={handleSubmit}
        isSubmitting={bSubmitting}
        isEditMode={!!id}
      />
    </div>
  );
};

export default AddStore;