-- Release details and equipment condition.
--
--   * A record keeps the format and year of the release chosen in the catalogue, so a
--     listing row can say "LP · 1978" without asking Discogs again.
--   * Equipment is not graded on the Goldmine scale; it has its own condition.

-- From best to worst. Each connector maps these to the marketplace's own conditions.
create type public.equipment_condition as enum ('new', 'like_new', 'good', 'fair', 'for_parts');

alter table public.items
  add column format text,
  add column release_year integer,
  add column equipment_condition public.equipment_condition,
  add constraint format_is_not_blank check (btrim(format) <> ''),
  -- Sound recording starts in the 1860s; the upper bound only catches typing mistakes.
  add constraint release_year_is_plausible check (release_year between 1860 and 2100),
  add constraint equipment_has_no_release_details check (
    type = 'record' or (format is null and release_year is null)
  ),
  add constraint record_has_no_equipment_condition check (
    type = 'equipment' or equipment_condition is null
  );

-- Items use column grants (status is server-only), so new columns must be granted by name.
grant insert (format, release_year, equipment_condition) on public.items to authenticated;
grant update (format, release_year, equipment_condition) on public.items to authenticated;
