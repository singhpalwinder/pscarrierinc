// jobApplication.go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	mail "gopkg.in/mail.v2"
)
type DriverInfo struct {
	FirstName            string `json:"first_name"`
	LastName             string `json:"last_name"`
	PrimaryPhoneNumber   string `json:"primary_phone_number"`
	PrimaryEmail         string `json:"primary_email"`
	DriversLicenseNumber string `json:"drivers_license_number"`
	DriversLicenseState  string `json:"drivers_license_state"`
	YearsOfExperience    string `json:"years_of_experience"`
}
func JobApplication(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	var info DriverInfo
	if err := json.NewDecoder(r.Body).Decode(&info); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	today := time.Now().Format("Jan 2, 2006")

	body := fmt.Sprintf("Name: %s %s\n", info.FirstName, info.LastName)
	body += fmt.Sprintf("Phone Number: %s\n", info.PrimaryPhoneNumber)
	body += fmt.Sprintf("Email: %s\n", info.PrimaryEmail)
	body += fmt.Sprintf("DL #: %s\n", info.DriversLicenseNumber)
	body += fmt.Sprintf("DL State: %s\n", info.DriversLicenseState)
	body += fmt.Sprintf("Years of Experience: %s\n\n", info.YearsOfExperience)
	body += fmt.Sprintf("%s\nPS Carrier Inc", today)

	
	subject := fmt.Sprintf("New Job Application received from %s %s", info.FirstName, info.LastName)

	if err := sendJobEmail(subject, string(body)); err != nil {
		log.Println("Email send failed:", err)
		http.Error(w, "Failed to send email", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "Email sent successfully")
}

func sendJobEmail(subject string, body string) error {
	m := mail.NewMessage()
	m.SetHeader("From", "noreply@pscarrierinc.com")
	m.SetHeader("To", "pscarrierinc@yahoo.com") 
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", body)
	d := mail.NewDialer(
		"smtp.mailgun.org", // Mailgun SMTP server
		587,
		"noreply@pscarrierinc.com",
		os.Getenv("MAILGUN_APP_PASSWORD"), // store securely
		
	)
	
	d.StartTLSPolicy = mail.MandatoryStartTLS

	return d.DialAndSend(m)
}