const axios = require('axios');

async function getToken() {
  try {
    const response = await axios.post('http://localhost:3005/api/auth/login', {
      email: 'test@pendo.com',
      password: 'password123'
    });
    console.log(response.data.token);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

getToken();
