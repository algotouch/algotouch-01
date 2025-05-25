
-- Ensure contracts storage bucket exists and has proper permissions
DO $$
BEGIN
  -- First check if the bucket already exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'contracts'
  ) THEN
    -- Create the contracts bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'contracts',
      'contracts',
      false,
      10485760, -- 10MB
      ARRAY['text/html', 'application/pdf']::text[]
    );
  END IF;

  -- Make sure RLS is enabled for the bucket
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'contracts' AND public = true
  ) THEN
    -- Update bucket to be private (not public)
    UPDATE storage.buckets SET public = false WHERE id = 'contracts';
  END IF;
END $$;

-- Remove any existing policies for this bucket to start fresh
DROP POLICY IF EXISTS "Users can read their own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Admin can access all contracts" ON storage.objects;

-- Create a policy for users to read only their own documents
CREATE POLICY "Users can read their own contracts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'contracts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create a policy for users to upload only their own documents
CREATE POLICY "Users can upload their own contracts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create a policy for users to update only their own documents
CREATE POLICY "Users can update their own contracts"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'contracts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create a policy for admins to access all documents
CREATE POLICY "Admin can access all contracts"
  ON storage.objects
  USING (
    bucket_id = 'contracts' AND
    auth.role() = 'service_role'
  );
