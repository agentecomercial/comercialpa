/* ═══════════════════════════════════════════
   ABA TREINADOR
═══════════════════════════════════════════ */
window._treinadorAtivo=null;

function _getTurmaMinistante(){
  if(!_turmaAtiva) return null;
  return _turmaAtiva.ministrante||null;
}

function _setMinistrante(nome,ativo){
  if(!_turmaAtiva) return;
  var novoMin=ativo?nome:null;
  _turmaAtiva.ministrante=novoMin;
  // Salvar ministrante direto no nó unificado turmas/{id}
  _saveTurmaMeta(_turmaAtiva.id,'ministrante',novoMin);

  // Atualiza visual imediatamente
  renderAll();
  renderTreinador();

  var novoPerfil=ativo?'ministrante':'treinador';
  var uid='treinador_'+_normalizeUid(nome);

  if(window._fbSave){
    _showToast('🔄 Atualizando perfil...','var(--muted)');
    // Primeiro garante que o registro existe
    var registroBase={nome:nome,perfil:novoPerfil,login:'',senha:'',ativo:true,vinculo:nome};
    window._fbGet('usuarios/'+uid).then(function(registro){
      if(registro){
        // Registro existe — atualiza apenas o campo perfil
        return window._fbSave('usuarios/'+uid+'/perfil',novoPerfil);
      } else {
        // Registro não existe — cria completo com perfil correto
        return window._fbSave('usuarios/'+uid,registroBase);
      }
    }).then(function(){
      _showToast(ativo?'✅ '+nome+' agora é Ministrante':'✅ '+nome+' voltou para Treinador','var(--accent)');
      renderAll();
      renderTreinador();
    }).catch(function(e){
      _showToast('❌ Erro: '+(e&&e.message?e.message:JSON.stringify(e)),'var(--red)');
      renderTreinador();
    });
  } else {
    _showToast('⚠️ Firebase não disponível. Salvo apenas localmente.','var(--amber)');
    renderAll();
    renderTreinador();
  }
}

function renderTreinador(){
  document.getElementById('treinadorDetail').style.display='none';
  var _twrapR=document.getElementById('treinadorLayoutWrap');
  if(_twrapR) _twrapR.style.display='grid';
  document.getElementById('treinadorCards').style.display='grid';
  const _ministrante=_getTurmaMinistante();
  const _sessT=_getSessao?_getSessao():null;
  const _isAdmT=!_sessT||_sessT.perfil==='adm';

  // Lista editável — oculta por padrão, gerenciada por abrirEditarTreinadores
  var listaEl=document.getElementById('treinadorListaEdicao');
  if(listaEl) listaEl.style.display='none';
  var btnEdit=document.getElementById('btnEditarTreinadores');
  if(btnEdit) btnEdit.style.display=_isAdmT?'':'none';

  var _allTrainersSorted=[...allTrainers].sort(function(a,b){return a.localeCompare(b,'pt-BR');});
  var _listaT=(_isAdmT||_sessT&&_sessT.perfil==='ministrante')
    ?_allTrainersSorted
    :(_sessT&&_sessT.perfil==='treinador'&&(_sessT.vinculo||''))
      ?_allTrainersSorted.filter(t=>t.toUpperCase()===(_sessT.vinculo||'').toUpperCase())||_allTrainersSorted
      :_allTrainersSorted;
  document.getElementById('treinadorCards').innerHTML=_listaT.map(t=>{
    const tdA=data.filter(d=>d&&d.cliente&&d.treinador===t);
    const td=activeTreinadorStatus===null?tdA:activeTreinadorStatus==='entrada'?tdA.filter(d=>d.entrada>0):tdA.filter(d=>d.status===activeTreinadorStatus);
    const total=td.reduce((a,d)=>a+d.valor,0),pago=td.filter(d=>d.status==='pago').reduce((a,d)=>a+d.valor,0),aberto=td.filter(d=>d.status==='aberto').reduce((a,d)=>a+d.valor,0);
    const pct=Math.round((pago/META)*100),col=getCol(pct),cor=tBorder[t]||'#888',bg=tBg[t]||'rgba(136,136,136,0.1)',ini=t.split(' ').map(w=>w[0]).join('').slice(0,2);
    const isMinistrante=_ministrante===t;
    const outroMinistrante=!!(_ministrante&&!isMinistrante);
    const ministranteToggle=_isAdmT?`
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;" onclick="event.stopPropagation()">
        <span style="font-size:12px;font-weight:700;color:${isMinistrante?'var(--accent)':outroMinistrante?'var(--border2)':'var(--muted)'};text-transform:uppercase;letter-spacing:.06em;">${isMinistrante?'Ministrante':'Treinador'}</span>
        <div onclick="event.stopPropagation();${outroMinistrante?`_showToast('\u274c Desative o ministrante atual antes de ativar outro.','var(--red)')`:(`_setMinistrante('${t}',${!isMinistrante})`)}" style="cursor:${outroMinistrante?'not-allowed':'pointer'};width:44px;height:24px;border-radius:999px;background:${isMinistrante?'var(--accent)':'rgba(255,255,255,.1)'};position:relative;transition:background .3s;flex-shrink:0;opacity:${outroMinistrante?'0.35':'1'};">
          <div style="position:absolute;top:3px;left:${isMinistrante?'23':'3'}px;width:18px;height:18px;border-radius:50%;background:${isMinistrante?'#0f0f0f':'var(--muted)'};transition:left .3s;"></div>
        </div>
      </div>`:'';
    return `<div class="person-card" onclick="openTreinadorDetail('${t}')" style="position:relative;">
      <div style="position:absolute;top:14px;right:14px;display:flex;flex-direction:column;align-items:center;line-height:1;">
        <span style="font-size:36px;font-weight:800;color:var(--accent);line-height:1;">${td.length}</span>
        <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">cliente${td.length!==1?'s':''}</span>
      </div>
      <div class="pc-avatar" style="background:${bg};color:${cor};border:2px solid ${cor};">${ini}</div>
      <div class="pc-name" style="font-size:15px;">${t.toUpperCase()}</div>
      <div class="pc-stats" style="margin-top:10px;">
        <div><div class="pc-stat-label" style="font-size:13px;">Potencial</div><div class="pc-stat-val" style="font-size:16px;color:var(--blue);">${formatVal(total)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Faturado</div><div class="pc-stat-val" style="font-size:16px;color:${col.text};">${formatVal(pago)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">Em aberto</div><div class="pc-stat-val" style="font-size:16px;color:var(--amber);">${formatVal(aberto)}</div></div>
        <div><div class="pc-stat-label" style="font-size:13px;">% Meta</div><div class="pc-stat-val" style="font-size:16px;color:${col.text};">${pct}%</div></div>
      </div>
      <div class="pc-bar" style="margin-top:20px;"><div class="pc-bar-fill" style="width:${Math.min(Math.round((pago/(META*1.5))*100),100)}%;background:${col.bar};box-shadow:0 0 15px 10px ${hexToRgba(col.bar,.35)},0 0 10px 10px ${hexToRgba(col.bar,.45)};"></div></div>
      ${ministranteToggle}
    </div>`;
  }).join('');
  // Ranking Faturado injetado dentro do grid como último card
  const _medalsT=['gold','silver','bronze'];
  const _rankTFat=[...allTrainers].map(t=>({
    nome:t,
    total:data.filter(d=>d&&d.cliente&&d.treinador===t).reduce((a,d)=>a+d.valor,0),
    pago:data.filter(d=>d&&d.cliente&&d.treinador===t&&d.status==='pago').reduce((a,d)=>a+d.valor,0),
    clientes:data.filter(d=>d&&d.cliente&&d.treinador===t).length,
    pct:Math.round((data.filter(d=>d&&d.cliente&&d.treinador===t&&d.status==='pago').reduce((a,d)=>a+d.valor,0)/META)*100)
  })).sort((a,b)=>b.pago-a.pago);
  const _rankTHtml=_rankTFat.length===0
    ?'<div style="font-size:13px;color:var(--muted);padding:8px 0;">Nenhum dado.</div>'
    :_rankTFat.map((t,i)=>{
      const _col=getCol(t.pct);
      return `<div class="rank-row" onclick="openTreinadorDetail('${t.nome}')" style="cursor:pointer;padding:12px 0;" title="Ver detalhe de ${t.nome}">
        <div class="rank-num ${_medalsT[i]||''}" style="font-size:28px;width:36px;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
        <div class="rank-info">
          <div class="rank-name" style="font-size:15px;font-weight:700;">${t.nome.toUpperCase()}</div>
          <div class="rank-detail" style="font-size:13px;margin-top:3px;">${t.clientes} cliente${t.clientes!==1?'s':''} · ${t.pct}% da meta</div>
        </div>
        <div class="rank-val" style="font-size:16px;font-weight:700;color:${_col.text};">${formatVal(t.pago)}</div>
      </div>`;
    }).join('');
  const _totalPagoT=data.filter(d=>d&&d.cliente&&d.status==='pago').reduce((a,d)=>a+d.valor,0);
  const _pctGeralT=Math.round((_totalPagoT/META)*100);
  const _colGeralT=getCol(_pctGeralT);
  var rankPanelT = document.getElementById('treinadorRankingPanel');
  var rankBodyT  = document.getElementById('treinadorRankingBody');
  if(rankPanelT && rankBodyT){
    var rankHeaderT = rankPanelT.querySelector('.spanel-title');
    if(rankHeaderT) rankHeaderT.innerHTML = `Ranking — Faturado<br><span style="font-size:16px;font-weight:700;color:${_colGeralT.text};">${formatVal(_totalPagoT)}</span>`;
    rankBodyT.innerHTML = _rankTHtml;
    rankPanelT.style.cursor = 'default';
    rankPanelT.onclick = null;
  }
}
function openTreinadorDetail(t){window._treinadorAtivo=t;_renderTreinadorDetail(t);}
function _renderTreinadorDetail(t){
  const tdA=data.filter(d=>d&&d.cliente&&d.treinador===t).sort((a,b)=>a.cliente.localeCompare(b.cliente,'pt-BR'));
  const td=activeTreinadorStatus===null?tdA:activeTreinadorStatus==='entrada'?tdA.filter(d=>d.entrada>0):tdA.filter(d=>d.status===activeTreinadorStatus);

  // Métricas
  const total=tdA.reduce((a,d)=>a+d.valor,0);
  const pago=tdA.filter(d=>d.status==='pago').reduce((a,d)=>a+d.valor,0);
  const aberto=tdA.filter(d=>d.status==='aberto').reduce((a,d)=>a+d.valor,0);
  const entrada=tdA.reduce((a,d)=>a+d.entrada,0);
  const nTodos=tdA.length;
  const nPago=tdA.filter(d=>d.status==='pago').length;
  const nAberto=tdA.filter(d=>d.status==='aberto').length;
  const nEntrada=tdA.filter(d=>d.entrada>0).length;

  const fl=activeTreinadorStatus?' · Filtro: '+activeTreinadorStatus.toUpperCase():'';
  const pct=META>0?Math.round((pago/META)*100):0;
  const _colTDetail=getCol(pct);
  const _pctBar=Math.min(pct,100);

  document.getElementById('treinadorDetailName').textContent=t.toUpperCase()+' — '+tdA.length+' cliente'+(tdA.length!==1?'s':'');

  // KPIs + barra de progresso (igual ao consultor)
  document.getElementById('treinadorDetailSub').innerHTML=
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    +'<div style="flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;">'
    +'<div style="height:4px;width:'+_pctBar+'%;background:'+_colTDetail.bar+';border-radius:2px;transition:width .4s;"></div>'
    +'</div>'
    +'<span style="font-size:11px;font-weight:600;color:'+_colTDetail.text+';font-family:\'DM Mono\',monospace;min-width:36px;text-align:right;">'+pct+'%</span>'
    +'<span style="font-size:10px;color:var(--muted);">da meta</span>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">'
    +'<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Potencial</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--text);font-family:\'DM Mono\',monospace;">'+formatVal(total)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nTodos+' cliente'+(nTodos!==1?'s':'')+'</div>'
    +'</div>'
    +'<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Faturado</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--green);font-family:\'DM Mono\',monospace;">'+formatVal(pago)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nPago+' pago'+(nPago!==1?'s':'')+'</div>'
    +'</div>'
    +'<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Em aberto</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--amber);font-family:\'DM Mono\',monospace;">'+formatVal(aberto)+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nAberto+' cliente'+(nAberto!==1?'s':'')+'</div>'
    +'</div>'
    +'<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;">'
    +'<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;">Entradas</div>'
    +'<div style="font-size:13px;font-weight:700;color:var(--blue);font-family:\'DM Mono\',monospace;">'+(entrada>0?formatVal(entrada):'—')+'</div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:1px;">'+nEntrada+' cliente'+(nEntrada!==1?'s':'')+'</div>'
    +'</div>'
    +'</div>'
    +'<span style="font-size:12px;color:var(--muted);">Potencial: '+formatVal(total)+' · Faturado: <span style="color:'+_colTDetail.text+';font-weight:700;">'+formatVal(pago)+'</span>'+(entrada>0?' · Entradas: '+formatVal(entrada):'')+fl+'</span>';

  // Contadores nos botões de filtro
  const _ftMap={ftAll:nTodos,ftAberto:nAberto,ftPago:nPago,ftEntrada:nEntrada};
  const _ftLabel={ftAll:'Todos',ftAberto:'Aberto',ftPago:'Pago',ftEntrada:'Entrada'};
  Object.keys(_ftMap).forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.textContent=_ftLabel[id]+(_ftMap[id]>0?' ('+_ftMap[id]+')':'');
  });
  // Checkbox ministrante no detail
  var ministrante=_getTurmaMinistante();
  var isMinistrante=ministrante===t;
  var sess=_getSessao?_getSessao():null;
  var isAdm=!sess||sess.perfil==='adm';
  var boxEl=document.getElementById('treinadorMinistranteBox');
  if(boxEl&&isAdm){
    var lblCor=isMinistrante?'var(--accent)':'var(--muted)';
    var brdCor=isMinistrante?'rgba(200,240,90,.5)':'var(--border2)';
    var bgCor=isMinistrante?'rgba(200,240,90,.08)':'transparent';
    var chk=isMinistrante?'checked':'';
    boxEl.innerHTML='<label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;padding:6px 16px;border-radius:20px;border:1px solid '+brdCor+';background:'+bgCor+';transition:all .2s;">'
      +'<input type="checkbox" '+chk+' onchange="_setMinistrante(\"'+t+'\",this.checked)" style="cursor:pointer;accent-color:var(--accent);width:14px;height:14px;" />'
      +'<span style="font-size:12px;font-weight:700;color:'+lblCor+';text-transform:uppercase;letter-spacing:.06em;">Ministrante</span>'
      +'</label>';
  } else if(boxEl){ boxEl.innerHTML=''; }
  var _twrap=document.getElementById('treinadorLayoutWrap');
  if(_twrap) _twrap.style.display='none';
  document.getElementById('treinadorDetail').style.display='block';
  const sl=s=>s==='pago'?'PAGO':s==='negociacao'?'NEGOCIAÇÃO':s==='desistiu'?'DESISTIU':s==='estorno'?'ESTORNO':s==='-'?'—':'ABERTO';
  document.getElementById('treinadorDetailTable').innerHTML=td.length===0
    ?'<tr class="empty-row"><td colspan="8">Nenhum cliente para este filtro.</td></tr>'
    :td.map(d=>{const ri=data.indexOf(d),ip=d.status==='pago',hi=!!(d.info&&d.info.trim());return `<tr style="border-left:${ip?'2px solid #39ff14':'2px solid transparent'};">
      <td style="font-weight:600;text-transform:uppercase;${ip?'color:#39ff14;':''}"><span style="display:inline-flex;align-items:center;gap:4px;">${d.cliente}<button class="info-btn${hi?' has-info':''}" onclick="openClientInfo(${ri})">i</button></span></td>
      <td style="text-align:center;">${d.treinamento||'—'}</td>
      <td style="color:var(--muted);">${d.consultor.toUpperCase()}</td>
      <td style="${ip?'font-weight:600;':''}">${formatVal(d.valor)}</td>
      <td style="text-align:center;"><span style="font-size:10px;font-weight:500;padding:2px 8px;border-radius:4px;" class="badge badge-${d.status}">${sl(d.status)}</span></td>
      <td style="text-align:center;" class="${d.entrada>0?'entrada-green':''}">${d.entrada>0?formatVal(d.entrada):'—'}</td>
      <td style="text-align:center;"><div style="display:inline-flex;gap:5px;"><button class="edit-btn" onclick="openModal(${ri})" title="Editar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button><button class="edit-btn del" onclick="openConfirm(${ri})" title="Excluir"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></td>
    </tr>`;}).join('');
}
function closeTreinadorDetail(){
  window._treinadorAtivo=null;activeTreinadorStatus=null;
  ['ftAll','ftAberto','ftPago','ftEntrada'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('active');});
  const el=document.getElementById('ftAll');if(el)el.classList.add('active');
  document.getElementById('treinadorDetail').style.display='none';
  var _twrapClose=document.getElementById('treinadorLayoutWrap');
  if(_twrapClose) _twrapClose.style.display='grid';
  renderTreinador();
}

