// Provides structs that conform to the database schema or are necessary for the REST-APIs

package app

import "time"

// CalendarEntry corresponds to the table "calendar_entries". Though it contains only the publicly visible fields,
// as it simultaneously servers as the REST-DTO if no admin permissions are available.
type CalendarEntry struct {
	Id        int
	FirstName string
	Start     time.Time
	End       time.Time
	// AdminEvent is an optional string signifying some extraordinary circumstances.
	// It implies that the personal information is empty.
	AdminEvent *string
	SeriesId   *int
}

// CalendarEntryFull is an extension of CalendarEntry, thus also corresponding to the table "calendar_entries", with
// more personal information, which is only relevant and prudent for the admin to access.
type CalendarEntryFull struct {
	CalendarEntry
	LastName string
	Email    string
}

// Series corresponds to the table "calendar_series" and mainly serves to capture the meta information of a series for traceability.
type Series struct {
	Id int
	// Interval is either "daily", "weekly", or "monthly"
	Interval    string
	Repetitions int
}

// SeriesRequest is purely a request REST-DTO, since a Series necessarily needs a CalendarEntryFull to repeat and start from.
type SeriesRequest struct {
	Series Series
	Entry  CalendarEntryFull
}

// Volunteer corresponds to the table "volunteers" and captures the email addresses of volunteers for automated emails,
// and confirmation information to facilitate the consent for those automated emails.
type Volunteer struct {
	Id                int
	Email             string
	Confirmed         bool
	ConfirmationToken string
}
