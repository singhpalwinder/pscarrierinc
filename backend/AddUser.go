package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	FirstName          string `json:"first_name"`
	LastName           string `json:"last_name"`
	PrimaryPhoneNumber string `json:"primary_phone_number"`
	PrimaryEmail       string `json:"primary_email"`
	Username           string `json:"username"`
	Password           string `json:"password"`
	IsAdmin            bool   `json:"is_admin"`
	IsStaff            bool   `json:"is_staff"`
	IsDriver           bool   `json:"is_driver"`
	GenAPIKey          bool   `json:"genAPIKey"`
}
type PublicUser struct {
	ID                 int    `json:"id"`
	Username           string `json:"username"`
	FirstName          string `json:"first_name"`
	LastName           string `json:"last_name"`
	PrimaryPhoneNumber string `json:"primary_phone_number"`
	PrimaryEmail       string `json:"primary_email"`
	IsAdmin            bool   `json:"is_admin"`
	IsStaff            bool   `json:"is_staff"`
	IsDriver           bool   `json:"is_driver"`
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func InitDB() *sql.DB {
	db, err := sql.Open("sqlite3", "./users.db")
	if err != nil {
		log.Fatal(err)
	}

	sqlStmt := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		firstName TEXT NOT NULL,
		lastName TEXT NOT NULL,
		primaryPhoneNumber TEXT,
		primaryEmail TEXT,
		password TEXT NOT NULL,
		isAdmin INTEGER DEFAULT 0,
		isStaff INTEGER DEFAULT 0,
		isDriver INTEGER DEFAULT 0
	);
	CREATE TABLE IF NOT EXISTS tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		refresh_token TEXT,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	CREATE TABLE IF NOT EXISTS apiKeys (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		api_key TEXT,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`
	_, err = db.Exec(sqlStmt)
	if err != nil {
		log.Fatalf("%q: %s\n", err, sqlStmt)
	}

	fmt.Println("✅ DB initialized")
	return db
}
func generateAPIKey() (string, error) {
	b := make([]byte, 32) // 256-bit key
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
func getAllUsersHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`SELECT id, username, firstName, lastName, primaryPhoneNumber, primaryEmail, isAdmin, isStaff, isDriver FROM users`)
		if err != nil {
			http.Error(w, fmt.Sprintf("DB query error: %v", err), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var users []PublicUser

		for rows.Next() {
			var u PublicUser
			var isAdmin, isStaff, isDriver int

			err := rows.Scan(&u.ID, &u.Username, &u.FirstName, &u.LastName, &u.PrimaryPhoneNumber, &u.PrimaryEmail, &isAdmin, &isStaff, &isDriver)
			if err != nil {
				http.Error(w, "Error scanning rows", http.StatusInternalServerError)
				return
			}

			u.IsAdmin = isAdmin == 1
			u.IsStaff = isStaff == 1
			u.IsDriver = isDriver == 1

			users = append(users, u)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}
func addUserHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}

		// Parse JWT from access_token cookie
		c, err := r.Cookie("access_token")
		if err != nil {
			http.Error(w, "Unauthorized: no access token", http.StatusUnauthorized)
			return
		}

		claims := &Claims{}
		tkn, err := jwt.ParseWithClaims(c.Value, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !tkn.Valid {
			http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
			return
		}

		// Verify role: must be Staff
		if !claims.IsStaff {
			http.Error(w, "Forbidden: insufficient privileges", http.StatusForbidden)
			return
		}
		var info User
		if err := json.NewDecoder(r.Body).Decode(&info); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		fmt.Printf("Creating user: %s (Admin=%v, Staff=%v, Driver=%v, GenAPIKey=%v)\n",
			info.Username, info.IsAdmin, info.IsStaff, info.IsDriver, info.GenAPIKey)

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(info.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Error hashing password", http.StatusInternalServerError)
			return
		}

		_, err = db.Exec(
			`INSERT INTO users (username, firstName, lastName, primaryPhoneNumber, primaryEmail, password, isAdmin, isStaff, isDriver)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			info.Username,
			info.FirstName,
			info.LastName,
			info.PrimaryPhoneNumber,
			info.PrimaryEmail,
			string(hashedPassword),
			boolToInt(info.IsAdmin),
			boolToInt(info.IsStaff),
			boolToInt(info.IsDriver),
		)
		if err != nil {
			http.Error(w, fmt.Sprintf("DB insert error: %v", err), http.StatusInternalServerError)
			return
		}

		if info.GenAPIKey {
			apiKey, err := generateAPIKey()
			if err != nil {
				http.Error(w, "Failed to generate API key", http.StatusInternalServerError)
				return
			}

			var userID int
			err = db.QueryRow(`SELECT id FROM users WHERE username = ?`, info.Username).Scan(&userID)
			if err != nil {
				http.Error(w, "Could not find user for API key", http.StatusInternalServerError)
				return
			}

			var count int
			err = db.QueryRow(`SELECT COUNT(*) FROM apiKeys WHERE user_id = ?`, userID).Scan(&count)
			if err != nil {
				http.Error(w, "Error checking existing API key", http.StatusInternalServerError)
				return
			}

			if count > 0 {
				fmt.Println("User already has an API key")
			} else {
				_, err = db.Exec(`INSERT INTO apiKeys (user_id, api_key) VALUES (?, ?)`, userID, apiKey)
				if err != nil {
					http.Error(w, "Error inserting API key", http.StatusInternalServerError)
					return
				}
				fmt.Println("API Key generated:", apiKey)
			}
		}

		w.WriteHeader(http.StatusCreated)
		fmt.Fprintln(w, "User added successfully")
	}
}
