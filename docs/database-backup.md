# PostgreSQL Database Backup & Recovery Guide

## Overview
This document outlines the operational procedures for creating, storing, and restoring backups for the **AEGIS Military Asset Management System (AEGIS MAMS)** PostgreSQL database (`aegis_mams`).

---

## 1. Environment & Prerequisites

Ensure the PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) are installed and accessible in the system path.

Set your production database connection string or credentials as environment variables before executing backup commands:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/aegis_mams"
```

---

## 2. Performing Database Backups

### Custom Compressed Format Backup (Recommended)
This format creates a compact binary archive supporting selective object restoration and parallel processing.

```bash
pg_dump -U postgres -d aegis_mams -F c -b -v -f aegis_mams_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Plaintext SQL Format Backup
Generates a standard human-readable SQL script:

```bash
pg_dump -U postgres -d aegis_mams -F p -f aegis_mams_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 3. Database Restoration

> [!WARNING]
> Database restoration must only be executed during scheduled maintenance windows. Restoration overwrites target tables and data.

### Restoring from Custom Compressed Archive (`.dump`)
```bash
pg_restore -U postgres -d aegis_mams -v --clean --if-exists aegis_mams_backup.dump
```

### Restoring from Plaintext SQL Script (`.sql`)
```bash
psql -U postgres -d aegis_mams -f aegis_mams_backup.sql
```

---

## 4. Automated Backup Recommendation (Cron)

In production environments, configure a daily background cron job to perform compressed database dumps:

```cron
0 2 * * * pg_dump -U postgres -d aegis_mams -F c -f /var/backups/aegis_mams_$(date +\%Y\%m\%d).dump
```

---

## 5. Security & Retention Notes
- **Encryption**: Encrypt backup archives at rest using AES-256 (`gpg` or cloud storage client encryption).
- **Credentials**: Never embed database passwords inside shell scripts or version control. Use `.pgpass` or environment variables.
- **Retention**: Retain daily backups for 30 days and monthly backups for 12 months.
