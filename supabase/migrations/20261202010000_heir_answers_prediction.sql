-- Heir: each answer can carry the chance of recall the model gave just before it, and which model gave it, so we can
-- check the model is right (calibration) and compare models later. Both optional. Safe to run more than once.
alter table public.heir_answers add column if not exists p_recall real check (p_recall is null or (p_recall >= 0 and p_recall <= 1));
alter table public.heir_answers add column if not exists model_version text check (model_version is null or length(model_version) <= 40);
