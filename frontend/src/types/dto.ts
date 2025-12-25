/**
 * These are types corresponding to actual business objects
 */
/** */

export type CalendarEntryDto = {
    Id: number;
    FirstName: string;
    LastName?: string;
    Email?: string;
    Start: string;
    End: string;
    SeriesId?: number;
    AdminEvent?: string;
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
