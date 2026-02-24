# Supabase Row Level Security (RLS) Setup

This directory contains the RLS policies and setup scripts for securing your patient dashboard data in Supabase.

## Files

- `migrations/20240224000000_enable_rls.sql` - RLS policies for all tables
- `setup_rls.py` - Python script to apply RLS policies to your database

## Security Model

The RLS policies implement role-based access control:

### Roles
- **admin**: Full access to all data (create, read, update, delete)
- **clinician**: Can create, read, update patient data and related records
- **researcher**: Read-only access to patient data and related records

### Access Rules

#### Patient Data (patients, procedures, lab_results, follow_ups)
- **admin**: Full CRUD access
- **clinician**: Full CRUD access
- **researcher**: Read-only access
- **creator**: Users can access records they created

#### User Management
- **admin**: Full CRUD access to all users
- **self**: Users can only view/update their own profile
- **non-admin**: Cannot delete other users

#### Sensitive Data
- **user_sessions**: Users can only access their own sessions
- **user_2fa**: Users can only access their own 2FA settings
- **redcap_configs**: Admin-only access

## Quick Setup

1. **Configure Environment**
   ```bash
   # Make sure your DATABASE_URL points to Supabase
   export DATABASE_URL="postgresql+psycopg2://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require"
   ```

2. **Run Setup Script**
   ```bash
   cd supabase
   python setup_rls.py
   ```

3. **Verify RLS is Working**
   The script will automatically verify that RLS is enabled and policies are applied.

## Manual Application

If you prefer to apply the SQL manually:

```bash
# Connect to your Supabase database
psql "postgresql://postgres.<PROJECT_REF>:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres"

# Apply the migration
\i migrations/20240224000000_enable_rls.sql
```

## Testing RLS

To test that RLS is working properly:

1. **Create test users with different roles**
2. **Try accessing data with different JWT tokens**
3. **Verify that access is properly restricted**

Example test queries:
```sql
-- Test as admin (should see all data)
SET request.jwt.claims to '{"role": "admin", "user_id": "1"}';
SELECT COUNT(*) FROM patients;

-- Test as researcher (should see all data but not modify)
SET request.jwt.claims to '{"role": "researcher", "user_id": "2"}';
SELECT COUNT(*) FROM patients;
-- This should fail:
INSERT INTO patients (mrn, name) VALUES ('TEST-001', 'Test Patient');

-- Test as regular user (should only see their own data)
SET request.jwt.claims to '{"role": "clinician", "user_id": "3"}';
SELECT * FROM patients WHERE created_by = 3;
```

## Important Notes

### JWT Claims
Your application must include these claims in the JWT token:
- `role`: One of "admin", "clinician", "researcher"
- `user_id`: The numeric ID of the authenticated user

### Foreign Key Relationships
The policies assume your tables have `created_by`, `uploaded_by`, `imported_by` fields that reference the user who created the record.

### Performance Considerations
- RLS adds some overhead to queries
- Index the `created_by`, `uploaded_by`, `imported_by` columns for better performance
- Consider using function-based security for complex rules

## Troubleshooting

### Common Issues

1. **"permission denied" errors**
   - Check that RLS is enabled on the table
   - Verify JWT claims are correct
   - Ensure policies exist for the table

2. **Policies not being applied**
   - Make sure you're connected to the correct database
   - Check that the SQL executed without errors
   - Verify policies exist in `pg_policies`

3. **Performance issues**
   - Add indexes on filtered columns
   - Simplify complex policy conditions
   - Consider using security definer functions

### Verification Queries

```sql
-- Check RLS status on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Test a specific policy
EXPLAIN (COSTS OFF) SELECT * FROM patients WHERE created_by = 1;
```

## Maintenance

- Review policies regularly
- Update when adding new tables or columns
- Monitor performance impact
- Test after schema changes

## Security Best Practices

1. **Principle of Least Privilege**: Users only get access they absolutely need
2. **Regular Audits**: Review who has access to what
3. **Monitor Access**: Log access attempts and violations
4. **Keep Policies Simple**: Complex policies are hard to maintain and debug
5. **Test Thoroughly**: Verify policies work as expected in all scenarios
