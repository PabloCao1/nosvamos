update public.reservations
set local_start_at = start_at at time zone 'America/Argentina/Buenos_Aires'
where type in ('flight', 'train', 'bus', 'ferry', 'car')
  and lower(coalesce(origin_city, city, '')) in (
    'buenos aires',
    'ciudad autónoma de buenos aires',
    'ciudad autonoma de buenos aires',
    'caba'
  );
