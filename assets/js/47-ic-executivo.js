/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Dashboard Executivo A4 (extra)
   Gera relatório de 1 página A4 paisagem pra impressão.
   Restrito a ADM + EXTRACLASSE (botão só aparece pra eles).

   Conteúdo:
     - Header com mês de referência
     - 4 KPIs grandes (Fat total, Clientes, Consultores, % Honradas)
     - Comparativo vs mês anterior (variação %)
     - Top 10 consultores (Pareto compacto)
     - 3 alertas mais críticos
     - Rodapé com data de geração
══════════════════════════════════════════════════════════════ */
(function(){

  function _execPermitido(){
    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    if(!sess) return false;
    if(sess.perfil === 'adm') return true;
    var n = String(sess.nome||sess.login||'').toUpperCase().trim();
    return n === 'EXTRACLASSE';
  }

  function _execAtualizarBtn(){
    var btn = document.getElementById('btnImprimirExec');
    if(!btn) return;
    btn.style.display = _execPermitido() ? '' : 'none';
  }
  _execAtualizarBtn();
  document.addEventListener('DOMContentLoaded', _execAtualizarBtn);
  setTimeout(_execAtualizarBtn, 500);
  setTimeout(_execAtualizarBtn, 1500);
  setTimeout(_execAtualizarBtn, 3000);

  function _fmtR(v){ return 'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function _fmtNum(v){ return (+v||0).toLocaleString('pt-BR'); }
  function _mesNome(m){
    return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m-1] || '—';
  }
  function _agora(){
    var d = new Date();
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toTimeString().slice(0,5);
  }

  /* ── Coleta de dados do mês atual e do anterior ─── */
  function _execColetar(){
    var registros = window._mapDados || [];
    var anoSel = window._mapAnoSel || 0;
    var mesesSel = Array.isArray(window._mapMesesSel) ? window._mapMesesSel.slice() : [];

    /* Se nenhum mês selecionado, usa o mês atual */
    if(!mesesSel.length){
      mesesSel = [new Date().getMonth()+1];
    }
    if(!anoSel){ anoSel = new Date().getFullYear(); }

    var filtrados = registros.filter(function(r){
      if(anoSel > 0 && r.ano !== anoSel) return false;
      return mesesSel.indexOf(r.mes) >= 0;
    });

    /* Mês anterior pra comparativo (usa só o primeiro mês selecionado) */
    var mesRef = mesesSel[0];
    var mesAnt = mesRef - 1; var anoAnt = anoSel;
    if(mesAnt < 1){ mesAnt = 12; anoAnt = anoSel - 1; }
    var anteriores = registros.filter(function(r){ return r.ano === anoAnt && r.mes === mesAnt; });

    return {
      mesesSel: mesesSel, anoSel: anoSel,
      mesAnt: mesAnt, anoAnt: anoAnt,
      atuais: filtrados, anteriores: anteriores
    };
  }

  function _execKpis(lista){
    var byCons = {}; var byCliente = {};
    var fatTotal = 0;
    lista.forEach(function(r){
      if(!r) return;
      fatTotal += +r.valor || 0;
      if(r.consultor){ byCons[r.consultor] = (byCons[r.consultor]||0) + (+r.valor||0); }
      if(r.cliente){ byCliente[r.cliente] = true; }
    });
    return {
      fatTotal: fatTotal,
      qtdClientesPagos: lista.length,
      qtdConsultores: Object.keys(byCons).length,
      consList: Object.keys(byCons).map(function(c){return {nome:c, fat:byCons[c]};}).sort(function(a,b){return b.fat - a.fat;})
    };
  }

  /* % de promessas honradas (Cobrança) — agrega tudo do período */
  function _execPctHonradas(cb){
    if(typeof window._fbGet !== 'function'){ cb(null); return; }
    window._fbGet('icCobrancas').then(function(d){
      d = d || {};
      var hon = 0, queb = 0;
      Object.values(d).forEach(function(consDados){
        Object.values(consDados||{}).forEach(function(p){
          if(p.estado === 'honrada') hon++;
          else if(p.estado === 'quebrada') queb++;
        });
      });
      var tot = hon + queb;
      cb(tot ? Math.round(hon/tot*100) : null, hon, queb);
    }).catch(function(){ cb(null); });
  }

  /* Alertas: reusa a função do 43-ic-alertas se existir */
  function _execAlertas(lista){
    if(typeof window._icAlAtualizar !== 'function') return [];
    /* Como não temos acesso direto a _icAlCalcular (está dentro do IIFE),
       extraímos os alertas pelo DOM já renderizado. */
    var els = document.querySelectorAll('#icAlertasBox .ic-alerta');
    var out = [];
    els.forEach(function(el){
      var sev = ['critico','atencao','info','ok'].find(function(s){return el.classList.contains(s);}) || 'info';
      out.push({
        sev: sev,
        titulo: (el.querySelector('.ic-alerta-titulo')||{}).textContent || '',
        msg: (el.querySelector('.ic-alerta-msg')||{}).innerHTML || '',
        tag: (el.querySelector('.ic-alerta-tag')||{}).textContent || ''
      });
    });
    /* Ordena por severidade (críticos primeiro) e limita a 3 */
    var ordem = {critico:0, atencao:1, info:2, ok:3};
    return out.sort(function(a,b){ return (ordem[a.sev]||9) - (ordem[b.sev]||9); }).slice(0, 3);
  }

  window._imprimirExecutivo = function(){
    if(!_execPermitido()){ alert('Somente ADM/EXTRACLASSE'); return; }
    if(typeof window._mapDados === 'undefined' || !window._mapDados){
      alert('Dados ainda não carregados. Abra a aba Inteligência Comercial e aguarde.');
      return;
    }

    var dados = _execColetar();
    var kpiAt = _execKpis(dados.atuais);
    var kpiAnt = _execKpis(dados.anteriores);
    var topCons = kpiAt.consList.slice(0, 10);
    var totFatTop = topCons.reduce(function(s,c){return s + c.fat;}, 0);
    var maxFatTop = topCons.length ? topCons[0].fat : 1;
    var alertas = _execAlertas(dados.atuais);

    /* Variação vs mês anterior */
    function variacao(at, ant){
      if(!ant) return null;
      return Math.round((at - ant) / ant * 100);
    }
    function varHtml(vat){
      if(vat == null) return '<span class="exec-var-na">—</span>';
      var sym = vat >= 0 ? '▲' : '▼';
      var cls = vat > 0 ? 'up' : (vat < 0 ? 'down' : 'flat');
      return '<span class="exec-var '+cls+'">'+sym+' '+Math.abs(vat)+'%</span>';
    }

    var mesLbl = dados.mesesSel.length === 1
      ? _mesNome(dados.mesesSel[0]) + ' / ' + dados.anoSel
      : dados.mesesSel.length + ' meses / ' + dados.anoSel;
    var mesAntLbl = _mesNome(dados.mesAnt) + '/' + dados.anoAnt;

    _execPctHonradas(function(pctHon, hon, queb){
      var html = ''
+'<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
+'<title>Dashboard Executivo · '+mesLbl+'</title>'
+'<style>'
+'@page{size:A4 landscape;margin:8mm;}'
+'*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
+'body{font-family:"Inter","DM Sans",-apple-system,system-ui,sans-serif;color:#0f1419;background:#fff;font-size:11px;line-height:1.4;}'
+'.pg{width:280mm;min-height:185mm;padding:6mm 8mm;display:flex;flex-direction:column;gap:5mm;}'
+'.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0f1419;padding-bottom:4mm;}'
+'.hdr-l h1{font-size:20px;font-weight:900;letter-spacing:-.5px;}'
+'.hdr-l .sub{font-size:11px;color:#666;font-weight:500;text-transform:uppercase;letter-spacing:.06em;margin-top:2px;}'
+'.hdr-r{text-align:right;}'
+'.hdr-r .data{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.05em;}'
+'.hdr-r .mes{font-size:14px;font-weight:800;color:#0f1419;}'
+'.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;}'
+'.kpi{border:1px solid #d0d4d8;border-radius:3mm;padding:4mm 5mm;display:flex;flex-direction:column;gap:1.5mm;background:#fafbfc;}'
+'.kpi-lbl{font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.07em;font-weight:700;}'
+'.kpi-val{font-size:22px;font-weight:900;color:#0f1419;line-height:1;letter-spacing:-.5px;}'
+'.kpi-var{font-size:10px;font-weight:600;margin-top:1mm;}'
+'.kpi-vs{font-size:8.5px;color:#999;margin-top:1mm;}'
+'.exec-var.up{color:#0a7c4a;}'
+'.exec-var.down{color:#b3261e;}'
+'.exec-var.flat{color:#666;}'
+'.exec-var-na{color:#aaa;}'
+'.body{display:grid;grid-template-columns:2fr 1fr;gap:5mm;flex:1;}'
+'.box{border:1px solid #d0d4d8;border-radius:3mm;padding:4mm;background:#fff;}'
+'.box-t{font-size:11px;font-weight:800;color:#0f1419;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e5e8ec;padding-bottom:2mm;margin-bottom:3mm;}'
+'.cons-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:3mm;align-items:center;padding:1.6mm 0;border-bottom:1px solid #f0f1f4;font-size:10px;}'
+'.cons-row:last-child{border-bottom:none;}'
+'.cons-rk{font-weight:800;color:#666;width:10mm;}'
+'.cons-nm{font-weight:700;color:#0f1419;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:50mm;}'
+'.cons-bar{height:5mm;background:#f0f1f4;border-radius:1mm;position:relative;overflow:hidden;min-width:30mm;}'
+'.cons-bar-fill{height:100%;background:#0f1419;}'
+'.cons-bar-fill.top{background:linear-gradient(90deg,#0a7c4a,#34d399);}'
+'.cons-val{font-variant-numeric:tabular-nums;font-weight:700;color:#0f1419;text-align:right;min-width:24mm;}'
+'.cons-pct{font-size:9px;color:#888;text-align:right;min-width:14mm;font-variant-numeric:tabular-nums;}'
+'.alerts{display:flex;flex-direction:column;gap:2.5mm;}'
+'.alt{border-left:3px solid #888;padding:2.5mm 3mm;background:#fafbfc;border-radius:0 2mm 2mm 0;}'
+'.alt.critico{border-left-color:#b3261e;background:#fdf2f1;}'
+'.alt.atencao{border-left-color:#c47a00;background:#fdf8ef;}'
+'.alt.info{border-left-color:#1a73e8;background:#f0f7fd;}'
+'.alt.ok{border-left-color:#0a7c4a;background:#f0faf5;}'
+'.alt-t{font-size:10.5px;font-weight:800;color:#0f1419;margin-bottom:1mm;}'
+'.alt-m{font-size:9.5px;color:#444;line-height:1.4;}'
+'.alt-m b{color:#0f1419;}'
+'.alt-tag{font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;}'
+'.foot{margin-top:auto;border-top:1px solid #e5e8ec;padding-top:2.5mm;display:flex;justify-content:space-between;font-size:9px;color:#999;}'
+'.no-data{padding:6mm;text-align:center;font-size:11px;color:#999;font-style:italic;}'
+'@media print{.no-print{display:none !important;}}'
+'.print-bar{position:fixed;top:0;left:0;right:0;background:#0f1419;color:#fff;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;z-index:1000;font-family:inherit;}'
+'.print-bar button{background:#34d399;color:#0f1419;border:none;padding:6px 16px;border-radius:4px;font-weight:800;cursor:pointer;font-family:inherit;font-size:11px;}'
+'.print-bar button:hover{background:#86efac;}'
+'.print-bar .close{background:transparent;color:#fff;border:1px solid #444;}'
+'.print-wrap{margin-top:42px;}'
+'@media print{.print-wrap{margin-top:0;}}'
+'</style>'
+'</head><body>'
+'<div class="print-bar no-print">'
+'  <div>📊 Dashboard Executivo · '+mesLbl+'</div>'
+'  <div style="display:flex;gap:8px;">'
+'    <button onclick="window.print()">🖨 Imprimir / Salvar PDF</button>'
+'    <button class="close" onclick="window.close()">Fechar</button>'
+'  </div>'
+'</div>'
+'<div class="print-wrap">'
+'<div class="pg">'

+'<div class="hdr">'
+'  <div class="hdr-l">'
+'    <h1>📊 Inteligência Comercial · Executivo</h1>'
+'    <div class="sub">Febracis · panorama do período</div>'
+'  </div>'
+'  <div class="hdr-r">'
+'    <div class="data">'+_agora()+'</div>'
+'    <div class="mes">'+mesLbl+'</div>'
+'  </div>'
+'</div>'

+'<div class="kpis">'
+'  <div class="kpi">'
+'    <div class="kpi-lbl">Faturamento total</div>'
+'    <div class="kpi-val">'+_fmtR(kpiAt.fatTotal)+'</div>'
+'    <div class="kpi-var">'+varHtml(variacao(kpiAt.fatTotal, kpiAnt.fatTotal))+'</div>'
+'    <div class="kpi-vs">vs '+mesAntLbl+' ('+_fmtR(kpiAnt.fatTotal)+')</div>'
+'  </div>'
+'  <div class="kpi">'
+'    <div class="kpi-lbl">Clientes pagos</div>'
+'    <div class="kpi-val">'+_fmtNum(kpiAt.qtdClientesPagos)+'</div>'
+'    <div class="kpi-var">'+varHtml(variacao(kpiAt.qtdClientesPagos, kpiAnt.qtdClientesPagos))+'</div>'
+'    <div class="kpi-vs">vs '+mesAntLbl+' ('+kpiAnt.qtdClientesPagos+')</div>'
+'  </div>'
+'  <div class="kpi">'
+'    <div class="kpi-lbl">Consultores ativos</div>'
+'    <div class="kpi-val">'+_fmtNum(kpiAt.qtdConsultores)+'</div>'
+'    <div class="kpi-var">'+varHtml(variacao(kpiAt.qtdConsultores, kpiAnt.qtdConsultores))+'</div>'
+'    <div class="kpi-vs">vs '+mesAntLbl+' ('+kpiAnt.qtdConsultores+')</div>'
+'  </div>'
+'  <div class="kpi">'
+'    <div class="kpi-lbl">% Promessas honradas</div>'
+'    <div class="kpi-val">'+(pctHon==null?'—':pctHon+'%')+'</div>'
+'    <div class="kpi-vs">'+(pctHon==null?'sem promessas finalizadas':hon+' honradas · '+queb+' quebradas')+'</div>'
+'  </div>'
+'</div>'

+'<div class="body">'

+'  <div class="box">'
+'    <div class="box-t">Top 10 Consultores · '+_fmtR(totFatTop)+'</div>'
+(topCons.length ? topCons.map(function(c, i){
        var pct = kpiAt.fatTotal ? (c.fat/kpiAt.fatTotal)*100 : 0;
        var bw = Math.round((c.fat/maxFatTop)*100);
        var topClass = i < 3 ? ' top' : '';
        return ''
+'      <div class="cons-row">'
+'        <div class="cons-rk">'+(i+1)+'.</div>'
+'        <div style="display:flex;align-items:center;gap:3mm;">'
+'          <div class="cons-nm">'+c.nome+'</div>'
+'          <div class="cons-bar" style="flex:1;"><div class="cons-bar-fill'+topClass+'" style="width:'+bw+'%;"></div></div>'
+'        </div>'
+'        <div class="cons-val">'+_fmtR(c.fat)+'</div>'
+'        <div class="cons-pct">'+Math.round(pct)+'%</div>'
+'      </div>';
      }).join('') : '<div class="no-data">Sem dados no período</div>')
+'  </div>'

+'  <div class="box">'
+'    <div class="box-t">Alertas críticos</div>'
+'    <div class="alerts">'
+(alertas.length ? alertas.map(function(a){
        return ''
+'      <div class="alt '+a.sev+'">'
+'        <div class="alt-t">'+a.titulo+'</div>'
+'        <div class="alt-m">'+a.msg+'</div>'
+(a.tag ? '        <div class="alt-tag" style="margin-top:1.5mm;">'+a.tag+'</div>' : '')
+'      </div>';
      }).join('') : '<div class="no-data">Nenhum alerta no período</div>')
+'    </div>'
+'  </div>'

+'</div>'

+'<div class="foot">'
+'  <div>Gerado por Inteligência Comercial · Dashboard Febracis</div>'
+'  <div>'+_agora()+'</div>'
+'</div>'

+'</div>'
+'</div>'
+'</body></html>';

      var w = window.open('', '_blank', 'width=1200,height=820');
      if(!w){ alert('Bloqueador de popup ativo — libere para este site e tente de novo.'); return; }
      w.document.open();
      w.document.write(html);
      w.document.close();
    });
  };

})();
