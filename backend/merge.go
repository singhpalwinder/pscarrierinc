package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
)

func checkQpdf() error {
	_, err := exec.LookPath("qpdf")
	if err != nil {
		return fmt.Errorf("qpdf binary not found in PATH — please install it")
	}
	return nil
}
func mergePDf(w http.ResponseWriter, r *http.Request) {

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	err := r.ParseMultipartForm(100 << 20)
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Store uploaded files
	files := []string{}
	for i := 0; ; i++ {
		key := fmt.Sprintf("file%d", i)
		f, _, err := r.FormFile(key)
		if err != nil {
			break // no more files
		}
		defer f.Close()
		tmp, err := os.CreateTemp("", "*.pdf")
		if err != nil {
			http.Error(w, "Failed to create temp file", http.StatusInternalServerError)
			return
		}
		io.Copy(tmp, f)
		tmp.Close()
		files = append(files, tmp.Name())
	}

	if len(files) < 2 {
		http.Error(w, "At least 2 files required", http.StatusBadRequest)
		return
	}

	// Output file
	outPath, err := os.CreateTemp("", "merged-*.pdf")
	if err != nil {
		http.Error(w, "Failed to create output file", http.StatusInternalServerError)
		return
	}
	outPath.Close()

	// Build qpdf command
	args := []string{
		"--warning-exit-0",
		"--no-warn",
		"--empty",
		"--pages",
	}

	args = append(args, files...)
	args = append(args, "--", outPath.Name())

	cmd := exec.Command("qpdf", args...)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		log.Printf("qpdf merge failed: %v — %s\n", err, stderr.String())
		http.Error(w, "Failed to merge PDF", http.StatusInternalServerError)
		return
	}

	if stderr.Len() > 0 {
		log.Printf("qpdf completed with warnings: %s\n", stderr.String())
	}

	// Set headers and serve file
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=merged.pdf")

	// Serve and cleanup after
	http.ServeFile(w, r, outPath.Name())

	// Cleanup
	go func() {
		for _, f := range files {
			os.Remove(f)
		}
		os.Remove(outPath.Name())
	}()
}
