export type CalendarEntryDto = {
    Id: number;
    FirstName: string;
    LastName?: string;
    Email?: string;
    Start: string;
    End: string;
};

export type CalendarEntryExtDto = CalendarEntryDto & {
    startDate: Date;
    endDate: Date;
    slots: number;
};
