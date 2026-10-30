insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-images','business-images',true,5242880,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy business_images_read on storage.objects for select using(bucket_id='business-images');
create policy business_images_admin_insert on storage.objects for insert to authenticated with check(bucket_id='business-images' and public.is_admin());
create policy business_images_admin_update on storage.objects for update to authenticated using(bucket_id='business-images' and public.is_admin()) with check(bucket_id='business-images' and public.is_admin());
create policy business_images_admin_delete on storage.objects for delete to authenticated using(bucket_id='business-images' and public.is_admin());
