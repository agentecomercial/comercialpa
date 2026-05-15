/* ═══════════════════════════════════════════
   ABA PRODUTO
═══════════════════════════════════════════ */
var _prodSortCol='total',_prodSortDir=-1;
function _setProdSort(col){
  if(_prodSortCol===col){_prodSortDir*=-1;}else{_prodSortCol=col;_prodSortDir=-1;}
  renderProduto();
}

function renderProduto(){
  // Controle de acesso: consultor só vê Clientes Pagos e Clientes Entrada Realizada
  var _sessP=_getSessao?_getSessao():null;
  var _perfilP=_sessP?_sessP.perfil:'adm';
  var _vinculoP=_sessP?(_sessP.vinculo||''). toUpperCase():'';
  var _isConsultorP=_perfilP==='consultor';
  // Painel Cards Proposta — oculto para consultor
  var _propSection=document.querySelector('#tab-produto > div:nth-child(4)');
  if(_propSection) _propSection.style.display='';
  // P2: aviso de orientação mobile para consultor
  var _rotWarn=document.getElementById('rotateWarning');
  if(_rotWarn){
    var _isMobile=_isConsultorP&&window.innerWidth<768;
    _rotWarn.style.display=_isMobile?'flex':'none';
    // Atualizar ao virar o celular
    if(!window._rotateListenerAdded){
      window._rotateListenerAdded=true;
      window.addEventListener('resize',function(){
        var _s=_getSessao?_getSessao():null;
        var _p=_s?_s.perfil:'adm';
        var rw=document.getElementById('rotateWarning');
        if(rw) rw.style.display=(_p==='consultor'&&window.innerWidth<768)?'flex':'none';
      });
    }
  }
  // Para consultor: filtrar tabela Clientes Pagos apenas pelo próprio vinculo
  _renderProdutoPropCards();
  _renderProdutoCruzadaEntrada();
  var _sessRP=_getSessao?_getSessao():null;
  var _perfilRP=_sessRP?_sessRP.perfil:'adm';
  var _vinculoRP=_sessRP?(_sessRP.vinculo||''). toUpperCase():'';
  var _isConsRP=_perfilRP==='consultor';
  // Consultor só vê os próprios clientes pagos
  const pagos=_isConsRP
    ?data.filter(d=>d&&d.cliente&&d.status==='pago'&&(d.consultor||''). toUpperCase()===_vinculoRP)
    :data.filter(d=>d&&d.cliente&&d.status==='pago');
  // Produtos: SEMPRE mostra TODOS os 15 treinamentos oficiais da lista APP_CONST.
  // Mesmo sem cliente pago, a coluna do treinamento aparece (com '—').
  const produtos = (typeof allTreinamentos!=='undefined' && Array.isArray(allTreinamentos))
    ? allTreinamentos.slice()
    : [];
  const consultores=[...new Set(pagos.map(d=>d.consultor))].sort();
  const el=document.getElementById('produtoCruzadaTable');
  if(!el)return;
  if(!pagos.length){el.innerHTML='<tr class="empty-row"><td colspan="2">Nenhum cliente pago cadastrado.</td></tr>';return;}

  function _sortArrow(col){
    if(_prodSortCol!==col) return '<span style="color:var(--border2);font-size:10px;margin-left:3px;">↕</span>';
    return _prodSortDir===-1
      ?'<span style="color:var(--accent);font-size:10px;margin-left:3px;">↓</span>'
      :'<span style="color:var(--accent);font-size:10px;margin-left:3px;">↑</span>';
  }

  let html='<thead><tr><th style="text-align:left;min-width:120px;cursor:pointer;" onclick="_setProdSort(\'consultor\')">Consultor '+_sortArrow('consultor')+'</th>';
  produtos.forEach(p=>{
    var key='prod_'+p;
    html+=`<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdSort('${key}')">${p} ${_sortArrow(key)}</th>`;
  });
  html+=`<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdSort('qtd')">Total trein. ${_sortArrow('qtd')}</th>`;
  html+=`<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdSort('total')">Total pago ${_sortArrow('total')}</th></tr></thead><tbody>`;

  const totaisProd={},totaisQtd={};
  produtos.forEach(p=>{totaisProd[p]=0;totaisQtd[p]=0;});
  let totalGeral=0,totalQtdGeral=0;

  // Calcular dados por consultor para ordenação
  var linhas=consultores.map(c=>{
    const linhaTotal=pagos.filter(d=>d.consultor===c).reduce((a,d)=>a+d.valor,0);
    const linhaQtd=pagos.filter(d=>d.consultor===c).length;
    var prodVals={};
    produtos.forEach(p=>{
      const rows=pagos.filter(d=>d.consultor===c&&(d.treinamento||'—')===p);
      prodVals['prod_'+p]=rows.reduce((a,d)=>a+d.valor,0);
      prodVals['prod_'+p+'_qtd']=rows.length;
    });
    return {c,linhaTotal,linhaQtd,prodVals};
  }).filter(l=>l.linhaTotal>0);

  // Ordenar linhas
  linhas.sort(function(a,b){
    var av,bv;
    if(_prodSortCol==='consultor'){av=a.c;bv=b.c;return av.localeCompare(bv,'pt-BR')*_prodSortDir;}
    if(_prodSortCol==='total'){av=a.linhaTotal;bv=b.linhaTotal;}
    else if(_prodSortCol==='qtd'){av=a.linhaQtd;bv=b.linhaQtd;}
    else{av=a.prodVals[_prodSortCol]||0;bv=b.prodVals[_prodSortCol]||0;}
    return(av-bv)*_prodSortDir;
  });

  linhas.forEach(({c,linhaTotal,linhaQtd,prodVals})=>{
    const col=getCol(Math.round((linhaTotal/META)*100));
    html+=`<tr><td style="font-weight:600;text-align:left;text-transform:uppercase;">${c}</td>`;
    produtos.forEach(p=>{
      const v=prodVals['prod_'+p]||0;
      const qtd=prodVals['prod_'+p+'_qtd']||0;
      totaisProd[p]+=v;totaisQtd[p]+=qtd;
      if(qtd>0){
        const cp=getCol(Math.round((v/(META/allConsultors.length||1))*100));
        html+=`<td style="text-align:center;cursor:pointer;" onclick="abrirProdutoClientes('${c}','${p}')" title="Ver clientes">
          <span style="font-size:13px;font-weight:700;color:${cp.text};">${qtd}</span>
          <br><span style="font-size:11px;color:var(--muted);white-space:nowrap;">${formatVal(v)}</span>
        </td>`;
      } else {
        html+=`<td style="text-align:center;color:var(--border2);">—</td>`;
      }
    });
    totalGeral+=linhaTotal;totalQtdGeral+=linhaQtd;
    html+=`<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--accent);cursor:pointer;" onclick="abrirProdutoClientes('${c}',null)">${linhaQtd}</td>`;
    html+=`<td style="text-align:center;font-weight:700;white-space:nowrap;color:${col.text};">${formatVal(linhaTotal)}</td></tr>`;
  });

  // Linha totais
  html+='<tr style="border-top:2px solid var(--border2);background:var(--surface2);"><td style="font-weight:700;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);">Total</td>';
  produtos.forEach(p=>{
    html+=totaisQtd[p]>0
      ?`<td style="text-align:center;font-weight:700;white-space:nowrap;cursor:pointer;" onclick="abrirTotalProduto('${p}')">
          <span style="font-size:12px;color:var(--accent);">${totaisQtd[p]}</span>
          <br><span style="font-size:11px;color:var(--muted);">${formatVal(totaisProd[p])}</span>
        </td>`
      :`<td style="text-align:center;color:var(--border2);">—</td>`;
  });
  const colTotal=getCol(Math.round((totalGeral/META)*100));
  html+=`<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--accent);cursor:pointer;" onclick="abrirTotalProduto(null)">${totalQtdGeral}</td>`;
  html+=`<td style="text-align:center;font-weight:700;white-space:nowrap;color:${colTotal.text};">${formatVal(totalGeral)}</td></tr>`;
  html+='</tbody>';
  el.innerHTML=html;
}

// ── Tabela Consultor × Produto — Entrada Realizada ──
let _prodEntSortCol='consultor', _prodEntSortDir=1;

function _setProdEntSort(col){
  if(_prodEntSortCol===col){_prodEntSortDir*=-1;}else{_prodEntSortCol=col;_prodEntSortDir=-1;}
  _renderProdutoCruzadaEntrada();
}

function _renderProdutoCruzadaEntrada(){
  var panel=document.getElementById('produtoEntradaPanel');
  var el=document.getElementById('produtoCruzadaEntradaTable');
  if(!panel||!el) return;

  // Apenas clientes com entrada > 0
  var _sessRE=_getSessao?_getSessao():null;
  var _perfilRE=_sessRE?_sessRE.perfil:'adm';
  var _vinculoRE=_sessRE?(_sessRE.vinculo||''). toUpperCase():'';
  var _isConsRE=_perfilRE==='consultor';
  var comEntrada=_isConsRE
    ?data.filter(function(d){return d&&d.cliente&&d.entrada&&d.entrada>0&&(d.consultor||'').toUpperCase()===_vinculoRE;})
    :data.filter(function(d){return d&&d.cliente&&d.entrada&&d.entrada>0;});

  // Ocultar painel inteiro se não houver entradas
  if(!comEntrada.length){panel.style.display='none';return;}
  panel.style.display='';

  // Produtos: SEMPRE mostra TODOS os 15 treinamentos oficiais da lista APP_CONST.
  var produtos=(typeof allTreinamentos!=='undefined' && Array.isArray(allTreinamentos))
    ? allTreinamentos.slice()
    : [];
  var consultores=[...new Set(comEntrada.map(function(d){return d.consultor;}))].sort();

  function _sortArrowE(col){
    if(_prodEntSortCol!==col) return '<span style="color:var(--border2);font-size:10px;margin-left:3px;">↕</span>';
    return _prodEntSortDir===-1
      ?'<span style="color:var(--accent);font-size:10px;margin-left:3px;">↓</span>'
      :'<span style="color:var(--accent);font-size:10px;margin-left:3px;">↑</span>';
  }

  var html='<thead><tr><th style="text-align:left;min-width:120px;cursor:pointer;" onclick="_setProdEntSort(\'consultor\')">Consultor '+_sortArrowE('consultor')+'</th>';
  produtos.forEach(function(p){
    var key='prod_'+p;
    html+='<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdEntSort(\''+key+'\')">'+p+' '+_sortArrowE(key)+'</th>';
  });
  html+='<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdEntSort(\'qtd\')">Total clientes '+_sortArrowE('qtd')+'</th>';
  html+='<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdEntSort(\'total\')">Total entrada '+_sortArrowE('total')+'</th></tr></thead><tbody>';

  var totaisProd={},totaisQtd={};
  produtos.forEach(function(p){totaisProd[p]=0;totaisQtd[p]=0;});
  var totalGeral=0,totalQtdGeral=0;

  // Calcular dados por consultor
  var linhas=consultores.map(function(c){
    var linhaTotal=comEntrada.filter(function(d){return d.consultor===c;}).reduce(function(a,d){return a+d.entrada;},0);
    var linhaQtd=comEntrada.filter(function(d){return d.consultor===c;}).length;
    var prodVals={};
    produtos.forEach(function(p){
      var rows=comEntrada.filter(function(d){return d.consultor===c&&(d.treinamento||'—')===p;});
      prodVals['prod_'+p]=rows.reduce(function(a,d){return a+d.entrada;},0);
      prodVals['prod_'+p+'_qtd']=rows.length;
    });
    return {c:c,linhaTotal:linhaTotal,linhaQtd:linhaQtd,prodVals:prodVals};
  }).filter(function(l){return l.linhaQtd>0;});

  // Ordenar linhas
  linhas.sort(function(a,b){
    var av,bv;
    if(_prodEntSortCol==='consultor'){return a.c.localeCompare(b.c,'pt-BR')*_prodEntSortDir;}
    if(_prodEntSortCol==='total'){av=a.linhaTotal;bv=b.linhaTotal;}
    else if(_prodEntSortCol==='qtd'){av=a.linhaQtd;bv=b.linhaQtd;}
    else{av=a.prodVals[_prodEntSortCol]||0;bv=b.prodVals[_prodEntSortCol]||0;}
    return(av-bv)*_prodEntSortDir;
  });

  linhas.forEach(function(row){
    var c=row.c,linhaTotal=row.linhaTotal,linhaQtd=row.linhaQtd,prodVals=row.prodVals;
    html+='<tr><td style="font-weight:600;text-align:left;text-transform:uppercase;">'+c+'</td>';
    produtos.forEach(function(p){
      var v=prodVals['prod_'+p]||0;
      var qtd=prodVals['prod_'+p+'_qtd']||0;
      totaisProd[p]+=v;totaisQtd[p]+=qtd;
      if(qtd>0){
        html+='<td style="text-align:center;cursor:pointer;" onclick="abrirEntradaClientes(\''+c+'\',\''+p+'\')" title="Ver clientes">'
          +'<span style="font-size:13px;font-weight:700;color:var(--blue);">'+qtd+'</span>'
          +'<br><span style="font-size:11px;color:var(--muted);white-space:nowrap;">'+formatVal(v)+'</span>'
          +'</td>';
      } else {
        html+='<td style="text-align:center;color:var(--border2);">—</td>';
      }
    });
    totalGeral+=linhaTotal;totalQtdGeral+=linhaQtd;
    html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--blue);cursor:pointer;" onclick="abrirEntradaClientes(\''+c+'\',null)">'+linhaQtd+'</td>';
    html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--blue);">'+formatVal(linhaTotal)+'</td></tr>';
  });

  // Linha totais
  html+='<tr style="border-top:2px solid var(--border2);background:var(--surface2);">'
    +'<td style="font-weight:700;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);">Total</td>';
  produtos.forEach(function(p){
    html+=totaisQtd[p]>0
      ?'<td style="text-align:center;font-weight:700;white-space:nowrap;cursor:pointer;" onclick="abrirTotalEntrada(\''+p+'\')">'
        +'<span style="font-size:12px;color:var(--blue);">'+totaisQtd[p]+'</span>'
        +'<br><span style="font-size:11px;color:var(--muted);">'+formatVal(totaisProd[p])+'</span></td>'
      :'<td style="text-align:center;color:var(--border2);">—</td>';
  });
  html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--blue);cursor:pointer;" onclick="abrirTotalEntrada(null)">'+totalQtdGeral+'</td>';
  html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--blue);">'+formatVal(totalGeral)+'</td></tr>';
  html+='</tbody>';
  el.innerHTML=html;
}

// Estado de ordenação do modal de clientes
let _cmLista=[], _cmSortCol='valor', _cmSortDir=-1;

function _cmRenderRows(){
  const sorted=[..._cmLista].sort((a,b)=>{
    let av=a[_cmSortCol],bv=b[_cmSortCol];
    if(typeof av==='number') return (av-bv)*_cmSortDir;
    return String(av||'').localeCompare(String(bv||''),'pt-BR')*_cmSortDir;
  });
  ['cliente','treinamento','treinador','consultor','valor','entrada'].forEach(c=>{
    const th=document.getElementById('cmth-'+c);
    if(th) th.className='sortable'+(_cmSortCol===c?(_cmSortDir===1?' sort-asc':' sort-desc'):'');
  });
  document.getElementById('clientesModalTable').innerHTML=sorted.length===0
    ?'<tr class="empty-row"><td colspan="6">Nenhum cliente.</td></tr>'
    :sorted.map(d=>{
      const idx=data.indexOf(d);
      const temInfo=!!(d.info&&d.info.trim());
      var _sessM=_getSessao?_getSessao():null;
      var _perfilM=_sessM?_sessM.perfil:'adm';
      const iBtn=temInfo
        ?`<button class="info-btn has-info" onclick="event.stopPropagation();openClientInfo(${idx})" title="${d.info.replace(/"/g,'&quot;')}">i</button>`
        :(_perfilM!=='consultor'?`<button class="info-btn" onclick="event.stopPropagation();openClientInfo(${idx})">i</button>`:'')
      return `<tr style="border-left:2px solid var(--pago);">
        <td style="font-weight:600;text-transform:uppercase;text-align:left;color:var(--pago);white-space:nowrap;"><span style="display:inline-flex;align-items:center;gap:6px;">${d.cliente}${iBtn}<span data-presenca-ri="${idx}">${window._presencaBadgeHtml?window._presencaBadgeHtml(idx):''}</span></span></td>
        <td style="text-align:center;font-size:12px;white-space:nowrap;">${d.treinamentos&&d.treinamentos.length?d.treinamentos.map(t=>t.cod).join(' · '):'—'}</td>
        <td style="text-align:center;font-size:12px;color:var(--muted);white-space:nowrap;">${(d.treinamentos&&d.treinamentos.some(t=>t.cod==='CI'))?d.treinador:'-'}</td>
        <td style="text-align:center;font-size:12px;color:var(--muted);white-space:nowrap;">${d.consultor.toUpperCase()}</td>
        <td style="text-align:right;font-weight:600;white-space:nowrap;">${formatVal(d.valor)}</td>
        <td style="text-align:right;font-size:12px;white-space:nowrap;color:${d.entrada>0?'var(--accent)':'var(--muted)'};">${d.entrada>0?formatVal(d.entrada):'—'}</td>
      </tr>`;
    }).join('');
}

function _cmSort(col){
  if(_cmSortCol===col) _cmSortDir*=-1; else{_cmSortCol=col;_cmSortDir=1;}
  _cmRenderRows();
}

function _abrirClientesModalComLista(lista,titulo,sub){
  _cmLista=lista; _cmSortCol='valor'; _cmSortDir=-1;
  document.getElementById('clientesModalTitulo').textContent=titulo;
  document.getElementById('clientesModalSub').innerHTML=sub;
  _cmRenderRows();
  document.getElementById('clientesModalOverlay').classList.add('open');
}

function abrirTotalProduto(produto){
  const lista=data.filter(d=>d&&d.cliente&&d.status==='pago'&&(produto===null||produto==='null'||(d.treinamento||'—')===produto));
  const total=lista.reduce((a,d)=>a+d.valor,0);
  const titulo=produto&&produto!=='null'?'Total · '+produto:'Total · Todos os produtos';
  const col=getCol(Math.round((total/META)*100));
  const sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' pagos · Total: <span style="color:'+col.text+';font-weight:700;">'+formatVal(total)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub);
}

function abrirProdutoClientes(consultor,produto){
  const lista=data.filter(d=>d&&d.cliente&&d.status==='pago'&&d.consultor===consultor&&(produto===null||produto==='null'||(d.treinamento||'—')===produto));
  const total=lista.reduce((a,d)=>a+d.valor,0);
  const titulo=produto&&produto!=='null'?consultor.toUpperCase()+' · '+produto:consultor.toUpperCase()+' · Todos os produtos';
  const sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' pagos · Total: <span style="color:var(--accent);font-weight:700;">'+formatVal(total)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub);
}

function abrirEntradaClientes(consultor,produto){
  var lista=data.filter(function(d){
    return d.entrada&&d.entrada>0
      &&d.consultor===consultor
      &&(produto===null||produto==='null'||(d.treinamento||'—')===produto);
  });
  var totalEnt=lista.reduce(function(a,d){return a+d.entrada;},0);
  var titulo=produto&&produto!=='null'
    ?consultor.toUpperCase()+' · '+produto+' — Entrada'
    :consultor.toUpperCase()+' · Todos os produtos — Entrada';
  var sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' com entrada · Total: <span style="color:var(--blue);font-weight:700;">'+formatVal(totalEnt)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub);
}

function abrirTotalEntrada(produto){
  var lista=data.filter(function(d){
    return d.entrada&&d.entrada>0
      &&(produto===null||produto==='null'||(d.treinamento||'—')===produto);
  });
  var totalEnt=lista.reduce(function(a,d){return a+d.entrada;},0);
  var titulo=produto&&produto!=='null'?'Total · '+produto+' — Entrada':'Total · Todos os produtos — Entrada';
  var sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' com entrada · Total: <span style="color:var(--blue);font-weight:700;">'+formatVal(totalEnt)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub);
}

