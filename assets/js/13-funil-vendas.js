/* ═══════════════════════════════════════════════════════
   FASE 6.2 — FUNIL DE VENDAS
═══════════════════════════════════════════════════════ */
(function(){
  var _fnlOcultarCancelado=true;
  var _fnlDragSrc=null; /* {v, srcStatus} */

  /* Formatador local de moeda (mesmo padrão de _fmtR/_npFmtR — 2 casas decimais) */
  function _fmtR(v){
    return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  /* Escape HTML local (espelha _esc do IIFE principal) */
  function _esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var COLS=[
    {key:'aberto',   label:'Aberto',    cls:'fnl-aberto'},
    {key:'entrada',  label:'Entrada',   cls:'fnl-entrada'},
    {key:'pago',     label:'Pago',      cls:'fnl-pago'},
    {key:'cancelado',label:'Cancelado', cls:'fnl-cancelado'}
  ];

  /* ── Normalizar texto para busca (remove acentos, lowercase) ── */
  function _fnlNorm(s){
    return (s||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  }

  /* ── Fonte de dados ── */
  function _fnlGetVendas(){
    var todas=typeof window._npTodasVendas==='function'?window._npTodasVendas():[];
    var filtroConsultor=((document.getElementById('npFiltroConsultor')||{}).value||'').trim().toUpperCase();
    var sessao=typeof _getSessao==='function'?_getSessao():null;
    var isPerfil=sessao&&sessao.perfil==='consultor';
    var nomePerfil=isPerfil?(sessao.nome||sessao.login||'').toUpperCase():'';
    return todas.filter(function(v){
      var consUp=(v.consultor||'').trim().toUpperCase();
      if(isPerfil&&consUp!==nomePerfil) return false;
      if(filtroConsultor&&consUp!==filtroConsultor) return false;
      if(_fnlFiltros.consultor&&consUp!==_fnlFiltros.consultor.toUpperCase()) return false;
      if(_fnlFiltros.treinamento&&_fnlNorm(v.treinamento||'').indexOf(_fnlNorm(_fnlFiltros.treinamento))===-1) return false;
      if(_fnlFiltros.status&&(v.status||'aberto')!==_fnlFiltros.status) return false;
      if(_fnlFiltros.origem){
        var _fo=_fnlFiltros.origem;
        if(_fo.slice(0,2)==='t:'){if(v._turmaId!==_fo.slice(2)) return false;}
        else{if((v._src||'')!==_fo) return false;}
      }
      return true;
    });
  }

  /* ── Agrupar por status ── */
  function _fnlAgrupar(vendas){
    var g={aberto:[],entrada:[],pago:[],cancelado:[]};
    vendas.forEach(function(v){
      var s=(v.status||'aberto').toLowerCase();
      if(g[s]) g[s].push(v); else g.aberto.push(v);
    });
    return g;
  }

  /* ── Template de card ── */
  function _fnlCard(v,idx){
    var id=_fnlCardId(v);
    return '<div class="fnl-card" draggable="true" data-fnl-id="'+_esc(id)+'" data-fnl-idx="'+idx+'"'
      +' ondragstart="_fnlDragStart(event,\''+_esc(id)+'\')">'
      +'<button class="fnl-card-menu" onclick="_fnlMenuCard(event,\''+_esc(id)+'\')">⋯</button>'
      +'<div class="fnl-card-nome">'+_esc(v.cliente||'—')+'</div>'
      +'<div class="fnl-card-sub">'+_esc(v.consultor||'—')+(v.treinamento&&v.treinamento!=='—'?' · '+_esc(v.treinamento):'')+'</div>'
      +'<div class="fnl-card-val">'+_fmtR(v.valor||0)+(v.entrada>0?' <span style="color:var(--muted);font-weight:400;font-size:10px;">entrada '+_fmtR(v.entrada)+'</span>':'')+'</div>'
      +'</div>';
  }

  function _fnlCardId(v){
    return (v._src||'')+'|'+(v._turmaId||'')+'|'+(v._id||'')+'|'+(v.cliente||'')+'|'+(v.consultor||'');
  }

  /* ── Render principal ── */
  window._fnlRender=function(){
    var _cs=document.getElementById('fnlFilConsultor');
    if(_cs&&_cs.options.length<=1) _fnlPopularFiltrosToolbar();
    var vendas=_fnlGetVendas();
    var g=_fnlAgrupar(vendas);

    /* Colunas */
    var el=document.getElementById('fnlCols');if(!el)return;
    var colsVisiveis=_fnlOcultarCancelado?COLS.filter(function(c){return c.key!=='cancelado';}):COLS;
    el.innerHTML=colsVisiveis.map(function(col){
      var items=g[col.key]||[];
      var total=items.reduce(function(a,v){return a+(v.valor||0);},0);
      return '<div class="fnl-col '+col.cls+'" data-status="'+col.key+'"'
        +' ondragover="_fnlDragOver(event)" ondrop="_fnlDrop(event,\''+col.key+'\')">'
        +'<div class="fnl-col-header">'
        +'<span class="fnl-col-title">'+col.label+'</span>'
        +'<span class="fnl-col-count">'+items.length+'</span>'
        +'</div>'
        +'<div class="fnl-col-valor">'+_fmtR(total)+'</div>'
        +'<div class="fnl-col-body">'
        +(items.length?items.map(function(v,i){return _fnlCard(v,i);}).join(''):'<div class="fnl-empty">Vazio</div>')
        +'</div>'
        +'</div>';
    }).join('');
  };

  /* ── Toggle ocultar cancelados ── */
  window._fnlToggleCancelado=function(){
    _fnlOcultarCancelado=!_fnlOcultarCancelado;
    var btn=document.getElementById('fnlToggleCancelado');
    if(btn){btn.textContent=_fnlOcultarCancelado?'Ocultar cancelados':'Mostrar cancelados';btn.classList.toggle('ativo',_fnlOcultarCancelado);}
    window._fnlRender();
  };

  /* ── Drag & Drop ── */
  window._fnlDragStart=function(e,id){
    _fnlDragSrc=id;
    e.dataTransfer.effectAllowed='move';
    e.dataTransfer.setData('text/plain',id);
    var el=e.currentTarget;if(el)el.classList.add('dragging');
  };
  window._fnlDragOver=function(e){
    e.preventDefault();e.dataTransfer.dropEffect='move';
    var col=e.currentTarget;if(col)col.classList.add('drop-target');
  };
  window._fnlDrop=function(e,novoStatus){
    e.preventDefault();
    document.querySelectorAll('.fnl-col').forEach(function(c){c.classList.remove('drop-target');});
    document.querySelectorAll('.fnl-card').forEach(function(c){c.classList.remove('dragging');});
    var id=e.dataTransfer.getData('text/plain')||_fnlDragSrc;
    if(!id) return;
    var vendas=_fnlGetVendas();
    var v=vendas.find(function(x){return _fnlCardId(x)===id;});
    if(!v) return;
    if(v.status===novoStatus) return;
    if(novoStatus==='cancelado'&&!confirm('Mover "'+v.cliente+'" para Cancelado?')) return;
    if(novoStatus==='pago'&&v.status==='aberto'&&!confirm('"'+v.cliente+'" não tem entrada registrada. Confirmar pagamento direto?')) return;
    _fnlMoverStatus(v,novoStatus);
  };

  /* ── Atualizar status no Firebase ── */
  function _fnlMoverStatus(v,novoStatus){
    var statusAntes=v.status;
    if(v._src==='turma'&&v._turmaId){
      /* Encontrar índice do cliente na turma */
      window._fbGet('turmas/'+v._turmaId+'/clientes').then(function(cls){
        if(!cls) return;
        var arr=Array.isArray(cls)?cls:Object.values(cls);
        var idx=arr.findIndex(function(c){
          return (c.cliente||'').toUpperCase()===(v.cliente||'').toUpperCase()
            &&(c.consultor||'').toUpperCase()===(v.consultor||'').toUpperCase();
        });
        if(idx<0){_showToast('Cliente não encontrado na turma','warn');return;}
        window._fbUpdate('turmas/'+v._turmaId+'/clientes/'+idx,{status:novoStatus}).then(function(){
          v.status=novoStatus;
          if(typeof window._audit==='function') window._audit('turma.update',{type:'turma',id:v._turmaId},{status:[statusAntes,novoStatus],cliente:v.cliente});
          if(novoStatus==='pago'&&typeof window._notifOnPagamento==='function'){
            window._notifOnPagamento(v._turmaId,v._turmaNome,v.cliente,v.consultor,v.valor);
          }
          /* Atualizar cache local da turma se estiver no dashboard */
          if(typeof _npColetarVendasTurma==='function') setTimeout(_npColetarVendasTurma,300);
          /* Sincronizar data[] do Gerenciar Turmas se esta turma estiver aberta */
          try{
            if(typeof _turmaAtiva!=='undefined'&&_turmaAtiva&&_turmaAtiva.id===v._turmaId
               &&typeof data!=='undefined'&&Array.isArray(data)){
              var _gtIdx=data.findIndex(function(c){
                return (c.cliente||'').toUpperCase()===(v.cliente||'').toUpperCase()
                  &&(c.consultor||'').toUpperCase()===(v.consultor||'').toUpperCase();
              });
              if(_gtIdx>=0){
                data[_gtIdx].status=novoStatus;
                if(typeof renderConsultor==='function') renderConsultor();
                else if(typeof renderAll==='function') renderAll();
              }
            }
          }catch(_e){}
          window._fnlRender();
          _showToast('Status atualizado','success');
        }).catch(function(e){_showToast('Erro ao atualizar: '+(e&&e.message||e),'error');});
      }).catch(function(){_showToast('Erro ao buscar clientes','error');});
    } else if(v._src==='avulso'&&v._id){
      window._fbUpdate('pipelineSales/'+_mesKey()+'/'+v._id,{status:novoStatus}).then(function(){
        v.status=novoStatus;
        window._fnlRender();
        _showToast('Status atualizado','success');
      }).catch(function(e){_showToast('Erro ao atualizar: '+(e&&e.message||e),'error');});
    }
  }

  /* ── Menu de card (mobile fallback) ── */
  window._fnlMenuCard=function(e,id){
    e.stopPropagation();
    var vendas=_fnlGetVendas();
    var v=vendas.find(function(x){return _fnlCardId(x)===id;});
    if(!v) return;
    var status=['aberto','entrada','pago','cancelado'].filter(function(s){return s!==v.status;});
    var opcao=prompt('Mover "'+v.cliente+'" para:\n'+status.map(function(s,i){return (i+1)+'. '+s;}).join('\n')+'\n\nDigite o número:');
    if(!opcao) return;
    var idx=parseInt(opcao)-1;
    if(idx>=0&&idx<status.length) _fnlMoverStatus(v,status[idx]);
  };

  /* ── Busca cross-mês avançada ── */
  var _fnlBuscaCache=null;    /* {ts, vendas[], opts{}} TTL 60s */
  var _fnlBuscaTimer=null;
  var _fnlNavIdx=-1;
  var _fnlListaAtual=[];
  var _fnlVerTodos=false;
  var _fnlFiltros={consultor:'',treinamento:'',status:'',mes:'',origem:''};
  var _FNL_LIMITE=50;

  function _fnlEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  function _fnlHighlight(texto,termo){
    var t=_fnlEsc(texto||'');
    if(!termo||!t) return t;
    try{
      var re=new RegExp('('+termo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
      return t.replace(re,'<mark class="fnl-hl">$1</mark>');
    }catch(e){return t;}
  }

  function _fnlBuscarCarregarCache(){
    return new Promise(function(resolve){
      var agora=Date.now();
      if(_fnlBuscaCache&&(agora-_fnlBuscaCache.ts)<60000){resolve(_fnlBuscaCache);return;}
      if(!window._fbGet){resolve({vendas:[],opts:{}});return;}
      Promise.all([window._fbGet('turmas'),window._fbGet('pipelineSales')]).then(function(res){
        var turmas=res[0]||{},pipeline=res[1]||{};
        var vendas=[];
        var sC={},sT={},sM={};
        Object.entries(turmas).forEach(function(e){
          var tid=e[0],td=e[1];
          var mes=(td.mesMeta||(td.periodEnd||td.periodStart||'').slice(0,7))||'';
          var cls=td.clientes||[];
          if(!Array.isArray(cls)&&typeof cls==='object') cls=Object.values(cls).filter(Boolean);
          cls.forEach(function(cl){
            if(!cl||!cl.consultor) return;
            var cons=(cl.consultor||'').trim();
            var trein=cl.treinamento||'—';
            if(cons) sC[cons.toUpperCase()]=cons;
            if(trein&&trein!=='—') sT[_fnlNorm(trein)]=trein;
            if(mes) sM[mes]=mes;
            vendas.push({mes:mes,turmaNome:td.nome||tid,consultor:cons,
              cliente:cl.cliente||cl.nome||'—',treinamento:trein,
              valor:+(cl.valor||0),status:(cl.status||'aberto').toLowerCase(),origem:'turma'});
          });
        });
        Object.entries(pipeline).forEach(function(me){
          var mes=me[0],mv=me[1]||{};
          if(typeof mv!=='object') return;
          Object.values(mv).forEach(function(v){
            if(!v||typeof v!=='object') return;
            /* Compat: vendas avulsas antigas guardam o nome em consultorNome. */
            var cons=(v.consultor||v.consultorNome||'').trim();
            var trein=v.produto||v.treinamento||'—';
            if(cons) sC[cons.toUpperCase()]=cons;
            if(trein&&trein!=='—') sT[_fnlNorm(trein)]=trein;
            if(mes) sM[mes]=mes;
            vendas.push({mes:mes,turmaNome:'Avulso',consultor:cons,
              cliente:v.cliente||v.clienteNome||'—',treinamento:trein,
              valor:+(v.valor||0),status:(v.status||'aberto').toLowerCase(),origem:'avulso'});
          });
        });
        _fnlBuscaCache={ts:Date.now(),vendas:vendas,opts:{
          consultores:Object.values(sC).sort(),
          treinamentos:Object.values(sT).sort(),
          meses:Object.keys(sM).sort().reverse()
        }};
        resolve(_fnlBuscaCache);
      }).catch(function(){resolve({vendas:[],opts:{}});});
    });
  }

  function _fnlSincFiltrosToolbar(){
    var idMap={consultor:'fnlFilConsultor',treinamento:'fnlFilTreinamento',status:'fnlFilStatus',origem:'fnlFilOrigem'};
    var temAtivo=false;
    ['consultor','treinamento','status','origem'].forEach(function(campo){
      var sel=document.getElementById(idMap[campo]);
      if(!sel) return;
      var val=_fnlFiltros[campo]||'';
      sel.value=val;
      sel.classList.toggle('ativo',!!val);
      if(val) temAtivo=true;
    });
    var btn=document.getElementById('fnlFilLimpar');
    if(btn) btn.style.display=temAtivo?'':'none';
  }

  function _fnlPopularFiltrosToolbar(){
    _fnlBuscarCarregarCache().then(function(cache){
      var opts=cache.opts||{};
      var cs=document.getElementById('fnlFilConsultor');
      var ts=document.getElementById('fnlFilTreinamento');
      if(cs){
        var prevC=_fnlFiltros.consultor||'';
        cs.innerHTML='<option value="">Todos consultores</option>'
          +(opts.consultores||[]).map(function(c){return '<option value="'+_fnlEsc(c)+'">'+_fnlEsc(c)+'</option>';}).join('');
        if(prevC) cs.value=prevC;
      }
      if(ts){
        var prevT=_fnlFiltros.treinamento||'';
        ts.innerHTML='<option value="">Todos treinamentos</option>'
          +(opts.treinamentos||[]).map(function(c){return '<option value="'+_fnlEsc(c)+'">'+_fnlEsc(c)+'</option>';}).join('');
        if(prevT) ts.value=prevT;
      }
      /* Popular turmas no filtro de origem (Funil) */
      var os=document.getElementById('fnlFilOrigem');
      if(os){
        var prevO=_fnlFiltros.origem||'';
        os.innerHTML='<option value="">Turma + Avulso</option>'
          +'<option value="turma">S\xf3 turma</option>'
          +'<option value="avulso">S\xf3 avulso</option>';
        var _turmas2=window._npTurmasMeta||{};
        Object.entries(_turmas2).sort(function(a,b){return (a[1].nome||'').localeCompare(b[1].nome||'','pt');}).forEach(function(e){
          var o=document.createElement('option');
          o.value='t:'+e[0];
          o.textContent=e[1].nome||e[0];
          os.appendChild(o);
        });
        if(prevO) os.value=prevO;
      }
      _fnlSincFiltrosToolbar();
    });
  }

  window._fnlFiltroSet=function(campo,valor){
    _fnlFiltros[campo]=valor||'';
    _fnlVerTodos=false;
    _fnlSincFiltrosToolbar();
    window._fnlRender();
    _fnlDispararBusca(true);
  };

  window._fnlFiltroLimpar=function(){
    _fnlFiltros={consultor:'',treinamento:'',status:'',mes:'',origem:''};
    _fnlVerTodos=false;
    _fnlSincFiltrosToolbar();
    window._fnlRender();
    _fnlDispararBusca(true);
  };

  window._fnlVerMais=function(){
    _fnlVerTodos=true;
    _fnlDispararBusca(true);
  };

  function _fnlDispararBusca(imediato){
    var termo=(document.getElementById('fnlSearch')||{}).value||'';
    window._fnlBuscar(termo,imediato);
  }

  window._fnlBuscar=function(termo,imediato){
    clearTimeout(_fnlBuscaTimer);
    var t=(termo||'').trim();
    var temFiltro=Object.values(_fnlFiltros).some(function(v){return !!v;});
    if(t.length<2&&!temFiltro){window._fnlBuscaFechar();return;}
    _fnlBuscaTimer=setTimeout(function(){
      var painel=document.getElementById('fnlBuscaResultados');
      if(!painel) return;
      var inp=document.getElementById('fnlSearch');
      if(inp){var r=inp.getBoundingClientRect();document.documentElement.style.setProperty('--fnl-panel-top',(r.bottom+6)+'px');}
      painel.innerHTML='<div class="fnl-busca-loading">Buscando…</div>';
      painel.classList.remove('hidden');
      var sessao=typeof _getSessao==='function'?_getSessao():null;
      var isPerfil=sessao&&sessao.perfil==='consultor';
      var nomePerfil=isPerfil?(sessao.nome||sessao.login||'').toUpperCase():'';
      _fnlBuscarCarregarCache().then(function(cache){
        var n=_fnlNorm(t);
        var filtradas=(cache.vendas||[]).filter(function(v){
          if(isPerfil&&(v.consultor||'').toUpperCase()!==nomePerfil) return false;
          if(_fnlFiltros.consultor&&(v.consultor||'').toUpperCase()!==_fnlFiltros.consultor.toUpperCase()) return false;
          if(_fnlFiltros.treinamento&&_fnlNorm(v.treinamento||'').indexOf(_fnlNorm(_fnlFiltros.treinamento))===-1) return false;
          if(_fnlFiltros.status&&(v.status||'')!==_fnlFiltros.status) return false;
          if(_fnlFiltros.mes&&(v.mes||'')!==_fnlFiltros.mes) return false;
          if(_fnlFiltros.origem&&(v.origem||'')!==_fnlFiltros.origem) return false;
          if(n){
            return _fnlNorm(v.cliente).indexOf(n)!==-1
                ||_fnlNorm(v.consultor).indexOf(n)!==-1
                ||_fnlNorm(v.treinamento).indexOf(n)!==-1
                ||_fnlNorm(v.turmaNome).indexOf(n)!==-1;
          }
          return true;
        });
        filtradas.sort(function(a,b){
          var ca=_fnlNorm(a.cliente),cb=_fnlNorm(b.cliente);
          if(ca<cb)return -1;if(ca>cb)return 1;
          return (b.mes||'').localeCompare(a.mes||'');
        });
        _fnlListaAtual=filtradas;
        _fnlNavIdx=-1;
        _fnlRenderResultados(t,filtradas,cache.opts||{});
      });
    },imediato?0:200);
  };

  function _fnlRenderResultados(termo,lista,opts){
    var painel=document.getElementById('fnlBuscaResultados');
    if(!painel) return;
    var total=lista.length;
    var mostrar=_fnlVerTodos?lista:lista.slice(0,_FNL_LIMITE);
    var temFiltroAtivo=Object.values(_fnlFiltros).some(function(v){return !!v;});

    function _selFil(campo,opcs,placeholder){
      var val=_fnlFiltros[campo]||'';
      var cls='fnl-busca-filtro-sel'+(val?' ativo':'');
      var h='<select class="'+cls+'" onchange="window._fnlFiltroSet(\''+campo+'\',this.value)">'
           +'<option value="">'+placeholder+'</option>';
      opcs.forEach(function(o){
        var v=typeof o==='object'?o.v:o,l=typeof o==='object'?o.l:o;
        h+='<option value="'+_fnlEsc(v)+'"'+(val===v?' selected':'')+'>'+_fnlEsc(l)+'</option>';
      });
      return h+'</select>';
    }

    var mesOpts=(opts.meses||[]).map(function(m){
      var p=m.split('-'),mn=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return {v:m,l:(mn[+p[1]]||p[1])+'/'+p[0]};
    });

    var filtrosHtml='<div class="fnl-busca-filtros"><label>Filtros:</label>'
      +_selFil('mes',mesOpts,'Todos os meses')
      +_selFil('status',[{v:'aberto',l:'Aberto'},{v:'entrada',l:'Entrada'},{v:'pago',l:'Pago'},{v:'cancelado',l:'Cancelado'}],'Todos os status')
      +_selFil('consultor',(opts.consultores||[]),'Todos os consultores')
      +_selFil('treinamento',(opts.treinamentos||[]),'Todos os treinamentos')
      +_selFil('origem',[{v:'turma',l:'Turma'},{v:'avulso',l:'Avulso'}],'Turma + Avulso')
      +(temFiltroAtivo?'<button class="fnl-busca-filtro-limpar" onclick="window._fnlFiltroLimpar()">&#x2715; Limpar filtros</button>':'')
      +'</div>';

    var mesesUnicos={};
    lista.forEach(function(v){if(v.mes)mesesUnicos[v.mes]=1;});
    var nM=Object.keys(mesesUnicos).length;
    var totalStr=total===0?'Nenhum resultado':total===1?'1 resultado':total+' resultados';
    var headerHtml='<div class="fnl-busca-header" style="display:flex;align-items:center;gap:8px;">'
      +'<span class="fnl-busca-header-count">'+totalStr+'</span>'
      +(nM>0?'<span>em '+nM+' mês'+(nM>1?'es':'')+'</span>':'')
      +'<button type="button" title="Fechar filtros" aria-label="Fechar filtros" onclick="window._fnlBuscaFechar()" style="margin-left:auto;background:none;border:1px solid var(--border2);color:var(--muted);border-radius:6px;width:26px;height:26px;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;transition:all .15s;" onmouseover="this.style.borderColor=\'var(--red)\';this.style.color=\'var(--red)\';" onmouseout="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--muted)\';">&#x2715;</button>'
      +'</div>';

    if(total===0){
      painel.innerHTML=filtrosHtml+headerHtml+'<div class="fnl-busca-vazio">Nenhum resultado encontrado</div>';
      painel.classList.remove('hidden');return;
    }

    function _fmt(v){return v>0?'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';}
    function _ml(m){
      if(!m)return '—';
      var p=m.split('-'),mn=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return (mn[+p[1]]||p[1])+'/'+p[0];
    }

    var html='';
    var clienteAtual='';
    mostrar.forEach(function(v,i){
      var cli=v.cliente||'—';
      var cliKey=_fnlNorm(cli);
      if(cliKey!==clienteAtual){
        clienteAtual=cliKey;
        html+='<div class="fnl-busca-cliente-hd">'+_fnlHighlight(cli,termo)+'</div>';
      }
      html+='<div class="fnl-busca-item" data-bi="'+i+'">'
        +'<span class="fnl-busca-mes">'+_ml(v.mes)+'</span>'
        +'<span class="fnl-busca-turma" title="'+_fnlEsc(v.turmaNome)+'">'+_fnlHighlight(v.turmaNome,termo)+'</span>'
        +'<span class="fnl-busca-cons" title="'+_fnlEsc(v.consultor)+'">'+_fnlHighlight(v.consultor||'—',termo)+'</span>'
        +'<span class="fnl-busca-cli" title="'+_fnlEsc(cli)+'">'+_fnlHighlight(cli,termo)+'</span>'
        +'<span class="fnl-busca-trein" title="'+_fnlEsc(v.treinamento)+'">'+_fnlHighlight(v.treinamento||'—',termo)+'</span>'
        +'<span class="fnl-busca-val"><span class="fnl-busca-badge '+_fnlEsc(v.status)+'">'+_fnlEsc(v.status)+'</span><br><span>'+_fmt(v.valor)+'</span></span>'
        +'</div>';
    });

    var maisHtml=(!_fnlVerTodos&&total>_FNL_LIMITE)
      ?'<div class="fnl-busca-mais"><button onclick="window._fnlVerMais()">'+(total-_FNL_LIMITE)+' resultados adicionais — clique para ver todos</button></div>':'';

    painel.innerHTML=filtrosHtml+headerHtml+html+maisHtml;
    painel.classList.remove('hidden');
  }

  window._fnlBuscaFechar=function(){
    var p=document.getElementById('fnlBuscaResultados');
    if(p) p.classList.add('hidden');
    clearTimeout(_fnlBuscaTimer);
    _fnlNavIdx=-1;
  };

  /* Navegação teclado: seta cima/baixo + Esc */
  document.addEventListener('keydown',function(e){
    var painel=document.getElementById('fnlBuscaResultados');
    if(!painel||painel.classList.contains('hidden')) return;
    if(e.key==='Escape'){window._fnlBuscaFechar();return;}
    if(e.key!=='ArrowDown'&&e.key!=='ArrowUp') return;
    e.preventDefault();
    var items=painel.querySelectorAll('.fnl-busca-item');
    if(!items.length) return;
    _fnlNavIdx=e.key==='ArrowDown'?Math.min(_fnlNavIdx+1,items.length-1):Math.max(_fnlNavIdx-1,0);
    items.forEach(function(el,i){el.classList.toggle('fnl-selected',i===_fnlNavIdx);});
    if(items[_fnlNavIdx]) items[_fnlNavIdx].scrollIntoView({block:'nearest'});
  });

  /* O painel só fecha pelo botão ✕ do header, pelo Esc, ou pelo _fnlBuscaFechar
     explícito (ex.: ao trocar de aba). Antes havia listener de click-outside, mas
     o usuário pediu fechamento controlado para conseguir interagir com filtros. */

  /* Re-renderizar funil quando dados da pipeline atualizam */
  var _origNpRenderTudo=window._npRenderTudo;
  window._npRenderTudo=function(){
    if(typeof _origNpRenderTudo==='function') _origNpRenderTudo.apply(this,arguments);
    if(window._npTabAtiva==='funil') window._fnlRender();
  };

})();
