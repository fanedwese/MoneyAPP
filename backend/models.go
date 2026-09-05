package main

type Category struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Icon         string   `json:"icon"`
	Color        string   `json:"color"`
	IsMandatory  bool     `json:"is_mandatory"`
	BudgetLimit  *float64 `json:"budget_limit"`
	PaymentDay   *int     `json:"payment_day"`
}

type Transaction struct {
	ID            string   `json:"id"`
	CategoryID    *string  `json:"category_id"`
	Amount        float64  `json:"amount"`
	Type          string   `json:"type"`
	Date          string   `json:"date"`
	Comment       *string  `json:"comment"`
	PaymentMethod string   `json:"payment_method"`
	CreditCardID  *string  `json:"credit_card_id"`
	Source        *string  `json:"source"`
	GoalID        *string  `json:"goal_id"`
	CreatedAt     string   `json:"created_at"`
}

type CreditCard struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Limit        float64 `json:"limit"`
	Balance      float64 `json:"balance"`
	GraceDays    int     `json:"grace_days"`
	StatementDay int     `json:"statement_day"`
}

type FinancialGoal struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	TargetAmount  float64  `json:"target_amount"`
	CurrentAmount float64  `json:"current_amount"`
	Deadline      *string  `json:"deadline"`
	Color         string   `json:"color"`
}

type DistributeRequest struct {
	GoalID string  `json:"goal_id"`
	Amount float64 `json:"amount"`
}
