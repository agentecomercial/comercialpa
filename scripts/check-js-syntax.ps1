# ════════════════════════════════════════════════════════════════════
# check-js-syntax.ps1 — Detecta regressão de sintaxe JS sem deps
# ════════════════════════════════════════════════════════════════════
# Tokenizador minimal que entende: //, /* */, 'str', "str", `tpl`,
# /regex/flags. Após remover esses tokens, conta delimitadores
# { } ( ) [ ].
#
# Estratégia para evitar falso positivo em arquivos legados grandes:
#
#   * Para cada arquivo, calcula `disequilibrio = |abre - fech|` para
#     cada tipo de delimitador.
#   * Compara com o disequilibrio da versão em HEAD (git show).
#   * Bloqueia SE piorou (delta > 0). Se manteve ou melhorou → OK.
#   * Arquivos novos (sem versão em HEAD): bloqueia se disequilibrio>0.
#
# Resultado: catch confiável de "introduzi um bug agora", sem ruído
# nos casos onde o tokenizer não cobre 100% (template strings exóticas,
# regex literais sem operador antes, etc).
#
# Uso:
#   pwsh -NoProfile -File scripts/check-js-syntax.ps1 -Files "a.js,b.js"
# ════════════════════════════════════════════════════════════════════

param(
  [string[]]$Files
)

$ErrorActionPreference = "Stop"

# Aceita arquivos via -Files OU args soltos OU stdin
if(-not $Files -or $Files.Count -eq 0){
  $Files = @()
  if($args){ $Files += $args }
  if([Console]::IsInputRedirected){
    while($line = [Console]::In.ReadLine()){
      if($line.Trim()){ $Files += $line.Trim() }
    }
  }
}

# Achata vírgulas internas
$expanded = @()
foreach($f in $Files){
  foreach($p in ($f -split ',')){ if($p.Trim()){ $expanded += $p.Trim() } }
}
$Files = $expanded

if($Files.Count -eq 0){
  Write-Host "Uso: check-js-syntax.ps1 -Files a.js,b.js" -ForegroundColor Yellow
  exit 0
}

function Get-Counts {
  param([string]$Src)

  $n = $Src.Length
  $i = 0
  $abreChave = 0; $fechChave = 0
  $abrePar   = 0; $fechPar   = 0
  $abreCol   = 0; $fechCol   = 0

  $tplStack = New-Object System.Collections.Stack
  $lastSig = ''

  while($i -lt $n){
    $c = $Src[$i]
    $next = if($i+1 -lt $n){ $Src[$i+1] } else { '' }
    $insideTpl = ($tplStack.Count -gt 0 -and $tplStack.Peek() -gt 0)

    if($c -eq '/' -and $next -eq '/'){
      while($i -lt $n -and $Src[$i] -ne "`n"){ $i++ }
      continue
    }
    if($c -eq '/' -and $next -eq '*'){
      $i += 2
      while($i -lt $n){
        if($Src[$i] -eq '*' -and $i+1 -lt $n -and $Src[$i+1] -eq '/'){ $i += 2; break }
        $i++
      }
      continue
    }
    if($c -eq "'"){
      $i++
      while($i -lt $n){
        if($Src[$i] -eq '\'){ $i += 2; continue }
        if($Src[$i] -eq "'"){ $i++; break }
        $i++
      }
      $lastSig = "'"
      continue
    }
    if($c -eq '"'){
      $i++
      while($i -lt $n){
        if($Src[$i] -eq '\'){ $i += 2; continue }
        if($Src[$i] -eq '"'){ $i++; break }
        $i++
      }
      $lastSig = '"'
      continue
    }
    if($c -eq '`' -and -not $insideTpl){
      $i++
      $tplStack.Push(0)
      while($i -lt $n){
        if($Src[$i] -eq '\'){ $i += 2; continue }
        if($Src[$i] -eq '`'){ $i++; $null = $tplStack.Pop(); break }
        if($Src[$i] -eq '$' -and $i+1 -lt $n -and $Src[$i+1] -eq '{'){
          $top = $tplStack.Pop()
          $tplStack.Push($top + 1)
          $i += 2
          break
        }
        $i++
      }
      $lastSig = '`'
      continue
    }
    if($c -eq '/' -and -not $insideTpl){
      $regexPrev = @('','=',',','(','[','{',';','!','&','|','?',':','+','-','*','%','^','~','<','>','`')
      $isRegex = $false
      if($regexPrev -contains $lastSig){ $isRegex = $true }
      else {
        $back = [Math]::Max(0, $i-12)
        $prev = $Src.Substring($back, $i-$back)
        if($prev -match '\b(return|typeof|in|of|instanceof|void|throw|delete|new)\s*$'){
          $isRegex = $true
        }
      }
      if($isRegex){
        $i++
        $inClass = $false
        while($i -lt $n){
          if($Src[$i] -eq '\'){ $i += 2; continue }
          if($Src[$i] -eq '['){ $inClass = $true; $i++; continue }
          if($Src[$i] -eq ']'){ $inClass = $false; $i++; continue }
          if($Src[$i] -eq '/' -and -not $inClass){ $i++; break }
          if($Src[$i] -eq "`n"){ break }
          $i++
        }
        while($i -lt $n -and $Src[$i] -match '[a-z]'){ $i++ }
        $lastSig = '/'
        continue
      }
    }

    switch($c){
      '{' {
        $abreChave++
        if($insideTpl){ $top = $tplStack.Pop(); $tplStack.Push($top + 1) }
      }
      '}' {
        $fechChave++
        if($insideTpl){
          $top = $tplStack.Pop()
          if($top -gt 0){ $tplStack.Push($top - 1) } else { $tplStack.Push(0) }
        }
      }
      '(' { $abrePar++ }
      ')' { $fechPar++ }
      '[' { $abreCol++ }
      ']' { $fechCol++ }
    }

    if($c -notmatch '\s'){ $lastSig = $c }
    $i++
  }

  return @{
    chave = [Math]::Abs($abreChave - $fechChave)
    par   = [Math]::Abs($abrePar - $fechPar)
    col   = [Math]::Abs($abreCol - $fechCol)
    detail = "chaves($abreChave/$fechChave) parens($abrePar/$fechPar) colchs($abreCol/$fechCol)"
  }
}

function Get-HeadVersion {
  param([string]$Path)
  try {
    # Normaliza pra forward slash que git aceita
    $p = $Path -replace '\\','/'
    $r = & git show "HEAD:$p" 2>$null
    if($LASTEXITCODE -eq 0){ return ($r -join "`n") }
  } catch {}
  return $null
}

function Test-JsFile {
  param([string]$Path)
  if(-not (Test-Path $Path)){ return @{ ok = $false; msg = "arquivo nao encontrado" } }

  $srcNovo = [System.IO.File]::ReadAllText($Path)
  $cNovo = Get-Counts -Src $srcNovo

  $srcAntigo = Get-HeadVersion -Path $Path
  if($null -eq $srcAntigo){
    # arquivo novo: precisa estar perfeito (zero disequilibrio)
    $totalNovo = $cNovo.chave + $cNovo.par + $cNovo.col
    if($totalNovo -gt 0){
      return @{ ok = $false; msg = "arquivo novo desbalanceado: $($cNovo.detail)" }
    }
    return @{ ok = $true; msg = "novo OK" }
  }

  $cAntigo = Get-Counts -Src $srcAntigo
  $regrChave = $cNovo.chave - $cAntigo.chave
  $regrPar   = $cNovo.par   - $cAntigo.par
  $regrCol   = $cNovo.col   - $cAntigo.col

  $piorou = @()
  if($regrChave -gt 0){ $piorou += "chaves +$regrChave" }
  if($regrPar   -gt 0){ $piorou += "parens +$regrPar" }
  if($regrCol   -gt 0){ $piorou += "colchs +$regrCol" }

  if($piorou.Count -gt 0){
    return @{ ok = $false; msg = "REGRESSAO de balanceamento: $($piorou -join ', ') (antes: $($cAntigo.detail), agora: $($cNovo.detail))" }
  }
  return @{ ok = $true; msg = "OK (sem regressao)" }
}

$failed = 0
foreach($f in $Files){
  if([string]::IsNullOrWhiteSpace($f)){ continue }
  $r = Test-JsFile -Path $f
  if($r.ok){
    Write-Host "  OK  $f - $($r.msg)" -ForegroundColor DarkGray
  } else {
    Write-Host "  ERR $f - $($r.msg)" -ForegroundColor Red
    $failed++
  }
}

if($failed -gt 0){ exit 1 } else { exit 0 }
