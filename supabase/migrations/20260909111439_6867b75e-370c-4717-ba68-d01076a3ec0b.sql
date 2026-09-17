CREATE OR REPLACE FUNCTION public.get_contact_submissions(p_password text)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  name text,
  email text,
  phone text,
  company text,
  role text,
  message text,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_password IS DISTINCT FROM 'Consid2026' THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY
  SELECT cs.id, cs.created_at, cs.name, cs.email, cs.phone, cs.company, cs.role, cs.message, cs.source
  FROM public.contact_submissions cs
  ORDER BY cs.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_contact_submissions(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contact_submissions(text) TO anon, authenticated;