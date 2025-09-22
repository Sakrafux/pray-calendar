import { motion } from "framer-motion";
import {
    createContext,
    type PropsWithChildren,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";

type LoadingContextType = {
    isLoading: boolean;
    showLoading: (ignoreDelay?: boolean) => void;
    hideLoading: () => void;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: PropsWithChildren) => {
    const [isLoading, setIsLoading] = useState(false);
    const delayTimer = useRef<NodeJS.Timeout | null>(null);

    const showLoading = useCallback((ignoreDelay?: boolean) => {
        if (!delayTimer.current) {
            delayTimer.current = setTimeout(() => setIsLoading(true), ignoreDelay ? 0 : 100);
        }
    }, []);

    const hideLoading = useCallback(() => {
        if (delayTimer.current) {
            clearTimeout(delayTimer.current);
            delayTimer.current = null;
        }
        setIsLoading(false);
    }, []);

    return (
        <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
            {children}
            {isLoading && <LoadingOverlay />}
        </LoadingContext.Provider>
    );
};

export function useLoading() {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error("useLoading must be used within a LoadingProvider");
    }
    return context;
}

function LoadingOverlay() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </motion.div>
    );
}
