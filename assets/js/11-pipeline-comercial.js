
/* ════════════════════════════════════════════════════════════
   NOVA PIPELINE COMERCIAL — JS COMPLETO
   Fonte A: turmas/{id}/clientes  (read-only, sync auto)
   Fonte B: pipelineSales/{mes}/  (escrita avulsos)
   Fonte C: pipelineGoals/{mes}/  (metas)
   Fonte D: usuarios/             (consultores)
════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Estado ──────────────────────────────────────────── */
  var _npAtivo=false;
  var _npMes=new Date().getMonth()+1;   /* 1-12 */
  var _npAno=new Date().getFullYear();
  var _npTabAtiva='dashboard';
  var _npVendasTurma=[];   /* cache mensal — fonte A */
  var _npVendasAvulso={}; /* cache Firebase — fonte B */
  var _npGoals={};         /* cache Firebase — fonte C */
  var _npConsultores=[];   /* lista unificada */
  var _npListeners=[];     /* funções de cleanup */
  var _npVendaEditId=null;
  var _npCarregando=false;
  var COR=['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8'];

  /* ── Helpers ─────────────────────────────────────────── */
  function _fmtR(v){
    return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function _mesKey(){
    return _npAno+'-'+String(_npMes).padStart(2,'0');
  }
  function _mesLabel(){
    var M=['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
           'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return M[_npMes-1]+' / '+_npAno;
  }
  function _esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _avatar(nome,i){
    var cor=COR[i%COR.length];
    var ini=(nome||'?').trim().charAt(0).toUpperCase();
    return '<div class="np-meta-avatar" style="background:'+cor+'22;color:'+cor+';border:1.5px solid '+cor+'55;">'+ini+'</div>';
  }
  function _stClass(st){
    var m={pago:'pago',aberto:'aberto',entrada:'entrada',negociacao:'negociacao',
           desistiu:'desistiu',estorno:'estorno'};
    return 'np-st np-st-'+(m[(st||'aberto').toLowerCase()]||'aberto');
  }
  function _npMoneyMask(v){
    /* Modo centavo: cada par de dígitos forma os centavos; formata como 1.500,00 */
    var n=String(v||'').replace(/\D/g,'');
    if(!n) return '';
    n=(parseInt(n,10)/100).toFixed(2);
    return n.replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  }

  /* ── Meta Geral: retorna valor definido ou Σ metas básicas ── */
  function getMetaEquipeMes(){
    if(window._npMetaGeral&&window._npMetaGeral.valor>0) return window._npMetaGeral.valor;
    return Object.values(window._npGoals||{}).reduce(function(s,g){return s+(+(g.metaBasica||g.metaValor||0));},0);
  }
  function _npAtualizarBtnConfigurar(){
    var _fmt=function(n){return 'R$ '+Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});};
    var todas=_npTodasVendas();
    var totalPago=todas.filter(function(vd){
      return String(vd.status||'').toLowerCase()==='pago';
    }).reduce(function(s,vd){return s+(+(vd.valor||0));},0);
    /* Faturado */
    var btnFat=document.getElementById('npBtnFaturamento');
    if(btnFat){
      var spans=btnFat.querySelectorAll('span');
      if(spans[1]) spans[1].textContent=_fmt(totalPago);
    }
    /* Falta */
    var btnFalta=document.getElementById('npBtnFaltaMeta');
    if(btnFalta){
      if(window._npMetaGeral&&window._npMetaGeral.valor>0){
        var v=window._npMetaGeral.valor;
        var falta=Math.max(0,v-totalPago);
        var batida=falta<=0;
        var spans2=btnFalta.querySelectorAll('span');
        if(spans2[0]) spans2[0].textContent=batida?'Meta batida!':'Falta p/ meta';
        if(spans2[1]) spans2[1].textContent=batida?'✅':'_fmt(falta)'.replace('_fmt(falta)',_fmt(falta));
        if(spans2[1]) spans2[1].textContent=batida?'✅ Batida!':_fmt(falta);
        btnFalta.style.background=batida?'rgba(52,211,153,.08)':'rgba(200,240,90,.06)';
        btnFalta.style.borderColor=batida?'rgba(52,211,153,.25)':'rgba(200,240,90,.2)';
        if(spans2[0]) spans2[0].style.color=batida?'rgba(52,211,153,.7)':'rgba(200,240,90,.7)';
        if(spans2[1]) spans2[1].style.color=batida?'var(--green)':'var(--accent)';
        btnFalta.style.display='flex';
      } else { btnFalta.style.display='none'; }
    }
  }

  /* ── Coletar consultores unificados ─────────────────── */
  function _npColetarConsultores(){
    var set={};
    /* De usuarios Firebase (perfil consultor) */
    if(window._npUsuarios){
      Object.values(window._npUsuarios).forEach(function(u){
        if(u&&u.perfil==='consultor'&&u.nome){
          set[u.nome.toUpperCase()]=u.nome;
        }
      });
    }
    /* De todas as vendas do mês (turma + avulso normalizados) */
    _npTodasVendas().forEach(function(v){
      var nome=(v.consultor||'').trim();
      if(nome) set[nome.toUpperCase()]=nome;
    });
    _npConsultores=Object.values(set).sort(function(a,b){return a.localeCompare(b,'pt-BR');});
    return _npConsultores;
  }

  /* ── Geração para invalidar callbacks/listeners antigos ── */
  var _npGen = 0;

  /* ── Coletar vendas da turma do mês ────────────────── */
  function _npColetarVendasTurma(){
    _npVendasTurma=[];
    window._npTurmasMeta={};  /* reset cache de metas das turmas do mês */
    if(typeof window._fbGet!=='function') return;
    var mkSnap = _mesKey();
    var genSnap = _npGen;
    /* Skeleton enquanto carrega */
    var _skelAlvos=['npTop3','npChartConsultores','npChartMeta','npMetasGrid','npTurmasAtingimentoGrid'];
    _skelAlvos.forEach(function(id){
      var el=document.getElementById(id);
      if(el&&typeof _skelOn==='function') _skelOn(el,_skelCards(3));
    });
    /* Buscar turmas e goals em paralelo — garante que _npGoals está pronto antes de renderizar */
    Promise.all([
      window._fbGet('turmas'),
      window._fbGet('pipelineGoals/'+mkSnap).catch(function(){return {};})
    ]).then(function(res){
      var turmas=res[0]; var goals=res[1];
      if(genSnap !== _npGen) return;
      /* Remover skeleton independente do resultado */
      _skelAlvos.forEach(function(id){
        var el=document.getElementById(id);
        if(el&&typeof _skelOff==='function') _skelOff(el);
      });
      /* Atualizar goals com dados frescos do mês */
      if(goals&&Object.keys(goals).length>0) _npGoals=goals;
      if(!turmas) { _npRenderTudo(); return; }
      Object.entries(turmas).forEach(function(e){
        var tid=e[0],td=e[1];
        if(td.mesMeta){
          /* Vínculo explícito (turmas com mesMeta definido) */
          if(td.mesMeta!==mkSnap) return;
        } else {
          /* Fallback legado: âncora em periodEnd — turma conta só no mês em que termina.
             Use mesMeta no modal ou _migrarMesMetaLegado() para controle explícito. */
          var pe=(td.periodEnd||td.periodStart||'').slice(0,7);
          if(pe!==mkSnap) return;
        }
        /* Cachear meta da turma para o bloco de atingimento */
        window._npTurmasMeta[tid]={nome:td.nome||tid,meta:+(td.meta||0)};
        var cls=td.clientes||[];
        if(!Array.isArray(cls)&&typeof cls==='object') cls=Object.values(cls).filter(Boolean);
        cls.forEach(function(cl){
          if(!cl.consultor||!cl.consultor.trim()) return; /* sem consultor = não conta */
          _npVendasTurma.push({
            _src:'turma', _turmaId:tid, _turmaNome:td.nome||tid,
            cliente:cl.cliente||cl.nome||'—',
            consultor:(cl.consultor||'').trim(),
            treinamento:cl.treinamento||'—',
            valor:+(cl.valor||0),
            entrada:+(cl.entrada||0),
            status:(cl.status||'aberto').toLowerCase(),
            data:cl.data||td.periodStart||''
          });
        });
      });
      _npRenderTudo();
    }).catch(function(e){
      _skelAlvos.forEach(function(id){var el=document.getElementById(id);if(el&&typeof _skelOff==='function')_skelOff(el);});
      console.error('[NP] Erro ao carregar turmas/goals:',e);
      _showToast('❌ Erro ao carregar dados do mês','error');
    });
  }

  /* ── Listener Firebase para vendas avulsas ────────── */
  var _npListenerAvulso=null;
  var _npListenerGoals=null;
  var _npListenerUsuarios=null;
  var _npListenerMetaGeral=null;
  window._npMetaGeral=null;

  function _npIniciarListeners(){
    /* Incrementar geração: callbacks antigos devem ignorar payloads */
    _npGen++;
    var _genLocal = _npGen;

    /* Limpar listeners anteriores (suporte síncrono e Promise vinda do stub) */
    function _safeUnsub(u){
      if(!u) return;
      if(typeof u === 'function'){ try{ u(); }catch(e){} return; }
      if(u && typeof u.then === 'function'){
        u.then(function(real){ if(typeof real === 'function'){ try{ real(); }catch(e){} } }).catch(function(){});
      }
    }
    _safeUnsub(_npListenerAvulso);     _npListenerAvulso=null;
    _safeUnsub(_npListenerGoals);      _npListenerGoals=null;
    _safeUnsub(_npListenerUsuarios);   _npListenerUsuarios=null;
    _safeUnsub(_npListenerMetaGeral);  _npListenerMetaGeral=null;
    window._npMetaGeral=null;

    var mk=_mesKey();

    /* Vendas avulsas do mês */
    if(typeof window._fbChange==='function'){
      _npListenerAvulso=window._fbChange('pipelineSales/'+mk, function(data){
        if(_genLocal !== _npGen) return;
        _npVendasAvulso=data||{};
        _npRenderTudo();
      });
    } else {
      /* Fallback: fbGet */
      window._fbGet('pipelineSales/'+mk).then(function(d){
        if(_genLocal !== _npGen) return;
        _npVendasAvulso=d||{};
        _npRenderTudo();
      }).catch(function(){
        if(_genLocal !== _npGen) return;
        _npVendasAvulso={};_npRenderTudo();
      });
    }

    /* Goals do mês */
    if(typeof window._fbChange==='function'){
      _npListenerGoals=window._fbChange('pipelineGoals/'+mk, function(data){
        if(_genLocal !== _npGen) return;
        _npGoals=data||{};
        _npRenderTudo();
      });
    } else {
      window._fbGet('pipelineGoals/'+mk).then(function(d){
        if(_genLocal !== _npGen) return;
        _npGoals=d||{};
        _npRenderTudo();
      }).catch(function(){
        if(_genLocal !== _npGen) return;
        _npGoals={};_npRenderTudo();
      });
    }

    /* Meta Geral do time */
    if(typeof window._fbChange==='function'){
      _npListenerMetaGeral=window._fbChange('pipelineMetaGeral/'+mk, function(data){
        if(_genLocal !== _npGen) return;
        window._npMetaGeral=(data&&data.valor>0)?data:null;
        _npAtualizarBtnConfigurar();
        _npRenderTudo();
      });
    } else {
      window._fbGet('pipelineMetaGeral/'+mk).then(function(d){
        if(_genLocal !== _npGen) return;
        window._npMetaGeral=(d&&d.valor>0)?d:null;
        _npAtualizarBtnConfigurar();
        _npRenderTudo();
      }).catch(function(){});
    }

    /* Usuarios (consultores) */
    if(typeof window._fbChange==='function'){
      _npListenerUsuarios=window._fbChange('usuarios', function(us){
        if(_genLocal !== _npGen) return;
        window._npUsuarios=us||{};
        _npColetarConsultores();
        _npRenderTudo();
      });
    } else {
      window._fbGet('usuarios').then(function(us){
        if(_genLocal !== _npGen) return;
        window._npUsuarios=us||{};
        _npColetarConsultores();
      }).catch(function(){});
    }
  }

  /* ── Todas as vendas do mês (A + B) ──────────────── */
  function _npTodasVendas(){
    var avulsos=Object.entries(_npVendasAvulso||{}).map(function(e){
      var v=e[1]||{};
      /* Compat: vendas avulsas antigas guardam o nome em consultorNome/clienteNome.
         Normaliza para consultor/cliente para que filtros, ranking e dashboard funcionem. */
      return Object.assign({},v,{
        _id:e[0],
        _src:'avulso',
        consultor:v.consultor||v.consultorNome||'',
        cliente:v.cliente||v.clienteNome||''
      });
    });
    return _npVendasTurma.concat(avulsos);
  }

  /* ── Aplicar filtros ─────────────────────────────── */
  function _npFiltrar(lista){
    var q=(document.getElementById('npVendasSearch')||{}).value||'';
    var cons=(document.getElementById('npFiltroConsultor')||{}).value||'';
    var st=(document.getElementById('npFiltroStatus')||{}).value||'';
    var ori=(document.getElementById('npFiltroOrigem')||{}).value||'';
    var sessao=typeof _getSessao==='function'?_getSessao():null;
    var isPerfil=sessao&&sessao.perfil==='consultor';

    return lista.filter(function(v){
      if(isPerfil){
        var meuNome=(sessao.nome||sessao.login||'').toUpperCase();
        var consVenda=(v.consultor||'').toUpperCase();
        if(!consVenda||consVenda!==meuNome) return false;
      }
      if(cons&&(v.consultor||'').toUpperCase()!==cons.toUpperCase()) return false;
      if(st&&(v.status||'').toLowerCase()!==st.toLowerCase()) return false;
      if(ori){
        if(ori.slice(0,2)==='t:'){if(v._turmaId!==ori.slice(2)) return false;}
        else{if(v._src!==ori) return false;}
      }
      if(q){
        var ql=q.toLowerCase();
        if(!(v.cliente||'').toLowerCase().includes(ql)&&
           !(v.consultor||'').toLowerCase().includes(ql)&&
           !(v.treinamento||v.produto||'').toLowerCase().includes(ql)) return false;
      }
      return true;
    });
  }

  /* ── Calcular KPIs ───────────────────────────────── */
  function _npCalcKpis(vendas){
    var faturado=0,emAberto=0,entrada=0,potencial=0;
    var qtdPago=0,qtdAberto=0,qtdEntrada=0,qtdNegociacao=0;
    var turmaV=0,avulsoV=0,qtdT=0,qtdA=0,qtdTurmaAll=0;
    vendas.forEach(function(v){
      var val=+(v.valor||0);
      var st=(v.status||'').toLowerCase();
      if(st==='cancelado') return;
      /* Potencial total = somente vendas em negociação */
      if(st==='negociacao'){potencial+=val;qtdNegociacao++;}
      if(st==='pago'){faturado+=val;qtdPago++;}
      else if(st==='aberto'){emAberto+=val;qtdAberto++;}
      else if(st==='entrada'){entrada+=val;qtdEntrada++;}
      if(v._src==='turma'){
        qtdTurmaAll++;
        if(st==='pago'){turmaV+=val;qtdT++;}
      } else {
        if(st!=='cancelado'){avulsoV+=val;qtdA++;}
      }
    });
    var total=turmaV+avulsoV;
    var qtd=qtdT+qtdA;
    return{faturado,emAberto,entrada,potencial,
           qtdPago,qtdAberto,qtdEntrada,qtdNegociacao,
           total,turmaV,avulsoV,qtdT,qtdA,qtd,qtdTurmaAll,
           ticket:qtd?total/qtd:0,
           conv:qtdTurmaAll?Math.round(qtdT/qtdTurmaAll*100):0};
  }

  /* ── Calcular por consultor ──────────────────────── */
  /* sortBy: 'pago' (padrão, para metas) | 'total' (para ranking de volume) */
  function _npPorConsultor(vendas,filtroSrc,sortBy){
    var map={};
    vendas.forEach(function(v){
      if(filtroSrc&&v._src!==filtroSrc) return;
      var n=(v.consultor||'Sem consultor').trim();
      if(!map[n]) map[n]={nome:n,total:0,pago:0,qtd:0,qtdPago:0};
      var val=+(v.valor||0);
      var st=(v.status||'').toLowerCase();
      map[n].qtd++;
      if(st==='pago'){
        map[n].pago+=val;   /* único status que abate meta */
        map[n].qtdPago++;
      }
      if(st==='negociacao') map[n].total+=val; /* potencial = somente em negociação */
    });
    var _sb=sortBy||'pago';
    return Object.values(map).sort(function(a,b){return b[_sb]-a[_sb];});
  }
  window._npPorConsultor=_npPorConsultor;

  /* ── Render tudo ─────────────────────────────────── */
  function _npRenderTudo(){
    if(!_npAtivo) return;
    _npRenderLabel();
    _npAtualizarBtnConfigurar();
    _npColetarConsultores();
    _npPopularFiltros();
    var todas=_npTodasVendas();
    if(_npTabAtiva==='dashboard') _npRenderDashboard(todas);
    else if(_npTabAtiva==='vendas') { if(typeof window.npRenderVendas==='function') window.npRenderVendas(); }
    else if(_npTabAtiva==='metas'){ if(typeof window._npRenderMetasOverride==='function') window._npRenderMetasOverride(todas); else _npRenderMetas(todas); }
    else if(_npTabAtiva==='ranking') { if(typeof window.npRenderRanking==='function') window.npRenderRanking(); }
    else if(_npTabAtiva==='funil') { if(typeof window._fnlRender==='function') window._fnlRender(); }
    if(typeof window._fuInit==='function') window._fuInit(_mesKey());
  }

  function _npRenderLabel(){
    var el=document.getElementById('npMesLabel');
    var el2=document.getElementById('npBadgeMes');
    if(el) el.textContent=_mesLabel();
    if(el2) el2.textContent=_mesKey();
  }

  function _npPopularFiltros(){
    var sel=document.getElementById('npFiltroConsultor');
    if(!sel) return;
    var cur=sel.value;
    sel.innerHTML='<option value="">Todos consultores</option>';
    _npConsultores.forEach(function(n){
      var o=document.createElement('option');o.value=n;o.textContent=n;sel.appendChild(o);
    });
    if(cur) sel.value=cur;
    /* Se valor anterior não existe mais entre as options (consultor sem vendas neste mês),
       resetar explicitamente e disparar refiltragem para evitar filtro silenciosamente vazio. */
    if(cur && sel.value !== cur){
      sel.value='';
      if(typeof _npFiltrar==='function') _npFiltrar();
    }
    /* Popular select do modal */
    var mSel=document.getElementById('npVendaConsultor');
    if(mSel){
      var mc=mSel.value;
      mSel.innerHTML='<option value="">— Selecione —</option>';
      _npConsultores.forEach(function(n){
        var o=document.createElement('option');o.value=n;o.textContent=n;mSel.appendChild(o);
      });
      if(mc) mSel.value=mc;
    }
    /* Popular turmas no filtro de origem (Vendas) */
    var oriSel=document.getElementById('npFiltroOrigem');
    if(oriSel){
      var prevOri=oriSel.value;
      oriSel.innerHTML='<option value="">Turma + Avulso</option>'
        +'<option value="turma">S\xf3 turma</option>'
        +'<option value="avulso">S\xf3 avulso</option>';
      var _turmas=window._npTurmasMeta||{};
      Object.entries(_turmas).sort(function(a,b){return (a[1].nome||'').localeCompare(b[1].nome||'','pt');}).forEach(function(e){
        var o=document.createElement('option');
        o.value='t:'+e[0];
        o.textContent=e[1].nome||e[0];
        oriSel.appendChild(o);
      });
      if(prevOri) oriSel.value=prevOri;
    }
  }

  /* ── Dashboard ───────────────────────────────────── */
  function _npRenderDashboard(todas){
    function set(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}

    var COR=window._npCOR||['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8'];

    /* Sem dados no mes */
    var semDados=_npVendasTurma.length===0&&Object.keys(_npVendasAvulso||{}).length===0;
    if(semDados){
      ['npKpiFaturado','npKpiAberto','npKpiPotencial','npKpiEntrada'].forEach(function(id){set(id,'R$ 0');});
      set('npKpiFaturadoSub','0 pagos');set('npKpiAbertoSub','0 em aberto');
      set('npKpiPotencialSub','0 negocios');set('npKpiEntradaSub','0 entradas');
      set('npKpiFaltam','--');set('npKpiFaltamSub','');
      var _t3=document.getElementById('npTop3');
      if(_t3)_t3.innerHTML='<div class="np-empty">Nenhum dado para este mes.</div>';
      var _cc=document.getElementById('npChartConsultores');if(_cc)_cc.innerHTML='';
      var _cm=document.getElementById('npChartMeta');if(_cm)_cm.innerHTML='';
      var _al=document.getElementById('npAlertaStrip');if(_al)_al.classList.remove('visible');
      var _ta=document.getElementById('npTurmasAtingimento');if(_ta)_ta.style.display='none';
      var _pp=document.getElementById('npPerfPanel');if(_pp)_pp.style.display='none';
      return;
    }
    var pp=document.getElementById('npPerfPanel');if(pp) pp.style.display='';

    var kpis=_npCalcKpis(todas);

    /* KPI cards */
    set('npKpiFaturado',_fmtR(kpis.faturado));
    set('npKpiFaturadoSub',kpis.qtdPago+' pago'+(kpis.qtdPago!==1?'s':''));
    set('npKpiAberto',_fmtR(kpis.emAberto));
    set('npKpiAbertoSub',kpis.qtdAberto+' em aberto');
    set('npKpiPotencial',_fmtR(kpis.potencial));
    set('npKpiPotencialSub',(kpis.qtdNegociacao||0)+' em negociação');
    set('npKpiEntrada',_fmtR(kpis.entrada));
    set('npKpiEntradaSub',kpis.qtdEntrada+' entrada'+(kpis.qtdEntrada!==1?'s':''));

    /* Faltam para meta (meta geral se definida, senão soma metas básicas) */
    var metaEquipe=getMetaEquipeMes();
    var _temMetaGeral=!!(window._npMetaGeral&&window._npMetaGeral.valor>0);
    var _somaIndividual=Object.values(_npGoals||{}).reduce(function(s,g){return s+(+(g.metaBasica||g.metaValor||0));},0);
    var faltamCard=document.getElementById('npKpiFaltamCard');
    if(metaEquipe<=0){
      set('npKpiFaltam','--');set('npKpiFaltamSub','Meta não configurada');
      if(faltamCard) faltamCard.className='np-kpi np-kpi--red';
    } else {
      var faltamV=Math.max(metaEquipe-kpis.faturado,0);
      var pctAtg=Math.round(kpis.faturado/metaEquipe*100);
      var _tipoMeta=_temMetaGeral?' · 🌐 meta geral':(_somaIndividual>0?' · Σ individuais':'');
      if(faltamV===0){
        set('npKpiFaltam','META!');
        set('npKpiFaltamSub','+'+_fmtR(kpis.faturado-metaEquipe)+' acima'+_tipoMeta);
        if(faltamCard) faltamCard.className='np-kpi np-kpi--green';
      } else {
        set('npKpiFaltam',_fmtR(faltamV));
        set('npKpiFaltamSub',pctAtg+'% atingido'+_tipoMeta);
        if(faltamCard) faltamCard.className='np-kpi np-kpi--red';
      }
    }

    /* Performance bar */
    var getCol=typeof window._npGetCol==='function'?window._npGetCol:function(){return{bar:'#888',text:'var(--muted)'};};
    if(metaEquipe>0){
      var perfPct=Math.round(kpis.faturado/metaEquipe*100);
      var col=getCol(perfPct);
      var barW=Math.min(perfPct,100);
      var fill=document.getElementById('npPerfFill');
      var pctEl=document.getElementById('npPerfPct');
      if(fill){fill.style.width=barW+'%';fill.style.background=col.bar;}
      if(pctEl){pctEl.textContent=perfPct+'%';pctEl.style.color=col.text;}
      set('npPerfFat','Faturado: '+_fmtR(kpis.faturado)+(_temMetaGeral?' 🌐':''));
      set('npPerfFalta',faltamV>0?'Faltam: '+_fmtR(faltamV):'Meta atingida!');
      var perfPanel=document.getElementById('npPerfPanel');
      if(perfPanel){
        perfPanel.querySelectorAll('.np-leg').forEach(function(leg){
          var cls=Array.from(leg.classList).find(function(c){return['c0','c25','c50','c75','c100'].indexOf(c)>=0;});
          var threshMap={c0:0,c25:25,c50:50,c75:75,c100:100};
          var thresh=cls!=null?threshMap[cls]:-1;
          var isActive=(thresh===0&&perfPct<25)||(thresh===25&&perfPct>=25&&perfPct<50)
            ||(thresh===50&&perfPct>=50&&perfPct<75)||(thresh===75&&perfPct>=75&&perfPct<100)
            ||(thresh===100&&perfPct>=100);
          leg.style.opacity=isActive?'1':'0.4';
          leg.style.transform=isActive?'scale(1.05)':'scale(1)';
        });
      }
    } else {
      var fill2=document.getElementById('npPerfFill');
      var pctEl2=document.getElementById('npPerfPct');
      if(fill2){fill2.style.width='0%';fill2.style.background='rgba(255,255,255,.1)';}
      if(pctEl2){pctEl2.textContent='--';pctEl2.style.color='var(--muted)';}
      set('npPerfFat','Configure metas para ver performance');set('npPerfFalta','');
    }

    /* Top 3 */
    var ranking=_npPorConsultor(todas,'');
    var top3=document.getElementById('npTop3');
    if(top3){
      if(!ranking.length){
        top3.innerHTML='<div class="np-empty">Sem vendas neste mes.</div>';
        var _cc2=document.getElementById('npChartConsultores');if(_cc2)_cc2.innerHTML='';
        var _cm2=document.getElementById('npChartMeta');if(_cm2)_cm2.innerHTML='';
        var _al2=document.getElementById('npAlertaStrip');if(_al2)_al2.classList.remove('visible');
        return;
      }
      var _goals3=window._npGoals||{};
      top3.innerHTML=ranking.slice(0,3).map(function(r,i){
        var cor=COR[i%COR.length];
        var t=_npGetMetaAtiva(_goals3[r.nome]||{},r.pago);
        var col=_npGetCol(t.pct);
        var pctTxt=t.meta?'<span style="font-size:9px;font-weight:700;color:'+col.text+';margin-left:4px;">'+t.pct+'%</span>':'';
        return '<div class="np-rank-card" style="border-color:'+col.border+';background:'+col.bg+';">'
          +'<div class="np-rank-pos">'+(i+1)+'</div>'
          +'<div class="np-rank-avatar" style="background:'+cor+'22;color:'+cor+';border:1.5px solid '+cor+'55;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;">'+r.nome.charAt(0).toUpperCase()+'</div>'
          +'<div class="np-rank-info"><div class="np-rank-nome">'+_esc(r.nome)+'</div>'
          +'<div class="np-rank-val" style="color:'+col.text+';">'+_fmtR(r.pago)+pctTxt+'</div>'
          +'<div style="font-size:9px;color:var(--muted);">pot. '+_fmtR(r.total)+' &middot; '+(r.qtd?Math.round(r.qtdPago/r.qtd*100):0)+'% conv</div>'
          +'</div>'
          +'</div>';
      }).join('');
    }

    /* Grafico consultores */
    var chartCons=document.getElementById('npChartConsultores');
    if(chartCons){
      var _goalsCh=window._npGoals||{};
      var maxV=ranking.length?Math.max.apply(null,ranking.map(function(r){return r.pago;})):1;
      if(!maxV) maxV=1;
      chartCons.innerHTML=ranking.length
        ?ranking.map(function(r,i){
            var cor=COR[i%COR.length];
            var barPct=Math.round(r.pago/maxV*100);
            var t=_npGetMetaAtiva(_goalsCh[r.nome]||{},r.pago);
            var col=_npGetCol(t.pct);
            var metaInfo=t.meta?'<span style="font-size:9px;color:'+col.text+';margin-left:6px;font-weight:700;">'+t.pct+'% '+t.label+'</span>':'';
            var potInfo='<span style="font-size:9px;color:var(--muted);margin-left:4px;">pot. '+_fmtR(r.total)+'</span>';
            return '<div class="np-bar-row">'
              +'<div class="np-bar-nome" title="'+_esc(r.nome)+'">'+_esc(r.nome)+'</div>'
              +'<div class="np-bar-track"><div class="np-bar-fill" style="width:'+barPct+'%;background:'+col.bar+'"></div></div>'
              +'<div class="np-bar-val" style="color:'+col.text+';">'+_fmtR(r.pago)+metaInfo+potInfo+'</div>'
              +'</div>';
          }).join('')
        :'<div class="np-empty">Sem dados.</div>';
    }

    /* Grafico Meta x Realizado */
    var chartMeta=document.getElementById('npChartMeta');
    if(chartMeta){
      var _consNasTurmasChart=new Set(_npVendasTurma.map(function(v){return (v.consultor||'').trim().toUpperCase();}));
      var rows=_npConsultores.filter(function(nome){return _consNasTurmasChart.has((nome||'').trim().toUpperCase());}).map(function(nome,i){
        var meta=_npGoals[nome]?+((_npGoals[nome].metaValor)||0):0;
        var real=(ranking.find(function(r){return r.nome.toUpperCase()===nome.toUpperCase();})||{}).pago||0;
        var pctMeta=meta>0?Math.round(real/meta*100):0;
        return{nome:nome,meta:meta,real:real,pctMeta:pctMeta,i:i};
      }).filter(function(r){return r.meta>0||r.real>0;}).sort(function(a,b){return b.real-a.real;});
      var _vals=rows.map(function(r){return Math.max(r.meta,r.real);});
      var maxMR=_vals.length?Math.max.apply(null,_vals):1;
      if(!maxMR) maxMR=1;
      chartMeta.innerHTML=rows.length
        ?rows.map(function(r){
            var cor=COR[r.i%COR.length];
            var pctR=Math.round(r.real/maxMR*100);
            var pctM=Math.round(r.meta/maxMR*100);
            return '<div class="np-bar-row" style="flex-direction:column;align-items:stretch;margin-bottom:10px;">'
              +'<div style="font-size:11px;color:var(--text);margin-bottom:4px;">'+_esc(r.nome)+'</div>'
              +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">'
              +'<div style="font-size:9px;color:var(--accent);width:60px;">Realizado</div>'
              +'<div class="np-bar-track" style="flex:1;"><div class="np-bar-fill" style="width:'+pctR+'%;background:'+cor+'"></div></div>'
              +'<div style="font-size:10px;font-weight:700;color:var(--text);width:90px;text-align:right;">'+_fmtR(r.real)+'</div></div>'
              +'<div style="display:flex;align-items:center;gap:6px;">'
              +'<div style="font-size:9px;color:var(--muted);width:60px;">Meta</div>'
              +'<div class="np-bar-track" style="flex:1;"><div class="np-bar-fill" style="width:'+pctM+'%;background:rgba(255,255,255,.15)"></div></div>'
              +'<div style="font-size:10px;color:var(--muted);width:90px;text-align:right;">'+_fmtR(r.meta)+'</div></div>'
              +'</div>';
          }).join('')
        :'<div class="np-empty">Configure metas para ver o comparativo.</div>';
    }

    /* Atingimento por Turma */
    _npRenderTurmasAtingimento();

    /* Alertas */
    var alertEl=document.getElementById('npAlertaStrip');
    if(alertEl){
      var _consNasTurmasAlerta=new Set(_npVendasTurma.map(function(v){return (v.consultor||'').trim().toUpperCase();}));
      var abaixo=_npConsultores.filter(function(nome){
        if(!_consNasTurmasAlerta.has((nome||'').trim().toUpperCase())) return false;
        var meta=_npGoals[nome]?+((_npGoals[nome].metaValor)||0):0;
        if(!meta) return false;
        var real=(ranking.find(function(r){return r.nome.toUpperCase()===nome.toUpperCase();})||{}).pago||0;
        return real<meta*0.7;
      });
      if(abaixo.length){
        alertEl.textContent='Abaixo de 70% da meta: '+abaixo.join(', ');
        alertEl.classList.add('visible');
      } else {
        alertEl.classList.remove('visible');
      }
    }
  }

  /* ── Atingimento por Turma ──────────────────────── */
  function _npRenderTurmasAtingimento(){
    var sec=document.getElementById('npTurmasAtingimento');
    var grid=document.getElementById('npTurmasAtingimentoGrid');
    if(!sec||!grid) return;
    var metas=window._npTurmasMeta||{};
    if(!Object.keys(metas).length){sec.style.display='none';return;}
    /* Agrupar realizado por turmaId — apenas PAGO conta para atingimento */
    var realizado={};
    _npVendasTurma.forEach(function(v){
      if(!v._turmaId) return;
      if((v.status||'').toLowerCase().trim()!=='pago') return;
      realizado[v._turmaId]=(realizado[v._turmaId]||0)+(+(v.valor||0));
    });
    /* Montar cards */
    var cards=Object.entries(metas).map(function(e){
      var id=e[0],info=e[1];
      var real=realizado[id]||0;
      var meta=+(info.meta||0);
      var pct=meta>0?Math.round(real/meta*100):null;
      var qtdPagos=_npVendasTurma.filter(function(v){return v._turmaId===id&&(v.status||'').toLowerCase().trim()==='pago';}).length;
      var qtdAtivos=_npVendasTurma.filter(function(v){return v._turmaId===id&&(v.status||'').toLowerCase().trim()!=='cancelado';}).length;
      return {id:id,nome:info.nome,meta:meta,real:real,pct:pct,qtdPagos:qtdPagos,qtdAtivos:qtdAtivos};
    });
    /* Ordenar: com meta por % desc, depois sem meta por realizado desc */
    cards.sort(function(a,b){
      if(a.pct!==null&&b.pct===null) return -1;
      if(a.pct===null&&b.pct!==null) return 1;
      if(a.pct!==null&&b.pct!==null) return b.pct-a.pct;
      return b.real-a.real;
    });
    function _cls(pct){
      if(pct===null) return 'sem-meta';
      if(pct>=100) return 'c100';
      if(pct>=75) return 'c75';
      if(pct>=50) return 'c50';
      if(pct>=25) return 'c25';
      return 'c0';
    }
    function _label(pct){
      if(pct===null) return 'Meta não definida';
      if(pct>=100) return 'Meta atingida ✅';
      if(pct>=75) return 'Quase lá! 🔵';
      if(pct>=50) return 'Em progresso 🟡';
      if(pct>=25) return 'Atenção 🟠';
      return 'Crítico 🔴';
    }
    sec.style.display='';
    grid.innerHTML=cards.map(function(c){
      var cls=_cls(c.pct);
      var pctDisp=c.pct!==null?(c.pct>999?'999%+':c.pct+'%'):'—';
      var barW=c.pct!==null?Math.min(c.pct,100):0;
      return '<div class="np-turma-atg-card" onclick="window._npAbrirModalTurma(\''+_esc(c.id)+'\')">'
        +'<div class="np-turma-atg-nome" title="'+_esc(c.nome)+'">'+_esc(c.nome)+'</div>'
        +'<div class="np-turma-atg-vals">'
          +'<span class="np-turma-atg-pct '+cls+'">'+pctDisp+'</span>'
          +'<span class="np-turma-atg-sub">'+_fmtR(c.real)+(c.meta>0?'<br><span style="font-size:10px;">meta '+_fmtR(c.meta)+'</span>':'')+'</span>'
        +'</div>'
        +(c.meta>0?'<div class="np-turma-atg-track"><div class="np-turma-atg-fill '+cls+'" style="width:'+barW+'%"></div></div>':'')
        +(c.meta===0?'<div style="font-size:10px;color:var(--muted);margin-top:4px;">Meta não definida</div>':'')
        +'<div class="np-turma-atg-footer">'
          +'<span>'+c.qtdPagos+' faturado'+(c.qtdPagos!==1?'s':'')+' / '+c.qtdAtivos+' ativo'+(c.qtdAtivos!==1?'s':'')+'</span>'
          +'<span class="np-turma-atg-badge '+cls+'">'+_label(c.pct)+'</span>'
        +'</div>'
        +'</div>';
    }).join('');
  }

  /* ── Modal Atingimento da Turma ─────────────────── */
  window._npAbrirModalTurma=function(turmaId){
    var metaInfo=(window._npTurmasMeta||{})[turmaId];
    if(!metaInfo) return;
    var overlay=document.getElementById('npTurmaModalOverlay');
    var titulo=document.getElementById('npTurmaModalTitulo');
    var body=document.getElementById('npTurmaModalBody');
    if(!overlay||!titulo||!body) return;

    var todosClientes=_npVendasTurma.filter(function(v){return v._turmaId===turmaId;});
    var porConsultor={};
    todosClientes.forEach(function(v){
      var cons=v.consultor||'—';
      if(!porConsultor[cons]) porConsultor[cons]={nome:cons,clientes:[],potencial:0,aberto:0,entrada:0,pago:0};
      porConsultor[cons].clientes.push(v);
      var val=+(v.valor||0);
      var st=(v.status||'aberto').toLowerCase().trim();
      if(st!=='cancelado') porConsultor[cons].potencial+=val;
      if(st==='aberto')    porConsultor[cons].aberto+=val;
      if(st==='entrada')   porConsultor[cons].entrada+=val;
      if(st==='pago')      porConsultor[cons].pago+=val;
    });

    var consultores=Object.values(porConsultor);
    var numCons=consultores.length||1;
    var totalMeta=+(metaInfo.meta||0);
    var indivMeta=totalMeta>0?totalMeta/numCons:0;
    var tiers={critico:0,atencao:0,progresso:0,quase:0,meta:0};

    consultores.forEach(function(c){
      c.pctMeta=indivMeta>0?Math.round(c.pago/indivMeta*100):null;
      c.restante=indivMeta>0?Math.max(0,indivMeta-c.pago):0;
      c.faturados=c.clientes.filter(function(x){return (x.status||'').toLowerCase().trim()==='pago';});
      var p=c.pctMeta;
      if(p===null) return;
      if(p>=100) tiers.meta++;
      else if(p>=75) tiers.quase++;
      else if(p>=50) tiers.progresso++;
      else if(p>=25) tiers.atencao++;
      else tiers.critico++;
    });

    var tierDefs=[
      {key:'critico',  label:'Crítico',      cls:'c-critico'},
      {key:'atencao',  label:'Atenção',       cls:'c-atencao'},
      {key:'progresso',label:'Em progresso',  cls:'c-progresso'},
      {key:'quase',    label:'Quase lá!',     cls:'c-quase'},
      {key:'meta',     label:'Meta atingida', cls:'c-meta'}
    ];

    var tiersHtml='<div class="np-turma-modal-tiers">'+tierDefs.map(function(d){var n=tiers[d.key];return '<div class="np-turma-modal-tier '+d.cls+(n===0?' np-turma-modal-tier--inativo':'')+'"><div class="np-turma-modal-tier-n">'+n+'</div><div class="np-turma-modal-tier-l">'+d.label+'</div></div>';}).join('')+'</div>';

    var metaTotalHtml=totalMeta>0
      ?'<div class="np-turma-modal-meta-row"><span>Meta da turma: <strong>'+_fmtR(totalMeta)+'</strong></span><span>Meta individual: <strong>'+_fmtR(indivMeta)+'</strong></span></div>'
      :'<div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Meta não definida para esta turma.</div>';

    function _f(v){return v>0?'R\$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';}
    function _tCls(p){if(p===null)return '';if(p>=100)return 'c100';if(p>=75)return 'c75';if(p>=50)return 'c50';if(p>=25)return 'c25';return 'c0';}

    consultores.sort(function(a,b){return (b.pctMeta||0)-(a.pctMeta||0);});
    var ncols=indivMeta>0?6:4;

    var tableHtml='<div style="overflow-x:auto;"><table class="np-turma-modal-table"><thead><tr><th>Consultor</th><th>Potencial</th><th>Em Aberto</th><th>Faturado</th>'+(indivMeta>0?'<th>% Meta</th><th>Restante</th>':'')+'</tr></thead><tbody>'+consultores.map(function(c,i){var pctStr=c.pctMeta!==null?(c.pctMeta>999?'999%+':c.pctMeta+'%'):'—';var cls=_tCls(c.pctMeta);var rowId='_nptacd_'+turmaId+'_'+i;var qtdFat=c.faturados.length;var trCons='<tr class="np-turma-modal-cons-row" data-target="'+rowId+'" onclick="window._npToggleConsDetail(this.dataset.target)">'+'<td><span class="np-cons-caret" id="'+(rowId)+'_c">&#9658;</span> <strong>'+_esc(c.nome)+'</strong><br><span style="font-size:10px;color:var(--muted);">'+qtdFat+' faturado'+(qtdFat!==1?'s':'')+' de '+c.clientes.length+'</span></td><td>'+_f(c.potencial)+'</td><td>'+_f(c.aberto+c.entrada)+'</td><td><strong>'+_f(c.pago)+'</strong></td>'+(indivMeta>0?'<td class="np-turma-modal-pct '+cls+'\">'+pctStr+'</td><td>'+_f(c.restante)+'</td>':'')+'</tr>';var detalheHtml=c.faturados.length?c.faturados.map(function(f){return '<div class="np-cons-cli-row"><span class="np-cons-cli-nome">'+_esc(f.cliente||'—')+'</span>'+(f.treinamento&&f.treinamento!=='—'?'<span class="np-cons-cli-trein">'+_esc(f.treinamento)+'</span>':'')+'<span class="np-cons-cli-val">'+_f(+(f.valor||0))+'</span></div>';}).join(''):'—Nenhum cliente faturado.';var trDetalhe='<tr id="'+rowId+'" class="np-turma-modal-detail-row" style="display:none;"><td colspan="'+ncols+'" class="np-turma-modal-detail-cell">'+detalheHtml+'</td></tr>';return trCons+trDetalhe;}).join('')+'</tbody></table></div>';

    titulo.textContent='🏫 '+metaInfo.nome;
    body.innerHTML=tiersHtml+metaTotalHtml+tableHtml;
    overlay.classList.add('open');
  };

  window._npFecharModalTurma=function(){
    var o=document.getElementById('npTurmaModalOverlay');
    if(o) o.classList.remove('open');
  };

  window._npToggleConsDetail=function(rowId){
    var tr=document.getElementById(rowId);
    var caret=document.getElementById(rowId+'_c');
    if(!tr) return;
    var aberto=tr.style.display!=='none';
    tr.style.display=aberto?'none':'table-row';
    if(caret) caret.textContent=aberto?'▸':'▾';
  };

  /* ── Vendas ──────────────────────────────────────── */
  var _npSortTurma={col:'',dir:1};
  window.npSortTurma=function(col){
    if(_npSortTurma.col===col){_npSortTurma.dir*=-1;}
    else{_npSortTurma.col=col;_npSortTurma.dir=1;}
    window.npRenderVendas();
  };
  window.npRenderVendas=function(){
    var todas=_npTodasVendas();
    var filtradas=_npFiltrar(todas);
    var turma=filtradas.filter(function(v){return v._src==='turma';});
    /* Ordenação turma */
    var sc=_npSortTurma.col,sd=_npSortTurma.dir;
    if(sc){
      turma=turma.slice().sort(function(a,b){
        var va,vb;
        if(sc==='valor'){va=+(a.valor||0);vb=+(b.valor||0);return (va-vb)*sd;}
        if(sc==='cliente'){va=(a.cliente||'').toLowerCase();vb=(b.cliente||'').toLowerCase();}
        else if(sc==='consultor'){va=(a.consultor||'').toLowerCase();vb=(b.consultor||'').toLowerCase();}
        else if(sc==='treinamento'){va=(a.treinamento||'').toLowerCase();vb=(b.treinamento||'').toLowerCase();}
        else if(sc==='status'){va=(a.status||'').toLowerCase();vb=(b.status||'').toLowerCase();}
        else if(sc==='turma'){va=(a._turmaNome||'').toLowerCase();vb=(b._turmaNome||'').toLowerCase();}
        else{return 0;}
        return va<vb?-sd:va>vb?sd:0;
      });
    }
    /* Atualizar setas */
    ['cliente','consultor','treinamento','valor','status','turma'].forEach(function(c){
      var el=document.getElementById('npSortArrow_'+c);
      if(!el) return;
      if(c!==sc){el.textContent='⇅';}
      else{el.textContent=sd===1?'↓':'↑';}
    });
    var avulso=filtradas.filter(function(v){return v._src==='avulso';});

    /* Badge */
    var bT=document.getElementById('npBadgeTurma');if(bT)bT.textContent=turma.length;
    var bA=document.getElementById('npBadgeAvulso');if(bA)bA.textContent=avulso.length;

    /* Tabela turma */
    var tbT=document.getElementById('npTbodyTurma');
    if(tbT) tbT.innerHTML=turma.length
      ?turma.map(function(v){
          var isNeg=(v.status||'').toLowerCase()==='negociacao';
          var fuBtn=isNeg
            ?'<button class="np-fu-btn" data-cons="'+_esc(v.consultor)+'" data-cli="'+_esc(v.cliente)+'"'
              +' onclick="npAbrirFollowUp(\''+_esc(v.consultor)+'\',\''+_esc(v.cliente)+'\')"'
              +' style="background:none;border:none;cursor:pointer;font-size:14px;padding:2px 6px;opacity:.5;color:var(--muted);transition:opacity .15s;border-radius:4px;"'
              +' title="Definir próxima ação">📅</button>'
            :'';
          return '<tr>'
            +'<td>'+_esc(v.cliente)+'</td>'
            +'<td>'+_esc(v.consultor)+'</td>'
            +'<td>'+_esc(v.treinamento||'—')+'</td>'
            +'<td class="r">'+_fmtR(v.valor)+'</td>'
            +'<td><span class="'+_stClass(v.status)+'">'+_esc((v.status||'aberto').toUpperCase())+'</span>'+fuBtn+'</td>'
            +'<td style="font-size:10px;color:var(--muted);">'+_esc(v._turmaNome||'—')+'</td>'
            +'</tr>';
        }).join('')
      :'<tr><td colspan="6" class="np-empty">Nenhuma venda de turma neste período.</td></tr>';
    /* Atualizar indicadores de follow-up nos botões recém-criados */
    if(typeof window._fuInjetarBotoes==='function') setTimeout(window._fuInjetarBotoes, 50);

    /* Tabela avulso */
    var tbA=document.getElementById('npTbodyAvulso');
    /* Converte data ISO (yyyy-mm-dd) para dd/mm/yyyy. Aceita também strings já formatadas. */
    function _fmtData(d){
      if(!d) return '—';
      var m=String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if(m) return m[3]+'/'+m[2]+'/'+m[1];
      return d;
    }
    if(tbA) tbA.innerHTML=avulso.length
      ?avulso.map(function(v){
          return '<tr>'
            +'<td>'+_esc(v.clienteNome||v.cliente||'—')+'</td>'
            +'<td>'+_esc(v.consultorNome||v.consultor||'—')+'</td>'
            +'<td>'+_esc(v.produto||'—')+'</td>'
            +'<td class="r">'+_fmtR(v.valor)+'</td>'
            +'<td><span class="'+_stClass(v.status)+'">'+_esc((v.status||'aberto').toUpperCase())+'</span></td>'
            +'<td style="font-size:10px;color:var(--muted);">'+_esc(_fmtData(v.data))+'</td>'
            +'<td style="white-space:nowrap;width:90px;text-align:right;">'
              +'<button title="Editar" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:4px 8px;margin-right:8px;border-radius:4px;transition:background .15s;" onmouseover="this.style.background=\'rgba(255,255,255,.08)\'" onmouseout="this.style.background=\'none\'" onclick="npEditarVenda(\''+v._id+'\')">✏</button>'
              +'<button title="Excluir" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:4px 8px;border-radius:4px;transition:background .15s;" onmouseover="this.style.background=\'rgba(255,95,87,.12)\'" onmouseout="this.style.background=\'none\'" onclick="npExcluirVenda(\''+v._id+'\')">✕</button>'
            +'</td>'
            +'</tr>';
        }).join('')
      :'<tr><td colspan="7" class="np-empty">Nenhuma venda avulsa neste período.</td></tr>';
  };

  /* ── Metas ───────────────────────────────────────── */
  function _npRenderMetas(todas){
    var grid=document.getElementById('npMetasGrid');if(!grid) return;
    if(_npVendasTurma.length===0&&Object.keys(_npVendasAvulso||{}).length===0){
      grid.innerHTML='<div class="np-empty">Nenhum dado para este mês.</div>';return;
    }
    if(!_npConsultores.length){
      grid.innerHTML='<div class="np-empty">Nenhum consultor encontrado.</div>';return;
    }
    var ranking=_npPorConsultor(todas,'','pago');
    grid.innerHTML=_npConsultores.map(function(nome,i){
      var goal=_npGoals[nome]||{};
      var meta=+(goal.metaValor||0);
      var metaQ=+(goal.metaQtd||0);
      var r=ranking.find(function(x){return x.nome===nome;})||{total:0,pago:0,qtd:0,qtdPago:0};
      var pct=meta?Math.min(100,Math.round(r.pago/meta*100)):0;
      var pctQ=metaQ?Math.min(100,Math.round(r.qtdPago/metaQ*100)):0;
      var cor=COR[i%COR.length];
      var barColor=pct>=100?'var(--green)':pct>=70?'var(--accent)':'var(--amber)';
      return '<div class="np-meta-card">'
        +'<div class="np-meta-header">'
        +'<div class="np-meta-avatar" style="background:'+cor+'22;color:'+cor+';border:1.5px solid '+cor+'55;">'+nome.charAt(0).toUpperCase()+'</div>'
        +'<div><div class="np-meta-nome">'+_esc(nome)+'</div>'
        +'<div class="np-meta-sub">'+(pct>=100?'✅ Meta batida!':'Falta '+_fmtR(Math.max(0,meta-r.pago)))+'</div>'
        +'</div></div>'
        +'<div class="np-meta-progress"><div class="np-meta-bar" style="width:'+pct+'%;background:'+barColor+';"></div></div>'
        +'<div class="np-meta-row"><span style="color:var(--muted);">Pago (meta)</span><span style="color:'+barColor+';font-weight:700;">'+_fmtR(r.pago)+' ('+pct+'%)</span></div>'
        +(r.total!==r.pago?'<div class="np-meta-row"><span style="color:var(--muted);font-size:10px;">Volume total</span><span style="font-size:10px;color:var(--muted);">'+_fmtR(r.total)+'</span></div>':'')
        +(meta?'<div class="np-meta-row"><span style="color:var(--muted);">Meta R$</span><span>'+_fmtR(meta)+'</span></div>':'')
        +(metaQ?'<div class="np-meta-row"><span style="color:var(--muted);">Qtd pagas</span><span>'+r.qtdPago+'/'+metaQ+' ('+pctQ+'%)</span></div>':'')
        +'<button class="np-meta-edit" onclick="npAbrirModalMeta(\''+String(nome||'').replace(/\\/g,'\\\\').replace(/\x27/g,'\\\x27')+'\')">⚙ Configurar meta</button>'
        +'</div>';
    }).join('');
  }

  /* ── Ranking ─────────────────────────────────────── */
  window.npRenderRanking=function(){
    var filtroSrc=(document.getElementById('npRankFiltro')||{}).value||'';
    var todas=_npTodasVendas();
    var ranking=_npPorConsultor(todas,filtroSrc,'total'); /* ranking por volume total */
    var el=document.getElementById('npRankingList');if(!el) return;
    if(!ranking.length){el.innerHTML='<div class="np-empty">Sem dados neste período.</div>';return;}
    var medalhas=['🥇','🥈','🥉'];
    el.innerHTML=ranking.map(function(r,i){
      var cor=COR[i%COR.length];
      var goal=_npGoals[r.nome]||{};
      var meta=+(goal.metaValor||0);
      var pct=meta?Math.min(100,Math.round(r.total/meta*100)):null;
      return '<div class="np-ranking-item">'
        +'<div class="np-ri-pos">'+(medalhas[i]||(i+1)+'°')+'</div>'
        +'<div class="np-rank-avatar" style="background:'+cor+'22;color:'+cor+';border:1.5px solid '+cor+'55;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;flex-shrink:0;">'+r.nome.charAt(0).toUpperCase()+'</div>'
        +'<div class="np-ri-info"><div class="np-ri-nome">'+_esc(r.nome)+'</div>'
        +'<div class="np-ri-detail">'+r.qtd+' venda'+(r.qtd!==1?'s':'')+' · '+r.qtdPago+' paga'+(r.qtdPago!==1?'s':'')
        +(pct!==null?' · meta: '+pct+'%':'')+'</div></div>'
        +'<div style="text-align:right;"><div class="np-ri-val">'+_fmtR(r.total)+'</div></div>'
        +'</div>';
    }).join('');
  };

  /* Popular dropdown de Produto/Serviço com os mesmos treinamentos da
     lista global allTreinamentos (gerenciada pelo modal "Gerenciar Treinamentos").
     selVal: valor já gravado na venda — se não estiver na lista, é incluído como
     "personalizado" para não ser perdido na edição. */
  function _npPopularProdutoOptions(selVal){
    var sel=document.getElementById('npVendaProduto');
    if(!sel) return;
    var lista=(typeof window.allTreinamentos!=='undefined'&&Array.isArray(window.allTreinamentos))?window.allTreinamentos.slice()
             :(typeof allTreinamentos!=='undefined'&&Array.isArray(allTreinamentos))?allTreinamentos.slice()
             :[];
    /* Garantir que o valor atual da venda continua selecionável mesmo se foi removido da lista */
    var atual=String(selVal||'').trim();
    if(atual && lista.indexOf(atual)<0 && lista.indexOf(atual.toUpperCase())<0){
      lista.push(atual);
    }
    /* Ordenar alfabeticamente */
    lista.sort(function(a,b){return String(a).localeCompare(String(b),'pt-BR');});
    var html='<option value="">— Selecione um treinamento —</option>';
    lista.forEach(function(n){
      var sl=(atual && (n===atual||String(n).toUpperCase()===atual.toUpperCase()))?' selected':'';
      html+='<option value="'+_esc(n)+'"'+sl+'>'+_esc(n)+'</option>';
    });
    sel.innerHTML=html;
  }

  /* ── Modal Nova Venda ────────────────────────────── */
  window.npAbrirModalVenda=function(){
    _npVendaEditId=null;
    document.getElementById('npModalVendaTitulo').textContent='Nova Venda Avulsa';
    document.getElementById('npVendaId').value='';
    document.getElementById('npVendaCliente').value='';
    document.getElementById('npVendaValor').value='';
    document.getElementById('npVendaOrigem').value='';
    document.getElementById('npVendaObs').value='';
    document.getElementById('npVendaStatus').value='aberto';
    document.getElementById('npVendaData').value=new Date().toISOString().slice(0,10);
    _npPopularFiltros();
    _npPopularProdutoOptions('');
    /* Se perfil=consultor: pré-preencher e bloquear campo consultor */
    var sessao=typeof _getSessao==='function'?_getSessao():null;
    var isConsultor=sessao&&sessao.perfil==='consultor';
    var selC=document.getElementById('npVendaConsultor');
    if(selC&&isConsultor){
      var nomeC=sessao.nome||sessao.login||'';
      selC.value=nomeC;
      selC.disabled=true;
      selC.style.opacity='.6';
    } else if(selC){
      selC.disabled=false;
      selC.style.opacity='';
    }
    document.getElementById('npModalVenda').classList.add('open');
  };

  window.npEditarVenda=function(id){
    var v=_npVendasAvulso[id];if(!v) return;
    _npVendaEditId=id;
    document.getElementById('npModalVendaTitulo').textContent='Editar Venda';
    document.getElementById('npVendaId').value=id;
    document.getElementById('npVendaCliente').value=v.clienteNome||v.cliente||'';
    document.getElementById('npVendaValor').value=(+(v.valor||0)).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    document.getElementById('npVendaOrigem').value=v.origemManual||'';
    document.getElementById('npVendaObs').value=v.obs||'';
    document.getElementById('npVendaStatus').value=v.status||'aberto';
    document.getElementById('npVendaData').value=v.data||'';
    _npPopularFiltros();
    _npPopularProdutoOptions(v.produto||'');
    setTimeout(function(){
      var mSel=document.getElementById('npVendaConsultor');
      if(mSel) mSel.value=v.consultorNome||v.consultor||'';
    },50);
    document.getElementById('npModalVenda').classList.add('open');
  };

  window.npFecharModalVenda=function(){
    document.getElementById('npModalVenda').classList.remove('open');
  };

  /* ── Detalhe de KPI (Faturado / Em Aberto / Potencial / Entrada) ── */
  /* tipo: 'faturado' | 'aberto' | 'potencial' | 'entrada' */
  window.npAbrirKpiDetalhe=function(tipo){
    var TIPOS={
      faturado :{titulo:'💚 Faturado',           sub:'Vendas com status PAGO (não cancelado)',  filtro:function(v){return (v.status||'').toLowerCase()==='pago';}},
      aberto   :{titulo:'🟠 Em aberto',          sub:'Vendas com status ABERTO',                filtro:function(v){return (v.status||'').toLowerCase()==='aberto';}},
      potencial:{titulo:'🔵 Potencial total',    sub:'Vendas em NEGOCIAÇÃO',                    filtro:function(v){return (v.status||'').toLowerCase()==='negociacao';}},
      entrada  :{titulo:'⚡ Total entrada',      sub:'Vendas com status ENTRADA',               filtro:function(v){return (v.status||'').toLowerCase()==='entrada';}}
    };
    var def=TIPOS[tipo]; if(!def) return;
    var todas=typeof _npTodasVendas==='function'?_npTodasVendas():[];
    var lista=todas.filter(def.filtro);
    var total=lista.reduce(function(s,v){return s+(+(v.valor||0));},0);
    var qtd=lista.length;

    document.getElementById('npKpiDetalheTitulo').textContent=def.titulo+' — '+(typeof _mesLabel==='function'?_mesLabel():'');

    var resumoHtml=def.sub
      +' &middot; <strong style="color:var(--text);">'+qtd+'</strong> venda'+(qtd!==1?'s':'')
      +' &middot; total <strong style="color:var(--text);">'+_fmtR(total)+'</strong>';
    document.getElementById('npKpiDetalheResumo').innerHTML=resumoHtml;

    var body=document.getElementById('npKpiDetalheBody');
    if(!qtd){
      body.innerHTML='<div class="np-kpi-detail-empty">Nenhuma venda neste critério.</div>';
    } else {
      var head='<div class="np-kpi-detail-row head">'
        +'<div>Cliente</div><div>Consultor</div><div>Treinamento/Produto</div>'
        +'<div class="v-money">Valor</div><div>Status</div><div>Origem</div>'
        +'</div>';
      var rows=lista
        .slice()
        .sort(function(a,b){return (+(b.valor||0))-(+(a.valor||0));})
        .map(function(v){
          var nomeCliente=v.cliente||v.clienteNome||'—';
          var nomeCons=v.consultor||v.consultorNome||'—';
          var produto=v.treinamento||v.produto||'—';
          var st=(v.status||'aberto').toLowerCase();
          var origem=v._src==='turma'?(v._turmaNome||'Turma'):'Avulso';
          return '<div class="np-kpi-detail-row">'
            +'<div title="'+_esc(nomeCliente)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_esc(nomeCliente)+'</div>'
            +'<div title="'+_esc(nomeCons)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_esc(nomeCons)+'</div>'
            +'<div title="'+_esc(produto)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);">'+_esc(produto)+'</div>'
            +'<div class="v-money">'+_fmtR(v.valor||0)+'</div>'
            +'<div><span class="'+_stClass(st)+'">'+_esc(st.toUpperCase())+'</span></div>'
            +'<div title="'+_esc(origem)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--muted);">'+_esc(origem)+'</div>'
            +'</div>';
        }).join('');
      body.innerHTML=head+rows;
    }
    document.getElementById('npModalKpiDetalhe').classList.add('open');
  };

  window.npFecharKpiDetalhe=function(){
    var el=document.getElementById('npModalKpiDetalhe');
    if(el) el.classList.remove('open');
  };

  /* ── Detalhe do Consultor (clique no card de meta) ─────── */
  window.npAbrirConsultorDetalhe=function(nome){
    if(!nome) return;
    var todas=typeof _npTodasVendas==='function'?_npTodasVendas():[];
    var nomeUp=String(nome).toUpperCase();
    var lista=todas.filter(function(v){return String(v.consultor||'').toUpperCase()===nomeUp;});

    /* Agregados */
    var faturado=0,emAberto=0,emEntrada=0,emNegociacao=0,cancelado=0;
    var qtdPago=0,qtdAberto=0,qtdEntrada=0,qtdNegociacao=0,qtdCancelado=0;
    lista.forEach(function(v){
      var val=+(v.valor||0); var st=String(v.status||'').toLowerCase();
      if(st==='pago'){faturado+=val;qtdPago++;}
      else if(st==='aberto'){emAberto+=val;qtdAberto++;}
      else if(st==='entrada'){emEntrada+=val;qtdEntrada++;}
      else if(st==='negociacao'){emNegociacao+=val;qtdNegociacao++;}
      else if(st==='cancelado'){cancelado+=val;qtdCancelado++;}
    });
    var ativos=lista.filter(function(v){return String(v.status||'').toLowerCase()!=='cancelado';});
    var totalAtivo=ativos.reduce(function(s,v){return s+(+(v.valor||0));},0);
    var ticket=ativos.length?totalAtivo/ativos.length:0;

    /* Meta atual — detecta o tier em jogo (Básica/Mínima/Master) */
    var g=(window._npGoals||{})[nome]||{};
    var b=+(g.metaBasica||g.metaValor||0);
    var m=+(g.metaMinima||0);
    var M=+(g.metaMaster||0);
    var tierAtual=(typeof _npGetMetaAtiva==='function')
      ?_npGetMetaAtiva(g,faturado)
      :{meta:b,tier:b>0?'basica':'',label:b>0?'🥉 Básica':'—',pct:b>0?Math.round(faturado/b*100):0};
    var temMeta=!!(b||m||M);
    var batida=tierAtual.meta>0&&faturado>=tierAtual.meta;
    /* Próxima meta a perseguir, se já bateu o tier atual */
    var proxMeta=0,proxLabel='';
    if(batida){
      if(tierAtual.tier==='basica'&&m>0){proxMeta=m;proxLabel='Mínima';}
      else if((tierAtual.tier==='basica'||tierAtual.tier==='minima')&&M>0){proxMeta=M;proxLabel='Master';}
    }

    /* Header */
    document.getElementById('npConsDetalheTitulo').textContent='👤 '+nome+' — '+(typeof _mesLabel==='function'?_mesLabel():'');

    /* KPIs do consultor */
    var kpiCard=function(label,val,sub,color){
      return '<div class="np-cons-kpi">'
        +'<div class="np-cons-kpi-label">'+label+'</div>'
        +'<div class="np-cons-kpi-val"'+(color?' style="color:'+color+';"':'')+'>'+val+'</div>'
        +(sub?'<div class="np-cons-kpi-sub">'+sub+'</div>':'')
        +'</div>';
    };
    var metaLabel,metaVal,metaSub,metaCor;
    if(!temMeta){
      metaLabel='Sem meta';
      metaVal='—';
      metaSub='Configure metas pelo botão "⚙ Configurar metas"';
      metaCor='var(--muted)';
    } else if(batida && proxMeta>0){
      /* já bateu o tier atual e ainda há um desafio acima */
      var pctProx=Math.round(faturado/proxMeta*100);
      metaLabel='% '+proxLabel+' (próxima)';
      metaVal=pctProx+'%';
      metaSub='✅ '+tierAtual.label.replace(/^[^A-Za-zÀ-ú]+/,'')+' batida — faltam '+_fmtR(Math.max(0,proxMeta-faturado))+' para a '+proxLabel;
      metaCor=pctProx>=100?'var(--green)':'var(--amber)';
    } else if(batida){
      /* bateu o tier mais alto disponível (ou todos os configurados) */
      metaLabel='% '+tierAtual.label.replace(/^[^A-Za-zÀ-ú]+/,'').trim();
      metaVal=tierAtual.pct+'%';
      metaSub='✅ '+tierAtual.label+' batida — +'+_fmtR(faturado-tierAtual.meta)+' acima';
      metaCor='var(--green)';
    } else {
      /* perseguindo o tier atual (ainda não bateu) */
      metaLabel='% '+tierAtual.label.replace(/^[^A-Za-zÀ-ú]+/,'').trim();
      metaVal=tierAtual.pct+'%';
      metaSub='Faltam '+_fmtR(Math.max(0,tierAtual.meta-faturado))+' para a '+tierAtual.label.replace(/^[^A-Za-zÀ-ú]+/,'').trim();
      metaCor=tierAtual.pct>=75?'var(--accent)':tierAtual.pct>=50?'var(--amber)':'var(--red)';
    }
    document.getElementById('npConsDetalheKpis').innerHTML=
       kpiCard('Faturado',_fmtR(faturado),qtdPago+' pago'+(qtdPago!==1?'s':''),'var(--green)')
      +kpiCard('Em aberto',_fmtR(emAberto),qtdAberto+' em aberto','var(--amber)')
      +kpiCard('Entrada',_fmtR(emEntrada),qtdEntrada+' entrada'+(qtdEntrada!==1?'s':''),'var(--accent)')
      +kpiCard('Em negociação',_fmtR(emNegociacao),qtdNegociacao+' negocia'+(qtdNegociacao!==1?'ções':'ção'),'var(--blue)')
      +kpiCard('Ticket médio',_fmtR(ticket),ativos.length+' venda'+(ativos.length!==1?'s':'')+' ativa'+(ativos.length!==1?'s':''),'')
      +kpiCard(metaLabel,metaVal,metaSub,metaCor);

    /* Lista de vendas */
    var body=document.getElementById('npConsDetalheBody');
    if(!lista.length){
      body.innerHTML='<div class="np-kpi-detail-empty">Este consultor não tem vendas neste mês.</div>';
    } else {
      var head='<div class="np-kpi-detail-row head">'
        +'<div>Cliente</div><div>Treinamento/Produto</div><div>Origem</div>'
        +'<div class="v-money">Valor</div><div>Status</div><div>Data</div>'
        +'</div>';
      function _fmtData(d){
        if(!d) return '—';
        var mt=String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return mt?(mt[3]+'/'+mt[2]+'/'+mt[1]):d;
      }
      var rows=lista.slice().sort(function(a,b){return (+(b.valor||0))-(+(a.valor||0));}).map(function(v){
        var nomeCliente=v.cliente||v.clienteNome||'—';
        var produto=v.treinamento||v.produto||'—';
        var st=String(v.status||'aberto').toLowerCase();
        var origem=v._src==='turma'?(v._turmaNome||'Turma'):'Avulso';
        return '<div class="np-kpi-detail-row">'
          +'<div title="'+_esc(nomeCliente)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_esc(nomeCliente)+'</div>'
          +'<div title="'+_esc(produto)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);">'+_esc(produto)+'</div>'
          +'<div title="'+_esc(origem)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--muted);">'+_esc(origem)+'</div>'
          +'<div class="v-money">'+_fmtR(v.valor||0)+'</div>'
          +'<div><span class="'+_stClass(st)+'">'+_esc(st.toUpperCase())+'</span></div>'
          +'<div style="font-size:11px;color:var(--muted);">'+_esc(_fmtData(v.data))+'</div>'
          +'</div>';
      }).join('');
      body.innerHTML=head+rows;
    }
    document.getElementById('npModalConsultorDetalhe').classList.add('open');
  };

  window.npFecharConsultorDetalhe=function(){
    var el=document.getElementById('npModalConsultorDetalhe');
    if(el) el.classList.remove('open');
  };

  window.npSalvarVenda=function(){
    var cliente=(document.getElementById('npVendaCliente').value||'').trim();
    var sessaoS=typeof _getSessao==='function'?_getSessao():null;
    var consultor=sessaoS&&sessaoS.perfil==='consultor'
      ?(sessaoS.nome||sessaoS.login||'')
      :(document.getElementById('npVendaConsultor').value||'');
    /* Parser robusto: aceita "R$ 1.500,00", "1.500,00", "1500,00", "1500", "1500.00" */
    var _vRaw=String(document.getElementById('npVendaValor').value||'').replace(/[^\d,.]/g,'');
    if(_vRaw.indexOf(',')>=0) _vRaw=_vRaw.replace(/\./g,'').replace(',','.');
    else _vRaw=_vRaw.replace(/\./g,'');
    var valor=parseFloat(_vRaw)||0;
    if(!cliente){if(typeof _showToast==='function')_showToast('⚠️ Nome do cliente obrigatório.','var(--amber)');return;}
    if(!consultor){if(typeof _showToast==='function')_showToast('⚠️ Selecione um consultor.','var(--amber)');return;}
    if(!valor){if(typeof _showToast==='function')_showToast('⚠️ Informe o valor.','var(--amber)');return;}
    var obj={
      clienteNome:cliente,
      consultorNome:consultor,
      produto:(document.getElementById('npVendaProduto').value||'').trim(),
      valor:valor,
      status:document.getElementById('npVendaStatus').value||'aberto',
      data:document.getElementById('npVendaData').value||new Date().toISOString().slice(0,10),
      origemManual:(document.getElementById('npVendaOrigem').value||'').trim(),
      obs:(document.getElementById('npVendaObs').value||'').trim(),
      mes:_mesKey(),
      _src:'avulso',
      ts:Date.now()
    };
    var mk=_mesKey();
    var path='pipelineSales/'+mk+'/'+(_npVendaEditId||('v'+Date.now()));
    window._fbSave(path,obj).then(function(){
      if(typeof _showToast==='function')_showToast('✅ Venda salva!','var(--accent)');
      npFecharModalVenda();
      /* Re-fetch se não tem listener */
      if(!_npListenerAvulso||typeof window._fbChange!=='function'){
        window._fbGet('pipelineSales/'+mk).then(function(d){
          _npVendasAvulso=d||{};_npRenderTudo();
        }).catch(function(){});
      }
    }).catch(function(e){
      if(typeof _showToast==='function')_showToast('❌ Erro ao salvar.','var(--red)');
      console.error('[NP] Erro salvar venda:',e);
    });
  };

  window.npExcluirVenda=function(id){
    if(!confirm('Excluir esta venda?')) return;
    var mk=_mesKey();
    window._fbSave('pipelineSales/'+mk+'/'+id,null).then(function(){
      if(typeof _showToast==='function')_showToast('🗑 Venda excluída.','var(--red)');
      if(!_npListenerAvulso||typeof window._fbChange!=='function'){
        window._fbGet('pipelineSales/'+mk).then(function(d){
          _npVendasAvulso=d||{};_npRenderTudo();
        }).catch(function(){});
      }
    }).catch(function(){});
  };

  /* ── Modal Metas ─────────────────────────────────── */
  window.npAbrirModalMeta=function(focoConsultor){
    _npColetarConsultores();
    var el=document.getElementById('npModalMetaMes');
    if(el) el.textContent=_mesLabel();
    var body=document.getElementById('npModalMetaBody');
    if(!body) return;
    body.innerHTML=_npConsultores.map(function(nome,i){
      var g=_npGoals[nome]||{};
      var highlight=focoConsultor&&focoConsultor===nome;
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);'+(highlight?'background:rgba(200,240,90,.04);border-radius:6px;padding:10px;margin:-2px -2px;':'')+'">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:'+COR[i%COR.length]+'22;color:'+COR[i%COR.length]+';border:1.5px solid '+COR[i%COR.length]+'55;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;">'+nome.charAt(0).toUpperCase()+'</div>'
        +'<div style="flex:1;font-size:12px;font-weight:600;color:var(--text);">'+_esc(nome)+'</div>'
        +'<input type="text" class="np-form-input" data-cons="'+_esc(nome)+'" data-tipo="metaValor" placeholder="R$ Meta" style="width:110px;" value="'+(g.metaValor?_fmtR(g.metaValor):'')+'" oninput="this.value=npMoneyMask(this.value)">'
        +'<input type="number" class="np-form-input" data-cons="'+_esc(nome)+'" data-tipo="metaQtd" placeholder="Qtd" style="width:70px;text-align:center;" value="'+(g.metaQtd||'')+'">'
        +'</div>';
    }).join('')||'<div class="np-empty">Nenhum consultor encontrado. Crie turmas ou usuários primeiro.</div>';
    document.getElementById('npModalMeta').classList.add('open');
    if(focoConsultor){
      /* Scroll até o consultor focado */
      setTimeout(function(){
        var inp=body.querySelector('[data-cons="'+focoConsultor+'"]');
        if(inp){inp.scrollIntoView({behavior:'smooth',block:'center'});inp.focus();}
      },100);
    }
  };

  window.npFecharModalMeta=function(){
    document.getElementById('npModalMeta').classList.remove('open');
  };

  window.npSalvarMetas=function(){
    var body=document.getElementById('npModalMetaBody');
    if(!body) return;
    var mk=_mesKey();
    var updates={};
    function _parseM(v){
      var s=String(v==null?'':v).replace(/[^\d,.]/g,'');
      if(!s) return 0;
      if(s.indexOf(',')>=0) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/\./g,'');
      var n=parseFloat(s); return isFinite(n)?n:0;
    }
    body.querySelectorAll('[data-tipo="metaValor"]').forEach(function(inp){
      var nome=inp.dataset.cons;
      if(!updates[nome]) updates[nome]={};
      updates[nome].metaValor=_parseM(inp.value);
    });
    body.querySelectorAll('[data-tipo="metaQtd"]').forEach(function(inp){
      var nome=inp.dataset.cons;
      var val=parseInt(String(inp.value||'').replace(/\D/g,''),10)||0;
      if(!updates[nome]) updates[nome]={};
      updates[nome].metaQtd=val;
    });
    var promises=Object.entries(updates).map(function(e){
      return window._fbSave('pipelineGoals/'+mk+'/'+e[0],e[1]);
    });
    Promise.all(promises).then(function(){
      if(typeof _showToast==='function')_showToast('✅ Metas salvas!','var(--accent)');
      npFecharModalMeta();
      window._fbGet('pipelineGoals/'+mk).then(function(d){
        _npGoals=d||{};_npRenderTudo();
      }).catch(function(){});
    }).catch(function(){
      if(typeof _showToast==='function')_showToast('❌ Erro ao salvar metas.','var(--red)');
    });
  };

  window.npMoneyMask=function(v){
    return _npMoneyMask(v);
  };

  /* ── Tabs ────────────────────────────────────────── */
  window.npShowTab=function(tab){
    _npTabAtiva=tab;
    document.querySelectorAll('.np-tab').forEach(function(b){
      b.classList.toggle('ativo',b.dataset.tab===tab);
    });
    document.querySelectorAll('.np-body').forEach(function(b){
      b.classList.toggle('ativo',b.id==='npTab'+tab.charAt(0).toUpperCase()+tab.slice(1));
    });
    var todas=_npTodasVendas();
    if(tab==='dashboard') _npRenderDashboard(todas);
    else if(tab==='vendas') npRenderVendas();
    else if(tab==='metas') _npRenderMetas(todas);
    else if(tab==='ranking') npRenderRanking();
    else if(tab==='funil'&&typeof _fnlRender==='function') _fnlRender();
  };

  /* ── Mês anterior / próximo ──────────────────────── */
  window.npMesAnterior=function(){
    _npMes--; if(_npMes<1){_npMes=12;_npAno--;}
    _npTrocarMes();
  };
  window.npMesProximo=function(){
    _npMes++; if(_npMes>12){_npMes=1;_npAno++;}
    _npTrocarMes();
  };
  function _npTrocarMes(){
    _npVendasTurma=[];_npVendasAvulso={};_npGoals={};
    /* Renderizar imediatamente o estado vazio para evitar mostrar dados do mês anterior */
    if(typeof _npRenderTudo==='function') _npRenderTudo();
    _npIniciarListeners();
    _npColetarVendasTurma(); /* já busca goals em paralelo com as turmas */
    _npRenderLabel();
    var el=document.getElementById('npModalMetaMes');
    if(el) el.textContent=_mesLabel();
  }

  /* ── Abrir / Fechar ──────────────────────────────── */
  window.abrirNovaPipeline=function(){
    _npAtivo=true;
    _mostrarTela('novaPipelineScreen', true);
    var el=document.getElementById('novaPipelineScreen');
    if(el) el.classList.add('active');
    _npColetarConsultores();
    _npIniciarListeners();
    _npColetarVendasTurma();
    npShowTab('dashboard');
  };

  window.fecharNovaPipeline=function(){
    _npAtivo=false;
    var el=document.getElementById('novaPipelineScreen');
    if(el) el.classList.remove('active');
    if(_npListenerAvulso) _npListenerAvulso();
    if(_npListenerGoals) _npListenerGoals();
    if(_npListenerUsuarios) _npListenerUsuarios();
    if(_npListenerMetaGeral) _npListenerMetaGeral();
    _npListenerAvulso=null;_npListenerGoals=null;_npListenerUsuarios=null;_npListenerMetaGeral=null;
    window._npMetaGeral=null;
    _mostrarTela('turmasScreen');
  };

  /* ── Hook: sync automático ao salvar clientes turma ── */
  var _origRenderAll=window.renderAll;
  var _npRefreshTimer=null;
  window.renderAll=function(){
    if(typeof _origRenderAll==='function') _origRenderAll.apply(this,arguments);
    if(_npAtivo){
      /* Atualizar vendas de turma em background (debounced) */
      clearTimeout(_npRefreshTimer);
      _npRefreshTimer=setTimeout(_npColetarVendasTurma,200);
    }
  };

  /* ── Input moeda no modal ────────────────────────── */
  (function(){
    var inp=document.getElementById('npVendaValor');
    if(inp) inp.addEventListener('input',function(){
      this.value=_npMoneyMask(this.value);
    });
  })();

  /* ── ESC fecha modais ────────────────────────────── */
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      var mv=document.getElementById('npModalVenda');
      var mm=document.getElementById('npModalMeta');
      var mg=document.getElementById('npModalMetaGeral');
      if(mv&&mv.classList.contains('open')) npFecharModalVenda();
      else if(mg&&mg.classList.contains('open')) npFecharModalMetaGeral();
      else if(mm&&mm.classList.contains('open')) npFecharModalMeta();
    }
  });

  /* debug log removido */

  /* Expor vars privadas para scripts externos (v2 patch) */
  Object.defineProperty(window,'_npConsultores',{get:function(){return _npConsultores;},set:function(v){_npConsultores=v;},configurable:true});
  Object.defineProperty(window,'_npGoals',{get:function(){return _npGoals;},set:function(v){_npGoals=v;},configurable:true});
  Object.defineProperty(window,'_npAtivo',{get:function(){return _npAtivo;},set:function(v){_npAtivo=v;},configurable:true});
  Object.defineProperty(window,'_npTabAtiva',{get:function(){return _npTabAtiva;},set:function(v){_npTabAtiva=v;},configurable:true});
  Object.defineProperty(window,'_npVendasTurma',{get:function(){return _npVendasTurma;},set:function(v){_npVendasTurma=v;},configurable:true});
  Object.defineProperty(window,'_npVendasAvulso',{get:function(){return _npVendasAvulso;},set:function(v){_npVendasAvulso=v;},configurable:true});
  Object.defineProperty(window,'_npMes',{get:function(){return _npMes;},set:function(v){_npMes=v;},configurable:true});
  Object.defineProperty(window,'_npAno',{get:function(){return _npAno;},set:function(v){_npAno=v;},configurable:true});
  window._npRenderTudo=_npRenderTudo;
  window._npColetarVendasTurma=_npColetarVendasTurma;
  window._npTodasVendas=_npTodasVendas;
  window._npPorConsultor=_npPorConsultor;
  window._npColetarConsultores=_npColetarConsultores;
  window._npPopularFiltros=_npPopularFiltros;
  window._npRenderDashboard=_npRenderDashboard;
  window._npRenderLabel=_npRenderLabel;
  window._mesKey=_mesKey;
  window._mesLabel=_mesLabel;
  window._npAtualizarBtnConfigurar=_npAtualizarBtnConfigurar;
  window._npGetMetaEquipe=getMetaEquipeMes;

})();

