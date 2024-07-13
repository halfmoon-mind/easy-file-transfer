import axios from 'axios';

const BASE_URL = 'https://socket.easyfile.site';
// const BASE_URL = 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 2000
});

apiClient.interceptors.request.use(
  (config) => {
    // 예: config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정 (필요에 따라)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
export { BASE_URL };
