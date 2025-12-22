import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

function Home() {
    const { t } = useTranslation();

    return (
        <main className="text-container p-4">
            {/*TODO replace with actual image*/}
            <img
                src="/anbetung-platzhalter.jpg"
                alt={t("home.image-alt")}
                className="h-56 w-full md:h-96"
            />
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

export default Home;
