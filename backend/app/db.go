package app

import (
	"database/sql"
	"fmt"
	"log"
	"time"

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
			is_blocker BOOLEAN NOT NULL,
			series_id INTEGER,
			FOREIGN KEY (series_id) REFERENCES calendar_series(id)
		);
	`)
	if err != nil {
		log.Fatal(err)
	}
}

func (h *DBHandler) GetAllEntriesForWeek(start time.Time) ([]CalendarEntry, error) {
	end := start.AddDate(0, 0, 7)
	rows, err := h.db.Query(`
		SELECT id, firstname, starttime, endtime, is_blocker, series_id FROM calendar_entries
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
		if err := rows.Scan(&entry.Id, &entry.FirstName, &entry.Start, &entry.End, &entry.IsBlocker, &entry.SeriesId); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

func (h *DBHandler) GetAllFullEntriesForWeek(start time.Time) ([]CalendarEntryFull, error) {
	end := start.AddDate(0, 0, 7)
	rows, err := h.db.Query(`
		SELECT id, firstname, lastname, email, starttime, endtime, is_blocker, series_id FROM calendar_entries
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
		if err := rows.Scan(&entry.Id, &entry.FirstName, &entry.LastName, &entry.Email, &entry.Start, &entry.End, &entry.IsBlocker, &entry.SeriesId); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	return entries, nil
}

func (h *DBHandler) InsertEntry(entry CalendarEntryFull) (*CalendarEntry, error) {
	res, err := h.db.Exec(`
		INSERT INTO calendar_entries (firstname, lastname, email, starttime, endtime, is_blocker, series_id) 
		SELECT $1, $2, $3, $4, $5, $6, $7
		WHERE NOT EXISTS (
			SELECT 1 FROM calendar_entries
			WHERE starttime < $5 AND endtime > $4
		)
	`, entry.FirstName, entry.LastName, entry.Email, entry.Start, entry.End, entry.IsBlocker, entry.SeriesId)
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
	err = h.db.QueryRow("SELECT id, firstname, starttime, endtime, is_blocker, series_id FROM calendar_entries WHERE id = $1", id).Scan(
		&newEntry.Id, &newEntry.FirstName, &newEntry.Start, &newEntry.End, &entry.IsBlocker, &newEntry.SeriesId)
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
