# Open Source Maintainer Checklist

This document is a quick operational guide for repository maintainers.

## 1. Enable GitHub Discussions

1. Open repository Settings.
2. Go to Features.
3. Enable Discussions.

After enabling Discussions, the issue template contact link will work as expected.

## 2. Configure Branch Protection for main

1. Open Settings > Branches.
2. Add a branch protection rule for main.
3. Enable at least:
   - Require a pull request before merging
   - Require approvals (recommended: 1 or more)
   - Require status checks to pass before merging
   - Include administrators (recommended)
4. Select these checks:
   - CI / build-and-validate
   - Dependency Review / dependency-review
   - CodeQL / Analyze (JavaScript/TypeScript)

## 3. Import labels from .github/labels.json

Prerequisites:

- GitHub CLI installed and authenticated
- jq installed

Bash example:

```bash
OWNER="joaodematejr"
REPO="website_sro_nextjs"

jq -c '.[]' .github/labels.json | while read -r label; do
  name=$(echo "$label" | jq -r '.name')
  color=$(echo "$label" | jq -r '.color')
  description=$(echo "$label" | jq -r '.description')

  gh api \
    --method POST \
    -H "Accept: application/vnd.github+json" \
    "/repos/$OWNER/$REPO/labels" \
    -f name="$name" \
    -f color="$color" \
    -f description="$description" \
  || echo "Label already exists or could not be created: $name"
done
```

PowerShell example:

```powershell
$owner = "joaodematejr"
$repo = "website_sro_nextjs"
$labels = Get-Content .github/labels.json | ConvertFrom-Json

foreach ($label in $labels) {
  gh api --method POST `
    -H "Accept: application/vnd.github+json" `
    "/repos/$owner/$repo/labels" `
    -f "name=$($label.name)" `
    -f "color=$($label.color)" `
    -f "description=$($label.description)"

  if ($LASTEXITCODE -ne 0) {
    Write-Host "Label already exists or could not be created: $($label.name)"
  }
}
```

## 4. Optional but recommended

- Enable automatic deletion of head branches after merge.
- Require conversation resolution before merge.
- Pin critical workflow actions to a full commit SHA over time.
