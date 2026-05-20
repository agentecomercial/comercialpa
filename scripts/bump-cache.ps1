# ═══════════════════════════════════════════════════════════════
# bump-cache.ps1 — Auto cache-bust de dashboard.html
# ═══════════════════════════════════════════════════════════════
#
# Substitui TODOS os `?v=...` no dashboard.html por um único token
# de timestamp atual, forçando o navegador a recarregar todos os
# JS/CSS de uma vez. Elimina o problema de "alterei o arquivo mas
# parece que não aplicou porque esqueci de bumpar o ?v=".
#
# USO:
#   powershell -ExecutionPolicy Bypass -File scripts/bump-cache.ps1
#
#   ou simplesmente:
#   .\scripts\bump-cache.ps1
#
# OPCIONAL: passa o nome de outro arquivo HTML:
#   .\scripts\bump-cache.ps1 -file outro.html
#
# QUANDO RODAR:
#   - Antes de qualquer commit que mexa em JS/CSS
#   - Antes de testar no navegador depois de uma edição
#   - Antes de subir para o GitHub Pages
# ═══════════════════════════════════════════════════════════════

param(
  [string]$file = "dashboard.html"
)

$ErrorActionPreference = "Stop"

# Resolve caminho: se rodado de scripts/, sobe um nivel
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$targetPath = Join-Path $projectRoot $file

if(-not (Test-Path $targetPath)){
  $altPath = Join-Path (Get-Location).Path $file
  if(Test-Path $altPath){ $targetPath = $altPath }
  else {
    Write-Host "[ERRO] Arquivo '$file' nao encontrado em $projectRoot nem em $((Get-Location).Path)" -ForegroundColor Red
    exit 1
  }
}

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$content = Get-Content $targetPath -Raw -Encoding utf8

# Conta as referencias ANTES de substituir
$matches = [regex]::Matches($content, '\?v=[^"]+')
$count = $matches.Count

if($count -eq 0){
  Write-Host "[INFO] Nenhuma referencia '?v=' encontrada em $file. Nada a fazer." -ForegroundColor Yellow
  exit 0
}

$updated = $content -replace '\?v=[^"]+', "?v=$ts"

# Escreve UTF-8 SEM BOM para nao causar problema em editor/git
[System.IO.File]::WriteAllText($targetPath, $updated, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ("[OK] Cache bumped: " + $count + " referencia(s) atualizada(s) -> ?v=" + $ts) -ForegroundColor Green
Write-Host ("     Arquivo: " + $targetPath) -ForegroundColor DarkGray
