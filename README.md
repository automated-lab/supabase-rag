# RAG System

A powerful Retrieval-Augmented Generation (RAG) system built with Next.js, Supabase, and OpenAI. This application allows users to upload documents, process them into embeddings, and chat with their data using AI.

![RAG System Demo](public/rag-demo.png)

## Features

- 📄 Document upload and processing (PDF, DOCX, TXT, CSV, etc.)
- 🔍 Vector search with pgvector
- 💬 AI chat interface with citation support
- 🔐 User authentication and authorization
- 📱 Responsive design for all devices
- 🌙 Dark/light mode support

## Quick Start

For detailed deployment instructions, see the [Deployment Guide](docs/DEPLOYMENT.md).

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account
- OpenAI API key

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/rag-system.git
   cd rag-system
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase and OpenAI credentials.

4. Set up Supabase schema
   - Option 1: Using Supabase CLI
     ```bash
     # Install Supabase CLI if you haven't already
     npm install -g supabase
     
     # Login to Supabase
     supabase login
     
     # Link to your project
     supabase link --project-ref your-project-ref
     
     # Push the schema
     supabase db push
     ```
   
   - Option 2: Manual SQL execution
     - Copy the contents of `supabase/schema.sql`
     - Go to your Supabase dashboard > SQL Editor
     - Paste and execute the SQL

5. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

### Deploy to Vercel

1. Push your code to a GitHub repository

2. Create a new project on [Vercel](https://vercel.com)

3. Import your GitHub repository

4. Configure environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`

5. Deploy!

## Configuration

You can customize the RAG system behavior by modifying the settings in the Supabase `settings` table or by setting environment variables:

- `CHUNK_SIZE`: Size of document chunks (default: 1000)
- `CHUNK_OVERLAP`: Overlap between chunks (default: 200)
- `EMBEDDING_MODEL`: OpenAI embedding model (default: text-embedding-3-small)
- `OPENAI_MODEL`: OpenAI chat model (default: gpt-4o)

### Handling Large Documents

The application includes optimizations for processing large documents:

1. **Batch Processing**: Documents are processed in smaller batches to avoid timeouts in serverless environments.
2. **Progress Tracking**: Document processing status is tracked and updated in real-time.
3. **Text Length Limits**: Very large text chunks are automatically truncated to avoid embedding generation timeouts.
4. **Retry Logic**: Embedding generation includes retry logic with exponential backoff.

When deploying to Vercel, the application is configured with increased function timeout limits for document processing routes.

### CORS Configuration

The application includes CORS (Cross-Origin Resource Sharing) support for API routes, allowing you to access the API from different domains. This is particularly important when deploying to production.

CORS is configured in several places:

1. **Middleware**: The application's middleware handles CORS preflight requests and adds CORS headers to API responses.
2. **API Routes**: Each API route includes CORS headers in its responses.
3. **Vercel Configuration**: The `vercel.json` file includes CORS headers for API routes.

If you need to allow additional origins, update the allowed origins in `lib/cors.ts`:

```typescript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://your-production-domain.com',
      process.env.NEXT_PUBLIC_SITE_URL,
    ].filter(Boolean) as string[]
  : ['http://localhost:3000'];
```

### Supabase CORS Configuration

You also need to configure CORS in your Supabase project:

1. Go to your Supabase dashboard → Project Settings → API
2. Under "CORS Configuration", add your application's URL to "Additional allowed origins"
3. Make sure to include both your production URL and `http://localhost:3000` for local development

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 