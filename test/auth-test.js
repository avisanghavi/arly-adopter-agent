const axios = require('axios');
const { expect } = require('chai');

describe('Authentication Flow', () => {
  const API_URL = 'http://localhost:3001/api';
  
  it('should return unauthenticated initially', async () => {
    const response = await axios.get(`${API_URL}/auth/status`);
    expect(response.data.isAuthenticated).to.equal(false);
  });

  it('should have Google auth endpoint available', async () => {
    try {
      await axios.get(`${API_URL}/auth/google`);
    } catch (error) {
      // We expect a redirect, so a 3xx status code
      expect(error.response.status).to.be.within(300, 399);
    }
  });
}); 