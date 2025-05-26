import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndhakvhrrkczgylcmyoc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGFrdmhycmtjemd5bGNteW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NTUxNzIsImV4cCI6MjA1ODQzMTE3Mn0.dJg3Pe8DNXuvy4PvcBwBo64K2Le-zptEuYZtr_49xIk'

// Database connection string
const dbConnectionString = 'postgresql://postgres:algotouch@2023@db.ndhakvhrrkczgylcmyoc.supabase.co:5432/postgres'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  }
}) 