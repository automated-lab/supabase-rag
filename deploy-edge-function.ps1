# PowerShell script to deploy Supabase Edge Functions

# Get the Supabase project reference from .env.local
$envFile = ".env.local"
$projectRef = ""

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    foreach ($line in $envContent) {
        if ($line -match "NEXT_PUBLIC_SUPABASE_URL=https://([^.]+)\.supabase\.co") {
            $projectRef = $matches[1]
            break
        }
    }
}

if (-not $projectRef) {
    Write-Host "Error: Could not find Supabase project reference in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "Found Supabase project reference: $projectRef" -ForegroundColor Green

# Check if Supabase CLI is installed
try {
    $supabaseVersion = supabase --version
    Write-Host "Supabase CLI version: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Supabase CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Run: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Deploy the process_document function
Write-Host "Deploying process_document function..." -ForegroundColor Cyan
try {
    supabase functions deploy process_document --project-ref $projectRef
    Write-Host "Successfully deployed process_document function!" -ForegroundColor Green
} catch {
    Write-Host "Error deploying process_document function: $_" -ForegroundColor Red
    exit 1
}

# Check if the function was deployed successfully
Write-Host "Checking deployed functions..." -ForegroundColor Cyan
supabase functions list --project-ref $projectRef

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "You can now test document uploads at /documents/test" -ForegroundColor Yellow 