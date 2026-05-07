-- Restore player_stats
CREATE TABLE IF NOT EXISTS public.player_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_meal_date TIMESTAMP WITH TIME ZONE,
    total_xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    meals_logged INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own stats" ON public.player_stats FOR SELECT USING (auth.uid() = user_id);

-- Restore engagement_signals
CREATE TABLE IF NOT EXISTS public.engagement_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    severity TEXT,
    signal_data JSONB DEFAULT '{}'::jsonb,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    tenant_id UUID REFERENCES public.tenants(id)
);
ALTER TABLE public.engagement_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professionals can view engagement signals" ON public.engagement_signals FOR SELECT USING (true); -- Simplified for now

-- Restore timeline_reactions
CREATE TABLE IF NOT EXISTS public.timeline_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID,
    reaction_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.timeline_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own reactions" ON public.timeline_reactions FOR ALL USING (auth.uid() = user_id);

-- Restore user_achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Restore user_challenges
CREATE TABLE IF NOT EXISTS public.user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID,
    status TEXT DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own challenges" ON public.user_challenges FOR SELECT USING (auth.uid() = user_id);

-- Restore feature_marketing_assets
CREATE TABLE IF NOT EXISTS public.feature_marketing_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT,
    asset_url TEXT,
    asset_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.feature_marketing_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view marketing assets" ON public.feature_marketing_assets FOR SELECT USING (true);
