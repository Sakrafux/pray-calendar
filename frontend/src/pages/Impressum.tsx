import { useTranslation } from "react-i18next";

function Impressum() {
    const { t } = useTranslation();

    return (
        <main className="text-container p-4">
            <h1 className="mb-6 text-2xl font-bold">{t("impressum.heading")}</h1>

            <h2 className="mb-2 text-xl font-semibold">{t("impressum.name-heading")}</h2>
            <p>{t("impressum.name")}</p>
            <h2 className="mt-4 mb-2 text-xl font-semibold">{t("impressum.contact-heading")}</h2>
            <p>
                <b className="font-semibold">{t("impressum.email-heading")}:</b>{" "}
                {t("impressum.email")}
            </p>
            <p>
                <b className="font-semibold">{t("impressum.phone-heading")}:</b>{" "}
                {t("impressum.phone")}
            </p>
            <h2 className="mt-4 mb-2 text-xl font-semibold">{t("impressum.address-heading")}</h2>
            <p>{t("impressum.address")}</p>
            <h2 className="mt-4 mb-2 text-xl font-semibold">
                {t("impressum.development-heading")}
            </h2>
            <p>
                <b className="font-semibold">{t("impressum.developer-heading")}:</b>{" "}
                {t("impressum.developer")}
            </p>
            <p>
                <b className="font-semibold">{t("impressum.github-heading")}:</b>{" "}
                <a
                    href={t("impressum.github")}
                    target="_blank"
                    className="text-blue-600 decoration-2 underline-offset-4 hover:underline"
                >
                    {t("impressum.github")}
                </a>
            </p>
            <h2 className="mt-4 mb-2 text-xl font-semibold">{t("impressum.purpose-heading")}</h2>
            <p>{t("impressum.purpose")}</p>
        </main>
    );
}

export default Impressum;
