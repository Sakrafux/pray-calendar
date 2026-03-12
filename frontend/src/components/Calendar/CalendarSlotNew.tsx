import dayjs from "dayjs";
import { AnimatePresence, motion, type Variant } from "framer-motion";
import { Minus, X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/api/AuthProvider";
import type { CalendarEntryDto, Series } from "@/types";

const recurrenceToDayjs: Record<string, dayjs.ManipulateType> = {
    daily: "day",
    weekly: "week",
    monthly: "month",
};

/**
 * Since start and end position are the same, we define them once.
 */
const transitionEdge = (mobile?: boolean) => {
    const res: Variant = {};

    if (mobile) {
        res.bottom = 0;
        res.left = 0;
        res.right = 0;
        res.top = "100%";
        res.position = "absolute";
    } else {
        res.height = "100%";
        res.width = 0;
        res.position = "relative";
    }

    return res;
};

/**
 * Variants for the `motion.div`.
 *
 * For a more in-depth documentation, see `Calendar.tsx`.
 */
const variants = {
    enter: transitionEdge,
    center: (mobile?: boolean) => {
        const res: Variant = {};

        if (mobile) {
            res.bottom = 0;
            res.left = 0;
            res.right = 0;
            res.top = "var(--header-height)";
            res.position = "absolute";
        } else {
            res.height = "100%";
            res.width = 500;
            res.position = "relative";
        }

        return res;
    },
    exit: transitionEdge,
};

type CalendarSlotNewProps = {
    /** Decides whether to open from the side or the bottom */
    mobile?: boolean;
    open: boolean;
    /** Selected date and time when directly clicking on an open time slot */
    initDatetime?: { date: string; time: number };
    onClose: () => void;
    onSubmit: (entry: CalendarEntryDto, series?: Series) => Promise<boolean>;
};

/**
 * This component provides the modal, or modal-like, form for defining and creating a new calendar
 * entry. It has additional elements for the admin.
 */
function CalendarSlotNew({ mobile, open, initDatetime, onClose, onSubmit }: CalendarSlotNewProps) {
    const [formData, setFormData] = useState({
        firstName: localStorage.getItem("pray_calendar-new-firstname") ?? "",
        lastName: localStorage.getItem("pray_calendar-new-lastname") ?? "",
        email: localStorage.getItem("pray_calendar-new-email") ?? "",
        date: "",
        startHour: "0",
        endHour: "0",
        series: false,
        adminEvent: "",
        // "daily" | "weekly" | "monthly"
        recurrence: "weekly",
        repetitions: 1,
        seriesEndDate: "",
    });
    const [error, setError] = useState("");

    const hours = Array.from({ length: 25 }, (_, i) => i); // 0–24
    const isAdminEvent = formData.adminEvent !== "";

    const {
        state: { data: isAdmin },
    } = useAuth();
    const { t } = useTranslation();

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, type, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? e.target.checked : value,
        }));
    };

    const handleRepetitionsChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const repetitions = Number(value);

        let seriesEndDate = "";
        if (formData.date) {
            seriesEndDate = dayjs(formData.date)
                .add(repetitions, recurrenceToDayjs[formData.recurrence])
                .add(12, "hours")
                .toISOString()
                .split("T")[0];
        }

        setFormData((prev) => ({
            ...prev,
            repetitions,
            seriesEndDate,
        }));
    };

    const handleRecurrenceChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;

        let seriesEndDate = "";
        if (formData.date) {
            seriesEndDate = dayjs(formData.date)
                .add(formData.repetitions, recurrenceToDayjs[value])
                .add(12, "hours")
                .toISOString()
                .split("T")[0];
        }

        setFormData((prev) => ({
            ...prev,
            recurrence: value,
            seriesEndDate,
        }));
    };

    const handleSeriesEndDateChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;

        const startDate = dayjs(formData.date);
        const endDate = dayjs(value);

        const diffRepetitions = Math.min(
            10,
            Math.max(1, endDate.diff(startDate, recurrenceToDayjs[formData.recurrence])),
        );
        const expectedEndDate = dayjs(formData.date)
            .add(diffRepetitions, recurrenceToDayjs[formData.recurrence])
            .add(12, "hours")
            .toISOString()
            .split("T")[0];

        setFormData((prev) => ({
            ...prev,
            repetitions: diffRepetitions,
            seriesEndDate: expectedEndDate,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const start = new Date(formData.date);
        start.setHours(Number(formData.startHour));

        const timeDiff = (Number(formData.endHour) - Number(formData.startHour)) * 3600000;

        const end = new Date(start);
        end.setTime(end.getTime() + timeDiff);

        // Preemptively validate the input independent of the backend
        if (start.getTime() < new Date().getTime()) {
            setError(t("calendar.modal-new.error-past"));
            return;
        }

        if (start.getTime() >= end.getTime()) {
            setError(t("calendar.modal-new.error-order"));
            return;
        }

        if (end.getTime() - start.getTime() > 8.64e7) {
            setError(t("calendar.modal-new.error-duration"));
            return;
        }

        // Store the user's personal data in local storage, because it is unlikely that he wants to
        // register someone else, and this improves UX by a lot
        localStorage.setItem("pray_calendar-new-firstname", formData.firstName);
        localStorage.setItem("pray_calendar-new-lastname", formData.lastName);
        localStorage.setItem("pray_calendar-new-email", formData.email!);

        const dto: CalendarEntryDto = {
            Id: -1,
            FirstName: formData.firstName,
            LastName: formData.lastName,
            Email: formData.email,
            Start: new Date(start.getTime() - start.getTimezoneOffset() * 60 * 1000).toISOString(),
            End: new Date(end.getTime() - end.getTimezoneOffset() * 60 * 1000).toISOString(),
            SeriesId: -1,
            AdminEvent: formData.adminEvent || undefined,
        };
        const series: Series | undefined = formData.series
            ? {
                  Interval: formData.recurrence,
                  Repetitions: formData.repetitions,
              }
            : undefined;
        if (await onSubmit(dto, series)) {
            setFormData({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                date: "",
                startHour: "0",
                endHour: "0",
                series: false,
                adminEvent: "",
                recurrence: "weekly",
                repetitions: 1,
                seriesEndDate: "",
            });
            setError("");
        }
    };

    // Reset the data if another timeslot was clicked
    useEffect(() => {
        let seriesEndDate = "";
        if (initDatetime?.date) {
            seriesEndDate = dayjs(initDatetime.date)
                .add(1, "week")
                .add(12, "hours")
                .toISOString()
                .split("T")[0];
        }

        setFormData({
            firstName: localStorage.getItem("pray_calendar-new-firstname") ?? "",
            lastName: localStorage.getItem("pray_calendar-new-lastname") ?? "",
            email: localStorage.getItem("pray_calendar-new-email") ?? "",
            date: initDatetime?.date ?? "",
            startHour: initDatetime?.time.toString() ?? "0",
            endHour:
                (initDatetime?.time != null ? (initDatetime.time + 1).toString() : undefined) ??
                "0",
            series: false,
            adminEvent: "",
            recurrence: "weekly",
            repetitions: 1,
            seriesEndDate: seriesEndDate ?? "",
        });
    }, [initDatetime]);

    return (
        <AnimatePresence>
            {open && (
                <motion.aside
                    custom={mobile}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="relative overflow-hidden bg-white p-6 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
                >
                    <button
                        className="absolute top-6 right-6 cursor-pointer text-lg font-bold text-gray-500 hover:text-gray-800"
                        onClick={onClose}
                    >
                        <X />
                    </button>

                    <h2 className="mb-4 text-xl font-semibold">
                        {t("calendar.modal-new.heading")}
                    </h2>

                    {error && (
                        <div className="mb-4 bg-red-100 p-2 text-sm text-red-600">{error}</div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="my-1">
                            <label className="block text-sm font-medium">
                                {t("calendar.modal-new.firstname")}
                            </label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="read-only-input mt-1 w-full border p-2 focus:ring-2 focus:ring-blue-500"
                                required={!isAdminEvent}
                                readOnly={isAdminEvent}
                            />
                        </div>

                        <div className="my-1">
                            <label className="block text-sm font-medium">
                                {t("calendar.modal-new.lastname")}
                            </label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="read-only-input mt-1 w-full border p-2 focus:ring-2 focus:ring-blue-500"
                                required={!isAdminEvent}
                                readOnly={isAdminEvent}
                            />
                        </div>

                        <div className="my-1">
                            <label className="block text-sm font-medium">
                                {t("calendar.modal-new.email")}
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="read-only-input mt-1 w-full border p-2 focus:ring-2 focus:ring-blue-500"
                                required={!isAdminEvent}
                                readOnly={isAdminEvent}
                            />
                        </div>

                        <div className="my-1">
                            <label className="block text-sm font-medium">
                                {t("calendar.modal-new.startdate")}
                            </label>
                            <div className="mt-1 flex gap-2">
                                <input
                                    type="date"
                                    name="date"
                                    min={new Date().toISOString().split("T")[0]}
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="flex-1 border p-2"
                                    required
                                />
                            </div>
                        </div>

                        <div className="my-1">
                            <label className="block text-sm font-medium">
                                {t("calendar.modal-new.hours")}
                            </label>
                            <div className="mt-1 flex gap-2">
                                <select
                                    name="startHour"
                                    value={formData.startHour}
                                    onChange={handleChange}
                                    className="border p-2"
                                >
                                    {hours.slice(0, 24).map((h) => (
                                        <option key={h} value={h}>
                                            {h.toString().padStart(2, "0")}
                                        </option>
                                    ))}
                                </select>
                                <div className="content-center">
                                    <Minus />
                                </div>
                                <select
                                    name="endHour"
                                    value={formData.endHour}
                                    onChange={handleChange}
                                    className="border p-2"
                                >
                                    {hours.slice(1, 25).map((h) => (
                                        <option key={h} value={h}>
                                            {h.toString().padStart(2, "0")}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-3">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="series"
                                    checked={formData.series}
                                    onChange={handleChange}
                                />
                                <span className="font-medium">
                                    {t("calendar.modal-new.series")}
                                </span>
                            </label>

                            {formData.series && (
                                <div className="my-1 space-y-1">
                                    <div>
                                        <label className="block text-sm font-medium">
                                            {t("calendar.modal-new.recurrence")}
                                        </label>
                                        <div className="mt-1 flex gap-4">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="recurrence"
                                                    value="daily"
                                                    checked={formData.recurrence === "daily"}
                                                    onChange={handleRecurrenceChange}
                                                />
                                                {t("calendar.modal-new.recurrence-daily")}
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="recurrence"
                                                    value="weekly"
                                                    checked={formData.recurrence === "weekly"}
                                                    onChange={handleRecurrenceChange}
                                                />
                                                {t("calendar.modal-new.recurrence-weekly")}
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="recurrence"
                                                    value="monthly"
                                                    checked={formData.recurrence === "monthly"}
                                                    onChange={handleRecurrenceChange}
                                                />
                                                {t("calendar.modal-new.recurrence-monthly")}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="flex-1/3">
                                            <label className="block text-sm font-medium">
                                                {t("calendar.modal-new.repetitions")}
                                            </label>
                                            <div className="mt-1 flex gap-2">
                                                <input
                                                    type="number"
                                                    name="repetitions"
                                                    value={formData.repetitions}
                                                    onChange={handleRepetitionsChange}
                                                    min={1}
                                                    max={10}
                                                    className="flex-1 border p-2"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-2/3">
                                            <label className="block text-sm font-medium">
                                                {t("calendar.modal-new.startdate")}
                                            </label>
                                            <div className="mt-1 flex gap-2">
                                                <input
                                                    type="date"
                                                    name="date"
                                                    min={new Date().toISOString().split("T")[0]}
                                                    value={formData.seriesEndDate}
                                                    onChange={handleSeriesEndDateChange}
                                                    className="flex-1 border p-2"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="mt-3 space-y-1">
                                <label className="block text-sm font-medium">
                                    {t("calendar.modal-new.admin-event")}
                                </label>
                                <div className="mt-1 flex gap-2">
                                    <select
                                        name="adminEvent"
                                        value={formData.adminEvent}
                                        onChange={handleChange}
                                        className="border p-2"
                                    >
                                        <option value=""></option>
                                        {/* It is currently sufficient to hard code the options */}
                                        <option value="mass">
                                            {t("calendar.modal-new.admin-event-mass")}
                                        </option>
                                        <option value="praise">
                                            {t("calendar.modal-new.admin-event-praise")}
                                        </option>
                                        <option value="event">
                                            {t("calendar.modal-new.admin-event-event")}
                                        </option>
                                        <option value="blocker">
                                            {t("calendar.modal-new.admin-event-blocker")}
                                        </option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="mt-4 w-full cursor-pointer bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 active:bg-blue-700"
                        >
                            {t("calendar.modal-new.submit")}
                        </button>
                    </form>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}

export default CalendarSlotNew;
