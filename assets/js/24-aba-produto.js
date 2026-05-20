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
  // Achata d.treinamentos[] → 1 item por sub-compra. Cliente com 3 produtos
  // gera 3 itens flat (cada um conta no cruzamento Consultor×Produto).
  // Filtro de "pago" usa STATUS EFETIVO do cliente original (regra de negócio):
  // cliente com 2+ subs e algum aberto = 'aberto', mesmo que um sub esteja pago.
  var _flatRP = (typeof _achatarItens==='function') ? _achatarItens(data) : [];
  const pagos=_flatRP.filter(function(d){
    if(!d || !d.cliente) return false;
    if(_isConsRP && (String(d.consultor||'').toUpperCase().trim() !== _vinculoRP)) return false;
    var dOrig = data[d._ri];
    if(!dOrig) return false;
    return (typeof _statusEfetivoCliente==='function')
      ? _statusEfetivoCliente(dOrig)==='pago'
      : (d.status==='pago');
  });
  // Produtos: SEMPRE mostra TODOS os 15 treinamentos oficiais da lista APP_CONST,
  // FILTRADO pelo usuário via dropdown "🎛 COLUNAS" (Set vazio = mostra todos).
  // Ordem respeitada via _colFilterGetOrdem (drag-drop persistido em localStorage).
  var _produtosTodos = (typeof window._colFilterGetOrdem === 'function')
    ? window._colFilterGetOrdem('pagos')
    : ((typeof allTreinamentos!=='undefined' && Array.isArray(allTreinamentos)) ? allTreinamentos.slice() : []);
  const produtos = _produtosTodos.filter(function(p){
    return (typeof window._colFilterIsVisible !== 'function') || window._colFilterIsVisible('pagos', p);
  });
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
    html+=`<tr><td style="font-weight:600;text-align:left;text-transform:uppercase;white-space:nowrap;">${c}</td>`;
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

// ── Tabela Consultor × Produto — Clientes Entrada ──
// Espelha o card "Clientes Pagos" em comportamento (ordenação, filtros, robustez).
let _prodEntSortCol='total', _prodEntSortDir=-1;

function _setProdEntSort(col){
  if(_prodEntSortCol===col){_prodEntSortDir*=-1;}else{_prodEntSortCol=col;_prodEntSortDir=-1;}
  _renderProdutoCruzadaEntrada();
}

function _renderProdutoCruzadaEntrada(){
  var panel=document.getElementById('produtoEntradaPanel');
  var el=document.getElementById('produtoCruzadaEntradaTable');
  if(!panel||!el) return;

  var _sessRE=_getSessao?_getSessao():null;
  var _perfilRE=_sessRE?_sessRE.perfil:'adm';
  var _vinculoRE=_sessRE?(_sessRE.vinculo||''). toUpperCase().trim():'';
  var _isConsRE=_perfilRE==='consultor';

  // Achata d.treinamentos[] → 1 item por sub-compra. Filtra entrada > 0 com case robusto.
  // EXCLUI subs já com status='pago': a entrada deles é histórico (sinal já liquidado
  // pelo pagamento total) — não faz sentido aparecer no card "Clientes Entrada", que
  // mostra negociações com entrada PENDENTE de quitação.
  var _flatRE = (typeof _achatarItens==='function') ? _achatarItens(data) : [];
  var comEntrada=_flatRE.filter(function(d){
    if(!d || !d.cliente) return false;
    if(!d.entrada || d.entrada<=0) return false;
    if(d.status === 'pago') return false;
    if(_isConsRE && String(d.consultor||'').toUpperCase().trim() !== _vinculoRE) return false;
    return true;
  });

  // Produtos: SEMPRE mostra TODOS os 15 treinamentos oficiais, FILTRADO pelo dropdown "🎛 COLUNAS"
  // Ordem respeitada via _colFilterGetOrdem (drag-drop persistido em localStorage).
  var _produtosTodosE = (typeof window._colFilterGetOrdem === 'function')
    ? window._colFilterGetOrdem('entrada')
    : ((typeof allTreinamentos!=='undefined' && Array.isArray(allTreinamentos)) ? allTreinamentos.slice() : []);
  var produtos = _produtosTodosE.filter(function(p){
    return (typeof window._colFilterIsVisible !== 'function') || window._colFilterIsVisible('entrada', p);
  });

  // Painel sempre visível — mostra mensagem amigável se vazio (colspan cobre todas as colunas).
  panel.style.display='';
  if(!comEntrada.length){
    var _colspanVazio = produtos.length + 3; // Consultor + N produtos + Total qtd + Total valor
    el.innerHTML='<tr class="empty-row"><td colspan="'+_colspanVazio+'" style="text-align:center;padding:20px;color:var(--muted);">Nenhum cliente com entrada registrada nesta turma.</td></tr>';
    return;
  }

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
  html+='<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdEntSort(\'qtd\')">Total entradas '+_sortArrowE('qtd')+'</th>';
  html+='<th style="text-align:center;white-space:nowrap;cursor:pointer;" onclick="_setProdEntSort(\'total\')">Total recebido '+_sortArrowE('total')+'</th></tr></thead><tbody>';

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
  }).filter(function(l){return l.linhaTotal>0;});

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
    var col=getCol(Math.round((linhaTotal/META)*100));
    html+='<tr><td style="font-weight:600;text-align:left;text-transform:uppercase;white-space:nowrap;">'+c+'</td>';
    produtos.forEach(function(p){
      var v=prodVals['prod_'+p]||0;
      var qtd=prodVals['prod_'+p+'_qtd']||0;
      totaisProd[p]+=v;totaisQtd[p]+=qtd;
      if(qtd>0){
        var cp=getCol(Math.round((v/(META/(allConsultors&&allConsultors.length||1)))*100));
        html+='<td style="text-align:center;cursor:pointer;" onclick="abrirEntradaClientes(\''+c+'\',\''+p+'\')" title="Ver clientes">'
          +'<span style="font-size:13px;font-weight:700;color:'+cp.text+';">'+qtd+'</span>'
          +'<br><span style="font-size:11px;color:var(--muted);white-space:nowrap;">'+formatVal(v)+'</span>'
          +'</td>';
      } else {
        html+='<td style="text-align:center;color:var(--border2);">—</td>';
      }
    });
    totalGeral+=linhaTotal;totalQtdGeral+=linhaQtd;
    html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--accent);cursor:pointer;" onclick="abrirEntradaClientes(\''+c+'\',null)">'+linhaQtd+'</td>';
    html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:'+col.text+';">'+formatVal(linhaTotal)+'</td></tr>';
  });

  // Linha totais
  html+='<tr style="border-top:2px solid var(--border2);background:var(--surface2);">'
    +'<td style="font-weight:700;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);">Total</td>';
  produtos.forEach(function(p){
    html+=totaisQtd[p]>0
      ?'<td style="text-align:center;font-weight:700;white-space:nowrap;cursor:pointer;" onclick="abrirTotalEntrada(\''+p+'\')">'
        +'<span style="font-size:12px;color:var(--accent);">'+totaisQtd[p]+'</span>'
        +'<br><span style="font-size:11px;color:var(--muted);">'+formatVal(totaisProd[p])+'</span></td>'
      :'<td style="text-align:center;color:var(--border2);">—</td>';
  });
  var colTotal=getCol(Math.round((totalGeral/META)*100));
  html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:var(--accent);cursor:pointer;" onclick="abrirTotalEntrada(null)">'+totalQtdGeral+'</td>';
  html+='<td style="text-align:center;font-weight:700;white-space:nowrap;color:'+colTotal.text+';">'+formatVal(totalGeral)+'</td></tr>';
  html+='</tbody>';
  el.innerHTML=html;
}

// Estado de ordenação do modal de clientes.
// _cmProduto: produto filtrado quando o modal é aberto (afeta o valor exibido por linha).
let _cmLista=[], _cmSortCol='valor', _cmSortDir=-1, _cmProduto=null, _cmStatusAlvo=null;

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
      // Fallback: cliente sem nome aparece como '(sem nome)' em vez de vazio
      var _nomeCli = String(d.cliente||'').trim() || '(sem nome)';
      var _consCli = String(d.consultor||'').toUpperCase().trim() || '—';
      // Quando o modal foi aberto com produto específico (ex: clicou em "IF"),
      // mostrar o valor/entrada DO SUB correspondente — não o total do cliente.
      // Quando aberto com status específico (ex: "Potencial total" = negociacao),
      // mostrar a soma apenas dos subs naquele status.
      var _valorMostrado, _entradaMostrada, _trCol;
      if(_cmProduto){
        _valorMostrado   = (typeof _valorClienteProduto==='function') ? _valorClienteProduto(d,_cmProduto,'valor')   : (d.valor||0);
        _entradaMostrada = (typeof _valorClienteProduto==='function') ? _valorClienteProduto(d,_cmProduto,'entrada') : (d.entrada||0);
        _trCol = String(_cmProduto);
      } else if(_cmStatusAlvo){
        _valorMostrado = (typeof window._valorPorStatus==='function')
          ? window._valorPorStatus(d, _cmStatusAlvo)
          : (d.status===_cmStatusAlvo ? (d.valor||0) : 0);
        _entradaMostrada = d.entrada||0;
        /* Treinamento: lista só os subs com aquele status (ex: para "Potencial total",
           se ROBSON tem [IF pago, MENT.IA negociação] → mostra só "MENT.IA"). */
        if(Array.isArray(d.treinamentos) && d.treinamentos.length){
          var _subsDoStatus = d.treinamentos.filter(function(t){
            if(!t) return false;
            var st = t.status || d.status || 'aberto';
            return st === _cmStatusAlvo;
          });
          _trCol = _subsDoStatus.length
            ? _subsDoStatus.map(function(t){return t.cod;}).join(' · ')
            : (d.treinamento||'—');
        } else {
          _trCol = d.treinamento||'—';
        }
      } else {
        _valorMostrado   = d.valor||0;
        _entradaMostrada = d.entrada||0;
        _trCol = (d.treinamentos&&d.treinamentos.length)
          ? d.treinamentos.map(function(t){return t.cod;}).join(' · ')
          : (d.treinamento||'—');
      }
      return `<tr style="border-left:2px solid var(--pago);">
        <td style="font-weight:600;text-transform:uppercase;text-align:left;color:var(--pago);white-space:nowrap;"><span style="display:inline-flex;align-items:center;gap:6px;">${_nomeCli}${iBtn}<span data-presenca-ri="${idx}">${window._presencaBadgeHtml?window._presencaBadgeHtml(idx):''}</span></span></td>
        <td style="text-align:center;font-size:12px;white-space:nowrap;">${_trCol}</td>
        <td style="text-align:center;font-size:12px;color:var(--muted);white-space:nowrap;">${(d.treinamentos&&d.treinamentos.some(t=>t.cod==='CI'))?d.treinador:'-'}</td>
        <td style="text-align:center;font-size:12px;color:var(--muted);white-space:nowrap;">${_consCli}</td>
        <td style="text-align:right;font-weight:600;white-space:nowrap;">${formatVal(_valorMostrado)}</td>
        <td style="text-align:right;font-size:12px;white-space:nowrap;color:${_entradaMostrada>0?'var(--accent)':'var(--muted)'};">${_entradaMostrada>0?formatVal(_entradaMostrada):'—'}</td>
      </tr>`;
    }).join('');
}

function _cmSort(col){
  if(_cmSortCol===col) _cmSortDir*=-1; else{_cmSortCol=col;_cmSortDir=1;}
  _cmRenderRows();
}

function _abrirClientesModalComLista(lista,titulo,sub,opts){
  _cmLista=lista; _cmSortCol='valor'; _cmSortDir=-1;
  _cmProduto = (opts && opts.produto && opts.produto!=='null') ? String(opts.produto) : null;
  _cmStatusAlvo = (opts && opts.statusAlvo) ? String(opts.statusAlvo) : null;
  document.getElementById('clientesModalTitulo').textContent=titulo;
  document.getElementById('clientesModalSub').innerHTML=sub;
  _cmRenderRows();
  document.getElementById('clientesModalOverlay').classList.add('open');
}

/* Soma o valor do cliente d especificamente para o produto pedido.
   Alinhado com _achatarItens: o primeiro sub herda d[campo] quando nenhum sub
   tem o campo preenchido (caso típico de entrada no nível-row).
   Se produto=null → retorna soma total (d[campo] do nível-row). */
function _valorClienteProduto(d, produto, campo){
  campo = campo || 'valor';
  if(!d) return 0;
  if(produto===null || produto==='null' || produto===''){
    return Number(d[campo]||0)||0;
  }
  var alvo = String(produto);
  if(Array.isArray(d.treinamentos) && d.treinamentos.length){
    var _algumSubTemCampo = d.treinamentos.some(function(t){return t && Number(t[campo]||0)>0;});
    // Para campo='entrada', o sub elegível é o primeiro NÃO pago (entrada é dinheiro ainda devido).
    // Para campo='valor', mantemos o primeiro sub do array (não há ambiguidade — valor é fixo por sub).
    var _idxFb = (campo==='entrada' && typeof _idxSubElegivelEntrada==='function')
      ? _idxSubElegivelEntrada(d)
      : 0;
    var soma = 0;
    var i;
    for(i=0; i<d.treinamentos.length; i++){
      var t = d.treinamentos[i];
      if(!t || String(t.cod||'') !== alvo) continue;
      var v = Number(t[campo]||0)||0;
      if(v===0 && i===_idxFb && !_algumSubTemCampo){
        v = Number(d[campo]||0)||0;
      }
      soma += v;
    }
    if(soma>0) return soma;
    if(String(d.treinamento||'—')===alvo) return Number(d[campo]||0)||0;
    return 0;
  }
  // só scalar legado
  if(String(d.treinamento||'—')===alvo) return Number(d[campo]||0)||0;
  return 0;
}

// Normaliza para comparação case/whitespace-insensitive (consultor pode vir em casos variados)
function _normCmp(s){ return String(s==null?'':s).toUpperCase().trim(); }

// Predicate "cliente está PAGO (regra de negócio) e possui o produto pedido".
// Status efetivo: 2+ subs com algum aberto = 'aberto' (cliente NÃO entra em pagos).
function _matchPagoProduto(d, produto){
  if(!d || !d.cliente) return false;
  if(typeof _statusEfetivoCliente==='function'){
    if(_statusEfetivoCliente(d) !== 'pago') return false;
  } else if(d.status !== 'pago') return false;
  // Cliente é pago — agora verifica se tem o produto pedido (no scalar OU em sub)
  if(typeof _clientePossuiProduto==='function'){
    return _clientePossuiProduto(d, produto);
  }
  if(produto===null||produto==='null') return true;
  return (d.treinamento||'—')===produto;
}

function abrirTotalProduto(produto){
  const lista=data.filter(d=>_matchPagoProduto(d,produto));
  const total=lista.reduce((a,d)=>a+_valorClienteProduto(d,produto,'valor'),0);
  const titulo=produto&&produto!=='null'?'Total · '+produto:'Total · Todos os produtos';
  const col=getCol(Math.round((total/META)*100));
  const sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' pagos · Total: <span style="color:'+col.text+';font-weight:700;">'+formatVal(total)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub,{produto:produto});
}

function abrirProdutoClientes(consultor,produto){
  var consN = _normCmp(consultor);
  const lista=data.filter(d=>d && _normCmp(d.consultor)===consN && _matchPagoProduto(d,produto));
  const total=lista.reduce((a,d)=>a+_valorClienteProduto(d,produto,'valor'),0);
  // Diagnóstico: se o flat (card) tem N sub-compras mas o modal achou só M registros distintos,
  // significa que algum cliente do flat não está sendo recuperado pelo data.filter.
  if(produto && produto !== 'null' && typeof _achatarItens === 'function'){
    var _flatCount = _achatarItens(data).filter(function(it){
      return it && it.status === 'pago' && _normCmp(it.consultor) === consN && String(it.treinamento||'')===String(produto);
    }).length;
    if(_flatCount > lista.length){
      console.warn('[abrirProdutoClientes] divergência:',
        consultor, '×', produto, '· card mostra', _flatCount, 'venda(s); modal achou', lista.length, 'cliente(s).');
    }
  }
  const titulo=produto&&produto!=='null'?String(consultor||'').toUpperCase()+' · '+produto:String(consultor||'').toUpperCase()+' · Todos os produtos';
  const sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' pagos · Total: <span style="color:var(--accent);font-weight:700;">'+formatVal(total)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub,{produto:produto});
}

// Predicate "tem entrada > 0 num sub do produto" — alinhado com _achatarItens:
// o PRIMEIRO sub NÃO PAGO herda d.entrada quando nenhum sub do array tem entrada própria.
function _matchEntradaProduto(d, produto){
  if(!d || !d.cliente) return false;
  if(produto===null||produto==='null'||produto===''){
    if(Number(d.entrada||0)>0) return true;
    if(Array.isArray(d.treinamentos) && d.treinamentos.some(function(t){return t && Number(t.entrada||0)>0;})) return true;
    return false;
  }
  var alvo = String(produto);
  if(Array.isArray(d.treinamentos) && d.treinamentos.length){
    var _algumSubTemEntrada = d.treinamentos.some(function(t){return t && Number(t.entrada||0)>0;});
    var _idxEl = (typeof _idxSubElegivelEntrada==='function') ? _idxSubElegivelEntrada(d) : 0;
    return d.treinamentos.some(function(t, i){
      if(!t) return false;
      if(String(t.cod||'') !== alvo) return false;
      if(Number(t.entrada||0) > 0) return true;
      // sub elegível (primeiro não pago) herda d.entrada quando nenhum sub tem entrada
      if(i===_idxEl && !_algumSubTemEntrada && Number(d.entrada||0) > 0) return true;
      return false;
    });
  }
  if(String(d.treinamento||'—')===alvo && Number(d.entrada||0)>0) return true;
  return false;
}

function abrirEntradaClientes(consultor,produto){
  var consNE = _normCmp(consultor);
  var lista=data.filter(function(d){
    return _normCmp(d&&d.consultor)===consNE && _matchEntradaProduto(d,produto);
  });
  var totalEnt=lista.reduce(function(a,d){return a+_valorClienteProduto(d,produto,'entrada');},0);
  var titulo=produto&&produto!=='null'
    ?consultor.toUpperCase()+' · '+produto+' — Entrada'
    :consultor.toUpperCase()+' · Todos os produtos — Entrada';
  var sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' com entrada · Total: <span style="color:var(--blue);font-weight:700;">'+formatVal(totalEnt)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub,{produto:produto});
}

function abrirTotalEntrada(produto){
  var lista=data.filter(function(d){ return _matchEntradaProduto(d,produto); });
  var totalEnt=lista.reduce(function(a,d){return a+_valorClienteProduto(d,produto,'entrada');},0);
  var titulo=produto&&produto!=='null'?'Total · '+produto+' — Entrada':'Total · Todos os produtos — Entrada';
  var sub=lista.length+' cliente'+(lista.length!==1?'s':'')+' com entrada · Total: <span style="color:var(--blue);font-weight:700;">'+formatVal(totalEnt)+'</span>';
  _abrirClientesModalComLista(lista,titulo,sub,{produto:produto});
}

