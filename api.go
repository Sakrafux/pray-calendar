package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

type ApiHandler struct {
	db *DBHandler
}

func NewApiHandler(db *DBHandler) *ApiHandler {
	return &ApiHandler{db: db}
}

func (h *ApiHandler) GetAllEntries(w http.ResponseWriter, r *http.Request) {
	start := r.URL.Query().Get("start")
	startTime, err := time.Parse("2006-01-02", start)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
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

	insertEntry, err := h.db.InsertEntry(entry)
	if err != nil {
		if err.Error() == "No entry inserted" {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJson(w, insertEntry)
	w.WriteHeader(http.StatusCreated)
}

func (h *ApiHandler) DeleteEntry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	email := r.URL.Query().Get("email")

	err = h.db.DeleteEntry(id, email)
	if err != nil {
		if err.Error() == "No entry deleted" {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
