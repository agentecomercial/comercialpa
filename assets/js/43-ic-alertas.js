/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Alertas estratégicos + Pareto (Fase 6)
   Vive APENAS dentro de #mapeamentoScreen (pane "dashboard").
   Não toca Gerenciar Turmas nem Pipeline Comercial.

   Hooks:
     _mapFiltrar → após renderer rodar, gera alertas + Pareto
   Lê (somente):
     _mapDados (já em memória), icFeedbacks, icPDIs, pipelineGoals
══════════════════════════════════════════════════════════════ */
(function(){

  var _cacheFb = null;
  var _cachePdi = null;
  var _cacheGoals = null;

  function _fmtR(v){ return 'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

  /* ── Carga única dos dados auxiliares ────────────────── */
  function _icAlCarregar(cb){
    if(typeof window._fbGet !== 'function'){ cb(); return; }
    /* Se já temos cache, reusa */
    if(_cacheFb !== null && _cachePdi !== null){ cb(); return; }
    Promise.all([
      window._fbGet('icFeedbacks').catch(function(){return {};}),
      window._fbGet('icPDIs').catch(function(){return {};})
    ]).then(function(res){
      _cacheFb = res[0] || {};
      _cachePdi = res[1] || {};
      cb();
    }).catch(function(){ _cacheFb={}; _cachePdi={}; cb(); });
  }

  /* ── Calcula alertas a partir do _mapDados (já filtrado pelo período) ── */
  function _icAlCalcular(registros){
    var alertas = [];
    /* Agregação por consultor */
    var byCons = {};
    var totFat = 0;
    registros.forEach(function(r){
      if(!r || !r.consultor) return;
      var c = r.consultor;
      if(!byCons[c]) byCons[c] = {nome:c, fat:0, qtd:0};
      byCons[c].fat += +r.valor || 0;
      byCons[c].qtd++;
      totFat += +r.valor || 0;
    });
    var consList = Object.values(byCons).sort(function(a,b){return b.fat-a.fat;});

    /* === Alerta 1: DEPENDÊNCIA DO TOP 1 === */
    if(consList.length && totFat > 0){
      var top1 = consList[0];
      var pct = top1.fat / totFat;
      if(pct >= 0.5){
        alertas.push({
          sev:'critico', tag:'Dependência',
          titulo:'🚨 Concentração crítica',
          msg:'<b>'+top1.nome+'</b> responde por <b>'+Math.round(pct*100)+'%</b> do faturamento. Se sair, perde quase metade do time.',
          acao:'Plano de ramp-up do #2 + cota mínima distribuída.'
        });
      } else if(pct >= 0.35){
        alertas.push({
          sev:'atencao', tag:'Dependência',
          titulo:'⚖ Dependência alta',
          msg:'<b>'+top1.nome+'</b> concentra <b>'+Math.round(pct*100)+'%</b> do faturamento — acima do desejável (35%).',
          acao:'Considere distribuir leads de modo a balancear o peso do top 1.'
        });
      }
    }

    /* === Alerta 2: SEM FATURAMENTO === */
    var inativos = consList.filter(function(c){return c.fat === 0;});
    if(inativos.length && consList.length > inativos.length){
      alertas.push({
        sev:'atencao', tag:'Inatividade',
        titulo:'😴 Consultores sem faturamento',
        msg:'<b>'+inativos.length+' consultor'+(inativos.length>1?'es':'')+'</b> sem nenhum pago no período: '+inativos.map(function(c){return c.nome;}).slice(0,4).join(', ')+(inativos.length>4?'…':''),
        acao:'Revisar pipeline e marcar 1:1 imediato.'
      });
    }

    /* === Alerta 3: PRODUTO PARADO === */
    var byTrein = {};
    registros.forEach(function(r){
      var t = r.treinamento; if(!t) return;
      if(!byTrein[t]) byTrein[t] = 0;
      byTrein[t] += +r.valor || 0;
    });
    if(typeof window.allTreinamentos !== 'undefined' && Array.isArray(window.allTreinamentos)){
      var parados = window.allTreinamentos.filter(function(t){return !byTrein[t] || byTrein[t] === 0;});
      if(parados.length >= 2 && parados.length < window.allTreinamentos.length){
        alertas.push({
          sev:'info', tag:'Produto',
          titulo:'📦 Treinamentos sem venda',
          msg:'<b>'+parados.length+' treinamentos</b> não tiveram nenhuma venda no período: '+parados.slice(0,5).join(', ')+(parados.length>5?'…':''),
          acao:'Revisar pitch ou retirar da oferta ativa.'
        });
      }
    }

    /* === Alerta 4: FEEDBACK SEM CICLO RECENTE === */
    var hoje = new Date();
    var hojeMs = hoje.getTime();
    var semFb = [];
    consList.forEach(function(c){
      var fbs = _cacheFb && _cacheFb[c.nome];
      if(!fbs || !Object.keys(fbs).length){ semFb.push({n:c.nome, dias:'∞'}); return; }
      var ult = null;
      Object.values(fbs).forEach(function(f){
        if(f && f.data && (!ult || f.data > ult)) ult = f.data;
      });
      if(!ult){ semFb.push({n:c.nome, dias:'∞'}); return; }
      try{
        var dias = Math.round((hojeMs - new Date(ult).getTime())/86400000);
        if(dias > 14) semFb.push({n:c.nome, dias:dias+'d'});
      }catch(e){}
    });
    if(semFb.length){
      alertas.push({
        sev:'atencao', tag:'Feedback',
        titulo:'📅 Ciclos de feedback atrasados',
        msg:'<b>'+semFb.length+' consultor'+(semFb.length>1?'es':'')+'</b> sem ciclo há mais de 14 dias: '+semFb.slice(0,4).map(function(s){return s.n+' ('+s.dias+')';}).join(', ')+(semFb.length>4?'…':''),
        acao:'Marcar 1:1 nesta semana — abrir aba Desenvolvimento.'
      });
    }

    /* === Alerta 5: SEM PDI ATIVO + SCORE BAIXO === */
    var semPdi = [];
    consList.forEach(function(c){
      var fbs = _cacheFb && _cacheFb[c.nome];
      var pdis = _cachePdi && _cachePdi[c.nome];
      var ultMedia = null;
      if(fbs){
        var arr = Object.values(fbs).filter(function(f){return f && f.comps;});
        arr.sort(function(a,b){return (b.data||'').localeCompare(a.data||'');});
        if(arr.length){
          var ult = arr[0];
          var notas = Object.values(ult.comps).map(Number).filter(function(n){return !isNaN(n)&&n>=1;});
          if(notas.length) ultMedia = notas.reduce(function(s,n){return s+n;},0)/notas.length;
        }
      }
      var temPdiAtivo = false;
      if(pdis){
        temPdiAtivo = Object.values(pdis).some(function(p){return p && p.status === 'iniciado';});
      }
      if(ultMedia != null && ultMedia < 7 && !temPdiAtivo){
        semPdi.push({n:c.nome, m:ultMedia.toFixed(1)});
      }
    });
    if(semPdi.length){
      alertas.push({
        sev:'atencao', tag:'PDI',
        titulo:'🌱 PDIs faltando',
        msg:'<b>'+semPdi.length+' consultor'+(semPdi.length>1?'es':'')+'</b> com score < 7 sem PDI ativo: '+semPdi.slice(0,4).map(function(s){return s.n+' ('+s.m+')';}).join(', ')+(semPdi.length>4?'…':''),
        acao:'Criar PDI focado nas 2 competências mais baixas — aba PDI.'
      });
    }

    /* === Alerta 6: PARETO 80/20 === */
    if(consList.length >= 3 && totFat > 0){
      var acum = 0, dentro80 = 0;
      for(var i=0;i<consList.length;i++){
        acum += consList[i].fat;
        dentro80++;
        if(acum/totFat >= 0.8) break;
      }
      var pctDentro = dentro80 / consList.length;
      if(pctDentro <= 0.3){
        alertas.push({
          sev:'critico', tag:'Pareto',
          titulo:'📊 80/20 desbalanceado',
          msg:'<b>'+dentro80+' de '+consList.length+' consultores</b> ('+Math.round(pctDentro*100)+'%) fazem 80% do faturamento. Concentração extrema.',
          acao:'Estratégia de desenvolvimento dos demais é prioridade.'
        });
      }
    }

    /* === Saudável: se nenhum alerta, mostra sinal positivo === */
    if(!alertas.length){
      alertas.push({
        sev:'ok', tag:'Tudo certo',
        titulo:'✅ Nenhum alerta crítico',
        msg:'O time está dentro dos parâmetros esperados para o período.',
        acao:'Mantenha a cadência de feedback e revisão de PDI.'
      });
    }
    return alertas;
  }

  function _icAlRender(alertas){
    var box = document.getElementById('icAlertasBox');
    if(!box) return;
    box.innerHTML = alertas.map(function(a){
      return '<div class="ic-alerta '+a.sev+'">'
        + '<div class="ic-alerta-h">'
        +   '<div class="ic-alerta-titulo">'+a.titulo+'</div>'
        +   '<span class="ic-alerta-tag">'+a.tag+'</span>'
        + '</div>'
        + '<div class="ic-alerta-msg">'+a.msg+'</div>'
        + (a.acao ? '<div class="ic-alerta-acao">→ '+a.acao+'</div>' : '')
        + '</div>';
    }).join('');
  }

  /* ── Pareto · gráfico de barras + linha de % acumulado ── */
  function _icParetoRender(registros){
    var panel = document.getElementById('icParetoPanel');
    var sub   = document.getElementById('icParetoSub');
    var chart = document.getElementById('icParetoChart');
    if(!panel || !chart) return;
    /* Agregação por consultor */
    var byCons = {};
    var totFat = 0;
    registros.forEach(function(r){
      if(!r || !r.consultor) return;
      var c = r.consultor;
      if(!byCons[c]) byCons[c] = 0;
      byCons[c] += +r.valor || 0;
      totFat += +r.valor || 0;
    });
    var lista = Object.entries(byCons).map(function(e){return {nome:e[0],fat:e[1]};})
      .sort(function(a,b){return b.fat-a.fat;});
    if(!lista.length || totFat === 0){
      panel.style.display = 'none';
      return;
    }
    panel.style.display = '';
    /* Calcula % acumulado e quantos compõem 80% */
    var acum = 0, dentro80 = 0, marcou = false;
    var max = lista[0].fat || 1;
    var html = '<div class="ic-pareto-resumo"></div>';
    /* Resumo */
    for(var i=0;i<lista.length;i++){
      acum += lista[i].fat;
      if(!marcou){
        dentro80++;
        if(acum/totFat >= 0.8){ marcou = true; }
      }
    }
    var resumo = '<b>'+dentro80+'</b> de <b>'+lista.length+'</b> consultor'+(lista.length>1?'es':'')+' compõem <b>80%</b> do faturamento (<b>'+_fmtR(totFat)+'</b> no total).';
    /* Linhas */
    acum = 0;
    var linhas = lista.map(function(c, i){
      acum += c.fat;
      var pct = c.fat/totFat;
      var pctAcum = acum/totFat;
      var bw = Math.round((c.fat/max)*100);
      var dentro = (i+1) <= dentro80;
      var pctPos = pctAcum * 100;
      return '<div class="ic-pareto-row '+(dentro?'':'no-pareto')+'">'
        + '<div class="ic-pareto-nome">'+(i+1)+'. '+c.nome+'</div>'
        + '<div class="ic-pareto-bar"><div class="ic-pareto-bar-fill '+(dentro?'dentro':'fora')+'" style="width:'+bw+'%;"></div></div>'
        + '<div class="ic-pareto-val">'+_fmtR(c.fat)+'</div>'
        + '<div class="ic-pareto-acum">'+Math.round(pct*100)+'% · acum '+Math.round(pctAcum*100)+'%</div>'
        + '</div>';
    }).join('');
    chart.innerHTML = '<div class="ic-pareto-resumo">'+resumo+'</div>'
      + '<div style="font-size:10px;color:var(--muted);margin-bottom:6px;display:flex;justify-content:flex-end;gap:14px;">'
      +   '<span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px;"></span>Top 80%</span>'
      +   '<span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:var(--blue);border-radius:2px;"></span>Cauda</span>'
      + '</div>'
      + linhas;
    if(sub) sub.textContent = lista.length+' consultor'+(lista.length>1?'es':'')+' · '+_fmtR(totFat);
  }

  /* ── Hook no _mapFiltrar pra gerar alertas/pareto após cada render ── */
  function _icAlAtualizar(){
    if(typeof window._mapDados === 'undefined') return;
    var registros = window._mapDados;
    if(!registros) return;
    /* Re-aplica filtro de período (mesma lógica do _mapFiltrar) */
    var anoSel = (typeof window._mapAnoSel !== 'undefined') ? window._mapAnoSel : 0;
    var mesesSel = (typeof window._mapMesesSel !== 'undefined' && Array.isArray(window._mapMesesSel)) ? window._mapMesesSel : [];
    var filtrados = registros.filter(function(r){
      if(anoSel > 0 && r.ano !== anoSel) return false;
      if(mesesSel.length > 0 && mesesSel.indexOf(r.mes) < 0) return false;
      return true;
    });
    _icAlCarregar(function(){
      var alertas = _icAlCalcular(filtrados);
      _icAlRender(alertas);
      _icParetoRender(filtrados);
    });
  }

  /* ── Hook em _mapFiltrar (do 30-sync-ferramentas.js) ─── */
  function _hookarMapFiltrar(){
    var orig = window._mapFiltrar;
    if(typeof orig !== 'function') return false;
    window._mapFiltrar = function(){
      orig.apply(this, arguments);
      setTimeout(_icAlAtualizar, 80);
    };
    return true;
  }
  /* Tenta hookar logo; se _mapFiltrar ainda não existir, tenta de novo em loop curto */
  function _tentarHook(tentativas){
    if(_hookarMapFiltrar()) return;
    if(tentativas <= 0) return;
    setTimeout(function(){ _tentarHook(tentativas - 1); }, 200);
  }
  _tentarHook(20);

  /* ── Hook abrirMapeamento: dispara primeira atualização ── */
  var _origAbrirMapAl = window.abrirMapeamento;
  if(typeof _origAbrirMapAl === 'function'){
    window.abrirMapeamento = function(btn){
      _origAbrirMapAl(btn);
      /* Espera dados carregarem + renderer rodar */
      setTimeout(_icAlAtualizar, 1200);
    };
  }

  /* Invalida cache periodicamente — feedbacks/PDIs podem mudar */
  setInterval(function(){ _cacheFb = null; _cachePdi = null; }, 5*60*1000);

})();
