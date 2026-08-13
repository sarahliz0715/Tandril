-- ad_campaigns / ad_creatives / ad_templates: Meta Ads campaign management (Ads tab, Track A Phase 1)
-- Previously the Ads.jsx page ran entirely on lib/mockData.js's MockEntity with no real tables.
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'meta_ads',
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | paused | archived | failed
  objective TEXT, -- LINK_CLICKS | CONVERSIONS | REACH
  ad_account_id TEXT,
  platform_campaign_id TEXT, -- Meta campaign id, set once launched
  platform_adset_id TEXT,
  platform_ad_id TEXT,
  budget JSONB NOT NULL DEFAULT '{}', -- { daily_amount }
  targeting JSONB NOT NULL DEFAULT '{}', -- { locations: { countries }, age_min, age_max, interests }
  creative JSONB NOT NULL DEFAULT '{}', -- { headline, primary_text, media_urls }
  linked_product_id TEXT,
  performance_metrics JSONB NOT NULL DEFAULT '{}', -- { spend, impressions, clicks, reach, conversions, roas }
  last_synced_at TIMESTAMPTZ,
  launched_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'image', -- image | video | carousel
  platform TEXT NOT NULL DEFAULT 'facebook',
  inventory_item_id TEXT,
  content JSONB NOT NULL DEFAULT '{}', -- { headline, primary_text, media_urls }
  platform_creative_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System-provided starting points shown in the Templates tab; not user-authored today.
CREATE TABLE IF NOT EXISTS ad_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  template JSONB NOT NULL DEFAULT '{}', -- prefilled objective/targeting/creative
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ad campaigns"
  ON ad_campaigns FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own ad creatives"
  ON ad_creatives FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view ad templates"
  ON ad_templates FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX ad_campaigns_user_idx ON ad_campaigns (user_id, created_at DESC);
CREATE INDEX ad_creatives_user_idx ON ad_creatives (user_id, created_at DESC);
CREATE INDEX ad_creatives_campaign_idx ON ad_creatives (campaign_id);

CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ad_creatives_updated_at BEFORE UPDATE ON ad_creatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ad_templates_updated_at BEFORE UPDATE ON ad_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
