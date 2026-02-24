-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redcap_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "patients_select_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_update_policy" ON patients;
DROP POLICY IF EXISTS "patients_delete_policy" ON patients;

DROP POLICY IF EXISTS "procedures_select_policy" ON procedures;
DROP POLICY IF EXISTS "procedures_insert_policy" ON procedures;
DROP POLICY IF EXISTS "procedures_update_policy" ON procedures;
DROP POLICY IF EXISTS "procedures_delete_policy" ON procedures;

DROP POLICY IF EXISTS "lab_results_select_policy" ON lab_results;
DROP POLICY IF EXISTS "lab_results_insert_policy" ON lab_results;
DROP POLICY IF EXISTS "lab_results_update_policy" ON lab_results;
DROP POLICY IF EXISTS "lab_results_delete_policy" ON lab_results;

DROP POLICY IF EXISTS "follow_ups_select_policy" ON follow_ups;
DROP POLICY IF EXISTS "follow_ups_insert_policy" ON follow_ups;
DROP POLICY IF EXISTS "follow_ups_update_policy" ON follow_ups;
DROP POLICY IF EXISTS "follow_ups_delete_policy" ON follow_ups;

-- Users table policies - more restrictive
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- Patients RLS Policies - Role-based access only
CREATE POLICY "patients_select_policy" ON patients
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "patients_insert_policy" ON patients
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "patients_update_policy" ON patients
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "patients_delete_policy" ON patients
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Procedures RLS Policies - Role-based access only
CREATE POLICY "procedures_select_policy" ON procedures
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "procedures_insert_policy" ON procedures
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "procedures_update_policy" ON procedures
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "procedures_delete_policy" ON procedures
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Lab Results RLS Policies - Role-based access only
CREATE POLICY "lab_results_select_policy" ON lab_results
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "lab_results_insert_policy" ON lab_results
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "lab_results_update_policy" ON lab_results
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "lab_results_delete_policy" ON lab_results
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Follow Ups RLS Policies - Role-based access only
CREATE POLICY "follow_ups_select_policy" ON follow_ups
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "follow_ups_insert_policy" ON follow_ups
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "follow_ups_update_policy" ON follow_ups
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "follow_ups_delete_policy" ON follow_ups
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Users RLS Policies - very restrictive
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_id' = id::text
    );

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        (auth.jwt() ->> 'user_id' = id::text AND auth.jwt() ->> 'role' != 'admin')
    );

CREATE POLICY "users_delete_policy" ON users
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Data Uploads RLS Policies - Role-based access only
CREATE POLICY "data_uploads_select_policy" ON data_uploads
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "data_uploads_insert_policy" ON data_uploads
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "data_uploads_update_policy" ON data_uploads
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "data_uploads_delete_policy" ON data_uploads
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Tags RLS Policies
CREATE POLICY "tags_select_policy" ON tags
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "tags_insert_policy" ON tags
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "tags_update_policy" ON tags
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "tags_delete_policy" ON tags
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Custom Field Definitions RLS Policies
CREATE POLICY "custom_field_definitions_select_policy" ON custom_field_definitions
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "custom_field_definitions_insert_policy" ON custom_field_definitions
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "custom_field_definitions_update_policy" ON custom_field_definitions
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "custom_field_definitions_delete_policy" ON custom_field_definitions
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- Patient Tags RLS Policies
CREATE POLICY "patient_tags_select_policy" ON patient_tags
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "patient_tags_insert_policy" ON patient_tags
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "patient_tags_update_policy" ON patient_tags
    FOR UPDATE USING (
        auth.jwt() ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "patient_tags_delete_policy" ON patient_tags
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

-- User Sessions RLS Policies - users can only see their own sessions
CREATE POLICY "user_sessions_select_policy" ON user_sessions
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_sessions_insert_policy" ON user_sessions
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_sessions_update_policy" ON user_sessions
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_sessions_delete_policy" ON user_sessions
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_id' = user_id::text
    );

-- User 2FA RLS Policies - users can only see their own 2FA
CREATE POLICY "user_2fa_select_policy" ON user_2fa
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_2fa_insert_policy" ON user_2fa
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_2fa_update_policy" ON user_2fa
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_2fa_delete_policy" ON user_2fa
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'user_id' = user_id::text
    );

-- REDCap Configs RLS Policies - admin only
CREATE POLICY "redcap_configs_select_policy" ON redcap_configs
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "redcap_configs_insert_policy" ON redcap_configs
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "redcap_configs_update_policy" ON redcap_configs
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "redcap_configs_delete_policy" ON redcap_configs
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin'
    );
