@echo off
REM ═══════════════════════════════════════════════════════════
REM bump.cmd — Atalho para rodar scripts/bump-cache.ps1
REM
REM Uso: clica 2x neste arquivo OU digita "bump" no terminal
REM      (estando na raiz do projeto).
REM ═══════════════════════════════════════════════════════════
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\bump-cache.ps1"
