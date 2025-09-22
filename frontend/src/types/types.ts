export type ApiData<T> = {
    data?: T;
    loading?: boolean;
    error?: Error;
};

export type ContextAction<P, T = string, E = any> = {
    type: T;
    params?: Record<string, any>;
    payload?: P;
    error?: E;
};

export type ToastType = "success" | "info" | "warning" | "error";

export type Toast = {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
};
