import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://eslddxxgogrbrffpwqev.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGRkeHhnb2dyYnJmZnB3cWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzA1NjcsImV4cCI6MjA5MjM0NjU2N30.BLDkVJmxUtMpBkPe5ZTflH1yqAEMBLNUn5v08Jr4rls'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
