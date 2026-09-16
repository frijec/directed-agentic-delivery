GRANT INSERT ON public.contact_submissions TO anon;
GRANT INSERT ON public.contact_submissions TO authenticated;

DROP POLICY IF EXISTS "Anyone can submit the contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit the contact form"
  ON public.contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 100
    AND char_length(email) BETWEEN 3 AND 255
    AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    AND coalesce(char_length(phone), 0) <= 40
    AND coalesce(char_length(message), 0) <= 2000
    AND coalesce(char_length(company), 0) <= 120
    AND coalesce(char_length(role), 0) <= 120
  );