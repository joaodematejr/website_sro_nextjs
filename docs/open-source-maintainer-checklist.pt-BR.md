# Checklist de Mantenedor Open Source

Este documento e um guia operacional rapido para mantenedores do repositorio.

## 1. Habilitar GitHub Discussions

1. Abra Settings no repositorio.
2. Va em Features.
3. Habilite Discussions.

Depois de habilitar Discussions, o link de contato dos templates de issue passa a funcionar como esperado.

## 2. Configurar protecao de branch para main

1. Abra Settings > Branches.
2. Adicione uma regra de branch protection para main.
3. Habilite no minimo:
   - Require a pull request before merging
   - Require approvals (recomendado: 1 ou mais)
   - Require status checks to pass before merging
   - Include administrators (recomendado)
4. Selecione estes checks:
   - CI / build-and-validate
   - Dependency Review / dependency-review
   - CodeQL / Analyze (JavaScript/TypeScript)

## 3. Importar labels a partir de .github/labels.json

Pre-requisitos:

- GitHub CLI instalado e autenticado
- jq instalado

Exemplo Bash:

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
  || echo "Label ja existe ou nao pode ser criada: $name"
done
```

Exemplo PowerShell:

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
    Write-Host "Label ja existe ou nao pode ser criada: $($label.name)"
  }
}
```

## 4. Opcional, mas recomendado

- Habilitar exclusao automatica de branches apos merge.
- Exigir resolucao de conversas antes do merge.
- Ao longo do tempo, fixar actions criticas em commit SHA completo.
