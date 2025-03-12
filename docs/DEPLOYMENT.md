# Deployment Guide for RAG System

This guide provides detailed instructions for setting up and deploying the RAG System both locally and to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
  - [Mac Setup](#mac-setup)
  - [Windows Setup](#windows-setup)
- [Supabase Setup](#supabase-setup)
- [Environment Configuration](#environment-configuration)
- [Production Deployment](#production-deployment)
  - [Vercel Deployment](#vercel-deployment)
  - [Other Hosting Options](#other-hosting-options)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js**: Version 18 or higher
  - [Download Node.js](https://nodejs.org/)
  - Verify installation: `node --version`
- **Git**: For version control
  - [Download Git](https://git-scm.com/downloads)
  - Verify installation: `git --version`
- **Supabase Account**: For database and authentication
  - [Sign up for Supabase](https://supabase.com/)
- **OpenAI API Key**: For AI capabilities
  - [Get an API key from OpenAI](https://platform.openai.com/account/api-keys)

## Local Development Setup

### Mac Setup

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js and npm**:
   ```bash
   brew install node
   ```

3. **Install Supabase CLI**:
   ```bash
   brew install supabase/tap/supabase
   ```

4. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/rag-system.git
   cd rag-system
   ```

5. **Install dependencies**:
   ```bash
   npm install
   # or if you prefer yarn
   yarn install
   ```

### Windows Setup

1. **Install Node.js and npm**:
   - Download and install from [Node.js website](https://nodejs.org/)
   - Or use [Chocolatey](https://chocolatey.org/):
     ```powershell
     choco install nodejs
     ```

2. **Install Supabase CLI**:
   ```powershell
   # Using npm
   npm install -g supabase
   ```

3. **Clone the repository**:
   ```powershell
   git clone https://github.com/yourusername/rag-system.git
   cd rag-system
   ```

4. **Install dependencies**:
   ```powershell
   npm install
   # or if you prefer yarn
   yarn install
   ```

## Supabase Setup

1. **Create a new Supabase project**:
   - Go to [Supabase Dashboard](https://app.supabase.io/)
   - Click "New Project"
   - Enter a name for your project
   - Set a secure database password
   - Choose a region close to your users
   - Click "Create new project"

2. **Enable pgvector extension**:
   - In your Supabase project, go to SQL Editor
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

3. **Set up the database schema**:

   **Option 1: Using Supabase CLI (Recommended)**
   
   ```bash
   # Login to Supabase
   supabase login
   
   # Link to your project (find your project ref in the Supabase dashboard URL)
   supabase link --project-ref your-project-ref
   
   # Push the schema
   supabase db push
   ```

   **Option 2: Manual SQL execution**
   
   - Go to your Supabase dashboard > SQL Editor
   - Create a new query
   - Copy the entire contents of `supabase/schema.sql` from the repository
   - Paste into the SQL Editor and run the query

4. **Get your Supabase credentials**:
   - Go to Project Settings > API
   - Copy the URL, anon key, and service_role key

## Environment Configuration

1. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` with your credentials**:
   ```
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key
   ```

3. **Optional: Configure RAG settings**:
   You can customize these in the `.env.local` file:
   ```
   # Optional RAG settings
   CHUNK_SIZE=1000
   CHUNK_OVERLAP=200
   EMBEDDING_MODEL=text-embedding-3-small
   OPENAI_MODEL=gpt-4o
   ```

## Production Deployment

### Vercel Deployment

Vercel is the recommended hosting platform for Next.js applications.

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [Vercel](https://vercel.com) and sign up/login
   - Click "New Project"
   - Import your GitHub repository
   - Configure the project:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: (leave as default)
     - Output Directory: (leave as default)
   
3. **Set environment variables**:
   - In the Vercel project settings, go to "Environment Variables"
   - Add all the variables from your `.env.local` file:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`
     - Any other custom settings

4. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be available at a Vercel-generated URL

5. **Custom domain (optional)**:
   - In the Vercel project settings, go to "Domains"
   - Add your custom domain and follow the instructions

### Other Hosting Options

While Vercel is recommended, you can deploy to other platforms:

**AWS Amplify**:
- Connect your GitHub repository
- Configure build settings
- Set environment variables
- Deploy

**Netlify**:
- Import from GitHub
- Set build command to `npm run build`
- Set publish directory to `.next`
- Add environment variables
- Deploy

## Troubleshooting

### Common Issues

**Issue**: Dynamic server usage errors during build
- **Solution**: The application uses dynamic server features like cookies for authentication. This is expected and won't affect functionality.
- **Solution**: If you see warnings like `Dynamic server usage: Route couldn't be rendered statically because it used cookies`, this is normal for routes that require authentication.
- **Solution**: For production deployment, Vercel will handle these dynamic routes correctly.

**Issue**: Database connection errors
- **Solution**: Verify your Supabase credentials in `.env.local`
- **Solution**: Check if your IP is allowed in Supabase dashboard

**Issue**: OpenAI API errors
- **Solution**: Verify your OpenAI API key
- **Solution**: Check if you have sufficient credits in your OpenAI account

**Issue**: Build errors on Vercel
- **Solution**: Check the build logs for specific errors
- **Solution**: Ensure all environment variables are set correctly

**Issue**: pgvector extension not working
- **Solution**: Verify the extension is enabled in Supabase
- **Solution**: Check if your Supabase plan supports pgvector

### Getting Help

If you encounter issues not covered here:
- Check the [GitHub Issues](https://github.com/yourusername/rag-system/issues)
- Create a new issue with detailed information about your problem
- Join our community Discord for real-time help

## Vercel Deployment Specifics

When deploying to Vercel, there are a few important considerations:

1. **Environment Variables**: Make sure to set all required environment variables in the Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   OPENAI_API_KEY=your-openai-api-key
   ```

2. **Build Settings**: The project includes a `vercel.json` configuration file that sets up:
   - Security headers
   - Build commands
   - Region configuration

3. **Handling Dynamic Routes**: Some routes in the application use dynamic features like cookies for authentication. Vercel handles these correctly in production, but you may see warnings during the build process.

4. **Serverless Function Limits**: Be aware of Vercel's serverless function limits:
   - Execution timeout: 10 seconds for Hobby tier, 60 seconds for Pro tier
   - Payload size: 4.5MB for request and response
   - Memory: 1024MB

5. **Scaling Considerations**:
   - The free tier of Vercel has limitations on bandwidth and build minutes
   - For production use, consider upgrading to the Pro plan
   - Supabase also has tier limitations to consider for database and storage

6. **Custom Domain Setup**:
   - In the Vercel dashboard, go to your project settings
   - Navigate to "Domains"
   - Add your custom domain and follow the verification steps
   - Update DNS settings as instructed by Vercel

7. **Monitoring and Logs**:
   - Use Vercel's built-in analytics and logs for monitoring
   - Set up error reporting through Vercel integrations 