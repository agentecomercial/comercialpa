/* ═══════════════════════════════════════════════════════════════════
   TURMA · MOBILE ACCORDION (Consultor + Treinador)
   ───────────────────────────────────────────────────────────────────
   Módulo isolado em IIFE. Não altera nenhuma função existente — só
   adiciona headers de accordion DOM ANTES dos containers já criados
   pelo dashboard original. Em desktop, é totalmente no-op.

   ATIVAÇÃO:
   - Acontece somente quando viewport ≤ 768px (matches mediaquery)
   - Em resize, sai/re-entra automaticamente (sem recarregar)
   - Re-aplica via MutationObserver caso o conteúdo seja re-renderizado

   ESTADO PRESERVADO:
   - Estado dos accordions guardado em sessionStorage por tipo
     (consultor/treinador), mantém ao trocar de aba.
   - Default: ambos abertos.
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var MEDIA = window.matchMedia('(max-width: 768px)');
  var SECOES = [
    { tipoBase: 'consultor', wrapId: 'consultorLayoutWrap', cardsId: 'consultorCards', rankId: 'consultorRankingPanel',
      cardsTit: '👥 Consultores', rankTit: '🏆 Ranking · Faturado' },
    { tipoBase: 'treinador', wrapId: 'treinadorLayoutWrap', cardsId: 'treinadorCards', rankId: 'treinadorRankingPanel',
      cardsTit: '🎓 Treinadores', rankTit: '🏆 Ranking · Faturado' }
  ];

  /* ── Helpers ── */
  function _isMobile(){ return MEDIA.matches; }
  function _stateKey(tipo, secao){ return 'tma_' + tipo + '_' + secao; }
  function _saveState(tipo, secao, open){
    try { sessionStorage.setItem(_stateKey(tipo, secao), open ? '1' : '0'); } catch(e){}
  }
  function _loadState(tipo, secao){
    try {
      var v = sessionStorage.getItem(_stateKey(tipo, secao));
      if(v === null) return true; /* default aberto */
      return v === '1';
    } catch(e){ return true; }
  }

  /* ── Contagem auxiliar pra mostrar no header ── */
  function _contaConsultores(container){
    if(!container) return 0;
    /* Conta filhos diretos que parecem cards (têm conteúdo) */
    return Array.prototype.filter.call(container.children, function(el){
      return el.nodeType === 1 && el.children.length > 0;
    }).length;
  }
  function _extraiRankingTotal(rankPanel){
    if(!rankPanel) return '';
    /* O título do panel costuma ter o valor — pega o segundo span/texto */
    var tit = rankPanel.querySelector('.spanel-title');
    if(!tit) return '';
    var match = (tit.innerHTML || '').match(/R\$\s*[\d.,]+/);
    return match ? match[0] : '';
  }

  /* ── Cria header de uma seção ── */
  function _criarHeader(tipo, secao, emojiTit, infoExtra){
    var partes = (emojiTit || '').match(/^(\S+)\s+(.+)$/) || [null, '📋', emojiTit];
    var emoji = partes[1];
    var titulo = partes[2];
    var hdr = document.createElement('div');
    hdr.className = 'tma-h';
    hdr.setAttribute('role', 'button');
    hdr.setAttribute('aria-expanded', 'true');
    hdr.dataset.tmaTipo = tipo;
    hdr.dataset.tmaSecao = secao;
    hdr.innerHTML = ''
      + '<span class="tma-ico">▸</span>'
      + '<span class="tma-emoji">' + emoji + '</span>'
      + '<span class="tma-t">' + titulo + '</span>'
      + '<span class="tma-s">' + (infoExtra || '') + '</span>';
    return hdr;
  }

  /* ── Aplica/atualiza headers numa seção (consultor ou treinador) ── */
  function _aplicarSecao(s){
    var wrap = document.getElementById(s.wrapId);
    if(!wrap) return;
    wrap.classList.add('tma-mobile');

    var cards = document.getElementById(s.cardsId);
    var rank  = document.getElementById(s.rankId);

    /* Header dos CARDS */
    if(cards && !cards.previousElementSibling || (cards.previousElementSibling && !cards.previousElementSibling.classList.contains('tma-h'))){
      var qtd = _contaConsultores(cards);
      var hdrC = _criarHeader(s.tipoBase, 'cards', s.cardsTit, qtd ? '<b>' + qtd + '</b> total' : '');
      cards.parentNode.insertBefore(hdrC, cards);
      _bindHeader(hdrC, cards);
    } else if(cards && cards.previousElementSibling && cards.previousElementSibling.classList.contains('tma-h')){
      /* Atualiza contagem (caso tenha mudado) */
      var hdrCExist = cards.previousElementSibling;
      var qtdNow = _contaConsultores(cards);
      var sEl = hdrCExist.querySelector('.tma-s');
      if(sEl) sEl.innerHTML = qtdNow ? '<b>' + qtdNow + '</b> total' : '';
    }

    /* Header do RANKING */
    if(rank && (!rank.previousElementSibling || !rank.previousElementSibling.classList.contains('tma-h'))){
      var total = _extraiRankingTotal(rank);
      var hdrR = _criarHeader(s.tipoBase, 'ranking', s.rankTit, total ? '<b>' + total + '</b>' : '');
      rank.parentNode.insertBefore(hdrR, rank);
      _bindHeader(hdrR, rank);
    } else if(rank && rank.previousElementSibling && rank.previousElementSibling.classList.contains('tma-h')){
      var hdrRExist = rank.previousElementSibling;
      var totalNow = _extraiRankingTotal(rank);
      var sElR = hdrRExist.querySelector('.tma-s');
      if(sElR && totalNow) sElR.innerHTML = '<b>' + totalNow + '</b>';
    }

    /* Restaura estado salvo */
    _restaurarEstado(s.tipoBase, 'cards', cards);
    _restaurarEstado(s.tipoBase, 'ranking', rank);
  }

  function _restaurarEstado(tipo, secao, alvo){
    if(!alvo) return;
    var open = _loadState(tipo, secao);
    var hdr = alvo.previousElementSibling;
    if(hdr && hdr.classList && hdr.classList.contains('tma-h')){
      hdr.classList.toggle('tma-open', open);
      hdr.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    alvo.classList.toggle('tma-collapsed', !open);
  }

  function _bindHeader(hdr, alvo){
    hdr.addEventListener('click', function(){
      var aberto = !hdr.classList.contains('tma-open');
      hdr.classList.toggle('tma-open', aberto);
      hdr.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      alvo.classList.toggle('tma-collapsed', !aberto);
      _saveState(hdr.dataset.tmaTipo, hdr.dataset.tmaSecao, aberto);
    });
  }

  /* ── Aplica em todas as seções ── */
  function _aplicar(){
    if(!_isMobile()) return;
    SECOES.forEach(_aplicarSecao);
    _aplicarCardsIndividuais();
  }

  /* ────────────────────────────────────────────────────────────────
     ACCORDION POR CARD INDIVIDUAL
     Default: cada card colapsado mostrando só avatar + nome + seta.
     Click no card (ou na seta) alterna entre colapsado/expandido.
     Preserva a função original openConsultorDetail/openTreinadorDetail
     guardando o onclick em data-attribute (restaurada no desktop).
     ──────────────────────────────────────────────────────────────── */
  function _aplicarCardsIndividuais(){
    if(!_isMobile()) return;
    ['consultorCards', 'treinadorCards'].forEach(function(contId){
      var cont = document.getElementById(contId);
      if(!cont) return;
      var tipo = contId.replace('Cards', '');
      cont.querySelectorAll('.person-card').forEach(function(card){
        _aplicarCardIndividual(card, tipo);
      });
    });
  }

  function _aplicarCardIndividual(card, tipo){
    if(card.dataset.tmaCard === '1') return; /* já aplicado */
    card.dataset.tmaCard = '1';

    /* Extrai nome do consultor/treinador via onclick original.
       Padrão: onclick="openConsultorDetail('NOME')" ou similar.
       IMPORTANTE: NÃO remover o onclick — clique no corpo do card
       ainda precisa abrir o modal de clientes (openConsultorDetail).
       Só interceptamos o clique na seta (stopPropagation evita
       que o evento chegue ao onclick do card). */
    var orig = card.getAttribute('onclick') || '';
    var match = orig.match(/['"]([^'"]+)['"]/);
    var nome = match ? match[1] : ('item-' + Math.random().toString(36).slice(2,7));

    card.dataset.tmaNome = nome;

    /* Marca o div do contador de clientes pra esconder via CSS quando colapsado.
       Heurística: 1º filho com position:absolute no canto direito. */
    var primeiroFilho = card.firstElementChild;
    if(primeiroFilho && primeiroFilho.style && primeiroFilho.style.position === 'absolute'){
      primeiroFilho.classList.add('tma-hide-collapsed');
    }
    /* Marca os "espaçadores" e medalha grande (último filho que é só medalha) */
    Array.prototype.forEach.call(card.children, function(child){
      var style = child.getAttribute('style') || '';
      /* Espaço vertical vazio */
      if(/margin\s*:\s*10px\s*0\s*20px/.test(style)){
        child.classList.add('tma-hide-collapsed');
      }
      /* Medalha gigante (font-size:60px) */
      if(/font-size\s*:\s*60px/.test(style)){
        child.classList.add('tma-hide-collapsed');
      }
    });

    /* Cria a seta — único elemento que alterna o accordion.
       Clique no corpo do card continua disparando openConsultorDetail
       (o onclick original do card permanece intacto). */
    var arrow = document.createElement('button');
    arrow.type = 'button';
    arrow.className = 'tma-card-arrow';
    arrow.innerHTML = '▸';
    arrow.title = 'Expandir / recolher detalhes inline';
    arrow.setAttribute('aria-label', 'Expandir');
    arrow.addEventListener('click', function(e){
      /* stopPropagation evita que o evento chegue ao onclick do card
         (que abriria o modal de clientes). */
      e.stopPropagation();
      e.preventDefault();
      _toggleCard(card, tipo, nome);
    });
    card.appendChild(arrow);

    /* Restaura estado salvo (default: colapsado) */
    var aberto = _loadStateCard(tipo, nome);
    if(aberto){
      card.classList.add('tma-card-expanded');
      arrow.classList.add('tma-arrow-rot');
      arrow.setAttribute('aria-label', 'Recolher');
    }
  }

  function _toggleCard(card, tipo, nome){
    var aberto = card.classList.toggle('tma-card-expanded');
    var arrow = card.querySelector('.tma-card-arrow');
    if(arrow){
      arrow.classList.toggle('tma-arrow-rot', aberto);
      arrow.setAttribute('aria-label', aberto ? 'Recolher' : 'Expandir');
    }
    _saveStateCard(tipo, nome, aberto);
  }

  /* State per-card */
  function _stateKeyCard(tipo, nome){ return 'tma_card_' + tipo + '_' + nome; }
  function _saveStateCard(tipo, nome, open){
    try { sessionStorage.setItem(_stateKeyCard(tipo, nome), open ? '1' : '0'); } catch(e){}
  }
  function _loadStateCard(tipo, nome){
    try {
      var v = sessionStorage.getItem(_stateKeyCard(tipo, nome));
      if(v === null) return false; /* default colapsado pra melhorar filtro */
      return v === '1';
    } catch(e){ return false; }
  }

  /* Desfaz cards individuais (volta pra desktop).
     Como nunca removemos o onclick original, basta limpar o que
     adicionamos: a seta, as classes e os data-attrs. */
  function _desfazerCardsIndividuais(){
    document.querySelectorAll('.person-card[data-tma-card="1"]').forEach(function(card){
      var arrow = card.querySelector('.tma-card-arrow');
      if(arrow && arrow.parentNode) arrow.parentNode.removeChild(arrow);
      card.classList.remove('tma-card-expanded');
      card.querySelectorAll('.tma-hide-collapsed').forEach(function(el){
        el.classList.remove('tma-hide-collapsed');
      });
      delete card.dataset.tmaCard;
      delete card.dataset.tmaNome;
    });
  }

  /* ── Desfaz no desktop (limpa headers e classes) ── */
  function _desfazer(){
    document.querySelectorAll('.tma-h').forEach(function(h){
      try{ h.parentNode.removeChild(h); }catch(e){}
    });
    SECOES.forEach(function(s){
      var wrap = document.getElementById(s.wrapId);
      if(wrap) wrap.classList.remove('tma-mobile');
      ['cardsId','rankId'].forEach(function(k){
        var el = document.getElementById(s[k]);
        if(el) el.classList.remove('tma-collapsed');
      });
    });
    _desfazerCardsIndividuais();
  }

  /* ── Observer pra detectar re-renders do conteúdo dinâmico ── */
  var _observer = null;
  function _observar(){
    if(_observer) return;
    SECOES.forEach(function(s){
      var cards = document.getElementById(s.cardsId);
      var rank  = document.getElementById(s.rankId);
      if(!_observer && window.MutationObserver){
        _observer = new MutationObserver(function(){
          if(_isMobile()) _aplicar();
        });
      }
      if(_observer){
        if(cards) _observer.observe(cards, { childList: true, subtree: false });
        if(rank)  _observer.observe(rank,  { childList: true, subtree: false });
      }
    });
  }

  /* ── Inicialização ── */
  function _init(){
    if(_isMobile()) _aplicar();
    _observar();
  }

  /* Reage a mudança de tamanho (rotação, redimensionamento DevTools) */
  function _onMediaChange(e){
    if(e.matches) _aplicar();
    else _desfazer();
  }
  if(MEDIA.addEventListener) MEDIA.addEventListener('change', _onMediaChange);
  else if(MEDIA.addListener) MEDIA.addListener(_onMediaChange);

  /* Aplica em vários momentos para cobrir renderização async */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
  window.addEventListener('load', _init);

  /* Re-aplica periódica leve (cobre casos de re-render sem mutation observable) */
  setInterval(function(){
    if(_isMobile()) _aplicar();
  }, 1500);

})();
