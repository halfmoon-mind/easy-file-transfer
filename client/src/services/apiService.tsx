import axios from "axios";

const BASE_URL = "https://socket.easyfile.site";
const SOCKET_BASE_URL = "wss://socket.easyfile.site";

const apiService = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

// 요청 인터셉터 설정 (필요에 따라)
apiService.interceptors.request.use(
    (config) => {
        // 예: config.headers.Authorization = `Bearer ${token}`;

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터 설정 (필요에 따라)
apiService.interceptors.response.use(
    (response) => {
        // 응답 데이터를 가공할 수 있습니다.
        return response;
    },
    (error) => {
        // 에러 응답을 처리할 수 있습니다.
        return Promise.reject(error);
    }
);

export default apiService;
export { BASE_URL, SOCKET_BASE_URL };
