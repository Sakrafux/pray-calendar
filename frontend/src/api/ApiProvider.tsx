import axios, { type AxiosInstance } from "axios";
import { createContext, type PropsWithChildren, useContext } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/api/AuthProvider";
import { useToast } from "@/components/Toast/ToastProvider";

export function createApi() {
    return axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL,
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
    });
}

const ApiContext = createContext<AxiosInstance | undefined>(undefined);

export function ApiProvider({ children }: PropsWithChildren) {
    const {
        state: { data: token },
        refresh,
        logout,
    } = useAuth();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const api = createApi();

    api.interceptors.request.use(
        async (config) => {
            if (token) {
                if (token.expiresAt.getTime() > new Date().getTime()) {
                    config.headers.Authorization = `Bearer ${token.token}`;
                } else {
                    const newToken = await refresh();
                    if (newToken) {
                        config.headers.Authorization = `Bearer ${newToken.token}`;
                    } else {
                        await logout();
                        showToast("error", t("api.logout"));
                        const controller = new AbortController();
                        controller.abort();
                        throw new axios.Cancel("Request canceled: no auth token");
                    }
                }
            }
            return config;
        },
        (error) => Promise.reject(error),
    );

    api.interceptors.response.use(
        (response) => {
            return response;
        },
        (error) => {
            if (error.status === 401) {
                showToast("error", t("api.401"));
            } else if (error.status === 403) {
                showToast("error", t("api.403"));
            }
            return Promise.reject(error);
        },
    );

    return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi() {
    const context = useContext(ApiContext);
    if (!context) {
        throw new Error("useApi must be used within a ApiProvider");
    }
    return context;
}
