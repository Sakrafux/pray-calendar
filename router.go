package main

import (
	"net/http"
	"pray-calendar/middleware"
)

func CreateRouter(db *DBHandler) http.Handler {
	router := http.NewServeMux()

	apiHandler := NewApiHandler(db)

	router.HandleFunc("GET /calendar/entries", apiHandler.GetAllEntries)
	router.HandleFunc("POST /calendar/entries", apiHandler.PostEntry)
	router.HandleFunc("OPTIONS /calendar/entries", nullHandler)
	router.HandleFunc("DELETE /calendar/entries/{id}", apiHandler.DeleteEntry)
	router.HandleFunc("OPTIONS /calendar/entries/{id}", nullHandler)

	router.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("OK"))
	})

	routerWrapper := http.NewServeMux()
	routerWrapper.Handle("/api/", http.StripPrefix("/api", router))

	return wrapMiddleware(routerWrapper)
}

func wrapMiddleware(handler http.Handler) http.Handler {
	stack := middleware.CreateStack(
		middleware.Logging,
		middleware.Cors,
	)

	return stack(handler)
}

func nullHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}
