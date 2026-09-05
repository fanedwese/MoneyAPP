package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

// ── Helpers ──────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeBody(r *http.Request, v interface{}) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// ── Categories ───────────────────────────────────────────

func handleGetCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, title, icon, color, is_mandatory, budget_limit, payment_day FROM categories ORDER BY title`)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	cats := []Category{}
	for rows.Next() {
		var c Category
		var mandatory int
		var limit, payDay sql.NullFloat64
		err := rows.Scan(&c.ID, &c.Title, &c.Icon, &c.Color, &mandatory, &limit, &payDay)
		if err != nil {
			writeError(w, 500, err.Error())
			return
		}
		c.IsMandatory = mandatory == 1
		if limit.Valid {
			v := limit.Float64
			c.BudgetLimit = &v
		}
		if payDay.Valid {
			pd := int(payDay.Float64)
			c.PaymentDay = &pd
		}
		cats = append(cats, c)
	}
	writeJSON(w, 200, cats)
}

func handleCreateCategory(w http.ResponseWriter, r *http.Request) {
	var c Category
	if err := decodeBody(r, &c); err != nil {
		writeError(w, 400, "invalid JSON")
		return
	}
	if c.Title == "" {
		writeError(w, 400, "title is required")
		return
	}
	if c.Icon == "" {
		c.Icon = "wallet"
	}
	if c.Color == "" {
		c.Color = "#22c55e"
	}
	c.ID = generateID()

	var limit, payDay interface{}
	if c.BudgetLimit != nil {
		limit = *c.BudgetLimit
	}
	if c.PaymentDay != nil {
		payDay = *c.PaymentDay
	}

	_, err := db.Exec(
		`INSERT INTO categories (id, title, icon, color, is_mandatory, budget_limit, payment_day)
		 VALUES (?,?,?,?,?,?,?)`,
		c.ID, c.Title, c.Icon, c.Color, boolToInt(c.IsMandatory), limit, payDay,
	)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, c)
}

func handleUpdateCategory(w http.ResponseWriter, r *http.Request, id string) {
	var c Category
	if err := decodeBody(r, &c); err != nil {
		writeError(w, 400, "invalid JSON")
		return
	}
	c.ID = id

	var limit, payDay interface{}
	if c.BudgetLimit != nil {
		limit = *c.BudgetLimit
	}
	if c.PaymentDay != nil {
		payDay = *c.PaymentDay
	}

	_, err := db.Exec(
		`UPDATE categories SET title=?, icon=?, color=?, is_mandatory=?, budget_limit=?, payment_day=? WHERE id=?`,
		c.Title, c.Icon, c.Color, boolToInt(c.IsMandatory), limit, payDay, id,
	)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, c)
}

func handleDeleteCategory(w http.ResponseWriter, r *http.Request, id string) {
	_, err := db.Exec(`DELETE FROM categories WHERE id=?`, id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

// ── Transactions ─────────────────────────────────────────

func handleGetTransactions(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, category_id, amount, type, date, comment, payment_method, credit_card_id, source, goal_id, created_at FROM transactions ORDER BY date DESC, created_at DESC`)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	txs := []Transaction{}
	for rows.Next() {
		var t Transaction
		var catID, comment, cardID, source, goalID sql.NullString
		err := rows.Scan(&t.ID, &catID, &t.Amount, &t.Type, &t.Date, &comment, &t.PaymentMethod, &cardID, &source, &goalID, &t.CreatedAt)
		if err != nil {
			writeError(w, 500, err.Error())
			return
		}
		if catID.Valid {
			s := catID.String
			t.CategoryID = &s
		}
		if comment.Valid {
			s := comment.String
			t.Comment = &s
		}
		if cardID.Valid {
			s := cardID.String
			t.CreditCardID = &s
		}
		if source.Valid {
			s := source.String
			t.Source = &s
		}
		if goalID.Valid {
			s := goalID.String
			t.GoalID = &s
		}
		txs = append(txs, t)
	}
	writeJSON(w, 200, txs)
}

func handleCreateTransaction(w http.ResponseWriter, r *http.Request) {
	var t Transaction
	if err := decodeBody(r, &t); err != nil {
		writeError(w, 400, "invalid JSON")
		return
	}
	if t.Amount <= 0 {
		writeError(w, 400, "amount must be positive")
		return
	}
	if t.Type != "income" && t.Type != "expense" {
		writeError(w, 400, "type must be income or expense")
		return
	}
	if t.Date == "" {
		writeError(w, 400, "date is required")
		return
	}
	if t.PaymentMethod == "" {
		t.PaymentMethod = "debit"
	}
	t.ID = generateID()

	_, err := db.Exec(
		`INSERT INTO transactions (id, category_id, amount, type, date, comment, payment_method, credit_card_id, source, goal_id, created_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
		t.ID, nullableString(t.CategoryID), t.Amount, t.Type, t.Date,
		nullableString(t.Comment), t.PaymentMethod, nullableString(t.CreditCardID),
		nullableString(t.Source), nullableString(t.GoalID),
	)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, t)
}

func handleUpdateTransaction(w http.ResponseWriter, r *http.Request, id string) {
	var t Transaction
	if err := decodeBody(r, &t); err != nil {
		writeError(w, 400, "invalid JSON")
		return
	}
	t.ID = id

	_, err := db.Exec(
		`UPDATE transactions SET category_id=?, amount=?, type=?, date=?, comment=?, payment_method=?, credit_card_id=?, source=?, goal_id=? WHERE id=?`,
		nullableString(t.CategoryID), t.Amount, t.Type, t.Date,
		nullableString(t.Comment), t.PaymentMethod, nullableString(t.CreditCardID),
		nullableString(t.Source), nullableString(t.GoalID), id,
	)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, t)
}

func handleDeleteTransaction(w http.ResponseWriter, r *http.Request, id string) {
	_, err := db.Exec(`DELETE FROM transactions WHERE id=?`, id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

// ── Credit Cards ─────────────────────────────────────────

func handleGetCards(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, name, "limit", balance, grace_days, statement_day FROM credit_cards ORDER BY name`)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	cards := []CreditCard{}
	for rows.Next() {
		var c CreditCard
		if err := rows.Scan(&c.ID, &c.Name, &c.Limit, &c.Balance, &c.GraceDays, &c.StatementDay); err != nil {
			writeError(w, 500, err.Error())
			return
		}
		cards = append(cards, c)
	}
	writeJSON(w, 200, cards)
}

func handleCreateCard(w http.ResponseWriter, r *http.Request) {
	var c CreditCard
	if err := decodeBody(r, &c); err != nil {
		writeError(w, 400, "invalid JSON")
		return
	}
	if c.Name == "" {
		writeError(w, 400, "name is required")
		return
	}
	c.ID = generateID()

	_, err := db.Exec(
		`INSERT INTO credit_cards (id, name, "limit", balance, grace_days, statement_day) VALUES (?,?,?,?,?,?)`,
		c.ID, c.Name, c.Limit, c.Balance, c.GraceDays, c.StatementDay,
	)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, c)
}

func handleUpdateCard(w http.ResponseWriter, r *http.Request, id string) {
	var c CreditCard
	if err := decodeBody(r, &c); err != nil {
		writeError(w, 400, "invalid JSON")
		return
	}
	c.ID = id

	_, err := db.Exec(
		`UPDATE credit_cards SET name=?, "limit"=?, balance=?, grace_days=?, statement_day=? WHERE id=?`,
		c.Name, c.Limit, c.Balance, c.GraceDays, c.StatementDay, id,
	)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, c)
}

func handleDeleteCard(w http.ResponseWriter, r *http.Request, id string) {
	_, err := db.Exec(`DELETE FROM credit_cards WHERE id=?`, id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

// ── Goals ────────────────────────────────────────────────

func handleGetGoals(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, title, target_amount, current_amount, deadline, color FROM financial_goals ORDER BY title`)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	defer rows.Close()

	goals := []FinancialGoal{}
	for rows.Next() {
		var g FinancialGoal
		var deadline sql.NullString
		if err := rows.Scan(&g.ID, &g.Title, &g.TargetAmount, &g.CurrentAmount, &deadline, &g.Color); err != nil {
			writeError(w, 500, err.Error())
			return
		}
		if deadline.Valid {
			s := deadline.String
			g.Deadline = &s
		}
		goals = append(goals, g)
	}
	writeJSON(w, 200, goals)
}

func handleCreateGoal(w http.ResponseWriter, r *http.Request) {
	var g FinancialGoal
	if err := decodeBody(r, &g); err != nil {
		writeError(w, 400, "invalid JSON")
		return
	}
	if g.Title == "" {
		writeError(w, 400, "title is required")
		return
	}
	if g.Color == "" {
		g.Color = "#8b5cf6"
	}
	g.ID = generateID()

	_, err := db.Exec(
		`INSERT INTO financial_goals (id, title, target_amount, current_amount, deadline, color) VALUES (?,?,?,?,?,?)`,
		g.ID, g.Title, g.TargetAmount, g.CurrentAmount, nullableString(g.Deadline), g.Color,
	)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, g)
}

func handleUpdateGoal(w http.ResponseWriter, r *http.Request, id string) {
	var g FinancialGoal
	if err := decodeBody(r, &g); err != nil {
		writeError(w, 400, "invalid JSON")
		return
	}
	g.ID = id

	_, err := db.Exec(
		`UPDATE financial_goals SET title=?, target_amount=?, current_amount=?, deadline=?, color=? WHERE id=?`,
		g.Title, g.TargetAmount, g.CurrentAmount, nullableString(g.Deadline), g.Color, id,
	)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, g)
}

func handleDeleteGoal(w http.ResponseWriter, r *http.Request, id string) {
	_, err := db.Exec(`DELETE FROM financial_goals WHERE id=?`, id)
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]string{"status": "deleted"})
}

// ── Distribute savings ───────────────────────────────────

func handleDistributeSavings(w http.ResponseWriter, r *http.Request) {
	var req DistributeRequest
	if err := decodeBody(r, &req); err != nil {
		writeError(w, 400, "invalid JSON")
		return
	}
	if req.Amount <= 0 || req.GoalID == "" {
		writeError(w, 400, "goal_id and positive amount required")
		return
	}

	var goal FinancialGoal
	err := db.QueryRow(`SELECT id, title, target_amount, current_amount, deadline, color FROM financial_goals WHERE id=?`, req.GoalID).
		Scan(&goal.ID, &goal.Title, &goal.TargetAmount, &goal.CurrentAmount, new(sql.NullString), &goal.Color)
	if err != nil {
		writeError(w, 404, "goal not found")
		return
	}

	tx, err := db.Begin()
	if err != nil {
		writeError(w, 500, err.Error())
		return
	}

	today := todayISO()
	txID := generateID()
	_, err = tx.Exec(
		`INSERT INTO transactions (id, category_id, amount, type, date, comment, payment_method, credit_card_id, source, goal_id, created_at)
		 VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
		txID, nil, req.Amount, "income", today, "В цель: "+goal.Title, "debit", nil, "Накопления", req.GoalID,
	)
	if err != nil {
		tx.Rollback()
		writeError(w, 500, err.Error())
		return
	}

	_, err = tx.Exec(`UPDATE financial_goals SET current_amount = current_amount + ? WHERE id = ?`, req.Amount, req.GoalID)
	if err != nil {
		tx.Rollback()
		writeError(w, 500, err.Error())
		return
	}

	if err = tx.Commit(); err != nil {
		writeError(w, 500, err.Error())
		return
	}

	goal.CurrentAmount += req.Amount
	writeJSON(w, 200, goal)
}

// ── Utils ────────────────────────────────────────────────

func nullableString(s *string) interface{} {
	if s == nil || *s == "" {
		return nil
	}
	return *s
}
