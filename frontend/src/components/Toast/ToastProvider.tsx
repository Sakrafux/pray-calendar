import {
    createContext,
    type PropsWithChildren,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";

import { ToastContainer } from "@/components/Toast/Toast";
import type { Toast, ToastType } from "@/types";

type ToastContextType = {
    showToast: (type: ToastType, message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timers = useRef<Record<string, NodeJS.Timeout>>({});

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        if (timers.current[id]) {
            clearTimeout(timers.current[id]);
            delete timers.current[id];
        }
    }, []);

    const showToast = useCallback(
        (type: ToastType, message: string, duration?: number) => {
            const id = Math.random().toString(36);
            const newToast: Toast = { id, type, message, duration };

            setToasts((prev) => [...prev, newToast]);

            if (duration && duration > 0) {
                timers.current[id] = setTimeout(() => {
                    removeToast(id);
                }, duration);
            }
        },
        [removeToast],
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
