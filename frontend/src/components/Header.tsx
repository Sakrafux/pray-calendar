import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { useAuth } from "@/api/AuthProvider";

const linkBaseClasses = "text-gray-600 hover:text-gray-900";
const linkActiveClasses =
    "text-gray-900 underline underline-offset-4 underline-gray-900 decoration-2";

function Header() {
    const [menuOpen, setMenuOpen] = useState(false);

    const {
        state: { data: token },
    } = useAuth();

    const { t } = useTranslation();

    return (
        <header className="header-height sticky top-0 z-50 bg-white px-6 py-4 shadow-md">
            <div className="hidden items-center justify-between md:flex">
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

                <div className="flex flex-1 justify-end space-x-4">
                    {token ? (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) =>
                                `${linkBaseClasses} ${isActive ? linkActiveClasses : ""}`
                            }
                        >
                            {t("header.admin")}
                        </NavLink>
                    ) : null}
                </div>
            </div>

            <div className="flex md:hidden">
                <div className="flex-1 flex-shrink-0 cursor-default">
                    <h1 className="text-xl font-bold text-gray-900">{t("header.heading")}</h1>
                </div>
                <button
                    className="-m-2 cursor-pointer rounded-full p-2 active:bg-gray-300"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <Menu width={28} height={28} />
                </button>
                <AnimatePresence>
                    {menuOpen && (
                        <motion.nav
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="absolute top-16 left-0 flex w-full flex-col overflow-hidden bg-white shadow-md"
                        >
                            <NavLink
                                to="/"
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                    `cursor-pointer border-t border-gray-200 px-4 py-4 hover:bg-gray-100 active:bg-gray-200 ${isActive ? "bg-gray-200 hover:bg-gray-200" : ""}`
                                }
                            >
                                {t("header.home")}
                            </NavLink>
                            <NavLink
                                to="/faq"
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                    `cursor-pointer border-t border-gray-200 px-4 py-4 hover:bg-gray-100 active:bg-gray-200 ${isActive ? "bg-gray-200 hover:bg-gray-200" : ""}`
                                }
                            >
                                {t("header.faq")}
                            </NavLink>
                            <NavLink
                                to="/impressum"
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                    `cursor-pointer border-t border-gray-200 px-4 py-4 hover:bg-gray-100 active:bg-gray-200 ${isActive ? "bg-gray-200 hover:bg-gray-200" : ""}`
                                }
                            >
                                {t("header.impressum")}
                            </NavLink>
                            {token ? (
                                <NavLink
                                    to="/admin"
                                    onClick={() => setMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `cursor-pointer border-t border-gray-200 px-4 py-4 hover:bg-gray-100 active:bg-gray-200 ${isActive ? "bg-gray-200 hover:bg-gray-200" : ""}`
                                    }
                                >
                                    {t("header.admin")}
                                </NavLink>
                            ) : null}
                        </motion.nav>
                    )}
                </AnimatePresence>
            </div>
        </header>
    );
}

export default Header;
