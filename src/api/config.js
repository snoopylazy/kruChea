const API_CONFIGS = {
  // BASE_URL: 'https://ambelcash.com',
  // BASE_URL: "http://localhost:4000",
   BASE_URL: "http://192.168.100.36:4000",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.VUE_APP_BEARER_API_TOKEN}`,
  },
};

export default API_CONFIGS;
