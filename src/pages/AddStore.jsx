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
import { STATUS } from "../contants/constants";
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
  const [status, setStatus] = useState(false);
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
  const [bSubmitting, setbSubmitting] = useState(false);
  const [isFetchingStore, setIsFetchingStore] = useState(false);

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
      dispatch(fetchStatesByCountryId(oFormData.country));
    } else {
      dispatch(clearStates());
    }
  }, [dispatch, oFormData.country]);

  // Fetch cities when state changes
  useEffect(() => {
    if (oFormData.state && oFormData.state !== "") {
      dispatch(fetchCitiesByStateId(oFormData.state));
    } else {
      dispatch(clearCities());
    }
  }, [dispatch, oFormData.state]);

  // Extract country code from phone number - FIXED WITH TYPE CHECKING
  const extractCountryCode = (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== "string") return "";
    const match = phoneNumber.match(/^\+(.+?)(?=\d)/);
    return match ? match[1] : "";
  };

  // Live validation functions
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

  const validateCountry = (country) => {
    if (!country) {
      return t("STORES.VALIDATION.COUNTRY");
    }
    return "";
  };

  const validateState = (state) => {
    if (!state) {
      return t("STORES.VALIDATION.STATE");
    }
    return "";
  };

  const validateCity = (city) => {
    if (!city) {
      return t("STORES.VALIDATION.CITY");
    }
    return "";
  };

  // Live validation for a specific field
  const validateField = useCallback((name, value) => {
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

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));

    setFieldValid((prev) => ({
      ...prev,
      [name]: !error && value !== "" && value !== null && value !== undefined,
    }));
  }, []);

  // Updated handleChange with live validation
  const handleChange = useCallback(
    (e) => {
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
        // Validate the changed field and reset dependent fields
        validateField(name, value);
        validateField("state", "");
        validateField("city", "");
      }
      // When state changes, reset city
      else if (name === "state") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          city: "",
          cityName: "",
        }));
        validateField(name, value);
        validateField("city", "");
      }
      // For all other fields
      else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
        validateField(name, value);
      }
    },
    [validateField]
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
    validateField("phone", "");
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

  validateField("phone", formattedPhone);
}, [validateField]);


  // Validate field on blur
  const handleBlur = useCallback(
    (e) => {
      const { name, value } = e.target;
      validateField(name, value);
    },
    [validateField]
  );

  // Optimized fetchStore function - FIXED to handle phone number binding properly
  const fetchStore = useCallback(async () => {
    if (!id || isFetchingStore || hasFetchedStore.current) return;

    setIsFetchingStore(true);
    hasFetchedStore.current = true;

    try {
      const token = localStorage.getItem("token");
      const oResponse = await apiGet(`${GET_STORE_BY_ID}/${id}`, {}, token);

      if (oResponse.data.status === STATUS.SUCCESS.toUpperCase()) {
        const store = oResponse.data.data;

        // FIX: Properly format phone number for the phone input component
        let formattedPhone = "";
        let rawPhoneNumber = store.PhoneNumber || "";
        let countryCode = store.CountryCode || "";

        if (store.PhoneNumber && store.CountryCode) {
          // Format: "+91 63644 37189" (with spaces for better readability)
          const cleanPhone = store.PhoneNumber.replace(/\D/g, ""); // Remove any non-digits
          formattedPhone = `${store.CountryCode} ${cleanPhone}`;
          rawPhoneNumber = cleanPhone; // Store the raw phone number without country code
        } else if (store.PhoneNumber && store.PhoneNumber.startsWith("+")) {
          // If phone number already has country code but no separate CountryCode field
          formattedPhone = store.PhoneNumber;
          // Extract country code and raw phone number
          const phoneWithoutSpaces = store.PhoneNumber.replace(/\s/g, "");
          const countryCodeMatch = phoneWithoutSpaces.match(/^\+\d{1,3}/);
          countryCode = countryCodeMatch ? countryCodeMatch[0] : "";
          rawPhoneNumber = phoneWithoutSpaces.substring(countryCode.length);
        } else if (store.PhoneNumber) {
          // If no country code but has phone number, use default country code
          formattedPhone = `+91 ${store.PhoneNumber}`;
          countryCode = "+91";
          rawPhoneNumber = store.PhoneNumber.replace(/\D/g, "");
        }

        setFormData((prev) => ({
          ...prev,
          name: store.StoreName || "",
          address: store.AddressLine1 || "",
          zipCode: store.Zipcode || "",
          phone: formattedPhone, // Use formatted phone number for display
          CountryCode: countryCode, // Country code only
          PhoneNumber: rawPhoneNumber, // Raw phone number without country code
          StoreID: store.StoreID || "",
          email: store.Email || "",
          countryName: store.CountryName || "",
          stateName: store.StateName || "",
          cityName: store.CityName || "",
        }));
        setStatus(store.IsActive);

        // Validate initial data
        setTimeout(() => {
          validateField("name", store.StoreName || "");
          validateField("address", store.AddressLine1 || "");
          validateField("zipCode", store.Zipcode || "");
          validateField("email", store.Email || "");
          validateField("phone", formattedPhone);
        }, 100);

        const countriesArray = getArray(countriesData.data);
        if (countriesArray.length > 0) {
          const foundCountry = countriesArray.find(
            (c) => c.CountryName === store.CountryName
          );
          if (foundCountry) {
            setFormData((prev) => ({
              ...prev,
              country: foundCountry.CountryID,
            }));
            validateField("country", foundCountry.CountryID);
          }
        }
      } else {
        showEmsg(
          oResponse.data?.MESSAGE || t("COMMON.ERROR_MESSAGE"),
          STATUS.ERROR
        );
      }
    } catch (error) {
      showEmsg(
        error?.response?.data?.MESSAGE || t("COMMON.ERROR_MESSAGE"),
        STATUS.ERROR
      );
    } finally {
      setIsFetchingStore(false);
    }
  }, [id, isFetchingStore, countriesData.data, t, validateField]);

  // Effect to populate state when states are loaded
  useEffect(() => {
    if (!id || !oFormData.country || !oFormData.stateName || oFormData.state)
      return;

    const statesArray = getArray(statesData.data);
    if (statesArray.length > 0) {
      const foundState = statesArray.find(
        (s) => s.StateName === oFormData.stateName
      );

      if (foundState) {
        setFormData((prev) => ({
          ...prev,
          state: foundState.StateID,
        }));
        validateField("state", foundState.StateID);
      }
    }
  }, [
    id,
    oFormData.country,
    oFormData.stateName,
    oFormData.state,
    statesData.data,
    validateField,
  ]);

  // Effect to populate city when cities are loaded
  useEffect(() => {
    if (!id || !oFormData.state || !oFormData.cityName || oFormData.city)
      return;

    const citiesArray = getArray(citiesData.data);
    if (citiesArray.length > 0) {
      const foundCity = citiesArray.find(
        (c) => c.CityName === oFormData.cityName
      );

      if (foundCity) {
        setFormData((prev) => ({
          ...prev,
          city: foundCity.CityID,
        }));
        validateField("city", foundCity.CityID);
      }
    }
  }, [
    id,
    oFormData.state,
    oFormData.cityName,
    oFormData.city,
    citiesData.data,
    validateField,
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

  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    // Validate all fields
    newErrors.name = validateName(oFormData.name);
    newErrors.address = validateAddress(oFormData.address);
    newErrors.country = validateCountry(oFormData.country);
    newErrors.state = validateState(oFormData.state);
    newErrors.city = validateCity(oFormData.city);
    newErrors.zipCode = validateZipCode(oFormData.zipCode);
    newErrors.phone = validatePhone(oFormData.phone);
    newErrors.email = validateEmail(oFormData.email);

    // Check if any errors exist
    Object.values(newErrors).forEach((error) => {
      if (error) isValid = false;
    });

    setErrors(newErrors);

    // Update field validation states
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

    return isValid;
  }, [oFormData]);

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
        TenantID: localStorage.getItem("tenantID"),
        StoreName: oFormData.name,
        Email: oFormData.email,
        PhoneNumber: phoneNumber, // Raw phone number without country code (only digits)
        CountryCode: countryCode, // Country code only (like "+91")
        AddressLine1: oFormData.address,
        AddressLine2: oFormData.addressLine2 || "",
        CityID: parseInt(oFormData.city, 10),
        StateID: parseInt(oFormData.state, 10),
        CountryID: parseInt(oFormData.country, 10),
        Zipcode: oFormData.zipCode,
        IsActive: status,
        CountryName: selectedCountry ? selectedCountry.CountryName : "",
        StateName: selectedState ? selectedState.StateName : "",
        CityName: selectedCity ? selectedCity.CityName : "",
        ...(id
          ? {
              StoreID: oFormData.StoreID || 0,
              UpdatedBy: userId,
            }
          : {
              CreatedBy: userId,
            }),
      };

      try {
        let oResponse;

        if (id) {
          oResponse = await apiPut(UPDATE_STORE, payload, token);
        } else {
          oResponse = await apiPost(CREATE_STORE, payload, token);
        }

        if (oResponse.data.status === STATUS.SUCCESS.toUpperCase()) {
          showEmsg(oResponse.data?.message, STATUS.SUCCESS, 3000, async () => {
            navigate("/stores");
          });
        } else {
          showEmsg(oResponse.data?.message, STATUS.WARNING);
        }
      } catch (err) {
        showEmsg(
          err?.response?.data?.message || t("COMMON.API_ERROR"),
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
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
                    onChange={handleChange}
                    onBlur={handleBlur}
                    options={getArray(countriesData.data).map((c) => ({
                      value: c.CountryID,
                      label: c.CountryName,
                    }))}
                    Icon={Building}
                    error={oErrors.country}
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
                    onChange={handleChange}
                    onBlur={handleBlur}
                    options={getArray(statesData.data).map((s) => ({
                      value: s.StateID,
                      label: s.StateName,
                    }))}
                    Icon={Building}
                    error={oErrors.state}
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
                    onChange={handleChange}
                    onBlur={handleBlur}
                    options={getArray(citiesData.data).map((c) => ({
                      value: c.CityID,
                      label: c.CityName,
                    }))}
                    Icon={Building}
                    error={oErrors.city}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
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
