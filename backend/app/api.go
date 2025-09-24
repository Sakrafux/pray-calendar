package app

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/Sakrafux/pray-calendar/backend/security"
)

type ApiHandler struct {
	db    *DBHandler
	admin *security.AdminData
}

func NewApiHandler(db *DBHandler, admin *security.AdminData) *ApiHandler {
	return &ApiHandler{db: db, admin: admin}
}

func (h *ApiHandler) GetAllEntries(w http.ResponseWriter, r *http.Request) {
	start := r.URL.Query().Get("start")
	startTime, err := time.Parse("2006-01-02", start)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if isAdmin(r) {
		entries, err := h.db.GetAllFullEntriesForWeek(startTime)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		writeJson(w, entries)
		return
	}

	entries, err := h.db.GetAllEntriesForWeek(startTime)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJson(w, entries)
}

func (h *ApiHandler) PostEntry(w http.ResponseWriter, r *http.Request) {
	var entry CalendarEntryFull
	err := json.NewDecoder(r.Body).Decode(&entry)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if entry.Start.Before(time.Now()) {
		http.Error(w, "Start time must be in the future", http.StatusBadRequest)
		return
	}

	if !entry.Start.Before(entry.End) {
		http.Error(w, "Start must be before End", http.StatusBadRequest)
		return
	}

	if entry.End.Sub(entry.Start).Hours() > 24 {
		http.Error(w, "Duration may not be too long", http.StatusBadRequest)
		return
	}

	if entry.IsBlocker {
		entry.FirstName = "Blocker"
		entry.LastName = ""
		entry.Email = ""
	}

	entry.SeriesId = nil
	insertEntry, err := h.db.InsertEntry(entry)
	if err != nil {
		if err.Error() == "no entry inserted" {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJson(w, insertEntry)
	w.WriteHeader(http.StatusCreated)
}

func (h *ApiHandler) PostSeries(w http.ResponseWriter, r *http.Request) {
	var seriesReq SeriesRequest
	err := json.NewDecoder(r.Body).Decode(&seriesReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if seriesReq.Entry.Start.Before(time.Now()) {
		http.Error(w, "Start time must be in the future", http.StatusBadRequest)
		return
	}

	if !seriesReq.Entry.Start.Before(seriesReq.Entry.End) {
		http.Error(w, "Start must be before End", http.StatusBadRequest)
		return
	}

	if seriesReq.Entry.End.Sub(seriesReq.Entry.Start).Hours() > 24 {
		http.Error(w, "Duration may not be too long", http.StatusBadRequest)
		return
	}

	if seriesReq.Entry.IsBlocker {
		seriesReq.Entry.FirstName = "Blocker"
		seriesReq.Entry.LastName = ""
		seriesReq.Entry.Email = ""
	}

	entries := []CalendarEntryFull{seriesReq.Entry}
	for range seriesReq.Series.Repetitions - 1 {
		nextEntry := entries[len(entries)-1]
		if seriesReq.Series.Interval == "weekly" {
			nextEntry.Start = nextEntry.Start.AddDate(0, 0, 7)
			nextEntry.End = nextEntry.End.AddDate(0, 0, 7)
		} else if seriesReq.Series.Interval == "monthly" {
			nextEntry.Start = nextEntry.Start.AddDate(0, 1, 0)
			nextEntry.End = nextEntry.End.AddDate(0, 1, 0)
		} else if seriesReq.Series.Interval == "daily" {
			nextEntry.Start = nextEntry.Start.AddDate(0, 0, 1)
			nextEntry.End = nextEntry.End.AddDate(0, 0, 1)
		} else {
			http.Error(w, "Invalid interval", http.StatusBadRequest)
			return
		}
		entries = append(entries, nextEntry)
	}

	if err := h.db.CheckMultipleTimeslots(entries); err != nil {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}

	series, err := h.db.InsertSeries(seriesReq.Series)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	insertedEntries := make([]*CalendarEntry, len(entries))
	for i, entry := range entries {
		entry.SeriesId = &series.Id
		insertedEntries[i], err = h.db.InsertEntry(entry)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	writeJson(w, insertedEntries)
	w.WriteHeader(http.StatusCreated)
}

func (h *ApiHandler) DeleteEntry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if isAdmin(r) {
		err = h.db.DeleteEntryAdmin(id)
	} else {
		email := r.URL.Query().Get("email")
		err = h.db.DeleteEntry(id, email)
	}

	if err != nil {
		if err.Error() == "no entry deleted" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ApiHandler) DeleteSeries(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if isAdmin(r) {
		err = h.db.DeleteSeriesAdmin(id)
	} else {
		email := r.URL.Query().Get("email")
		err = h.db.DeleteSeries(id, email)
	}

	if err != nil {
		if err.Error() == "no entry deleted" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ApiHandler) DeleteUserData(w http.ResponseWriter, r *http.Request) {
	if !isAdmin(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	firstname := r.URL.Query().Get("firstname")
	lastname := r.URL.Query().Get("lastname")
	email := r.URL.Query().Get("email")

	err := h.db.DeleteUserInformation(firstname, lastname, email)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ApiHandler) Login(w http.ResponseWriter, r *http.Request) {
	var login security.AdminData
	err := json.NewDecoder(r.Body).Decode(&login)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if login.Username != h.admin.Username || login.Password != h.admin.Password {
		http.Error(w, "Invalid login", http.StatusUnauthorized)
		return
	}

	refreshToken, err := security.CreateRefreshToken()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	accessToken, err := security.CreateAccessToken()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "pray_calendar-refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   false,
		Path:     "/api/admin/token",
		MaxAge:   30 * 24 * 60 * 60, // 7 days
		SameSite: http.SameSiteStrictMode,
	})

	writeJson(w, accessToken)
}

func (h *ApiHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("pray_calendar-refresh_token")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	token := cookie.Value

	_, err = security.ValidateRefreshToken(token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	refreshToken, err := security.CreateRefreshToken()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	accessToken, err := security.CreateAccessToken()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "pray_calendar-refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   false,
		Path:     "/api/admin/token",
		MaxAge:   30 * 24 * 60 * 60, // 30 days
		SameSite: http.SameSiteStrictMode,
	})

	writeJson(w, accessToken)
}

func writeJson(w http.ResponseWriter, data any) {
	b, err := json.Marshal(data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	_, err = w.Write(b)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func isAdmin(r *http.Request) bool {
	auth := r.Header.Get("Authorization")
	tokenString := ""
	if len(auth) > 7 && auth[:7] == "Bearer " {
		tokenString = auth[7:]
		_, err := security.ValidateAccessToken(tokenString)
		return err == nil
	}
	return false
}
