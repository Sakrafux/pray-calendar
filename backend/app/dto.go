package app

import "time"

type CalendarEntry struct {
	Id        int
	FirstName string
	Start     time.Time
	End       time.Time
	SeriesId  *int
	IsBlocker bool
}

type CalendarEntryFull struct {
	CalendarEntry
	LastName string
	Email    string
}

type Series struct {
	Id          int
	Interval    string
	Repetitions int
}

type SeriesRequest struct {
	Series Series
	Entry  CalendarEntryFull
}
