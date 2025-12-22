import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

function Home() {
    const { t } = useTranslation();

    return (
        <main className="text-container p-4">
            <CoverImage />
            <h1 className="mt-6 text-center text-4xl font-extrabold md:mt-8 md:text-6xl">
                {t("home.heading")}
            </h1>
            <div className="flex justify-center">
                <NavLink
                    to="/calendar"
                    className="my-12 cursor-pointer rounded-2xl bg-blue-500 px-8 py-4 text-2xl font-bold text-white shadow-[0_0_20px_rgba(0,0,0,0.6)] hover:bg-blue-600 active:bg-blue-700 md:my-16"
                >
                    {t("home.link-calendar")}
                </NavLink>
            </div>
            <p className="text-justify">{t("home.paragraph-stpoelten")}</p>
            <br />
            <p className="text-justify">{t("home.paragraph-worship")}</p>
        </main>
    );
}

function CoverImage() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const { t } = useTranslation();

    return (
        <div className="relative h-56 w-full overflow-hidden bg-gray-200 md:h-96">
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 z-10">
                    <div className="animate-shimmer h-full w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
                </div>
            )}

            {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                    <svg
                        className="mb-2 h-10 w-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    <span className="text-sm font-medium">{t("home.image-no")}</span>
                </div>
            )}

            {/*TODO replace with actual image*/}
            <img
                src={`${import.meta.env.BASE_URL}anbetung-platzhalter.jpg`}
                alt={t("home.image-alt")}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className="h-full w-full object-cover"
            />
        </div>
    );
}

export default Home;
