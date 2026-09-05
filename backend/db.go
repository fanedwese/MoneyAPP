package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

func initDB() error {
	dbPath := "finance.db"
	if envPath := os.Getenv("DB_PATH"); envPath != "" {
		dbPath = envPath
	}

	var err error
	db, err = sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}

	if err = db.Ping(); err != nil {
		return fmt.Errorf("ping db: %w", err)
	}

	if err = createTables(); err != nil {
		return fmt.Errorf("create tables: %w", err)
	}

	if err = seedCategories(); err != nil {
		return fmt.Errorf("seed: %w", err)
	}

	return nil
}

func createTables() error {
	schema := `
	CREATE TABLE IF NOT EXISTS categories (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		icon TEXT NOT NULL DEFAULT 'wallet',
		color TEXT NOT NULL DEFAULT '#22c55e',
		is_mandatory INTEGER NOT NULL DEFAULT 0,
		budget_limit REAL,
		payment_day INTEGER
	);

	CREATE TABLE IF NOT EXISTS transactions (
		id TEXT PRIMARY KEY,
		category_id TEXT,
		amount REAL NOT NULL,
		type TEXT NOT NULL CHECK(type IN ('income','expense')),
		date TEXT NOT NULL,
		comment TEXT,
		payment_method TEXT DEFAULT 'debit',
		credit_card_id TEXT,
		source TEXT,
		goal_id TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
		FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
		FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE SET NULL
	);

	CREATE TABLE IF NOT EXISTS credit_cards (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		"limit" REAL NOT NULL DEFAULT 0,
		balance REAL NOT NULL DEFAULT 0,
		grace_days INTEGER NOT NULL DEFAULT 55,
		statement_day INTEGER NOT NULL DEFAULT 10
	);

	CREATE TABLE IF NOT EXISTS financial_goals (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		target_amount REAL NOT NULL,
		current_amount REAL NOT NULL DEFAULT 0,
		deadline TEXT,
		color TEXT NOT NULL DEFAULT '#8b5cf6'
	);
	`
	_, err := db.Exec(schema)
	return err
}

type seedCat struct {
	title       string
	icon        string
	color       string
	isMandatory bool
	budgetLimit float64
	paymentDay  int
}

func seedCategories() error {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM categories").Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	seeds := []seedCat{
		{"Кредиты", "landmark", "#ef4444", true, 15000, 5},
		{"Кредитные карты", "credit-card", "#f97316", true, 8000, 10},
		{"Коммунальные услуги", "home", "#eab308", true, 6000, 20},
		{"Ипотека", "building", "#a855f7", true, 35000, 1},
		{"Подписки", "repeat", "#06b6d4", true, 2000, 15},
		{"Еда", "utensils", "#22c55e", false, 0, 0},
		{"Машина", "car", "#3b82f6", false, 0, 0},
		{"Бензин", "fuel", "#14b8a6", false, 0, 0},
	}

	for _, s := range seeds {
		id := generateID()
		var limit interface{}
		if s.budgetLimit > 0 {
			limit = s.budgetLimit
		}
		var payDay interface{}
		if s.paymentDay > 0 {
			payDay = s.paymentDay
		}
		_, err := db.Exec(
			`INSERT INTO categories (id, title, icon, color, is_mandatory, budget_limit, payment_day)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			id, s.title, s.icon, s.color, boolToInt(s.isMandatory), limit, payDay,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
