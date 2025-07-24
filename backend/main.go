package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	_ "github.com/mattn/go-sqlite3"
)

var jwtKey []byte

func main() {

	jwtKey = []byte(os.Getenv("JWT_KEY"))
	if len(jwtKey) == 0 {
		log.Fatal("JWT_KEY not set in environment variables")
	}

	// check external dependency
	if err := checkQpdf(); err != nil {
		log.Fatal(err)
	}

	//allowed origins
	origins := []string{
		"https://pscarrierinc.com",
		"http://localhost:3000",
	}

	db := InitDB()
	defer db.Close()

	mux := mux.NewRouter()
	mux.HandleFunc("/tripSheets", tripHandler).Methods("POST", "OPTIONS")
	mux.HandleFunc("/jobApplication", mergePDf).Methods("POST", "OPTIONS")
	mux.HandleFunc("/mergePDF", mergePDf).Methods("POST", "OPTIONS")
	mux.HandleFunc("/token", loginHandler).Methods("POST", "OPTIONS")
	mux.HandleFunc("/refresh", refreshHandler).Methods("POST")
	mux.HandleFunc("/verify", verifyHandler).Methods("POST")
	mux.HandleFunc("/logout", logoutHandler).Methods("POST")
	mux.HandleFunc("/addUser", addUserHandler(db)).Methods("POST")
	mux.HandleFunc("/users", getAllUsersHandler(db)).Methods("GET")
	mux.HandleFunc("/profile", verifyProfileHandler).Methods("GET")

	corsOpts := handlers.CORS(
		handlers.AllowedOrigins(origins),
		handlers.AllowedMethods([]string{"POST", "GET", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type"}),
		handlers.ExposedHeaders([]string{"Content-Disposition"}),
		handlers.AllowCredentials(),
	)

	fmt.Println("Server running on http://localhost:9000")
	log.Fatal(http.ListenAndServe(":9000", corsOpts(mux)))
}
