import { type ChangeEvent, type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useApi } from "@/api/ApiProvider";
import { useAuth } from "@/api/AuthProvider";
import { useLoading } from "@/components/LoadingProvider";
import { useToast } from "@/components/Toast/ToastProvider";
import { downloadAsFile } from "@/util/file";

function Admin() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { logout } = useAuth();

    return (
        <main className="text-container p-6 shadow-md">
            <h1 className="mb-4 text-2xl font-bold">{t("admin.heading")}</h1>
            <DeleteUser />
            <QueryEmails />

            <div className="mt-6 w-full space-y-4 bg-white p-6 shadow-md">
                <h2 className="text-xl font-semibold">{t("admin.logout")}</h2>
                <button
                    type="submit"
                    className="cursor-pointer bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 active:bg-blue-700"
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

function DeleteUser() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
    });

    const { t } = useTranslation();
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
            showToast("success", t("admin.userdata.success-delete"));
        } catch (error) {
            showToast("error", `${t("admin.userdata.error-delete")}: ${(error as Error).message}`);
        }
        hideLoading();
    };

    return (
        <form onSubmit={handleSubmit} className="w-full space-y-4 bg-white p-6 shadow-md">
            <h2 className="text-xl font-semibold">{t("admin.userdata.heading")}</h2>
            <h3 className="mt-[-0.75rem] text-gray-400">{t("admin.userdata.hint")}</h3>
            <h3 className="mt-[-0.75rem] text-gray-400">{t("admin.userdata.hint2")}</h3>

            <div>
                <label className="mb-1 block text-sm font-medium">
                    {t("admin.userdata.firstname")}
                </label>
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
                <label className="mb-1 block text-sm font-medium">
                    {t("admin.userdata.lastname")}
                </label>
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
                <label className="mb-1 block text-sm font-medium">
                    {t("admin.userdata.email")}
                </label>
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
                className="cursor-pointer bg-red-500 px-4 py-2 text-white hover:bg-red-600 active:bg-red-700"
            >
                {t("admin.userdata.delete")}
            </button>
        </form>
    );
}

function QueryEmails() {
    const [formData, setFormData] = useState({
        interval: "30days",
    });

    const { t } = useTranslation();
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
            const csvFile = await api.get<string>("/admin/emails", {
                params: {
                    interval: formData.interval,
                },
            });
            downloadAsFile(csvFile.data, "emails.csv");
            showToast("success", t("admin.query-emails.success-query"), 5000);
        } catch (error) {
            showToast(
                "error",
                `${t("admin.query-emails.error-query")}: ${(error as Error).message}`,
            );
        }
        hideLoading();
    };

    return (
        <form onSubmit={handleSubmit} className="mt-6 w-full space-y-4 bg-white p-6 shadow-md">
            <h2 className="text-xl font-semibold">{t("admin.query-emails.heading")}</h2>
            <h3 className="mt-[-0.75rem] text-gray-400">{t("admin.query-emails.hint")}</h3>
            <h3 className="mt-[-0.75rem] text-gray-400">{t("admin.query-emails.hint2")}</h3>

            <div>
                <label className="block text-sm font-medium">
                    {t("admin.query-emails.heading")}
                </label>
                <div className="mt-1 flex gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="interval"
                            value="30days"
                            checked={formData.interval === "30days"}
                            onChange={handleChange}
                        />
                        {t("admin.query-emails.radio-30days")}
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="interval"
                            value="90days"
                            checked={formData.interval === "90days"}
                            onChange={handleChange}
                        />
                        {t("admin.query-emails.radio-90days")}
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="interval"
                            value="1year"
                            checked={formData.interval === "1year"}
                            onChange={handleChange}
                        />
                        {t("admin.query-emails.radio-1year")}
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="interval"
                            value="all"
                            checked={formData.interval === "all"}
                            onChange={handleChange}
                        />
                        {t("admin.query-emails.radio-all")}
                    </label>
                </div>
            </div>

            <button
                type="submit"
                className="cursor-pointer bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 active:bg-blue-700"
            >
                {t("admin.query-emails.query")}
            </button>
        </form>
    );
}

// function QueryEmails() {
//     const [formData, setFormData] = useState({
//         interval: "30days",
//     });
//
//     const { t } = useTranslation();
//     const {
//         state: { data: token },
//     } = useAuth();
//
//     const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
//         const { name, value } = e.target;
//         setFormData((prev) => ({ ...prev, [name]: value }));
//     };
//
//     return (
//         <form className="mt-6 w-full space-y-4 bg-white p-6 shadow-md">
//             <h2 className="text-xl font-semibold">{t("admin.query-emails.heading")}</h2>
//             <h3 className="mt-[-0.75rem] text-gray-400">{t("admin.query-emails.hint")}</h3>
//             <h3 className="mt-[-0.75rem] text-gray-400">{t("admin.query-emails.hint2")}</h3>
//
//             <div>
//                 <label className="block text-sm font-medium">
//                     {t("admin.query-emails.heading")}
//                 </label>
//                 <div className="mt-1 flex gap-4">
//                     <label className="flex items-center gap-2">
//                         <input
//                             type="radio"
//                             name="interval"
//                             value="30days"
//                             checked={formData.interval === "30days"}
//                             onChange={handleChange}
//                         />
//                         {t("admin.query-emails.radio-30days")}
//                     </label>
//                     <label className="flex items-center gap-2">
//                         <input
//                             type="radio"
//                             name="interval"
//                             value="90days"
//                             checked={formData.interval === "90days"}
//                             onChange={handleChange}
//                         />
//                         {t("admin.query-emails.radio-90days")}
//                     </label>
//                     <label className="flex items-center gap-2">
//                         <input
//                             type="radio"
//                             name="interval"
//                             value="1year"
//                             checked={formData.interval === "1year"}
//                             onChange={handleChange}
//                         />
//                         {t("admin.query-emails.radio-1year")}
//                     </label>
//                     <label className="flex items-center gap-2">
//                         <input
//                             type="radio"
//                             name="interval"
//                             value="all"
//                             checked={formData.interval === "all"}
//                             onChange={handleChange}
//                         />
//                         {t("admin.query-emails.radio-all")}
//                     </label>
//                 </div>
//             </div>
//
//             <a
//                 className="cursor-pointer bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 active:bg-blue-700"
//                 href={`${import.meta.env.VITE_API_BASE_URL}/admin/emails?interval=${formData.interval}&token=${token!.token}`}
//                 download
//             >
//                 {t("admin.query-emails.query")}
//             </a>
//         </form>
//     );
// }

export default Admin;
