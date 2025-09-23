import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/api/AuthProvider";
import { useLoading } from "@/components/LoadingProvider";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const {
        login,
        state: { data: token },
    } = useAuth();
    const { showLoading, hideLoading } = useLoading();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!username || !password) {
            setError(t("login.error-incomplete"));
            return;
        }

        showLoading();
        const loginResult = await login(username, password);
        hideLoading();
        if (!loginResult) {
            setError(t("login.error-failed"));
        }
    };

    useEffect(() => {
        if (token && token.expiresAt.getTime() > new Date().getTime()) {
            navigate("/");
        }
    }, [token, navigate]);

    return (
        <main className="full-wo-header-height flex items-center justify-center bg-gray-50">
            <div className="mt-[-var(--header-height)] w-full max-w-md bg-white p-6 shadow-lg">
                <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">
                    {t("login.heading")}
                </h1>

                {error && <div className="mb-4 bg-red-100 p-2 text-sm text-red-600">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="username"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            {t("login.username")}
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder={t("login.username-placeholder")}
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            {t("login.password")}
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full cursor-pointer bg-blue-600 p-2 font-medium text-white transition hover:bg-blue-700 active:bg-blue-800"
                    >
                        {t("login.sign-in")}
                    </button>
                </form>
            </div>
        </main>
    );
}

export default Login;
