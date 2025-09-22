import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CalendarEntryDto } from "@/types";

type CalendarSlotNewProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (event: CalendarEntryDto) => Promise<boolean>;
};

function CalendarSlotNew({ open, onClose, onSubmit }: CalendarSlotNewProps) {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        startDate: "",
        startHour: "0",
        startMinute: "0",
        endDate: "",
        endHour: "0",
        endMinute: "0",
    });
    const [error, setError] = useState("");

    const hours = Array.from({ length: 24 }, (_, i) => i); // 0–23
    const minutes = [0, 15, 30, 45]; // quarter hours

    const { t } = useTranslation();

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const start = new Date(formData.startDate);
        start.setHours(Number(formData.startHour), Number(formData.startMinute));

        const end = new Date(formData.endDate);
        end.setHours(Number(formData.endHour), Number(formData.endMinute));

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

        const dto: CalendarEntryDto = {
            Id: -1,
            FirstName: formData.firstName,
            LastName: formData.lastName,
            Email: formData.email,
            Start: new Date(start.getTime() - start.getTimezoneOffset() * 60 * 1000).toISOString(),
            End: new Date(end.getTime() - end.getTimezoneOffset() * 60 * 1000).toISOString(),
        };
        if (await onSubmit(dto)) {
            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                startDate: "",
                startHour: "0",
                startMinute: "0",
                endDate: "",
                endHour: "0",
                endMinute: "0",
            });
            setError("");
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.aside
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 500, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
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
                                className="w-full border p-2 focus:ring-2 focus:ring-blue-500"
                                required
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
                                className="w-full border p-2 focus:ring-2 focus:ring-blue-500"
                                required
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
                                className="w-full border p-2 focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="my-1">
                            <label className="block text-sm font-medium">
                                {t("calendar.modal-new.startdate")}
                            </label>
                            <div className="mt-1 flex gap-2">
                                <input
                                    type="date"
                                    name="startDate"
                                    min={new Date().toISOString().split("T")[0]}
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="flex-1 border p-2"
                                    required
                                />
                                <select
                                    name="startHour"
                                    value={formData.startHour}
                                    onChange={handleChange}
                                    className="border p-2"
                                >
                                    {hours.map((h) => (
                                        <option key={h} value={h}>
                                            {h.toString().padStart(2, "0")}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    name="startMinute"
                                    value={formData.startMinute}
                                    onChange={handleChange}
                                    className="border p-2"
                                >
                                    {minutes.map((m) => (
                                        <option key={m} value={m}>
                                            {m.toString().padStart(2, "0")}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="my-1">
                            <label className="block text-sm font-medium">
                                {t("calendar.modal-new.enddate")}
                            </label>
                            <div className="mt-1 flex gap-2">
                                <input
                                    type="date"
                                    name="endDate"
                                    min={new Date().toISOString().split("T")[0]}
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    className="flex-1 border p-2"
                                    required
                                />
                                <select
                                    name="endHour"
                                    value={formData.endHour}
                                    onChange={handleChange}
                                    className="border p-2"
                                >
                                    {hours.map((h) => (
                                        <option key={h} value={h}>
                                            {h.toString().padStart(2, "0")}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    name="endMinute"
                                    value={formData.endMinute}
                                    onChange={handleChange}
                                    className="border p-2"
                                >
                                    {minutes.map((m) => (
                                        <option key={m} value={m}>
                                            {m.toString().padStart(2, "0")}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="mt-2 w-full cursor-pointer bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 active:bg-blue-700"
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
