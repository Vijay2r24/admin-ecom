import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  apiGet,
  apiPatch,
  getApiResponseMessage,
  isApiResponseSuccess,
} from "../../utils/ApiUtils";
import {
  GET_ALL_ATTRIBUTES,
  GETALL_BRANDS,
  GETALL_CATEGORY,
  GET_All_COLORSAPI,
  ATTRIBUTE_TYPE,
  GET_ALL_ROLES_API,
  GET_ALL_STORES,
  GET_ALL_STORES_API,
  GET_ALL_USERS,
  ORDER_STATUS_API,
  GET_ALL_PRODUCT_GROUPS,
  GET_All_PAYMENT_STATUS,
  GET_ALL_PAYMENT_METHODS,
  GET_ALL_PAYMENT_TYPES,
  GET_USER_BY_ID,
  GET_COUNTRIES,
  GET_STATES_BY_COUNTRY,
  GET_CITIES_BY_STATE,
  GET_ALL_SPECIFICATIONS
} from "../../contants/apiRoutes";
import { GET_ALL_PACKAGING_BOXES, GET_WEIGHT_UNITS } from "../../contants/apiRoutes";
import { STATUS } from "../../contants/constants";
import {
  applySubscriptionFromLoginPayload,
  subscriptionPayloadHasPlanFields,
} from "../../utils/planAccessUtils";

/**
 * Resource Configurations
 */
const aResourceConfigs = [
  { key: "attributes", api: GET_ALL_ATTRIBUTES, idField: "AttributeID" },
  { key: "colors", api: GET_All_COLORSAPI, idField: "ColourID" },
  { key: "attributeTypes", api: ATTRIBUTE_TYPE, idField: "AttributeTypeID" },
  { key: "roles", api: GET_ALL_ROLES_API, rolesPagination: true },
  { key: "stores", api: GET_ALL_STORES },
  { key: "allStores", api: GET_ALL_STORES_API },
  { key: "brands", api: GETALL_BRANDS, idField: "BrandID" },
  { key: "categories", api: GETALL_CATEGORY, idField: "CategoryID" },
  { key: "users", api: GET_ALL_USERS, idField: "UserID" },
  { key: "orderStatuses", api: ORDER_STATUS_API },
  {
    key: "paymentStatus",
    api: GET_All_PAYMENT_STATUS,
    idField: "PaymentStatusID",
  },
  {
    key: "productGroups",
    api: GET_ALL_PRODUCT_GROUPS,
    idField: "ProductGroupID",
  },
  {
    key: "paymentMethods",
    api: GET_ALL_PAYMENT_METHODS,
    idField: "PaymentMethodID",
  },
  {
    key: "paymentTypes",
    api: GET_ALL_PAYMENT_TYPES,
    idField: "PaymentTypeID",
  },
  // New configurations for countries, states, and cities
  {
    key: "countries",
    api: GET_COUNTRIES,
    idField: "CountryCode" // API returns CountryCode, not CountryID
  },
  {
    key: "states",
    api: GET_STATES_BY_COUNTRY,
    idField: "StateID"
  },
  {
    key: "cities",
    api: GET_CITIES_BY_STATE,
    idField: "CityID"
  },
  {
    key: "specificationType",
    api: GET_ALL_SPECIFICATIONS,
    totalKey: "totalRecords",
    idField: "SpecificationTypeID",
  },
  {
    key: "packagingBoxes",
    api: GET_ALL_PACKAGING_BOXES,
    idField: "PackagingBoxID",
  },
  {
    key: "weightUnits",
    api: GET_WEIGHT_UNITS,
  }
];

/**
 * FETCH RESOURCE
 */
export const fetchResource = createAsyncThunk(
  "allData/fetchResource",
  async ({ key, params = {} }, { rejectWithValue }) => {
    try {
      const config = aResourceConfigs.find((c) => c.key === key);
      if (!config) throw new Error(`Unknown resource: ${key}`);

      const token = localStorage.getItem("token");
      const response = await apiGet(config.api, params, token);

      let data = [];
      let total = 0;
      let pagination = {};

      // Your specific API response structure
      if (response.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        data = response.data.data || [];
        pagination = response.data.pagination || {};
        total = pagination.totalRecords || data.length;
      } else {
        // Fallback for other formats
        data = response.data?.data || [];
        pagination = response.data?.pagination || {};
        total = pagination.totalRecords || data.length;
      }

      // Transform countries data: ensure absolute consistency for IDs and codes
      if (key === "countries" && Array.isArray(data)) {
        data = data.map((country) => {
          const name = country.Name || country.CountryName || country.Country || country.Code;
          const id = country.CountryCode || country.CountryID || country.Code || country.ID || name;
          return {
            ...country,
            CountryID: id,
            CountryCode: id,
            CountryName: name,
            label: name,
            value: id,
          };
        });
      }

      return { key, data, total, pagination };
    } catch (err) {
      return rejectWithValue({ key, error: err.message });
    }
  }
);

/**
 * UPDATE STATUS
 */
export const updateStatusById = createAsyncThunk(
  "allData/updateStatus",
  async ({ key, id, newStatus, apiRoute, idField }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const payload = { IsActive: newStatus ? true : false };
      const response = await apiPatch(`${apiRoute}/${id}`, payload, token);

      if (isApiResponseSuccess(response?.data)) {
        return {
          key,
          id,
          idField,
          payload,
          message: getApiResponseMessage(
            response.data,
            "Status updated successfully."
          ),
        };
      } else {
        throw new Error(
          getApiResponseMessage(response?.data) || "Failed to update status"
        );
      }
    } catch (err) {
      return rejectWithValue({ key, error: err.message });
    }
  }
);

/**
 * FETCH USER DETAILS
 */
export const fetchUserDetails = createAsyncThunk(
  "allData/fetchUserDetails",
  async (userId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await apiGet(`${GET_USER_BY_ID}/${userId}`, {}, token);

      if (response?.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        const userData = response.data.data;
        localStorage.setItem("userDetails", JSON.stringify(userData));
        if (subscriptionPayloadHasPlanFields(userData)) {
          applySubscriptionFromLoginPayload(userData, { silentPlanToast: false });
        }
        return userData;
      } else {
        throw new Error(response?.data?.message || "Failed to fetch user details");
      }
    } catch (err) {
      localStorage.removeItem("userDetails");
      return rejectWithValue(err.message);
    }
  }
);

/**
 * FETCH STATES BY COUNTRY CODE
 */
export const fetchStatesByCountryId = createAsyncThunk(
  "allData/fetchStatesByCountryId",
  async (countryCode, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await apiGet(`${GET_STATES_BY_COUNTRY}/${countryCode}`, {}, token);

      let data = [];

      // Handle the new response format: { status: "SUCCESS", data: [...] }
      if (response.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        data = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      }

      // Transform: ensure absolute consistency for States
      if (Array.isArray(data)) {
        data = data.map((state) => {
          const name = state.Name || state.StateName || state.State || state.Code;
          const id = state.Code || state.StateCode || state.StateID || state.ID || name;
          return {
            ...state,
            StateID: id,
            StateCode: id,
            StateName: name,
            label: name,
            value: id,
          };
        });
      }

      return { key: "states", countryCode, data };
    } catch (err) {
      return rejectWithValue({ key: "states", error: err.message, countryCode });
    }
  }
);

/**
 * FETCH CITIES BY STATE CODE
 * @param {Object} params - { countryCode, stateCode }
 */
export const fetchCitiesByStateId = createAsyncThunk(
  "allData/fetchCitiesByStateId",
  async ({ countryCode, stateCode }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await apiGet(`${GET_CITIES_BY_STATE}/${countryCode}/${stateCode}`, {}, token);

      let data = [];

      // Handle the new response format: { status: "SUCCESS", data: [...] }
      if (response.data?.status?.toUpperCase() === STATUS.SUCCESS.toUpperCase()) {
        data = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      }

      // Transform: ensure absolute consistency for Cities
      if (Array.isArray(data)) {
        data = data.map((city) => {
          const name = city.Name || city.CityName || city.City;
          const id = city.Code || city.CityCode || city.CityID || city.ID || name;
          return {
            ...city,
            CityID: id,
            CityCode: id,
            CityName: name,
            label: name,
            value: id,
          };
        });
      }

      return { key: "cities", countryCode, stateCode, data };
    } catch (err) {
      return rejectWithValue({ key: "cities", error: err.message, countryCode, stateCode });
    }
  }
);

/**
 * SLICE
 */
const allDataSlice = createSlice({
  name: "allData",
  initialState: {
    resources: {
      countries: { data: [], loading: false, error: null },
      states: { data: [], loading: false, error: null, countryCode: null },
      cities: { data: [], loading: false, error: null, countryCode: null, stateCode: null },
      categories: { data: [], loading: false, error: null },
      brands: { data: [], loading: false, error: null },
      stores: { data: [], loading: false, error: null },
      allStores: { data: [], loading: false, error: null },
      attributes: { data: [], loading: false, error: null },
      attributeTypes: { data: [], loading: false, error: null },
      roles: { data: [], loading: false, error: null },
      orderStatuses: { data: [], loading: false, error: null },
      paymentStatus: { data: [], loading: false, error: null },
      productGroups: { data: [], loading: false, error: null },
      paymentMethods: { data: [], loading: false, error: null },
      paymentTypes: { data: [], loading: false, error: null },
      specificationType: { data: [], loading: false, error: null },
      colors: { data: [], loading: false, error: null },
      packagingBoxes: { data: [], loading: false, error: null },
      weightUnits: { data: [], loading: false, error: null },
    },
    userDetails: null,
    userDetailsError: null,
    userDetailsLoading: false,
  },
  reducers: {
    clearResourceError: (state, action) => {
      const key = action.payload;
      if (state.resources[key]) state.resources[key].error = null;
    },
    clearUserDetailsError: (state) => {
      state.userDetailsError = null;
    },
    clearUserDetails: (state) => {
      state.userDetails = null;
      localStorage.removeItem("userDetails");
    },
    clearStates: (state) => {
      state.resources.states = { data: [], loading: false, error: null, countryCode: null };
    },
    clearCities: (state) => {
      state.resources.cities = { data: [], loading: false, error: null, countryCode: null, stateCode: null };
    },
  },
  extraReducers: (builder) => {
    builder
      // FETCH RESOURCE lifecycle
      .addCase(fetchResource.pending, (state, action) => {
        const { key } = action.meta.arg;
        state.resources[key] = {
          ...(state.resources[key] || {}),
          loading: true,
          error: null,
        };
      })
      .addCase(fetchResource.fulfilled, (state, action) => {
        const { key, data, total, pagination } = action.payload;
        
        // For attributes, always replace data to ensure we get the correct type-specific attributes
        // The tracking system in AddProductForm will handle caching per type
        state.resources[key] = {
          data,
          total,
          pagination,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchResource.rejected, (state, action) => {
        const { key, error } = action.payload || {};
        state.resources[key] = {
          ...(state.resources[key] || {}),
          loading: false,
          error: error || null,
        };
      })

      // UPDATE STATUS lifecycle
      .addCase(updateStatusById.fulfilled, (state, action) => {
        const { key, id, idField, payload } = action.payload;
        if (state.resources[key]?.data) {
          // Update status in place
          state.resources[key].data = state.resources[key].data.map((item) =>
            item[idField] === id
              ? { ...item, IsActive: payload.IsActive }
              : item
          );
        }
      })

      // FETCH USER DETAILS lifecycle
      .addCase(fetchUserDetails.pending, (state) => {
        state.userDetailsLoading = true;
        state.userDetailsError = null;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        state.userDetailsLoading = false;
        state.userDetails = action.payload;
        state.userDetailsError = null;
      })
      .addCase(fetchUserDetails.rejected, (state, action) => {
        state.userDetailsLoading = false;
        state.userDetails = null;
        state.userDetailsError = action.payload || "Failed to fetch user details";
      })

      // FETCH STATES BY COUNTRY ID lifecycle
      .addCase(fetchStatesByCountryId.pending, (state) => {
        state.resources.states = {
          ...state.resources.states,
          loading: true,
          error: null,
        };
      })
      .addCase(fetchStatesByCountryId.fulfilled, (state, action) => {
        const { countryCode, data } = action.payload;
        state.resources.states = {
          data,
          loading: false,
          error: null,
          countryCode,
        };
      })
      .addCase(fetchStatesByCountryId.rejected, (state, action) => {
        state.resources.states = {
          ...state.resources.states,
          loading: false,
          error: action.payload?.error || "Failed to fetch states",
        };
      })

      // FETCH CITIES BY STATE ID lifecycle
      .addCase(fetchCitiesByStateId.pending, (state) => {
        state.resources.cities = {
          ...state.resources.cities,
          loading: true,
          error: null,
        };
      })
      .addCase(fetchCitiesByStateId.fulfilled, (state, action) => {
        const { countryCode, stateCode, data } = action.payload;
        state.resources.cities = {
          data,
          loading: false,
          error: null,
          countryCode,
          stateCode,
        };
      })
      .addCase(fetchCitiesByStateId.rejected, (state, action) => {
        state.resources.cities = {
          ...state.resources.cities,
          loading: false,
          error: action.payload?.error || "Failed to fetch cities",
        };
      });
  },
});

export const {
  clearResourceError,
  clearUserDetailsError,
  clearUserDetails,
  clearStates,
  clearCities
} = allDataSlice.actions;

export default allDataSlice.reducer;