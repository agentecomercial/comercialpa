/* ═══════════════════════════════════════════
   ABAS
═══════════════════════════════════════════ */
function switchTab(tab){
  document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',['geral','consultor','treinador','produto'][i]===tab));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  if(tab==='consultor')renderConsultor();
  if(tab==='treinador')renderTreinador();
  if(tab==='produto')renderProduto();
}

window._consultorAtivo=null;
function renderConsultor(){
  var _cd=document.getElementById('consultorDetail');
  var _detailAberto=_cd&&_cd.style.display!=='none'&&window._consultorAtivo;
  _cd.style.display='none';
  // Mostrar o layout wrapper com grid + ranking
  var wrap = document.getElementById('consultorLayoutWrap');
  if(wrap) wrap.style.display='grid';
  document.getElementById('consultorCards').style.display='';
  const metaInd=allConsultors.length>0?META/allConsultors.length:0;
  const _rankMapC=[...allConsultors].map(c=>({nome:c,pago:data.filter(d=>d&&d.cliente&&d.consultor===c&&d.status==='pago').reduce((a,d)=>a+d.valor,0)})).sort((a,b)=>b.pago-a.pago);
  const _posMapC={};_rankMapC.forEach((c,i)=>{_posMapC[c.nome]=i;});
  var _sessC=_getSessao?_getSessao():null;
  var _perfilC=_sessC?_sessC.perfil:'adm';
  var _vinculoC=_sessC?(_sessC.vinculo||'').toUpperCase():'';
  var _allConsultorsSorted=[...allConsultors].sort(function(a,b){return a.localeCompare(b,'pt-BR');});
  var _listaC=(_perfilC==='consultor'&&_vinculoC&&allConsultors.map(c=>c.toUpperCase()).includes(_vinculoC))
    ?_allConsultorsSorted.filter(c=>c.toUpperCase()===_vinculoC)
    :_allConsultorsSorted;

  // ── Renderizar apenas os cards de consultores (sem ranking embutido) ──
  document.getElementById('consultorCards').innerHTML=_listaC.map(c=>{
    const cdA=data.filter(d=>d&&d.cliente&&d.consultor===c);
    const cd=activeConsultorStatus===null?cdA:activeConsultorStatus==='entrada'?cdA.filter(d=>d.entrada>0):cdA.filter(d=>d.status===activeConsultorStatus);
    const total=cd.reduce((a,d)=>a+d.valor,0),pago=cd.filter(d=>d.status==='pago').reduce((a,d)=>a+d.valor,0);
    const aberto=cd.filter(d=>d.status==='aberto').reduce((a,d)=>a+d.valor,0),entrada=cd.reduce((a,d)=>a+d.entrada,0);
    const pctMeta=metaInd>0?Math.round((pago/metaInd)*100):0;
    const colMeta=getCol(pctMeta);
    const restante=Math.max(metaInd-pago,0);
    const cor=cColors[c]||'#888',bg=cBg[c]||'rgba(136,136,136,0.1)';
    const barW=metaInd>0?Math.min(Math.round((pago/(metaInd*1.5))*100),100):0;
    const _pos=_posMapC[c];
    const _medal=_pos===0?'🥇':_pos===1?'🥈':_pos===2?'🥉':`<span style="font-size:20px;font-weight:700;color:var(--muted);">${_pos+1}º</span>`;
    return `<div class="person-card" onclick="openConsultorDetail('${c}')" style="position:relative;">
      <div style="position:absolute;top:14px;right:14px;display:flex;flex-direction:column;align-items:center;line-height:1;">
        <span style="font-size:36px;font-weight:800;color:var(--accent);line-height:1;">${cd.length}</span>
        <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">cliente${cd.length!==1?'s':''}</span>
      </div>
      <div class="pc-avatar" style="background:${bg};color:${cor};border:2px solid ${cor};">${c.toUpperCase().charAt(0)}</div>
      <div class="pc-name" style="font-size:15px;">${c.toUpperCase()}</div>
      <div class="pc-stats">
        <div><div class="pc-stat-label" style="font-size:13px;">Potencial</div><div class="pc-stat-val" style="font-size:16px;color:var(--blue);">${formatVal(total)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Faturado</div><div class="pc-stat-val" style="font-size:16px;color:${colMeta.text};">${formatVal(pago)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Em aberto</div><div class="pc-stat-val" style="font-size:16px;color:var(--amber);">${formatVal(aberto)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">% Meta</div><div class="pc-stat-val" style="font-size:16px;color:${colMeta.text};">${pctMeta}%</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Individual</div><div class="pc-stat-val" style="font-size:16px;color:var(--accent);">${formatVal(metaInd)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Restante</div><div class="pc-stat-val" style="font-size:16px;color:${colMeta.text};">${restante>0?formatVal(restante):'Meta atingida!'}</div></div>
      </div>
      <div style="margin:10px 0 20px;"></div>
      <div class="pc-bar"><div class="pc-bar-fill" style="width:${barW}%;background:${colMeta.bar};box-shadow:0 0 15px 10px ${hexToRgba(colMeta.bar,.35)},0 0 10px 10px ${hexToRgba(colMeta.bar,.45)};"></div></div>
      <div style="text-align:center;margin-top:14px;font-size:60px;line-height:1;">${_medal}</div>
    </div>`;
  }).join('');

  // ── Ranking separado: injetado no painel fixo à direita ──
  const _medals=['gold','silver','bronze'];
  var _isAdmC=(_perfilC==='adm'||_perfilC==='ministrante');
  const _rankCFat=[...allConsultors].map(c=>({
    nome:c,
    total:data.filter(d=>d&&d.cliente&&d.consultor===c).reduce((a,d)=>a+d.valor,0),
    pago:data.filter(d=>d&&d.cliente&&d.consultor===c&&d.status==='pago').reduce((a,d)=>a+d.valor,0),
    clientes:data.filter(d=>d&&d.cliente&&d.consultor===c).length
  })).sort((a,b)=>b.pago-a.pago);

  const _totalPagoC=data.filter(d=>d&&d.cliente&&d.status==='pago').reduce((a,d)=>a+d.valor,0);
  const _pctGeralC=Math.round((_totalPagoC/META)*100);
  const _colGeralC=getCol(_pctGeralC);

  const _rankCHtml=_rankCFat.length===0
    ?'<div style="font-size:13px;color:var(--muted);padding:8px 0;">Nenhum dado.</div>'
    :_rankCFat.map((c,i)=>{
      const _pct=metaInd>0?Math.round((c.pago/metaInd)*100):0;
      const _col=getCol(_pct);
      const _onclick=_isAdmC?`onclick="abrirClientesVinculados('${c.nome}')" style="cursor:pointer;"` :`style="cursor:default;"`;
      return `<div class="rank-row" ${_onclick}>
        <div class="rank-num ${_medals[i]||''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
        <div class="rank-info">
          <div class="rank-name">${c.nome.toUpperCase()}</div>
          <div class="rank-detail">${c.clientes} cliente${c.clientes!==1?'s':''} · ${_pct}%</div>
        </div>
        <div class="rank-val" style="color:${_col.text};">${formatVal(c.pago)}</div>
      </div>`;
    }).join('');

  var rankPanel = document.getElementById('consultorRankingPanel');
  var rankBody  = document.getElementById('consultorRankingBody');
  if(rankPanel && rankBody){
    // Total geral no cabeçalho do painel
    var rankHeader = rankPanel.querySelector('.spanel-title');
    if(rankHeader) rankHeader.innerHTML = `Ranking — Faturado<br><span style="font-size:16px;font-weight:700;color:${_colGeralC.text};">${formatVal(_totalPagoC)}</span>`;
    rankBody.innerHTML = _rankCHtml;
    // NÃO atribuir onclick ao painel — cada linha já abre abrirClientesVinculados()
    rankPanel.style.cursor = 'default';
    rankPanel.onclick = null;
  }
  // Se o detalhe estava aberto antes do render, restaurá-lo
  if(_detailAberto) _renderConsultorDetail(window._consultorAtivo);
}
function abrirClientesModal(tipo){
  // Filtrar por consultor vinculado se perfil for consultor
  var _sess=_getSessao?_getSessao():null;
  var _perfil=_sess?_sess.perfil:'adm';
  var _vinculo=_sess?(_sess.vinculo||'').toUpperCase():'';
  var _base=(_perfil==='consultor'&&_vinculo)
    ? data.filter(function(d){return d&&d.cliente&&(d.consultor||'').toUpperCase()===_vinculo;})
    : data.filter(function(d){return d&&d.cliente;});

  let lista,titulo,subExtra='';
  if(tipo==='todos'){
    lista=[..._base];
    titulo='Potencial total';
    const total=lista.reduce((a,d)=>a+d.valor,0);
    subExtra=lista.length+' cliente'+(lista.length!==1?'s':'')+' · Potencial total: <span style="color:var(--blue);font-weight:700;">'+formatVal(total)+'</span>';
  } else if(tipo==='aberto'){
    lista=_base.filter(d=>d.status==='aberto');
    titulo='Em aberto';
    const total=lista.reduce((a,d)=>a+d.valor,0);
    subExtra=lista.length+' cliente'+(lista.length!==1?'s':'')+' · Total em aberto: <span style="color:var(--amber);font-weight:700;">'+formatVal(total)+'</span>';
  } else if(tipo==='pago'){
    lista=_base.filter(d=>d.status==='pago');
    titulo='Faturado';
    const total=lista.reduce((a,d)=>a+d.valor,0);
    const col=getCol(Math.round((total/META)*100));
    subExtra=lista.length+' cliente'+(lista.length!==1?'s':'')+' · Total faturado: <span style="color:'+col.text+';font-weight:700;">'+formatVal(total)+'</span>';
  } else if(tipo==='entrada'){
    lista=_base.filter(d=>d.entrada>0);
    titulo='Total entradas';
    const total=lista.reduce((a,d)=>a+d.entrada,0);
    subExtra=lista.length+' cliente'+(lista.length!==1?'s':'')+' com entrada · Total: <span style="color:var(--accent);font-weight:700;">'+formatVal(total)+'</span>';
  }
  _abrirClientesModalComLista(lista,titulo,subExtra);
}
function abrirPagosModal(){
  const pagos=data.filter(d=>d&&d.cliente&&d.status==='pago').sort((a,b)=>b.valor-a.valor);
  const total=pagos.reduce((a,d)=>a+d.valor,0);
  const pct=Math.round((total/META)*100);
  const col=getCol(pct);
  document.getElementById('pagosModalSub').innerHTML=
    pagos.length+' cliente'+(pagos.length!==1?'s':'')+' pagos · Total: <span style="color:'+col.text+';font-weight:700;">'+formatVal(total)+'</span> · '+pct+'% da meta';
  document.getElementById('pagosModalTable').innerHTML=pagos.length===0
    ?'<tr class="empty-row"><td colspan="5">Nenhum cliente pago.</td></tr>'
    :pagos.map(d=>`<tr style="border-left:2px solid #39ff14;">
      <td style="font-weight:600;text-transform:uppercase;color:#39ff14;text-align:left;">${d.cliente}</td>
      <td style="text-align:center;font-size:12px;">${d.treinamento||'—'}</td>
      <td style="text-align:center;font-size:12px;color:var(--muted);">${d.treinamento==='CI'?d.treinador:'-'}</td>
      <td style="text-align:center;font-size:12px;color:var(--muted);">${d.consultor.toUpperCase()}</td>
      <td style="text-align:right;font-weight:600;color:${col.text};">${formatVal(d.valor)}</td>
    </tr>`).join('');
  document.getElementById('pagosModalOverlay').classList.add('open');
}
function openConsultorDetail(c){window._consultorAtivo=c;_renderConsultorDetail(c);}
function _renderConsultorDetail(c){
  const cdA=data.filter(d=>d&&d.cliente&&d.consultor===c).sort((a,b)=>a.cliente.localeCompare(b.cliente,'pt-BR'));
  var _cdStatus=activeConsultorStatus===null?cdA:activeConsultorStatus==='entrada'?cdA.filter(d=>d.entrada>0):cdA.filter(d=>d.status===activeConsultorStatus);
  var _fpC=window._getFiltroPresencaConsultor?window._getFiltroPresencaConsultor():null;
  const cd=_fpC?_cdStatus.filter(d=>(d.presenca||'pendente')===_fpC):_cdStatus;
  if(window._renderFiltrosPresencaConsultor) window._renderFiltrosPresencaConsultor();

  // ── Métricas agregadas ──
  // POTENCIAL = vendas em NEGOCIAÇÃO (não total geral)
  const potencial=cdA.filter(d=>d.status==='negociacao').reduce((a,d)=>a+d.valor,0);
  const total=cdA.reduce((a,d)=>a+d.valor,0); // mantido para subtítulo
  const pago=cdA.filter(d=>d.status==='pago').reduce((a,d)=>a+d.valor,0);
  const aberto=cdA.filter(d=>d.status==='aberto').reduce((a,d)=>a+d.valor,0);
  const entrada=cdA.reduce((a,d)=>a+(d.entrada||0),0);
  const nTodos=cdA.length;
  const nPago=cdA.filter(d=>d.status==='pago').length;
  const nAberto=cdA.filter(d=>d.status==='aberto').length;
  const nEntrada=cdA.filter(d=>d.entrada>0).length;
  const nPotencial=cdA.filter(d=>d.status==='negociacao').length;

  const fl=activeConsultorStatus?' · Filtro: '+activeConsultorStatus.toUpperCase():'';
  const _metaInd=allConsultors.length>0?META/allConsultors.length:0;
  const _pctDetail=_metaInd>0?Math.round((pago/_metaInd)*100):0;
  const _colDetail=getCol(_pctDetail);

  // Permissão: só ADM edita/remove
  var _sessD=_getSessao?_getSessao():null;
  var _perfilD=_sessD?_sessD.perfil:'adm';
  var _isAdmD=_perfilD==='adm';
  var _vinculoD=_sessD?(_sessD.vinculo||'').toUpperCase():'';
  var _ehProprio=_perfilD==='consultor';

  var _btnNC2=document.getElementById('btnNovoClienteConsultor');
  var _rowNC2=document.getElementById('rowNovoClienteConsultor');
  if(_btnNC2) _btnNC2.style.display=_ehProprio?'block':'none';
  if(_rowNC2) _rowNC2.style.display=_ehProprio?'block':'none';

  // ── Nome do consultor (sem alteração) ──
  document.getElementById('consultorDetailName').textContent=c.toUpperCase()+' — '+cdA.length+' cliente'+(cdA.length!==1?'s':'');

  // ── Melhoria 1: KPIs + Melhoria 5: barra de progresso ──
  const _pctBar=Math.min(_pctDetail,100);
  const _barColor=_colDetail.bar;
  document.getElementById('consultorDetailSub').innerHTML=
    // Barra de progresso da meta (melhoria 5)
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    +'<div style="flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;">'
    +'<div style="height:4px;width:'+_pctBar+'%;background:'+_barColor+';border-radius:2px;transition:width .4s;"></div>'
    +'</div>'
    +'<span style="font-size:11px;font-weight:600;color:'+_colDetail.text+';font-family:\'DM Mono\',monospace;min-width:36px;text-align:right;">'+_pctDetail+'%</span>'
    +'<span style="font-size:10px;color:var(--muted);">da meta</span>'
    +'</div>'
    // KPI cards — clicáveis para filtrar lista
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">'
    +'<div onclick="setConsultorStatus(\'negociacao\')" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--accent)44\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Potencial</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--text);font-family:\'DM Mono\',monospace;">'+formatVal(potencial)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nPotencial+' em negoc.</div>'
    +'</div>'
    +'<div onclick="setConsultorStatus(\'pago\')" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--green)44\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Faturado</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--green);font-family:\'DM Mono\',monospace;">'+formatVal(pago)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nPago+' pago'+(nPago!==1?'s':'')+'</div>'
    +'</div>'
    +'<div onclick="setConsultorStatus(\'aberto\')" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--amber)44\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Em aberto</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--amber);font-family:\'DM Mono\',monospace;">'+formatVal(aberto)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nAberto+' cliente'+(nAberto!==1?'s':'')+'</div>'
    +'</div>'
    +'<div onclick="setConsultorStatus(\'entrada\')" style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--blue)44\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Entradas</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--blue);font-family:\'DM Mono\',monospace;">'+(entrada>0?formatVal(entrada):'—')+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nEntrada+' cliente'+(nEntrada!==1?'s':'')+'</div>'
    +'</div>'
    +'</div>'
    // Barra de presença
    +'<div id="presencaBarConsultor" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 0 4px;font-size:11px;"></div>'
    // Subtítulo original compacto
    +'<span style="font-size:12px;color:var(--muted);">Potencial: '+formatVal(total)+' · Faturado: <span style="color:'+_colDetail.text+';font-weight:700;">'+formatVal(pago)+'</span>'+(entrada>0?' · Entradas: '+formatVal(entrada):'')+fl+'</span>';

  // ── Botões de filtro: atualizar contagem ──
  const _fcMap={fcAll:nTodos,fcAberto:nAberto,fcPago:nPago,fcEntrada:nEntrada};
  const _fcLabel={fcAll:'Todos',fcAberto:'Aberto',fcPago:'Pago',fcEntrada:'Entrada'};
  Object.keys(_fcMap).forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.textContent=_fcLabel[id]+(_fcMap[id]>0?' ('+_fcMap[id]+')':'');
  });

  // Ocultar layout wrap e mostrar detail (sem alteração)
  var _wrap=document.getElementById('consultorLayoutWrap');
  if(_wrap) _wrap.style.display='none';
  document.getElementById('consultorDetail').style.display='block';

  const sl=s=>s==='pago'?'PAGO':s==='negociacao'?'NEGOCIAÇÃO':s==='desistiu'?'DESISTIU':s==='estorno'?'ESTORNO':s==='-'?'—':'ABERTO';

  // ── Cores por status (melhoria 3 + spec: PAGO = neon no nome) ──
  const _statusBorder={pago:'2px solid #39ff14',aberto:'2px solid var(--amber)',negociacao:'2px solid var(--blue)',desistiu:'2px solid var(--red)',estorno:'2px solid rgba(168,85,247,.7)','-':'none'};

  // ── Renderização bifurcada por perfil (sem alteração de lógica) ──
  const tblEl=document.getElementById('consultorDetailTable');
  const tbl=tblEl?tblEl.closest('table'):null;
  var listEl=document.getElementById('consultorDetailList');

  // Helper: texto de treinamentos do registro
  function _treinDisplay(d){
    if(d.treinamentos&&d.treinamentos.length) return d.treinamentos.map(function(t){return t.cod;}).join(' · ');
    return d.treinamento||'—';
  }

  if(_ehProprio){
    if(tbl) tbl.style.display='none';
    if(!listEl){
      listEl=document.createElement('div');
      listEl.id='consultorDetailList';
      listEl.style.marginTop='8px';
      document.getElementById('consultorDetail').appendChild(listEl);
    }
    listEl.style.display='';
    if(!cd.length){
      listEl.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Nenhum cliente para este filtro.</div>';
    } else {
      listEl.style.cssText='margin-top:8px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;';
      listEl.innerHTML=cd.map(function(d){
        var ri=data.indexOf(d);
        var _ip=d.status==='pago';
        var _td=_treinDisplay(d);
        var _treins=d.treinamentos&&d.treinamentos.length?d.treinamentos:[];
        var _treinRows=_treins.length?_treins.map(function(t){
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);">'
            +'<span style="font-size:12px;font-weight:700;color:var(--accent);font-family:\'DM Mono\',monospace;letter-spacing:.05em;">'+t.cod+'</span>'
            +'<span style="font-size:12px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums;">'+formatVal(t.valor)+'</span>'
            +'</div>';
        }).join(''):'<div style="font-size:11px;color:var(--muted);padding:6px 0;">Nenhum treinamento cadastrado.</div>';
        var _panelId='clipanel_'+ri;
        return '<div style="border-bottom:1px solid var(--border);">'
          // ── Header clicável ──
          +'<div id="clihdr_'+ri+'" onclick="window._toggleCliAcc('+ri+')" style="display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;transition:background .12s;user-select:none;" onmouseover="this.style.background=\'var(--surface3,rgba(255,255,255,.03))\'" onmouseout="this.style.background=\'transparent\'">'
          +'<span id="cliarr_'+ri+'" style="font-size:9px;color:var(--muted);flex-shrink:0;transition:transform .2s;line-height:1;">▶</span>'
          +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:13px;font-weight:700;'+(+_ip?'color:#39ff14;':'color:var(--text);')+'text-transform:uppercase;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+d.cliente+'</div>'
          +(function(){
            var _stMap={'pago':{cor:'#39ff14',l:'Pago'},'negociacao':{cor:'#60a5fa',l:'Negociação'},'desistiu':{cor:'#ff5252',l:'Desistiu'},'estorno':{cor:'#ff5252',l:'Estorno'},'entrada':{cor:'#c8f05a',l:'Entrada'},'aberto':{cor:'#ffaa00',l:'Aberto'}};
            var _stInfo=_stMap[d.status||'']||{cor:'#666',l:'Sem status'};
            var _valTxt=d.valor>0?('<span style="font-size:10px;color:var(--muted);margin-left:auto;font-variant-numeric:tabular-nums;">'+formatVal(d.valor)+'</span>'):'';
            return '<div style="display:flex;align-items:center;gap:5px;margin-top:3px;">'
              +'<span style="width:6px;height:6px;border-radius:50%;background:'+_stInfo.cor+';flex-shrink:0;display:inline-block;"></span>'
              +'<span style="font-size:10px;font-weight:600;color:'+_stInfo.cor+';">'+_stInfo.l+'</span>'
              +_valTxt
              +'</div>';
          })()
          +'</div>'
          +'<div onclick="event.stopPropagation();" data-presenca-ri="'+ri+'" style="flex-shrink:0;">'+(window._presencaBadgeHtml?window._presencaBadgeHtml(ri):'—')+'</div>'
          +'<button onclick="event.stopPropagation();window._abrirMenuCliente(event,\''+d.cliente.replace(/'/g,"\\'")+'\',' +ri+')" style="background:rgba(200,240,90,.12);border:1px solid rgba(200,240,90,.3);border-radius:50%;width:22px;height:22px;cursor:pointer;color:var(--accent);font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;flex-shrink:0;">+</button>'
          +'</div>'
          // ── Painel expansível ──
          +'<div id="'+_panelId+'" style="display:none;background:rgba(0,0,0,.18);padding:10px 14px 12px 34px;border-top:1px solid rgba(255,255,255,.04);">'
          +_treinRows
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);">'
          +'<span style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.07em;">Total</span>'
          +'<span style="font-size:13px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums;">'+formatVal(d.valor)+'</span>'
          +'</div>'
          +'<button onclick="abrirClienteDetalhe('+ri+')" style="margin-top:10px;width:100%;font-size:11px;font-weight:700;padding:7px 0;border-radius:6px;border:1px solid rgba(200,240,90,.3);background:rgba(200,240,90,.08);color:var(--accent);cursor:pointer;font-family:\'DM Sans\',sans-serif;">✏ Editar cliente</button>'
          +'</div>'
          +'</div>';
      }).join('');
    }

    // Toggle accordion — expande 1 por vez
    window._toggleCliAcc=function(ri){
      var panel=document.getElementById('clipanel_'+ri);
      var arrow=document.getElementById('cliarr_'+ri);
      if(!panel) return;
      var open=panel.style.display!=='none';
      // fechar todos
      document.querySelectorAll('[id^="clipanel_"]').forEach(function(p){ p.style.display='none'; });
      document.querySelectorAll('[id^="cliarr_"]').forEach(function(a){ a.style.transform='';a.style.color='var(--muted)'; });
      if(!open){
        panel.style.display='block';
        if(arrow){arrow.style.transform='rotate(90deg)';arrow.style.color='var(--accent)';}
      }
    };
  } else {
    if(tbl) tbl.style.display='';
    if(listEl) listEl.style.display='none';
    var _cdCards=document.getElementById('consultorDetailCards');
    if(!cd.length){
      tblEl.innerHTML='<tr class="empty-row"><td colspan="6">Nenhum cliente para este filtro.</td></tr>';
      if(_cdCards) _cdCards.innerHTML='<div class="mob-empty">Nenhum cliente para este filtro.</div>';
    } else {
      var _rows='';
      cd.forEach(function(d){
          const ri=data.indexOf(d);
          const ip=d.status==='pago';
          const hi=!!(d.info&&d.info.trim());
          const st=d.status||'-';
          const borderLeft=_statusBorder[st]||'2px solid var(--border)';
          const treinadorTxt=(d.treinador&&d.treinador!=='-')?d.treinador.toUpperCase():'—';
          const entradaTxt=d.entrada>0?'↑ '+formatVal(d.entrada):'—';
          const entradaStyle=d.entrada>0?'color:var(--green);font-weight:600;':'color:var(--muted);';
          _rows+=`<tr style="border-left:${borderLeft};" onclick="abrirClienteDetalhe(${ri})" title="Clique para editar" class="tr-clickable">
            <td style="font-weight:600;text-transform:uppercase;white-space:nowrap;${ip?'color:#39ff14;':''}"><span style="display:inline-flex;align-items:center;gap:6px;">${d.cliente}<button class="info-btn${hi?' has-info':''}" onclick="event.stopPropagation();openClientInfo(${ri})">i</button><span data-presenca-ri="${ri}" onclick="event.stopPropagation();">${window._presencaBadgeHtml?window._presencaBadgeHtml(ri):''}</span><button onclick="event.stopPropagation();window._abrirMenuCliente(event,'${d.cliente.replace(/'/g,"\\'")}',${ri})" style="background:rgba(200,240,90,.12);border:1px solid rgba(200,240,90,.3);border-radius:50%;width:18px;height:18px;cursor:pointer;color:var(--accent);font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0;line-height:1;">+</button></span></td>
            <td style="text-align:center;white-space:nowrap;color:var(--muted);font-size:11px;">${treinadorTxt}</td>
            <td style="text-align:center;white-space:nowrap;font-size:11px;color:var(--muted);">—</td>
            <td style="text-align:center;white-space:nowrap;">${formatVal(d.valor)}</td>
            <td style="text-align:center;white-space:nowrap;"><span class="badge badge-${st}">${sl(st)}</span></td>
            <td style="text-align:center;white-space:nowrap;${entradaStyle}">${entradaTxt}</td>
          </tr>`;
      });
      tblEl.innerHTML=_rows;

      // ── Cards mobile do detalhe do consultor (visualização compacta, click → abre modal) ──
      if(_cdCards){
        var _statusMap2={pago:{c:'#39ff14',l:'Pago'},aberto:{c:'var(--amber)',l:'Aberto'},negociacao:{c:'var(--blue)',l:'Negociação'},entrada:{c:'var(--accent)',l:'Entrada'},desistiu:{c:'var(--red)',l:'Desistiu'},estorno:{c:'var(--red)',l:'Estorno'},'-':{c:'var(--muted)',l:'Sem status'}};
        _cdCards.innerHTML=cd.map(function(d){
          var ri=data.indexOf(d), pago=d.status==='pago', hasInfo=!!(d.info&&d.info.trim());
          var stInfo=_statusMap2[d.status||'aberto']||_statusMap2['-'];
          var ticketCor = d.valor >= 10000.01 ? 'var(--green)' : d.valor >= 5001 ? 'var(--amber)' : d.valor > 0 ? 'var(--blue)' : 'var(--muted)';
          var treinadorBlock = (d.treinador && d.treinador !== '-')
            ? '<div class="mob-field"><span class="mob-field-label">Treinador</span><span style="font-size:11px;color:var(--muted);text-transform:uppercase;">'+d.treinador.toUpperCase()+'</span></div>' : '';
          var entradaBlock = d.entrada>0
            ? '<div class="mob-field"><span class="mob-field-label">Entrada</span><span style="font-size:12px;color:var(--green);font-weight:600;">↑ '+formatVal(d.entrada)+'</span></div>' : '';
          return '<div class="mob-card'+(pago?' pago':'')+'" id="cdmobcard_'+ri+'">'
            +'<div class="mob-header" onclick="window._toggleConsCliMobile('+ri+')">'
              +'<span class="mob-arrow">▶</span>'
              +'<div class="mob-info">'
                +'<div class="mob-name-row">'
                  +'<span class="mob-name'+(pago?' pago':'')+'">'+d.cliente+'</span>'
                  +'<button class="info-btn'+(hasInfo?' has-info':'')+'" onclick="event.stopPropagation();openClientInfo('+ri+')">i</button>'
                  +'<span class="mob-presenca" data-presenca-ri="'+ri+'">'+(window._presencaBadgeHtml?window._presencaBadgeHtml(ri):'')+'</span>'
                +'</div>'
                +'<div class="mob-status" style="color:'+stInfo.c+';"><span class="mob-dot" style="background:'+stInfo.c+';"></span>'+stInfo.l+'</div>'
              +'</div>'
              +'<div class="mob-val" style="color:'+(pago?'#39ff14':ticketCor)+';">'+formatVal(d.valor||0)+'</div>'
            +'</div>'
            +'<div class="mob-body">'
              +treinadorBlock
              +entradaBlock
              +'<button onclick="abrirClienteDetalhe('+ri+')" style="margin-top:6px;width:100%;font-size:11px;font-weight:700;padding:8px 0;border-radius:6px;border:1px solid rgba(200,240,90,.3);background:rgba(200,240,90,.08);color:var(--accent);cursor:pointer;">✏ Editar cliente</button>'
            +'</div>'
          +'</div>';
        }).join('');
      }
    }
  }
  // Toggle dos cards mobile do detalhe do consultor (1 aberto por vez)
  window._toggleConsCliMobile=function(ri){
    var card=document.getElementById('cdmobcard_'+ri);
    if(!card) return;
    var open=card.classList.contains('open');
    document.querySelectorAll('#consultorDetailCards .mob-card.open').forEach(function(c){c.classList.remove('open');});
    if(!open) card.classList.add('open');
  };
  // Preencher barra de presença após renderizar o detail
  if(typeof window._atualizarBarraPresencaConsultor==='function') window._atualizarBarraPresencaConsultor();
}

window._toggleGrupo=function(gid){
  var filhos=document.querySelectorAll('[data-grupo="'+gid+'"]');
  var subDiv=document.getElementById(gid);
  var arr=document.getElementById('arr_'+gid);
  if(filhos.length){
    var aberto=filhos[0].style.display!=='none';
    filhos.forEach(function(el){el.style.display=aberto?'none':'';});
    if(arr) arr.style.transform=aberto?'':'rotate(90deg)';
  } else if(subDiv){
    var aberto=subDiv.style.display!=='none';
    subDiv.style.display=aberto?'none':'';
    if(arr) arr.style.transform=aberto?'':'rotate(90deg)';
  }
};
var _clienteDetalheIdx=null;
function abrirClienteDetalhe(ri){
  var d=data[ri];
  if(!d) return;
  _clienteDetalheIdx=ri;
  var sl=function(s){return s==='pago'?'PAGO':s==='negociacao'?'NEGOCIAÇÃO':s==='desistiu'?'DESISTIU':s==='estorno'?'ESTORNO':s==='-'?'—':'ABERTO';};

  /* Modo edição: consultor edita seus próprios clientes; ADM edita qualquer um */
  var _sess=_getSessao?_getSessao():null;
  var _perfil=_sess?_sess.perfil:'adm';
  var _modoEdit=(_perfil==='consultor'||_perfil==='adm'||!_sess);

  document.getElementById('clienteDetalheName').textContent=d.cliente;

  /* Treinamentos múltiplos */
  var _cdLista=document.getElementById('cdTreinamentosLista');
  if(_cdLista){
    _cdLista.innerHTML='';
    // Usa array real se existir (mesmo vazio); só usa fallback legado se treinamentos for null/undefined
    var _treinsEdit=Array.isArray(d.treinamentos)?d.treinamentos:(d.treinamento&&d.treinamento!=='-'?[{cod:d.treinamento,valor:d.valor||0}]:[]);
    _treinsEdit.forEach(function(t){_addTreinRow('cdTreinamentosLista',t.cod,t.valor);});
    _calcTotalTrein('cdTreinamentosLista');
    // Bloquear edição de linhas existentes se não for modo edição
    if(!_modoEdit){
      _cdLista.querySelectorAll('select,input,button').forEach(function(el){el.disabled=true;el.style.opacity='0.6';});
    }
  }
  var _cdBtns=document.getElementById('cdTreinBtns');
  if(_cdBtns)_cdBtns.style.display=_modoEdit?'':'none';

  /* Treinador */
  var _trdRow=document.getElementById('clienteDetalheTreinadorRow');
  var trdEdit=document.getElementById('clienteDetalheTreinadorEdit');
  var _trainLst=(typeof allTrainers!=='undefined'&&Array.isArray(allTrainers))?allTrainers:[];
  trdEdit.innerHTML='<option value="-">—</option>'+_trainLst.map(function(t){
    return '<option value="'+t+'"'+(d.treinador===t?' selected':'')+'>'+t.toUpperCase()+'</option>';
  }).join('');
  _checkCITreinador('cdTreinamentosLista');

  /* Valor legado (hidden) */
  var valEl=document.getElementById('clienteDetalheValor');if(valEl)valEl.textContent=formatVal(d.valor);

  /* Status */
  var stEl=document.getElementById('clienteDetalheStatus');
  stEl.textContent=sl(d.status);
  stEl.className='badge badge-'+(d.status||'aberto');
  var stEdit=document.getElementById('clienteDetalheStatusEdit');
  var STATUS_OPTS=[{v:'-',l:'—'},{v:'aberto',l:'ABERTO'},{v:'pago',l:'PAGO'},{v:'negociacao',l:'NEGOCIAÇÃO'},{v:'desistiu',l:'DESISTIU'},{v:'estorno',l:'ESTORNO'}];
  stEdit.innerHTML=STATUS_OPTS.map(function(s){
    return '<option value="'+s.v+'"'+((d.status||'aberto')===s.v?' selected':'')+'>'+s.l+'</option>';
  }).join('');
  stEl.style.display=_modoEdit?'none':'';
  stEdit.style.display=_modoEdit?'':'none';

  /* Entrada e Info (sempre só leitura) */
  var entRow=document.getElementById('clienteDetalheEntradaRow');
  document.getElementById('clienteDetalheEntrada').textContent=d.entrada>0?formatVal(d.entrada):'—';
  entRow.style.display=d.entrada>0?'flex':'none';
  var infoRow=document.getElementById('clienteDetalheInfoRow');
  var infoEl=document.getElementById('clienteDetalheInfo');
  if(d.info&&d.info.trim()){infoEl.textContent=d.info.trim();infoRow.style.display='block';}
  else infoRow.style.display='none';

  /* Botão Salvar */
  document.getElementById('clienteDetalheSalvar').style.display=_modoEdit?'':'none';

  document.getElementById('clienteDetalheOverlay').classList.add('open');
}

function salvarClienteDetalhe(){
  if(_clienteDetalheIdx===null) return;
  var d=data[_clienteDetalheIdx];
  if(!d) return;

  var _treinRows=_getTreinRows('cdTreinamentosLista');
  var _valorTotal=_treinRows.reduce(function(a,t){return a+t.valor;},0);
  var _hasCI=_treinRows.some(function(t){return t.cod==='CI';});
  var novoStatus=document.getElementById('clienteDetalheStatusEdit').value||'aberto';
  var novoTreinador=(document.getElementById('clienteDetalheTreinadorEdit')||{}).value||'-';

  d.treinamentos=_treinRows;
  d.treinamento=_treinRows.length?_treinRows[0].cod:'-';
  d.valor=_valorTotal;
  d.treinador=_hasCI?(novoTreinador==='-'?'':novoTreinador):'-';
  d.status=novoStatus;

  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  if(typeof renderAll==='function') renderAll();
  // Re-abrir detalhe do consultor se estava aberto
  if(window._consultorAtivo){
    var _cd=document.getElementById('consultorDetail');
    if(_cd&&_cd.style.display!=='none') _renderConsultorDetail(window._consultorAtivo);
    else openConsultorDetail(window._consultorAtivo);
  }
  fecharClienteDetalhe();
  if(typeof _showToast==='function') _showToast('Cliente atualizado!','var(--accent)');
}

function fecharClienteDetalhe(){
  document.getElementById('clienteDetalheOverlay').classList.remove('open');
  _clienteDetalheIdx=null;
}
function closeConsultorDetail(){
  window._consultorAtivo=null;activeConsultorStatus=null;
  ['fcAll','fcAberto','fcPago','fcEntrada'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const el=document.getElementById('fcAll');if(el)el.classList.add('active');
  document.getElementById('consultorDetail').style.display='none';
  var _wrap=document.getElementById('consultorLayoutWrap');
  if(_wrap) _wrap.style.display='grid';
  renderConsultor();
}

