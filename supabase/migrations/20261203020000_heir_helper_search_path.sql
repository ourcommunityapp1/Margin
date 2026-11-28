-- Pin the search path of two helper functions the security check flagged (they were not security definer, so this is hygiene).
alter function public.heir_username_ok(text) set search_path = public, extensions;
alter function public.heir_display(public.heir_profiles, boolean) set search_path = public, extensions;
