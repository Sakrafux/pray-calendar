import React, { useEffect, useState } from "react";

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
};

function CalendarSlots({ startOfWeek, days }: CalendarSlotsProps) {
    const [events, setEvents] = useState<CalendarEntryExtDto[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEntryExtDto>();

    const { state, deleteCalendarEntry, deleteCalendarSeries } = useApiCalendarEntry();
    const { showLoading, hideLoading } = useLoading();

    useEffect(() => {
        const searchDate = startOfWeek.toISOString().split("T")[0];
        const data = state.data?.[searchDate];
        if (data) {
            setEvents(
                Object.values(data).flatMap((d) => {
                    if (d.startDate.getDate() != d.endDate.getDate()) {
                        const dayBreak = new Date(d.endDate.getTime());
                        dayBreak.setHours(0);
                        dayBreak.setMinutes(0);

                        return [
                            {
                                ...d,
                                endDate: dayBreak,
                                slots: Math.floor(
                                    (dayBreak.getTime() - d.startDate.getTime()) / 900000,
                                ),
                            },
                            {
                                ...d,
                                startDate: dayBreak,
                                slots: Math.floor(
                                    (d.endDate.getTime() - dayBreak.getTime()) / 900000,
                                ),
                            },
                        ];
                    }
                    return d;
                }),
            );
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
                            const color =
                                event.SeriesId != null
                                    ? "bg-orange-500 hover:bg-orange-600 active:bg-orange-700"
                                    : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700";
                            if (event.slots === 1) {
                                eventDiv = (
                                    <div
                                        className={`absolute inset-1 z-10 flex cursor-pointer items-center p-2 text-xs text-white shadow ${color}`}
                                        onClick={() => setSelectedEvent(event)}
                                    >
                                        {event.FirstName} {event.LastName ?? ""}
                                        {event.Email ? " - " : ""}
                                        {event.Email ?? ""}
                                    </div>
                                );
                            } else {
                                eventDiv = (
                                    <div
                                        className={`absolute inset-1 z-10 flex cursor-pointer flex-col p-2 text-xs text-white shadow ${color}`}
                                        style={{ height: `calc(${event.slots}00% - 0.5rem)` }}
                                        onClick={() => setSelectedEvent(event)}
                                    >
                                        <div>
                                            {event.Start.slice(11, 16)}
                                            {" - "}
                                            {event.End.slice(11, 16)}
                                        </div>
                                        <div>
                                            {event.FirstName} {event.LastName ?? ""}
                                        </div>
                                        <div>{event.Email ?? ""}</div>
                                    </div>
                                );
                            }
                        }

                        const isPast = slotDate.getTime() < new Date().getTime();
                        let color = "";
                        if (day.getDay() === 6) {
                            color = "bg-amber-100";
                        } else if (day.getDay() === 0) {
                            color = "bg-amber-200";
                        } else {
                            if (isPast) {
                                color = "bg-gray-200";
                            }
                        }

                        return (
                            <div
                                key={day.toISOString() + hour}
                                className={`relative min-h-10 border-t border-l border-gray-400 ${isPast ? "opacity-50" : "opacity-100"} ${color}`}
                            >
                                {eventDiv}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
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
