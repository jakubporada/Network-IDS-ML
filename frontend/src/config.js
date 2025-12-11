export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  health: `${API_URL}/health`,
  predictSimple: `${API_URL}/predict/simple`,
  predictFull: `${API_URL}/predict/full`,
  docs: `${API_URL}/docs`,
};

// API helper function for consistent error handling
export const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

export default API_ENDPOINTS;
