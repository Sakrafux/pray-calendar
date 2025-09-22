import { AnimatePresence, motion } from "framer-motion";
import { Trash, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { CalendarEntryExtDto } from "@/types";

function formatIsoDateString(isoDate: string): string {
    const parts = isoDate.split("T")[0].split("-");
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

type CalendarSlotDetailsProps = {
    onClose: () => void;
    event?: CalendarEntryExtDto;
    onDelete: (id: number, email: string, isSeries?: boolean) => void;
};

function CalendarSlotDetails({ onClose, event, onDelete }: CalendarSlotDetailsProps) {
    const [inputValue, setInputValue] = useState("");

    const { t } = useTranslation();

    return (
        <AnimatePresence>
            {event && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        className="relative w-96 max-w-full bg-white p-6 shadow-lg"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                    >
                        <button
                            className="absolute top-3 right-3 cursor-pointer text-lg font-bold text-gray-500 hover:text-gray-800"
                            onClick={onClose}
                        >
                            <X />
                        </button>

                        <h2 className="mb-4 text-xl font-semibold">
                            <div>
                                {t("calendar.page.from")} {formatIsoDateString(event.Start)}{" "}
                                {event.Start.slice(11, 16)}
                            </div>
                            <div>
                                {t("calendar.page.to")} {formatIsoDateString(event.End)}{" "}
                                {event.End.slice(11, 16)}
                            </div>
                        </h2>

                        {event.SeriesId && (
                            <div className="mb-2">{t("calendar.page.part-of-series")}</div>
                        )}

                        <div className="text-gray-700">
                            <div>
                                {event.FirstName} {event.LastName ?? ""}
                            </div>
                            {event.Email && <div>{event.Email}</div>}
                        </div>

                        {event.endDate.getTime() < new Date().getTime() ? null : (
                            <div className="mt-4 flex flex-col gap-2 opacity-50 focus-within:opacity-100">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="flex-1 border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder={t("calendar.page.email-placeholder")}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onDelete(event.Id, inputValue)}
                                        className="flex-1 cursor-pointer bg-red-500 px-4 py-2 text-white hover:bg-red-600 active:bg-red-700"
                                    >
                                        <Trash
                                            className="mr-1 inline align-text-bottom"
                                            height="20"
                                            width="20"
                                        />
                                        {t("calendar.page.delete")}
                                    </button>
                                    {event.SeriesId && (
                                        <button
                                            onClick={() =>
                                                onDelete(event!.SeriesId!, inputValue, true)
                                            }
                                            className="flex-1 cursor-pointer bg-red-500 px-4 py-2 text-white hover:bg-red-600 active:bg-red-700"
                                        >
                                            <Trash
                                                className="mr-1 inline align-text-bottom"
                                                height="20"
                                                width="20"
                                            />
                                            {t("calendar.page.delete-series")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default CalendarSlotDetails;
