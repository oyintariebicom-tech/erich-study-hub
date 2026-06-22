
CREATE POLICY "notes_bucket_authenticated_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notes');
CREATE POLICY "notes_bucket_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notes' AND public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "notes_bucket_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'notes' AND public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "notes_bucket_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notes' AND public.has_role(auth.uid(), 'super_admin'));
