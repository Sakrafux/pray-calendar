package main

import (
	"flag"
	"log"
	"net/http"
)

func main() {
	dbPath := flag.String("db-path", "./example.db", "Path to sqlite database file")
	port := flag.String("port", "8080", "Port to expose")
	flag.Parse()

	db := NewDBHandler(*dbPath)
	defer db.Close()
	db.Setup()

	server := http.Server{
		Addr:    ":" + *port,
		Handler: CreateRouter(db),
	}

	log.Println("Listening on " + *port + "...")
	log.Fatal(server.ListenAndServe())
}
