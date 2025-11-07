// src/utils/ApiUtils.js
import api from "../components/apiInstance";

// GET request
export const apiGet = async (endpoint, oParams = {}) => {
  const response = await api.get(endpoint, { params: oParams });
  return response;
};

// POST request
export const apiPost = async (endpoint, data, isFormData = false, responseType = "json") => {
  const response = await api.post(endpoint, data, {
    responseType,
    headers: {
      "Content-Type": isFormData ? "multipart/form-data" : "application/json",
    },
  });
  return response;
};

// PUT
export const apiPut = async (endpoint, data) => {
  const response = await api.put(endpoint, data);
  return response;
};

// PATCH
export const apiPatch = async (endpoint, data) => {
  const response = await api.patch(endpoint, data);
  return response;
};

// DELETE
export const apiDelete = async (endpoint) => {
  const response = await api.delete(endpoint);
  return response;
};
