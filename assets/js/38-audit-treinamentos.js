/* ════════════════════════════════════════════════════════════════
   AUDITORIA DE TREINAMENTOS — limpa valores "suspeitos" no campo
   treinamento dos clientes (residuais de importação de "nome da venda")

   Estratégia:
   - Scan completo de data[] (scalar d.treinamento + array d.treinamentos[])
   - Categoriza valores únicos em RECONHECIDOS (na lista oficial allTreinamentos)
     vs SUSPEITOS (não estão)
   - Usuário marca os suspeitos que quer purgar
   - Aplica: scalar vira "" (sem treinamento) + remove subs com cod purgado
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function _norm(s){
    return String(s||'').toUpperCase().trim().replace(/\s+/g,' ');
  }

  /* Coleta valores únicos de treinamento (scalar + subs) com contagem */
  function _scan(){
    var dataRef = (typeof data !== 'undefined' && Array.isArray(data)) ? data : (window.data||[]);
    var oficiais = Array.isArray(allTreinamentos) ? allTreinamentos.slice() : (window.allTreinamentos||[]);
    var oficiaisNormSet = new Set(oficiais.map(_norm));
    /* mapa: cod normalizado → {cod:original, count, fontes:Set} */
    var mapa = {};
    function _add(cod, source){
      if(!cod) return;
      var n = _norm(cod);
      if(!n || n==='-' || n==='—') return;
      if(!mapa[n]) mapa[n] = { cod:String(cod), count:0, fontes:new Set() };
      mapa[n].count++;
      mapa[n].fontes.add(source);
    }
    dataRef.forEach(function(d){
      if(!d || !d.cliente) return;
      _add(d.treinamento, 'scalar');
      if(Array.isArray(d.treinamentos)){
        d.treinamentos.forEach(function(t){ if(t && t.cod) _add(t.cod,'sub'); });
      }
    });
    /* Separa em duas listas, ordenadas por count desc */
    var reconhecidos = [];
    var suspeitos = [];
    Object.keys(mapa).forEach(function(n){
      var entry = mapa[n];
      entry.norm = n;
      entry.fontes = Array.from(entry.fontes);
      if(oficiaisNormSet.has(n)) reconhecidos.push(entry);
      else suspeitos.push(entry);
    });
    reconhecidos.sort(function(a,b){ return b.count-a.count; });
    suspeitos.sort(function(a,b){ return b.count-a.count; });
    return { reconhecidos:reconhecidos, suspeitos:suspeitos, totalClientes:dataRef.length };
  }

  /* Renderiza tabela com checkboxes para suspeitos */
  function _renderConteudo(scan){
    var rec = scan.reconhecidos, sus = scan.suspeitos;
    var html = '';
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">'
         +   '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;">'
         +     '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700;">Clientes</div>'
         +     '<div style="font-size:18px;font-weight:800;color:var(--text);margin-top:2px;">'+scan.totalClientes+'</div>'
         +   '</div>'
         +   '<div style="background:rgba(57,255,20,.08);border:1px solid rgba(57,255,20,.25);border-radius:8px;padding:10px 12px;">'
         +     '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700;">✓ Reconhecidos</div>'
         +     '<div style="font-size:18px;font-weight:800;color:var(--pago);margin-top:2px;">'+rec.length+'</div>'
         +   '</div>'
         +   '<div style="background:rgba(255,95,87,.08);border:1px solid rgba(255,95,87,.3);border-radius:8px;padding:10px 12px;">'
         +     '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700;">⚠ Suspeitos</div>'
         +     '<div style="font-size:18px;font-weight:800;color:var(--red);margin-top:2px;">'+sus.length+'</div>'
         +   '</div>'
         + '</div>';

    /* Reconhecidos (read-only) */
    html += '<div style="margin-bottom:14px;">'
         +   '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--pago);margin-bottom:6px;">✓ Reconhecidos — mantidos como estão</div>';
    if(rec.length === 0){
      html += '<div style="font-size:11px;color:var(--muted);padding:6px 0;">Nenhum treinamento reconhecido encontrado.</div>';
    } else {
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      rec.forEach(function(r){
        html += '<span style="font-size:10px;background:var(--surface2);border:1px solid var(--border2);border-radius:6px;padding:3px 8px;font-family:DM Mono,monospace;color:var(--pago);">'+_esc(r.cod)+' <span style="opacity:.5;">·'+r.count+'</span></span>';
      });
      html += '</div>';
    }
    html += '</div>';

    /* Suspeitos (com checkboxes) */
    html += '<div>'
         +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
         +     '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--red);">⚠ Suspeitos — marque os que devem ser removidos</div>'
         +     (sus.length>0 ? '<div style="display:flex;gap:6px;"><button type="button" onclick="_auditMarcarTodos(true)" style="font-size:10px;padding:4px 9px;background:transparent;border:1px solid var(--border2);border-radius:5px;color:var(--text);cursor:pointer;">Marcar todos</button><button type="button" onclick="_auditMarcarTodos(false)" style="font-size:10px;padding:4px 9px;background:transparent;border:1px solid var(--border2);border-radius:5px;color:var(--text);cursor:pointer;">Limpar</button></div>' : '')
         +   '</div>';
    if(sus.length === 0){
      html += '<div style="background:rgba(57,255,20,.06);border:1px solid rgba(57,255,20,.2);border-radius:8px;padding:12px;text-align:center;color:var(--pago);font-size:12px;">✅ Nenhum valor suspeito encontrado — base limpa.</div>';
    } else {
      html += '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;max-height:340px;overflow-y:auto;">';
      sus.forEach(function(s,i){
        var bg = (i%2===0) ? 'transparent' : 'rgba(255,255,255,.02)';
        html += '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:'+bg+';border-bottom:1px solid var(--border);cursor:pointer;">'
             +   '<input type="checkbox" class="audit-trein-chk" data-cod="'+_esc(s.cod)+'" data-norm="'+_esc(s.norm)+'" style="accent-color:var(--red);width:14px;height:14px;cursor:pointer;">'
             +   '<span style="flex:1;font-size:12px;font-family:DM Mono,monospace;color:var(--text);font-weight:700;">'+_esc(s.cod)+'</span>'
             +   '<span style="font-size:10px;color:var(--muted);">'+s.count+' ocorrência'+(s.count!==1?'s':'')+'</span>'
             +   '<span style="font-size:9px;color:var(--muted);background:var(--surface2);border-radius:4px;padding:2px 6px;text-transform:uppercase;">'+s.fontes.join('+')+'</span>'
             + '</label>';
      });
      html += '</div>';
    }
    html += '</div>';

    /* Aviso e ações */
    html += '<div style="margin-top:14px;padding:10px 12px;background:rgba(255,183,64,.08);border:1px solid rgba(255,183,64,.3);border-radius:8px;font-size:11px;color:var(--amber);">'
         +   '<b>⚠ Atenção:</b> ao confirmar, o campo <code>treinamento</code> dos clientes afetados será limpo (vira "—") e os sub-treinamentos com esses códigos serão removidos. Os <b>clientes</b> permanecem no sistema — apenas o vínculo de treinamento é desfeito. Esta ação é <b>irreversível</b>.'
         + '</div>';
    return html;
  }

  function _esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  window._auditMarcarTodos = function(marcar){
    document.querySelectorAll('.audit-trein-chk').forEach(function(c){ c.checked = !!marcar; });
  };

  window._auditTreinAbrir = function(){
    var scan = _scan();
    var conteudoEl = document.getElementById('auditTreinBody');
    if(!conteudoEl) return;
    conteudoEl.innerHTML = _renderConteudo(scan);
    var overlay = document.getElementById('auditTreinOverlay');
    if(overlay) overlay.classList.add('open');
  };

  window._auditTreinFechar = function(){
    var overlay = document.getElementById('auditTreinOverlay');
    if(overlay) overlay.classList.remove('open');
  };

  window._auditTreinAplicar = function(){
    var marcados = [];
    document.querySelectorAll('.audit-trein-chk:checked').forEach(function(c){
      marcados.push({ cod:c.getAttribute('data-cod'), norm:c.getAttribute('data-norm') });
    });
    if(!marcados.length){
      if(typeof _showToast === 'function') _showToast('⚠️ Marque ao menos um item.','var(--amber)');
      return;
    }
    if(!confirm('Remover '+marcados.length+' valor'+(marcados.length>1?'es':'')+' suspeito'+(marcados.length>1?'s':'')+' de todos os clientes?\n\nEsta ação NÃO pode ser desfeita.')) return;

    var purgaSet = new Set(marcados.map(function(m){return m.norm;}));
    var dataRef = (typeof data !== 'undefined' && Array.isArray(data)) ? data : (window.data||[]);
    var afetadosScalar = 0;
    var subsRemovidos = 0;

    dataRef.forEach(function(d){
      if(!d) return;
      /* Scalar */
      if(d.treinamento && purgaSet.has(_norm(d.treinamento))){
        d.treinamento = '';
        afetadosScalar++;
      }
      /* Array de subs */
      if(Array.isArray(d.treinamentos) && d.treinamentos.length){
        var antes = d.treinamentos.length;
        d.treinamentos = d.treinamentos.filter(function(t){
          return !(t && t.cod && purgaSet.has(_norm(t.cod)));
        });
        subsRemovidos += (antes - d.treinamentos.length);
        /* Re-sincroniza scalar com primeiro sub válido (se houver) */
        if(!d.treinamento && d.treinamentos.length > 0 && d.treinamentos[0].cod){
          d.treinamento = d.treinamentos[0].cod;
        }
      }
    });

    /* Persiste via mecanismo padrão */
    try { if(typeof markUnsaved === 'function') markUnsaved(); } catch(e){}
    try { if(typeof saveStorage === 'function') saveStorage(); } catch(e){}
    try { if(typeof renderAll === 'function')       renderAll(); } catch(e){}
    try { if(typeof renderConsultor === 'function') renderConsultor(); } catch(e){}
    try { if(typeof renderTreinador === 'function') renderTreinador(); } catch(e){}
    try { if(typeof renderProduto === 'function')   renderProduto(); } catch(e){}

    window._auditTreinFechar();
    if(typeof _showToast === 'function'){
      _showToast('✅ '+afetadosScalar+' scalar + '+subsRemovidos+' subs limpos','var(--accent)');
    } else {
      alert('✅ Limpeza aplicada: '+afetadosScalar+' scalar + '+subsRemovidos+' subs removidos.');
    }
  };

})();
