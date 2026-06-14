/* ═══════════════════════════════════════════════════════════
   57-treinador-mobile-cards.js
   Renderização mobile da lista de clientes no detalhe do treinador.
   Espelha 1:1 o padrão do consultor (#consultorDetailCards).
   Extraído deste arquivo separado para isolar template strings
   complexas do tokenizer do pre-commit hook.
═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var _STATUS_MAP = {
    pago:       { c: 'var(--pago)',   l: 'Pago'       },
    aberto:     { c: 'var(--amber)',  l: 'Aberto'     },
    negociacao: { c: 'var(--blue)',   l: 'Negociação' },
    entrada:    { c: 'var(--accent)', l: 'Entrada'    },
    desistiu:   { c: 'var(--red)',    l: 'Desistiu'   },
    estorno:    { c: 'var(--red)',    l: 'Estorno'    },
    '-':        { c: 'var(--muted)',  l: 'Sem status' }
  };

  function _entOf(d){
    if(typeof window._entradaPendenteDoCliente === 'function'){
      return window._entradaPendenteDoCliente(d);
    }
    return (d && d.entrada) || 0;
  }

  function _ticketCor(v){
    if(v >= 10000.01) return 'var(--green)';
    if(v >= 5001)     return 'var(--amber)';
    if(v > 0)         return 'var(--blue)';
    return 'var(--muted)';
  }

  function _campoBlock(label, valor, cor){
    if(!valor) return '';
    var corStyle = cor ? ('color:'+cor+';') : 'color:var(--muted);';
    return '<div class="mob-field">'
         +   '<span class="mob-field-label">'+label+'</span>'
         +   '<span style="font-size:11px;'+corStyle+'text-transform:uppercase;">'+valor+'</span>'
         + '</div>';
  }

  function _renderCard(d){
    var idx  = (typeof data !== 'undefined') ? data.indexOf(d) : -1;
    var pago = d.status === 'pago';
    var st   = _STATUS_MAP[d.status || 'aberto'] || _STATUS_MAP['-'];
    var ent  = _entOf(d);
    var ticketC = pago ? 'var(--pago)' : _ticketCor(d.valor || 0);
    var presBadge = window._presencaBadgeHtml ? window._presencaBadgeHtml(idx) : '';
    var valor = (typeof formatVal === 'function') ? formatVal(d.valor || 0) : ('R$ ' + (d.valor || 0));
    var consultorTxt = (d.consultor && d.consultor !== '-') ? d.consultor.toUpperCase() : '';
    var treinamentoTxt = (d.treinamento && d.treinamento !== '-') ? d.treinamento : '';
    var entradaTxt = ent > 0 ? ('↑ ' + ((typeof formatVal === 'function') ? formatVal(ent) : ent)) : '';

    var nomeEscapado = d.cliente.split("'").join("\\'");
    var plusBtn = '<button class="mob-plus-btn" '
               +    'onclick="event.stopPropagation();window._abrirMenuCliente&amp;&amp;window._abrirMenuCliente(event,\''+nomeEscapado+'\','+idx+')" '
               +    'title="Adicionar / Editar / Ver informações">+</button>';

    var html = '<div class="mob-card' + (pago ? ' pago' : '') + '" id="tdmobcard_' + idx + '">';
    html += '<div class="mob-header" onclick="window._toggleTreCliMobile(' + idx + ')">';
    html +=   '<span class="mob-arrow">▶</span>';
    html +=   '<div class="mob-info">';
    html +=     '<div class="mob-name-row">';
    html +=       '<span class="mob-name' + (pago ? ' pago' : '') + '">' + d.cliente + '</span>';
    html +=       '<span class="mob-presenca" data-presenca-ri="' + idx + '">' + presBadge + '</span>';
    html +=       plusBtn;
    html +=     '</div>';
    html +=     '<div class="mob-status" style="color:' + st.c + ';">';
    html +=       '<span class="mob-dot" style="background:' + st.c + ';"></span>' + st.l;
    html +=     '</div>';
    html +=   '</div>';
    html +=   '<div class="mob-val" style="color:' + ticketC + ';">' + valor + '</div>';
    html += '</div>';
    html += '<div class="mob-body">';
    html +=   _campoBlock('Consultor',   consultorTxt,   'var(--muted)');
    html +=   _campoBlock('Treinamento', treinamentoTxt, 'var(--accent)');
    if(ent > 0){
      html += '<div class="mob-field">'
            +   '<span class="mob-field-label">Entrada</span>'
            +   '<span style="font-size:12px;color:var(--green);font-weight:600;">' + entradaTxt + '</span>'
            + '</div>';
    }
    html += '<button onclick="openModal(' + idx + ')" '
          +   'style="margin-top:6px;width:100%;font-size:11px;font-weight:700;padding:8px 0;border-radius:6px;border:1px solid rgba(200,240,90,.3);background:rgba(200,240,90,.08);color:var(--accent);cursor:pointer;">'
          +   '✏ Editar cliente'
          + '</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  /* ── API pública ── */
  window._renderTreinadorMobileCards = function(lista){
    var wrap = document.getElementById('treinadorDetailCards');
    if(!wrap) return;
    if(!lista || !lista.length){
      wrap.innerHTML = '<div class="mob-empty">Nenhum cliente para este filtro.</div>';
      return;
    }
    var partes = [];
    for(var i = 0; i < lista.length; i++){
      partes.push(_renderCard(lista[i]));
    }
    wrap.innerHTML = partes.join('');
  };

  /* Toggle (1 aberto por vez) — espelho do _toggleConsCliMobile do consultor */
  window._toggleTreCliMobile = function(ri){
    var card = document.getElementById('tdmobcard_' + ri);
    if(!card) return;
    var aberto = card.classList.contains('open');
    var todos = document.querySelectorAll('#treinadorDetailCards .mob-card.open');
    for(var i = 0; i < todos.length; i++){
      todos[i].classList.remove('open');
    }
    if(!aberto) card.classList.add('open');
  };

})();
