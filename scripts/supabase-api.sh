#!/bin/bash
# Supabase API Helper Script
# Usage: ./scripts/supabase-api.sh <command> [args]

set -e

# Load tokens
if [ -f .env.tokens ]; then
    source .env.tokens
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "Error: SUPABASE_ACCESS_TOKEN not set. Please configure .env.tokens"
    exit 1
fi

if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "Error: SUPABASE_PROJECT_REF not set. Please configure .env.tokens"
    exit 1
fi

MGMT_API="https://api.supabase.com/v1"
PROJECT_API="https://$SUPABASE_PROJECT_REF.supabase.co"

# Helper function for Management API calls
sb_mgmt_api() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            "$MGMT_API$endpoint" \
            -d "$data"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            "$MGMT_API$endpoint"
    fi
}

# Helper function for Project API calls (requires service_role key for admin operations)
sb_project_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local key=${SUPABASE_SERVICE_KEY:-$VITE_SUPABASE_ANON_KEY}

    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "apikey: $key" \
            -H "Authorization: Bearer $key" \
            -H "Content-Type: application/json" \
            "$PROJECT_API$endpoint" \
            -d "$data"
    else
        curl -s -X "$method" \
            -H "apikey: $key" \
            -H "Authorization: Bearer $key" \
            -H "Content-Type: application/json" \
            "$PROJECT_API$endpoint"
    fi
}

case "$1" in
    "project-info")
        echo "Project Information:"
        sb_mgmt_api GET "/projects/$SUPABASE_PROJECT_REF" | jq '.'
        ;;

    "list-projects")
        echo "Your Supabase Projects:"
        sb_mgmt_api GET "/projects" | jq -r '.[] | "\(.id) - \(.name) (\(.region))"'
        ;;

    "run-sql")
        SQL_FILE=$2

        if [ -z "$SQL_FILE" ] || [ ! -f "$SQL_FILE" ]; then
            echo "Usage: $0 run-sql <sql-file>"
            exit 1
        fi

        SQL_CONTENT=$(cat "$SQL_FILE")

        echo "Executing SQL..."
        sb_project_api POST "/rest/v1/rpc/exec" "{\"query\": \"$SQL_CONTENT\"}"
        ;;

    "list-tables")
        echo "Database Tables:"
        sb_project_api GET "/rest/v1/" | jq -r 'keys[]'
        ;;

    "database-health")
        echo "Database Health:"
        sb_mgmt_api GET "/projects/$SUPABASE_PROJECT_REF/health" | jq '.'
        ;;

    "list-functions")
        echo "Edge Functions:"
        sb_mgmt_api GET "/projects/$SUPABASE_PROJECT_REF/functions" | jq -r '.[] | "\(.id) - \(.name) (\(.status))"'
        ;;

    "deploy-function")
        FUNCTION_NAME=$2
        FUNCTION_FILE=$3

        if [ -z "$FUNCTION_NAME" ] || [ -z "$FUNCTION_FILE" ]; then
            echo "Usage: $0 deploy-function <name> <file>"
            exit 1
        fi

        if [ ! -f "$FUNCTION_FILE" ]; then
            echo "Error: File $FUNCTION_FILE not found"
            exit 1
        fi

        # Create function slug
        echo "Deploying function: $FUNCTION_NAME"

        # Read function code
        FUNCTION_CODE=$(cat "$FUNCTION_FILE" | jq -Rs .)

        DATA=$(cat <<EOF
{
  "slug": "$FUNCTION_NAME",
  "name": "$FUNCTION_NAME",
  "body": $FUNCTION_CODE,
  "verify_jwt": true
}
EOF
)

        sb_mgmt_api POST "/projects/$SUPABASE_PROJECT_REF/functions" "$DATA" | jq '.'
        ;;

    "secrets-list")
        echo "Function Secrets:"
        sb_mgmt_api GET "/projects/$SUPABASE_PROJECT_REF/secrets" | jq -r '.[] | .name'
        ;;

    "secrets-set")
        SECRET_NAME=$2
        SECRET_VALUE=$3

        if [ -z "$SECRET_NAME" ] || [ -z "$SECRET_VALUE" ]; then
            echo "Usage: $0 secrets-set <name> <value>"
            exit 1
        fi

        DATA=$(cat <<EOF
{
  "name": "$SECRET_NAME",
  "value": "$SECRET_VALUE"
}
EOF
)

        echo "Setting secret: $SECRET_NAME"
        sb_mgmt_api POST "/projects/$SUPABASE_PROJECT_REF/secrets" "$DATA" | jq '.'
        ;;

    *)
        echo "Supabase API Helper"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  project-info                        - Show project information"
        echo "  list-projects                       - List all your projects"
        echo "  run-sql <file>                      - Execute SQL file"
        echo "  list-tables                         - List database tables"
        echo "  database-health                     - Check database health"
        echo "  list-functions                      - List Edge Functions"
        echo "  deploy-function <name> <file>       - Deploy Edge Function"
        echo "  secrets-list                        - List function secrets"
        echo "  secrets-set <name> <value>          - Set function secret"
        echo ""
        echo "Setup: Configure tokens in .env.tokens:"
        echo "  - SUPABASE_ACCESS_TOKEN"
        echo "  - SUPABASE_PROJECT_REF"
        echo "  - SUPABASE_SERVICE_KEY (optional, for admin operations)"
        exit 1
        ;;
esac
