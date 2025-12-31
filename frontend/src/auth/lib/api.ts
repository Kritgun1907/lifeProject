    /**
     * ===============================================
     * CENTRAL AXIOS CLIENT
     * ===============================================
     * Single entry point for all API communication.
     * 
     * Design Decisions:
     * - Access token → localStorage (frontend manages)
     * - Refresh token → httpOnly cookie (backend manages)
     * - Frontend NEVER touches refresh token directly
     * 
     * Features:
     * - Automatic token injection
     * - Token refresh on 401
     * - Request/Response interceptors
     * - Type-safe API responses
     */

    import axios, { 
    AxiosInstance, 
    AxiosError, 
    InternalAxiosRequestConfig,
    AxiosResponse 
    } from "axios";

    // ===============================================
    // CONFIGURATION
    // ===============================================

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

    // Token storage keys
    const ACCESS_TOKEN_KEY = "accessToken";

    // ===============================================
    // TYPES
    // ===============================================

    export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    errors?: Record<string, string>;
    }

    export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    }

    export interface ApiError {
    success: false;
    message: string;
    error?: string;
    errors?: Record<string, string>;
    statusCode?: number;
    }

    // ===============================================
    // TOKEN MANAGEMENT (localStorage only for access token)
    // ===============================================

    export const tokenManager = {
    getAccessToken: (): string | null => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },

    setAccessToken: (token: string): void => {
        if (typeof window === "undefined") return;
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
    },

    removeAccessToken: (): void => {
        if (typeof window === "undefined") return;
        localStorage.removeItem(ACCESS_TOKEN_KEY);
    },

    hasAccessToken: (): boolean => {
        return !!tokenManager.getAccessToken();
    },
    };

    // ===============================================
    // AXIOS INSTANCE
    // ===============================================

    const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // CRITICAL: Sends httpOnly cookies (refresh token)
    });

    // ===============================================
    // REQUEST INTERCEPTOR
    // Automatically attach access token to every request
    // ===============================================

    api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = tokenManager.getAccessToken();
        
        if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        }

        // Log requests in development
        if (process.env.NODE_ENV === "development") {
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
    );

    // ===============================================
    // RESPONSE INTERCEPTOR
    // Handle token refresh on 401
    // ===============================================

    let isRefreshing = false;
    let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
    }> = [];

    const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
        prom.reject(error);
        } else {
        prom.resolve(token);
        }
    });
    failedQueue = [];
    };

    api.interceptors.response.use(
    (response: AxiosResponse) => {
        // Log responses in development
        if (process.env.NODE_ENV === "development") {
        console.log(`✅ API Response: ${response.config.url}`, response.data);
        }
        return response;
    },
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If error is not 401 or request already retried, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
        // Log errors in development
        if (process.env.NODE_ENV === "development") {
            console.error(`❌ API Error: ${originalRequest?.url}`, error.response?.data);
        }
        return Promise.reject(error);
        }

        // Handle token refresh
        if (isRefreshing) {
        // Queue this request while refreshing
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        })
            .then((token) => {
            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
        // Call refresh endpoint (refresh token is in httpOnly cookie)
        // Backend returns: { success: true, token: "..." } - token at root, NOT in data
        const response = await axios.post<{ success: boolean; token: string; message?: string }>(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
        );

        const newToken = response.data.token;

        if (newToken) {
            tokenManager.setAccessToken(newToken);
            processQueue(null, newToken);

            // Retry original request with new token
            if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
        } else {
            throw new Error("No token in refresh response");
        }
        } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        
        // Clear token and redirect to login
        tokenManager.removeAccessToken();
        
        // Only redirect if in browser and not already on auth page
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
            window.location.href = "/auth/login";
        }
        
        return Promise.reject(refreshError);
        } finally {
        isRefreshing = false;
        }
    }
    );

    // ===============================================
    // TYPED HTTP METHODS
    // ===============================================

    export const apiClient = {
    get: <T>(url: string, params?: Record<string, unknown>) =>
        api.get<ApiResponse<T>>(url, { params }).then((res) => res.data),

    post: <T>(url: string, data?: unknown) =>
        api.post<ApiResponse<T>>(url, data).then((res) => res.data),

    put: <T>(url: string, data?: unknown) =>
        api.put<ApiResponse<T>>(url, data).then((res) => res.data),

    patch: <T>(url: string, data?: unknown) =>
        api.patch<ApiResponse<T>>(url, data).then((res) => res.data),

    delete: <T>(url: string) =>
        api.delete<ApiResponse<T>>(url).then((res) => res.data),

    // For paginated responses
    getPaginated: <T>(url: string, params?: Record<string, unknown>) =>
        api.get<PaginatedResponse<T>>(url, { params }).then((res) => res.data),

    // For file uploads
    upload: <T>(url: string, formData: FormData) =>
        api.post<ApiResponse<T>>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        }).then((res) => res.data),
    };

    // Export the raw axios instance for advanced use cases
    export default api;
