package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/jung-kurt/gofpdf"
	_ "github.com/mattn/go-sqlite3"
)

var jwtKey []byte

type Location struct {
	City  string `json:"city"`
	State string `json:"state"`
}

type Trip struct {
	Src   Location `json:"src"`
	Dst   Location `json:"dst"`
	Miles string   `json:"miles"`
}

type TripRequest struct {
	TripNumber         string `json:"trip_number"`
	DriverName         string `json:"driver_name"`
	ExtraPayment       string `json:"extra_payment"` // string so user can submit blank
	ExtraReason        string `json:"extra_reason"`
	AdvanceGivenReason string `json:"advance_given_reason"`
	AdvanceGivenValue  string `json:"advance_given_value"`
	CentsPerMile       string `json:"cents_per_mile"`
	TripDateStart      string `json:"trip_date_start"`
	TripDateEnd        string `json:"trip_date_end"`
	Trips              []Trip `json:"trips"`
}

func generatePDF(data TripRequest) ([]byte, error) {
	today := time.Now().Format("January 2, 2006")
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetFont("Arial", "", 12)
	pdf.AddPage()

	// (width, height, text, border, line break, align, fill, link, linkStr)
	pdf.CellFormat(190, 10, "Pay Stub", "", 1, "C", false, 0, "")
	pdf.CellFormat(190, 6, "PS Carrier Inc", "", 1, "C", false, 0, "")
	pdf.CellFormat(190, 6, "19426 Meadow Lakes Dr", "", 1, "C", false, 0, "")
	pdf.CellFormat(190, 6, "Cypress, TX 77433", "", 1, "C", false, 0, "")
	pdf.CellFormat(190, 6, today, "", 1, "C", false, 0, "")
	pdf.Ln(8)

	pdf.SetFont("Arial", "", 11)
	pdf.CellFormat(190, 6, fmt.Sprintf("Driver: %s", data.DriverName), "", 1, "", false, 0, "")
	pdf.CellFormat(190, 6, fmt.Sprintf("Trip #: %s", data.TripNumber), "", 1, "", false, 0, "")
	pdf.CellFormat(95, 6, fmt.Sprintf("Date From: %s", data.TripDateStart), "", 0, "", false, 0, "")
	pdf.CellFormat(95, 6, fmt.Sprintf("To: %s", data.TripDateEnd), "", 1, "", false, 0, "")

	pdf.Ln(4)

	for i, trip := range data.Trips {
		pdf.SetFont("Arial", "B", 11)
		pdf.Cell(0, 8, fmt.Sprintf("Trip %d", i+1))
		pdf.Ln(8)

		pdf.SetFont("Arial", "", 10)

		// Define cell widths
		srcWidth := 80.0
		dstWidth := 80.0
		milesWidth := 30.0
		rowHeight := 6.0

		// Row 1: Streets
		pdf.CellFormat(srcWidth, rowHeight, fmt.Sprintf("From:"), "0", 0, "", false, 0, "")
		pdf.CellFormat(dstWidth, rowHeight, fmt.Sprintf("To:"), "0", 0, "", false, 0, "")
		pdf.CellFormat(milesWidth, rowHeight, fmt.Sprintf("Miles: %s", trip.Miles), "0", 0, "R", false, 0, "")
		pdf.Ln(rowHeight)

		// Row 2: City, State Zip
		srcLine := fmt.Sprintf("%s, %s", trip.Src.City, trip.Src.State)
		dstLine := fmt.Sprintf("%s, %s", trip.Dst.City, trip.Dst.State)
		pdf.CellFormat(srcWidth, rowHeight, srcLine, "0", 0, "", false, 0, "")
		pdf.CellFormat(dstWidth, rowHeight, dstLine, "0", 0, "", false, 0, "")
		pdf.Ln(rowHeight + 2)

	}

	// Total miles calculation
	var totalMiles int
	for _, trip := range data.Trips {
		var miles int
		fmt.Sscanf(trip.Miles, "%d", &miles)
		totalMiles += miles
	}

	// Parse pay values
	var centsPerMile, extraPayment, advanceGivenValue float64
	fmt.Sscanf(data.CentsPerMile, "%f", &centsPerMile)
	fmt.Sscanf(data.ExtraPayment, "%f", &extraPayment)
	fmt.Sscanf(data.AdvanceGivenValue, "%f", &advanceGivenValue)

	milesPay := float64(totalMiles) * centsPerMile
	totalPay := milesPay + extraPayment - advanceGivenValue

	// Add separator line
	pdf.Ln(4)
	pdf.CellFormat(190, 0.5, "", "T", 1, "", false, 0, "")
	pdf.Ln(2)

	// Add bold Total Miles right under separator
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(190, 8, fmt.Sprintf("Total Miles: %d", totalMiles), "", 1, "R", false, 0, "")
	pdf.Ln(6)

	// Add final pay stub summary: align amounts right
	pdf.SetFont("Arial", "B", 10)

	labelWidth := 110.0
	amountWidth := 80.0
	rowHeight := 8.0

	// Line 1: Total Miles Pay
	pdf.CellFormat(labelWidth, rowHeight,
		fmt.Sprintf("Total Miles Pay: %d miles x $%.2f", totalMiles, centsPerMile),
		"", 0, "R", false, 0, "")
	pdf.CellFormat(amountWidth, rowHeight,
		fmt.Sprintf("$%.2f", milesPay),
		"", 1, "R", false, 0, "")

	if extraPayment > 0 {
		// Line 2: Extra
		pdf.CellFormat(labelWidth, rowHeight,
			fmt.Sprintf("+ Extra Payment (%s)", data.ExtraReason),
			"", 0, "R", false, 0, "")
		pdf.CellFormat(amountWidth, rowHeight,
			fmt.Sprintf("$%.2f", extraPayment),
			"", 1, "R", false, 0, "")
	}
	if advanceGivenValue > 0 {
		// Line 3: Advance given
		pdf.CellFormat(labelWidth, rowHeight,
			fmt.Sprintf("- Advance given (%s)", data.AdvanceGivenReason),
			"", 0, "R", false, 0, "")
		pdf.CellFormat(amountWidth, rowHeight,
			fmt.Sprintf("$%.2f", advanceGivenValue),
			"", 1, "R", false, 0, "")
	}

	// Line 4: Grand Total
	pdf.SetFont("Arial", "B", 11)
	pdf.CellFormat(labelWidth, rowHeight,
		"Grand Total:",
		"", 0, "R", false, 0, "")
	pdf.CellFormat(amountWidth, rowHeight,
		fmt.Sprintf("$%.2f", totalPay),
		"", 1, "R", false, 0, "")

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	return buf.Bytes(), err
}

func tripHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	var req TripRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	pdfBytes, err := generatePDF(req)
	if err != nil {
		http.Error(w, "Failed to generate PDF", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=trip_sheet.pdf")
	w.WriteHeader(http.StatusOK)
	w.Write(pdfBytes)
}
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
