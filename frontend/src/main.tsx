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

// Router as the outermost element as many UI elements may want to navigate
// The UI element providers ToastProvider and LoadingProvider afterward due to lack of dependencies
// AuthProvider uses actually its own API client to separate the concerns and make Auth easily available for the real API client
// DataProvider is dependent on the API client and thus comes after ApiProvider
createRoot(document.getElementById("root")!).render(
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
