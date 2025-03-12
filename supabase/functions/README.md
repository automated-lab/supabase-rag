# Supabase Edge Functions

This directory contains Supabase Edge Functions for the RAG system.

## Local Development

To run the edge functions locally:

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Start the local Supabase stack:
   ```bash
   supabase start
   ```

3. Run a specific function locally:
   ```bash
   supabase functions serve documents
   ```

## Deployment

To deploy the edge functions to your Supabase project:

1. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. Deploy all functions:
   ```bash
   supabase functions deploy
   ```

   Or deploy a specific function:
   ```bash
   supabase functions deploy documents
   ```

## Available Functions

### Documents API

- `GET /functions/v1/documents` - List all documents
- `GET /functions/v1/documents/:id` - Get a specific document by ID
- `GET /functions/v1/documents/download/:id` - Download a document file

## Notes on TypeScript Errors

The TypeScript errors in the edge function files are expected and can be ignored. These errors occur because:

1. Deno uses URL imports which TypeScript in VS Code doesn't recognize by default
2. The Deno namespace is not available in the TypeScript environment

These errors won't affect the functionality of the edge functions when deployed to Supabase. 