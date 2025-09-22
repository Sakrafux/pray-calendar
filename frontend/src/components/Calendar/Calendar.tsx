import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApiCalendarEntry } from "@/api/data/CalendarEntryProvider";
import CalendarSlots from "@/components/Calendar/CalendarSlots";
import { useLoading } from "@/components/LoadingProvider";

function startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust if Sunday
    d.setDate(diff);
    d.setHours(d.getTimezoneOffset() / -60, 0, 0, 0);
    return d;
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export default function WeeklyCalendar() {
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date()));

    const { state, getAllCalendarEntries } = useApiCalendarEntry();
    const { showLoading, hideLoading } = useLoading();
    const { t } = useTranslation();

    const days = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
        [currentWeekStart],
    );

    useEffect(() => {
        const searchDate = currentWeekStart.toISOString().split("T")[0];
        if (!state.data?.[searchDate] && !state.loading && !state.error) {
            showLoading(true);
            getAllCalendarEntries(searchDate).then(() => hideLoading());
        }
    }, [currentWeekStart, getAllCalendarEntries, hideLoading, showLoading, state]);

    return (
        <div className="full-wo-header-height p-4">
            {/* Header */}
            <div className="flex h-12 items-center justify-between pb-4">
                <div className="flex flex-1"></div>
                <div className="flex flex-1 justify-center gap-4">
                    <button
                        onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
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
                        {t("calendar.page.heading")} {currentWeekStart.toLocaleDateString("de-DE")}
                    </h2>
                    <button
                        onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
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
                <div className="flex flex-1 justify-end">
                    <button className="cursor-pointer bg-blue-500 px-6 py-1 font-bold text-white hover:bg-blue-600 active:bg-blue-700">
                        <Plus className="mr-1 inline align-text-bottom" height="20" width="20" />
                        {t("calendar.page.new")}
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid max-h-[calc(100%-3rem)] grid-cols-[120px_repeat(7,1fr)] overflow-y-auto border border-gray-400">
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
            </div>
        </div>
    );
}
