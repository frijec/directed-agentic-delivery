CREATE TABLE public.niveau_tjek_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company TEXT,
  role TEXT,
  org_size TEXT,
  current_ai_usage TEXT,
  biggest_challenge TEXT,
  conversation_value TEXT,
  email TEXT NOT NULL,
  answers SMALLINT[] NOT NULL,
  andel_niveau SMALLINT NOT NULL DEFAULT 0,
  struktur_niveau SMALLINT NOT NULL DEFAULT 0,
  samlet_niveau SMALLINT NOT NULL DEFAULT 0,
  average NUMERIC(3,2) NOT NULL DEFAULT 0,
  limiting_dimension TEXT,
  user_agent TEXT,
  ip_hash TEXT
);

GRANT ALL ON public.niveau_tjek_leads TO service_role;
GRANT INSERT ON public.niveau_tjek_leads TO anon, authenticated;

ALTER TABLE public.niveau_tjek_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a niveau-tjek lead"
ON public.niveau_tjek_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(email) BETWEEN 3 AND 255
  AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  AND array_length(answers, 1) = 6
  AND coalesce(char_length(company), 0) <= 150
  AND coalesce(char_length(role), 0) <= 120
  AND coalesce(char_length(org_size), 0) <= 20
  AND coalesce(char_length(current_ai_usage), 0) <= 2000
  AND coalesce(char_length(biggest_challenge), 0) <= 2000
  AND coalesce(char_length(conversation_value), 0) <= 2000
);

CREATE OR REPLACE FUNCTION public.niveau_tjek_compute_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  a smallint[];
  i int;
  v smallint;
  struct_sum numeric := 0;
  total_sum numeric := 0;
  dims text[] := ARRAY['Specifikationsdisciplin','Arkitekturbeslutninger','Kvalitetsporte','Standardisering','Organisatorisk viden'];
  priority text[] := ARRAY['Arkitekturbeslutninger','Specifikationsdisciplin','Kvalitetsporte','Standardisering','Organisatorisk viden'];
  lowest smallint;
  chosen text;
BEGIN
  a := NEW.answers;
  IF a IS NULL OR array_length(a, 1) IS DISTINCT FROM 6 THEN
    RAISE EXCEPTION 'answers must contain exactly 6 values';
  END IF;

  FOR i IN 1..6 LOOP
    v := a[i];
    IF v IS NULL OR v < 0 OR v > 3 THEN
      RAISE EXCEPTION 'each answer must be between 0 and 3';
    END IF;
    total_sum := total_sum + v;
    IF i > 1 THEN
      struct_sum := struct_sum + v;
    END IF;
  END LOOP;

  NEW.andel_niveau := a[1];
  NEW.struktur_niveau := floor(struct_sum / 5)::smallint;
  NEW.samlet_niveau := least(NEW.andel_niveau, NEW.struktur_niveau);
  NEW.average := round(total_sum / 6.0, 2);

  NEW.limiting_dimension := NULL;
  IF NEW.struktur_niveau < NEW.andel_niveau THEN
    SELECT min(x) INTO lowest FROM unnest(a[2:6]) AS x;
    FOREACH chosen IN ARRAY priority LOOP
      IF EXISTS (
        SELECT 1
        FROM generate_subscripts(a[2:6], 1) AS s
        WHERE a[2:6][s] = lowest AND dims[s] = chosen
      ) THEN
        NEW.limiting_dimension := chosen;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS niveau_tjek_compute_scores_trg ON public.niveau_tjek_leads;
CREATE TRIGGER niveau_tjek_compute_scores_trg
BEFORE INSERT ON public.niveau_tjek_leads
FOR EACH ROW EXECUTE FUNCTION public.niveau_tjek_compute_scores();

CREATE OR REPLACE FUNCTION public.get_niveau_tjek_leads(p_password text)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  company text,
  role text,
  org_size text,
  current_ai_usage text,
  biggest_challenge text,
  conversation_value text,
  email text,
  answers smallint[],
  andel_niveau smallint,
  struktur_niveau smallint,
  samlet_niveau smallint,
  average numeric,
  limiting_dimension text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_password IS DISTINCT FROM 'Consid2026' THEN
    RAISE EXCEPTION 'Invalid password';
  END IF;

  RETURN QUERY
  SELECT
    n.id, n.created_at, n.company, n.role, n.org_size, n.current_ai_usage,
    n.biggest_challenge, n.conversation_value, n.email, n.answers,
    n.andel_niveau, n.struktur_niveau, n.samlet_niveau, n.average, n.limiting_dimension
  FROM public.niveau_tjek_leads n
  ORDER BY n.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_niveau_tjek_leads(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_niveau_tjek_leads(text) TO anon, authenticated;