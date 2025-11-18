#!/bin/bash
# GitHub API Helper Script
# Usage: ./scripts/github-api.sh <command> [args]

set -e

# Load tokens
if [ -f .env.tokens ]; then
    source .env.tokens
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN not set. Please configure .env.tokens"
    exit 1
fi

API_BASE="https://api.github.com"
REPO_OWNER="Imperial-Trade"
REPO_NAME="imperial-trade"

# Helper function for API calls
gh_api() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github+json" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            "$API_BASE$endpoint" \
            -d "$data"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github+json" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            "$API_BASE$endpoint"
    fi
}

case "$1" in
    "create-pr")
        BRANCH=${2:-$(git branch --show-current)}
        TITLE=$3
        BODY=$4
        BASE=${5:-main}

        if [ -z "$TITLE" ]; then
            echo "Usage: $0 create-pr [branch] <title> <body> [base]"
            exit 1
        fi

        DATA=$(cat <<EOF
{
  "title": "$TITLE",
  "body": "$BODY",
  "head": "$BRANCH",
  "base": "$BASE"
}
EOF
)

        echo "Creating PR from $BRANCH to $BASE..."
        gh_api POST "/repos/$REPO_OWNER/$REPO_NAME/pulls" "$DATA" | jq -r '.html_url'
        ;;

    "list-prs")
        echo "Open Pull Requests:"
        gh_api GET "/repos/$REPO_OWNER/$REPO_NAME/pulls?state=open" | jq -r '.[] | "#\(.number) - \(.title) (@\(.user.login))"'
        ;;

    "create-issue")
        TITLE=$2
        BODY=$3

        if [ -z "$TITLE" ]; then
            echo "Usage: $0 create-issue <title> <body>"
            exit 1
        fi

        DATA=$(cat <<EOF
{
  "title": "$TITLE",
  "body": "$BODY"
}
EOF
)

        echo "Creating issue..."
        gh_api POST "/repos/$REPO_OWNER/$REPO_NAME/issues" "$DATA" | jq -r '.html_url'
        ;;

    "list-issues")
        echo "Open Issues:"
        gh_api GET "/repos/$REPO_OWNER/$REPO_NAME/issues?state=open" | jq -r '.[] | "#\(.number) - \(.title)"'
        ;;

    "repo-info")
        echo "Repository Information:"
        gh_api GET "/repos/$REPO_OWNER/$REPO_NAME" | jq '{name, description, stars: .stargazers_count, forks: .forks_count, open_issues: .open_issues_count}'
        ;;

    "workflows")
        echo "GitHub Actions Workflows:"
        gh_api GET "/repos/$REPO_OWNER/$REPO_NAME/actions/workflows" | jq -r '.workflows[] | "\(.id) - \(.name) (\(.state))"'
        ;;

    *)
        echo "GitHub API Helper"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  create-pr [branch] <title> <body> [base]  - Create pull request"
        echo "  list-prs                                    - List open pull requests"
        echo "  create-issue <title> <body>                - Create new issue"
        echo "  list-issues                                 - List open issues"
        echo "  repo-info                                   - Show repository info"
        echo "  workflows                                   - List GitHub Actions workflows"
        echo ""
        echo "Setup: Configure your GITHUB_TOKEN in .env.tokens"
        exit 1
        ;;
esac
