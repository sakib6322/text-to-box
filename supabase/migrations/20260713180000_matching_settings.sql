-- Seed matching settings in app_settings (editable from Settings → AI Prompts → Matching)
insert into public.app_settings (key, value, updated_at)
values
  (
    'matching_prompt',
    'You are matching semantic similarity between one extracted study point and candidate key-points.
Return percentage similarity between 0 and 100 for each candidate.
Higher means stronger conceptual match.',
    now()
  ),
  ('matching_vector_enabled', 'true', now()),
  ('matching_ai_enabled', 'false', now())
on conflict (key) do nothing;
