import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8080",
    timeout: 10000,
});

// 요청 인터셉터 설정 (필요에 따라)
api.interceptors.request.use(
    (config) => {
        // 예: config.headers.Authorization = `Bearer ${token}`;

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터 설정 (필요에 따라)
api.interceptors.response.use(
    (response) => {
        // 응답 데이터를 가공할 수 있습니다.
        return response;
    },
    (error) => {
        // 에러 응답을 처리할 수 있습니다.
        return Promise.reject(error);
    }
);

export default api;
