"""
Database migration utilities
"""
from sqlalchemy import text
from .database import SessionLocal, DATABASE_URL


def migrate_database():
    """
    Migrate database schema - adds new columns if missing
    Drops orphaned tables from removed models (patient_notes, patient_documents, workflows, dashboard_configs)
    Also ensures audit_logs table exists for HIPAA compliance
    """
    try:
        db = SessionLocal()
        try:
            # This migration utility contains SQLite-specific SQL statements.
            # For PostgreSQL/Supabase, rely on SQLAlchemy model metadata creation.
            if "sqlite" not in DATABASE_URL:
                print("✓ Non-SQLite database detected. Skipping SQLite-specific migration steps.")
                return

            # Drop orphaned tables from removed models (no longer in codebase)
            tables_to_drop = ['patient_notes', 'patient_documents', 'workflows', 'dashboard_configs']
            for table_name in tables_to_drop:
                result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"), {"t": table_name})
                if result.fetchone():
                    db.execute(text(f"DROP TABLE {table_name}"))
                    db.commit()
                    print(f"✓ Migrated: Dropped orphaned table {table_name}")

            # Check if data_uploads table exists
            result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='data_uploads'"))
            if result.fetchone():
                # Table exists, check for new columns
                result = db.execute(text("PRAGMA table_info(data_uploads)"))
                existing_columns = [row[1] for row in result]
                
                new_columns = {
                    'processing_details': 'TEXT',
                    'total_rows': 'INTEGER DEFAULT 0',
                    'successful_rows': 'INTEGER DEFAULT 0',
                    'failed_rows': 'INTEGER DEFAULT 0',
                }
                
                for column_name, column_type in new_columns.items():
                    if column_name not in existing_columns:
                        db.execute(text(f"ALTER TABLE data_uploads ADD COLUMN {column_name} {column_type}"))
                        db.commit()
                        print(f"✓ Migrated: Added column {column_name} to data_uploads table")
            
            # Check and migrate custom_fields for all tables that need it
            tables_to_migrate = ['patients', 'procedures', 'lab_results', 'follow_ups']
            for table_name in tables_to_migrate:
                result = db.execute(text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'"))
                if result.fetchone():
                    result = db.execute(text(f"PRAGMA table_info({table_name})"))
                    existing_columns = [row[1] for row in result]
                    if 'custom_fields' not in existing_columns:
                        db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN custom_fields TEXT"))
                        db.commit()
                        print(f"✓ Migrated: Added column custom_fields to {table_name} table")
            
            # Note: audit_logs table is created automatically by SQLAlchemy when AuditLog model is imported
            # No manual migration needed - Base.metadata.create_all() handles it
        except Exception as e:
            # Migration failed, but continue - tables will be created on next restart
            print(f"Migration note: {e}")
        finally:
            db.close()
    except Exception:
        # If migration fails completely, continue anyway
        pass
