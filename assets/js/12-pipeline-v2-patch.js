/* ════════════════════════════════════════════════════════════
   NOVA PIPELINE v2 — PATCH SOBRE O MÓDULO EXISTENTE
   1. getCol() — escala de cores oficial
   2. _npGetMetaAtiva() — detecta qual tier está em jogo
   3. npAbrirModalMeta — 3 campos por consultor
   4. npSalvarMetas — salva metaBasica/metaMinima/metaMaster
   5. _npRenderMetas — cards com tiers visuais
   6. _npRenderDashboard — status strip + cores corretas
   7. npRenderRanking — ordena por % meta
════════════════════════════════════════════════════════════ */
(function _npV2Patch(){

  /* ── Paleta oficial ─────────────────────────────────── */
  function _npGetCol(pct){
    if(pct>=100) return{bar:'#c8f05a',text:'#c8f05a',bg:'rgba(200,240,90,.08)',border:'rgba(200,240,90,.3)',badge:'Meta atingida! ✅',cls:'c100'};
    if(pct>=75)  return{bar:'#00f0ff',text:'#00f0ff',bg:'rgba(0,240,255,.06)',border:'rgba(0,240,255,.25)',badge:'Quase lá! 🔵',cls:'c75'};
    if(pct>=50)  return{bar:'#ffe000',text:'#ffe000',bg:'rgba(255,238,0,.06)',border:'rgba(255,238,0,.25)',badge:'Em progresso 🟡',cls:'c50'};
    if(pct>=25)  return{bar:'#ff5500',text:'#ff5500',bg:'rgba(255,85,0,.06)',border:'rgba(255,85,0,.25)',badge:'Atenção 🟠',cls:'c25'};
    return         {bar:'#ff1744',text:'#ff1744',bg:'rgba(255,23,68,.06)',border:'rgba(255,23,68,.25)',badge:'Crítico 🔴',cls:'c0'};
  }

  /* Meta ativa = a menor meta ainda não batida */
  function _npGetMetaAtiva(goal, real){
    var b=+(goal.metaBasica||goal.metaValor||0);
    var m=+(goal.metaMinima||0);
    var M=+(goal.metaMaster||0);
    /* Descobrir qual tier está em jogo */
    if(M>0&&real>=M) return{meta:M,tier:'master',label:'🥇 Master',pct:Math.round(real/M*100)};
    if(M>0&&real>=b) return{meta:M,tier:'master',label:'🥇 Master',pct:Math.round(real/M*100)};
    if(m>0&&real>=b) return{meta:m,tier:'minima',label:'🥈 Mínima',pct:Math.round(real/m*100)};
    if(b>0)          return{meta:b,tier:'basica', label:'🥉 Básica',pct:Math.round(real/b*100)};
    return{meta:0,tier:'',label:'—',pct:0};
  }

  function _npFmtR(v){
    return 'R$\u00a0'+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function _npFmtR2(v){
    return 'R$\u00a0'+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  /* Formata n\u00famero (em reais) para input com centavos, sem prefixo R$. Ex.: 1500 \u2192 "1.500,00" */
  function _npFmtMoneyInput(v){
    return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function _esc2(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function _escJS2(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}

  /* ── Modal Metas — 3 campos por consultor ──────────── */
  window.npAbrirModalMeta=function(focoConsultor){
    if(typeof _npColetarConsultores==='function') _npColetarConsultores();
    var el=document.getElementById('npModalMetaMes');
    if(el) el.textContent=typeof _mesLabel==='function'?_mesLabel():'--';
    var body=document.getElementById('npModalMetaBody');
    if(!body) return;
    var _cons=window._npConsultores||[];
    var _goals=window._npGoals||{};
    var COR=window._npCOR||['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8'];

    var batchHtml='<div class="np-lote-panel" id="npLotePanel">'
      +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:nowrap;margin-bottom:10px;">'
      +'<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:700;color:var(--text);">'
      +'<input type="checkbox" id="npLoteSelAll" onchange="npToggleSelAll(this)" style="width:15px;height:15px;accent-color:var(--accent);cursor:pointer;">'
      +'Selecionar todos</label>'
      +'<span id="npLoteCounter" style="font-size:11px;color:var(--muted);">0 de '+_cons.length+' selecionados</span>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">'
      +'<div><div style="font-size:9px;font-weight:700;color:#ffe000;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">&#x1F948; M\xednima</div>'
      +'<input type="text" id="npLoteMinima" class="np-form-input" placeholder="manter atual" oninput="this.value=npMoneyMask(this.value)" style="border-color:rgba(255,238,0,.3);"></div>'
      +'<div><div style="font-size:9px;font-weight:700;color:#ff5252;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">&#x1F949; B\xe1sica</div>'
      +'<input type="text" id="npLoteBasica" class="np-form-input" placeholder="manter atual" oninput="this.value=npMoneyMask(this.value)" style="border-color:rgba(255,82,82,.3);"></div>'
      +'<div><div style="font-size:9px;font-weight:700;color:#c8f05a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">&#x1F947; Master</div>'
      +'<input type="text" id="npLoteMaster" class="np-form-input" placeholder="manter atual" oninput="this.value=npMoneyMask(this.value)" style="border-color:rgba(200,240,90,.3);"></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:nowrap;">'
      +'<button class="np-btn" style="font-size:12px;padding:7px 18px;" onclick="npAplicarMetaLote()">Aplicar aos selecionados</button>'
      +'<button class="np-btn-sec" style="font-size:11px;padding:6px 14px;" onclick="npCopiarMetasMesAnterior()">&#x21E6; Copiar mês anterior</button>'
      +'</div>'
      +'</div>';

    if(!_cons.length){
      body.innerHTML=batchHtml+'<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">Nenhum consultor encontrado.</div>';
    } else {
      var listHtml=_cons.map(function(nome,i){
        var g=_goals[nome]||{};
        var cor=COR[i%COR.length];
        var hl=focoConsultor&&focoConsultor===nome;
        var temMeta=!!(g.metaBasica||g.metaMinima||g.metaMaster);
        return '<div class="np-meta-row" style="border-bottom:1px solid var(--border);padding:14px 0;'+(hl?'background:rgba(200,240,90,.03);border-radius:8px;padding:14px;margin:-2px;':'')+'">'
          +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:nowrap;overflow:hidden;">'
          +'<input type="checkbox" class="np-meta-chk" data-cons-chk="'+_esc2(nome)+'" onchange="npUpdateSelCounter()" onclick="npChkClick(event,this)" style="width:15px;height:15px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;">'
          +'<div style="width:32px;height:32px;border-radius:50%;background:'+cor+'22;color:'+cor+';border:1.5px solid '+cor+'55;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;">'+nome.charAt(0).toUpperCase()+'</div>'
          +'<div style="font-size:13px;font-weight:700;color:var(--text);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_esc2(nome)+'</div>'
          +(temMeta?'<span style="font-size:9px;background:rgba(255,238,0,.15);color:#ffe000;border:1px solid rgba(255,238,0,.3);border-radius:4px;padding:1px 6px;white-space:nowrap;flex-shrink:0;">meta definida</span>':'')
          +'</div>'
          +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">'
          +'<div><div style="font-size:9px;font-weight:700;color:#ffe000;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">&#x1F948; M\xednima</div>'
          +'<input type="text" class="np-form-input" data-cons="'+_esc2(nome)+'" data-tipo="metaMinima" placeholder="0,00" value="'+(g.metaMinima?_npFmtMoneyInput(g.metaMinima):'')+'" oninput="this.value=npMoneyMask(this.value)" style="border-color:rgba(255,238,0,.3);"></div>'
          +'<div><div style="font-size:9px;font-weight:700;color:#ff5252;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">&#x1F949; B\xe1sica</div>'
          +'<input type="text" class="np-form-input" data-cons="'+_esc2(nome)+'" data-tipo="metaBasica" placeholder="0,00" value="'+(g.metaBasica?_npFmtMoneyInput(g.metaBasica):'')+'" oninput="this.value=npMoneyMask(this.value)" style="border-color:rgba(255,82,82,.3);"></div>'
          +'<div><div style="font-size:9px;font-weight:700;color:#c8f05a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">&#x1F947; Master</div>'
          +'<input type="text" class="np-form-input" data-cons="'+_esc2(nome)+'" data-tipo="metaMaster" placeholder="0,00" value="'+(g.metaMaster?_npFmtMoneyInput(g.metaMaster):'')+'" oninput="this.value=npMoneyMask(this.value)" style="border-color:rgba(200,240,90,.3);"></div>'
          +'</div>'
          +'</div>';
      }).join('');
      body.innerHTML=batchHtml+listHtml;
    }
    document.getElementById('npModalMeta').classList.add('open');
    if(focoConsultor){
      setTimeout(function(){
        var inp=body.querySelector('[data-cons="'+focoConsultor+'"]');
        if(inp){inp.scrollIntoView({behavior:'smooth',block:'center'});inp.focus();}
      },100);
    }
  };

  var _npLastChk=null;
  window.npChkClick=function(ev,cb){
    var body=document.getElementById('npModalMetaBody');
    if(!body) return;
    var all=Array.from(body.querySelectorAll('.np-meta-chk'));
    if(ev.shiftKey&&_npLastChk&&_npLastChk!==cb){
      var ia=all.indexOf(_npLastChk),ib=all.indexOf(cb);
      if(ia>=0&&ib>=0){
        var lo=Math.min(ia,ib),hi=Math.max(ia,ib);
        for(var k=lo;k<=hi;k++) all[k].checked=cb.checked;
      }
    }
    _npLastChk=cb;
  };

  window.npToggleSelAll=function(selAllCb){
    var body=document.getElementById('npModalMetaBody');
    if(!body) return;
    body.querySelectorAll('.np-meta-chk').forEach(function(cb){cb.checked=selAllCb.checked;});
    npUpdateSelCounter();
  };

  window.npUpdateSelCounter=function(){
    var body=document.getElementById('npModalMetaBody');
    var counter=document.getElementById('npLoteCounter');
    var selAll=document.getElementById('npLoteSelAll');
    if(!body) return;
    var all=body.querySelectorAll('.np-meta-chk');
    var sel=body.querySelectorAll('.np-meta-chk:checked');
    if(counter) counter.textContent=sel.length+' de '+all.length+' selecionados';
    if(selAll){
      selAll.indeterminate=sel.length>0&&sel.length<all.length;
      selAll.checked=sel.length===all.length&&all.length>0;
    }
    all.forEach(function(cb){
      var row=cb.closest('.np-meta-row');
      if(row) row.style.background=cb.checked?'rgba(200,240,90,.05)':'';
    });
  };

  window.npAplicarMetaLote=function(){
    var body=document.getElementById('npModalMetaBody');
    if(!body) return;
    var selecionados=Array.from(body.querySelectorAll('.np-meta-chk:checked')).map(function(cb){return cb.dataset.consChk;});
    if(!selecionados.length){
      if(typeof _showToast==='function') _showToast('Selecione ao menos um consultor.','var(--amber)');
      return;
    }
    var vMin=(document.getElementById('npLoteMinima')||{}).value||'';
    var vBas=(document.getElementById('npLoteBasica')||{}).value||'';
    var vMas=(document.getElementById('npLoteMaster')||{}).value||'';
    if(!vMin&&!vBas&&!vMas){
      if(typeof _showToast==='function') _showToast('Preencha ao menos um campo de meta.','var(--amber)');
      return;
    }
    var _goals=window._npGoals||{};
    var comMeta=selecionados.filter(function(n){var g=_goals[n]||{};return !!(g.metaBasica||g.metaMinima||g.metaMaster);});
    if(comMeta.length){
      var msg=comMeta.length+' consultor'+(comMeta.length>1?'es ja tem':'  ja tem')+' metas definidas.\n\nSobrescrever tudo? Clique OK para confirmar ou Cancelar para abortar.';
      if(!confirm(msg)) return;
    }
    selecionados.forEach(function(nome){
      if(vMin){var i=body.querySelector('[data-cons="'+nome+'"][data-tipo="metaMinima"]');if(i) i.value=vMin;}
      if(vBas){var i2=body.querySelector('[data-cons="'+nome+'"][data-tipo="metaBasica"]');if(i2) i2.value=vBas;}
      if(vMas){var i3=body.querySelector('[data-cons="'+nome+'"][data-tipo="metaMaster"]');if(i3) i3.value=vMas;}
    });
    if(typeof _showToast==='function') _showToast('Template aplicado a '+selecionados.length+' consultor'+(selecionados.length>1?'es':'')+'. Clique em "Salvar metas" para confirmar.','var(--accent)');
  };

  window.npCopiarMetasMesAnterior=function(){
    var mk=typeof _mesKey==='function'?_mesKey():'';
    if(!mk) return;
    var partes=mk.split('-');
    var ano=parseInt(partes[0]),mes=parseInt(partes[1]);
    mes--;if(mes<1){mes=12;ano--;}
    var prevMk=ano+'-'+(mes<10?'0':'')+mes;
    if(typeof _showToast==='function') _showToast('Carregando metas de '+prevMk+'...','var(--muted)');
    window._fbGet('pipelineGoals/'+prevMk).then(function(d){
      if(!d||!Object.keys(d).length){
        if(typeof _showToast==='function') _showToast('Nenhuma meta encontrada em '+prevMk+'.','var(--amber)');
        return;
      }
      var body=document.getElementById('npModalMetaBody');
      if(!body) return;
      var count=0;
      Object.entries(d).forEach(function(e){
        var nome=e[0],g=e[1]||{};
        ['metaMinima','metaBasica','metaMaster'].forEach(function(tipo){
          var inp=body.querySelector('[data-cons="'+nome+'"][data-tipo="'+tipo+'"]');
          if(inp&&g[tipo]){
            inp.value=typeof _npFmtMoneyInput==='function'?_npFmtMoneyInput(g[tipo]):String(g[tipo]);
            count++;
          }
        });
      });
      if(typeof _showToast==='function') _showToast('Metas de '+prevMk+' copiadas para '+count/3+' consultor(es). Clique em "Salvar metas" para confirmar.','var(--accent)');
    }).catch(function(){
      if(typeof _showToast==='function') _showToast('Erro ao carregar metas de '+prevMk+'.','var(--red)');
    });
  };

  /* ── Salvar 3 metas no Firebase ─────────────────────── */
  window.npSalvarMetas=function(){
    var body=document.getElementById('npModalMetaBody');
    if(!body) return;
    var mk=typeof _mesKey==='function'?_mesKey():'';
    /* Parser robusto: aceita "R$ 1.500", "1.500,00", "1500", etc. */
    function _parseMoney(v){
      var s=String(v==null?'':v).replace(/[^\d,.]/g,'');
      if(!s) return 0;
      if(s.indexOf(',')>=0) s=s.replace(/\./g,'').replace(',','.');
      else s=s.replace(/\./g,'');
      var n=parseFloat(s);
      return isFinite(n)?n:0;
    }
    var updates={};
    ['metaBasica','metaMinima','metaMaster','metaQtd'].forEach(function(tipo){
      body.querySelectorAll('[data-tipo="'+tipo+'"]').forEach(function(inp){
        var nome=inp.dataset.cons;
        if(!updates[nome]) updates[nome]={};
        if(tipo==='metaQtd'){
          updates[nome][tipo]=parseInt(String(inp.value||'').replace(/\D/g,''),10)||0;
        } else {
          var num=_parseMoney(inp.value);
          updates[nome][tipo]=num;
          /* Compatibilidade: metaValor = metaBasica */
          if(tipo==='metaBasica') updates[nome].metaValor=num;
        }
      });
    });
    var promises=Object.entries(updates).map(function(e){
      return window._fbSave('pipelineGoals/'+mk+'/'+e[0],e[1]);
    });
    Promise.all(promises).then(function(){
      if(typeof window._audit==='function') window._audit('meta.update',{type:'meta',id:mk},updates);
      var _mlbl=typeof _mesLabel==='function'?_mesLabel():mk;
      if(typeof _showToast==='function')_showToast('✅ Metas de '+_mlbl+' salvas!','var(--accent)');
      if(typeof npFecharModalMeta==='function') npFecharModalMeta();
      window._fbGet('pipelineGoals/'+mk).then(function(d){
        window._npGoals=d||{};
        if(typeof _npRenderTudo==='function') _npRenderTudo();
      }).catch(function(){});
    }).catch(function(){
      if(typeof _showToast==='function')_showToast('❌ Erro ao salvar metas.','var(--red)');
    });
  };

  /* ── Modal Meta Geral ────────────────────────────────── */
  window.npAbrirModalMetaGeral=function(){
    var mk=window._mesKey?window._mesKey():'';
    var lbl=window._mesLabel?window._mesLabel():mk;
    var el=document.getElementById('npModalMetaGeralMes');
    if(el) el.textContent=lbl;

    /* Preencher input com valor atual */
    var inp=document.getElementById('npInputMetaGeral');
    if(inp){
      var val=window._npMetaGeral&&window._npMetaGeral.valor>0?window._npMetaGeral.valor:0;
      inp.value=val>0?_npFmtMoneyInput(val):'';
    }

    /* Painel de referência */
    var somaInd=Object.values(window._npGoals||{}).reduce(function(s,g){return s+(+(g.metaBasica||g.metaValor||0));},0);
    var mgVal=window._npMetaGeral&&window._npMetaGeral.valor>0?window._npMetaGeral.valor:0;
    var todas=window._npTodasVendas?window._npTodasVendas():[];
    var faturado=todas.reduce(function(s,v){return s+((v.status||'').toLowerCase()==='pago'?+(v.valor||0):0);},0);
    var diff=mgVal>0?(mgVal-faturado):0;
    var diffHtml=mgVal>0
      ?'<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-weight:700;color:'+(diff<=0?'var(--green)':'var(--amber)')+';">'+(diff<=0?'✅ Meta atingida! +'+_npFmtR(Math.abs(diff))+' acima':'Faltam: '+_npFmtR(diff))+'</div>'
      :'';
    var refEl=document.getElementById('npMetaGeralRef');
    if(refEl){
      refEl.innerHTML='<div>Meta Geral: <strong style="color:#60a5fa;">'+(mgVal>0?_npFmtR(mgVal):'—')+'</strong></div>'
        +'<div>Σ metas individuais: <strong style="color:var(--muted);">'+_npFmtR(somaInd)+'</strong></div>'
        +'<div>Faturado (pago): <strong style="color:var(--accent);">'+_npFmtR(faturado)+'</strong></div>'
        +diffHtml
        +'<div style="margin-top:10px;font-size:10px;color:var(--muted);">Quando definida, a Meta Geral substitui a soma das metas individuais no Performance do Time e em "Faltam para meta".</div>';
    }

    /* Botão remover — só ativo se há meta salva */
    var btnRem=document.getElementById('npBtnRemoverMetaGeral');
    if(btnRem) btnRem.style.opacity=mgVal>0?'1':'0.4';

    var overlay=document.getElementById('npModalMetaGeral');
    if(overlay) overlay.classList.add('open');
  };

  window.npFecharModalMetaGeral=function(){
    var overlay=document.getElementById('npModalMetaGeral');
    if(overlay) overlay.classList.remove('open');
  };

  window.npSalvarMetaGeral=function(){
    var mk=window._mesKey?window._mesKey():'';
    var inp=document.getElementById('npInputMetaGeral');
    if(!inp) return;
    var s=String(inp.value||'').replace(/[^\d,.]/g,'');
    if(s.indexOf(',')>=0) s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/\./g,'');
    var valor=parseFloat(s)||0;
    var payload={valor:valor,atualizadoEm:Date.now()};
    window._fbSave('pipelineMetaGeral/'+mk,payload).then(function(){
      window._npMetaGeral=valor>0?payload:null;
      if(window._npAtualizarBtnConfigurar) window._npAtualizarBtnConfigurar();
      if(window._npRenderTudo) window._npRenderTudo();
      var lbl=window._mesLabel?window._mesLabel():mk;
      if(typeof _showToast==='function') _showToast('✅ Meta geral de '+lbl+' salva! ('+_npFmtR(valor)+')','var(--accent)');
      window.npFecharModalMetaGeral();
    }).catch(function(){
      if(typeof _showToast==='function') _showToast('❌ Erro ao salvar meta geral.','var(--red)');
    });
  };

  window.npRemoverMetaGeral=function(){
    var mk=window._mesKey?window._mesKey():'';
    if(!window._npMetaGeral||!(window._npMetaGeral.valor>0)) return;
    if(!confirm('Remover a Meta Geral deste mês? O sistema voltará a usar a soma das metas individuais.')) return;
    window._fbSave('pipelineMetaGeral/'+mk,null).then(function(){
      window._npMetaGeral=null;
      if(window._npAtualizarBtnConfigurar) window._npAtualizarBtnConfigurar();
      if(window._npRenderTudo) window._npRenderTudo();
      if(typeof _showToast==='function') _showToast('Meta geral removida. Usando soma das metas individuais.','var(--muted)');
      window.npFecharModalMetaGeral();
    }).catch(function(){
      if(typeof _showToast==='function') _showToast('❌ Erro ao remover meta geral.','var(--red)');
    });
  };

  /* ── Render Metas — cards com 3 tiers ────────────────── */
  function _npRenderMetasV2(todas){
    var grid=document.getElementById('npMetasGrid');if(!grid) return;
    if(_npVendasTurma.length===0&&Object.keys(_npVendasAvulso||{}).length===0){
      grid.innerHTML='<div class="np-empty">Nenhum dado para este mês.</div>';return;
    }
    var _consComVenda=new Set((typeof window._npTodasVendas==='function'?window._npTodasVendas():[]).map(function(v){return (v.consultor||'').trim().toUpperCase();}));
    var _cons=(window._npConsultores||[]).filter(function(n){return _consComVenda.has((n||'').trim().toUpperCase());});
    if(!_cons.length){grid.innerHTML='<div class="np-empty">Nenhum consultor encontrado neste mês.</div>';return;}
    var COR=window._npCOR||['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8'];
    var ranking=typeof window._npPorConsultor==='function'?window._npPorConsultor(todas,'','pago'):[];
    grid.innerHTML=_cons.map(function(nome,i){
      var g=window._npGoals[nome]||{};
      var r=ranking.find(function(x){return x.nome===nome;})||{total:0,pago:0,qtd:0,qtdPago:0};
      var real=r.pago; /* apenas status PAGO abate meta */
      var tierInfo=_npGetMetaAtiva(g,real);
      var pct=tierInfo.pct;
      var col=_npGetCol(pct);
      var isSuperMeta=g.metaMaster&&real>=+(g.metaMaster||0)&&+(g.metaMaster||0)>0;
      var cor=COR[i%COR.length];
      var b=+(g.metaBasica||g.metaValor||0);
      var m=+(g.metaMinima||0);
      var M=+(g.metaMaster||0);
      var pctB=b?Math.min(200,Math.round(real/b*100)):0;
      var pctM=m?Math.min(200,Math.round(real/m*100)):0;
      var pctMas=M?Math.min(200,Math.round(real/M*100)):0;
      var nomeJS=String(nome||'').replace(/\\/g,'\\\\').replace(/\x27/g,'\\\x27');
      return '<div class="np-meta-card clickable'+(isSuperMeta?' np-super-meta':'')+'" role="button" tabindex="0"'
        +' onclick="npAbrirConsultorDetalhe(\''+nomeJS+'\')"'
        +' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();npAbrirConsultorDetalhe(\''+nomeJS+'\');}"'
        +' style="border-color:'+col.border+';background:'+col.bg+';">'
        /* Header */
        +'<div class="np-meta-header">'
        +'<div class="np-meta-avatar" style="background:'+cor+'22;color:'+cor+';border:1.5px solid '+cor+'55;">'+nome.charAt(0).toUpperCase()+'</div>'
        +'<div style="flex:1;min-width:0;">'
        +'<div class="np-meta-nome">'+_esc2(nome)+'</div>'
        +'<span class="np-status-badge" style="background:'+col.bg+';color:'+col.text+';border:1px solid '+col.border+';">'+col.badge+'</span>'
        +'</div>'
        +(isSuperMeta?'<div style="font-size:18px;" title="Super Meta!">🚀</div>':'')
        +'</div>'
        /* Progresso principal */
        +'<div style="margin:10px 0 4px;display:flex;justify-content:space-between;font-size:11px;color:var(--muted);">'
        +'<span>'+_npFmtR2(real)+'</span>'
        +'<span style="font-weight:800;color:'+col.text+';">'+pct+'% — '+tierInfo.label+'</span>'
        +'</div>'
        +'<div class="np-meta-progress" style="height:8px;">'
        +'<div class="np-meta-bar" style="width:'+Math.min(100,pct)+'%;background:'+col.bar+';"></div>'
        +'</div>'
        /* 3 tiers */
        +(b||m||M?
          '<div class="np-meta-tiers" style="margin-top:10px;">'
          +(b?'<div class="np-tier np-tier--basica'+(tierInfo.tier==='basica'?' ativa':'')+'">'
            +'<div class="np-tier-label">🥉 Básica</div>'
            +'<div class="np-tier-val" style="color:'+(pctB>=100?'#c8f05a':'#ff5252')+';font-size:10px;">'+(pctB>=100?'✅ Batida':'Falta '+_npFmtR(Math.max(0,b-real)))+'</div>'
            +'<div style="font-size:9px;color:var(--muted);margin-top:1px;">'+pctB+'%</div>'
            +'</div>':'<div class="np-tier np-tier--basica" style="opacity:.3;"><div class="np-tier-label">🥉 Básica</div><div class="np-tier-val">—</div></div>')
          +(m?'<div class="np-tier np-tier--minima'+(tierInfo.tier==='minima'?' ativa':'')+'">'
            +'<div class="np-tier-label">🥈 Mínima</div>'
            +'<div class="np-tier-val" style="color:'+(pctM>=100?'#c8f05a':'#ffe000')+';font-size:10px;">'+(pctM>=100?'✅ Batida':'Falta '+_npFmtR(Math.max(0,m-real)))+'</div>'
            +'<div style="font-size:9px;color:var(--muted);margin-top:1px;">'+pctM+'%</div>'
            +'</div>':'<div class="np-tier np-tier--minima" style="opacity:.3;"><div class="np-tier-label">🥈 Mínima</div><div class="np-tier-val">—</div></div>')
          +(M?'<div class="np-tier np-tier--master'+(tierInfo.tier==='master'?' ativa':'')+'">'
            +'<div class="np-tier-label">🥇 Master</div>'
            +'<div class="np-tier-val" style="color:'+(pctMas>=100?'#c8f05a':'#c8f05a')+';font-size:10px;">'+(pctMas>=100?'✅ Batida':'Falta '+_npFmtR(Math.max(0,M-real)))+'</div>'
            +'<div style="font-size:9px;color:var(--muted);margin-top:1px;">'+pctMas+'%</div>'
            +'</div>':'<div class="np-tier np-tier--master" style="opacity:.3;"><div class="np-tier-label">🥇 Master</div><div class="np-tier-val">—</div></div>')
          +'</div>'
        :'<div style="font-size:11px;color:var(--muted);margin-top:8px;text-align:center;">Sem metas configuradas</div>')
        /* Botão */
        +'<button class="np-meta-edit" onclick="event.stopPropagation();npAbrirModalMeta(\''+_escJS2(nome)+'\')" style="margin-top:10px;">⚙ Configurar metas</button>'
        +'</div>';
    }).join('');
  }

  /* ── Status strip no dashboard ───────────────────────── */
  function _npRenderStatusStrip(todas){
    var el=document.getElementById('npStatusStrip');if(!el) return;
    if(_npVendasTurma.length===0&&Object.keys(_npVendasAvulso||{}).length===0){
      el.innerHTML='';return;
    }
    var _cons=window._npConsultores||[];
    var _goals=window._npGoals||{};
    var ranking=typeof window._npPorConsultor==='function'?window._npPorConsultor(todas,'','pago'):[];
    var buckets={c0:0,c25:0,c50:0,c75:0,c100:0};
    _cons.forEach(function(nome){
      var g=_goals[nome]||{};
      var r=(ranking.find(function(x){return x.nome===nome;})||{}).pago||0; /* só PAGO */
      var t=_npGetMetaAtiva(g,r);
      if(!t.meta) return;
      var col=_npGetCol(t.pct);
      buckets[col.cls]=(buckets[col.cls]||0)+1;
    });
    var defs=[
      {cls:'c0',  label:'Crítico',      cor:'#ff1744',bg:'rgba(255,23,68,.07)',border:'rgba(255,23,68,.25)'},
      {cls:'c25', label:'Atenção',      cor:'#ff5500',bg:'rgba(255,85,0,.07)',border:'rgba(255,85,0,.25)'},
      {cls:'c50', label:'Em progresso', cor:'#ffe000',bg:'rgba(255,238,0,.07)',border:'rgba(255,238,0,.25)'},
      {cls:'c75', label:'Quase lá!',    cor:'#00f0ff',bg:'rgba(0,240,255,.07)',border:'rgba(0,240,255,.25)'},
      {cls:'c100',label:'Meta atingida',cor:'#c8f05a',bg:'rgba(200,240,90,.07)',border:'rgba(200,240,90,.25)'},
    ];
    el.innerHTML=defs.map(function(d){
      var n=buckets[d.cls]||0;
      return '<div class="np-ss-card" style="background:'+d.bg+';border-color:'+d.border+';">'
        +'<div class="np-ss-num" style="color:'+d.cor+';">'+n+'</div>'
        +'<div class="np-ss-label" style="color:'+d.cor+';">'+d.label+'</div>'
        +'</div>';
    }).join('');
  }

  /* ── Ranking com % meta ──────────────────────────────── */
  window.npRenderRanking=function(){
    var filtroSrc=(document.getElementById('npRankFiltro')||{}).value||'';
    var sortBy=(document.getElementById('npRankSort')||{}).value||'pago';
    var todas=typeof window._npTodasVendas==='function'?window._npTodasVendas():[];
    var ranking=typeof window._npPorConsultor==='function'?window._npPorConsultor(todas,filtroSrc,'pago'):[];
    var el=document.getElementById('npRankingList');
    var kpisEl=document.getElementById('npRankKpis');
    if(!el) return;
    if(!ranking.length){
      el.innerHTML='<div class="np-empty">Sem dados neste período.</div>';
      if(kpisEl) kpisEl.innerHTML='';
      return;
    }
    var COR=window._npCOR||['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8'];
    var _goals=window._npGoals||{};
    var medalBorder=['#fbbf24','#c0c0c0','#cd7f32'];

    ranking.forEach(function(r){
      var t=_npGetMetaAtiva(_goals[r.nome]||{},r.pago);
      r._tier=t;
      r._col=_npGetCol(t.pct);
      r._conv=r.qtd?Math.round(r.qtdPago/r.qtd*100):0;
      r._ticket=r.qtdPago?Math.round(r.pago/r.qtdPago):0;
    });

    ranking=ranking.slice().sort(function(a,b){
      if(sortBy==='pct'){
        var pa=a._tier.pct||0,pb=b._tier.pct||0;
        if(pb!==pa) return pb-pa;
        return b.pago-a.pago;
      }
      if(sortBy==='total') return b.total-a.total;
      if(sortBy==='qtd') return b.qtd-a.qtd;
      return b.pago-a.pago;
    });

    if(kpisEl){
      var totPago=ranking.reduce(function(acc,r){return acc+r.pago;},0);
      var totPot=ranking.reduce(function(acc,r){return acc+r.total;},0);
      var totPagoN=ranking.reduce(function(acc,r){return acc+r.qtdPago;},0);
      var totQtd=ranking.reduce(function(acc,r){return acc+r.qtd;},0);
      var convG=totQtd?Math.round(totPagoN/totQtd*100):0;
      var naMeta=ranking.filter(function(r){return (r._tier.pct||0)>=100;}).length;
      kpisEl.innerHTML='<div class="np-rank-kpis">'
        +'<div class="np-rank-kpi"><div class="np-rank-kpi-v">'+_npFmtR2(totPago)+'</div><div class="np-rank-kpi-l">Faturado</div></div>'
        +'<div class="np-rank-kpi"><div class="np-rank-kpi-v">'+_npFmtR2(totPot)+'</div><div class="np-rank-kpi-l">Potencial</div></div>'
        +'<div class="np-rank-kpi"><div class="np-rank-kpi-v">'+convG+'%</div><div class="np-rank-kpi-l">Conversão</div></div>'
        +'<div class="np-rank-kpi"><div class="np-rank-kpi-v">'+naMeta+' / '+ranking.length+'</div><div class="np-rank-kpi-l">Na meta</div></div>'
        +'</div>';
    }

    var medalhas=['🥇','🥈','🥉'];
    el.innerHTML=ranking.map(function(r,i){
      var cor=COR[i%COR.length];
      var col=r._col;
      var t=r._tier;
      var barW=t.pct!==null?Math.min(t.pct,100):0;
      var accentBorder=i<3?'border-left:3px solid '+medalBorder[i]+';':'';
      var gap=t.meta&&t.pct<100?_npFmtR(Math.max(0,t.meta-r.pago))+' p/ meta':'';
      var pctBadge=t.meta
        ?'<span class="np-ri-pct-badge" style="background:'+col.bg+';color:'+col.text+';border:1px solid '+col.border+';">'+t.pct+'%</span>'
        :'';
      var potHtml=r.total>0
        ?'<span class="np-ri-val-sub">pot. '+_npFmtR2(r.total)+'</span>'
        :'';
      return '<div class="np-ranking-item" style="'+accentBorder+'border-color:'+col.border+';background:'+col.bg+';">'
        /* posição */
        +'<div class="np-ri-pos">'+(medalhas[i]||'<span style="font-size:13px;font-weight:700;">'+(i+1)+'°</span>')+'</div>'
        /* avatar */
        +'<div class="np-ri-avatar" style="background:'+cor+'22;color:'+cor+';border:1.5px solid '+cor+'55;">'+r.nome.charAt(0).toUpperCase()+'</div>'
        /* info central */
        +'<div class="np-ri-info">'
          +'<div class="np-ri-nome">'+_esc2(r.nome)+'</div>'
          +(t.meta?'<div class="np-ri-bar"><div class="np-ri-bar-fill" style="width:'+barW+'%;background:'+col.bar+';"></div></div>':'')
          +'<div class="np-ri-tags">'
            +'<span class="np-ri-tier" style="color:'+col.text+';border-color:'+col.border+';">'+t.label+'</span>'
            +pctBadge
            +(gap?'<span class="np-ri-badge">⏳ '+gap+'</span>':'')
            +'<span class="np-ri-badge">'+r.qtdPago+'/'+r.qtd+' pago'+(r.qtdPago!==1?'s':'')+'</span>'
            +'<span class="np-ri-badge">'+r._conv+'% conv</span>'
            +(r._ticket?'<span class="np-ri-badge">tkt '+_npFmtR(r._ticket)+'</span>':'')
          +'</div>'
        +'</div>'
        /* valores */
        +'<div class="np-ri-vals">'
          +'<div class="np-ri-val" style="color:'+col.text+';">'+_npFmtR2(r.pago)+'</div>'
          +potHtml
        +'</div>'
        +'</div>';
    }).join('');
  };

  /* ── Hooks: interceptar _npRenderTudo para usar V2 ────── */
  var _origRenderTudo=window._npRenderTudo;
  window._npRenderTudo=function(){
    if(!window._npAtivo) return;
    if(typeof window._npRenderLabel==='function') window._npRenderLabel();
    if(typeof window._npColetarConsultores==='function') window._npColetarConsultores();
    if(typeof window._npPopularFiltros==='function') window._npPopularFiltros();
    var todas=typeof window._npTodasVendas==='function'?window._npTodasVendas():[];
    var tab=window._npTabAtiva||'dashboard';
    if(tab==='dashboard'){
      if(typeof window._npRenderDashboard==='function') window._npRenderDashboard(todas);
      _npRenderStatusStrip(todas);
    } else if(tab==='vendas'){
      if(typeof window.npRenderVendas==='function') window.npRenderVendas();
    } else if(tab==='metas'){
      _npRenderMetasV2(todas);
    } else if(tab==='ranking'){
      window.npRenderRanking();
    }
  };

  /* Expor _npRenderMetasV2 como override — garante que _npRenderTudo interno use a versão com tiers */
  window._npRenderMetasOverride=_npRenderMetasV2;

  /* Hook npShowTab para usar _npRenderMetasV2 na aba metas */
  var _origShowTab=window.npShowTab;
  window.npShowTab=function(tab){
    window._npTabAtiva=tab;
    /* Classe no body para CSS (ex: ocultar campo busca fora do funil) */
    document.body.classList.remove('tab-dashboard','tab-vendas','tab-metas','tab-ranking','tab-funil');
    document.body.classList.add('tab-'+tab);
    /* Limpar busca ao sair do funil */
    if(tab!=='funil'){
      var _si=document.getElementById('fnlSearch');
      if(_si) _si.value='';
      if(typeof window._fnlBuscaFechar==='function') window._fnlBuscaFechar();
    }
    document.querySelectorAll('.np-tab').forEach(function(b){
      b.classList.toggle('ativo',b.dataset.tab===tab);
    });
    document.querySelectorAll('.np-body').forEach(function(b){
      b.classList.toggle('ativo',b.id==='npTab'+tab.charAt(0).toUpperCase()+tab.slice(1));
    });
    var todas=typeof window._npTodasVendas==='function'?window._npTodasVendas():[];
    if(tab==='dashboard'){
      if(typeof window._npRenderDashboard==='function') window._npRenderDashboard(todas);
      _npRenderStatusStrip(todas);
    } else if(tab==='vendas'){
      if(typeof window.npRenderVendas==='function') window.npRenderVendas();
    } else if(tab==='metas'){
      _npRenderMetasV2(todas);
    } else if(tab==='ranking'){
      window.npRenderRanking();
    } else if(tab==='funil'){
      if(typeof window._fnlRender==='function') window._fnlRender();
    }
  };

  /* Expor _npGetCol e _npGetMetaAtiva globalmente */
  window._npGetCol=_npGetCol;
  window._npGetMetaAtiva=_npGetMetaAtiva;
  window._npCOR=['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8'];

  /* debug log removido */
})();

