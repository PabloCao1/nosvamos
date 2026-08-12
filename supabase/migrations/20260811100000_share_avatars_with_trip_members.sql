drop policy if exists "avatars_select_own" on storage.objects;

create policy "avatars_select_trip_members" on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and public.shares_trip_with(((storage.foldername(name))[1])::uuid)
);
