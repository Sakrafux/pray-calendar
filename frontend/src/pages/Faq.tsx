import { useTranslation } from "react-i18next";

function Faq() {
    const { t } = useTranslation();

    return (
        <main className="text-container p-4">
            <h1 className="mb-4 text-2xl font-bold">{t("faq.heading")}</h1>

            <h2 className="text-l font-semibold">{t("faq.purpose-q")}</h2>
            <p>{t("faq.purpose")}</p>
            <h2 className="text-l mt-2 font-semibold">{t("faq.location-q")}</h2>
            <p>{t("faq.location")}</p>
            <h2 className="text-l mt-2 font-semibold">{t("faq.calendar-q")}</h2>
            <p>{t("faq.calendar")}</p>
            <h2 className="text-l mt-2 font-semibold">{t("faq.creation-q")}</h2>
            <p>{t("faq.creation")}</p>
            <h2 className="text-l mt-2 font-semibold">{t("faq.account-q")}</h2>
            <p>{t("faq.account")}</p>
            <h2 className="text-l mt-2 font-semibold">{t("faq.delete-q")}</h2>
            <p>{t("faq.delete")}</p>
            <h2 className="text-l mt-2 font-semibold">{t("faq.data-security-q")}</h2>
            <p>{t("faq.data-security")}</p>
            <h2 className="text-l mt-2 font-semibold">{t("faq.data-removal-q")}</h2>
            <p>{t("faq.data-removal")}</p>

            <h2 className="mt-4 text-xl font-semibold">{t("faq.privacy-title")}</h2>
            <p>{t("faq.privacy")}</p>
            <p>{t("faq.privacy2")}</p>
        </main>
    );
}

export default Faq;
