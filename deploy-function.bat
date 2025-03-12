@echo off
echo Deploying process_document function to Supabase...
cd supabase\functions
supabase functions deploy process_document --project-ref hccgxljoezfxtuhrakws
echo Done!
pause 