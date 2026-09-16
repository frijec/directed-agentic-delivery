-- Admin read access for niveau-tjek leads, same shape and password as the existing
-- get_contact_submissions() function so /admin can show both under one login.

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
