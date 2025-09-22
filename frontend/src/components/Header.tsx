import { useTranslation } from "react-i18next";

import { useAuth } from "@/api/AuthProvider";

function Header() {
    const {
        state: { data: token },
    } = useAuth();

    const { t } = useTranslation();

    return (
        <header className="header-height sticky top-0 bg-white px-6 py-4 shadow-md">
            <div className="flex items-center justify-between">
                <div className="flex-shrink-0 cursor-default">
                    <h1 className="text-xl font-bold text-gray-900">{t("header.heading")}</h1>
                </div>

                <nav className="hidden items-center space-x-8 md:flex"></nav>

                <div className="flex items-center space-x-4"> {token ? "Admin" : null}</div>
            </div>
        </header>
    );
}

export default Header;
