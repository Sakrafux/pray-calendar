import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { useAuth } from "@/api/AuthProvider";

const linkBaseClasses = "text-gray-600 hover:text-gray-900";
const linkActiveClasses =
    "text-gray-900 underline underline-offset-4 underline-gray-900 decoration-2";

function Header() {
    const {
        state: { data: token },
    } = useAuth();

    const { t } = useTranslation();

    return (
        <header className="header-height sticky top-0 z-50 bg-white px-6 py-4 shadow-md">
            <div className="flex items-center justify-between">
                <div className="flex-1 flex-shrink-0 cursor-default">
                    <h1 className="text-xl font-bold text-gray-900">{t("header.heading")}</h1>
                </div>

                <nav className="flex flex-1 justify-center space-x-8">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `${linkBaseClasses} ${isActive ? linkActiveClasses : ""}`
                        }
                    >
                        {t("header.home")}
                    </NavLink>
                    <NavLink
                        to="/faq"
                        className={({ isActive }) =>
                            `${linkBaseClasses} ${isActive ? linkActiveClasses : ""}`
                        }
                    >
                        {t("header.faq")}
                    </NavLink>
                    <NavLink
                        to="/impressum"
                        className={({ isActive }) =>
                            `${linkBaseClasses} ${isActive ? linkActiveClasses : ""}`
                        }
                    >
                        {t("header.impressum")}
                    </NavLink>
                </nav>

                <div className="flex flex-1 justify-end space-x-4"> {token ? "Admin" : null}</div>
            </div>
        </header>
    );
}

export default Header;
