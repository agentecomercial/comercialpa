/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Módulo CADÊNCIA DE FEEDBACK (Fase A)
   Acompanha quem está atrasado, hoje, próximo no ritmo de pulses.

   Schema (Firebase):
     icCadencia/{consultorUid}/
       proximoPulse:    'YYYY-MM-DD'   (auto: ultimoFeedback + 15 dias)
       proximoCompleto: 'YYYY-MM-DD'   (auto: a cada 45 dias)
       proximoPdi:      'YYYY-MM-DD'   (auto: a cada 90 dias)
       ultimoFeedback:  'YYYY-MM-DD'
       contadorPulses:  3              (zera ao salvar Completo)
       pausado:         false
       pausadoEm:       null

   API:
     window._icCadenciaRecalc(consultorUid, ultimoTipo, ultimaData)
       — chamado pelo Feedback ao salvar (auto-update no Firebase)
     window._icCadenciaAbrirPainel()
       — abre modal "Pulses da semana"
     window._icCadenciaPausar(consultorUid, motivo)
     window._icCadenciaRetomar(consultorUid)

   UI:
     - Botão "📅 Pulses" na aba Desenvolvimento (header)
     - Badge global no topo da IC: "⚠ N atrasados"
     - Modal "Pulses da semana" com 4 grupos
═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* Periodicidade (dias corridos) */
  var DIAS_PULSE = 15;
  var DIAS_COMPLETO = 45;   /* 3 pulses */
  var DIAS_PDI = 90;        /* 6 pulses */

  /* Helper de data (usa o exposto pelo PDI; fallback local) */
  function _addDias(base, n){
    if(typeof window._icAddDias === 'function') return window._icAddDias(base, n);
    var d = base instanceof Date ? new Date(base) : new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  }
  function _fmtBR(d){
    if(typeof window._icFmtDataBR === 'function') return window._icFmtDataBR(d);
    if(!d) return '—';
    var dd = d instanceof Date ? d : new Date(d);
    return String(dd.getDate()).padStart(2,'0')+'/'+String(dd.getMonth()+1).padStart(2,'0')+'/'+dd.getFullYear();
  }
  function _ymd(d){
    var dd = d instanceof Date ? d : new Date(d);
    return dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');
  }
  function _diffDias(a, b){
    var d1 = new Date(typeof a === 'string' ? a : _ymd(a));
    var d2 = new Date(typeof b === 'string' ? b : _ymd(b));
    return Math.round((d2.getTime() - d1.getTime()) / 86400000);
  }
  function _hojeYmd(){ return _ymd(new Date()); }

  /* Classifica uma data em relação a hoje (estados visuais) */
  function _classificar(ymd){
    if(!ymd) return { tag:'sem', cor:'#9ca3af', label:'sem cadência', diff:null };
    var diff = _diffDias(_hojeYmd(), ymd);
    if(diff < 0)   return { tag:'atrasado', cor:'#ef4444', label:'atrasado '+(-diff)+'d', diff:diff };
    if(diff === 0) return { tag:'hoje',     cor:'#f59e0b', label:'hoje', diff:diff };
    if(diff <= 3)  return { tag:'breve',    cor:'#3b82f6', label:'em '+diff+'d', diff:diff };
    if(diff <= 7)  return { tag:'semana',   cor:'#34d399', label:'em '+diff+'d', diff:diff };
    return            { tag:'futuro',   cor:'#9ca3af', label:'em '+diff+'d', diff:diff };
  }

  /* ── Recálculo após salvar feedback ──
     Chamado pelo Feedback (window._icCadenciaRecalc(uid, tipo, dataYmd)).
     Calcula próximos pulse/completo/PDI a partir da data fornecida. */
  window._icCadenciaRecalc = function(consultorUid, ultimoTipo, ultimaData){
    if(!consultorUid || typeof window._fbSave !== 'function') return Promise.resolve();
    if(!ultimaData) ultimaData = _hojeYmd();
    return window._fbGet('icCadencia/'+consultorUid).catch(function(){return null;}).then(function(cad){
      cad = cad || {};
      var base = new Date(ultimaData);
      cad.ultimoFeedback = ultimaData;
      cad.ultimoTipo = ultimoTipo || 'pulse';

      /* Contador de pulses zera no Completo ou PDI */
      if(ultimoTipo === 'completo' || ultimoTipo === 'pdi'){
        cad.contadorPulses = 0;
      } else {
        cad.contadorPulses = (+(cad.contadorPulses||0)) + 1;
      }

      cad.proximoPulse    = _ymd(_addDias(base, DIAS_PULSE));
      /* Próximo Completo: se já passou 3 pulses recém, reseta o ciclo */
      if(cad.contadorPulses >= 3){
        cad.proximoCompleto = _ymd(_addDias(base, DIAS_PULSE));  /* próximo pulse JÁ é completo */
      } else {
        cad.proximoCompleto = _ymd(_addDias(base, DIAS_COMPLETO - (cad.contadorPulses * DIAS_PULSE)));
      }
      cad.proximoPdi = _ymd(_addDias(base, DIAS_PDI - ((cad.contadorPulses||0) * DIAS_PULSE)));

      if(typeof cad.pausado !== 'boolean') cad.pausado = false;

      return window._fbSave('icCadencia/'+consultorUid, cad).then(function(){
        return cad;
      });
    });
  };

  window._icCadenciaPausar = function(consultorUid, motivo){
    if(!consultorUid) return;
    if(typeof window._fbGet !== 'function') return;
    window._fbGet('icCadencia/'+consultorUid).then(function(cad){
      cad = cad || {};
      cad.pausado = true;
      cad.pausadoEm = new Date().toISOString();
      cad.pausadoMotivo = motivo || '';
      window._fbSave('icCadencia/'+consultorUid, cad);
      if(typeof window._showToast === 'function') window._showToast('⏸ Cadência pausada', 'var(--amber)');
    });
  };

  window._icCadenciaRetomar = function(consultorUid){
    if(!consultorUid) return;
    if(typeof window._fbGet !== 'function') return;
    window._fbGet('icCadencia/'+consultorUid).then(function(cad){
      cad = cad || {};
      cad.pausado = false;
      cad.pausadoEm = null;
      cad.pausadoMotivo = '';
      window._fbSave('icCadencia/'+consultorUid, cad);
      if(typeof window._showToast === 'function') window._showToast('▶ Cadência retomada', 'var(--accent)');
    });
  };

  /* ── Carrega cadência de TODOS os consultores em paralelo ── */
  function _carregarTodas(){
    if(typeof window._fbGet !== 'function') return Promise.resolve({});
    return window._fbGet('icCadencia').then(function(d){ return d || {}; }).catch(function(){ return {}; });
  }
  function _carregarUsuarios(){
    if(typeof window._fbGet !== 'function') return Promise.resolve({});
    return window._fbGet('usuarios').then(function(d){ return d || {}; }).catch(function(){ return {}; });
  }

  /* ── Painel consolidado "Pulses da semana" ── */
  window._icCadenciaAbrirPainel = function(){
    var modal = document.getElementById('icCadenciaModal');
    if(!modal){
      console.warn('[ic-cadencia] modal não existe no DOM');
      return;
    }
    modal.classList.add('open');
    _renderPainel();
  };
  window._icCadenciaFecharPainel = function(){
    var modal = document.getElementById('icCadenciaModal');
    if(modal) modal.classList.remove('open');
  };

  function _renderPainel(){
    var box = document.getElementById('icCadenciaBody');
    if(!box) return;
    box.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;">⏳ Carregando cadência…</div>';
    Promise.all([_carregarTodas(), _carregarUsuarios()]).then(function(res){
      var cad = res[0], usr = res[1];
      /* Junta tudo num array: consultor + cadência */
      var lista = [];
      Object.keys(cad).forEach(function(uid){
        var c = cad[uid] || {};
        var nome = (usr[uid] && (usr[uid].nome || usr[uid].login)) || uid;
        var perfil = usr[uid] && usr[uid].perfil;
        /* Filtra: só perfis consultor/treinador/ministrante */
        if(perfil && ['consultor','treinador','ministrante'].indexOf(perfil) < 0) return;
        lista.push({
          uid: uid,
          nome: nome,
          pausado: !!c.pausado,
          proximoPulse: c.proximoPulse,
          ultimoFeedback: c.ultimoFeedback,
          contadorPulses: c.contadorPulses,
          classif: _classificar(c.proximoPulse)
        });
      });
      _renderPainelComLista(lista);
    });
  }

  function _renderPainelComLista(lista){
    var box = document.getElementById('icCadenciaBody');
    if(!box) return;
    if(!lista.length){
      box.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;font-style:italic;">'
        +'Nenhuma cadência registrada ainda. Salve o 1º feedback de um consultor pra iniciar.'
        +'</div>';
      return;
    }
    /* Agrupar por estado */
    var grupos = {
      atrasado: [], hoje: [], breve: [], semana: [], futuro: [], pausado: [], sem: []
    };
    lista.forEach(function(item){
      if(item.pausado) grupos.pausado.push(item);
      else grupos[item.classif.tag].push(item);
    });
    /* Ordenar dentro de cada grupo */
    ['atrasado','hoje','breve','semana','futuro'].forEach(function(g){
      grupos[g].sort(function(a,b){ return (a.classif.diff||0) - (b.classif.diff||0); });
    });

    function _renderGrupo(g, titulo, icone){
      if(!grupos[g] || !grupos[g].length) return '';
      var cor = grupos[g][0].classif ? grupos[g][0].classif.cor : '#9ca3af';
      return '<div style="margin-bottom:16px;">'
        +'<div style="font-size:11px;font-weight:800;color:'+cor+';text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">'
          +icone+' '+titulo+' ('+grupos[g].length+')'
        +'</div>'
        +grupos[g].map(function(item){
          var ultimo = item.ultimoFeedback ? 'último: '+_fmtBR(item.ultimoFeedback) : 'sem feedback ainda';
          var labelData = item.proximoPulse ? _fmtBR(item.proximoPulse) : '—';
          return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;border-left:3px solid '+cor+';">'
            +'<div style="flex:1;min-width:0;">'
              +'<div style="font-size:12px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_esc(item.nome)+'</div>'
              +'<div style="font-size:10px;color:var(--muted);">'+ultimo+'</div>'
            +'</div>'
            +'<div style="text-align:right;font-size:11px;">'
              +'<div style="color:'+cor+';font-weight:700;">'+labelData+'</div>'
              +'<div style="color:var(--muted);font-size:10px;">'+(item.classif ? item.classif.label : '—')+'</div>'
            +'</div>'
            +(item.pausado
              ? '<button onclick="window._icCadenciaRetomar(\''+item.uid+'\');setTimeout(window._icCadenciaAbrirPainel,400)" style="padding:5px 10px;background:var(--accent);color:#0a0e1a;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;">▶ Retomar</button>'
              : '<button onclick="if(confirm(\'Pausar cadência de '+_esc(item.nome).replace(/\x27/g,'\\\x27')+'?\\n(férias, afastamento, etc.)\'))window._icCadenciaPausar(\''+item.uid+'\');setTimeout(window._icCadenciaAbrirPainel,400)" style="padding:5px 10px;background:var(--surface2);color:var(--muted);border:1px solid var(--border);border-radius:4px;font-size:10px;cursor:pointer;font-family:inherit;">⏸ Pausar</button>')
          +'</div>';
        }).join('')
      +'</div>';
    }

    var html = '';
    html += _renderGrupo('atrasado', 'ATRASADOS', '🔴');
    html += _renderGrupo('hoje',     'HOJE',      '🟡');
    html += _renderGrupo('breve',    'PRÓXIMOS 3 DIAS', '🔵');
    html += _renderGrupo('semana',   'ESTA SEMANA', '🟢');
    html += _renderGrupo('futuro',   'FUTUROS', '⚪');
    html += _renderGrupo('pausado',  'PAUSADOS', '⏸');

    /* Resumo no topo */
    var resumo = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;padding:10px;background:var(--surface);border-radius:6px;border:1px solid var(--border);">'
      +'<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:800;color:#ef4444;">'+grupos.atrasado.length+'</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase;">atrasados</div></div>'
      +'<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:800;color:#f59e0b;">'+grupos.hoje.length+'</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase;">hoje</div></div>'
      +'<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:800;color:#3b82f6;">'+grupos.breve.length+'</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase;">3 dias</div></div>'
      +'<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:800;color:#34d399;">'+grupos.semana.length+'</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase;">semana</div></div>'
      +'<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:800;color:var(--muted);">'+lista.length+'</div><div style="font-size:9px;color:var(--muted);text-transform:uppercase;">total</div></div>'
      +'</div>';

    box.innerHTML = resumo + html;
  }

  function _esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  /* ── Badge global no header da IC ── */
  function _atualizarBadge(){
    var badgeEl = document.getElementById('icCadenciaBadge');
    if(!badgeEl) return;
    _carregarTodas().then(function(cad){
      var atrasados = 0, hoje = 0;
      Object.keys(cad).forEach(function(uid){
        var c = cad[uid] || {};
        if(c.pausado || !c.proximoPulse) return;
        var cl = _classificar(c.proximoPulse);
        if(cl.tag === 'atrasado') atrasados++;
        else if(cl.tag === 'hoje') hoje++;
      });
      if(atrasados === 0 && hoje === 0){
        badgeEl.style.display = 'none';
        return;
      }
      badgeEl.style.display = '';
      badgeEl.innerHTML = (atrasados ? '<span style="color:#ef4444;font-weight:700;">⚠ '+atrasados+' atrasado'+(atrasados>1?'s':'')+'</span>' : '')
        +(atrasados && hoje ? ' · ' : '')
        +(hoje ? '<span style="color:#f59e0b;font-weight:700;">'+hoje+' hoje</span>' : '');
    });
  }
  /* Atualiza a cada 5 min + no load */
  setTimeout(function(){ _atualizarBadge(); }, 2500);
  setInterval(_atualizarBadge, 5 * 60 * 1000);
  window._icCadenciaAtualizarBadge = _atualizarBadge;

  /* Banner */
  setTimeout(function(){
    console.log('%c[ic-cadencia] módulo de cadência ativo · _icCadenciaAbrirPainel() pra abrir painel',
      'color:#a78bfa;font-weight:600;');
  }, 2100);

})();
