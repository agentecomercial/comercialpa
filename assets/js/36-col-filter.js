/* ════════════════════════════════════════════════════════════════
   FILTRO DE COLUNAS — cards Consultor × Produto (aba Produto)
   ════════════════════════════════════════════════════════════════
   Permite ao usuário escolher quais treinamentos aparecem como
   COLUNA nas tabelas "Clientes Pagos" e "Clientes Entrada".

   Estados globais:
     window.colFilterPagosSet    Set<string>  vazio = todas as colunas
     window.colFilterEntradaSet  Set<string>  vazio = todas as colunas

   Persistência: localStorage para sobreviver F5.

   Hooks: ao mudar seleção, re-renderiza o card (renderProduto()
   ou _renderProdutoCruzadaEntrada()).

   API global:
     window._colFilterToggle(id)         — abre/fecha popover
     window._colFilterIsVisible(id, cod) — retorna true se a coluna deve aparecer
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var LS_KEY_PAGOS         = 'col_filter_pagos_v1';
  var LS_KEY_ENTRADA       = 'col_filter_entrada_v1';
  var LS_KEY_ORDEM_PAGOS   = 'col_filter_ordem_pagos_v1';
  var LS_KEY_ORDEM_ENTRADA = 'col_filter_ordem_entrada_v1';

  // Inicializa Sets a partir do localStorage (ou vazio)
  function _loadSet(key){
    try {
      var raw = localStorage.getItem(key);
      if(!raw) return new Set();
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set(arr) : new Set();
    } catch(e){ return new Set(); }
  }
  function _saveSet(key, set){
    try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch(e){}
  }
  function _loadOrdem(key){
    try {
      var raw = localStorage.getItem(key);
      if(!raw) return null;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch(e){ return null; }
  }
  function _saveOrdem(key, arr){
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch(e){}
  }

  window.colFilterPagosSet   = window.colFilterPagosSet   || _loadSet(LS_KEY_PAGOS);
  window.colFilterEntradaSet = window.colFilterEntradaSet || _loadSet(LS_KEY_ENTRADA);
  // Ordens customizadas (null = ordem natural de allTreinamentos)
  window.colFilterOrdemPagos   = window.colFilterOrdemPagos   || _loadOrdem(LS_KEY_ORDEM_PAGOS);
  window.colFilterOrdemEntrada = window.colFilterOrdemEntrada || _loadOrdem(LS_KEY_ORDEM_ENTRADA);

  /* Retorna treinamentos na ordem customizada (ou padrão de allTreinamentos).
     Itens em allTreinamentos que não estão na ordem salva vão no final. */
  window._colFilterGetOrdem = function(setId){
    var oficiais = (typeof allTreinamentos !== 'undefined' && Array.isArray(allTreinamentos))
      ? allTreinamentos.slice()
      : (Array.isArray(window.allTreinamentos) ? window.allTreinamentos.slice() : []);
    var ordem = (setId === 'pagos') ? window.colFilterOrdemPagos : window.colFilterOrdemEntrada;
    if(!Array.isArray(ordem) || !ordem.length) return oficiais;
    var oficiaisSet = new Set(oficiais);
    var resultado = [];
    ordem.forEach(function(t){ if(oficiaisSet.has(t)) resultado.push(t); });
    oficiais.forEach(function(t){ if(ordem.indexOf(t) === -1) resultado.push(t); });
    return resultado;
  };

  /* Reordena (drag-drop) — move 'arrastado' para a posição de 'alvo' */
  function _reordenarColuna(setId, arrastado, alvo){
    if(!arrastado || !alvo || arrastado === alvo) return false;
    var atual = window._colFilterGetOrdem(setId);
    var iA = atual.indexOf(arrastado);
    var iB = atual.indexOf(alvo);
    if(iA < 0 || iB < 0) return false;
    atual.splice(iA, 1);
    var insertIdx = atual.indexOf(alvo);
    if(iA < iB) insertIdx += 1;
    atual.splice(insertIdx, 0, arrastado);
    if(setId === 'pagos'){
      window.colFilterOrdemPagos = atual;
      _saveOrdem(LS_KEY_ORDEM_PAGOS, atual);
    } else {
      window.colFilterOrdemEntrada = atual;
      _saveOrdem(LS_KEY_ORDEM_ENTRADA, atual);
    }
    return true;
  }

  /* ──────────────────────────────────────────────
     Toggle abrir/fechar popover
  ────────────────────────────────────────────── */
  /* Backdrop singleton — escurece o fundo quando o popover (agora modal) está aberto.
     Criado lazily na primeira vez que o popover abre. */
  function _getBackdrop(){
    var bd = document.getElementById('colFilterBackdrop');
    if(!bd){
      bd = document.createElement('div');
      bd.id = 'colFilterBackdrop';
      bd.className = 'col-filter-backdrop';
      bd.addEventListener('click', function(){
        document.querySelectorAll('.col-filter.open').forEach(function(el){
          el.classList.remove('open');
        });
        bd.classList.remove('open');
      });
      document.body.appendChild(bd);
    }
    return bd;
  }
  function _setBackdrop(isOpen){
    var bd = _getBackdrop();
    if(isOpen) bd.classList.add('open');
    else       bd.classList.remove('open');
  }

  /* Move o .col-filter-pop para document.body para garantir que position:fixed
     funcione corretamente (qualquer ancestral com transform/filter/will-change
     ancoraria o fixed). Memoriza posição original para devolver no fechamento. */
  function _moverPopParaBody(el){
    var pop = el.querySelector('.col-filter-pop');
    if(!pop || pop.parentElement === document.body) return;
    pop._cfOrigParent = pop.parentElement;
    pop._cfOrigNext   = pop.nextSibling;
    pop._cfOwnerId    = el.id;
    document.body.appendChild(pop);
    pop.classList.add('open');
  }
  function _devolverPopOriginal(el){
    var pop = document.querySelector('.col-filter-pop.open[data-was-from], .col-filter-pop.open');
    // Busca pelo pop que estava aberto e cujo ownerId aponta para este el
    document.querySelectorAll('body > .col-filter-pop').forEach(function(p){
      if(p._cfOwnerId === el.id){
        p.classList.remove('open');
        if(p._cfOrigParent){
          p._cfOrigParent.insertBefore(p, p._cfOrigNext);
          p._cfOrigParent = null;
          p._cfOrigNext   = null;
          p._cfOwnerId    = null;
        }
      }
    });
  }
  function _fecharTodos(){
    document.querySelectorAll('.col-filter.open').forEach(function(el){
      el.classList.remove('open');
      _devolverPopOriginal(el);
    });
    _setBackdrop(false);
  }

  window._colFilterToggle = function(id){
    var el = document.getElementById(id);
    if(!el) return;
    var abrindo = !el.classList.contains('open');
    // Fecha qualquer outro col-filter aberto
    document.querySelectorAll('.col-filter.open').forEach(function(c){
      if(c !== el){
        c.classList.remove('open');
        _devolverPopOriginal(c);
      }
    });
    if(abrindo){
      el.classList.add('open');
      _rebuild(id);          // popula checkboxes ANTES de mover para body
      _moverPopParaBody(el); // garante position:fixed funcionar corretamente
      _setBackdrop(true);
    } else {
      el.classList.remove('open');
      _devolverPopOriginal(el);
      _setBackdrop(false);
    }
  };

  /* Esc fecha o modal */
  document.addEventListener('keydown', function(ev){
    if(ev.key === 'Escape') _fecharTodos();
  });

  /* Reconfigura o handler do backdrop para usar _fecharTodos */
  document.addEventListener('DOMContentLoaded', function(){
    var bd = _getBackdrop();
    bd.onclick = _fecharTodos;
  });

  /* ──────────────────────────────────────────────
     API consumida pelo render: a coluna `cod` deve aparecer?
     Set vazio = TODAS aparecem (sem filtro).
  ────────────────────────────────────────────── */
  window._colFilterIsVisible = function(setId, cod){
    var set = (setId === 'pagos') ? window.colFilterPagosSet : window.colFilterEntradaSet;
    if(!set || set.size === 0) return true;  // vazio = todas
    return set.has(String(cod));
  };

  /* ──────────────────────────────────────────────
     Popula o popover com checkboxes (1 por treinamento de allTreinamentos)
  ────────────────────────────────────────────── */
  function _rebuild(id){
    var el = document.getElementById(id);
    if(!el) return;
    var pop = el.querySelector('.col-filter-pop');
    if(!pop) return;

    var setId = (id === 'colFilterPagos') ? 'pagos' : 'entrada';
    var produtos = window._colFilterGetOrdem(setId);
    if(!produtos.length){
      pop.innerHTML = '<div class="col-filter-empty">Sem treinamentos disponíveis</div>';
      return;
    }
    var set = (setId === 'pagos') ? window.colFilterPagosSet : window.colFilterEntradaSet;

    var n = set.size;
    var todosOn = (n === 0); // Set vazio = todas visíveis (padrão)

    var html = ''
      + '<div class="col-filter-head">'
      +   '<span>🎛 Colunas visíveis</span>'
      +   '<button type="button" class="col-filter-close" onclick="_colFilterToggle(\''+id+'\')" aria-label="Fechar">×</button>'
      + '</div>'
      + '<label class="col-filter-opt col-filter-all">'
      +   '<input type="checkbox" data-cf-all="1"'+(todosOn?' checked':'')+'>'
      +   '<span>TODAS</span>'
      + '</label>'
      + '<div class="col-filter-sep"></div>';

    produtos.forEach(function(p){
      // Se Set vazio (todosOn), considera marcado por default
      var checked = todosOn || set.has(String(p));
      html += '<label class="col-filter-opt col-filter-opt-drag" data-val="'+_esc(p)+'" draggable="true">'
        + '<span class="col-filter-handle" aria-hidden="true">⋮⋮</span>'
        + '<input type="checkbox" data-val="'+_esc(p)+'"'+(checked?' checked':'')+'>'
        + '<span>'+_esc(String(p).toUpperCase())+'</span>'
        + '</label>';
    });

    pop.innerHTML = html;

    // Handlers
    var allChk = pop.querySelector('input[type=checkbox][data-cf-all]');
    var checks = pop.querySelectorAll('input[type=checkbox][data-val]');

    function _materializeSetFromUI(){
      // Quando user clica em "TODAS" sem desativar, mantém Set vazio (sem filtro).
      // Quando user seleciona um subset, materializa todas as marcadas no Set.
      var marcadas = [];
      checks.forEach(function(c){ if(c.checked) marcadas.push(c.getAttribute('data-val')); });
      if(marcadas.length === produtos.length){
        // todas marcadas = sem filtro (limpa Set)
        set.clear();
      } else {
        set.clear();
        marcadas.forEach(function(v){ set.add(v); });
      }
      _saveSet((setId === 'pagos') ? LS_KEY_PAGOS : LS_KEY_ENTRADA, set);
      _atualizarTrigger(id, set, produtos.length);
      _refreshCard(setId);
    }

    checks.forEach(function(c){
      c.addEventListener('change', function(){
        _materializeSetFromUI();
        // sincroniza o "TODAS"
        if(allChk){
          var all = Array.prototype.every.call(checks, function(x){return x.checked;});
          var nada = Array.prototype.every.call(checks, function(x){return !x.checked;});
          allChk.checked = all;
          allChk.indeterminate = !all && !nada;
        }
      });
    });
    if(allChk){
      allChk.addEventListener('change', function(){
        checks.forEach(function(c){ c.checked = allChk.checked; });
        allChk.indeterminate = false;
        _materializeSetFromUI();
      });
    }

    /* Drag-and-drop: arrastar items para reordenar colunas */
    var items = pop.querySelectorAll('.col-filter-opt-drag');
    var dragSrc = null;
    items.forEach(function(item){
      item.addEventListener('dragstart', function(ev){
        dragSrc = item.getAttribute('data-val');
        item.classList.add('dragging');
        try { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', dragSrc); } catch(e){}
      });
      item.addEventListener('dragend', function(){
        item.classList.remove('dragging');
        items.forEach(function(x){ x.classList.remove('drag-over'); });
        dragSrc = null;
      });
      item.addEventListener('dragover', function(ev){
        ev.preventDefault();
        try { ev.dataTransfer.dropEffect = 'move'; } catch(e){}
        if(item.getAttribute('data-val') !== dragSrc) item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', function(){
        item.classList.remove('drag-over');
      });
      item.addEventListener('drop', function(ev){
        ev.preventDefault();
        item.classList.remove('drag-over');
        var alvo = item.getAttribute('data-val');
        if(dragSrc && alvo && dragSrc !== alvo){
          if(_reordenarColuna(setId, dragSrc, alvo)){
            _rebuild(id);
            // mantém popover aberto após reordenar
            var elx = document.getElementById(id);
            if(elx && !elx.classList.contains('open')) elx.classList.add('open');
            _refreshCard(setId);
          }
        }
      });
    });

    _atualizarTrigger(id, set, produtos.length);
  }

  /* Atualiza estado visual do botão trigger (badge com contagem) */
  function _atualizarTrigger(id, set, total){
    var el = document.getElementById(id);
    if(!el) return;
    var trg = el.querySelector('.col-filter-trigger');
    var lbl = el.querySelector('.cf-label');
    if(!trg || !lbl) return;
    var n = set.size;
    var badges = trg.querySelectorAll('.cf-badge');
    badges.forEach(function(b){ b.remove(); });
    if(n === 0){
      lbl.textContent = 'COLUNAS';
      trg.classList.remove('has-sel');
    } else {
      lbl.textContent = 'COLUNAS';
      var badge = document.createElement('span');
      badge.className = 'cf-badge';
      badge.textContent = String(n) + '/' + total;
      var caret = trg.querySelector('.cf-caret');
      if(caret) trg.insertBefore(badge, caret);
      else trg.appendChild(badge);
      trg.classList.add('has-sel');
    }
  }

  /* Re-renderiza o card afetado */
  function _refreshCard(setId){
    if(setId === 'pagos'){
      if(typeof renderProduto === 'function') renderProduto();
    } else {
      if(typeof _renderProdutoCruzadaEntrada === 'function') _renderProdutoCruzadaEntrada();
    }
  }

  function _esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* Bootstrap: atualiza triggers ao carregar e quando turma muda */
  function _atualizarAmbos(){
    var produtos = (typeof allTreinamentos !== 'undefined' && Array.isArray(allTreinamentos))
      ? allTreinamentos.slice() : [];
    if(!produtos.length) return;
    _atualizarTrigger('colFilterPagos',   window.colFilterPagosSet,   produtos.length);
    _atualizarTrigger('colFilterEntrada', window.colFilterEntradaSet, produtos.length);
  }
  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(_atualizarAmbos, 400);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(_atualizarAmbos, 400); });
  }
  if(window.RTBus){
    window.RTBus.on('turma:enter', function(){
      setTimeout(_atualizarAmbos, 1500);
    });
  }
})();
