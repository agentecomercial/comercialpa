/* ═══════════════════════════════════════════════════════════
   UTILS — helpers compartilhados
   ──────────────────────────────────────────────────────────
   Mantenha este arquivo MUITO enxuto. Coloque aqui apenas funções
   puras, sem dependências, reutilizadas em vários módulos.
   ──────────────────────────────────────────────────────────
   Já disponíveis globalmente em outros lugares:
     - window.fmtMoney(v, mode)   →  02-main.js (canônica)
     - formatVal(v)               →  02-main.js   (= fmtMoney(v,'display'))
     - parseVal(s)                →  02-main.js   (= fmtMoney(s,'parse'))
     - formatDate(iso)            →  02-main.js   (yyyy-mm-dd → dd/mm/yyyy)

   Centralizado aqui:
     - window._esc(s)             →  HTML-escape (versão completa, com ')
     - window._escJs(s)           →  Escape para string JS literal
═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* HTML-escape — versão completa. Escapa também aspas simples para uso
     seguro em atributos HTML (onclick='...', title='...'). */
  if(!window._esc){
    window._esc = function(s){
      return String(s==null?'':s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
    };
  }

  /* Escape para uso em string JS literal (ex: gerar onclick="fn('NAME')") */
  if(!window._escJs){
    window._escJs = function(s){
      return String(s==null?'':s)
        .replace(/\\/g,'\\\\')
        .replace(/'/g,"\\'");
    };
  }
})();
