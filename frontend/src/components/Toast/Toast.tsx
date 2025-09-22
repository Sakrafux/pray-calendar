import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import type { Toast, ToastType } from "@/types";

const toastColors: Record<ToastType, string> = {
    success: "bg-green-600 text-white",
    info: "bg-blue-600 text-white",
    warning: "bg-yellow-500 text-black",
    error: "bg-red-600 text-white",
};

export function ToastContainer({
    toasts,
    onClose,
}: {
    toasts: Toast[];
    onClose: (id: string) => void;
}) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onClose={onClose} />
                ))}
            </AnimatePresence>
        </div>
    );
}

export function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.2 }}
            className={`relative flex items-center justify-between px-4 py-2 shadow-[0_0_20px_rgba(0,0,0,0.4)] ${toastColors[toast.type]} max-w-sm`}
        >
            <span className="cursor-default pr-2">{toast.message}</span>
            <button
                onClick={() => onClose(toast.id)}
                className="ml-2 cursor-pointer rounded-full p-1 hover:bg-black/20"
            >
                <X size={16} />
            </button>
            {toast.duration && (
                <motion.div
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: toast.duration / 1000, ease: "linear" }}
                    className="absolute bottom-0 left-0 h-1 w-full origin-right bg-white/50"
                />
            )}
        </motion.div>
    );
}
