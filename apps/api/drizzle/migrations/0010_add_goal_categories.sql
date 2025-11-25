-- Add category column to goals table
ALTER TABLE goals ADD COLUMN category TEXT CHECK(category IN ('emergency', 'vacation', 'home', 'education', 'vehicle', 'investment', 'wedding', 'retirement', 'other'));

-- Create index for goal categories
CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category);
