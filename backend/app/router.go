// Creates the router, organizing all endpoints centrally

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

// CreateRouter creates a go-chi router, distributing application state, i.e., DBHandler and security.AdminData, into
// the respective api handlers.
func CreateRouter(db *DBHandler, admin *security.AdminData) http.Handler {
	// httplog is designed for easy integration with a go-chi router, is based on slog and thus allows for structured logging
	logger := httplog.NewLogger("prayer-calendar", httplog.Options{
		LogLevel: slog.LevelInfo,
		// on a real production server with observability, this should likely true
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
	// this is a go-chi compatible CORS middleware
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	// this is custom middleware for injecting authentication information, i.e., an admin flag
	router.Use(Authentication)

	apiHandler := NewApiHandler(db, admin)

	// all the routes are behind /api to ensure no overlap with the SPA frontend
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
			// as those endpoints concern logging in, they must not be behind an authentication barrier...
			r.Post("/login", apiHandler.Login)
			r.Get("/token", apiHandler.RefreshToken)

			// ...however, all the other admin functionalities are
			r.Group(func(r chi.Router) {
				r.Use(AdminOnly)

				r.Delete("/user", apiHandler.DeleteUserData)
				r.Get("/emails", apiHandler.DownloadEmails)

				r.Get("/volunteer", apiHandler.DownloadVolunteerEmails)
				r.Delete("/volunteer", apiHandler.DeleteVolunteer)
			})
		})
	})

	// all other paths are treated as part of the frontend, which handles 404s if necessary
	router.Handle("/*", NewFrontendSpaHandler())

	return router
}

// Authentication is a custom middleware, which reads the Authorization header of a request and then adds, depending
// on whether it contains a valid access token JWT, an admin flag to both the request context and the logger.
func Authentication(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")

		// If the header is missing, set the flag to false
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

		// Otherwise, if no errors occurred, set the flag to true
		ctx := context.WithValue(r.Context(), "admin", true)
		httplog.LogEntrySetField(ctx, "admin", slog.BoolValue(true))
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AdminOnly is a very small custom middleware that simply checks that the admin flag is set to true in the request
// context to protect admin-only routes.
func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !r.Context().Value("admin").(bool) {
			http.Error(w, "Unauthorized: Admin permissions required", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// FrontendSpaHandler implements the http.Handler interface and extends the behavior of http.FileServer by
// either serving existing files (in the case of static assets that need to be served) or rerouting non-existing
// file paths back to the index.html for frontend routing to take over.
//
// This is necessary to ensure SPA client-side routing works. Or rather, that directly opening a (client-side) route
// other than the index page (which is very likely in case of refreshing the page) is also handled by the client-side
// router and not resolved on the server.
type FrontendSpaHandler struct {
	// fileServer is the underlying http.FileServer responsible for serving files
	fileServer http.Handler
}

func NewFrontendSpaHandler() FrontendSpaHandler {
	// This handler expects all frontend assets to be present in a corresponding folder
	return FrontendSpaHandler{http.FileServer(http.Dir("frontend"))}
}

func (h FrontendSpaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join("frontend", r.URL.Path)

	_, err := os.Stat(path)
	// IsNotExist means that only the specific files doesn't exist, which we expect for client-side routes
	if os.IsNotExist(err) {
		http.ServeFile(w, r, filepath.Join("frontend", "index.html"))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.fileServer.ServeHTTP(w, r)
}
