/* ════════════════════════════════════════════════════════════════
   MULTI-SELECT DE STATUS — card Clientes (aba Geral) apenas
   ════════════════════════════════════════════════════════════════
   Substitui o <select id="statusFilter"> antigo (single-choice) por
   um dropdown com checkboxes multi-select. Quando 0 ou TODOS estão
   marcados → filtro = sem filtro (mostra tudo).

   Escopo: SÓ o card Clientes da aba Geral. Outras telas (lista
   ampla, abas Consultor/Treinador/Produto) continuam intactas.

   Estado:
     window.activeStatusSet  — Set<string> com os status selecionados
                               (vazio = sem filtro)

   Compat: ainda escreve em activeStatus (legacy) com o primeiro item
   selecionado para retrocompat (ex: ranking, ferramentas que ainda
   leem essa var). Mas filtered() em 02-main.js foi ajustado para
   priorizar activeStatusSet quando presente.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // Lista de todos os status disponíveis (mesma ordem do <select> original)
  var TODOS_STATUS = ['aberto', 'pago', 'negociacao', 'entrada', 'desistiu', 'estorno'];

  // Inicializa state global
  if(!window.activeStatusSet){
    window.activeStatusSet = new Set();
  }

  /* Abre/fecha o dropdown */
  window._msStatusToggle = function(){
    var ms = document.getElementById('statusFilterMS');
    if(!ms) return;
    var aberto = ms.classList.toggle('open');
    var trigger = document.getElementById('statusFilterTrigger');
    if(trigger) trigger.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  };

  /* Fecha clicando fora */
  document.addEventListener('click', function(ev){
    var ms = document.getElementById('statusFilterMS');
    if(!ms) return;
    if(!ms.contains(ev.target) && ms.classList.contains('open')){
      ms.classList.remove('open');
      var trigger = document.getElementById('statusFilterTrigger');
      if(trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  });

  /* Fecha com ESC */
  document.addEventListener('keydown', function(ev){
    if(ev.key !== 'Escape') return;
    var ms = document.getElementById('statusFilterMS');
    if(ms && ms.classList.contains('open')){
      ms.classList.remove('open');
    }
  });

  /* "TODOS" marca/desmarca todos os checkboxes individuais */
  window._msStatusToggleAll = function(marcado){
    var pop = document.getElementById('statusFilterPop');
    if(!pop) return;
    var checks = pop.querySelectorAll('input[type=checkbox][data-val]');
    checks.forEach(function(c){ c.checked = !!marcado; });
    _atualizarSet();
    _atualizarLabel();
    _renderListaAfetada();
  };

  /* Marcar/desmarcar opção individual atualiza o Set + label + lista */
  window._msStatusOnChange = function(){
    _atualizarSet();
    _atualizarLabel();
    _atualizarCheckTodos();
    _renderListaAfetada();
  };

  /* Lê os checkboxes e popula activeStatusSet */
  function _atualizarSet(){
    var pop = document.getElementById('statusFilterPop');
    if(!pop) return;
    window.activeStatusSet = new Set();
    var checks = pop.querySelectorAll('input[type=checkbox][data-val]:checked');
    checks.forEach(function(c){
      var v = c.getAttribute('data-val');
      if(v) window.activeStatusSet.add(v);
    });
    // Compat: se exatamente 1 selecionado, manter activeStatus como antes
    if(window.activeStatusSet.size === 1){
      window.activeStatus = Array.from(window.activeStatusSet)[0];
    } else {
      // 0 ou múltiplos → não usa o legacy single
      window.activeStatus = null;
    }
  }

  /* Mantém o checkbox "TODOS" coerente: marcado ⟺ todos individuais marcados */
  function _atualizarCheckTodos(){
    var all = document.getElementById('msStatus_all');
    if(!all) return;
    var n = window.activeStatusSet.size;
    all.checked = (n === TODOS_STATUS.length);
    all.indeterminate = (n > 0 && n < TODOS_STATUS.length);
  }

  /* Atualiza o texto do botão (TODOS, "STATUS NAME" ou "N STATUS") */
  function _atualizarLabel(){
    var el = document.getElementById('statusFilterLabel');
    if(!el) return;
    var n = window.activeStatusSet.size;
    if(n === 0 || n === TODOS_STATUS.length){
      el.textContent = 'TODOS';
    } else if(n === 1){
      var v = Array.from(window.activeStatusSet)[0];
      el.textContent = String(v).toUpperCase().replace('NEGOCIACAO','NEGOCIAÇÃO');
    } else {
      el.textContent = n + ' STATUS';
    }
  }

  /* Re-renderiza a lista de clientes (usa renderAll existente) */
  function _renderListaAfetada(){
    if(typeof renderAll === 'function') renderAll();
  }

  /* Inicialização ao carregar */
  document.addEventListener('DOMContentLoaded', function(){
    _atualizarLabel();
    _atualizarCheckTodos();
  });
})();
