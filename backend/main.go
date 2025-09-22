package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/Sakrafux/pray-calendar/backend/app"
	"github.com/Sakrafux/pray-calendar/backend/security"
)

func main() {
	dbPath := flag.String("db-path", "./example.db", "Path to sqlite database file")
	port := flag.String("port", "8080", "Port to expose")
	adminName := flag.String("admin-name", "admin", "Admin name")
	adminPassword := flag.String("admin-password", "admin", "Admin password")
	flag.Parse()

	db := app.NewDBHandler(*dbPath)
	defer db.Close()
	db.Setup()

	admin := &security.AdminData{Username: *adminName, Password: *adminPassword}

	server := http.Server{
		Addr:    ":" + *port,
		Handler: app.CreateRouter(db, admin),
	}

	log.Println("Listening on " + *port + "...")
	log.Fatal(server.ListenAndServe())
}
