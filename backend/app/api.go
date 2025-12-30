// Provides the API layer methods, including business logic, which is then provided by the router

package app

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"time"

	"github.com/Sakrafux/pray-calendar/backend/security"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/httplog/v2"
)

// ApiHandler serves as a service class handling the underlying database layer and providing all the API layer methods.
type ApiHandler struct {
	db    *DBHandler
	admin *security.AdminData
}

// NewApiHandler is the constructor for ApiHandler.
func NewApiHandler(db *DBHandler, admin *security.AdminData) *ApiHandler {
	return &ApiHandler{db: db, admin: admin}
}

// GetAllEntries provides all CalendarEntry for a week starting at a date given via query parameter "start".
// It provides CalendarEntryFull instead, if admin permissions are available.
func (h *ApiHandler) GetAllEntries(w http.ResponseWriter, r *http.Request) {
	start := r.URL.Query().Get("start")
	// Parse only for date
	startTime, err := time.Parse("2006-01-02", start)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check admin permissions from the request context
	if r.Context().Value("admin").(bool) {
		entries, err := h.db.GetAllFullEntriesForWeek(startTime)
		if err != nil {
			httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
			return
		}

		writeJson(w, entries)
		return
	}

	entries, err := h.db.GetAllEntriesForWeek(startTime)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJson(w, entries)
}

// PostEntry creates a new CalendarEntryFull, which is provided via the request body. It also validates the input.
func (h *ApiHandler) PostEntry(w http.ResponseWriter, r *http.Request) {
	var entry CalendarEntryFull
	err := json.NewDecoder(r.Body).Decode(&entry)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate "business rules" for an entry
	if entry.Start.Before(time.Now()) {
		httpErrorWithLog(r, w, "Start time must be in the future", http.StatusBadRequest)
		return
	}

	if !entry.Start.Before(entry.End) {
		httpErrorWithLog(r, w, "Start must be before End", http.StatusBadRequest)
		return
	}

	if entry.End.Sub(entry.Start).Hours() > 24 {
		httpErrorWithLog(r, w, "Duration may not be too long", http.StatusBadRequest)
		return
	}

	// An admin event does necessarily contain no personal information
	if entry.AdminEvent != nil {
		entry.FirstName = ""
		entry.LastName = ""
		entry.Email = ""
	}

	entry.SeriesId = nil
	insertEntry, err := h.db.InsertEntry(entry)
	if err != nil {
		// This issue can only reasonably occur, if the timeslot is already occupied
		if err.Error() == "no entry inserted" {
			httpErrorWithLog(r, w, err.Error(), http.StatusConflict)
			return
		}
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJson(w, insertEntry)
	w.WriteHeader(http.StatusCreated)
}

// PostSeries posts an entire Series, which implies a number of CalendarEntryFull. Therefore, it adheres to the same
// rules as PostEntry.
func (h *ApiHandler) PostSeries(w http.ResponseWriter, r *http.Request) {
	var seriesReq SeriesRequest
	err := json.NewDecoder(r.Body).Decode(&seriesReq)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusBadRequest)
		return
	}

	if seriesReq.Entry.Start.Before(time.Now()) {
		httpErrorWithLog(r, w, "Start time must be in the future", http.StatusBadRequest)
		return
	}

	if !seriesReq.Entry.Start.Before(seriesReq.Entry.End) {
		httpErrorWithLog(r, w, "Start must be before End", http.StatusBadRequest)
		return
	}

	if seriesReq.Entry.End.Sub(seriesReq.Entry.Start).Hours() > 24 {
		httpErrorWithLog(r, w, "Duration may not be too long", http.StatusBadRequest)
		return
	}

	if seriesReq.Entry.AdminEvent != nil {
		seriesReq.Entry.FirstName = ""
		seriesReq.Entry.LastName = ""
		seriesReq.Entry.Email = ""
	}

	// Repeat the given entry according to the series parameters
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
			httpErrorWithLog(r, w, "Invalid interval", http.StatusBadRequest)
			return
		}
		entries = append(entries, nextEntry)
	}

	// All the newly created/repeated entries must be free of timeslot conflicts...
	if err := h.db.CheckMultipleTimeslots(entries); err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusConflict)
		return
	}

	// ...only then can we insert the series...
	series, err := h.db.InsertSeries(seriesReq.Series)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	// ...and all its composing entries.
	insertedEntries := make([]*CalendarEntry, len(entries))
	for i, entry := range entries {
		entry.SeriesId = &series.Id
		// Some kind of bulk insert would likely be more efficient, but given the size and purpose of our application,
		// this is not an issue
		insertedEntries[i], err = h.db.InsertEntry(entry)
		if err != nil {
			httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	writeJson(w, insertedEntries)
	w.WriteHeader(http.StatusCreated)
}

// DeleteEntry deletes a CalendarEntry, given that the user is either admin or provided the correct email address.
//
// Additionally, if this entry is on short notice (<3 days), volunteers will be informed via an automated message.
// However, this feature must be activated.
func (h *ApiHandler) DeleteEntry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusBadRequest)
		return
	}

	entry, err := h.db.GetEntry(id)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusNotFound)
	}

	if r.Context().Value("admin").(bool) {
		err = h.db.DeleteEntryAdmin(id)
	} else {
		email := r.URL.Query().Get("email")
		err = h.db.DeleteEntry(id, email)
	}

	if err != nil {
		if err.Error() == "no entry deleted" {
			httpErrorWithLog(r, w, err.Error(), http.StatusNotFound)
			return
		}
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	if os.Getenv("FEATURE_VOLUNTEER_LIST") == "true" {
		emails, err := h.db.GetVolunteerEmails()
		if err != nil {
			httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
			return
		}

		now := time.Now()
		threeDaysFromNow := now.AddDate(0, 0, 3)

		if entry.Start.After(now) && entry.Start.Before(threeDaysFromNow) {
			err := sendNotificationEmail(emails, entry.Start, entry.End)
			if err != nil {
				httpErrorWithLog(r, w, err.Error(), http.StatusServiceUnavailable)
				return
			}
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteSeries deletes both a Series and its associated CalendarEntry, working otherwise the same as DeleteEntry.
func (h *ApiHandler) DeleteSeries(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusBadRequest)
		return
	}

	entries, err := h.db.GetSeriesEntries(id)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
	}

	if r.Context().Value("admin").(bool) {
		err = h.db.DeleteSeriesAdmin(id)
	} else {
		email := r.URL.Query().Get("email")
		err = h.db.DeleteSeries(id, email)
	}

	if err != nil {
		if err.Error() == "no entry deleted" {
			httpErrorWithLog(r, w, err.Error(), http.StatusNotFound)
			return
		}
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	if os.Getenv("FEATURE_VOLUNTEER_LIST") == "true" {
		emails, err := h.db.GetVolunteerEmails()
		if err != nil {
			httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
			return
		}

		now := time.Now()
		threeDaysFromNow := now.AddDate(0, 0, 3)

		for _, entry := range entries {
			if entry.Start.After(now) && entry.Start.Before(threeDaysFromNow) {
				err := sendNotificationEmail(emails, entry.Start, entry.End)
				if err != nil {
					httpErrorWithLog(r, w, err.Error(), http.StatusServiceUnavailable)
					return
				}
			}
		}
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteUserData deletes all CalendarEntry associated with the given user data.
func (h *ApiHandler) DeleteUserData(w http.ResponseWriter, r *http.Request) {
	if !r.Context().Value("admin").(bool) {
		httpErrorWithLog(r, w, "Forbidden", http.StatusForbidden)
		return
	}

	firstname := r.URL.Query().Get("firstname")
	lastname := r.URL.Query().Get("lastname")
	email := r.URL.Query().Get("email")

	err := h.db.DeleteUserInformation(firstname, lastname, email)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Login checks the provided credentials. On success, it provides a short-lived access token as the plain response, and
// a long-lived refresh token via httpOnly cookie.
func (h *ApiHandler) Login(w http.ResponseWriter, r *http.Request) {
	var login security.AdminData
	err := json.NewDecoder(r.Body).Decode(&login)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusBadRequest)
		return
	}

	if login.Username != h.admin.Username || login.Password != h.admin.Password {
		httpErrorWithLog(r, w, "Invalid login", http.StatusUnauthorized)
		return
	}

	refreshToken, err := security.CreateRefreshToken()
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}
	accessToken, err := security.CreateAccessToken()
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Set the cookie in the response
	http.SetCookie(w, &http.Cookie{
		Name:     "pray_calendar-refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   false,
		// The cookie is only relevant for the refresh endpoint
		Path:     fmt.Sprintf("%s/api/admin/token", os.Getenv("PATH_PREFIX")),
		MaxAge:   30 * 24 * 60 * 60, // 7 days
		SameSite: http.SameSiteStrictMode,
	})

	writeJson(w, accessToken)
}

// RefreshToken relies on the provided cookie to implicitly validate the credentials of the caller. It returns the same
// tokens as Login.
func (h *ApiHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("pray_calendar-refresh_token")
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusBadRequest)
		return
	}
	token := cookie.Value

	_, err = security.ValidateRefreshToken(token)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusUnauthorized)
		return
	}

	refreshToken, err := security.CreateRefreshToken()
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}
	accessToken, err := security.CreateAccessToken()
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "pray_calendar-refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   false,
		Path:     fmt.Sprintf("%s/api/admin/token", os.Getenv("PATH_PREFIX")),
		MaxAge:   30 * 24 * 60 * 60, // 30 days
		SameSite: http.SameSiteStrictMode,
	})

	writeJson(w, accessToken)
}

// DownloadEmails collects all the user information implicitly present in the CalendarEntry and returns them in CSV format.
func (h *ApiHandler) DownloadEmails(w http.ResponseWriter, r *http.Request) {
	interval := r.URL.Query().Get("interval")
	if interval == "" {
		interval = "30days"
	}

	filename := fmt.Sprintf("emails_%s.csv", interval)
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	rows, err := h.db.GetEmails(interval)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	headers := []string{"Email", "Vorname", "Nachname", "Letztes Datum", "Anzahl an Einträgen"}
	if err := writer.Write(headers); err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, row := range rows {
		if err := writer.Write(row); err != nil {
			log.Println("Error writing row to CSV:", err)
			return
		}
	}
}

// PostVolunteerRegistration registers an email address for voluntary automated emails, which inform of short-notice
// openings due to people deleting their CalendarEntry. As we can't assume the consent of the email address' owner, or
// the email address' validity, simply by someone providing it, we send a confirmation email.
//
// This method should only be available behind the feature flag "FEATURE_VOLUNTEER_LIST".
func (h *ApiHandler) PostVolunteerRegistration(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if !isValidEmail(email) {
		httpErrorWithLog(r, w, "Email is not well formed", http.StatusBadRequest)
		return
	}

	volunteer, err := h.db.CreateVolunteer(email)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	confirmationLink := fmt.Sprintf("%s/api/volunteer/confirmation?email=%s&token=%s", os.Getenv("HOST_BE"), email, volunteer.ConfirmationToken)

	if err = sendConfirmationEmail(email, confirmationLink); err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusServiceUnavailable)
	}

	w.WriteHeader(http.StatusCreated)
}

// GetVolunteerConfirmation acts as counterpart to PostVolunteerRegistration, confirming a user's consent to automated
// messages. This method is supposed to be directly accessed via a link in an email, thus it contains some simple feedback.
//
// This method should only be available behind the feature flag "FEATURE_VOLUNTEER_LIST".
func (h *ApiHandler) GetVolunteerConfirmation(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if !isValidEmail(email) {
		httpErrorWithLog(r, w, "Email is not well formed", http.StatusBadRequest)
		return
	}

	token := r.URL.Query().Get("token")

	err := h.db.ConfirmVolunteer(email, token)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	_, err = w.Write([]byte("E-Mail bestätigt"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// DeleteVolunteer removes a volunteer's email address and prevents automated messages.
//
// This method should only be available behind the feature flag "FEATURE_VOLUNTEER_LIST".
func (h *ApiHandler) DeleteVolunteer(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if !isValidEmail(email) {
		httpErrorWithLog(r, w, "Email is not well formed", http.StatusBadRequest)
		return
	}

	err := h.db.DeleteVolunteer(email)
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DownloadVolunteerEmails collects all the volunteers' email addresses and returns them in CSV format.
//
// This method should only be available behind the feature flag "FEATURE_VOLUNTEER_LIST".
func (h *ApiHandler) DownloadVolunteerEmails(w http.ResponseWriter, r *http.Request) {
	filename := "volunteer_emails.csv"
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	emails, err := h.db.GetVolunteerEmails()
	if err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	headers := []string{"Email"}
	if err := writer.Write(headers); err != nil {
		httpErrorWithLog(r, w, err.Error(), http.StatusInternalServerError)
		return
	}

	rows := make([][]string, 0)
	for _, email := range emails {
		rows = append(rows, []string{email})
	}

	for _, row := range rows {
		if err := writer.Write(row); err != nil {
			log.Println("Error writing row to CSV:", err)
			return
		}
	}
}

// writeJson is a utility method to simply return any struct as a JSON string
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

// isValidEmail is a utility method to check an email address string for proper form
func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$`)
	return emailRegex.MatchString(email)
}

// httpErrorWithLog is a utility method to automatically log an error before returning it to the caller
func httpErrorWithLog(r *http.Request, w http.ResponseWriter, error string, code int) {
	logger := httplog.LogEntry(r.Context())
	logger.Error(error)
	http.Error(w, error, code)
}
