package app

import "time"

type CalendarEntry struct {
	Id         int
	FirstName  string
	Start      time.Time
	End        time.Time
	AdminEvent *string
	SeriesId   *int
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

type Volunteer struct {
	Id                int
	Email             string
	Confirmed         bool
	ConfirmationToken string
}
