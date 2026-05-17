import axiosInstance from './axiosInstance';

// Common CRUD functions
const apiService = {
  get: async (url, config = {}) => {
    try {
      const response = await axiosInstance.get(url, config);
      
      // For blob responses, return the full response object
      if (config.responseType === 'blob') {
        return response;
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  post: async (url, data, config = {}) => {
    try {
      const response = await axiosInstance.post(url, data, config);
      
      // For blob responses, return the full response object
      if (config.responseType === 'blob') {
        return response;
      }
      
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
  }
};

export default apiService;

// Example usage:
// apiService.get('/users').then(response => console.log(response.data));
