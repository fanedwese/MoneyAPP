package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

func main() {
	if err := initDB(); err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()

	// Categories
	mux.HandleFunc("/api/categories", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleGetCategories(w, r)
		case http.MethodPost:
			handleCreateCategory(w, r)
		default:
			writeError(w, 405, "method not allowed")
		}
	})

	// Transactions
	mux.HandleFunc("/api/transactions", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleGetTransactions(w, r)
		case http.MethodPost:
			handleCreateTransaction(w, r)
		default:
			writeError(w, 405, "method not allowed")
		}
	})

	// Credit cards
	mux.HandleFunc("/api/cards", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleGetCards(w, r)
		case http.MethodPost:
			handleCreateCard(w, r)
		default:
			writeError(w, 405, "method not allowed")
		}
	})

	// Goals
	mux.HandleFunc("/api/goals", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleGetGoals(w, r)
		case http.MethodPost:
			handleCreateGoal(w, r)
		default:
			writeError(w, 405, "method not allowed")
		}
	})

	// Distribute savings
	mux.HandleFunc("/api/savings/distribute", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, 405, "method not allowed")
			return
		}
		handleDistributeSavings(w, r)
	})

	// Items with ID: /api/categories/{id}, /api/transactions/{id}, etc.
	mux.HandleFunc("/api/categories/", handleCategoryItem)
	mux.HandleFunc("/api/transactions/", handleTransactionItem)
	mux.HandleFunc("/api/cards/", handleCardItem)
	mux.HandleFunc("/api/goals/", handleGoalItem)

	// Health check
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"status": "ok"})
	})

	handler := corsMiddleware(mux)

	port := "8080"
	fmt.Printf("Server starting on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ── Item routes with ID ──────────────────────────────────

func handleCategoryItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/categories/")
	if id == "" {
		writeError(w, 404, "not found")
		return
	}
	switch r.Method {
	case http.MethodPut:
		handleUpdateCategory(w, r, id)
	case http.MethodDelete:
		handleDeleteCategory(w, r, id)
	default:
		writeError(w, 405, "method not allowed")
	}
}

func handleTransactionItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/transactions/")
	if id == "" {
		writeError(w, 404, "not found")
		return
	}
	switch r.Method {
	case http.MethodPut:
		handleUpdateTransaction(w, r, id)
	case http.MethodDelete:
		handleDeleteTransaction(w, r, id)
	default:
		writeError(w, 405, "method not allowed")
	}
}

func handleCardItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/cards/")
	if id == "" {
		writeError(w, 404, "not found")
		return
	}
	switch r.Method {
	case http.MethodPut:
		handleUpdateCard(w, r, id)
	case http.MethodDelete:
		handleDeleteCard(w, r, id)
	default:
		writeError(w, 405, "method not allowed")
	}
}

func handleGoalItem(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/goals/")
	if id == "" {
		writeError(w, 404, "not found")
		return
	}
	switch r.Method {
	case http.MethodPut:
		handleUpdateGoal(w, r, id)
	case http.MethodDelete:
		handleDeleteGoal(w, r, id)
	default:
		writeError(w, 405, "method not allowed")
	}
}

// ── ID & date helpers ────────────────────────────────────

func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func todayISO() string {
	return time.Now().Format("2006-01-02")
}
