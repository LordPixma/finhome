-- ============================================
-- Credit Risk Assessment System Tables
-- ============================================

-- Credit Risk Scores Table - Internal credit scoring (0-999 scale like Experian)
CREATE TABLE IF NOT EXISTS credit_risk_scores (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    overall_score INTEGER NOT NULL,
    score_band TEXT NOT NULL CHECK(score_band IN ('excellent', 'good', 'fair', 'poor', 'very_poor')),
    payment_history_score INTEGER NOT NULL,
    credit_utilization_score INTEGER NOT NULL,
    credit_age_score INTEGER NOT NULL,
    credit_mix_score INTEGER NOT NULL,
    recent_inquiries_score INTEGER NOT NULL,
    total_credit_limit REAL,
    total_credit_used REAL,
    utilization_percentage REAL,
    oldest_account_age INTEGER,
    average_account_age INTEGER,
    number_of_accounts INTEGER,
    missed_payments INTEGER DEFAULT 0,
    score_breakdown TEXT,
    risk_factors TEXT,
    positive_factors TEXT,
    improvement_tips TEXT,
    calculated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_risk_scores_tenant ON credit_risk_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_risk_scores_tenant_date ON credit_risk_scores(tenant_id, calculated_at);
CREATE INDEX IF NOT EXISTS idx_credit_risk_scores_band ON credit_risk_scores(score_band);
CREATE INDEX IF NOT EXISTS idx_credit_risk_scores_overall ON credit_risk_scores(overall_score);

-- Credit Risk History Table - Track score changes over time
CREATE TABLE IF NOT EXISTS credit_risk_history (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    score_id TEXT NOT NULL REFERENCES credit_risk_scores(id),
    previous_score INTEGER,
    new_score INTEGER NOT NULL,
    score_delta INTEGER NOT NULL,
    change_reason TEXT,
    period TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_risk_history_tenant ON credit_risk_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_risk_history_tenant_period ON credit_risk_history(tenant_id, period);
CREATE INDEX IF NOT EXISTS idx_credit_risk_history_score ON credit_risk_history(score_id);

-- Credit Bureau Connections Table - For future Experian/Equifax/TransUnion integration
CREATE TABLE IF NOT EXISTS credit_bureau_connections (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    bureau TEXT NOT NULL CHECK(bureau IN ('experian', 'equifax', 'transunion')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'disconnected', 'expired', 'error')),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at INTEGER,
    bureau_user_id TEXT,
    last_sync_at INTEGER,
    last_sync_status TEXT,
    last_error TEXT,
    consent_given_at INTEGER,
    consent_expires_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_bureau_connections_tenant ON credit_bureau_connections(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_credit_bureau_connections_tenant_bureau ON credit_bureau_connections(tenant_id, bureau);
CREATE INDEX IF NOT EXISTS idx_credit_bureau_connections_status ON credit_bureau_connections(status);

-- Credit Reports Table - Store fetched credit reports from bureaus
CREATE TABLE IF NOT EXISTS credit_reports (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    connection_id TEXT REFERENCES credit_bureau_connections(id),
    bureau TEXT NOT NULL CHECK(bureau IN ('experian', 'equifax', 'transunion', 'internal')),
    credit_score INTEGER,
    score_band TEXT,
    score_date INTEGER,
    report_data TEXT,
    total_accounts INTEGER,
    open_accounts INTEGER,
    closed_accounts INTEGER,
    delinquent_accounts INTEGER,
    total_balances REAL,
    total_credit_limit REAL,
    hard_inquiries INTEGER,
    soft_inquiries INTEGER,
    bankruptcies INTEGER DEFAULT 0,
    judgments INTEGER DEFAULT 0,
    liens INTEGER DEFAULT 0,
    report_date INTEGER NOT NULL,
    expires_at INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_reports_tenant ON credit_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_tenant_bureau ON credit_reports(tenant_id, bureau);
CREATE INDEX IF NOT EXISTS idx_credit_reports_connection ON credit_reports(connection_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_date ON credit_reports(report_date);

-- Loan Affordability Assessments Table - AI-driven loan eligibility analysis
CREATE TABLE IF NOT EXISTS loan_affordability_assessments (
    id TEXT PRIMARY KEY NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    loan_type TEXT NOT NULL CHECK(loan_type IN ('mortgage', 'personal', 'auto', 'credit_card', 'student', 'business', 'other')),
    requested_amount REAL NOT NULL,
    requested_term INTEGER,
    estimated_interest_rate REAL,
    max_affordable_amount REAL,
    recommended_amount REAL,
    monthly_payment_estimate REAL,
    total_interest_estimate REAL,
    affordability_score INTEGER NOT NULL,
    affordability_band TEXT NOT NULL CHECK(affordability_band IN ('very_affordable', 'affordable', 'stretching', 'risky', 'unaffordable')),
    monthly_income REAL,
    monthly_expenses REAL,
    existing_debt_payments REAL,
    disposable_income REAL,
    debt_to_income_ratio REAL,
    debt_to_income_after_loan REAL,
    stress_test_results TEXT,
    risk_factors TEXT,
    recommendations TEXT,
    ai_summary TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'completed', 'expired')),
    calculated_at INTEGER NOT NULL,
    expires_at INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loan_affordability_tenant ON loan_affordability_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loan_affordability_tenant_type ON loan_affordability_assessments(tenant_id, loan_type);
CREATE INDEX IF NOT EXISTS idx_loan_affordability_status ON loan_affordability_assessments(status);
CREATE INDEX IF NOT EXISTS idx_loan_affordability_date ON loan_affordability_assessments(calculated_at);
