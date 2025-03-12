# Supabase Schema Setup

This directory contains the SQL schema for the RAG system database.

## How to Use

### Option 1: Using Supabase CLI (Recommended)

If you're using the Supabase CLI for local development or deployment:

1. The migrations in the `migrations` folder will be automatically applied when you run:
   ```bash
   supabase db push
   ```

2. Or when you deploy to Supabase:
   ```bash
   supabase db push --db-url=<your-supabase-db-url>
   ```

### Option 2: Manual SQL Execution

If you want to manually set up the schema in Supabase:

1. Copy the contents of `schema.sql` in this directory
2. Go to the Supabase dashboard for your project
3. Navigate to the SQL Editor
4. Paste the SQL and run it

## Schema Overview

The schema includes:

- `DOCUMENTS` table for storing uploaded documents
- `CHUNKS` table for storing document chunks with embeddings
- `CONVERSATIONS` table for storing chat conversations
- `MESSAGES` table for storing individual messages in conversations
- `SETTINGS` table for application configuration
- `USER_PROFILES` table for user information
- Row-Level Security (RLS) policies for all tables
- Storage bucket configuration for document files
- Vector similarity search function (`MATCH_CHUNKS`)

## Requirements

- Supabase project with pgvector extension enabled
- Auth setup for user authentication 