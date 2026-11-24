-- Is the model right? Of the recalls it gave about a 90% chance, about 90% should come back right.
-- Run in the Supabase SQL editor. Buckets of 10 points; a well-calibrated model has `right` close to `predicted` in each.
select
  model_version,
  floor(p_recall * 10) / 10 as bucket,
  count(*) as answers,
  round(avg(p_recall)::numeric, 3) as predicted,
  round(avg(case when correct and hints = 0 then 1 else 0 end)::numeric, 3) as right
from public.heir_answers
where p_recall is not null and kind in ('type', 'say', 'letters')
group by 1, 2
order by 1, 2;
