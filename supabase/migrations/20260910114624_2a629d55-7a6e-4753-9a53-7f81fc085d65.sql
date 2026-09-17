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
    lowest := a[2];
    FOR i IN 3..6 LOOP
      IF a[i] < lowest THEN
        lowest := a[i];
      END IF;
    END LOOP;

    FOREACH chosen IN ARRAY priority LOOP
      FOR i IN 2..6 LOOP
        IF a[i] = lowest AND dims[i - 1] = chosen THEN
          NEW.limiting_dimension := chosen;
          EXIT;
        END IF;
      END LOOP;
      EXIT WHEN NEW.limiting_dimension IS NOT NULL;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;