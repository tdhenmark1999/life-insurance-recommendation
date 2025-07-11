CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
    income INTEGER NOT NULL CHECK (income >= 0),
    dependents INTEGER NOT NULL CHECK (dependents >= 0),
    risk_tolerance VARCHAR(10) NOT NULL CHECK (risk_tolerance IN ('low', 'medium', 'high')),
    recommendation_type VARCHAR(50) NOT NULL,
    coverage_amount INTEGER NOT NULL CHECK (coverage_amount > 0),
    term_years INTEGER CHECK (term_years >= 0), 
    monthly_premium DECIMAL(10, 2) NOT NULL CHECK (monthly_premium > 0),
    income_multiplier DECIMAL(4, 2),
    dependents_factor DECIMAL(4, 2),
    risk_adjustment DECIMAL(4, 2),
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_age_income ON recommendations(age, income);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_risk ON recommendations(risk_tolerance);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_recommendations_updated_at ON recommendations;
CREATE TRIGGER update_recommendations_updated_at 
    BEFORE UPDATE ON recommendations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Then, create the users table (from auth-schema.sql)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    otp_secret VARCHAR(255),
    otp_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add user_id to recommendations table
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Password reset tokens table (optional)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session/token blacklist table (optional)
CREATE TABLE IF NOT EXISTS token_blacklist (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_token ON token_blacklist(token);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Create a view for summary statistics
CREATE OR REPLACE VIEW recommendation_summary AS
SELECT 
    COUNT(*) as total_count,
    AVG(age)::NUMERIC(10,1) as avg_age,
    AVG(income)::NUMERIC(10,0) as avg_income,
    AVG(coverage_amount)::NUMERIC(10,0) as avg_coverage,
    AVG(monthly_premium)::NUMERIC(10,2) as avg_premium,
    MIN(created_at) as first_recommendation,
    MAX(created_at) as last_recommendation
FROM recommendations;