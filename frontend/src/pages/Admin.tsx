import { type ChangeEvent, type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useApi } from "@/api/ApiProvider";
import { useAuth } from "@/api/AuthProvider";
import { useLoading } from "@/components/LoadingProvider";
import { useToast } from "@/components/Toast/ToastProvider";

function Admin() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
    });

    const navigate = useNavigate();
    const { t } = useTranslation();
    const { logout } = useAuth();
    const api = useApi();
    const { showToast } = useToast();
    const { showLoading, hideLoading } = useLoading();

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        showLoading();
        try {
            await api.delete("/admin/user", {
                params: {
                    firstname: formData.firstName,
                    lastname: formData.lastName,
                    email: formData.email,
                },
            });
            showToast("success", "Successfully deleted user");
        } catch (error) {
            showToast("error", (error as Error).message);
        }
        hideLoading();
    };

    return (
        <main className="text-container p-6 shadow-md">
            <h1 className="mb-4 text-2xl font-bold">{t("admin.heading")}</h1>

            <form onSubmit={handleSubmit} className="w-full space-y-4 bg-white p-6 shadow-md">
                <h2 className="text-xl font-semibold">{t("admin.userinfo")}</h2>
                <h3 className="mt-[-0.75rem] text-gray-400">{t("admin.userinfo-hint")}</h3>
                <h3 className="mt-[-0.75rem] text-gray-400">{t("admin.userinfo-hint2")}</h3>

                <div>
                    <label className="mb-1 block text-sm font-medium">{t("admin.firstname")}</label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full border p-2 focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">{t("admin.lastname")}</label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full border p-2 focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">{t("admin.email")}</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border p-2 focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="bg-red-500 px-4 py-2 text-white hover:bg-red-600 active:bg-red-700"
                >
                    {t("admin.delete")}
                </button>
            </form>
            <div className="mt-6 w-full space-y-4 bg-white p-6 shadow-md">
                <h2 className="text-xl font-semibold">{t("admin.logout")}</h2>
                <button
                    type="submit"
                    className="bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 active:bg-blue-700"
                    onClick={async () => {
                        await logout();
                        navigate("/");
                    }}
                >
                    {t("admin.logout")}
                </button>
            </div>
        </main>
    );
}

export default Admin;
