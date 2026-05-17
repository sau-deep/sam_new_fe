/**
 * Legacy API service wrapper — used by imported survey form components.
 * Wraps sam-v2's axiosInstance to provide the same interface as sam_FE's api.js.
 */
import axiosInstance from './axiosInstance';

const apiService = {
  get: async (url, config = {}) => {
    try {
      const response = await axiosInstance.get(url, config);
      if (config.responseType === 'blob') return response;
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  post: async (url, data, config = {}) => {
    try {
      const response = await axiosInstance.post(url, data, config);
      if (config.responseType === 'blob') return response;
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  put: async (url, data, config = {}) => {
    try {
      const response = await axiosInstance.put(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  patch: async (url, data, config = {}) => {
    try {
      const response = await axiosInstance.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (url, config = {}) => {
    try {
      const response = await axiosInstance.delete(url, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default apiService;
