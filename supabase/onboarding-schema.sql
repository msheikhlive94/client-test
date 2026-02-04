-- Lead status enum
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');

-- Budget range enum
CREATE TYPE budget_range AS ENUM ('under_5k', '5k_10k', '10k_25k', '25k_50k', '50k_plus', 'not_sure');

-- Timeline enum  
CREATE TYPE project_timeline AS ENUM ('asap', '1_month', '2_3_months', '3_6_months', 'flexible');

-- Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Basic info
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    
    -- Project info
    project_description TEXT,
    project_type project_type DEFAULT 'other',
    budget_range budget_range,
    timeline project_timeline,
    
    -- Source tracking
    source TEXT,
    referral TEXT,
    
    -- Internal
    status lead_status DEFAULT 'new',
    notes TEXT,
    converted_client_id UUID REFERENCES clients(id),
    converted_project_id UUID REFERENCES projects(id),
    
    -- Token for public form access
    intake_token TEXT UNIQUE,
    token_used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intake form links table (for generating unique intake URLs)
CREATE TABLE intake_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT UNIQUE NOT NULL,
    label TEXT,
    expires_at TIMESTAMPTZ,
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_intake_token ON leads(intake_token);
CREATE INDEX idx_intake_links_token ON intake_links(token);

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for intake_links" ON intake_links FOR ALL USING (true) WITH CHECK (true);
