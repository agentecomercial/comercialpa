/* ══════════════════════════════════════════════════════════════
   RELATÓRIO SUPREMO — gera relatório customizável da turma ativa
   para colar em WhatsApp / email da chefia. ADM-only · desktop.
══════════════════════════════════════════════════════════════ */

(function(){

  // Seções disponíveis (id, label, ícone, default-on)
  var SECOES = [
    {id:'resumo',     ico:'💰', label:'Resumo financeiro',  on:true},
    {id:'pagos',      ico:'✅', label:'Treinos pagos',      on:true},
    {id:'entradas',   ico:'💵', label:'Entradas',           on:true},
    {id:'aberto',     ico:'⏳', label:'Em aberto',          on:false},
    {id:'consultor',  ico:'🏆', label:'Ranking consultores',on:true},
    {id:'treinador',  ico:'🎯', label:'Ranking treinadores',on:false},
    {id:'topTrein',   ico:'📚', label:'Top treinamentos',   on:false},
    {id:'meta',       ico:'🎯', label:'Meta vs realizado',  on:false},
    {id:'assinatura', ico:'✍️', label:'Assinatura/Gerador', on:false}
  ];
  var _sel = {}; // {id: true/false}
  SECOES.forEach(function(s){ _sel[s.id]=s.on; });

  function _fmtR(v){ return (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function _pad(s,n){ s=String(s||''); while(s.length<n) s+=' '; return s.slice(0,n); }
  function _padL(s,n){ s=String(s||''); while(s.length<n) s=' '+s; return s; }
  function _now(){ var d=new Date(); var p=function(n){return n<10?'0'+n:n;}; return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes()); }

  function _turmaTxt(){
    var t = (typeof _turmaAtiva!=='undefined' && _turmaAtiva) ? _turmaAtiva : null;
    var nome = t && (t.titulo||t.nome) || 'TURMA';
    var per  = '';
    if(t && t.periodStart && t.periodEnd) per = t.periodStart+' → '+t.periodEnd;
    else if(t && t.periodStart) per = 'A partir de '+t.periodStart;
    else if(t && t.periodEnd) per = 'Até '+t.periodEnd;
    return {nome:String(nome).toUpperCase(), periodo:per};
  }

  // ── COLETA DE DADOS (achata d.treinamentos[] também) ───────────
  function _coletaItens(){
    var arr = (typeof data!=='undefined' && Array.isArray(data)) ? data : [];
    var itens = []; // {cliente,treinamento,valor,entrada,status,formaPagamento,parcelas,consultor,treinador}
    arr.forEach(function(d){
      if(!d || !d.cliente) return;
      var base = {
        cliente:   String(d.cliente||'').toUpperCase(),
        consultor: String(d.consultor||'—').toUpperCase(),
        treinador: String(d.treinador||'—').toUpperCase(),
        status:    d.status||'aberto'
      };
      if(Array.isArray(d.treinamentos) && d.treinamentos.length>0){
        d.treinamentos.forEach(function(sub){
          if(!sub) return;
          itens.push(Object.assign({}, base, {
            treinamento:    String(sub.cod||d.treinamento||'—').toUpperCase(),
            valor:          Number(sub.valor!=null?sub.valor:0)||0,
            entrada:        Number(sub.entrada!=null?sub.entrada:(d.entrada||0))||0,
            formaPagamento: String(sub.formaPagamento||d.formaPagamento||'').toUpperCase(),
            parcelas:       (sub.parcelas&&sub.parcelas>0)?sub.parcelas:((d.parcelas&&d.parcelas>0)?d.parcelas:1),
            status:         (sub.status||d.status||'aberto')
          }));
        });
      } else {
        itens.push(Object.assign({}, base, {
          treinamento:    String(d.treinamento||'—').toUpperCase(),
          valor:          Number(d.valor||0)||0,
          entrada:        Number(d.entrada||0)||0,
          formaPagamento: String(d.formaPagamento||'').toUpperCase(),
          parcelas:       (d.parcelas&&d.parcelas>0)?d.parcelas:1
        }));
      }
    });
    return itens;
  }

  // ── BUILDERS por seção ─────────────────────────────────────────
  var SEP_LIN = '═══════════════════════════════════════════════════';
  var SEP_DOT = '───────────────────────────────────────────────────';

  function _bResumo(itens){
    var totPago=0, qtdPago=0, totEntrada=0, qtdEntrada=0;
    var clientesPagos=new Set(), clientesEntrada=new Set();
    itens.forEach(function(it){
      if(it.status==='pago'){ totPago+=it.valor; qtdPago++; clientesPagos.add(it.cliente); }
      if(it.entrada>0){ totEntrada+=it.entrada; qtdEntrada++; clientesEntrada.add(it.cliente); }
    });
    var tg = totPago+totEntrada;
    return [
      SEP_LIN,
      '💰 RESUMO FINANCEIRO',
      SEP_LIN,
      'Total faturado (PAGO):  '+_padL(_fmtR(totPago),14)+'  ·  '+qtdPago+' treino'+(qtdPago!==1?'s':'')+'  ·  '+clientesPagos.size+' cliente'+(clientesPagos.size!==1?'s':''),
      'Total em entradas:      '+_padL(_fmtR(totEntrada),14)+'  ·  '+clientesEntrada.size+' cliente'+(clientesEntrada.size!==1?'s':''),
      SEP_DOT,
      'TOTAL GERAL:            '+_padL(_fmtR(tg),14),
      ''
    ].join('\n');
  }

  function _bPagos(itens){
    var pagos = itens.filter(function(it){return it.status==='pago';})
                     .sort(function(a,b){return a.cliente.localeCompare(b.cliente,'pt-BR');});
    if(!pagos.length) return SEP_LIN+'\n✅ TREINAMENTOS PAGOS (0)\n'+SEP_LIN+'\nNenhum pagamento registrado.\n';
    var linhas = pagos.map(function(it,i){
      var n=String(i+1).padStart(2,'0');
      var pgto = it.formaPagamento ? (' · '+it.formaPagamento+(it.parcelas>1?' '+it.parcelas+'x':' 1x')) : '';
      return n+'. '+_pad(it.cliente,22)+' · '+_pad(it.treinamento,15)+' · '+_padL(_fmtR(it.valor),13)+pgto+' · '+it.consultor;
    });
    return [
      SEP_LIN,
      '✅ TREINAMENTOS PAGOS ('+pagos.length+')',
      SEP_LIN
    ].concat(linhas).join('\n')+'\n';
  }

  function _bEntradas(itens){
    var ents = itens.filter(function(it){return it.entrada>0;})
                    .sort(function(a,b){return a.cliente.localeCompare(b.cliente,'pt-BR');});
    if(!ents.length) return SEP_LIN+'\n💵 ENTRADAS RECEBIDAS (0)\n'+SEP_LIN+'\nNenhuma entrada registrada.\n';
    var linhas = ents.map(function(it,i){
      var n=String(i+1).padStart(2,'0');
      var pgto = it.formaPagamento ? (' · '+it.formaPagamento) : '';
      return n+'. '+_pad(it.cliente,22)+' · '+_pad(it.treinamento,15)+' · '+_padL(_fmtR(it.entrada),13)+pgto+' · '+it.consultor;
    });
    return [
      SEP_LIN,
      '💵 ENTRADAS RECEBIDAS ('+ents.length+')',
      SEP_LIN
    ].concat(linhas).join('\n')+'\n';
  }

  function _bAberto(itens){
    var abs = itens.filter(function(it){return it.status==='aberto'||it.status==='negociacao';})
                   .sort(function(a,b){return a.cliente.localeCompare(b.cliente,'pt-BR');});
    if(!abs.length) return SEP_LIN+'\n⏳ EM ABERTO (0)\n'+SEP_LIN+'\nNada em aberto.\n';
    var linhas = abs.map(function(it,i){
      var n=String(i+1).padStart(2,'0');
      var st = it.status==='negociacao' ? 'NEGOCIAÇÃO' : 'ABERTO';
      return n+'. '+_pad(it.cliente,22)+' · '+_pad(it.treinamento,15)+' · '+_padL(_fmtR(it.valor),13)+' · '+st+' · '+it.consultor;
    });
    return [
      SEP_LIN,
      '⏳ EM ABERTO ('+abs.length+')',
      SEP_LIN
    ].concat(linhas).join('\n')+'\n';
  }

  function _bRanking(itens, campo, titulo, ico){
    var mapa = {};
    itens.forEach(function(it){
      if(it.status!=='pago') return;
      var k = it[campo]||'—';
      if(!mapa[k]) mapa[k]={total:0, treinos:0, clientes:new Set()};
      mapa[k].total += it.valor;
      mapa[k].treinos++;
      mapa[k].clientes.add(it.cliente);
    });
    var rank = Object.keys(mapa).map(function(k){
      return {nome:k, total:mapa[k].total, treinos:mapa[k].treinos, clientes:mapa[k].clientes.size};
    }).sort(function(a,b){return b.total-a.total;});
    if(!rank.length) return SEP_LIN+'\n'+ico+' '+titulo+' (0)\n'+SEP_LIN+'\nSem dados.\n';
    var medals=['🥇','🥈','🥉'];
    var linhas = rank.slice(0,3).map(function(r,i){
      var m = medals[i] || (i+1)+'º';
      return m+' '+_pad(r.nome,22)+' · '+_padL(_fmtR(r.total),14)+'  ·  '+r.treinos+' treino'+(r.treinos!==1?'s':'')+'  ·  '+r.clientes+' cliente'+(r.clientes!==1?'s':'');
    });
    return [SEP_LIN, ico+' '+titulo+' (por valor pago)', SEP_LIN].concat(linhas).join('\n')+'\n';
  }

  function _bTopTreinamentos(itens){
    var mapa = {};
    itens.forEach(function(it){
      if(it.status!=='pago') return;
      var k = it.treinamento||'—';
      if(!mapa[k]) mapa[k]={total:0, qtd:0};
      mapa[k].total += it.valor;
      mapa[k].qtd++;
    });
    var rank = Object.keys(mapa).map(function(k){return {nome:k,total:mapa[k].total,qtd:mapa[k].qtd};})
                   .sort(function(a,b){return b.total-a.total;});
    if(!rank.length) return SEP_LIN+'\n📚 TOP TREINAMENTOS (0)\n'+SEP_LIN+'\nSem dados.\n';
    var linhas = rank.slice(0,5).map(function(r,i){
      return (i+1)+'º '+_pad(r.nome,18)+' · '+_padL(_fmtR(r.total),14)+'  ·  '+r.qtd+' venda'+(r.qtd!==1?'s':'');
    });
    return [SEP_LIN, '📚 TOP 5 TREINAMENTOS (por valor pago)', SEP_LIN].concat(linhas).join('\n')+'\n';
  }

  function _bMeta(itens){
    var META = (typeof window.META==='number'?window.META:(typeof META!=='undefined'?META:0));
    if(!META || META<=0) return SEP_LIN+'\n🎯 META\n'+SEP_LIN+'\nMeta não definida.\n';
    var pago = itens.filter(function(it){return it.status==='pago';}).reduce(function(s,it){return s+it.valor;},0);
    var pct = Math.round((pago/META)*100);
    var falta = Math.max(META-pago,0);
    var acima = Math.max(pago-META,0);
    var linhas = [
      'Meta:        '+_padL(_fmtR(META),14),
      'Realizado:   '+_padL(_fmtR(pago),14)+'  ('+pct+'%)'
    ];
    if(falta>0) linhas.push('Faltam:      '+_padL(_fmtR(falta),14));
    else linhas.push('Acima da meta: '+_fmtR(acima)+' 🏆');
    return [SEP_LIN, '🎯 META VS REALIZADO', SEP_LIN].concat(linhas).join('\n')+'\n';
  }

  function _bAssinatura(){
    var s = (typeof _getSessao==='function')?_getSessao():null;
    var nome = s ? (s.nome||s.login||'—') : '—';
    return [SEP_LIN, '✍️ GERADO POR', SEP_LIN, nome+' em '+_now(), ''].join('\n');
  }

  // ── MONTA RELATÓRIO COMPLETO ───────────────────────────────────
  function _gerarRelatorio(){
    var t = _turmaTxt();
    var itens = _coletaItens();
    var partes = [];
    partes.push('📊 RELATÓRIO SUPREMO — '+t.nome);
    if(t.periodo) partes.push('Período: '+t.periodo);
    partes.push('');
    if(_sel.resumo)     partes.push(_bResumo(itens));
    if(_sel.pagos)      partes.push(_bPagos(itens));
    if(_sel.entradas)   partes.push(_bEntradas(itens));
    if(_sel.aberto)     partes.push(_bAberto(itens));
    if(_sel.consultor)  partes.push(_bRanking(itens,'consultor','RANKING CONSULTORES','🏆'));
    if(_sel.treinador)  partes.push(_bRanking(itens,'treinador','RANKING TREINADORES','🎯'));
    if(_sel.topTrein)   partes.push(_bTopTreinamentos(itens));
    if(_sel.meta)       partes.push(_bMeta(itens));
    if(_sel.assinatura) partes.push(_bAssinatura());
    return partes.join('\n');
  }

  // ── UI: contagens nas seções (preview de "quantos itens") ──────
  function _contagensSecao(){
    var itens = _coletaItens();
    var cnt = {
      resumo: 3,
      pagos:  itens.filter(function(it){return it.status==='pago';}).length,
      entradas: itens.filter(function(it){return it.entrada>0;}).length,
      aberto: itens.filter(function(it){return it.status==='aberto'||it.status==='negociacao';}).length,
      consultor: 3,
      treinador: 3,
      topTrein: 5,
      meta: 1,
      assinatura: 1
    };
    return cnt;
  }

  // ── RENDER do modal (sidebar + preview) ────────────────────────
  function _renderModal(){
    var t = _turmaTxt();
    var subEl = document.getElementById('supSub');
    if(subEl) subEl.textContent = 'TURMA: '+t.nome + (t.periodo?(' · '+t.periodo):'');
    var cnt = _contagensSecao();
    var listEl = document.getElementById('supSecoes');
    if(listEl){
      listEl.innerHTML = SECOES.map(function(s){
        var on = !!_sel[s.id];
        return '<div class="sup-side-item'+(on?' on':'')+'" data-sec="'+s.id+'" onclick="window._supToggle(\''+s.id+'\')">'
          +'<div class="dot">'+(on?'✓':'')+'</div>'
          +'<span class="nm">'+s.ico+' '+s.label+'</span>'
          +'<span class="cnt">'+(cnt[s.id]!=null?cnt[s.id]:'')+'</span>'
        +'</div>';
      }).join('');
    }
    _renderPreview();
  }

  function _renderPreview(){
    var prevEl = document.getElementById('supPreview');
    if(prevEl) prevEl.textContent = _gerarRelatorio();
  }

  // ── API PÚBLICA ────────────────────────────────────────────────
  window.abrirSupremo = function(){
    // ADM-only desktop
    var s = (typeof _getSessao==='function')?_getSessao():null;
    if(s && s.perfil!=='adm') return;
    if(window.innerWidth<769){
      if(typeof _showToast==='function') _showToast('Relatório Supremo disponível apenas em desktop.','var(--amber)');
      return;
    }
    _renderModal();
    var ov = document.getElementById('supremoOverlay');
    if(ov) ov.classList.add('open');
  };

  window.fecharSupremo = function(){
    var ov = document.getElementById('supremoOverlay');
    if(ov) ov.classList.remove('open');
  };

  window._supToggle = function(id){
    _sel[id] = !_sel[id];
    // Atualiza só o item afetado + preview
    var item = document.querySelector('.sup-side-item[data-sec="'+id+'"]');
    if(item){
      item.classList.toggle('on', _sel[id]);
      var dot = item.querySelector('.dot');
      if(dot) dot.textContent = _sel[id]?'✓':'';
    }
    _renderPreview();
  };

  window._supMarcarTodos = function(marcar){
    SECOES.forEach(function(s){ _sel[s.id]=!!marcar; });
    _renderModal();
  };

  window._supCopiar = function(){
    var txt = _gerarRelatorio();
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){
        if(typeof _showToast==='function') _showToast('✅ Relatório supremo copiado — cole no WhatsApp/email da chefia','var(--pago)');
      }).catch(function(){
        // Fallback: textarea + execCommand
        _supCopiarFallback(txt);
      });
    } else {
      _supCopiarFallback(txt);
    }
  };

  function _supCopiarFallback(txt){
    try{
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.position='fixed';
      ta.style.opacity='0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if(typeof _showToast==='function') _showToast('✅ Relatório supremo copiado','var(--pago)');
    } catch(e){
      if(typeof _showToast==='function') _showToast('Falha ao copiar. Tente baixar .txt','var(--red)');
    }
  }

  window._supBaixarTxt = function(){
    var t = _turmaTxt();
    var fname = 'relatorio-supremo-'+String(t.nome||'turma').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+new Date().toISOString().slice(0,10)+'.txt';
    var blob = new Blob([_gerarRelatorio()],{type:'text/plain;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},800);
    if(typeof _showToast==='function') _showToast('💾 '+fname,'var(--accent)');
  };

  // Mostrar/esconder botão Supremo conforme perfil/viewport
  function _atualizarBotaoSupremo(){
    var btn = document.getElementById('btnSupremo');
    if(!btn) return;
    var s = (typeof _getSessao==='function')?_getSessao():null;
    var ehAdm = !s || s.perfil==='adm';
    var ehDesk = window.innerWidth>=769;
    btn.style.display = (ehAdm && ehDesk) ? '' : 'none';
  }
  window.addEventListener('resize', _atualizarBotaoSupremo);
  document.addEventListener('DOMContentLoaded', _atualizarBotaoSupremo);
  // Também chama após login (renderAll é o gancho mais frequente)
  var _origRender = window.renderAll;
  if(typeof _origRender==='function'){
    window.renderAll = function(){ var r=_origRender.apply(this,arguments); _atualizarBotaoSupremo(); return r; };
  }

})();
