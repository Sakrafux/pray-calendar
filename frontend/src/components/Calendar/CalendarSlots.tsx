import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApiCalendarEntry } from "@/api/data/CalendarEntryProvider";
import CalendarSlotDetails from "@/components/Calendar/CalendarSlotDetails";
import { useLoading } from "@/components/LoadingProvider";
import type { CalendarEntryExtDto } from "@/types";

const slots: { hour: number }[] = [];
for (let h = 0; h < 24; h++) {
    slots.push({ hour: h });
}

type CalendarSlotsProps = {
    startOfWeek: Date;
    days: Date[];
    onSlotClick: (date: string, time: number) => void;
};

/**
 * This component represents the actual table or calendar.
 *
 * For greater layout flexibility, we use &lt;div&gt; instead of table.
 */
function CalendarSlots({ startOfWeek, days, onSlotClick }: CalendarSlotsProps) {
    const [events, setEvents] = useState<CalendarEntryExtDto[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEntryExtDto>();

    const { state, deleteCalendarEntry, deleteCalendarSeries } = useApiCalendarEntry();
    const { showLoading, hideLoading } = useLoading();
    const { t } = useTranslation();

    useEffect(() => {
        const searchDate = startOfWeek.toISOString().split("T")[0];
        const data = state.data?.[searchDate];
        if (data) {
            setEvents(Object.values(data));
        }
    }, [startOfWeek, state]);

    return (
        <>
            {slots.map(({ hour }) => (
                <React.Fragment key={`${hour}`}>
                    <div className="sticky left-0 z-20 min-h-10 content-center border-t border-r border-gray-400 bg-gray-100 p-2 text-center text-sm">
                        {`${hour.toString().padStart(2, "0")}:00`} -{" "}
                        {`${(hour + 1).toString().padStart(2, "0")}:00`}
                    </div>

                    {days.map((day) => {
                        const slotDate = new Date(day);
                        slotDate.setHours(hour, 0, 0, 0);

                        const event = events.find((e) => {
                            const st = e.startDate.getTime();
                            return st >= slotDate.getTime() && st < slotDate.getTime() + 900000;
                        });

                        let eventDiv = null;
                        if (event) {
                            const color = event.AdminEvent
                                ? "bg-black"
                                : event.SeriesId != null
                                  ? "bg-orange-500 hover:bg-orange-600 active:bg-orange-700"
                                  : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700";

                            // We presuppose that only our approved events can and will be entered, as they have corresponding strings
                            const eventName = event.AdminEvent
                                ? t(`calendar.modal-new.admin-event-${event.AdminEvent}`)
                                : `${event.FirstName} ${event.LastName ?? ""}`;

                            if (event.slots === 1) {
                                // If we only cover a single slot, we need a compact design
                                eventDiv = (
                                    <div
                                        className={`absolute inset-1 z-10 flex cursor-pointer items-center p-2 text-left text-xs text-white shadow ${color}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEvent(event);
                                        }}
                                    >
                                        {eventName}
                                        {event.Email ? " - " : ""}
                                        {event.Email ?? ""}
                                    </div>
                                );
                            } else {
                                // Otherwise, we have plenty of space, but need to cover all the slots visually
                                eventDiv = (
                                    <div
                                        className={`absolute inset-1 z-10 flex cursor-pointer flex-col p-2 text-left text-xs text-white shadow ${color}`}
                                        style={{ height: `calc(${event.slots}00% - 0.5rem)` }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEvent(event);
                                        }}
                                    >
                                        <div>
                                            {event.Start.slice(11, 16)}
                                            {" - "}
                                            {event.End.slice(11, 16)}
                                        </div>
                                        <div>{eventName}</div>
                                        <div>{event.Email ?? ""}</div>
                                    </div>
                                );
                            }
                        }

                        const isPast = slotDate.getTime() < new Date().getTime();
                        let dynamicStyling: string;
                        if (day.getDay() === 6) {
                            dynamicStyling = "bg-amber-100";
                            if (!isPast) {
                                dynamicStyling = `${dynamicStyling} hover:bg-amber-200 active:bg-amber-300 cursor-pointer`;
                            }
                        } else if (day.getDay() === 0) {
                            dynamicStyling = "bg-amber-200";
                            if (!isPast) {
                                dynamicStyling = `${dynamicStyling} hover:bg-amber-300 active:bg-amber-400 cursor-pointer`;
                            }
                        } else {
                            if (isPast) {
                                dynamicStyling = "bg-gray-200";
                            } else {
                                dynamicStyling =
                                    "hover:bg-gray-100 active:bg-gray-200 cursor-pointer";
                            }
                        }

                        return (
                            <div
                                key={day.toISOString() + hour}
                                className={`relative min-h-10 border-t border-l border-gray-400 ${isPast ? "opacity-50" : "opacity-100"} ${dynamicStyling}`}
                                onClick={() =>
                                    isPast
                                        ? null
                                        : onSlotClick(day.toISOString().split("T")[0], hour)
                                }
                            >
                                {eventDiv}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
            {/* Show a modal with information when clicking on an entry element and provide a delete option */}
            <CalendarSlotDetails
                event={selectedEvent}
                onClose={() => setSelectedEvent(undefined)}
                onDelete={async (id, email, isSeries) => {
                    showLoading(true);
                    if (isSeries) {
                        await deleteCalendarSeries(id, email);
                    } else {
                        await deleteCalendarEntry(
                            id,
                            email,
                            startOfWeek.toISOString().split("T")[0],
                        );
                    }
                    hideLoading();
                    setSelectedEvent(undefined);
                }}
            />
        </>
    );
}

export default CalendarSlots;
