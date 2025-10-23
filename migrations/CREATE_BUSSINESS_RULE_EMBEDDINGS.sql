-- Rules with relationships
CREATE TABLE business_rules (
  id UUID PRIMARY KEY,
  module_name VARCHAR,
  rule_text TEXT,
  embedding VECTOR(384),
  dependencies RULE_ID[],
  edge_cases JSONB,        -- ["null input", "concurrent access"]
  test_scenarios JSONB,    -- Pre-computed test cases
  impact_modules RULE_ID[] -- Affected modules
);

-- Stories linking to rules
CREATE TABLE stories (
  id UUID,
  title TEXT,
  rules_affected RULE_ID[],
  blockers JSONB,
  impact_analysis JSONB,
  generated_tests JSONB
);