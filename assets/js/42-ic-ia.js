/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Módulo IA conversacional (Fase 5)
   Vive APENAS dentro de #mapeamentoScreen (pane "ia").
   Restrito a ADM + EXTRACLASSE.

   Modelo HÍBRIDO:
   (A) Catálogo de análises ESTRUTURADAS — respostas geradas localmente
       a partir dos dados já carregados (turmas + pipelineSales + feedbacks + PDIs).
   (B) Pergunta LIVRE — gera um prompt completo (system + snapshot + pergunta)
       que o usuário copia e cola no Claude.ai (browser, conta MAX).
       Sem chamadas de API.

   Firebase paths (somente leitura):
     turmas, pipelineSales/{mes}, pipelineGoals/{mes},
     icFeedbacks/{consultor}/{cicloId},
     icPDIs/{consultor}/{periodId}

   Histórico de consultas: icIAHist/{ts} → {pergunta, resposta, ts, periodo}
══════════════════════════════════════════════════════════════ */
(function(){

  /* ── Controle de acesso ────────────────────────────── */
  function _iaPermitido(){
    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    if(!sess) return false;
    if(sess.perfil === 'adm') return true;
    var n = String(sess.nome||sess.login||'').toUpperCase().trim();
    return n === 'EXTRACLASSE';
  }

  /* ── Estado ────────────────────────────────────────── */
  var _iaPer = 'mes';            /* 'mes' | '3m' | '6m' | 'manual' */
  var _iaPerStart = null;        /* YYYY-MM */
  var _iaPerEnd = null;          /* YYYY-MM */
  var _iaDados = null;           /* snapshot: { consultores: [{nome, kpis, feedbacks[], pdi, itens}], periodo, time:{...} } */
  var _iaCarregando = false;

  /* ── Helpers ───────────────────────────────────────── */
  function _ym(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  function _hojeYM(){ return _ym(new Date()); }
  function _addMes(ym, delta){
    var p = (ym||_hojeYM()).split('-');
    var d = new Date(+p[0], +p[1]-1+delta, 1);
    return _ym(d);
  }
  function _mesesDoPer(){
    var hoje = _hojeYM();
    if(_iaPer === 'mes') return [hoje];
    if(_iaPer === '3m')  return [_addMes(hoje,-2), _addMes(hoje,-1), hoje];
    if(_iaPer === '6m'){ var ms=[]; for(var i=5;i>=0;i--) ms.push(_addMes(hoje,-i)); return ms; }
    if(_iaPer === 'manual' && _iaPerStart && _iaPerEnd){
      var ms2=[], cur=_iaPerStart, safe=0;
      while(cur <= _iaPerEnd && safe < 36){ ms2.push(cur); cur=_addMes(cur,1); safe++; }
      return ms2;
    }
    return [hoje];
  }
  function _fmtR(v){ return 'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

  /* ── Carga de dados do snapshot completo ──────────── */
  function _iaCarregar(cb){
    if(_iaCarregando) return;
    if(typeof window._fbGet !== 'function'){ if(cb) cb(null); return; }
    _iaCarregando = true;
    var meses = _mesesDoPer();
    var promessas = [
      window._fbGet('turmas').catch(function(){return {};}),
      window._fbGet('usuarios').catch(function(){return window._npUsuarios||{};}),
      Promise.all(meses.map(function(mk){
        return window._fbGet('pipelineSales/'+mk).then(function(d){return d||{};}).catch(function(){return {};});
      })),
      Promise.all(meses.map(function(mk){
        return window._fbGet('pipelineGoals/'+mk).then(function(g){return {mes:mk,goals:g||{}};}).catch(function(){return {mes:mk,goals:{}};});
      })),
      window._fbGet('icFeedbacks').catch(function(){return {};}),
      window._fbGet('icPDIs').catch(function(){return {};})
    ];
    Promise.all(promessas).then(function(res){
      _iaCarregando = false;
      var turmas = res[0]||{};
      var usuarios = res[1]||{};
      var vendasMeses = res[2]||[];
      var goalsHist = res[3]||[];
      var feedbacksAll = res[4]||{};
      var pdisAll = res[5]||{};
      _iaDados = _iaProcessarSnapshot({turmas:turmas, usuarios:usuarios, vendasMeses:vendasMeses, goalsHist:goalsHist, feedbacksAll:feedbacksAll, pdisAll:pdisAll, meses:meses});
      if(cb) cb(_iaDados);
    }).catch(function(){
      _iaCarregando = false;
      if(cb) cb(null);
    });
  }

  /* Achata e organiza por consultor */
  function _iaProcessarSnapshot(d){
    /* Lista consultores (perfil consultor) */
    var consultores = {};
    Object.values(d.usuarios||{}).forEach(function(u){
      if(u && u.perfil === 'consultor' && u.nome){
        consultores[String(u.nome).toUpperCase().trim()] = {
          nome: u.nome,
          itens: [],
          feedbacks: [],
          pdis: []
        };
      }
    });
    /* Itens das turmas (todas do período) */
    var mesesSet = {};
    (d.meses||[]).forEach(function(m){mesesSet[m]=true;});
    Object.keys(d.turmas||{}).forEach(function(tid){
      var t = d.turmas[tid]; if(!t) return;
      var ps = (t.periodStart||'').slice(0,7);
      var pe = (t.periodEnd||'').slice(0,7);
      /* Inclui turma se algum mês dela tá no período */
      var entra = false;
      if(d.meses && d.meses.length){
        for(var i=0;i<d.meses.length;i++){
          var mk = d.meses[i];
          if(ps && mk === ps){entra=true;break;}
          if(pe && mk === pe){entra=true;break;}
          if(ps && pe && mk >= ps && mk <= pe){entra=true;break;}
        }
      } else { entra = true; }
      if(!entra) return;
      var nomeTurma = String(t.nome||t.titulo||tid).toUpperCase();
      var cls = t.clientes;
      if(cls && !Array.isArray(cls) && typeof cls === 'object') cls = Object.values(cls).filter(Boolean);
      cls = cls || [];
      cls.forEach(function(c){
        if(!c) return;
        var nomeCli = c.cliente || c.clienteNome;
        if(!nomeCli) return;
        var consNome = String(c.consultor||c.consultorNome||'').toUpperCase().trim();
        if(!consNome) return;
        if(!consultores[consNome]){
          consultores[consNome] = { nome: consNome, itens:[], feedbacks:[], pdis:[] };
        }
        if(Array.isArray(c.treinamentos) && c.treinamentos.length){
          c.treinamentos.forEach(function(sub){
            if(!sub) return;
            consultores[consNome].itens.push({
              cliente: String(nomeCli).toUpperCase(),
              treinamento: String(sub.cod||c.treinamento||'').toUpperCase(),
              valor: +sub.valor||0, status: sub.status||c.status||'aberto',
              entrada: +sub.entrada||0, data: c.data||t.periodStart||'',
              src: 'turma', srcNome: nomeTurma
            });
          });
        } else {
          consultores[consNome].itens.push({
            cliente: String(nomeCli).toUpperCase(),
            treinamento: String(c.treinamento||'').toUpperCase(),
            valor: +c.valor||0, status: c.status||'aberto',
            entrada: +c.entrada||0, data: c.data||t.periodStart||'',
            src: 'turma', srcNome: nomeTurma
          });
        }
      });
    });
    /* Itens das vendas avulsas (todas dos meses) */
    (d.vendasMeses||[]).forEach(function(mesData){
      Object.values(mesData||{}).forEach(function(v){
        if(!v) return;
        var consNome = String(v.consultorNome||v.consultor||'').toUpperCase().trim();
        if(!consNome) return;
        if(!consultores[consNome]){
          consultores[consNome] = { nome: consNome, itens:[], feedbacks:[], pdis:[] };
        }
        consultores[consNome].itens.push({
          cliente: String(v.clienteNome||v.cliente||'').toUpperCase(),
          treinamento: String(v.produto||v.treinamento||'').toUpperCase(),
          valor: +v.valor||0, status: v.status||'aberto',
          entrada: +v.entrada||0, data: v.data||'',
          src: 'avulso', srcNome: 'Venda avulsa'
        });
      });
    });
    /* Feedbacks (últimos 3 ciclos por consultor) */
    Object.keys(d.feedbacksAll||{}).forEach(function(consNomeRaw){
      var consNome = String(consNomeRaw).toUpperCase().trim();
      if(!consultores[consNome]) consultores[consNome] = { nome: consNome, itens:[], feedbacks:[], pdis:[] };
      var fbs = d.feedbacksAll[consNomeRaw] || {};
      var arr = Object.values(fbs).filter(Boolean);
      arr.sort(function(a,b){return (b.data||'').localeCompare(a.data||'');});
      consultores[consNome].feedbacks = arr.slice(0,3);
    });
    /* PDIs ativos */
    Object.keys(d.pdisAll||{}).forEach(function(consNomeRaw){
      var consNome = String(consNomeRaw).toUpperCase().trim();
      if(!consultores[consNome]) consultores[consNome] = { nome: consNome, itens:[], feedbacks:[], pdis:[] };
      var pdis = d.pdisAll[consNomeRaw] || {};
      var arr = Object.entries(pdis).map(function(e){return Object.assign({_id:e[0]}, e[1]||{});});
      arr.sort(function(a,b){return (b._id||'').localeCompare(a._id||'');});
      consultores[consNome].pdis = arr.slice(0,2);
    });
    /* Calcula KPIs por consultor */
    var consList = Object.values(consultores).map(function(c){
      var its = c.itens;
      var pagos = its.filter(function(it){return it.status==='pago';});
      var negs  = its.filter(function(it){return it.status==='negociacao';});
      var ents  = its.filter(function(it){return it.status==='entrada';});
      var abts  = its.filter(function(it){var s=String(it.status||'').toLowerCase();return s===''||s==='-'||s==='aberto'||s==='desistiu';});
      var desistiu = its.filter(function(it){return it.status==='desistiu';}).length;
      var faturado = pagos.reduce(function(s,it){return s+(+it.valor||0);},0);
      var ticket = pagos.length ? faturado/pagos.length : 0;
      var convDen = pagos.length+negs.length+ents.length;
      var conv = convDen > 0 ? pagos.length/convDen : null;
      var apr = its.length > 0 ? pagos.length/its.length : null;
      var trDistintos = {}; pagos.forEach(function(it){if(it.treinamento)trDistintos[it.treinamento]=true;});
      /* Goal mais recente do período */
      var goalAtual = null;
      var mesAlvo = (d.meses && d.meses[d.meses.length-1]) || _hojeYM();
      var gItem = (d.goalsHist||[]).filter(function(g){return g.mes===mesAlvo;})[0];
      if(gItem && gItem.goals) goalAtual = gItem.goals[c.nome] || gItem.goals[String(c.nome).toUpperCase()];
      var metaBas = goalAtual ? +(goalAtual.metaBasica||goalAtual.metaValor||0) : 0;
      var metaMin = goalAtual ? +(goalAtual.metaMinima||0) : 0;
      var pctMeta = metaBas > 0 ? faturado/metaBas : null;
      /* Feedback médio (última nota) */
      var ultFb = c.feedbacks[0];
      var ultMedia = null;
      if(ultFb && ultFb.comps){
        var notas = Object.values(ultFb.comps).map(Number).filter(function(n){return !isNaN(n)&&n>=1;});
        if(notas.length) ultMedia = notas.reduce(function(s,n){return s+n;},0)/notas.length;
      }
      return {
        nome: c.nome,
        kpis: {
          totalClientes: its.length,
          pagos: pagos.length,
          negociacao: negs.length,
          entrada: ents.length,
          aberto: abts.length,
          desistiu: desistiu,
          faturado: faturado,
          ticket: ticket,
          conversao: conv,
          aproveitamento: apr,
          mixDistintos: Object.keys(trDistintos).length,
          metaBasica: metaBas,
          metaMinima: metaMin,
          pctMeta: pctMeta,
          ultFeedbackMedia: ultMedia
        },
        feedbacks: c.feedbacks,
        pdis: c.pdis,
        itens: c.itens,
        topNegociacoes: negs.slice(0,5)
      };
    });
    return {
      periodo: d.meses,
      consultores: consList
    };
  }

  /* ══════════════════════════════════════════════════════════
     CATÁLOGO DE ANÁLISES ESTRUTURADAS
     Cada item: { id, titulo, ico, tag, desc, fn(snapshot) -> htmlString }
     ══════════════════════════════════════════════════════════ */
  function _scoreNivelCor(v){
    if(v == null) return 'var(--muted)';
    if(v >= 8) return 'var(--green)';
    if(v >= 6) return 'var(--blue)';
    if(v >= 4) return 'var(--amber)';
    return 'var(--red)';
  }
  function _consPorScore(s){
    return s.consultores.slice().sort(function(a,b){
      var av = a.kpis.ultFeedbackMedia, bv = b.kpis.ultFeedbackMedia;
      if(av == null) return 1; if(bv == null) return -1;
      return av - bv;
    });
  }
  function _consPorFat(s){
    return s.consultores.slice().sort(function(a,b){return (b.kpis.faturado||0)-(a.kpis.faturado||0);});
  }
  var CATALOGO = [
    {
      id:'risco', titulo:'⚠ Quem está em risco', tag:'crítico',
      desc:'Consultores com média de feedback < 6 OU sem PDI + score baixo',
      fn: function(s){
        var risco = s.consultores.filter(function(c){
          var m = c.kpis.ultFeedbackMedia;
          var temPdiAtivo = c.pdis.some(function(p){return p.status === 'iniciado';});
          return (m != null && m < 6) || (m != null && m < 7 && !temPdiAtivo);
        }).sort(function(a,b){return (a.kpis.ultFeedbackMedia||10) - (b.kpis.ultFeedbackMedia||10);});
        if(!risco.length) return '<div class="fb-det-vazio">✅ Nenhum consultor em risco no momento.</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Consultor</th><th>Feedback</th><th>% Meta</th><th>PDI ativo</th><th>Motivo</th></tr></thead><tbody>'
          + risco.map(function(c){
              var fb = c.kpis.ultFeedbackMedia != null ? c.kpis.ultFeedbackMedia.toFixed(1) : '—';
              var pm = c.kpis.pctMeta != null ? Math.round(c.kpis.pctMeta*100)+'%' : '—';
              var pdi = c.pdis.find(function(p){return p.status==='iniciado';});
              var motivo = c.kpis.ultFeedbackMedia != null && c.kpis.ultFeedbackMedia < 6 ? '⚠ Feedback < 6' : '⚠ Sem PDI + score médio';
              return '<tr><td class="nome">'+c.nome+'</td><td style="color:'+_scoreNivelCor(c.kpis.ultFeedbackMedia)+';font-weight:700;">'+fb+'</td><td>'+pm+'</td><td>'+(pdi?'Sim · '+(pdi.alvos||[]).length+' alvos':'<span style="color:var(--red);">NÃO</span>')+'</td><td style="font-size:11px;color:var(--muted);">'+motivo+'</td></tr>';
            }).join('')
          + '</tbody></table>';
      }
    },
    {
      id:'top3', titulo:'🏆 Top 3 do período', tag:'ranking',
      desc:'Por faturamento no período selecionado',
      fn: function(s){
        var top = _consPorFat(s).slice(0,3);
        if(!top.length) return '<div class="fb-det-vazio">Sem dados.</div>';
        var medals = ['🥇','🥈','🥉'];
        return '<table class="fb-det-tbl"><thead><tr><th></th><th>Consultor</th><th class="val">Faturado</th><th>% Meta</th><th>Conversão</th><th>Ticket</th></tr></thead><tbody>'
          + top.map(function(c,i){
              return '<tr><td>'+medals[i]+'</td><td class="nome">'+c.nome+'</td><td class="val">'+_fmtR(c.kpis.faturado)+'</td><td>'+(c.kpis.pctMeta!=null?Math.round(c.kpis.pctMeta*100)+'%':'—')+'</td><td>'+(c.kpis.conversao!=null?Math.round(c.kpis.conversao*100)+'%':'—')+'</td><td>'+_fmtR(c.kpis.ticket)+'</td></tr>';
            }).join('')
          + '</tbody></table>';
      }
    },
    {
      id:'bot3', titulo:'🔻 Bottom 3 do período', tag:'ranking',
      desc:'Quem está mais distante da meta',
      fn: function(s){
        var bot = _consPorFat(s).filter(function(c){return c.kpis.metaBasica>0;}).reverse().slice(0,3);
        if(!bot.length) return '<div class="fb-det-vazio">Nenhum consultor com meta configurada.</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Consultor</th><th class="val">Faturado</th><th>Meta básica</th><th>% Meta</th><th>Gap</th></tr></thead><tbody>'
          + bot.map(function(c){
              var gap = Math.max(0, c.kpis.metaBasica - c.kpis.faturado);
              return '<tr><td class="nome">'+c.nome+'</td><td class="val">'+_fmtR(c.kpis.faturado)+'</td><td class="val">'+_fmtR(c.kpis.metaBasica)+'</td><td style="color:var(--red);font-weight:700;">'+(c.kpis.pctMeta!=null?Math.round(c.kpis.pctMeta*100)+'%':'—')+'</td><td class="val">'+_fmtR(gap)+'</td></tr>';
            }).join('')
          + '</tbody></table>';
      }
    },
    {
      id:'parados', titulo:'🤝 Negociações paradas críticas', tag:'risco',
      desc:'Negociações > 14 dias sem update por consultor',
      fn: function(s){
        var hoje = new Date();
        var rows = [];
        s.consultores.forEach(function(c){
          c.topNegociacoes.forEach(function(it){
            if(!it.data) return;
            try{
              var dias = Math.round((hoje - new Date(it.data))/86400000);
              if(dias > 14) rows.push({c:c.nome, cli:it.cliente, t:it.treinamento, v:it.valor, dias:dias, src:it.srcNome});
            }catch(e){}
          });
        });
        if(!rows.length) return '<div class="fb-det-vazio">✅ Nenhuma negociação parada > 14 dias.</div>';
        rows.sort(function(a,b){return b.dias-a.dias;});
        return '<table class="fb-det-tbl"><thead><tr><th>Dias</th><th>Consultor</th><th>Cliente</th><th>Treinamento</th><th>Origem</th><th class="val">Valor</th></tr></thead><tbody>'
          + rows.map(function(r){
              return '<tr><td style="color:var(--red);font-weight:800;">'+r.dias+'d</td><td>'+r.c+'</td><td class="nome">'+r.cli+'</td><td>'+r.t+'</td><td style="font-size:11px;color:var(--muted);">'+r.src+'</td><td class="val">'+_fmtR(r.v)+'</td></tr>';
            }).join('')
          + '</tbody></table>';
      }
    },
    {
      id:'mix', titulo:'📊 Mix por consultor', tag:'portfolio',
      desc:'Quem concentra demais em poucos produtos',
      fn: function(s){
        var arr = s.consultores.filter(function(c){return c.kpis.pagos>0;}).sort(function(a,b){return a.kpis.mixDistintos-b.kpis.mixDistintos;});
        if(!arr.length) return '<div class="fb-det-vazio">Sem vendas pagas no período.</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Consultor</th><th>Produtos vendidos</th><th>Pagos</th><th>Sinal</th></tr></thead><tbody>'
          + arr.map(function(c){
              var n = c.kpis.mixDistintos;
              var sinal = n <= 1 ? '<span style="color:var(--red);">⚠ concentração crítica</span>'
                         : n <= 2 ? '<span style="color:var(--amber);">⚠ pouco diversificado</span>'
                         : n <= 4 ? '<span style="color:var(--blue);">aceitável</span>'
                                  : '<span style="color:var(--green);">portfólio amplo</span>';
              return '<tr><td class="nome">'+c.nome+'</td><td><b>'+n+'</b></td><td>'+c.kpis.pagos+'</td><td>'+sinal+'</td></tr>';
            }).join('')
          + '</tbody></table>';
      }
    },
    {
      id:'pdi', titulo:'🌱 PDIs sugeridos', tag:'desenvolvimento',
      desc:'Consultores sem PDI ativo + score < 7',
      fn: function(s){
        var arr = s.consultores.filter(function(c){
          var temAtivo = c.pdis.some(function(p){return p.status === 'iniciado';});
          return !temAtivo && c.kpis.ultFeedbackMedia != null && c.kpis.ultFeedbackMedia < 7;
        });
        if(!arr.length) return '<div class="fb-det-vazio">✅ Todos os consultores com baixa nota já têm PDI ativo (ou não há).</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Consultor</th><th>Última média</th><th>Sugestão</th></tr></thead><tbody>'
          + arr.map(function(c){
              var ultFb = c.feedbacks[0];
              var menorComp = '—';
              if(ultFb && ultFb.comps){
                var min = null;
                Object.keys(ultFb.comps).forEach(function(k){
                  var v = +ultFb.comps[k]; if(v>=1 && (!min || v<min.v)) min = {k:k,v:v};
                });
                if(min) menorComp = min.k+' ('+min.v+'/10)';
              }
              return '<tr><td class="nome">'+c.nome+'</td><td style="color:'+_scoreNivelCor(c.kpis.ultFeedbackMedia)+';">'+c.kpis.ultFeedbackMedia.toFixed(1)+'</td><td>Criar PDI focado em <b>'+menorComp+'</b></td></tr>';
            }).join('')
          + '</tbody></table>';
      }
    },
    {
      id:'dep', titulo:'⚖ Dependência do top performer', tag:'risco-estrutural',
      desc:'% do faturamento concentrado no top 1',
      fn: function(s){
        var totFat = s.consultores.reduce(function(t,c){return t+c.kpis.faturado;},0);
        var top = _consPorFat(s);
        if(!top.length || !totFat) return '<div class="fb-det-vazio">Sem faturamento no período.</div>';
        var top1 = top[0];
        var pct = top1.kpis.faturado/totFat;
        var pctTop2 = top.slice(0,2).reduce(function(t,c){return t+c.kpis.faturado;},0)/totFat;
        var pctTop3 = top.slice(0,3).reduce(function(t,c){return t+c.kpis.faturado;},0)/totFat;
        var alerta = pct >= 0.5 ? '<b style="color:var(--red);">🚨 CRÍTICO</b> · se o '+top1.nome+' sair, perde '+Math.round(pct*100)+'% do fat.'
                   : pct >= 0.35 ? '<b style="color:var(--amber);">⚠ ATENÇÃO</b> · dependência alta'
                                 : '<b style="color:var(--green);">✅ saudável</b> · time distribuído';
        return '<div class="fb-det-stats">'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Top 1 ('+top1.nome+')</div><div class="fb-det-stat-val red">'+Math.round(pct*100)+'%</div></div>'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Top 2</div><div class="fb-det-stat-val amber">'+Math.round(pctTop2*100)+'%</div></div>'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Top 3</div><div class="fb-det-stat-val">'+Math.round(pctTop3*100)+'%</div></div>'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Total team</div><div class="fb-det-stat-val">'+s.consultores.length+'</div></div>'
          + '</div>'
          + '<div style="padding:14px;background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.25);border-radius:8px;font-size:13px;line-height:1.6;">'+alerta+'</div>';
      }
    },
    {
      id:'feedback', titulo:'📅 Quem precisa de 1:1 esta semana', tag:'gestão',
      desc:'Consultores sem feedback há > 14 dias',
      fn: function(s){
        var hoje = new Date();
        var arr = s.consultores.filter(function(c){
          if(!c.feedbacks.length) return true;
          var ult = c.feedbacks[0].data;
          if(!ult) return true;
          try{ var dias = Math.round((hoje - new Date(ult))/86400000); return dias > 14; }catch(e){return true;}
        });
        if(!arr.length) return '<div class="fb-det-vazio">✅ Time todo com feedback recente.</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Consultor</th><th>Último feedback</th><th>Sinal</th></tr></thead><tbody>'
          + arr.map(function(c){
              var ult = c.feedbacks.length ? c.feedbacks[0].data : null;
              var dias = ult ? Math.round((hoje - new Date(ult))/86400000) : '∞';
              return '<tr><td class="nome">'+c.nome+'</td><td>'+(ult||'—')+'</td><td><b style="color:var(--amber);">'+dias+'d sem ciclo</b></td></tr>';
            }).join('')
          + '</tbody></table>';
      }
    },
    {
      id:'desistiu', titulo:'⚰ Quem perdeu mais clientes', tag:'risco',
      desc:'Ranking de desistências no período',
      fn: function(s){
        var arr = s.consultores.filter(function(c){return c.kpis.desistiu>0;}).sort(function(a,b){return b.kpis.desistiu-a.kpis.desistiu;});
        if(!arr.length) return '<div class="fb-det-vazio">✅ Ninguém perdeu cliente no período.</div>';
        return '<table class="fb-det-tbl"><thead><tr><th>Consultor</th><th>Desistiu</th><th>Total carteira</th><th>Taxa perda</th></tr></thead><tbody>'
          + arr.map(function(c){
              var t = c.kpis.desistiu / Math.max(1, c.kpis.totalClientes);
              return '<tr><td class="nome">'+c.nome+'</td><td><b style="color:var(--red);">'+c.kpis.desistiu+'</b></td><td>'+c.kpis.totalClientes+'</td><td style="color:'+(t<0.1?'var(--green)':t<0.25?'var(--amber)':'var(--red)')+';font-weight:700;">'+Math.round(t*100)+'%</td></tr>';
            }).join('')
          + '</tbody></table>';
      }
    },
    {
      id:'visao', titulo:'🔭 Visão estratégica do time', tag:'overview',
      desc:'KPIs agregados + alertas principais',
      fn: function(s){
        var tot = s.consultores.reduce(function(a,c){return {fat:a.fat+c.kpis.faturado, pag:a.pag+c.kpis.pagos, neg:a.neg+c.kpis.negociacao, des:a.des+c.kpis.desistiu};},{fat:0,pag:0,neg:0,des:0});
        var totMetaBas = s.consultores.reduce(function(t,c){return t+c.kpis.metaBasica;},0);
        var pctTime = totMetaBas > 0 ? tot.fat/totMetaBas : null;
        return '<div class="fb-det-stats">'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Faturado time</div><div class="fb-det-stat-val green">'+_fmtR(tot.fat)+'</div></div>'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Meta agregada</div><div class="fb-det-stat-val">'+_fmtR(totMetaBas)+'</div></div>'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">% Meta time</div><div class="fb-det-stat-val blue">'+(pctTime!=null?Math.round(pctTime*100)+'%':'—')+'</div></div>'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Pagos</div><div class="fb-det-stat-val green">'+tot.pag+'</div></div>'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Em negociação</div><div class="fb-det-stat-val amber">'+tot.neg+'</div></div>'
          + '<div class="fb-det-stat"><div class="fb-det-stat-lbl">Desistiram</div><div class="fb-det-stat-val red">'+tot.des+'</div></div>'
          + '</div>';
      }
    }
  ];

  /* ── Render do catálogo ────────────────────────────── */
  function _iaRenderCat(){
    var el = document.getElementById('iaCatList');
    if(!el) return;
    el.innerHTML = CATALOGO.map(function(c){
      return '<div class="ia-cat-item" onclick="_iaRodarCat(\''+c.id+'\')">'
        + '<div class="ia-cat-item-h">'
        +   '<div class="ia-cat-item-titulo">'+c.titulo+'</div>'
        +   '<span class="ia-cat-item-tag">'+c.tag+'</span>'
        + '</div>'
        + '<div class="ia-cat-item-desc">'+c.desc+'</div>'
        + '</div>';
    }).join('');
  }
  window._iaRodarCat = function(id){
    var item = CATALOGO.filter(function(c){return c.id===id;})[0];
    if(!item) return;
    _iaCarregar(function(snap){
      if(!snap){ if(typeof _showToast==='function') _showToast('❌ Erro carregando dados.','var(--red)'); return; }
      var html = item.fn(snap);
      var perLbl = (snap.periodo||[]).join(' · ');
      document.getElementById('iaResTitulo').innerHTML = item.titulo + ' <span style="font-size:11px;color:var(--muted);font-weight:500;">· '+perLbl+'</span>';
      document.getElementById('iaResBody').innerHTML = html;
      document.getElementById('iaResModal').classList.add('show');
    });
  };
  window._iaResFechar = function(){
    var m = document.getElementById('iaResModal');
    if(m) m.classList.remove('show');
  };

  /* ── Período (chips) ───────────────────────────────── */
  window._iaSetPer = function(p){
    _iaPer = p;
    document.querySelectorAll('.ia-per-chip').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-per') === p);
    });
    var i1 = document.getElementById('iaPerStart');
    var i2 = document.getElementById('iaPerEnd');
    if(p === 'manual'){
      i1.style.display = ''; i2.style.display = '';
      if(!i1.value) i1.value = _addMes(_hojeYM(), -2);
      if(!i2.value) i2.value = _hojeYM();
      _iaPerStart = i1.value; _iaPerEnd = i2.value;
      i1.onchange = function(){_iaPerStart = this.value;};
      i2.onchange = function(){_iaPerEnd = this.value;};
    } else {
      i1.style.display = 'none'; i2.style.display = 'none';
    }
  };

  /* ── Prompt builder + copiar ──────────────────────── */
  function _iaMontarPrompt(pergunta){
    if(!_iaDados) return '';
    var s = _iaDados;
    var linhas = [];
    linhas.push('# Contexto');
    linhas.push('Você é um diretor comercial sênior da Febracis (empresa de treinamentos de inteligência emocional e desenvolvimento humano comportamental). Responda em português brasileiro, objetivo, acionável. Use bullet points e tabelas quando ajudar. Indique sempre o nome do consultor citado.');
    linhas.push('');
    linhas.push('# Período de análise');
    linhas.push('Meses: ' + (s.periodo || []).join(' · '));
    linhas.push('');
    linhas.push('# Equipe ('+s.consultores.length+' consultores)');
    s.consultores.forEach(function(c){
      var k = c.kpis;
      linhas.push('## ' + c.nome);
      linhas.push('- Carteira: ' + k.totalClientes + ' clientes (pagos ' + k.pagos + ' · negoc ' + k.negociacao + ' · entrada ' + k.entrada + ' · aberto ' + k.aberto + ' · desistiu ' + k.desistiu + ')');
      linhas.push('- Faturado: ' + _fmtR(k.faturado) + (k.metaBasica>0?' · meta básica ' + _fmtR(k.metaBasica) + ' · % meta ' + (k.pctMeta!=null?Math.round(k.pctMeta*100)+'%':'—'):''));
      linhas.push('- Conversão: ' + (k.conversao!=null?Math.round(k.conversao*100)+'%':'—') + ' · Ticket médio: ' + _fmtR(k.ticket) + ' · Aproveitamento: ' + (k.aproveitamento!=null?Math.round(k.aproveitamento*100)+'%':'—') + ' · Mix de produto: ' + k.mixDistintos + ' distintos');
      if(c.feedbacks.length){
        linhas.push('- Últimos ciclos de feedback:');
        c.feedbacks.forEach(function(f){
          var comps = f.comps || {};
          var notas = Object.keys(comps).map(function(k){return k+':'+comps[k];}).join(' · ');
          linhas.push('  - ' + (f.data||'—') + ' (' + (f.ciclo||'—') + '): ' + notas + (f.notaGestor?' · Obs: '+String(f.notaGestor).substring(0,180).replace(/\n/g,' '):''));
        });
      }
      if(c.pdis.length){
        linhas.push('- PDIs:');
        c.pdis.forEach(function(p){
          var alvos = (p.alvos||[]).map(function(a){return a.key+' (atual '+a.atual+'→alvo '+a.alvo+', status '+a.status+')';}).join(' · ');
          linhas.push('  - ' + (p._id||'—') + ' [' + (p.status||'—') + ']: ' + alvos);
        });
      }
      if(c.topNegociacoes.length){
        linhas.push('- Top negociações ativas: ' + c.topNegociacoes.map(function(it){return it.cliente+' ('+it.treinamento+' · '+_fmtR(it.valor)+')';}).join(' · '));
      }
      linhas.push('');
    });
    linhas.push('# Pergunta do gestor');
    linhas.push(pergunta || '(sem pergunta — me dê um diagnóstico geral do time com 3 alertas e 3 oportunidades.)');
    linhas.push('');
    linhas.push('# Formato esperado');
    linhas.push('1. Resposta direta à pergunta (3-6 bullets).');
    linhas.push('2. Riscos detectados que o gestor pode ter ignorado.');
    linhas.push('3. Ações concretas pra próxima semana (no máximo 5).');
    return linhas.join('\n');
  }

  window._iaPrev = function(){
    var pergunta = (document.getElementById('iaPergunta')||{}).value || '';
    _iaCarregar(function(){
      var txt = _iaMontarPrompt(pergunta);
      var pre = document.getElementById('iaPromptPreview');
      if(pre){ pre.textContent = txt; pre.style.display = 'block'; }
    });
  };
  window._iaCopiar = function(){
    var pergunta = (document.getElementById('iaPergunta')||{}).value || '';
    _iaCarregar(function(){
      var txt = _iaMontarPrompt(pergunta);
      if(!txt){ if(typeof _showToast==='function') _showToast('⚠️ Sem dados carregados.','var(--amber)'); return; }
      if(navigator.clipboard){
        navigator.clipboard.writeText(txt).then(function(){
          if(typeof _showToast==='function') _showToast('✅ Prompt copiado. Cole no Claude.ai (sua conta MAX).','var(--accent)');
        }).catch(function(){
          _iaCopiarFallback(txt);
        });
      } else {
        _iaCopiarFallback(txt);
      }
    });
  };
  function _iaCopiarFallback(txt){
    var t = document.createElement('textarea');
    t.value = txt; document.body.appendChild(t); t.select();
    try{ document.execCommand('copy'); if(typeof _showToast==='function') _showToast('✅ Prompt copiado.','var(--accent)'); }
    catch(e){ if(typeof _showToast==='function') _showToast('❌ Não copiou. Use Visualizar e copie manualmente.','var(--red)'); }
    document.body.removeChild(t);
  }

  /* ── Salvar resposta no histórico ──────────────────── */
  window._iaSalvarResposta = function(){
    var pergunta = (document.getElementById('iaPergunta')||{}).value || '';
    var resposta = (document.getElementById('iaResposta')||{}).value || '';
    if(!resposta.trim()){
      if(typeof _showToast==='function') _showToast('⚠️ Cole a resposta primeiro.','var(--amber)');
      return;
    }
    if(typeof window._fbSave !== 'function'){ if(typeof _showToast==='function') _showToast('❌ Firebase indisponível.','var(--red)'); return; }
    var ts = Date.now();
    var doc = {
      pergunta: pergunta || '(sem pergunta)',
      resposta: resposta,
      ts: ts,
      data: new Date().toISOString(),
      periodo: (_iaDados && _iaDados.periodo) || []
    };
    window._fbSave('icIAHist/'+ts, doc).then(function(){
      if(typeof _showToast==='function') _showToast('✅ Resposta salva no histórico.','var(--accent)');
      document.getElementById('iaResposta').value = '';
      _iaCarregarHist();
    }).catch(function(){
      if(typeof _showToast==='function') _showToast('❌ Erro ao salvar.','var(--red)');
    });
  };

  function _iaCarregarHist(){
    var el = document.getElementById('iaHistorico');
    if(!el) return;
    if(typeof window._fbGet !== 'function'){ el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;">Firebase indisponível.</div>'; return; }
    window._fbGet('icIAHist').then(function(d){
      var arr = Object.values(d||{}).filter(Boolean);
      arr.sort(function(a,b){return (b.ts||0) - (a.ts||0);});
      arr = arr.slice(0,30);
      if(!arr.length){ el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;">Sem consultas salvas.</div>'; return; }
      el.innerHTML = arr.map(function(h){
        var dt = h.data ? new Date(h.data).toLocaleString('pt-BR') : '—';
        return '<div class="ia-hist-item" onclick="_iaVerHist('+h.ts+')">'
          + '<div class="ia-hist-q">'+h.pergunta+'</div>'
          + '<div class="ia-hist-meta">'+dt+' · '+(h.periodo||[]).length+' meses</div>'
          + '</div>';
      }).join('');
    }).catch(function(){
      el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:14px;">Erro ao carregar histórico.</div>';
    });
  }
  window._iaVerHist = function(ts){
    if(typeof window._fbGet !== 'function') return;
    window._fbGet('icIAHist/'+ts).then(function(h){
      if(!h) return;
      document.getElementById('iaResTitulo').innerHTML = '🕒 ' + (h.pergunta||'') + ' <span style="font-size:11px;color:var(--muted);font-weight:500;">· '+(h.data?new Date(h.data).toLocaleString('pt-BR'):'')+'</span>';
      document.getElementById('iaResBody').innerHTML = '<div style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.6;color:var(--text);">'+h.resposta.replace(/</g,'&lt;')+'</div>';
      document.getElementById('iaResModal').classList.add('show');
    });
  };

  /* ── Init quando a aba IA é aberta ─────────────────── */
  var _iaInitDone = false;
  function _iaInit(){
    if(_iaInitDone) return;
    _iaInitDone = true;
    _iaRenderCat();
    _iaCarregarHist();
  }

  /* ── Hook no _icShowPane para tratar 'ia' ─────────── */
  var _origShowPaneIA = window._icShowPane;
  window._icShowPane = function(pane){
    if(typeof _origShowPaneIA === 'function') _origShowPaneIA(pane);
    document.querySelectorAll('#icTabs .ic-tab').forEach(function(t){
      t.classList.toggle('active', t.getAttribute('data-icpane') === pane);
    });
    document.querySelectorAll('#mapeamentoScreen .ic-pane').forEach(function(p){
      p.classList.toggle('show', p.getAttribute('data-icpane') === pane);
    });
    if(pane === 'ia') _iaInit();
  };

  /* ── Hook no abrirMapeamento: aplica controle de acesso ── */
  var _origAbrirMapIA = window.abrirMapeamento;
  if(typeof _origAbrirMapIA === 'function'){
    window.abrirMapeamento = function(btn){
      _origAbrirMapIA(btn);
      setTimeout(function(){
        var tab = document.getElementById('icTabIa');
        if(tab) tab.style.display = _iaPermitido() ? '' : 'none';
      }, 400);
    };
  }

})();
