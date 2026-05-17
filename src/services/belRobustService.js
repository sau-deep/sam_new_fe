import apiService from './api';

class BELRobustService {
  
  /**
   * Get dynamic form configuration with caching
   */
  async getFormConfiguration(useCache = true) {
    try {
      console.log('Loading dynamic form configuration...');
      const response = await apiService.get('/bel/codes/form-config');
      if (response.success && response.data) {
        console.log('Dynamic form configuration loaded:', response.data);
      }
      return response;
    } catch (error) {
      console.error('Error fetching dynamic form configuration:', error);
      throw error;
    }
  }

  /**
   * Get dropdown values for specific code type
   */
  async getDropdownValues(codeType, parentValueCode = null) {
    try {
      const url = `/bel/codes/dropdown/${codeType}${parentValueCode ? `?parentValueCode=${parentValueCode}` : ''}`;
      const response = await apiService.get(url);
      return response;
    } catch (error) {
      console.error(`Error fetching dropdown values for ${codeType}:`, error);
      throw error;
    }
  }

  /**
   * Get all codes for admin
   */
  async getAllCodes() {
    try {
      const response = await apiService.get('/bel/codes/admin/codes');
      return response;
    } catch (error) {
      console.error('Error fetching codes:', error);
      throw error;
    }
  }

  /**
   * Get code by type
   */
  async getCodeByType(codeType) {
    try {
      const response = await apiService.get(`/bel/codes/admin/codes/type/${codeType}`);
      return response;
    } catch (error) {
      console.error(`Error fetching code by type ${codeType}:`, error);
      throw error;
    }
  }

  /**
   * Create new code
   */
  async createCode(codeData) {
    try {
      const response = await apiService.post('/bel/codes/admin/codes', codeData);
      return response;
    } catch (error) {
      console.error('Error creating code:', error);
      throw error;
    }
  }

  /**
   * Update code
   */
  async updateCode(id, codeData) {
    try {
      const response = await apiService.put(`/bel/codes/admin/codes/${id}`, codeData);
      return response;
    } catch (error) {
      console.error('Error updating code:', error);
      throw error;
    }
  }

  /**
   * Delete code
   */
  async deleteCode(id) {
    try {
      const response = await apiService.delete(`/bel/codes/admin/codes/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting code:', error);
      throw error;
    }
  }

  /**
   * Get values by code ID
   */
  async getValuesByCodeId(codeId) {
    try {
      const response = await apiService.get(`/bel/codes/admin/codes/${codeId}/values`);
      return response;
    } catch (error) {
      console.error(`Error fetching values for code ${codeId}:`, error);
      throw error;
    }
  }

  /**
   * Create new code value
   */
  async createCodeValue(valueData) {
    try {
      const response = await apiService.post('/bel/codes/admin/values', valueData);
      return response;
    } catch (error) {
      console.error('Error creating code value:', error);
      throw error;
    }
  }

  /**
   * Update code value
   */
  async updateCodeValue(id, valueData) {
    try {
      const response = await apiService.put(`/bel/codes/admin/values/${id}`, valueData);
      return response;
    } catch (error) {
      console.error('Error updating code value:', error);
      throw error;
    }
  }

  /**
   * Delete code value
   */
  async deleteCodeValue(id) {
    try {
      const response = await apiService.delete(`/bel/codes/admin/values/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting code value:', error);
      throw error;
    }
  }

  /**
   * Register candidate using robust system
   */
  async registerCandidate(candidateData) {
    try {
      return await apiService.post('/bel/scanqr/register', candidateData);
    } catch (error) {
      console.error('Error registering candidate:', error);
      throw error;
    }
  }

  /**
   * Find roll number
   */
  async findRollNumber(searchData) {
    try {
      return await apiService.post('/bel/scanqr/find', searchData);
    } catch (error) {
      console.error('Error finding roll number:', error);
      throw error;
    }
  }

  /**
   * Filter only active items from array
   */
  filterActiveItems(items) {
    if (!Array.isArray(items)) return items;
    return items.filter(item => item.isActive !== false);
  }

  /**
   * Filter active items from hierarchical structure
   */
  filterActiveHierarchical(hierarchicalData) {
    if (!hierarchicalData || !hierarchicalData.values) return hierarchicalData;
    
    const filteredValues = {};
    Object.keys(hierarchicalData.values).forEach(key => {
      const items = hierarchicalData.values[key];
      if (Array.isArray(items)) {
        filteredValues[key] = this.filterActiveItems(items);
      }
    });
    
    return {
      ...hierarchicalData,
      values: filteredValues
    };
  }

  /**
   * Parse form configuration for easy use in components
   * Only includes active items
   */
  parseFormConfiguration(config) {
    const parsed = {
      posts: [],
      categories: [],
      locations: [],
      pwbdOptions: [],
      qualifications: [],
      specializations: {}
    };

    // Parse posts with additional data - only active ones
    if (config.post) {
      const activePosts = this.filterActiveItems(config.post);
      parsed.posts = activePosts.map(post => ({
        ...post,
        qualificationRequired: post.qualificationRequired || 'Not specified',
        completionYearLabel: post.completionYearLabel || 'Completion Year'
      }));
    }

    // Parse categories - only active ones
    if (config.category) {
      const activeCategories = this.filterActiveItems(config.category);
      parsed.categories = activeCategories.map(c => c.valueName);
    }

    // Parse locations - only active ones
    if (config.location) {
      console.log('🔍 Parsing location config:', config.location);
      // Handle hierarchical location data
      if (config.location.isHierarchical && config.location.values) {
        console.log('🔍 Location is hierarchical, filtering active items');
        const filteredLocation = this.filterActiveHierarchical(config.location);
        parsed.locations = filteredLocation.values;
        parsed.locationHierarchy = filteredLocation;
      } else if (Array.isArray(config.location)) {
        console.log('🔍 Location is array, filtering active items');
        const activeLocations = this.filterActiveItems(config.location);
        parsed.locations = activeLocations.map(l => l.valueName);
      } else {
        console.log('🔍 Location is neither hierarchical nor array, setting empty');
        parsed.locations = [];
      }
    }

    // Parse PwBD options - only active ones
    if (config.pwbd) {
      const activePwbd = this.filterActiveItems(config.pwbd);
      parsed.pwbdOptions = activePwbd.map(p => p.valueName);
    }

    // Parse qualifications - only active ones
    if (config.qualification) {
      parsed.qualifications = this.filterActiveItems(config.qualification);
    }

    // Parse specializations - only active ones
    if (config.specialization && config.specialization.isHierarchical) {
      const filteredSpecialization = this.filterActiveHierarchical(config.specialization);
      parsed.specializations = filteredSpecialization.values || {};
    }

    console.log('🔍 Final parsed config (active items only):', parsed);
    return parsed;
  }

  /**
   * Get specializations for a specific post - only active ones
   */
  getSpecializationsForPost(config, postCode) {
    if (!config.specialization || !config.specialization.isHierarchical) return [];
    
    const specializations = config.specialization.values[postCode] || [];
    return this.filterActiveItems(specializations);
  }

  /**
   * Get locations for a specific post - only active ones
   */
  getLocationsForPost(config, postCode) {
    console.log('🔍 getLocationsForPost called with:', { config, postCode });
    console.log('🔍 Config keys:', Object.keys(config));
    console.log('🔍 Config.location:', config.location);
    console.log('🔍 Config.locationHierarchy:', config.locationHierarchy);
    
    // Use locationHierarchy if available, otherwise fall back to location
    const locationData = config.locationHierarchy || config.location;
    
    if (!locationData || !locationData.isHierarchical) {
      console.log('🔍 Location not hierarchical, filtering and returning all locations');
      // Fallback to all locations if not hierarchical
      const locations = Array.isArray(locationData) ? locationData : [];
      return this.filterActiveItems(locations);
    }
    
    console.log('🔍 Location is hierarchical, checking values:', locationData.values);
    
    // Get locations for the specific post
    const postLocations = locationData.values[postCode] || [];
    console.log('🔍 Post-specific locations for', postCode, ':', postLocations);
    
    // Also include locations with empty parent (available for all posts)
    const allLocations = locationData.values[''] || [];
    console.log('🔍 General locations (empty parent):', allLocations);
    
    // Combine locations
    const combinedLocations = [...postLocations, ...allLocations];
    
    // Filter only active locations
    const activeLocations = this.filterActiveItems(combinedLocations);
    console.log('🔍 Active combined locations:', activeLocations);
    return activeLocations;
  }
}

// Create a singleton instance
const belRobustService = new BELRobustService();

export default belRobustService;
