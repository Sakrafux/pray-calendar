export type CalendarEntryDto = {
    Id: number;
    FirstName: string;
    LastName?: string;
    Email?: string;
    Start: string;
    End: string;
    SeriesId?: number;
    IsBlocker: boolean;
};

export type CalendarEntryExtDto = CalendarEntryDto & {
    startDate: Date;
    endDate: Date;
    slots: number;
};

export type Series = {
    Interval: string;
    Repetitions: number;
};

export type SeriesRequest = {
    Series: Series;
    Entry: CalendarEntryDto;
};
