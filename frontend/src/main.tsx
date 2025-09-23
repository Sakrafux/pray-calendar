import "@/index.css";
import "@/i18n";

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { ApiProvider } from "@/api/ApiProvider";
import { AuthProvider } from "@/api/AuthProvider";
import { DataProviders } from "@/api/data/Providers";
import App from "@/App.tsx";
import { LoadingProvider } from "@/components/LoadingProvider";
import { ToastProvider } from "@/components/Toast/ToastProvider";

createRoot(document.getElementById("root")!).render(
    <BrowserRouter basename={import.meta.env.VITE_BASE || "/"}>
        <ToastProvider>
            <LoadingProvider>
                <AuthProvider>
                    <ApiProvider>
                        <DataProviders>
                            <App />
                        </DataProviders>
                    </ApiProvider>
                </AuthProvider>
            </LoadingProvider>
        </ToastProvider>
    </BrowserRouter>,
);
