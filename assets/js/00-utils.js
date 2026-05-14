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

  /* ── Tratamento centralizado de erros ──────────────────────
     Padrão recomendado para novos catches:

       fbGet(...).then(...).catch(function(e){ window._err('contexto', e); });

     - _err     → console.warn + toast vermelho (quando _showToast disponível)
     - _errSilent → apenas console.warn (para erros já tratados na UI)

     Comportamento defensivo: nunca lança. Recebe contexto pra
     facilitar debug.
  ──────────────────────────────────────────────────────────── */
  if(!window._err){
    window._err = function(ctx, err){
      try{ console.warn('['+ctx+']', err); }catch(_){}
      if(typeof window._showToast === 'function'){
        var msg = (err && err.message) ? err.message : (typeof err === 'string' ? err : 'Erro inesperado');
        try{ window._showToast('❌ '+ctx+': '+msg, 'var(--red)'); }catch(_){}
      }
    };
  }
  if(!window._errSilent){
    window._errSilent = function(ctx, err){
      try{ console.warn('['+ctx+']', err); }catch(_){}
    };
  }

  /* ── Debug log condicional ──────────────────────────────────
     Substitui console.log direto. Só imprime se:
       localStorage.setItem('DEBUG','1')
     em produção fica silencioso. Para erros reais, use _err.
  ──────────────────────────────────────────────────────────── */
  var _DEBUG = false;
  try{ _DEBUG = localStorage.getItem('DEBUG') === '1'; }catch(_){}
  if(!window._log){
    window._log = function(){
      if(!_DEBUG) return;
      try{ console.log.apply(console, arguments); }catch(_){}
    };
  }
  /* Helper para ligar/desligar via console:
       _setDebug(true) | _setDebug(false)  */
  if(!window._setDebug){
    window._setDebug = function(on){
      _DEBUG = !!on;
      try{
        if(on) localStorage.setItem('DEBUG','1');
        else localStorage.removeItem('DEBUG');
        console.info('[utils] DEBUG =', _DEBUG);
      }catch(_){}
    };
  }
})();
