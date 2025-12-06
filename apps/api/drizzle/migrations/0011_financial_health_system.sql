-- ============================================
-- Financial Health System Tables
-- ============================================

-- Financial Health Scores Table
CREATE TABLE IF NOT EXISTS financial_health_scores (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    overall_score INTEGER NOT NULL,
    savings_score INTEGER NOT NULL,
    debt_score INTEGER NOT NULL,
    emergency_fund_score INTEGER NOT NULL,
    budget_score INTEGER NOT NULL,
    cash_flow_score INTEGER NOT NULL,
    score_breakdown TEXT,
    monthly_income REAL,
    monthly_expenses REAL,
    total_savings REAL,
    total_debt REAL,
    emergency_fund_balance REAL,
    score_category TEXT NOT NULL CHECK(score_category IN ('excellent', 'good', 'fair', 'needs_improvement', 'critical')),
    insights TEXT,
    recommendations TEXT,
    calculated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_financial_health_scores_tenant ON financial_health_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_tenant_date ON financial_health_scores(tenant_id, calculated_at);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_category ON financial_health_scores(score_category);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_overall ON financial_health_scores(overall_score);

-- User Financial Profiles Table
CREATE TABLE IF NOT EXISTS user_financial_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id),
    monthly_income REAL,
    income_source TEXT CHECK(income_source IN ('employed', 'self_employed', 'retired', 'student', 'other')),
    employment_status TEXT CHECK(employment_status IN ('full_time', 'part_time', 'contract', 'freelance', 'unemployed', 'retired')),
    household_size INTEGER DEFAULT 1,
    dependents INTEGER DEFAULT 0,
    housing_status TEXT CHECK(housing_status IN ('own_outright', 'mortgage', 'rent', 'living_with_family', 'other')),
    monthly_rent_mortgage REAL,
    total_debt_balance REAL DEFAULT 0,
    monthly_debt_payments REAL DEFAULT 0,
    emergency_fund_target REAL,
    emergency_fund_account_id TEXT REFERENCES accounts(id),
    risk_tolerance TEXT DEFAULT 'moderate' CHECK(risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    financial_goals TEXT,
    retirement_age INTEGER,
    has_retirement_account INTEGER DEFAULT 0,
    has_life_insurance INTEGER DEFAULT 0,
    has_health_insurance INTEGER DEFAULT 0,
    has_income_protection INTEGER DEFAULT 0,
    profile_completeness INTEGER DEFAULT 0,
    last_updated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_financial_profiles_tenant ON user_financial_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_financial_profiles_completeness ON user_financial_profiles(profile_completeness);

-- Financial Health History Table
CREATE TABLE IF NOT EXISTS financial_health_history (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    score_id TEXT NOT NULL REFERENCES financial_health_scores(id),
    previous_score INTEGER,
    new_score INTEGER NOT NULL,
    score_delta INTEGER NOT NULL,
    change_reason TEXT,
    period TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_financial_health_history_tenant ON financial_health_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_health_history_tenant_period ON financial_health_history(tenant_id, period);
CREATE INDEX IF NOT EXISTS idx_financial_health_history_score ON financial_health_history(score_id);

-- Debt Accounts Table
CREATE TABLE IF NOT EXISTS debt_accounts (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('mortgage', 'car_loan', 'student_loan', 'credit_card', 'personal_loan', 'overdraft', 'other')),
    linked_account_id TEXT REFERENCES accounts(id),
    original_balance REAL NOT NULL,
    current_balance REAL NOT NULL,
    interest_rate REAL,
    minimum_payment REAL,
    monthly_payment REAL,
    start_date INTEGER,
    end_date INTEGER,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paid_off', 'defaulted', 'refinanced')),
    creditor_name TEXT,
    payoff_priority INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_debt_accounts_tenant ON debt_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_debt_accounts_tenant_type ON debt_accounts(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_debt_accounts_tenant_status ON debt_accounts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_debt_accounts_linked ON debt_accounts(linked_account_id);

-- AI Financial Insights Table
CREATE TABLE IF NOT EXISTS ai_financial_insights (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    insight_type TEXT NOT NULL CHECK(insight_type IN ('spending_pattern', 'savings_opportunity', 'debt_advice', 'budget_recommendation', 'anomaly_detection', 'goal_progress', 'general_advice')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    potential_impact REAL,
    action_items TEXT,
    related_category_id TEXT REFERENCES categories(id),
    related_account_id TEXT REFERENCES accounts(id),
    related_goal_id TEXT REFERENCES goals(id),
    is_read INTEGER DEFAULT 0,
    is_dismissed INTEGER DEFAULT 0,
    is_acted_upon INTEGER DEFAULT 0,
    valid_until INTEGER,
    generated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_financial_insights_tenant ON ai_financial_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_financial_insights_tenant_type ON ai_financial_insights(tenant_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_financial_insights_priority ON ai_financial_insights(tenant_id, priority);
CREATE INDEX IF NOT EXISTS idx_ai_financial_insights_read ON ai_financial_insights(is_read);
CREATE INDEX IF NOT EXISTS idx_ai_financial_insights_valid ON ai_financial_insights(valid_until);
