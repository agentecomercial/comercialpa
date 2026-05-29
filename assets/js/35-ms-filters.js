/* ════════════════════════════════════════════════════════════════
   MULTI-SELECT DE FILTROS — Treinador / Consultor / Presença
   (card Clientes da aba Geral apenas)
   ════════════════════════════════════════════════════════════════
   Substitui os botões "pill" antigos por dropdowns multi-select
   no mesmo padrão do filtro de Status (34-ms-status-filter.js).

   Estados globais:
     window.activeTrainerSet    Set<string>  (vazio = sem filtro)
     window.activeConsultorSet  Set<string>
     window.activePresencaSet   Set<string>  ('presente' | 'falta' | 'pendente')

   Compat: ainda escreve em activeTrainer, activeConsultor e
   chama _setFiltroPresenca quando há exatamente 1 item — para
   manter outros consumidores (rankings, listas) funcionando.

   Quem chama:
     - buildFilterBtns() / _renderFiltrosPresenca()  → repopulate
       (sem quebrar API antiga; chamamos esses para sync visual)
     - clearAll() → limpa Sets também (ajuste em 02-main.js)
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* Inicializa Sets */
  if(!window.activeTrainerSet)      window.activeTrainerSet      = new Set();
  if(!window.activeConsultorSet)    window.activeConsultorSet    = new Set();
  if(!window.activePresencaSet)     window.activePresencaSet     = new Set();
  if(!window.activeTreinamentoSet)  window.activeTreinamentoSet  = new Set();

  /* ──────────────────────────────────────────────
     MOBILE · OPÇÃO 08 — toggle do painel de filtros
     Mantém estado e atualiza badge de contagem
  ────────────────────────────────────────────── */
  window._mobFiltToggle = function(){
    var bar = document.getElementById('cliBarUnica');
    var btn = document.getElementById('mobFiltToggle');
    if(!bar || !btn) return;
    var abrindo = !bar.classList.contains('mob-filt-open');
    bar.classList.toggle('mob-filt-open', abrindo);
    btn.classList.toggle('open', abrindo);
    btn.setAttribute('aria-expanded', abrindo ? 'true' : 'false');
  };
  window._mobFiltAtualizarBadge = function(){
    var badge = document.getElementById('mobFiltBadge');
    if(!badge) return;
    var n = 0;
    if(window.activeStatusSet)       n += window.activeStatusSet.size;
    if(window.activeTreinamentoSet)  n += window.activeTreinamentoSet.size;
    if(window.activeTrainerSet)      n += window.activeTrainerSet.size;
    if(window.activeConsultorSet)    n += window.activeConsultorSet.size;
    if(window.activePresencaSet)     n += window.activePresencaSet.size;
    badge.textContent = n;
    badge.hidden = (n === 0);
  };
  /* Atualiza badge automaticamente quando algum filtro muda */
  document.addEventListener('change', function(ev){
    if(ev.target && ev.target.matches && ev.target.matches('.ms-filt-pop input,.ms-status-pop input')){
      setTimeout(window._mobFiltAtualizarBadge, 30);
    }
  });

  /* ──────────────────────────────────────────────
     Toggle de abertura do popover (compartilhado)
  ────────────────────────────────────────────── */
  window._msFiltToggle = function(id){
    var ms = document.getElementById(id);
    if(!ms) return;
    var abrindo = !ms.classList.contains('open');
    /* fecha todos os outros multi-selects de filtros antes de abrir este */
    document.querySelectorAll('.ms-filt.open').forEach(function(el){
      if(el !== ms) el.classList.remove('open');
    });
    /* fecha também o menu kebab "···" se estiver aberto */
    var mk = document.getElementById('cliBarMenu');
    if(mk) mk.classList.remove('open');
    /* LAZY REBUILD: ao abrir, repopula o popover com dados ATUAIS
       (garante que se a turma mudou ou novo cliente foi adicionado,
       as opções estão atualizadas mesmo sem refresh manual). */
    if(abrindo){
      try {
        if(id === 'msFiltTreinador'   && window._msFiltRebuildTreinador)   window._msFiltRebuildTreinador();
        if(id === 'msFiltConsultor'   && window._msFiltRebuildConsultor)   window._msFiltRebuildConsultor();
        if(id === 'msFiltPresenca'    && window._msFiltRebuildPresenca)    window._msFiltRebuildPresenca();
        if(id === 'msFiltTreinamento' && window._msFiltRebuildTreinamento) window._msFiltRebuildTreinamento();
      } catch(e){ console.warn('[ms-filt] lazy rebuild err', e); }
    }
    ms.classList.toggle('open', abrindo);
  };

  /* Menu kebab "···" (ações secundárias do card Clientes — Opção B) */
  window._cliMenuToggle = function(ev){
    if(ev && ev.stopPropagation) ev.stopPropagation();
    var menu = document.getElementById('cliBarMenu');
    if(!menu) return;
    var abrindo = !menu.classList.contains('open');
    /* fecha multi-selects abertos antes */
    document.querySelectorAll('.ms-filt.open, .ms-status.open').forEach(function(el){ el.classList.remove('open'); });
    menu.classList.toggle('open', abrindo);
    var trg = menu.querySelector('.cli-menu-trigger');
    if(trg) trg.setAttribute('aria-expanded', abrindo ? 'true' : 'false');
  };
  window._cliMenuClose = function(){
    var menu = document.getElementById('cliBarMenu');
    if(menu) menu.classList.remove('open');
  };

  /* Fecha clicando fora — multi-selects + menu kebab */
  document.addEventListener('click', function(ev){
    document.querySelectorAll('.ms-filt.open').forEach(function(ms){
      if(!ms.contains(ev.target)) ms.classList.remove('open');
    });
    var mk = document.getElementById('cliBarMenu');
    if(mk && mk.classList.contains('open') && !mk.contains(ev.target)){
      mk.classList.remove('open');
    }
  });
  /* Fecha com ESC */
  document.addEventListener('keydown', function(ev){
    if(ev.key !== 'Escape') return;
    document.querySelectorAll('.ms-filt.open, .cli-menu.open').forEach(function(ms){
      ms.classList.remove('open');
    });
  });

  /* ──────────────────────────────────────────────
     Helpers de popular opções
  ────────────────────────────────────────────── */
  function _renderPopover(id, opcoes, setRef, baseLabel, opts){
    opts = opts || {};
    var ms = document.getElementById(id);
    if(!ms) return;
    var pop = ms.querySelector('.ms-filt-pop');
    if(!pop) return;
    if(!opcoes || opcoes.length === 0){
      pop.innerHTML = '<div class="ms-filt-empty">Sem opções</div>';
      _atualizarLabel(id, setRef, baseLabel, 0);
      return;
    }

    var html = '<label class="ms-filt-opt ms-filt-all">'
      + '<input type="checkbox" data-ms-all="1">'
      + '<span>TODOS</span></label>'
      + '<div class="ms-filt-sep"></div>';

    opcoes.forEach(function(opt){
      // opt pode ser string (treinador/consultor) ou {v,l,icon,cor} (presença)
      var v, l, icon = '', cor = '';
      if(typeof opt === 'string'){
        v = opt; l = String(opt).toUpperCase();
      } else {
        v = opt.v; l = String(opt.l || opt.v).toUpperCase();
        icon = opt.icon || ''; cor = opt.cor || '';
      }
      var ct = '';
      if(opts.contagens && typeof opts.contagens[v] === 'number'){
        ct = '<span class="ct">'+opts.contagens[v]+'</span>';
      }
      var checked = setRef.has(v) ? ' checked' : '';
      var coratt = cor ? (' data-cor="'+cor+'"') : '';
      // Drag handle se a flag draggable estiver ativa
      var dragAttrs = opts.draggable ? ' draggable="true"' : '';
      var dragClass = opts.draggable ? ' ms-filt-opt-drag' : '';
      var handle = opts.draggable ? '<span class="ms-filt-handle" aria-hidden="true">⋮⋮</span>' : '';
      html += '<label class="ms-filt-opt'+dragClass+'"'+coratt+' data-val="'+_esc(v)+'"'+dragAttrs+'>'
        + handle
        + '<input type="checkbox" data-val="'+_esc(v)+'"'+checked+'>'
        + '<span>'+(icon?icon+' ':'')+_esc(l)+'</span>'
        + ct + '</label>';
    });

    pop.innerHTML = html;

    /* Liga handlers */
    var checks = pop.querySelectorAll('input[type=checkbox][data-val]');
    var allChk = pop.querySelector('input[type=checkbox][data-ms-all]');
    checks.forEach(function(c){
      c.addEventListener('change', function(){
        var v = c.getAttribute('data-val');
        if(c.checked) setRef.add(v);
        else setRef.delete(v);
        _onMudou(id, setRef, baseLabel, opcoes);
      });
    });
    if(allChk){
      allChk.addEventListener('change', function(){
        if(allChk.checked){
          // marca todos
          opcoes.forEach(function(opt){
            var v = (typeof opt === 'string') ? opt : opt.v;
            setRef.add(v);
          });
        } else {
          setRef.clear();
        }
        // CRITICAL: sincroniza VISUALMENTE os checkboxes individuais com o set.
        // Sem isso, "TODOS" só altera o Set mas os checkboxes na tela continuam como antes.
        checks.forEach(function(c){
          var v = c.getAttribute('data-val');
          c.checked = setRef.has(v);
        });
        _onMudou(id, setRef, baseLabel, opcoes);
      });
    }
    _atualizarLabel(id, setRef, baseLabel, opcoes.length);
    _atualizarAllChk(id, setRef, opcoes.length);

    /* Drag-and-drop dos items (opt-in via opts.draggable) */
    if(opts.draggable){
      var items = pop.querySelectorAll('.ms-filt-opt-drag');
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
            if(_reordenarTreinamento(dragSrc, alvo)){
              /* re-renderiza o popover com a nova ordem */
              window._msFiltRebuildTreinamento();
              /* mantém o popover aberto após reordenar */
              var ms = document.getElementById(id);
              if(ms && !ms.classList.contains('open')) ms.classList.add('open');
            }
          }
        });
      });
    }
  }

  function _onMudou(id, setRef, baseLabel, opcoes){
    _atualizarLabel(id, setRef, baseLabel, opcoes.length);
    _atualizarAllChk(id, setRef, opcoes.length);
    _sincronizarLegacy(id, setRef);
    if(typeof renderAll === 'function') renderAll();
  }

  function _atualizarLabel(id, setRef, baseLabel, total){
    var ms = document.getElementById(id);
    if(!ms) return;
    var trigger = ms.querySelector('.ms-filt-trigger');
    var lblEl = ms.querySelector('.ms-filt-label');
    if(!lblEl || !trigger) return;
    var n = setRef.size;
    // Limpa badge antigo (sempre, mesmo se vai re-inserir — evita duplicação)
    var badges = trigger.querySelectorAll('.ms-filt-badge');
    badges.forEach(function(b){ b.remove(); });
    if(n === 0 || n === total){
      lblEl.textContent = baseLabel;
      trigger.classList.remove('has-sel');
    } else if(n === 1){
      var v = Array.from(setRef)[0];
      lblEl.textContent = _formatarLabelSel(baseLabel, v);
      trigger.classList.add('has-sel');
    } else {
      lblEl.textContent = baseLabel;
      var badge = document.createElement('span');
      badge.className = 'ms-filt-badge';
      badge.textContent = String(n);
      var caret = trigger.querySelector('.ms-filt-caret');
      if(caret) trigger.insertBefore(badge, caret);
      else trigger.appendChild(badge);
      trigger.classList.add('has-sel');
    }
  }

  function _atualizarAllChk(id, setRef, total){
    var ms = document.getElementById(id);
    if(!ms) return;
    var all = ms.querySelector('input[type=checkbox][data-ms-all]');
    if(!all) return;
    all.checked = (setRef.size === total && total > 0);
    all.indeterminate = (setRef.size > 0 && setRef.size < total);
  }

  /* Mantém variáveis legadas (activeTrainer, activeConsultor,
     _filtroPresenca) coerentes para outros consumidores que ainda
     usam essas. Estratégia: se Set tem exatamente 1 item, escreve
     ele no legado; senão zera (filtered() prioriza Set). */
  function _sincronizarLegacy(id, setRef){
    var n = setRef.size;
    var unico = (n === 1) ? Array.from(setRef)[0] : null;
    if(id === 'msFiltTreinador'){
      window.activeTrainer = unico;
    } else if(id === 'msFiltConsultor'){
      window.activeConsultor = unico;
    } else if(id === 'msFiltPresenca'){
      // _filtroPresenca é privado em 17-presenca.js, usar setter público
      if(typeof window._setFiltroPresenca === 'function'){
        // garante que reflete o único selecionado (ou null se 0/N selecionados)
        var atual = (typeof window._getFiltroPresenca === 'function') ? window._getFiltroPresenca() : null;
        if(atual !== unico){
          /* _setFiltroPresenca faz toggle se valor for igual ao atual.
             Se atual = null e queremos seta um valor, basta chamar com unico.
             Se atual = X e queremos null, chamamos com X (toggle off). */
          if(unico !== null){
            // setar para unico
            if(atual !== null && atual !== unico){
              window._setFiltroPresenca(atual); // toggle off do antigo
              window._setFiltroPresenca(unico); // seta novo
            } else if(atual === null){
              window._setFiltroPresenca(unico);
            }
          } else if(atual !== null){
            window._setFiltroPresenca(atual); // toggle off
          }
        }
      }
    }
  }

  /* "PRESENTE" em vez de "presente" para o label do botão quando 1 selecionado */
  function _formatarLabelSel(baseLabel, valor){
    var v = String(valor||'').toUpperCase();
    if(baseLabel.indexOf('PRESENÇA') !== -1){
      var icones = { 'PRESENTE':'✓', 'FALTA':'✕', 'PENDENTE':'⏳' };
      return (icones[v] || '✓') + ' ' + v;
    }
    return v;
  }

  function _esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* ──────────────────────────────────────────────
     Calcula contagens (clientes por treinador/consultor/presença)
     Olha `data` global; ignora filtros ativos (mostra total disponível).
  ────────────────────────────────────────────── */
  function _contagensTreinador(){
    var map = {};
    if(typeof data === 'undefined') return map;
    data.forEach(function(d){
      if(!d || !d.cliente || !d.treinador || d.treinador === '-') return;
      map[d.treinador] = (map[d.treinador] || 0) + 1;
    });
    return map;
  }
  function _contagensConsultor(){
    var map = {};
    if(typeof data === 'undefined') return map;
    data.forEach(function(d){
      if(!d || !d.cliente || !d.consultor) return;
      map[d.consultor] = (map[d.consultor] || 0) + 1;
    });
    return map;
  }
  function _contagensPresenca(){
    var map = { presente: 0, falta: 0, pendente: 0 };
    if(typeof data === 'undefined') return map;
    data.forEach(function(d){
      if(!d || !d.cliente) return;
      var p = d.presenca || 'pendente';
      if(map[p] !== undefined) map[p]++;
    });
    return map;
  }
  /* Acesso defensivo a data e allTreinamentos. Ordem:
     1) getter dinâmico exposto pelo 02-main.js (sempre atualizado)
     2) variável global direta (acesso ao Script Global Scope)
     3) window.x (fallback final) */
  function _getData(){
    if(typeof window.__getData === 'function'){
      var d = window.__getData();
      if(Array.isArray(d)) return d;
    }
    try { if(typeof data !== 'undefined' && Array.isArray(data)) return data; } catch(e){}
    return Array.isArray(window.data) ? window.data : [];
  }
  function _getAllTreinamentosOficiais(){
    if(Array.isArray(window.allTreinamentos)) return window.allTreinamentos.slice();
    try { if(typeof allTreinamentos !== 'undefined' && Array.isArray(allTreinamentos)) return allTreinamentos.slice(); } catch(e){}
    return [];
  }

  /* Treinamentos: conta clientes POR TREINAMENTO PRIMÁRIO (d.treinamento),
     que é o que aparece na coluna TREINAMENTO da lista. Coerente com o filtro
     estrito do _matchTreinamento em 02-main.js (filtra só pelo primário).
     Clientes sem treinamento vão para a chave '—'. */
  function _contagensTreinamento(){
    var map = {};
    var arr = _getData();
    arr.forEach(function(d){
      if(!d || !d.cliente) return;
      var t = (d.treinamento && String(d.treinamento).trim()) ? String(d.treinamento).trim() : '';
      if(!t || t === '-' || t === '—'){ map['—'] = (map['—'] || 0) + 1; return; }
      map[t] = (map[t] || 0) + 1;
    });
    return map;
  }

  /* ────────────────────────────────────────────────────────────
     ORDEM customizável dos treinamentos (drag-and-drop + localStorage)
     Padrão inicial definido pelo usuário, mas user pode reordenar
     arrastando os items no popover. Ordem persiste em localStorage.
  ──────────────────────────────────────────────────────────── */
  var ORDEM_TREINAMENTOS_DEFAULT = [
    'CI', 'BHP', 'CEOP', 'FCIS', 'FGPC', 'IF', 'ML5', 'TAV',
    'MASTER COACHING',
    'TCE - BRONZE', 'TCE - OURO', 'TCE - BLACK', 'TCE - VIP',
    'CIS', 'CIS_GLOBAL', 'MAESTRIA',
    'MENT. IA PARA NEGOCIOS',
    'JE', 'GE', 'PDA', 'DP', 'TEAM COACHING'
  ];
  var LS_KEY_ORDEM = 'ms_filt_ordem_treinamentos_v1';

  function _carregarOrdem(){
    try {
      var raw = localStorage.getItem(LS_KEY_ORDEM);
      if(!raw) return ORDEM_TREINAMENTOS_DEFAULT.slice();
      var arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length ? arr : ORDEM_TREINAMENTOS_DEFAULT.slice();
    } catch(e){ return ORDEM_TREINAMENTOS_DEFAULT.slice(); }
  }
  function _salvarOrdem(arr){
    try { localStorage.setItem(LS_KEY_ORDEM, JSON.stringify(arr)); } catch(e){}
  }
  var ORDEM_TREINAMENTOS = _carregarOrdem();

  function _treinamentosDisponiveis(){
    var oficiais = _getAllTreinamentosOficiais();
    // "—" é tratado como item válido (representa "sem treinamento"), pode ser
    // reordenado junto com os oficiais via drag-drop.
    var validosSet = new Set(oficiais); validosSet.add('—');
    var resultado = [];
    // 1) Adiciona na ORDEM customizada (só os válidos)
    ORDEM_TREINAMENTOS.forEach(function(t){
      if(validosSet.has(t)) resultado.push(t);
    });
    // 2) Adiciona oficiais que NÃO estão em ORDEM (no final)
    oficiais.forEach(function(t){
      if(ORDEM_TREINAMENTOS.indexOf(t) === -1) resultado.push(t);
    });
    // 3) Garante o "—" no final se ainda não estiver
    if(resultado.indexOf('—') === -1) resultado.push('—');
    return resultado;
  }

  /* Reordena ORDEM_TREINAMENTOS movendo `arrastado` para a posição de `alvo` */
  function _reordenarTreinamento(arrastado, alvo){
    if(!arrastado || !alvo || arrastado === alvo) return false;
    // Pega a ordem atual COMPLETA (incluindo extras que vieram pelo passo 2)
    var atual = _treinamentosDisponiveis();
    var iArrastado = atual.indexOf(arrastado);
    var iAlvo = atual.indexOf(alvo);
    if(iArrastado < 0 || iAlvo < 0) return false;
    atual.splice(iArrastado, 1);
    // ajusta índice do alvo se o arrastado vier antes
    var insertIdx = atual.indexOf(alvo);
    // se está soltando ABAIXO do alvo, insere depois
    if(iArrastado < iAlvo) insertIdx += 1;
    atual.splice(insertIdx, 0, arrastado);
    ORDEM_TREINAMENTOS = atual;
    _salvarOrdem(ORDEM_TREINAMENTOS);
    return true;
  }

  /* ──────────────────────────────────────────────
     APIs públicas para reconstruir os popovers
     (chamadas pelos hooks de buildFilterBtns / _renderFiltrosPresenca)
  ────────────────────────────────────────────── */
  window._msFiltRebuildTreinador = function(){
    var lista = (typeof allTrainers !== 'undefined' && Array.isArray(allTrainers))
      ? allTrainers.filter(function(t){ return t && t !== '-'; })
      : [];
    _renderPopover('msFiltTreinador', lista, window.activeTrainerSet, '👤 TREINADOR', {
      contagens: _contagensTreinador()
    });
  };

  window._msFiltRebuildConsultor = function(){
    var lista = (typeof allConsultors !== 'undefined' && Array.isArray(allConsultors))
      ? allConsultors.slice()
      : [];
    _renderPopover('msFiltConsultor', lista, window.activeConsultorSet, '💼 CONSULTOR', {
      contagens: _contagensConsultor()
    });
  };

  window._msFiltRebuildPresenca = function(){
    var opcoes = [
      { v:'pendente', l:'Pendente', icon:'⏳', cor:'amber' },
      { v:'presente', l:'Presente', icon:'✓',  cor:'green' },
      { v:'falta',    l:'Falta',    icon:'✕',  cor:'red' }
    ];
    _renderPopover('msFiltPresenca', opcoes, window.activePresencaSet, '✓ PRESENÇA', {
      contagens: _contagensPresenca()
    });
  };

  window._msFiltRebuildTreinamento = function(){
    // "—" já vem dentro da lista (tratado em _treinamentosDisponiveis),
    // portanto também é arrastável e sua posição persiste em localStorage.
    var lista = _treinamentosDisponiveis();
    _renderPopover('msFiltTreinamento', lista, window.activeTreinamentoSet, 'TREINAMENTO', {
      contagens: _contagensTreinamento(),
      draggable: true   /* permite arrastar items para reordenar */
    });
  };

  window._msFiltRebuildAll = function(){
    window._msFiltRebuildTreinador();
    window._msFiltRebuildConsultor();
    window._msFiltRebuildPresenca();
    window._msFiltRebuildTreinamento();
  };

  /* ──────────────────────────────────────────────
     Hook: quando buildFilterBtns ou _renderFiltrosPresenca rodam,
     reconstruímos os popovers junto. Sem quebrar a API antiga.
  ────────────────────────────────────────────── */
  function _wrapHooks(){
    var origBuild = window.buildFilterBtns;
    if(typeof origBuild === 'function' && !origBuild._msWrapped){
      window.buildFilterBtns = function(){
        var r = origBuild.apply(this, arguments);
        try {
          window._msFiltRebuildTreinador();
          window._msFiltRebuildConsultor();
          window._msFiltRebuildTreinamento();   // ← agora inclui Treinamento
        } catch(e){ console.warn('[ms-filt] rebuild err', e); }
        return r;
      };
      window.buildFilterBtns._msWrapped = true;
    }
    var origPres = window._renderFiltrosPresenca;
    if(typeof origPres === 'function' && !origPres._msWrapped){
      window._renderFiltrosPresenca = function(){
        var r = origPres.apply(this, arguments);
        try { window._msFiltRebuildPresenca(); }
        catch(e){ console.warn('[ms-filt] rebuild presenca err', e); }
        return r;
      };
      window._renderFiltrosPresenca._msWrapped = true;
    }
  }

  /* O 02-main.js carrega antes; o 17-presenca.js também. Mesmo assim,
     fazemos retry caso ainda não esteja exposto. */
  function _bootstrap(){
    _wrapHooks();
    // Faz primeira renderização (caso a turma já esteja ativa)
    try { window._msFiltRebuildAll(); } catch(e){}
  }
  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(_bootstrap, 300);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(_bootstrap, 300); });
  }
  // Hook também via RTBus quando turma muda (re-puxa contagens corretas)
  if(window.RTBus){
    window.RTBus.on('turma:enter', function(){
      setTimeout(function(){ try { window._msFiltRebuildAll(); } catch(e){} }, 1200);
    });
  }
})();
