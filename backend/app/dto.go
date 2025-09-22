package app

import "time"

type CalendarEntry struct {
	Id        int
	FirstName string
	Start     time.Time
	End       time.Time
}

type CalendarEntryFull struct {
	CalendarEntry
	LastName string
	Email    string
}

// TODO series
