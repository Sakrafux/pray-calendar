package app

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/Sakrafux/pray-calendar/backend/middleware"
	"github.com/Sakrafux/pray-calendar/backend/security"
)

func CreateRouter(db *DBHandler, admin *security.AdminData) http.Handler {
	router := http.NewServeMux()

	apiHandler := NewApiHandler(db, admin)

	router.HandleFunc("GET /calendar/entries", apiHandler.GetAllEntries)
	router.HandleFunc("POST /calendar/entries", apiHandler.PostEntry)
	router.HandleFunc("OPTIONS /calendar/entries", nullHandler)
	router.HandleFunc("DELETE /calendar/entries/{id}", apiHandler.DeleteEntry)
	router.HandleFunc("OPTIONS /calendar/entries/{id}", nullHandler)

	router.HandleFunc("POST /calendar/series", apiHandler.PostSeries)
	router.HandleFunc("OPTIONS /calendar/series", nullHandler)
	router.HandleFunc("DELETE /calendar/series/{id}", apiHandler.DeleteSeries)
	router.HandleFunc("OPTIONS /calendar/series/{id}", nullHandler)

	router.HandleFunc("POST /admin/login", apiHandler.Login)
	router.HandleFunc("OPTIONS /admin/login", nullHandler)
	router.HandleFunc("GET /admin/token", apiHandler.RefreshToken)
	router.HandleFunc("OPTIONS /admin/token", nullHandler)
	router.HandleFunc("DELETE /admin/user", apiHandler.DeleteUserData)
	router.HandleFunc("OPTIONS /admin/user", nullHandler)

	router.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("OK"))
	})

	routerWrapper := http.NewServeMux()
	routerWrapper.Handle("/api/", http.StripPrefix("/api", router))
	routerWrapper.Handle("/", NewFrontendSpaHandler())

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

type FrontendSpaHandler struct {
	fileServer http.Handler
}

func NewFrontendSpaHandler() FrontendSpaHandler {
	return FrontendSpaHandler{http.FileServer(http.Dir("frontend"))}
}

func (h FrontendSpaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join("frontend", r.URL.Path)

	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		http.ServeFile(w, r, filepath.Join("frontend", "index.html"))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.fileServer.ServeHTTP(w, r)
}
