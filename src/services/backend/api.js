import axios from 'axios';
import { matchesPath } from '../../utils/helpers';

// Align with your Spring Security path structure (/api/auth/...)
const NO_REFRESH_PATHS = [
    '/auth/refresh',
    '/auth/login',
    '/auth/signup',
    '/auth/login/verify-otp'
];

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ------------------ Axios Clients ------------------

// Client for auth operations that need cookies (login, logout)
export const authApi = axios.create({
    baseURL: BACKEND_URL,
    withCredentials: true,
});

// Feature client for authenticated business APIs, no cookies needed, only access token (bearer token)
export const protectedApi = axios.create({
    baseURL: BACKEND_URL,
    withCredentials: false,
});

// Public client for unauthenticated routes
export const publicApi = axios.create({
    baseURL: BACKEND_URL,
    withCredentials: false,
});

// Isolated client specifically for refreshing tokens (no interceptors attached)
const refreshApi = axios.create({
    baseURL: BACKEND_URL,
    withCredentials: true, // Required so browser sends the HttpOnly refresh_token cookie
});

// ------------------ Token State ------------------

export let memoryAccessToken = null;

export const setMemoryToken = (token) => {
    memoryAccessToken = token;
};

// ------------------ Concurrency Lock & Queue ------------------

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
};

const forceLogout = () => {
    setMemoryToken(null);
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
};

/**
 * Request a new access token using the refresh cookie
 */
const refreshAccessToken = async () => {
    if (isRefreshing) {
        // if already refreshing, queue this request and return a promise that resolves when the refresh is done
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        });
    }

    isRefreshing = true;

    try {
        // Adjust to match your backend mapping: /api/auth/refresh or /auth/refresh
        const response = await refreshApi.post('/auth/refresh');
        const { accessToken } = response.data;

        setMemoryToken(accessToken);
        processQueue(null, accessToken);
        return accessToken;
    } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        throw refreshError;
    } finally {
        isRefreshing = false;
    }
};

// ------------------ Interceptors ------------------

[authApi, protectedApi].forEach((instance) => {
    // Attach Access Token header
    instance.interceptors.request.use(
        (config) => {
            if (memoryAccessToken) {
                config.headers.Authorization = `Bearer ${memoryAccessToken}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Silent Refresh on 401
    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            if (!originalRequest) {
                return Promise.reject(error);
            }

            // Skip refresh logic on auth routes to avoid recursive triggers
            if (matchesPath(originalRequest.url, NO_REFRESH_PATHS)) {
                return Promise.reject(error);
            }

            if (error.response?.status === 401 && !originalRequest._retry) {
                // set BEFORE awaiting, prevents retry loops for this request
                originalRequest._retry = true;

                try {
                    const newAccessToken = await refreshAccessToken();
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    // Retry the original request with the new access token
                    return instance(originalRequest);
                } catch (refreshErr) {
                    // Session expired - fail cleanly so UI error handlers can respond
                    return Promise.reject(refreshErr);
                }
            }

            return Promise.reject(error);
        }
    );
});

export default authApi;