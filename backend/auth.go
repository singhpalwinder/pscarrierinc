package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Claims struct {
	Username string `json:"username"`
	IsStaff  bool   `json:"is_staff"`
	IsAdmin  bool   `json:"is_Admin"`
	jwt.RegisteredClaims
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		// Return OK + CORS headers will be added by your middleware
		w.WriteHeader(http.StatusNoContent)
		return
	}

	var creds Credentials
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Println("Bad request JSON decode")
		return
	}

	fmt.Println("Received login for:", creds.Username)

	db, err := sql.Open("sqlite3", "./users.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var storedPassword string
	err = db.QueryRow("SELECT password FROM users WHERE username = ?", creds.Username).Scan(&storedPassword)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Println("Username not found")
		return
	}

	if err = bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(creds.Password)); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Println("Invalid password")
		return
	}

	var isStaffInt int
	err = db.QueryRow("SELECT isStaff FROM users WHERE username = ?", creds.Username).Scan(&isStaffInt)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Println("Username lookup failed for isStaff")
		return
	}
	isStaff := isStaffInt == 1

	var isAdminInt int
	err = db.QueryRow("SELECT isAdmin FROM users WHERE username = ?", creds.Username).Scan(&isAdminInt)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Println("Username lookup failed for isStaff")
		return
	}
	isAdmin := isAdminInt == 1

	// Create Access Token
	expirationTime := time.Now().Add(10 * time.Hour)
	claims := &Claims{
		Username: creds.Username,
		IsStaff:  isStaff,
		IsAdmin:  isAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessString, err := accessToken.SignedString(jwtKey)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Println("Failed to sign access token")
		return
	}

	fmt.Println("Access token generated:", accessString)

	// Create Refresh Token
	refreshExpirationTime := time.Now().Add(5 * 24 * time.Hour)
	refreshClaims := &Claims{
		Username: creds.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(refreshExpirationTime),
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshString, err := refreshToken.SignedString(jwtKey)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Println("Failed to sign refresh token")
		return
	}

	fmt.Println("Refresh token generated:", refreshString)

	// Save refresh token to DB
	var userID int
	err = db.QueryRow("SELECT id FROM users WHERE username = ?", creds.Username).Scan(&userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Println("User ID lookup failed")
		return
	}

	_, err = db.Exec(`INSERT INTO tokens (user_id, refresh_token) VALUES (?, ?)`, userID, refreshString)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Printf("Failed to save refresh token to DB: %v\n", err)
		return
	}

	// Set cookies
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessString,
		Expires:  expirationTime,
		HttpOnly: true,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshString,
		Expires:  refreshExpirationTime,
		HttpOnly: true,
	})

	// Send a small JSON response so your frontend .json() works
	resp := map[string]interface{}{
		"status":   "success",
		"is_staff": isStaff,
		"is_admin": isAdmin,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)

	fmt.Println("🚀 Login successful, cookies set")
}
func verifyHandler(w http.ResponseWriter, r *http.Request) {

	c, err := r.Cookie("access_token")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	accessToken := c.Value
	claims := &Claims{}

	tkn, err := jwt.ParseWithClaims(accessToken, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !tkn.Valid {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Token is valid
	w.WriteHeader(http.StatusOK)
}
func refreshHandler(w http.ResponseWriter, r *http.Request) {

	c, err := r.Cookie("refresh_token")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	refreshToken := c.Value
	claims := &Claims{}

	tkn, err := jwt.ParseWithClaims(refreshToken, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !tkn.Valid {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	db, err := sql.Open("sqlite3", "./users.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var tokenCount int
	db.QueryRow(`SELECT COUNT(*) FROM tokens WHERE refresh_token = ?`, refreshToken).Scan(&tokenCount)
	if tokenCount == 0 {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Issue new Access Token
	expirationTime := time.Now().Add(10 * time.Hour)
	claims.ExpiresAt = jwt.NewNumericDate(expirationTime)
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessString, err := accessToken.SignedString(jwtKey)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessString,
		Expires:  expirationTime,
		HttpOnly: true,
	})
}
func logoutHandler(w http.ResponseWriter, r *http.Request) {
	// Get the refresh token cookie
	c, err := r.Cookie("refresh_token")
	if err != nil {
		// No token, just clear cookies anyway
		clearAuthCookies(w)
		w.WriteHeader(http.StatusOK)
		fmt.Println("No refresh token, logout cleared cookies.")
		return
	}

	refreshToken := c.Value

	db, err := sql.Open("sqlite3", "/opt/pscarrierinc/users.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Delete the refresh token from DB
	_, err = db.Exec(`DELETE FROM tokens WHERE refresh_token = ?`, refreshToken)
	if err != nil {
		fmt.Printf("Failed to delete refresh token: %v\n", err)
	}

	// Clear cookies
	clearAuthCookies(w)

	// Send response
	resp := map[string]string{"status": "logged out"}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)

	fmt.Println("User logged out, tokens deleted, cookies cleared.")
}

func clearAuthCookies(w http.ResponseWriter) {
	// Set the same cookies with empty values & past expiry
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
	})
}
func verifyProfileHandler(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie("access_token")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	accessToken := c.Value
	claims := &Claims{}

	tkn, err := jwt.ParseWithClaims(accessToken, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !tkn.Valid {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Return the claims we trust
	resp := map[string]interface{}{
		"username": claims.Username,
		"is_staff": claims.IsStaff,
		"is_admin": claims.IsAdmin,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
