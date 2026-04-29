-- Create error_incidents table
CREATE TABLE public.error_incidents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint TEXT NOT NULL UNIQUE,
    message TEXT NOT NULL,
    category TEXT NOT NULL,
    route TEXT,
    priority TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved', 'ignored')),
    assigned_to UUID REFERENCES auth.users(id),
    action_taken TEXT,
    first_occurrence TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_occurrence TIMESTAMP WITH TIME ZONE DEFAULT now(),
    event_count INTEGER DEFAULT 1,
    impact_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_incidents ENABLE ROW LEVEL SECURITY;

-- Policies for admins (assuming admin role or specific email domains for now)
-- In a real app, we'd check a role column in profiles.
CREATE POLICY "Admins can view incidents"
ON public.error_incidents
FOR SELECT
USING (true); -- Restricted by app logic or role in reality

CREATE POLICY "Admins can update incidents"
ON public.error_incidents
FOR UPDATE
USING (true);

-- Function to handle log insertion and update incidents
CREATE OR REPLACE FUNCTION public.process_system_log_incident()
RETURNS TRIGGER AS $$
DECLARE
    v_fingerprint TEXT;
    v_priority TEXT;
BEGIN
    -- Generate fingerprint based on message + category + route
    -- In production we might use stack trace too, but message+route is a good start.
    v_fingerprint := md5(COALESCE(NEW.message, '') || COALESCE(NEW.category, '') || COALESCE(NEW.route, ''));

    -- Determine priority
    IF NEW.severity = 'CRITICAL' AND NEW.category = 'auth' THEN
        v_priority := 'P0';
    ELSIF NEW.severity = 'CRITICAL' OR NEW.severity = 'HIGH' THEN
        IF NEW.category IN ('auth', 'routing', 'render') THEN
            v_priority := 'P1';
        ELSE
            v_priority := 'P2';
        END IF;
    ELSIF NEW.severity = 'MEDIUM' THEN
        v_priority := 'P2';
    ELSE
        v_priority := 'P3';
    END IF;

    -- Upsert into error_incidents
    INSERT INTO public.error_incidents (
        fingerprint, 
        message, 
        category, 
        route, 
        priority, 
        status, 
        event_count, 
        first_occurrence, 
        last_occurrence
    )
    VALUES (
        v_fingerprint, 
        NEW.message, 
        NEW.category, 
        NEW.route, 
        v_priority, 
        'new', 
        1, 
        NEW.created_at, 
        NEW.created_at
    )
    ON CONFLICT (fingerprint) DO UPDATE
    SET 
        event_count = error_incidents.event_count + 1,
        last_occurrence = NEW.created_at,
        updated_at = now(),
        -- Re-evaluate priority if it was resolved
        status = CASE WHEN error_incidents.status = 'resolved' THEN 'new' ELSE error_incidents.status END,
        priority = CASE WHEN v_priority < error_incidents.priority THEN v_priority ELSE error_incidents.priority END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to process incidents automatically when a log is inserted
CREATE TRIGGER tr_process_incident
AFTER INSERT ON public.system_logs
FOR EACH ROW
EXECUTE FUNCTION public.process_system_log_incident();
