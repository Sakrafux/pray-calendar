import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApiCalendarEntry } from "@/api/data/CalendarEntryProvider";
import CalendarSlotNew from "@/components/Calendar/CalendarSlotNew";
import CalendarSlots from "@/components/Calendar/CalendarSlots";
import { useLoading } from "@/components/LoadingProvider";
import { addDays, startOfWeek } from "@/util/date";

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 300 : -300, // enter from right or left
        opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
        x: direction > 0 ? -300 : 300, // exit opposite
        opacity: 0,
    }),
};

export default function WeeklyCalendar() {
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date()));
    const [direction, setDirection] = useState(0); // 1 = next, -1 = prev
    const [newEntryModal, setNewEntryModal] = useState(false);

    const { state, getAllCalendarEntries, postCalendarEntry, postCalendarSeries } =
        useApiCalendarEntry();
    const { showLoading, hideLoading } = useLoading();
    const { t } = useTranslation();

    const days = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
        [currentWeekStart],
    );

    const nextWeek = () => {
        setDirection(1);
        setCurrentWeekStart(addDays(currentWeekStart, 7));
    };

    const prevWeek = () => {
        setDirection(-1);
        setCurrentWeekStart(addDays(currentWeekStart, -7));
    };

    useEffect(() => {
        const searchDate = currentWeekStart.toISOString().split("T")[0];
        if (!state.data?.[searchDate] && !state.loading && !state.error) {
            showLoading(true);
            getAllCalendarEntries(searchDate).then(() => hideLoading());
        }
    }, [currentWeekStart, getAllCalendarEntries, hideLoading, showLoading, state]);

    return (
        <div className="flex w-full flex-row">
            <div className="full-wo-header-height flex flex-1 flex-col p-4">
                {/* Header */}
                <div className="flex h-12 flex-shrink-0 items-center justify-between pb-4">
                    <div className="flex w-[200px] flex-shrink-0"></div>
                    <div className="flex flex-1 justify-center gap-4">
                        <button
                            onClick={prevWeek}
                            className="cursor-pointer bg-gray-200 px-3 py-1 hover:bg-gray-300 active:bg-gray-400"
                        >
                            <ArrowLeft
                                className="mr-1 inline align-text-bottom"
                                height="20"
                                width="20"
                            />
                            {t("calendar.page.prev")}
                        </button>
                        <h2 className="cursor-default text-xl font-semibold">
                            {t("calendar.page.heading")}{" "}
                            {currentWeekStart.toLocaleDateString("de-DE")}
                        </h2>
                        <button
                            onClick={nextWeek}
                            className="cursor-pointer bg-gray-200 px-3 py-1 hover:bg-gray-300 active:bg-gray-400"
                        >
                            {t("calendar.page.next")}
                            <ArrowRight
                                className="ml-1 inline align-text-bottom"
                                height="20"
                                width="20"
                            />
                        </button>
                    </div>
                    <div className="flex w-[200px] flex-shrink-0 justify-end">
                        <button
                            className="cursor-pointer bg-blue-500 px-6 py-1 font-bold text-white hover:bg-blue-600 active:bg-blue-700"
                            onClick={() => setNewEntryModal((cur) => !cur)}
                        >
                            <Plus
                                className="mr-1 inline align-text-bottom"
                                height="20"
                                width="20"
                            />
                            {t("calendar.page.new")}
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="relative flex-1 overflow-hidden">
                    <AnimatePresence custom={direction}>
                        <motion.div
                            key={currentWeekStart.toISOString()} // important: triggers AnimatePresence
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="absolute grid h-full w-full grid-cols-[120px_repeat(7,1fr)] overflow-y-auto border border-gray-400"
                        >
                            {/* Day headers */}
                            <div className="sticky top-0 z-20 border-b border-gray-400 bg-gray-200 p-2 text-center font-semibold">
                                {t("calendar.page.time")}
                            </div>
                            {days.map((day) => (
                                <div
                                    key={day.toISOString()}
                                    className="sticky top-0 z-20 border-b border-gray-400 bg-gray-200 p-2 text-center font-semibold"
                                >
                                    {day.toLocaleDateString("de-DE", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "numeric",
                                    })}
                                </div>
                            ))}

                            <CalendarSlots startOfWeek={currentWeekStart} days={days} />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
            <CalendarSlotNew
                open={newEntryModal}
                onClose={() => setNewEntryModal(false)}
                onSubmit={async (entry, series) => {
                    if (series != null) {
                        if (await postCalendarSeries(entry, series)) {
                            setNewEntryModal(false);
                            return true;
                        }
                        return false;
                    }

                    if (
                        await postCalendarEntry(entry, currentWeekStart.toISOString().split("T")[0])
                    ) {
                        setNewEntryModal(false);
                        return true;
                    }
                    return false;
                }}
            />
        </div>
    );
}
