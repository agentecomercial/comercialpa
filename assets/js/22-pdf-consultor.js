/* ============================================================
   22-pdf-consultor.js — Exportação PDF por consultor
   Extraído de 02-main.js (Fase 2 da modularização)
   Depende de: allConsultors, data, META, _pdfSecs, _pdfConsultores,
               _normalizeUid, formatVal, _showToast (todos em 02-main.js)
============================================================ */

var _pdfSecs={potencial:true,aberto:true,faturado:true,meta:true,pagos:true,em_aberto:true,entrada:true,tabela:true,ranking:true};
var _pdfConsultores={};

function abrirPdfExport(){
  // Tudo deselecionado por padrão
  _pdfConsultores={};
  allConsultors.forEach(function(c){_pdfConsultores[c]=false;});
  Object.keys(_pdfSecs).forEach(function(k){_pdfSecs[k]=false;});

  // Renderizar chips de consultores — todos desativados
  var el=document.getElementById('pdfConsultoresChips');
  el.innerHTML=allConsultors.map(function(c){
    return '<div id="pdfC_'+_normalizeUid(c)+'" class="pdf-chip" onclick="event.stopPropagation();_togglePdfConsultor(\''+c+'\')" style="color:var(--muted);border-color:var(--border2);background:var(--surface2);">'+c+'</div>';
  }).join('');

  // Desativar todos os chips fixos
  var estilosOff={
    pdfChipPagos:   'color:var(--muted);border-color:var(--border2);background:var(--surface2);',
    pdfChipEmAberto:'color:var(--muted);border-color:var(--border2);background:var(--surface2);',
    pdfChipEntrada: 'color:var(--muted);border-color:var(--border2);background:var(--surface2);'
  };
  ['pdfChipPotencial','pdfChipAberto','pdfChipFaturado','pdfChipMeta','pdfChipPagos','pdfChipEmAberto','pdfChipEntrada','pdfChipTabela','pdfChipRanking'].forEach(function(id){
    var e=document.getElementById(id);
    if(!e) return;
    e.classList.remove('on');
    if(estilosOff[id]) e.setAttribute('style',estilosOff[id]);
  });

  document.getElementById('pdfExportOverlay').classList.add('open');
}

function fecharPdfExport(){document.getElementById('pdfExportOverlay').classList.remove('open');}

function togglePdfChip(id,key){
  _pdfSecs[key]=!_pdfSecs[key];
  var el=document.getElementById(id);
  if(!el) return;
  el.classList.toggle('on',_pdfSecs[key]);
  // Atualizar style inline para chips coloridos
  var ativo=_pdfSecs[key];
  var estilos={
    pdfChipPagos:    {on:'color:var(--pago);border-color:rgba(57,255,20,.4);background:rgba(57,255,20,.07);',  off:'color:var(--muted);border-color:var(--border2);background:var(--surface2);'},
    pdfChipEmAberto: {on:'color:var(--amber);border-color:rgba(255,183,64,.4);background:rgba(255,183,64,.07);',  off:'color:var(--muted);border-color:var(--border2);background:var(--surface2);'},
    pdfChipEntrada:  {on:'color:var(--blue);border-color:rgba(96,165,250,.4);background:rgba(96,165,250,.07);',   off:'color:var(--muted);border-color:var(--border2);background:var(--surface2);'}
  };
  if(estilos[id]) el.setAttribute('style', estilos[id][ativo?'on':'off']);
}

function _togglePdfConsultor(nome){
  _pdfConsultores[nome]=!_pdfConsultores[nome];
  var el=document.getElementById('pdfC_'+_normalizeUid(nome));
  if(!el) return;
  var ativo=_pdfConsultores[nome];
  el.classList.toggle('on',ativo);
  el.setAttribute('style', ativo
    ?'color:var(--blue);border-color:rgba(96,165,250,.4);background:rgba(96,165,250,.07);'
    :'color:var(--muted);border-color:var(--border2);background:var(--surface2);'
  );
}

function gerarPdfConsultor(acao){
  if(window._smoke && !window._smoke.gate('gerar PDF do consultor')) return;
  var selecionados=allConsultors.filter(function(c){return _pdfConsultores[c];});
  if(!selecionados.length){_showToast('⚠️ Selecione ao menos um consultor.','var(--amber)');return;}
  var algumStatus=_pdfSecs.pagos||_pdfSecs.em_aberto||_pdfSecs.entrada||_pdfSecs.tabela||_pdfSecs.ranking||_pdfSecs.potencial||_pdfSecs.faturado||_pdfSecs.aberto||_pdfSecs.meta;
  if(!algumStatus){_showToast('⚠️ Selecione ao menos uma seção.','var(--amber)');return;}
  if(typeof window.jspdf==='undefined'){
    if(typeof window._ensureJsPDF==='function'){
      _showToast('⏳ Preparando gerador de PDF (primeira vez)…','var(--muted)');
      window._ensureJsPDF().then(function(){ gerarPdfConsultor(acao); }).catch(function(){
        _showToast('❌ Erro ao carregar jsPDF.','var(--red)');
      });
      return;
    }
    _showToast('❌ jsPDF não carregado.','var(--red)');return;
  }
  var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  var W=210,mg=14,y=mg;
  var titulo=document.getElementById('dashTitle').textContent||'Relatório de Consultores';
  var periodo=document.getElementById('periodBarText').textContent||'';
  function corPct(p){return p>=100?[46,139,87]:p>=75?[30,120,180]:p>=50?[180,140,0]:p>=25?[180,80,0]:[180,30,30];}
  function addPage(){doc.addPage();doc.setFillColor(255,255,255);doc.rect(0,0,W,297,'F');y=mg;}
  function checkY(needed){if(y+needed>280)addPage();}
  // Fundo branco
  doc.setFillColor(255,255,255);doc.rect(0,0,W,297,'F');
  // Cabeçalho
  doc.setFillColor(240,247,235);doc.rect(0,0,W,28,'F');
  doc.setFillColor(46,139,87);doc.rect(0,0,4,28,'F');
  doc.setTextColor(30,30,30);doc.setFontSize(16);doc.setFont('helvetica','bold');
  doc.text(titulo,mg+2,12);
  doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);
  doc.text('Gerado em '+new Date().toLocaleString('pt-BR'),mg+2,20);
  if(periodo)doc.text('Período: '+periodo,mg+2,27);
  y=36;
  var metaInd=allConsultors.length>0?META/allConsultors.length:0;
  selecionados.forEach(function(c){
    var cdA=data.filter(function(d){return d.consultor===c;});

    // Filtrar clientes conforme seleção de status — fonte única de verdade
    var clientesFiltrados=cdA.filter(function(d){
      if(d.status==='pago'&&_pdfSecs.pagos) return true;
      if(d.status==='aberto'&&_pdfSecs.em_aberto) return true;
      return false;
    });
    var pagos=clientesFiltrados.filter(function(d){return d.status==='pago';});
    var abertos=clientesFiltrados.filter(function(d){return d.status==='aberto';});
    var entradaFiltrada=clientesFiltrados.filter(function(d){return d.entrada>0;});

    // Totais baseados nos filtrados
    var totalPago=pagos.reduce(function(a,d){return a+d.valor;},0);
    var totalAberto=abertos.reduce(function(a,d){return a+d.valor;},0);
    var totalVal=clientesFiltrados.reduce(function(a,d){return a+d.valor;},0);
    var pct=metaInd>0?Math.round((totalPago/metaInd)*100):0;
    var rgb=corPct(pct);
    checkY(40);
    // Nome consultor
    doc.setFillColor(245,245,245);doc.setDrawColor(rgb[0],rgb[1],rgb[2]);doc.setLineWidth(0.3);
    doc.roundedRect(mg,y,W-mg*2,10,2,2,'F');
    doc.line(mg,y,mg,y+10);
    doc.setLineWidth(0.2);doc.setDrawColor(220,220,220);doc.roundedRect(mg,y,W-mg*2,10,2,2,'S');
    doc.setTextColor(30,30,30);doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text(c,mg+4,y+7);
    doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.roundedRect(W-mg-22,y+2,20,6,2,2,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(7);doc.setFont('helvetica','bold');doc.text(pct+'% meta',W-mg-12,y+6.5,{align:'center'});
    y+=13;
    // Stats
    var stats=[];
    if(_pdfSecs.potencial)stats.push({l:'Potencial',v:formatVal(totalVal),r:[30,120,180]});
    if(_pdfSecs.aberto)stats.push({l:'Em aberto',v:formatVal(totalAberto),r:[180,100,0]});
    if(_pdfSecs.faturado)stats.push({l:'Faturado',v:formatVal(totalPago),r:[46,139,87]});
    if(_pdfSecs.meta)stats.push({l:'% Meta',v:pct+'%',r:rgb});
    if(stats.length){
      var bw=(W-mg*2-4-(stats.length-1)*2)/stats.length;
      stats.forEach(function(s,si){
        var sx=mg+2+si*(bw+2);
        doc.setFillColor(250,250,250);doc.setDrawColor(220,220,220);doc.setLineWidth(0.2);doc.roundedRect(sx,y,bw,12,1,1,'FD');
        doc.setTextColor(120,120,120);doc.setFontSize(6.5);doc.setFont('helvetica','normal');doc.text(s.l,sx+2,y+4.5);
        doc.setTextColor(s.r[0],s.r[1],s.r[2]);doc.setFontSize(8.5);doc.setFont('helvetica','bold');doc.text(s.v,sx+2,y+10);
      });y+=14;
    }
    // Barra progresso
    doc.setFillColor(220,220,220);doc.roundedRect(mg+2,y,W-mg*2-4,2.5,1,1,'F');
    var barW=(W-mg*2-4)*Math.min(pct/100,1);
    if(barW>0){doc.setFillColor(rgb[0],rgb[1],rgb[2]);doc.roundedRect(mg+2,y,barW,2.5,1,1,'F');}
    y+=7;
    // Pagos
    if(_pdfSecs.pagos&&pagos.length){
      checkY(8+pagos.length*6);
      doc.setFillColor(235,248,240);doc.setDrawColor(180,220,190);doc.setLineWidth(0.2);doc.roundedRect(mg,y,W-mg*2,6,1,1,'FD');
      doc.setTextColor(46,139,87);doc.setFontSize(7);doc.setFont('helvetica','bold');
      doc.text('PAGOS ('+pagos.length+')',mg+3,y+4.2);doc.text(formatVal(totalPago),W-mg-2,y+4.2,{align:'right'});y+=7;
      pagos.forEach(function(d){
        checkY(6);doc.setFillColor(248,252,249);doc.rect(mg,y,W-mg*2,5.5,'F');
        doc.setDrawColor(220,235,220);doc.setLineWidth(0.1);doc.line(mg,y+5.5,W-mg,y+5.5);
        doc.setTextColor(50,50,50);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text(d.cliente.toUpperCase(),mg+3,y+4);doc.text(d.treinamento||'—',mg+65,y+4);
        doc.setTextColor(46,139,87);doc.setFont('helvetica','bold');doc.text(formatVal(d.valor),W-mg-2,y+4,{align:'right'});y+=5.5;
      });y+=4;
    }
    // Em aberto
    if(_pdfSecs.em_aberto&&abertos.length){
      checkY(8+abertos.length*6);
      doc.setFillColor(255,248,235);doc.setDrawColor(220,190,140);doc.setLineWidth(0.2);doc.roundedRect(mg,y,W-mg*2,6,1,1,'FD');
      doc.setTextColor(150,90,0);doc.setFontSize(7);doc.setFont('helvetica','bold');
      doc.text('EM ABERTO ('+abertos.length+')',mg+3,y+4.2);doc.text(formatVal(totalAberto),W-mg-2,y+4.2,{align:'right'});y+=7;
      abertos.forEach(function(d){
        checkY(6);doc.setFillColor(255,252,245);doc.rect(mg,y,W-mg*2,5.5,'F');
        doc.setDrawColor(230,210,180);doc.setLineWidth(0.1);doc.line(mg,y+5.5,W-mg,y+5.5);
        doc.setTextColor(50,50,50);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text(d.cliente.toUpperCase(),mg+3,y+4);doc.text(d.treinamento||'—',mg+65,y+4);
        doc.setTextColor(150,90,0);doc.setFont('helvetica','bold');doc.text(formatVal(d.valor),W-mg-2,y+4,{align:'right'});y+=5.5;
      });y+=4;
    }
    // Com entrada — apenas dos clientes filtrados por status
    if(_pdfSecs.entrada&&entradaFiltrada.length){
      var totalEnt=entradaFiltrada.reduce(function(a,d){return a+d.entrada;},0);
      checkY(8+entradaFiltrada.length*6);
      doc.setFillColor(235,244,255);doc.setDrawColor(160,195,230);doc.setLineWidth(0.2);doc.roundedRect(mg,y,W-mg*2,6,1,1,'FD');
      doc.setTextColor(30,100,180);doc.setFontSize(7);doc.setFont('helvetica','bold');
      doc.text('COM ENTRADA ('+entradaFiltrada.length+')',mg+3,y+4.2);doc.text(formatVal(totalEnt),W-mg-2,y+4.2,{align:'right'});y+=7;
      entradaFiltrada.forEach(function(d){
        checkY(6);doc.setFillColor(245,249,255);doc.rect(mg,y,W-mg*2,5.5,'F');
        doc.setDrawColor(200,220,240);doc.setLineWidth(0.1);doc.line(mg,y+5.5,W-mg,y+5.5);
        doc.setTextColor(50,50,50);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text(d.cliente.toUpperCase(),mg+3,y+4);doc.text(d.treinamento||'—',mg+65,y+4);
        doc.setTextColor(30,100,180);doc.setFont('helvetica','bold');doc.text(formatVal(d.entrada),W-mg-2,y+4,{align:'right'});y+=5.5;
      });y+=4;
    }
    // Tabela completa — respeita filtros de status
    if(_pdfSecs.tabela&&clientesFiltrados.length){
      checkY(20);
      var rows=clientesFiltrados.map(function(d){return[d.cliente.toUpperCase(),d.treinamento||'—',d.treinador&&d.treinador!=='-'?d.treinador:'—',formatVal(d.valor),d.status==='pago'?'Pago':'Aberto',d.entrada>0?formatVal(d.entrada):'—'];});
      doc.autoTable({startY:y,head:[['Cliente','Treinamento','Treinador','Valor','Status','Entrada']],body:rows,margin:{left:mg,right:mg},
        styles:{fontSize:7,cellPadding:2,fillColor:[255,255,255],textColor:[50,50,50],lineColor:[220,220,220],lineWidth:0.15},
        headStyles:{fillColor:[240,240,240],textColor:[80,80,80],fontStyle:'bold',fontSize:7},
        alternateRowStyles:{fillColor:[248,248,248]},
        columnStyles:{0:{cellWidth:50},3:{halign:'right'},4:{halign:'center'},5:{halign:'right'}},theme:'grid'
      });y=doc.lastAutoTable.finalY+8;
    }
    y+=4;
  });
  // Ranking
  if(_pdfSecs.ranking){
    checkY(16+selecionados.length*8);
    doc.setFillColor(245,250,245);doc.setDrawColor(180,220,180);doc.setLineWidth(0.2);doc.roundedRect(mg,y,W-mg*2,12+selecionados.length*8,3,3,'FD');
    doc.setTextColor(46,139,87);doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text('Ranking — Faturado',mg+4,y+8);y+=12;
    var rank=selecionados.map(function(c){return{nome:c,pago:data.filter(function(d){return d.consultor===c&&d.status==='pago';}).reduce(function(a,d){return a+d.valor;},0)};}).sort(function(a,b){return b.pago-a.pago;});
    rank.forEach(function(r,i){
      doc.setTextColor(80,80,80);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text((i+1)+'. '+r.nome,mg+6,y);
      doc.setTextColor(46,139,87);doc.setFont('helvetica','bold');doc.text(formatVal(r.pago),W-mg-4,y,{align:'right'});y+=7;
    });
  }
  fecharPdfExport();
  if(acao==='imprimir'){doc.autoPrint();doc.output('dataurlnewwindow');_showToast('🖨 Abrindo para impressão...','var(--blue)');}
  else if(acao==='salvar'){doc.save('consultores-'+new Date().toISOString().slice(0,10)+'.pdf');_showToast('💾 PDF salvo!','var(--accent)');}
  else{doc.save('consultores-'+new Date().toISOString().slice(0,10)+'.pdf');_showToast('✅ PDF exportado!','var(--accent)');}
}
