import os
import sys
from supabase import create_client

def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print("Missing Supabase credentials, cannot perform gate check.")
        sys.exit(1)

    client = create_client(supabase_url, supabase_key)

    # Get latest active release date
    release_res = client.table('ai_prediction_releases').select('data_latest_date').eq('is_active', True).execute()

    # Get latest actual data date
    actuals_res = client.table('agmarknet_ai_actuals').select('date').order('date', desc=True).limit(1).execute()

    active_date = release_res.data[0]['data_latest_date'] if release_res.data else "2000-01-01"
    actual_date = actuals_res.data[0]['date'] if actuals_res.data else "2000-01-01"

    force_retrain = os.environ.get("FORCE_RETRAIN", "false").lower() == "true"

    if force_retrain or str(actual_date) > str(active_date):
        print("New data available or force retrain requested. Proceeding with Kaggle run.")
        output_path = os.environ.get('GITHUB_OUTPUT')
        if output_path:
            with open(output_path, 'a') as f:
                f.write("should_run=true\n")
    else:
        print("No new data available. Skipping Kaggle run.")
        output_path = os.environ.get('GITHUB_OUTPUT')
        if output_path:
            with open(output_path, 'a') as f:
                f.write("should_run=false\n")

if __name__ == "__main__":
    main()
