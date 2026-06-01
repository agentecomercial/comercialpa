/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Módulo PREPARO 1:1 (Fase C)
   Tela que o gestor abre 5-10 min antes do 1:1 com o consultor.
   Puxa automaticamente todo o contexto e oferece 3 campos rápidos
   pra escrever o roteiro mental da conversa.

   Schema (Firebase):
     icPreparo1a1/{consultorUid}/{YYYY-MM-DD}/
       fatos: '...'          (3 fatos pra reconhecer)
       atencao: '...'         (2-3 pontos de atenção)
       hipotese: '...'        (hipótese de competência-alvo)
       atualizadoEm: 'iso'

   API:
     window._icPrep1a1Abrir(consultorNome)
     window._icPrep1a1Fechar()
═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var _consultorAtual = null;  /* { uid, nome } */
  var _doc = null;             /* preparo do dia */
  var _ctx = null;             /* contexto carregado */

  function _g(id){ return document.getElementById(id); }
  function _v(id){ var el = _g(id); return el ? el.value : ''; }
  function _esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
  function _hojeYmd(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function _fmtBR(ymd){
    if(!ymd) return '—';
    if(ymd instanceof Date){
      return String(ymd.getDate()).padStart(2,'0')+'/'+String(ymd.getMonth()+1).padStart(2,'0')+'/'+ymd.getFullYear();
    }
    var p = String(ymd).split('-');
    return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : ymd;
  }
  function _toast(msg, cor){
    if(typeof window._showToast === 'function') window._showToast(msg, cor||'var(--accent)');
  }

  /* ── Persistência ── */
  function _carregar(){
    if(!_consultorAtual || typeof window._fbGet !== 'function'){
      _doc = { fatos:'', atencao:'', hipotese:'' };
      return Promise.resolve(_doc);
    }
    var path = 'icPreparo1a1/'+_consultorAtual.uid+'/'+_hojeYmd();
    return window._fbGet(path).then(function(d){
      _doc = d || { fatos:'', atencao:'', hipotese:'' };
      return _doc;
    }).catch(function(){
      _doc = { fatos:'', atencao:'', hipotese:'' };
      return _doc;
    });
  }
  function _salvar(){
    if(!_consultorAtual || typeof window._fbSave !== 'function') return Promise.resolve();
    _doc.atualizadoEm = new Date().toISOString();
    var path = 'icPreparo1a1/'+_consultorAtual.uid+'/'+_hojeYmd();
    return window._fbSave(path, _doc);
  }

  /* ── Coleta dados contextuais (KPIs, histórico, vendas perdidas, PDI) ── */
  function _carregarContexto(){
    var nome = _consultorAtual && _consultorAtual.nome || '';
    var nomeUp = String(nome).toUpperCase();
    var ctx = {
      kpis: null,
      ultimosFeedbacks: [],
      vendasPerdidas: [],
      compromissosPdi: { lista:[], cumpridos:0, total:0 }
    };

    /* KPIs do Pipeline */
    try {
      if(typeof window._npTodasVendas === 'function' && typeof window._npPorConsultor === 'function'){
        var todas = window._npTodasVendas();
        var rank = window._npPorConsultor(todas, '', 'pago');
        var idx = rank.findIndex(function(r){ return String(r.nome).toUpperCase() === nomeUp; });
        if(idx >= 0){
          var r = rank[idx];
          var meta = null, pctMeta = null;
          var g = window._npGoals && window._npGoals[r.nome];
          if(g){
            var mb = +(g.metaBasica || g.metaValor || 0);
            if(mb > 0){
              meta = mb;
              pctMeta = Math.round(r.pago/mb*100);
            }
          }
          ctx.kpis = {
            faturado: r.pago,
            meta: meta,
            pctMeta: pctMeta,
            conversao: r.qtd ? Math.round(r.qtdPago/r.qtd*100) : 0,
            ticket: r.qtdPago ? Math.round(r.pago/r.qtdPago) : 0,
            pos: idx+1,
            total: rank.length
          };
          /* Vendas em negociação há muito tempo (pra apontar como "perdidas") */
          ctx.vendasPerdidas = todas
            .filter(function(v){
              if(String(v.consultor||'').toUpperCase() !== nomeUp) return false;
              var st = String(v.status||'').toLowerCase();
              return st === 'negociacao';
            })
            .map(function(v){
              return { cliente: v.cliente || v.clienteNome || '?', valor: v.valor, treinamento: v.treinamento || v.produto || '—' };
            })
            .slice(0, 5);
        }
      }
    } catch(e){ console.warn('[preparo] kpis falhou', e); }

    var promises = [];

    /* Últimos 3 feedbacks */
    if(typeof window._fbGet === 'function' && nome){
      promises.push(window._fbGet('icFeedbacks/'+nomeUp).then(function(d){
        var arr = [];
        if(d){
          Object.keys(d).forEach(function(k){
            var v = d[k]||{}; v._id = k; arr.push(v);
          });
          arr.sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); });
        }
        ctx.ultimosFeedbacks = arr.slice(0, 3);
      }).catch(function(){ ctx.ultimosFeedbacks = []; }));
    }

    /* PDI vigente + compromissos do gestor */
    if(typeof window._fbGet === 'function' && nome){
      promises.push(window._fbGet('icPDIs/'+nomeUp).then(function(d){
        if(!d) return;
        var keys = Object.keys(d).sort();
        var ultPdi = keys.length ? d[keys[keys.length-1]] : null;
        if(!ultPdi) return;
        var alvos = ultPdi.alvos || [];
        var acoes = [];
        alvos.forEach(function(a){
          (a.acoes||[]).forEach(function(ac){
            acoes.push({ texto: ac.texto, feito: !!ac.feito, alvo: a.key });
          });
        });
        ctx.compromissosPdi = {
          lista: acoes.slice(0, 8),
          cumpridos: acoes.filter(function(x){return x.feito;}).length,
          total: acoes.length,
          framework: ultPdi.framework,
          compromissoGestor: ultPdi.compromissoGestor
        };
      }).catch(function(){}));
    }

    return Promise.all(promises).then(function(){ return ctx; });
  }

  /* ── Render ── */
  function _render(){
    var box = _g('icPrep1a1Body');
    if(!box) return;
    box.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;">⏳ Carregando contexto…</div>';
    _carregarContexto().then(function(ctx){
      _ctx = ctx;
      _renderConteudo();
    });
  }

  function _renderConteudo(){
    var box = _g('icPrep1a1Body');
    if(!box) return;
    var ctx = _ctx || {};

    /* ── Bloco KPIs ── */
    var kpis = ctx.kpis;
    var blocoKpis = '<div class="prep-card">'
      +'<div class="prep-card-h">💰 KPIs do mês</div>';
    if(!kpis){
      blocoKpis += '<div style="font-size:11px;color:var(--muted);font-style:italic;padding:8px 0;">Sem dados do Pipeline — entre numa turma/pipeline antes de abrir o preparo.</div>';
    } else {
      var pctCor = kpis.pctMeta == null ? 'var(--muted)' : (kpis.pctMeta >= 100 ? '#34d399' : (kpis.pctMeta >= 70 ? '#f59e0b' : '#ef4444'));
      blocoKpis += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">'
        + '<div class="prep-kpi"><div class="prep-kpi-v">R$ '+(kpis.faturado||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'</div><div class="prep-kpi-l">Faturado</div></div>'
        + '<div class="prep-kpi"><div class="prep-kpi-v" style="color:'+pctCor+';">'+(kpis.pctMeta == null ? '—' : kpis.pctMeta+'%')+'</div><div class="prep-kpi-l">% Meta</div></div>'
        + '<div class="prep-kpi"><div class="prep-kpi-v">'+kpis.conversao+'%</div><div class="prep-kpi-l">Conversão</div></div>'
        + '<div class="prep-kpi"><div class="prep-kpi-v">R$ '+(kpis.ticket||0).toLocaleString('pt-BR')+'</div><div class="prep-kpi-l">Ticket médio</div></div>'
        + '<div class="prep-kpi"><div class="prep-kpi-v">#'+kpis.pos+'/'+kpis.total+'</div><div class="prep-kpi-l">Ranking</div></div>'
        +'</div>';
    }
    blocoKpis += '</div>';

    /* ── Bloco Histórico ── */
    var blocoHist = '<div class="prep-card">'
      +'<div class="prep-card-h">📋 Últimos 3 feedbacks</div>';
    if(!ctx.ultimosFeedbacks || !ctx.ultimosFeedbacks.length){
      blocoHist += '<div style="font-size:11px;color:var(--muted);font-style:italic;padding:8px 0;">Sem feedbacks anteriores — vai ser onboarding.</div>';
    } else {
      blocoHist += ctx.ultimosFeedbacks.map(function(h){
        var tipo = h.tipo || 'completo';
        var TIPO = { onboarding:'👋 Onb', pulse:'⚡ Pulse', completo:'📋 Completo' };
        var tipoLbl = TIPO[tipo] || tipo;
        var status = h.status || 'rascunho';
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:var(--surface2);border-radius:5px;margin-bottom:4px;font-size:11px;">'
          +'<div style="font-weight:700;color:var(--accent);min-width:80px;">'+tipoLbl+'</div>'
          +'<div style="flex:1;color:var(--text);">'+_fmtBR(h.data)+'</div>'
          +'<div style="color:var(--muted);font-size:10px;">'+status+'</div>'
        +'</div>';
      }).join('');
    }
    blocoHist += '</div>';

    /* ── Bloco Vendas em risco ── */
    var blocoVendas = '<div class="prep-card">'
      +'<div class="prep-card-h">⚠️ Negociações abertas (atenção)</div>';
    if(!ctx.vendasPerdidas || !ctx.vendasPerdidas.length){
      blocoVendas += '<div style="font-size:11px;color:var(--muted);font-style:italic;padding:8px 0;">Nenhuma venda em negociação no momento.</div>';
    } else {
      blocoVendas += ctx.vendasPerdidas.map(function(v){
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:rgba(245,158,11,.06);border-left:3px solid #f59e0b;border-radius:4px;margin-bottom:4px;font-size:11px;">'
          +'<div style="flex:1;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_esc(v.cliente)+'</div>'
          +'<div style="color:var(--muted);font-size:10px;">'+_esc(v.treinamento)+'</div>'
          +'<div style="color:#f59e0b;font-weight:700;">R$ '+(v.valor||0).toLocaleString('pt-BR')+'</div>'
        +'</div>';
      }).join('');
      blocoVendas += '<div style="font-size:10px;color:var(--muted);margin-top:6px;font-style:italic;">💡 Sugestão: pergunte no 1:1 sobre o status de cada uma.</div>';
    }
    blocoVendas += '</div>';

    /* ── Bloco PDI vigente ── */
    var pdi = ctx.compromissosPdi || {};
    var blocoPdi = '<div class="prep-card">'
      +'<div class="prep-card-h">🎯 Compromissos do PDI</div>';
    if(!pdi.total){
      blocoPdi += '<div style="font-size:11px;color:var(--muted);font-style:italic;padding:8px 0;">Sem PDI ativo ou sem ações registradas.</div>';
    } else {
      var pctPdi = pdi.total ? Math.round(pdi.cumpridos/pdi.total*100) : 0;
      var corPdi = pctPdi >= 70 ? '#34d399' : (pctPdi >= 40 ? '#f59e0b' : '#ef4444');
      blocoPdi += '<div style="margin-bottom:8px;font-size:11px;color:var(--text);">'
        +'<b style="color:'+corPdi+';">'+pdi.cumpridos+'/'+pdi.total+'</b> ações cumpridas ('+pctPdi+'%)'
        +(pdi.framework?' · Framework: <b style="color:var(--accent);">'+pdi.framework+'</b>':'')
        +'</div>';
      blocoPdi += pdi.lista.map(function(a){
        return '<div style="display:flex;align-items:center;gap:8px;padding:4px 8px;font-size:11px;'+(a.feito?'opacity:.55;':'')+'">'
          +'<span style="color:'+(a.feito?'#34d399':'#ef4444')+';font-weight:700;">'+(a.feito?'✓':'✗')+'</span>'
          +'<span style="flex:1;color:var(--text);'+(a.feito?'text-decoration:line-through;':'')+'">'+_esc(a.texto||'(sem descrição)')+'</span>'
        +'</div>';
      }).join('');
      if(pdi.compromissoGestor && pdi.compromissoGestor.trim()){
        blocoPdi += '<div style="margin-top:8px;padding:8px 10px;background:rgba(96,165,250,.06);border-left:3px solid var(--blue);border-radius:4px;font-size:11px;color:var(--text);">'
          +'<b style="color:var(--blue);">Compromisso do gestor:</b><br>'+_esc(pdi.compromissoGestor)
        +'</div>';
      }
    }
    blocoPdi += '</div>';

    /* ── Bloco notas do gestor (3 textareas) ── */
    var blocoNotas = '<div class="prep-card" style="border:1px solid var(--accent);background:rgba(200,240,90,.04);">'
      +'<div class="prep-card-h" style="color:var(--accent);">📝 Suas notas pro 1:1</div>'
      +'<div style="display:grid;gap:10px;">'
        +'<div>'
          +'<label class="prep-lbl" style="color:#34d399;">🟢 3 fatos pra reconhecer</label>'
          +'<textarea id="icPrep1a1Fatos" oninput="window._icPrep1a1SetFatos&&window._icPrep1a1SetFatos(this.value)" placeholder="Ex: fechou MASTER com cliente X · recuperou lead frio · subiu 2 posições no ranking" style="width:100%;min-height:60px;padding:8px 10px;background:var(--surface2);color:var(--text);border:1px solid rgba(52,211,153,.3);border-radius:5px;font-size:11px;font-family:inherit;line-height:1.5;resize:vertical;">'+_esc(_doc.fatos||'')+'</textarea>'
        +'</div>'
        +'<div>'
          +'<label class="prep-lbl" style="color:#f59e0b;">🟡 2-3 pontos de atenção</label>'
          +'<textarea id="icPrep1a1Atencao" oninput="window._icPrep1a1SetAtencao&&window._icPrep1a1SetAtencao(this.value)" placeholder="Ex: conversão caindo 3 meses seguidos · não fez follow-up de 4 leads · CRM desatualizado" style="width:100%;min-height:60px;padding:8px 10px;background:var(--surface2);color:var(--text);border:1px solid rgba(245,158,11,.3);border-radius:5px;font-size:11px;font-family:inherit;line-height:1.5;resize:vertical;">'+_esc(_doc.atencao||'')+'</textarea>'
        +'</div>'
        +'<div>'
          +'<label class="prep-lbl" style="color:var(--blue);">🎯 Hipótese de competência-alvo</label>'
          +'<textarea id="icPrep1a1Hipotese" oninput="window._icPrep1a1SetHipotese&&window._icPrep1a1SetHipotese(this.value)" placeholder="Ex: Follow-up (nota 2.3, caindo) + Fechamento de objeções" style="width:100%;min-height:50px;padding:8px 10px;background:var(--surface2);color:var(--text);border:1px solid rgba(96,165,250,.3);border-radius:5px;font-size:11px;font-family:inherit;line-height:1.5;resize:vertical;">'+_esc(_doc.hipotese||'')+'</textarea>'
        +'</div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">'
        +'<button class="np-btn ghost" onclick="window._icPrep1a1Salvar&&window._icPrep1a1Salvar()">💾 Salvar preparo</button>'
        +'<button class="np-btn primary" onclick="window._icPrep1a1IniciarFeedback&&window._icPrep1a1IniciarFeedback()">✅ Iniciar 1:1 →</button>'
      +'</div>'
    +'</div>';

    box.innerHTML = blocoKpis + blocoHist + blocoVendas + blocoPdi + blocoNotas;
  }

  /* ── Setters ── */
  window._icPrep1a1SetFatos    = function(v){ if(_doc) _doc.fatos = v; };
  window._icPrep1a1SetAtencao  = function(v){ if(_doc) _doc.atencao = v; };
  window._icPrep1a1SetHipotese = function(v){ if(_doc) _doc.hipotese = v; };

  /* ── Ações ── */
  window._icPrep1a1Salvar = function(){
    _salvar().then(function(){
      _toast('💾 Preparo salvo · disponível pra consulta no próximo 1:1', 'var(--accent)');
    });
  };
  window._icPrep1a1IniciarFeedback = function(){
    _salvar().then(function(){
      window._icPrep1a1Fechar();
      _toast('▶ Boa sessão! Preparo salvo · consulte se precisar.', 'var(--accent)');
      /* Garante que o consultor está selecionado no feedback */
      var sel = document.getElementById('fbConsultor');
      if(sel && _consultorAtual && _consultorAtual.nome){
        for(var i = 0; i < sel.options.length; i++){
          if((sel.options[i].value||'').toUpperCase() === _consultorAtual.nome.toUpperCase()){
            sel.value = sel.options[i].value;
            sel.dispatchEvent(new Event('change'));
            break;
          }
        }
      }
    });
  };

  /* ── Modal open/close ── */
  window._icPrep1a1Abrir = function(consultorNome){
    if(!consultorNome){
      var sel = document.getElementById('fbConsultor');
      if(sel) consultorNome = sel.value || '';
    }
    if(!consultorNome){
      _toast('⚠ Selecione um consultor antes de abrir o preparo', 'var(--amber)');
      return;
    }
    var uid = 'uid_'+consultorNome.toUpperCase().replace(/\s+/g,'_');
    _consultorAtual = { uid: uid, nome: consultorNome };
    var modal = _g('icPrep1a1Modal');
    if(!modal){ console.warn('[preparo1a1] modal não existe'); return; }
    _g('icPrep1a1Titulo').textContent = '🎓 Preparar 1:1 · '+consultorNome+' · '+_fmtBR(_hojeYmd());
    modal.classList.add('open');
    _carregar().then(_render);
  };
  window._icPrep1a1Fechar = function(){
    if(_doc) _salvar();
    var modal = _g('icPrep1a1Modal');
    if(modal) modal.classList.remove('open');
  };
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      var modal = _g('icPrep1a1Modal');
      if(modal && modal.classList.contains('open')) window._icPrep1a1Fechar();
    }
  });

  setTimeout(function(){
    console.log('%c[ic-preparo1a1] módulo de preparo de 1:1 ativo · _icPrep1a1Abrir(nome) pra abrir',
      'color:#a78bfa;font-weight:600;');
  }, 2200);

})();
