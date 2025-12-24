package app

import (
	"context"
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
	router.Use(Authentication)

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
			r.Use(AdminOnly)
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

func Authentication(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")

		if auth == "" {
			ctx := context.WithValue(r.Context(), "admin", false)
			httplog.LogEntrySetField(ctx, "admin", slog.BoolValue(false))
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		if len(auth) <= 7 || auth[:7] != "Bearer " {
			http.Error(w, "Unauthorized: Missing or invalid token format", http.StatusUnauthorized)
			return
		}

		tokenString := auth[7:]

		_, err := security.ValidateAccessToken(tokenString)
		if err != nil {
			http.Error(w, "Unauthorized: Invalid access token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "admin", true)
		httplog.LogEntrySetField(ctx, "admin", slog.BoolValue(true))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !r.Context().Value("admin").(bool) {
			http.Error(w, "Unauthorized: Admin permissions required", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
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
