/* ============================================================
   PDF CLIENTES
============================================================ */
var _pdfcDocAtual=null;

function _pdfcHabilitarBotoes(habilitar){
  var btnS=document.getElementById('pdfcBtnSalvar');
  var btnI=document.getElementById('pdfcBtnImprimir');
  if(btnS){btnS.disabled=!habilitar;btnS.style.opacity=habilitar?'1':'.45';btnS.style.cursor=habilitar?'pointer':'not-allowed';}
  if(btnI){btnI.disabled=!habilitar;btnI.style.opacity=habilitar?'1':'.45';btnI.style.cursor=habilitar?'pointer':'not-allowed';}
}

function _pdfcVisualizar(){
  if(typeof window.jspdf==='undefined'){
    if(typeof window._ensureJsPDF==='function'){
      _showToast('⏳ Preparando gerador de PDF (primeira vez)…','var(--muted)');
      window._ensureJsPDF().then(_pdfcVisualizar).catch(function(){
        _showToast('❌ Erro ao carregar jsPDF.','var(--red)');
      });
      return;
    }
    _showToast('❌ jsPDF não carregado.','var(--red)');return;
  }
  var lista=_pdfcOrdenar(_pdfcFiltrar());
  if(!lista.length){_showToast('⚠️ Nenhum cliente com esses filtros.','var(--amber)');return;}

  // Gerar PDF em memória
  _pdfcDocAtual=_pdfcGerar(lista);

  // Mostrar no iframe
  var frame=document.getElementById('pdfcPreviewFrame');
  var placeholder=document.getElementById('pdfcPreviewPlaceholder');
  var uri=_pdfcDocAtual.output('datauristring');
  frame.src=uri;
  frame.style.display='block';
  if(placeholder) placeholder.style.display='none';

  // Habilitar botões
  _pdfcHabilitarBotoes(true);
  _showToast('👁 Preview gerado — '+lista.length+' clientes','var(--accent)');
}

function abrirPdfClientesModal(){
  // Popular selects com dados reais
  var selT=document.getElementById('pdfcFiltroTreinador');
  var selC=document.getElementById('pdfcFiltroConsultor');
  var selTr=document.getElementById('pdfcFiltroTreinamento');
  selT.innerHTML='<option value="">Todos</option>'+allTrainers.map(function(t){return'<option value="'+t+'">'+t+'</option>';}).join('');
  selC.innerHTML='<option value="">Todos</option>'+allConsultors.map(function(c){return'<option value="'+c+'">'+c+'</option>';}).join('');
  selTr.innerHTML='<option value="">Todos</option>'+allTreinamentos.map(function(t){return'<option value="'+t+'">'+t+'</option>';}).join('');
  // Listeners para atualizar contagem
  ['pdfcFiltroTreinador','pdfcFiltroConsultor','pdfcFiltroStatus','pdfcFiltroTreinamento'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){el.onchange=_pdfcAtualizar;}
  });
  _pdfcAtualizar();
  // Resetar preview
  _pdfcDocAtual=null;
  var frame=document.getElementById('pdfcPreviewFrame');
  var placeholder=document.getElementById('pdfcPreviewPlaceholder');
  if(frame){frame.src='about:blank';frame.style.display='none';}
  if(placeholder) placeholder.style.display='flex';
  _pdfcHabilitarBotoes(false);
  document.getElementById('pdfClientesOverlay').classList.add('open');
}

function fecharPdfClientesModal(){
  document.getElementById('pdfClientesOverlay').classList.remove('open');
}

function _pdfcFiltrar(){
  var ft=document.getElementById('pdfcFiltroTreinador').value;
  var fc=document.getElementById('pdfcFiltroConsultor').value;
  var fs=document.getElementById('pdfcFiltroStatus').value;
  var ftr=document.getElementById('pdfcFiltroTreinamento').value;
  return data.filter(function(d){
    if(ft&&d.treinador!==ft) return false;
    if(fc&&d.consultor!==fc) return false;
    if(fs&&d.status!==fs) return false;
    if(ftr&&d.treinamento!==ftr) return false;
    return true;
  });
}

function _pdfcAtualizar(){
  var lista=_pdfcFiltrar();
  var el=document.getElementById('pdfcContagem');
  if(el) el.textContent=lista.length+' cliente'+(lista.length!==1?'s':'');
}

function _pdfcOrdenar(lista){
  var col=document.getElementById('pdfcOrdenarPor').value;
  var dir=document.getElementById('pdfcOrdenarDir').value==='desc'?-1:1;
  return lista.slice().sort(function(a,b){
    var av=a[col],bv=b[col];
    if(typeof av==='number') return (av-bv)*dir;
    return String(av||'').localeCompare(String(bv||''),'pt-BR')*dir;
  });
}

function _pdfcGerar(lista){
  var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  var W=210,mg=14;

  // Cabeçalho
  doc.setFillColor(240,247,235);doc.rect(0,0,W,24,'F');
  doc.setFillColor(46,139,87);doc.rect(0,0,4,24,'F');
  doc.setTextColor(30,30,30);doc.setFontSize(14);doc.setFont('helvetica','bold');
  doc.text(document.getElementById('dashTitle').textContent||'Clientes',mg+2,10);
  doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);
  var ordenadoPor=document.getElementById('pdfcOrdenarPor');
  var ordenadoLabel=ordenadoPor?ordenadoPor.options[ordenadoPor.selectedIndex].text:'';
  doc.text('Gerado em '+new Date().toLocaleString('pt-BR')+' · Ordenado por: '+ordenadoLabel+' · '+lista.length+' clientes',mg+2,18);

  // Filtros aplicados
  var filtros=[];
  var ft=document.getElementById('pdfcFiltroTreinador').value;
  var fc=document.getElementById('pdfcFiltroConsultor').value;
  var fs=document.getElementById('pdfcFiltroStatus').value;
  var ftr=document.getElementById('pdfcFiltroTreinamento').value;
  if(ft)filtros.push('Treinador: '+ft);
  if(fc)filtros.push('Consultor: '+fc);
  if(fs)filtros.push('Status: '+fs.toUpperCase());
  if(ftr)filtros.push('Treinamento: '+ftr);
  if(filtros.length){doc.setTextColor(80,80,80);doc.text('Filtros: '+filtros.join(' · '),mg+2,22);}

  // Tabela
  function _pdfStr(s){return String(s||'').replace(/[\r\n]+/g,' ').trim();}
  var rows=lista.map(function(d){
    return [
      _pdfStr(d.cliente.toUpperCase()),
      _pdfStr(d.treinamento||'—'),
      _pdfStr((d.treinador&&d.treinador!=='-')?d.treinador:'—'),
      _pdfStr(d.consultor.toUpperCase()),
      _pdfStr(formatVal(d.valor)),
      d.status==='pago'?'PAGO':'ABERTO',
      d.entrada>0?_pdfStr(formatVal(d.entrada)):'—'
    ];
  });

  doc.autoTable({
    startY:28,
    head:[['Cliente','Treinamento','Treinador','Consultor','Valor','Status','Entrada']],
    body:rows,
    margin:{left:mg,right:mg},
    styles:{fontSize:7.5,cellPadding:2.5,textColor:[50,50,50],lineColor:[220,220,220],lineWidth:0.15,overflow:'ellipsize',minCellHeight:8,halign:'center'},
    headStyles:{fillColor:[46,139,87],textColor:[255,255,255],fontStyle:'bold',fontSize:7.5,halign:'center'},
    alternateRowStyles:{fillColor:[248,248,248]},
    columnStyles:{
      0:{cellWidth:32,halign:'center'},
      1:{cellWidth:22,halign:'center'},
      2:{cellWidth:31,halign:'center'},
      3:{cellWidth:28,halign:'center'},
      4:{cellWidth:25,halign:'center'},
      5:{cellWidth:20,halign:'center'},
      6:{cellWidth:24,halign:'center'}
    },
    didParseCell:function(data){
      if(data.section==='body'&&data.column.index===5){
        if(data.cell.raw==='PAGO'){data.cell.styles.textColor=[46,139,87];data.cell.styles.fontStyle='bold';}
        else{data.cell.styles.textColor=[180,80,0];data.cell.styles.fontStyle='bold';}
      }
      if(data.section==='body'&&data.column.index===4){
        data.cell.styles.fontStyle='bold';
      }
    },
    theme:'grid'
  });

  // Rodapé com totais
  var totalPago=lista.filter(function(d){return d.status==='pago';}).reduce(function(a,d){return a+d.valor;},0);
  var totalAberto=lista.filter(function(d){return d.status==='aberto';}).reduce(function(a,d){return a+d.valor;},0);
  var totalEntrada=lista.reduce(function(a,d){return a+d.entrada;},0);
  var yFim=doc.lastAutoTable.finalY+6;
  doc.setFontSize(8);doc.setFont('helvetica','bold');doc.setTextColor(30,30,30);
  doc.text('Faturado: '+formatVal(totalPago)+'   Em aberto: '+formatVal(totalAberto)+(totalEntrada>0?'   Entradas: '+formatVal(totalEntrada):''),mg+2,yFim);

  return doc;
}

function gerarPdfClientes(acao){
  if(typeof window.jspdf==='undefined'){
    if(typeof window._ensureJsPDF==='function'){
      _showToast('⏳ Preparando gerador de PDF (primeira vez)…','var(--muted)');
      window._ensureJsPDF().then(function(){ gerarPdfClientes(acao); }).catch(function(){
        _showToast('❌ Erro ao carregar jsPDF.','var(--red)');
      });
      return;
    }
    _showToast('❌ jsPDF não carregado.','var(--red)');return;
  }
  // Usa PDF já gerado no preview, ou gera agora se não tiver
  var lista=_pdfcOrdenar(_pdfcFiltrar());
  if(!lista.length){_showToast('⚠️ Nenhum cliente com esses filtros.','var(--amber)');return;}
  var doc=_pdfcDocAtual||_pdfcGerar(lista);

  fecharPdfClientesModal();
  if(acao==='imprimir'){
    doc.autoPrint();doc.output('dataurlnewwindow');
    _showToast('🖨 Abrindo para impressão...','var(--blue)');
  } else {
    doc.save('clientes-'+new Date().toISOString().slice(0,10)+'.pdf');
    _showToast('💾 PDF salvo!','var(--accent)');
  }
  if(typeof _addPendLog==='function') _addPendLog('PDF Clientes gerado',lista.length+' clientes','📄');
}

