package app

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/Sakrafux/pray-calendar/backend/security"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httplog/v2"
)

func CreateRouter(db *DBHandler, admin *security.AdminData) http.Handler {

	logger := httplog.NewLogger("prayer-calendar", httplog.Options{
		LogLevel:        slog.LevelInfo,
		JSON:            false,
		Concise:         true,
		TimeFieldFormat: time.RFC3339,
	})

	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(httplog.RequestLogger(logger))
	router.Use(middleware.Recoverer)
	router.Use(middleware.Timeout(60 * time.Second))
	router.Use(middleware.Heartbeat("/health"))
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	apiHandler := NewApiHandler(db, admin)

	router.Route("/api", func(router chi.Router) {
		router.Route("/calendar", func(r chi.Router) {
			r.Get("/entries", apiHandler.GetAllEntries)
			r.Post("/entries", apiHandler.PostEntry)
			r.Delete("/entries/{id}", apiHandler.DeleteEntry)

			r.Post("/series", apiHandler.PostSeries)
			r.Delete("/series/{id}", apiHandler.DeleteSeries)
		})

		router.Route("/volunteer", func(r chi.Router) {
			r.Post("/", apiHandler.PostVolunteerRegistration)
			r.Get("/confirmation", apiHandler.GetVolunteerConfirmation)
		})

		router.Route("/admin", func(r chi.Router) {
			r.Post("/login", apiHandler.Login)
			r.Get("/token", apiHandler.RefreshToken)
			r.Delete("/user", apiHandler.DeleteUserData)
			r.Get("/emails", apiHandler.DownloadEmails)
			r.Get("/volunteer", apiHandler.DownloadVolunteerEmails)
			r.Delete("/volunteer", apiHandler.DeleteVolunteer)
		})
	})

	router.Handle("/*", NewFrontendSpaHandler())

	return router
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
