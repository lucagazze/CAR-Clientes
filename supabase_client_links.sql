
-- Create client_links table (Fixed Syntax)
CREATE TABLE IF NOT EXISTS client_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT 'external', -- 'chat', 'mail', 'external'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE client_links ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own links') THEN
        CREATE POLICY "Users can view their own links" 
        ON client_links FOR SELECT 
        USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all links') THEN
        CREATE POLICY "Admins can manage all links" 
        ON client_links FOR ALL 
        USING (EXISTS (SELECT 1 FROM AgencySettings WHERE key = 'is_admin' AND value = 'true'));
    END IF;
END $$;
