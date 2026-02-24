-- Truly Optimized RLS Policies for Splinter Compliance
-- Uses variables to avoid auth.jwt() re-evaluation completely

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

DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

DROP POLICY IF EXISTS "data_uploads_select_policy" ON data_uploads;
DROP POLICY IF EXISTS "data_uploads_insert_policy" ON data_uploads;
DROP POLICY IF EXISTS "data_uploads_update_policy" ON data_uploads;
DROP POLICY IF EXISTS "data_uploads_delete_policy" ON data_uploads;

DROP POLICY IF EXISTS "tags_select_policy" ON tags;
DROP POLICY IF EXISTS "tags_insert_policy" ON tags;
DROP POLICY IF EXISTS "tags_update_policy" ON tags;
DROP POLICY IF EXISTS "tags_delete_policy" ON tags;

DROP POLICY IF EXISTS "custom_field_definitions_select_policy" ON custom_field_definitions;
DROP POLICY IF EXISTS "custom_field_definitions_insert_policy" ON custom_field_definitions;
DROP POLICY IF EXISTS "custom_field_definitions_update_policy" ON custom_field_definitions;
DROP POLICY IF EXISTS "custom_field_definitions_delete_policy" ON custom_field_definitions;

DROP POLICY IF EXISTS "patient_tags_select_policy" ON patient_tags;
DROP POLICY IF EXISTS "patient_tags_insert_policy" ON patient_tags;
DROP POLICY IF EXISTS "patient_tags_update_policy" ON patient_tags;
DROP POLICY IF EXISTS "patient_tags_delete_policy" ON patient_tags;

DROP POLICY IF EXISTS "user_sessions_select_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_policy" ON user_sessions;

DROP POLICY IF EXISTS "user_2fa_select_policy" ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_insert_policy" ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_update_policy" ON user_2fa;
DROP POLICY IF EXISTS "user_2fa_delete_policy" ON user_2fa;

DROP POLICY IF EXISTS "redcap_configs_select_policy" ON redcap_configs;
DROP POLICY IF EXISTS "redcap_configs_insert_policy" ON redcap_configs;
DROP POLICY IF EXISTS "redcap_configs_update_policy" ON redcap_configs;
DROP POLICY IF EXISTS "redcap_configs_delete_policy" ON redcap_configs;

-- Optimized Patients RLS Policies - Using variables to avoid auth.jwt() re-evaluation
CREATE POLICY "patients_select_policy" ON patients
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "patients_insert_policy" ON patients
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "patients_update_policy" ON patients
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "patients_delete_policy" ON patients
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

-- Optimized Procedures RLS Policies
CREATE POLICY "procedures_select_policy" ON procedures
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "procedures_insert_policy" ON procedures
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "procedures_update_policy" ON procedures
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "procedures_delete_policy" ON procedures
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

-- Optimized Lab Results RLS Policies
CREATE POLICY "lab_results_select_policy" ON lab_results
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "lab_results_insert_policy" ON lab_results
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "lab_results_update_policy" ON lab_results
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "lab_results_delete_policy" ON lab_results
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

-- Optimized Follow Ups RLS Policies
CREATE POLICY "follow_ups_select_policy" ON follow_ups
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "follow_ups_insert_policy" ON follow_ups
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "follow_ups_update_policy" ON follow_ups
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "follow_ups_delete_policy" ON follow_ups
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

-- Optimized Users RLS Policies
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin' OR
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = id::text
    );

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin' OR
        (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = id::text AND current_setting('request.jwt.claims', true)::jsonb ->> 'role' != 'admin')
    );

CREATE POLICY "users_delete_policy" ON users
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

-- Optimized Data Uploads RLS Policies
CREATE POLICY "data_uploads_select_policy" ON data_uploads
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "data_uploads_insert_policy" ON data_uploads
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "data_uploads_update_policy" ON data_uploads
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "data_uploads_delete_policy" ON data_uploads
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

-- Optimized Tags RLS Policies
CREATE POLICY "tags_select_policy" ON tags
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "tags_insert_policy" ON tags
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "tags_update_policy" ON tags
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "tags_delete_policy" ON tags
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

-- Optimized Custom Field Definitions RLS Policies
CREATE POLICY "custom_field_definitions_select_policy" ON custom_field_definitions
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "custom_field_definitions_insert_policy" ON custom_field_definitions
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

CREATE POLICY "custom_field_definitions_update_policy" ON custom_field_definitions
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

CREATE POLICY "custom_field_definitions_delete_policy" ON custom_field_definitions
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

-- Optimized Patient Tags RLS Policies
CREATE POLICY "patient_tags_select_policy" ON patient_tags
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician', 'researcher')
    );

CREATE POLICY "patient_tags_insert_policy" ON patient_tags
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "patient_tags_update_policy" ON patient_tags
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('admin', 'clinician')
    );

CREATE POLICY "patient_tags_delete_policy" ON patient_tags
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

-- Optimized User Sessions RLS Policies
CREATE POLICY "user_sessions_select_policy" ON user_sessions
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin' OR
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_sessions_insert_policy" ON user_sessions
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_sessions_update_policy" ON user_sessions
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin' OR
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_sessions_delete_policy" ON user_sessions
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin' OR
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = user_id::text
    );

-- Optimized User 2FA RLS Policies
CREATE POLICY "user_2fa_select_policy" ON user_2fa
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin' OR
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_2fa_insert_policy" ON user_2fa
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_2fa_update_policy" ON user_2fa
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin' OR
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = user_id::text
    );

CREATE POLICY "user_2fa_delete_policy" ON user_2fa
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin' OR
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_id' = user_id::text
    );

-- Optimized REDCap Configs RLS Policies
CREATE POLICY "redcap_configs_select_policy" ON redcap_configs
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

CREATE POLICY "redcap_configs_insert_policy" ON redcap_configs
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

CREATE POLICY "redcap_configs_update_policy" ON redcap_configs
    FOR UPDATE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );

CREATE POLICY "redcap_configs_delete_policy" ON redcap_configs
    FOR DELETE USING (
        current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin'
    );
