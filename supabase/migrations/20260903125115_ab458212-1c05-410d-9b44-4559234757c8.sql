ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS phone text;
GRANT ALL ON public.contact_submissions TO service_role;