import React, { useEffect, useState } from "react";

import { useApiCalendarEntry } from "@/api/data/CalendarEntryProvider";
import CalendarSlotDetails from "@/components/Calendar/CalendarSlotDetails";
import { useLoading } from "@/components/LoadingProvider";
import type { CalendarEntryExtDto } from "@/types";

// quarter-hour slots
const slots: { hour: number; minute: number }[] = [];
for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
        slots.push({ hour: h, minute: m });
    }
}

type CalendarSlotsProps = {
    startOfWeek: Date;
    days: Date[];
};

function CalendarSlots({ startOfWeek, days }: CalendarSlotsProps) {
    const [events, setEvents] = useState<CalendarEntryExtDto[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEntryExtDto>();

    const { state, deleteCalendarEntry } = useApiCalendarEntry();
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
            {slots.map(({ hour, minute }) => (
                <React.Fragment key={`${hour}-${minute}`}>
                    {/* Only show hour label at :00 rows */}
                    <div
                        className={`h-10 border-gray-400 bg-gray-100 p-2 text-right text-sm ${minute === 0 ? "border-t" : ""}`}
                    >
                        {minute === 0 ? `${hour}:00` : ""}
                    </div>

                    {days.map((day) => {
                        const slotDate = new Date(day);
                        slotDate.setHours(hour, minute, 0, 0);

                        const event = events.find((e) => {
                            const st = e.startDate.getTime();
                            return st >= slotDate.getTime() && st < slotDate.getTime() + 900000;
                        });

                        let eventDiv = null;
                        if (event) {
                            if (event.slots === 1) {
                                eventDiv = (
                                    <div
                                        className="absolute inset-1 z-10 flex cursor-pointer items-center bg-blue-500 p-2 text-xs text-white shadow hover:bg-blue-600 active:bg-blue-700"
                                        style={{ height: `${event.slots * 2.5 - 0.5}rem` }}
                                        onClick={() => setSelectedEvent(event)}
                                    >
                                        {event.Start.slice(11, 16)}
                                        {" - "}
                                        {event.End.slice(11, 16)}
                                        {" : "}
                                        {event.FirstName} {event.LastName ?? ""}
                                        {" - "}
                                        {event.Email ?? ""}
                                    </div>
                                );
                            } else {
                                eventDiv = (
                                    <div
                                        className="absolute inset-1 z-10 flex cursor-pointer flex-col bg-blue-500 p-2 text-xs text-white shadow hover:bg-blue-600 active:bg-blue-700"
                                        style={{ height: `${event.slots * 2.5 - 0.5}rem` }}
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

                        return (
                            <div
                                key={day.toISOString() + hour + minute}
                                className={`relative h-10 border-t border-l border-gray-400 ${slotDate.getTime() < new Date().getTime() ? "bg-gray-100" : ""}`}
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
                onDelete={async (id, email) => {
                    showLoading(true);
                    await deleteCalendarEntry(id, email, startOfWeek.toISOString().split("T")[0]);
                    hideLoading();
                    setSelectedEvent(undefined);
                }}
            />
        </>
    );
}

export default CalendarSlots;
