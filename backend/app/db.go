// Provides all DB layer operations, which are consumed by the API layer

package app

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

// DBHandler serves as a service class handling the database connection and providing all the methods requiring that connection.
type DBHandler struct {
	db *sql.DB
}

// NewDBHandler is the constructor for DBHandler, connecting the database for the given path.
func NewDBHandler(path string) *DBHandler {
	db := connect(path)
	return &DBHandler{db: db}
}

// connect opens a sqlite database, creating it if it does not exist.
func connect(path string) *sql.DB {
	log.Println("[sqlite] Connecting to database...")
	db, err := sql.Open("sqlite", path)
	// an error during database connection is not recoverable
	if err != nil {
		log.Fatal(err)
	}
	log.Println("[sqlite] Successfully connected to database")

	return db
}

// Close closes the database connection.
func (h *DBHandler) Close() {
	err := h.db.Close()
	// an error during closing of the database connection doesn't matter
	if err != nil {
		return
	}
}

// Setup creates all the tables for the sqlite database. However, since this application has no versioning, adjusting
// the database definition most likely requires a deletion of the existing database.
func (h *DBHandler) Setup() {
	_, err := h.db.Exec(`
		PRAGMA foreign_keys = ON;
       
		CREATE TABLE IF NOT EXISTS calendar_series (
		  	id INTEGER PRIMARY KEY AUTOINCREMENT,
			interval TEXT NOT NULL,
			repetitions INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS calendar_entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			firstname TEXT NOT NULL,
			lastname TEXT NOT NULL,
			email TEXT NOT NULL,
			starttime DATETIME NOT NULL,
			endtime DATETIME NOT NULL,
			admin_event TEXT,
			series_id INTEGER,
			FOREIGN KEY (series_id) REFERENCES calendar_series(id)
		);

		CREATE TABLE IF NOT EXISTS volunteers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			confirmed BOOLEAN NOT NULL,
			confirmation_token TEXT NOT NULL
		);
	`)
	// an error during table creation is not recoverable
	if err != nil {
		log.Fatal(err)
	}
}

// GetAllEntriesForWeek queries all CalendarEntry for a week starting at a give date(time).
func (h *DBHandler) GetAllEntriesForWeek(start time.Time) ([]CalendarEntry, error) {
	end := start.AddDate(0, 0, 7)
	rows, err := h.db.Query(`
		SELECT id, firstname, starttime, endtime, admin_event, series_id FROM calendar_entries
		WHERE starttime <= $1 AND endtime >= $2
		ORDER BY starttime ASC
	`, end, start)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]CalendarEntry, 0)
	for rows.Next() {
		var entry CalendarEntry
		if err := rows.Scan(&entry.Id, &entry.FirstName, &entry.Start, &entry.End, &entry.AdminEvent, &entry.SeriesId); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// GetAllFullEntriesForWeek queries all CalendarEntryFull for a week starting at a give date(time).
// As this concerns private user information, this should only be privy to the admin.
func (h *DBHandler) GetAllFullEntriesForWeek(start time.Time) ([]CalendarEntryFull, error) {
	end := start.AddDate(0, 0, 7)
	rows, err := h.db.Query(`
		SELECT id, firstname, lastname, email, starttime, endtime, admin_event, series_id FROM calendar_entries
		WHERE starttime <= $1 AND endtime >= $2
		ORDER BY starttime ASC
	`, end, start)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]CalendarEntryFull, 0)
	for rows.Next() {
		var entry CalendarEntryFull
		if err := rows.Scan(&entry.Id, &entry.FirstName, &entry.LastName, &entry.Email, &entry.Start, &entry.End, &entry.AdminEvent, &entry.SeriesId); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// InsertEntry inserts a new CalendarEntryFull, i.e., information entered by a user, into the database, given that it
// does not conflict with the existing data.
func (h *DBHandler) InsertEntry(entry CalendarEntryFull) (*CalendarEntryFull, error) {
	res, err := h.db.Exec(`
		INSERT INTO calendar_entries (firstname, lastname, email, starttime, endtime, admin_event, series_id) 
		SELECT $1, $2, $3, $4, $5, $6, $7
		WHERE NOT EXISTS (
			SELECT 1 FROM calendar_entries
			WHERE starttime < $5 AND endtime > $4
		)
	`, entry.FirstName, entry.LastName, entry.Email, entry.Start, entry.End, entry.AdminEvent, entry.SeriesId)
	if err != nil {
		return nil, err
	}
	// as it concerns an insert operation, we would expect a single row to be created
	if nrOfRows, err := res.RowsAffected(); nrOfRows != 1 || err != nil {
		return nil, fmt.Errorf("no entry inserted")
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	// If the insert succeeded, we know that the only new relevant fact consists of the created ID
	entry.Id = int(id)

	return &entry, nil
}

// CheckMultipleTimeslots checks whether any of the provided CalendarEntryFull conflicts with existing data.
// This is necessary to check, since a Series can only be entered as a whole or not at all.
func (h *DBHandler) CheckMultipleTimeslots(entries []CalendarEntryFull) error {
	// Potentially, it would be more efficient to craft a long query with all the affected start- and endtimes, but
	// in our case, iterative checking is fine as it is
	checkTimeslot, err := h.db.Prepare("SELECT 1 FROM calendar_entries WHERE starttime < $2 AND endtime > $1")
	if err != nil {
		return err
	}

	for _, entry := range entries {
		exec, err := checkTimeslot.Query(entry.Start, entry.End)
		if err != nil {
			return err
		}
		if exec.Next() {
			return fmt.Errorf("timeslot overlap")
		}
	}

	return nil
}

// InsertSeries inserts a new Series, i.e., meta information for a number of entries belonging together.
func (h *DBHandler) InsertSeries(series Series) (*Series, error) {
	res, err := h.db.Exec(`
		INSERT INTO calendar_series (interval, repetitions) 
		SELECT $1, $2
	`, series.Interval, series.Repetitions)
	if err != nil {
		return nil, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	// Immediately query the newly added data, now complete with id
	var newSeries Series
	err = h.db.QueryRow("SELECT id, interval, repetitions FROM calendar_series WHERE id = $1", id).Scan(
		&newSeries.Id, &newSeries.Interval, &newSeries.Repetitions)
	if err != nil {
		return nil, err
	}

	return &newSeries, nil
}

// GetEntry returns a single CalendarEntry. As entries are usually required in bulk, this method is likely used in the
// context of other operations.
func (h *DBHandler) GetEntry(id int) (*CalendarEntry, error) {
	rows, err := h.db.Query(`
		SELECT id, firstname, starttime, endtime, admin_event, series_id FROM calendar_entries
		WHERE id = $1
		ORDER BY starttime ASC
	`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// We would expect a select with a given id to yield a result
	if !rows.Next() {
		return nil, fmt.Errorf("no entry found")
	}

	var entry CalendarEntry
	if err := rows.Scan(&entry.Id, &entry.FirstName, &entry.Start, &entry.End, &entry.AdminEvent, &entry.SeriesId); err != nil {
		return nil, err
	}

	return &entry, nil
}

// GetSeriesEntries returns all the CalendarEntry associated with a Series, or rather its id.
func (h *DBHandler) GetSeriesEntries(seriesId int) ([]CalendarEntry, error) {
	rows, err := h.db.Query(`
		SELECT id, firstname, starttime, endtime, admin_event, series_id FROM calendar_entries
		WHERE series_id = $1
		ORDER BY starttime ASC
	`, seriesId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]CalendarEntry, 0)
	for rows.Next() {
		var entry CalendarEntry
		if err := rows.Scan(&entry.Id, &entry.FirstName, &entry.Start, &entry.End, &entry.AdminEvent, &entry.SeriesId); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

// DeleteEntry simply deletes a CalendarEntry. Due to the anonymous design of the application, the user needs to
// provide the same email he used for creating the CalendarEntry to ensure no foul play.
func (h *DBHandler) DeleteEntry(id int, email string) error {
	res, err := h.db.Exec("DELETE FROM calendar_entries WHERE id = $1 AND email = $2", id, email)
	if err != nil {
		return err
	}
	// If we couldn't delete exactly one entry, then an issue occurred (though we do not particularly bother to explore which)
	if nrOfRows, err := res.RowsAffected(); nrOfRows != 1 || err != nil {
		return fmt.Errorf("no entry deleted")
	}
	return nil
}

// DeleteSeries deletes all CalendarEntry associated with a Series and then the meta Series database entry. Due to the
// anonymous design of the application, the user needs to provide the same email he used for creating the CalendarEntry
// to ensure no foul play.
func (h *DBHandler) DeleteSeries(id int, email string) error {
	res, err := h.db.Exec("DELETE FROM calendar_entries WHERE series_id = $1 AND email = $2", id, email)
	if err != nil {
		return err
	}
	// Deleting a Series without (active) entries indicates some kind of caller issue
	if nrOfRows, err := res.RowsAffected(); nrOfRows == 0 || err != nil {
		return fmt.Errorf("no entry deleted")
	}
	// We don't need to check for success, since orphaned Series are not actually an issue
	h.db.Exec("DELETE FROM calendar_series WHERE id = $1", id)
	return nil
}

// DeleteEntryAdmin does the same as DeleteEntry, but doesn't require an email, since only the admin should be able to do this.
func (h *DBHandler) DeleteEntryAdmin(id int) error {
	res, err := h.db.Exec("DELETE FROM calendar_entries WHERE id = $1", id)
	if err != nil {
		return err
	}
	if nrOfRows, err := res.RowsAffected(); nrOfRows != 1 || err != nil {
		return fmt.Errorf("no entry deleted")
	}
	return nil
}

// DeleteSeriesAdmin does the same as DeleteSeries, but doesn't require an email, since only the admin should be able to do this.
func (h *DBHandler) DeleteSeriesAdmin(id int) error {
	res, err := h.db.Exec("DELETE FROM calendar_entries WHERE series_id = $1", id)
	if err != nil {
		return err
	}
	if nrOfRows, err := res.RowsAffected(); nrOfRows == 0 || err != nil {
		return fmt.Errorf("no entry deleted")
	}
	h.db.Exec("DELETE FROM calendar_series WHERE id = $1", id)
	return nil
}

// DeleteUserInformation deletes all CalendarEntry that contain the given user information. As the user information is
// only implicitly present in the CalendarEntry, it only needs to be deleted there. However, to not lose the timeslot
// information in the past, those entries are anonymized instead.
func (h *DBHandler) DeleteUserInformation(firstname, lastname, email string) error {
	// Delete the future entries...
	_, err := h.db.Exec("DELETE FROM calendar_entries WHERE firstname = $1 AND lastname = $2 AND email = $3 AND starttime > $4",
		firstname, lastname, email, time.Now())
	if err != nil {
		return err
	}

	// ...and anonymize the future entries
	_, err = h.db.Exec("UPDATE calendar_entries SET firstname = '---', lastname = '---', email = '---' WHERE firstname = $1 AND lastname = $2 AND email = $3",
		firstname, lastname, email)
	if err != nil {
		return err
	}

	return nil
}

// GetEmails queries all the user information in the given interval from the CalendarEntry and prepares it for
// CSV processing.
func (h *DBHandler) GetEmails(interval string) ([][]string, error) {
	var timeModifier string
	switch interval {
	case "30days":
		timeModifier = "-30 days"
	case "90days":
		timeModifier = "-90 days"
	case "1year":
		timeModifier = "-1 year"
	case "all":
		timeModifier = "-100 years" // Effectively all
	default:
		timeModifier = "-30 days"
	}

	// Only query actual email addresses and ignore events ('') and anonymized ('---') entries
	rows, err := h.db.Query(`
        SELECT email, firstname, lastname, MAX(starttime), COUNT(*) as occurences
        FROM calendar_entries
        WHERE starttime >= datetime('now', ?)
        AND email <> '' AND email <> '---'
        GROUP BY email, firstname, lastname
        ORDER BY occurences DESC
    `, timeModifier)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results [][]string
	for rows.Next() {
		var email, firstname, lastname, starttimeStr string
		var count int

		if err := rows.Scan(&email, &firstname, &lastname, &starttimeStr, &count); err != nil {
			return nil, err
		}

		// While starttime should usually be automatically cast as time.Time, using the MAX() database function
		// turns it into a string, thus requiring manual parsing
		starttime, err := time.Parse("2006-01-02 15:04:05 -0700 MST", starttimeStr)
		if err != nil {
			return nil, err
		}

		results = append(results, []string{
			email,
			firstname,
			lastname,
			starttime.Format("02.01.2006"),
			fmt.Sprintf("%d", count),
		})
	}

	return results, nil
}

// CreateVolunteer creates a new Volunteer based on a given email. As this only concerns automated messages, no further
// private information is necessary. However, the email must be unique and not present already.
//
// Additionally, a new volunteer cannot be assumed to be legitimate until he confirms
// his consent. For this purpose, an uuid is used as a token, which is used for later confirmation.
func (h *DBHandler) CreateVolunteer(email string) (*Volunteer, error) {
	token := uuid.New().String()

	res, err := h.db.Exec(`
		INSERT INTO volunteers (email, confirmed, confirmation_token) 
		SELECT $1, $2, $3
	`, email, false, token)
	if err != nil {
		return nil, err
	}
	if nrOfRows, err := res.RowsAffected(); nrOfRows != 1 || err != nil {
		return nil, fmt.Errorf("no volunteer inserted")
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	var newVolunteer Volunteer
	err = h.db.QueryRow("SELECT id, email, confirmation_token FROM volunteers WHERE id = $1", id).Scan(
		&newVolunteer.Id, &newVolunteer.Email, &newVolunteer.ConfirmationToken)
	if err != nil {
		return nil, err
	}

	return &newVolunteer, nil
}

// ConfirmVolunteer confirms the consent of a volunteer by checking whether the correct token for the given email was provided.
func (h *DBHandler) ConfirmVolunteer(email, token string) error {
	res, err := h.db.Exec(`
		UPDATE volunteers
		SET confirmed = TRUE
		WHERE email = $1 AND confirmation_token = $2
	`, email, token)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("no volunteer confirmed")
	}

	return nil
}

// DeleteVolunteer simply deletes a volunteer by his email.
func (h *DBHandler) DeleteVolunteer(email string) error {
	res, err := h.db.Exec("DELETE FROM volunteers WHERE email = $1", email)
	if err != nil {
		return err
	}
	if nrOfRows, err := res.RowsAffected(); nrOfRows != 1 || err != nil {
		return fmt.Errorf("no entry deleted")
	}
	return nil
}

// GetVolunteerEmails gathers the email addresses of the confirmed volunteers.
func (h *DBHandler) GetVolunteerEmails() ([]string, error) {
	rows, err := h.db.Query(`
        SELECT email
        FROM volunteers
        WHERE confirmed == TRUE
    `)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []string
	for rows.Next() {
		var email string

		if err := rows.Scan(&email); err != nil {
			return nil, err
		}

		results = append(results, email)
	}

	return results, nil
}
