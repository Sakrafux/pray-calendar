package app

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

type DBHandler struct {
	db *sql.DB
}

func NewDBHandler(path string) *DBHandler {
	db := connect(path)
	return &DBHandler{db: db}
}

func connect(path string) *sql.DB {
	log.Println("[sqlite] Connecting to database...")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("[sqlite] Successfully connected to database")

	return db
}

func (h *DBHandler) Close() {
	err := h.db.Close()
	if err != nil {
		return
	}
}

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
	if err != nil {
		log.Fatal(err)
	}
}

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

func (h *DBHandler) InsertEntry(entry CalendarEntryFull) (*CalendarEntry, error) {
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
	if nrOfRows, err := res.RowsAffected(); nrOfRows != 1 || err != nil {
		return nil, fmt.Errorf("no entry inserted")
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	var newEntry CalendarEntry
	err = h.db.QueryRow("SELECT id, firstname, starttime, endtime, admin_event, series_id FROM calendar_entries WHERE id = $1", id).Scan(
		&newEntry.Id, &newEntry.FirstName, &newEntry.Start, &newEntry.End, &newEntry.AdminEvent, &newEntry.SeriesId)
	if err != nil {
		return nil, err
	}

	return &newEntry, nil
}

func (h *DBHandler) CheckMultipleTimeslots(entries []CalendarEntryFull) error {
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

	var newSeries Series
	err = h.db.QueryRow("SELECT id, interval, repetitions FROM calendar_series WHERE id = $1", id).Scan(
		&newSeries.Id, &newSeries.Interval, &newSeries.Repetitions)
	if err != nil {
		return nil, err
	}

	return &newSeries, nil
}

func (h *DBHandler) DeleteEntry(id int, email string) error {
	res, err := h.db.Exec("DELETE FROM calendar_entries WHERE id = $1 AND email = $2", id, email)
	if err != nil {
		return err
	}
	if nrOfRows, err := res.RowsAffected(); nrOfRows != 1 || err != nil {
		return fmt.Errorf("no entry deleted")
	}
	return nil
}

func (h *DBHandler) DeleteSeries(id int, email string) error {
	res, err := h.db.Exec("DELETE FROM calendar_entries WHERE series_id = $1 AND email = $2", id, email)
	if err != nil {
		return err
	}
	if nrOfRows, err := res.RowsAffected(); nrOfRows == 0 || err != nil {
		return fmt.Errorf("no entry deleted")
	}
	h.db.Exec("DELETE FROM calendar_series WHERE id = $1", id)
	return nil
}

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

func (h *DBHandler) DeleteUserInformation(firstname, lastname, email string) error {
	_, err := h.db.Exec("DELETE FROM calendar_entries WHERE firstname = $1 AND lastname = $2 AND email = $3 AND starttime > $4",
		firstname, lastname, email, time.Now())
	if err != nil {
		return err
	}

	_, err = h.db.Exec("UPDATE calendar_entries SET firstname = '---', lastname = '---', email = '---' WHERE firstname = $1 AND lastname = $2 AND email = $3",
		firstname, lastname, email)
	if err != nil {
		return err
	}

	return nil
}

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

func (h *DBHandler) GetVolunteerEmails() ([][]string, error) {
	rows, err := h.db.Query(`
        SELECT email
        FROM volunteers
        WHERE confirmed == TRUE
    `)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results [][]string
	for rows.Next() {
		var email string

		if err := rows.Scan(&email); err != nil {
			return nil, err
		}

		results = append(results, []string{email})
	}

	return results, nil
}
