package main

import (
	"log"
	"net/http"
	"os"

	"github.com/Sakrafux/pray-calendar/backend/app"
	"github.com/Sakrafux/pray-calendar/backend/security"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	dbPath := os.Getenv("DB_PATH")
	port := os.Getenv("PORT")
	adminName := os.Getenv("ADMIN_NAME")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	db := app.NewDBHandler(dbPath)
	defer db.Close()
	db.Setup()

	admin := &security.AdminData{Username: adminName, Password: adminPassword}

	server := http.Server{
		Addr:    ":" + port,
		Handler: app.CreateRouter(db, admin),
	}

	log.Println("Listening on " + port + "...")
	log.Fatal(server.ListenAndServe())
}
