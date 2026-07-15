/* MS Planner · js/exports.js — generación de archivos sin librerías:
   PDF (tarjeta S-21, S-88, resumen de campo, S-1), XLSX (motor ZIP+sheet),
   DOCX (S-13) y reportes. Script CLÁSICO cargado DESPUÉS del principal
   (seguro: estas funciones solo se invocan por onclick, nunca en load). */
/* ---- Tarjeta PDF del publicador (sin librerías) ---- */
function ascii(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\x20-\x7E]/g,'')}
function hex2rg(h){const n=parseInt(h.slice(1),16);return `${((n>>16&255)/255).toFixed(3)} ${((n>>8&255)/255).toFixed(3)} ${((n&255)/255).toFixed(3)}`}
const CARD_W=440,CARD_H=660;
function cardContent(p){
  const W=CARD_W,H=CARD_H,purple=hex2rg('#5B21B6'),violet=hex2rg('#8B5CF6'),white='1 1 1',ink=hex2rg('#1E293B'),gray=hex2rg('#64748B'),line=hex2rg('#E2E8F0'),av=hex2rg(avColor(p.fullName));
  let c='';
  const rect=(x,yTop,w,h,col)=>{c+=`${col} rg\n${x} ${(H-yTop-h).toFixed(1)} ${w} ${h} re f\n`};
  const txt=(x,yTop,size,font,col,str)=>{c+=`BT /${font} ${size} Tf ${col} rg ${x.toFixed(1)} ${(H-yTop).toFixed(1)} Td (${ascii(str).replace(/[()\\]/g,'\\$&')}) Tj ET\n`};
  const tw=(str,size)=>ascii(str).length*size*0.5;
  const ctr=(yTop,size,font,col,str)=>txt((W-tw(str,size))/2,yTop,size,font,col,str);
  rect(0,0,W,140,purple); rect(0,128,W,12,violet);
  txt(24,40,13,'F2',white,'MS PLANNER'); txt(24,60,10,'F1',white,'Registro de publicador');
  const aS=86,aX=(W-aS)/2;rect(aX,96,aS,aS,white);rect(aX+4,100,aS-8,aS-8,av);
  ctr(155,30,'F2',white,initials(p.fullName));
  ctr(240,21,'F2',ink,p.fullName);
  ctr(264,12,'F1',gray,p.role+'  -  '+p.grupo);
  rect(40,292,W-80,1,line);
  const fields=[['Fecha de nacimiento',p.nacimiento?dstr(new Date(p.nacimiento+'T00:00:00')):'-'],['Sexo',p.sex==='M'?'Hombre':'Mujer'],['Fecha de bautismo',p.bautismo?dstr(new Date(p.bautismo+'T00:00:00')):'-'],['Esperanza','Otras ovejas'],['Nombramiento',p.role],['Grupo de predicacion',p.grupo],['Superintendente',p.superintendente],['Ano de servicio','2026']];
  let y=325;fields.forEach(([l,v])=>{txt(40,y,9,'F1',gray,l.toUpperCase());txt(40,y+17,12,'F2',ink,String(v));y+=39});
  rect(0,H-44,W,44,hex2rg('#F5F7FB'));ctr(H-26,9,'F1',gray,'S-21  -  Congregacion Las Flores  -  '+dstr(TODAY));
  return c;
}
function buildMultiPagePDF(pages,W,H){
  // objs: 1 Catalog, 2 Pages, 3 FontF1, 4 FontF2, then per page: pageObj, contentObj
  const objs=['<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
  const kids=[];
  pages.forEach((c,i)=>{const pageNo=5+i*2,contentNo=6+i*2;kids.push(`${pageNo} 0 R`);
    objs[pageNo-1]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNo} 0 R >>`;
    objs[contentNo-1]=`<< /Length ${c.length} >>\nstream\n${c}\nendstream`;});
  objs[1]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
  let pdf='%PDF-1.4\n';const offs=[];
  objs.forEach((o,i)=>{offs.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});
  const xref=pdf.length;pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
  offs.forEach(o=>{pdf+=String(o).padStart(10,'0')+' 00000 n \n'});
  pdf+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Uint8Array.from(pdf,ch=>ch.charCodeAt(0)&0xff);
}
function downloadBlob(name,data,mime){const blob=new Blob([data],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
/* Tarjeta S-21 (REGISTRO DE PUBLICADOR) · PDF FINAL no editable · contenido plano reutilizable */
function cardS21Content(p){
  const isPrec=p.role.includes('Precursor');
  const meses=['Septiembre','Octubre','Noviembre','Diciembre','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto'];
  let totC=0,totH=0;
  const rows=meses.map((m,i)=>{const sd='card'+p.id+i;const partOn=seededBool(sd+'p',0.85);const auxOn=!isPrec&&seededBool(sd+'a',0.14);
    const cursos=partOn?hashStr(sd+'cu')%4:0;const horas=isPrec?(30+hashStr(sd+'h')%46):(auxOn?(15+hashStr(sd+'h')%21):0);
    const nota=seededBool(sd+'n',0.12)?seededPick(['Revisita','Curso nuevo','Exhibidor',''],sd+'nt'):'';
    totC+=cursos;totH+=horas;
    return {m,partOn,auxOn,cursos:cursos||'',horas:horas||'',nota};});
  const W=595,H=842,M=40;
  let c='0 0 0 RG 0.8 w\n';
  const esc=s=>String(s).replace(/[Ā-￿]/g,'').replace(/[()\\]/g,'\\$&');
  const ln=(x1,y1,x2,y2)=>{c+=`${x1} ${(H-y1).toFixed(1)} m ${x2} ${(H-y2).toFixed(1)} l S\n`};
  const txt=(x,yT,sz,f,s)=>{c+=`BT /${f} ${sz} Tf 0 0 0 rg ${x} ${(H-yT).toFixed(1)} Td (${esc(s)}) Tj ET\n`};
  const ctr=(cx,yT,sz,f,s)=>{const w=esc(s).length*sz*0.5;txt(cx-w/2,yT,sz,f,s)};
  // valor plano dibujado en la posición del antiguo campo (no editable)
  const val=(xT,yT,w,h,v,sz,q)=>{if(v==null||v==='')return;sz=sz||9;const s=String(v);const tw=esc(s).length*sz*0.5;const x=q===1?xT+(w-tw)/2:xT+3;const base=yT+h*0.5+sz*0.26;txt(Math.max(xT+2,x),base,sz,'F1',s)};
  // casilla dibujada + marca de verificación si está activa (no editable)
  const CB=(x,yT,on,size)=>{size=size||12;c+=`${x} ${(H-yT-size).toFixed(1)} ${size} ${size} re S\n`;if(on){const s12=size/12,px=v=>(x+v*s12).toFixed(1),py=v=>(H-yT-size+v*s12).toFixed(1);c+=`q 1.3 w ${px(2.5)} ${py(6)} m ${px(5)} ${py(3)} l ${px(9.5)} ${py(9.5)} l S Q\n`;}};
  // ---- título ----
  ctr(W/2,54,13.5,'F2','REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN');
  // ---- identidad ----
  txt(M,90,10,'F2','Nombre:'); val(98,78,454,15,p.fullName,10);
  txt(M,114,10,'F2','Fecha de nacimiento:'); val(185,102,150,15,fmtFecha(p.nacimiento),10);
  CB(372,104,p.sex==='M',12); txt(390,114,10,'F2','Hombre');
  CB(470,104,p.sex==='F',12); txt(488,114,10,'F2','Mujer');
  txt(M,138,10,'F2','Fecha de bautismo:'); val(172,126,150,15,fmtFecha(p.bautismo),10);
  CB(372,128,true,12); txt(390,138,10,'F2','Otras ovejas');
  CB(470,128,false,12); txt(488,138,10,'F2','Ungido');
  const pr=p.role;
  CB(40,155,pr==='Anciano',12); txt(58,164,9,'F2','Anciano');
  CB(106,155,pr==='Siervo Ministerial',12); txt(124,164,9,'F2','Siervo ministerial');
  CB(218,155,pr==='Precursor Regular',12); txt(236,164,9,'F2','Precursor regular');
  CB(324,155,pr==='Precursor Especial',12); txt(342,164,9,'F2','Precursor especial');
  CB(432,155,pr==='Misionero',12); txt(450,164,9,'F2','Misionero que sirve'); txt(450,176,9,'F2','en el campo');
  // ---- tabla (formato S-21) ----
  const cols=[40,113,182,245,312,402,555];const tT=192,hH=52,rowH=27;
  const cc=(a,b)=>(cols[a]+cols[b])/2;
  txt(cols[0]+5,222,7.5,'F2','Año de servicio');
  ctr(cc(1,2),210,6.5,'F2','Participación'); ctr(cc(1,2),219,6.5,'F2','en el'); ctr(cc(1,2),228,6.5,'F2','ministerio');
  ctr(cc(2,3),215,6.5,'F2','Cursos'); ctr(cc(2,3),224,6.5,'F2','bíblicos');
  ctr(cc(3,4),215,6.5,'F2','Precursor'); ctr(cc(3,4),224,6.5,'F2','auxiliar');
  ctr(cc(4,5),207,7,'F2','Horas'); ctr(cc(4,5),215,5.3,'F1','(Si es precursor o'); ctr(cc(4,5),222,5.3,'F1','misionero que sirve'); ctr(cc(4,5),229,5.3,'F1','en el campo)');
  ctr(cc(5,6),223,8,'F2','Notas');
  rows.forEach((r,i)=>{const top=tT+hH+i*rowH;
    txt(cols[0]+5,top+17,9.5,'F1',r.m);
    CB(cc(1,2)-6,top+7,r.partOn,12);
    val(cols[2]+4,top+5,cols[3]-cols[2]-8,17,r.cursos,10,1);
    CB(cc(3,4)-6,top+7,r.auxOn,12);
    val(cols[4]+4,top+5,cols[5]-cols[4]-8,17,r.horas,10,1);
    val(cols[5]+5,top+5,cols[6]-cols[5]-8,17,r.nota,9);});
  const toY=tT+hH+12*rowH;
  const tl='Total';txt(cols[4]-8-tl.length*9*0.5,toY+17,9,'F2',tl);
  val(cols[4]+4,toY+5,cols[5]-cols[4]-8,17,totH||'',10,1);
  // ---- grid ----
  const botB=toY+rowH;
  [40,cols[4],cols[5],555].forEach(x=>ln(x,tT,x,botB));
  [cols[1],cols[2],cols[3]].forEach(x=>ln(x,tT,x,toY));
  ln(40,tT,555,tT); ln(40,tT+hH,555,tT+hH);
  for(let i=1;i<=12;i++)ln(40,tT+hH+i*rowH,555,tT+hH+i*rowH);
  ln(40,botB,555,botB);
  // ---- pie ----
  txt(M,772,8,'F1','S-21-S          11/23');
  return c;
}
function downloadCard(id){const p=DB.find(x=>x.id===id);const nm=String(p.fullName).replace(/[Ā-￿]/g,'').replace(/ /g,'_');downloadBlob(`Registro_${nm}_S-21.pdf`,buildMultiPagePDF([cardS21Content(p)],595,842),'application/pdf');toast('Registro S-21 (PDF final) descargado · '+p.fullName)}
function downloadAllCards(){const pages=pubsActive.map(cardS21Content);downloadBlob('Tarjetas_Las_Flores.pdf',buildMultiPagePDF(pages,595,842),'application/pdf');toast(pages.length+' tarjetas S-21 (PDF final) exportadas')}

/* XLSX export (no libraries) */
const crcTable=(()=>{let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=crcTable[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function s2b(s){return new TextEncoder().encode(s)}
function buildZip(files){
  const u16=n=>[n&0xff,(n>>8)&0xff],u32=n=>[n&0xff,(n>>8)&0xff,(n>>16)&0xff,(n>>24)&0xff];
  const chunks=[],central=[];let offset=0;
  for(const f of files){const nameB=s2b(f.name),crc=crc32(f.data),size=f.data.length;
    const lh=new Uint8Array([].concat(u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(size),u32(size),u16(nameB.length),u16(0)));
    chunks.push(lh,nameB,f.data);
    central.push(new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(size),u32(size),u16(nameB.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset))),nameB);
    offset+=lh.length+nameB.length+f.data.length;}
  let cs=0;central.forEach(c=>cs+=c.length);const co=offset;
  const end=new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cs),u32(co),u16(0)));
  const all=[...chunks,...central,end];let total=0;all.forEach(a=>total+=a.length);
  const out=new Uint8Array(total);let p=0;all.forEach(a=>{out.set(a,p);p+=a.length});return out;
}
function xesc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function colL(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=(i-m-1)/26}return s}
function buildXlsx(rows,sheetName){sheetName=(sheetName||'Datos').replace(/[<>&"']/g,'');
  const sheetRows=rows.map((row,ri)=>`<row r="${ri+1}">${row.map((cell,ci)=>{const ref=colL(ci)+(ri+1);const style=ri===0?' s="2"':'';return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xesc(cell)}</t></is></c>`}).join('')}</row>`).join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="14"/><col min="2" max="2" width="28"/><col min="3" max="3" width="16"/><col min="4" max="4" width="20"/><col min="5" max="5" width="70"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`;
  const wb=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  return buildZip([
    {name:'[Content_Types].xml',data:s2b(ct)},{name:'_rels/.rels',data:s2b(rels)},
    {name:'xl/workbook.xml',data:s2b(wb)},{name:'xl/_rels/workbook.xml.rels',data:s2b(wbRels)},
    {name:'xl/styles.xml',data:s2b(styles)},{name:'xl/worksheets/sheet1.xml',data:s2b(sheet)}]);
}
function exportTerrXlsx(){
  // una columna por cada asignación completada (sin listas dentro de una celda)
  const maxHist=Math.max(...TERR.map(t=>t.hist.length));
  const header=['Territorio','Localidad / Barrio','Última fecha completado'];
  for(let k=1;k<=maxHist;k++)header.push(`Asignado ${k}`,`Fecha asignación ${k}`,`Fecha finalización ${k}`);
  const rows=[header];
  TERR.forEach(t=>{const row=[t.num,`${esc(t.localidad)} / ${esc(t.barrio)}`,t.comp];
    for(let k=0;k<maxHist;k++){const h=t.hist[k];if(h){row.push(h.resp,h.asign,h.comp)}else{row.push('','','')}}
    rows.push(row);});
  downloadBlob('Reporte_Territorios_2026.xlsx',buildXlsx(rows,'Territorios'),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  toast('Reporte exportado · Territorios');
}
/* Reporte S-13 · REGISTRO DE ASIGNACIÓN DE TERRITORIO (Word editable, formato oficial) */
function exportTerrDocx(){
  const wesc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fdate=s=>String(s==null?'':s).replace(/ de /g,' ').replace(/\./g,'').trim();
  const N=4;
  const C1=900,C2=1500,PAIR=Math.floor((10800-C1-C2)/N),COLW=Math.floor(PAIR/2);
  const tc=(text,o)=>{o=o||{};let pr='<w:tcPr>';if(o.w)pr+=`<w:tcW w:w="${o.w}" w:type="dxa"/>`;if(o.span)pr+=`<w:gridSpan w:val="${o.span}"/>`;if(o.vm==='restart')pr+='<w:vMerge w:val="restart"/>';else if(o.vm==='cont')pr+='<w:vMerge/>';pr+='<w:vAlign w:val="center"/>';if(o.shd)pr+='<w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>';pr+='</w:tcPr>';const jc=o.center?'<w:jc w:val="center"/>':'';const sz=o.sz||16;const run=text!==''&&text!=null?`<w:r><w:rPr>${o.bold?'<w:b/>':''}<w:color w:val="404040"/><w:sz w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${wesc(text)}</w:t></w:r>`:'';return `<w:tc>${pr}<w:p><w:pPr>${jc}<w:spacing w:before="20" w:after="20"/><w:rPr><w:sz w:val="${sz}"/></w:rPr></w:pPr>${run}</w:p></w:tc>`;};
  const tr=(cs,hd)=>`<w:tr>${hd?'<w:trPr><w:tblHeader/></w:trPr>':''}${cs.join('')}</w:tr>`;
  const rep=(fn)=>{let s='';for(let k=0;k<N;k++)s+=fn(k);return s;};
  // encabezado tabla (2 filas)
  let table=`<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr>`;
  table+=`<w:tblGrid><w:gridCol w:w="${C1}"/><w:gridCol w:w="${C2}"/>${rep(()=>`<w:gridCol w:w="${COLW}"/><w:gridCol w:w="${COLW}"/>`)}</w:tblGrid>`;
  table+=tr([tc('Núm. de terr.',{w:C1,vm:'restart',shd:1,bold:1,center:1}),tc('Última fecha en que se completó*',{w:C2,vm:'restart',shd:1,bold:1}),rep(()=>tc('Asignado a',{span:2,w:PAIR,shd:1,bold:1,center:1}))],true);
  table+=tr([tc('',{vm:'cont',shd:1}),tc('',{vm:'cont',shd:1}),rep(()=>tc('Fecha en que se asignó',{w:COLW,shd:1,bold:1,center:1,sz:14})+tc('Fecha en que se completó',{w:COLW,shd:1,bold:1,center:1,sz:14}))],true);
  // filas por territorio · 4 bloques máx; continúa el mismo territorio si tiene más
  TERR.forEach(t=>{const h=t.hist;const chunks=Math.max(1,Math.ceil(h.length/N));const uc=t.comp==='—'?'':fdate(t.comp);
    for(let ch=0;ch<chunks;ch++){const off=ch*N;
      table+=tr([tc('#'+t.num,{w:C1,vm:'restart',center:1,bold:1}),tc(uc,{w:C2,vm:'restart',center:1}),rep(k=>tc(h[off+k]?h[off+k].resp:'',{span:2,w:PAIR,center:1}))]);
      table+=tr([tc('',{vm:'cont'}),tc('',{vm:'cont'}),rep(k=>{const x=h[off+k];return tc(x?fdate(x.asign):'',{w:COLW,center:1})+tc(x?fdate(x.comp):'',{w:COLW,center:1});})]);
    }
  });
  table+='</w:tbl>';
  const titulo='<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>REGISTRO DE ASIGNACIÓN DE TERRITORIO</w:t></w:r></w:p>';
  const anio='<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">Año de servicio: 2026</w:t></w:r></w:p>';
  const nota='<w:p><w:pPr><w:spacing w:before="140"/></w:pPr><w:r><w:rPr><w:sz w:val="14"/></w:rPr><w:t xml:space="preserve">*Cuando comience una nueva página, anote en esta columna la última fecha en que los territorios se completaron.          S-13-S  1/22</w:t></w:r></w:p>';
  const sect='<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${titulo}${anio}${table}${nota}${sect}</w:body></w:document>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const bytes=buildZip([{name:'[Content_Types].xml',data:s2b(ct)},{name:'_rels/.rels',data:s2b(rels)},{name:'word/document.xml',data:s2b(doc)}]);
  downloadBlob('Registro_Asignacion_Territorios_S-13.docx',bytes,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  toast('Reporte de territorios (S-13) descargado');
}
/* Mismo reporte S-13 en PDF (impresión/envío) · misma información y formato */
function exportTerrPdf(){
  const W=612,H=792,M=36,tblW=W-2*M,C1=52,C2=84,N=4;
  const PAIR=(tblW-C1-C2)/N,COL=PAIR/2,xP=M+C1+C2;
  const esc=s=>String(s==null?'':s).replace(/[Ā-￿]/g,'').replace(/[()\\]/g,'\\$&');
  const fdate=s=>String(s==null?'':s).replace(/ de /g,' ').replace(/\./g,'').trim();
  const nameLines=(s,maxw,sz)=>{s=String(s);if(s.length*sz*0.5<=maxw)return [s];const ws=s.split(' ');let a='',b='';for(const t of ws){if(!b&&(a?a+' '+t:t).length*sz*0.5<=maxw)a=a?a+' '+t:t;else b=b?b+' '+t:t;}return b?[a,b]:[a];};
  let C='';
  const R=(x,yT,w,h,g)=>C+=`${g} ${g} ${g} rg ${x.toFixed(1)} ${(H-yT-h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f\n`;
  const L=(x1,y1,x2,y2)=>C+=`0 G ${x1.toFixed(1)} ${(H-y1).toFixed(1)} m ${x2.toFixed(1)} ${(H-y2).toFixed(1)} l S\n`;
  const T=(x,yT,sz,f,s)=>C+=`BT /${f} ${sz} Tf 0 g ${x.toFixed(1)} ${(H-yT).toFixed(1)} Td (${esc(s)}) Tj ET\n`;
  const CT=(cx,yT,sz,f,s)=>T(cx-esc(s).length*sz*0.5/2,yT,sz,f,s);
  const HH=52;
  const drawHeader=tt=>{R(M,tt,tblW,HH,0.86);
    CT(M+C1/2,tt+23,7,'F2','Núm. de');CT(M+C1/2,tt+33,7,'F2','terr.');
    CT(M+C1+C2/2,tt+20,7,'F2','Última fecha');CT(M+C1+C2/2,tt+30,7,'F2','en que se');CT(M+C1+C2/2,tt+40,7,'F2','completó*');
    for(let k=0;k<N;k++){const px=xP+k*PAIR;CT(px+PAIR/2,tt+16,8.5,'F2','Asignado a');
      CT(px+COL/2,tt+38,6,'F2','Fecha en que');CT(px+COL/2,tt+46,6,'F2','se asignó');
      CT(px+COL+COL/2,tt+38,6,'F2','Fecha en que');CT(px+COL+COL/2,tt+46,6,'F2','se completó');
      const xin=px+COL;L(xin,tt+27,xin,tt+HH);}
    L(xP,tt+27,M+tblW,tt+27);L(M,tt+HH,M+tblW,tt+HH);return tt+HH;};
  const drawChunk=(t,off,top)=>{const h=t.hist,nameH=19,dTop=top+nameH,bot=top+nameH+13;
    CT(M+C1/2,top+19,8.5,'F2','#'+t.num);
    CT(M+C1+C2/2,top+19,7.5,'F1',t.comp==='—'?'':fdate(t.comp));
    for(let k=0;k<N;k++){const px=xP+k*PAIR,x=h[off+k];
      if(x){const lines=nameLines(x.resp,PAIR-6,7);if(lines.length===1)CT(px+PAIR/2,top+12,7.5,'F1',lines[0]);else{CT(px+PAIR/2,top+9,7,'F1',lines[0]);CT(px+PAIR/2,top+17,7,'F1',lines[1]);}
        CT(px+COL/2,dTop+9,7,'F1',fdate(x.asign));CT(px+COL+COL/2,dTop+9,7,'F1',fdate(x.comp));}
      const xin=px+COL;L(xin,dTop,xin,bot);}
    L(xP,dTop,M+tblW,dTop);L(M,bot,M+tblW,bot);return bot;};
  const endPage=(tt,tb)=>{const fv=[M,M+C1,M+C1+C2];for(let k=1;k<=N;k++)fv.push(xP+k*PAIR);fv.forEach(x=>L(x,tt,x,tb));L(M,tt,M+tblW,tt);};
  const pages=[];const CHU=32;
  C='0.8 w\n';CT(W/2,58,15,'F2','REGISTRO DE ASIGNACIÓN DE TERRITORIO');T(M,84,11,'F2','Año de servicio: 2026');
  let tt=100,y=drawHeader(tt);
  for(const t of TERR){const chunks=Math.max(1,Math.ceil(t.hist.length/N));
    for(let ch=0;ch<chunks;ch++){if(y+CHU>H-M){endPage(tt,y);pages.push(C);C='0.8 w\n';tt=44;y=drawHeader(tt);}y=drawChunk(t,ch*N,y);}}
  endPage(tt,y);pages.push(C);
  downloadBlob('Registro_Asignacion_Territorios_S-13.pdf',buildMultiPagePDF(pages,W,H),'application/pdf');
  toast('Reporte de territorios (PDF) descargado');
}
const XMIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function exportDbFiltered(){if(!requireCap('data.export'))return;const list=filteredDB();if(!list.length){toast('No hay registros para exportar con los filtros actuales');return;}const rows=[['Nombre','Apellidos','Grupo','Privilegios','Nivel de acceso','Estado','Teléfono','Correo','Dirección','Nacimiento','Bautismo']];list.forEach(p=>rows.push([p.nombre,p.apellidos,p.grupo,(p.privilegios||[p.role]).join(', '),p.accessRole||'',p.estado,p.tel,p.email,p.dir,fmtFecha(p.nacimiento),fmtFecha(p.bautismo)]));downloadBlob('Base_de_datos_Las_Flores.xlsx',buildXlsx(rows,'Publicadores'),XMIME);toast(`Base de datos exportada (${list.length} registros) ✓`)}
function repBaseDatos(){const rows=[['Nombre','Grupo','Privilegio','Estado','Teléfono','Correo','Localidad','Superintendente','Auxiliar','Bautismo','Nombramiento']];DB.forEach(p=>rows.push([p.fullName,p.grupo,p.role,p.estado,p.tel,p.email,p.localidad,p.superintendente,p.auxiliar,fmtFecha(p.bautismo),fmtFecha(p.nombramiento)]));downloadBlob('Base_de_datos_Las_Flores.xlsx',buildXlsx(rows,'Publicadores'),XMIME);toast('Base de datos exportada')}
function repPrecursores(){const rows=[['Nombre','Tipo','Grupo','Teléfono','Horas (mes)','Estudios']];DB.filter(p=>p.role==='Precursor Regular').forEach(p=>{const inf=INFORMES.find(r=>r.pub.id===p.id);rows.push([p.fullName,'Precursor Regular',p.grupo,p.tel,String(inf?inf.horas:0),String(inf?inf.estudios:0)])});downloadBlob('Precursores_Regulares.xlsx',buildXlsx(rows,'Precursores'),XMIME);toast('Reporte de precursores exportado')}
function repPublicadores(){const rows=[['Nombre','Grupo','Privilegio','Estado','Teléfono','Correo']];DB.forEach(p=>rows.push([p.fullName,p.grupo,p.role,p.estado,p.tel,p.email]));downloadBlob('Publicadores_Las_Flores.xlsx',buildXlsx(rows,'Publicadores'),XMIME);toast('Reporte de publicadores exportado')}
function repInformes6m(){const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio'];const rows=[['Mes','Informes entregados','Pendientes','Horas reportadas','Estudios bíblicos','Tasa de entrega']];meses.forEach((m,i)=>{const ent=INF_PREV_()-(5-i)*2+i;const e=Math.max(80,Math.min(STATS.total,ent+i*3));rows.push([m,String(e),String(STATS.total-e),String(e*7+rint(50,200)),String(rint(40,90)),Math.round(e/STATS.total*100)+'%'])});downloadBlob('Resumen_Informes_6_meses.xlsx',buildXlsx(rows,'Informes'),XMIME);toast('Resumen de 6 meses exportado')}
function repAsistencia(){const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio'];const rows=[['Mes','Entre semana','Fin de semana','Promedio']];meses.forEach((m,i)=>rows.push([m,String(ATT_MID[i]),String(ATT_WE[i]),String(Math.round((ATT_MID[i]+ATT_WE[i])/2))]));downloadBlob('Asistencia_Las_Flores.xlsx',buildXlsx(rows,'Asistencia'),XMIME);toast('Reporte de asistencia exportado')}
/* ---- Registro de asistencia a reuniones (S-88) · año de servicio sep→ago · PDF final (no editable) ---- */
const MESES_FY=['septiembre','octubre','noviembre','diciembre','enero','febrero','marzo','abril','mayo','junio','julio','agosto'];
const CAL_FY=[8,9,10,11,0,1,2,3,4,5,6,7];
const CURRENT_SY=TODAY.getMonth()>=8?TODAY.getFullYear()+1:TODAY.getFullYear();
function calYear(fy,mi){return mi<=3?fy-1:fy}
function attFilled(fy,mi){const cy=calYear(fy,mi);return cy*12+CAL_FY[mi] < TODAY.getFullYear()*12+TODAY.getMonth()}
function attMonth(fy,mi,type){if(!attFilled(fy,mi))return null;const sd=type+fy+'m'+mi;const reun=2+hashStr(sd+'r')%4;const prom=(type==='mid'?96:98)+hashStr(sd+'p')%42;return {reun,total:reun*prom,prom};}
function attMonthlyAvg(fy,type){let s=0,n=0;for(let mi=0;mi<12;mi++){const d=attMonth(fy,mi,type);if(d){s+=d.prom;n++}}return n?s/n:null}
function openAsistYearSelect(){
  const cur=CURRENT_SY;
  openModalCustom({icon:'people',tint:'t-cyan',title:'Registro de asistencia (S-88)',sub:'Selecciona el año de servicio a generar',
    body:`<p style="font-size:13.5px;color:var(--ink-700);margin-bottom:16px">El <b>año de servicio</b> va de <b>septiembre a agosto</b>. El reporte incluye el año seleccionado y el anterior, lado a lado, en el formato oficial S-88.</p>
      <div class="form-row"><label>Año de servicio</label><select class="select" id="asistFy">
        <option value="${cur}">Actual · ${cur-1}–${cur} (sep ${cur-1} – ago ${cur})</option>
        <option value="${cur-1}">Anterior · ${cur-2}–${cur-1} (sep ${cur-2} – ago ${cur-1})</option>
      </select></div>`,
    footer:`<button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="var fy=+document.getElementById('asistFy').value;closeModal();exportAsistPdf(fy)">${svg('download')}Generar PDF</button>`});
}
function exportAsistPdf(rightFY){
  const W=612,H=792,M=36,tblW=540;const leftFY=rightFY-1;
  const esc=s=>String(s==null?'':s).replace(/[Ā-￿]/g,'').replace(/[()\\]/g,'\\$&');
  const f1=n=>Number(n).toFixed(1).replace('.',',');
  let C='0.8 w\n';
  const R=(x,yT,w,h,g)=>C+=`${g} ${g} ${g} rg ${x.toFixed(1)} ${(H-yT-h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f\n`;
  const L=(x1,y1,x2,y2)=>C+=`0 G ${x1.toFixed(1)} ${(H-y1).toFixed(1)} m ${x2.toFixed(1)} ${(H-y2).toFixed(1)} l S\n`;
  const T=(x,yT,sz,f,s)=>C+=`BT /${f} ${sz} Tf 0 g ${x.toFixed(1)} ${(H-yT).toFixed(1)} Td (${esc(s)}) Tj ET\n`;
  const CTR=(cx,yT,sz,f,s)=>T(cx-esc(s).length*sz*0.5/2,yT,sz,f,s);
  const RT=(xr,yT,sz,f,s)=>T(xr-esc(s).length*sz*0.5,yT,sz,f,s);
  const bx=b=>{const s=M+b*270;return [s,s+95,s+147,s+199,s+270];};
  const drawTable=(top,type)=>{
    const hH=42,rowH=17;R(M,top,tblW,hH,0.88);
    [[0,leftFY],[1,rightFY]].forEach(([b,fy])=>{const e=bx(b);
      CTR((e[0]+e[1])/2,top+15,7,'F2','Año de servicio');CTR((e[0]+e[1])/2,top+31,8,'F2',String(fy));
      CTR((e[1]+e[2])/2,top+17,6.8,'F2','Cantidad de');CTR((e[1]+e[2])/2,top+26,6.8,'F2','reuniones');
      CTR((e[2]+e[3])/2,top+22,6.8,'F2','Asistencia total');
      CTR((e[3]+e[4])/2,top+13,6.8,'F2','Promedio de');CTR((e[3]+e[4])/2,top+21,6.8,'F2','asistencia');CTR((e[3]+e[4])/2,top+29,6.8,'F2','semanal');});
    const hb=top+hH;
    for(let mi=0;mi<12;mi++){const ry=hb+mi*rowH;
      [[0,leftFY],[1,rightFY]].forEach(([b,fy])=>{const e=bx(b);
        T(e[0]+5,ry+12,8,'F1',MESES_FY[mi]+' '+String(calYear(fy,mi)).slice(2));
        const d=attMonth(fy,mi,type);if(d){CTR((e[1]+e[2])/2,ry+12,8,'F1',String(d.reun));CTR((e[2]+e[3])/2,ry+12,8,'F1',String(d.total));CTR((e[3]+e[4])/2,ry+12,8,'F1',f1(d.prom));}});}
    const at=hb+12*rowH,ah=17,tb=at+ah;
    [[0,leftFY],[1,rightFY]].forEach(([b,fy])=>{const e=bx(b);
      RT(e[3]-5,at+12,8,'F2','Promedio de asistencia mensual');const a=attMonthlyAvg(fy,type);if(a!=null)CTR((e[3]+e[4])/2,at+12,8,'F1',f1(a));});
    // grid
    [M,M+199,M+270,M+469,M+540].forEach(x=>L(x,top,x,tb));
    [M+95,M+147,M+365,M+417].forEach(x=>L(x,top,x,at));
    L(M,top,M+tblW,top);L(M,hb,M+tblW,hb);
    for(let mi=1;mi<=12;mi++)L(M,hb+mi*rowH,M+tblW,hb+mi*rowH);
    L(M,tb,M+tblW,tb);return tb;};
  T(M,32,14,'F2','Registro de asistencia a reuniones');RT(M+tblW,32,14,'F2','Las Flores');
  T(M,62,12.5,'F2','Reunión Vida y Ministerio Cristianos');RT(M+tblW,62,11,'F2','Conjunto');
  let b1=drawTable(70,'mid');
  T(M,b1+24,12.5,'F2','Reunión del fin de semana');RT(M+tblW,b1+24,11,'F2','Conjunto');
  drawTable(b1+32,'we');
  T(M,762,9,'F1','S-88');
  downloadBlob(`Registro_Asistencia_S-88_${leftFY}-${rightFY}.pdf`,buildMultiPagePDF([C],W,H),'application/pdf');
  toast('Registro de asistencia (S-88) descargado');
}
/* ---- Resumen del servicio de campo de los publicadores · por mes · PDF final (no editable) ---- */
const MESES_CAL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function openFieldSummarySelect(){
  const opts=[];let y=TODAY.getFullYear(),m=TODAY.getMonth();for(let i=0;i<14;i++){opts.push({y,m});m--;if(m<0){m=11;y--}}
  openModalCustom({icon:'report',tint:'t-cyan',title:'Resumen del servicio de campo',sub:'Selecciona el mes (y grupo) del reporte',
    body:`<div class="form-grid">
      <div class="form-row"><label>Mes</label><select class="select" id="fsMonth">${opts.map((o,i)=>`<option value="${o.y}-${o.m}" ${i===1?'selected':''}>${MESES_CAL[o.m]} ${o.y}</option>`).join('')}</select></div>
      <div class="form-row"><label>Grupo</label><select class="select" id="fsGroup"><option value="-1">Todos los grupos</option>${REAL_GROUPS.map((g,i)=>`<option value="${i}">${g.n} · ${g.sup}</option>`).join('')}</select></div>
    </div>`,
    footer:`<button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="var v=document.getElementById('fsMonth').value.split('-');var g=+document.getElementById('fsGroup').value;closeModal();exportFieldSummaryPdf(+v[0],+v[1],g)">${svg('download')}Generar PDF</button>`});
}
function exportFieldSummaryPdf(y,m,gi){
  const W=612,H=792,ML=30,MR=582;
  const XE=[30,195,227,277,299,345,385,431,469,509,582];
  const esc=s=>String(s==null?'':s).replace(/[Ā-￿]/g,'').replace(/[()\\]/g,'\\$&');
  let C='';
  const R=(x,yT,w,h,g)=>C+=`${g} ${g} ${g} rg ${x.toFixed(1)} ${(H-yT-h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f\n`;
  const L=(x1,y1,x2,y2)=>C+=`0.75 G 0.7 w ${x1.toFixed(1)} ${(H-y1).toFixed(1)} m ${x2.toFixed(1)} ${(H-y2).toFixed(1)} l S\n`;
  const T=(x,yT,sz,f,s,col)=>C+=`BT /${f} ${sz} Tf ${col||'0 0 0'} rg ${x.toFixed(1)} ${(H-yT).toFixed(1)} Td (${esc(s)}) Tj ET\n`;
  const CTR=(cx,yT,sz,f,s,col)=>T(cx-esc(s).length*sz*0.5/2,yT,sz,f,s,col);
  const RT=(xr,yT,sz,f,s,col)=>T(xr-esc(s).length*sz*0.5,yT,sz,f,s,col);
  const cbox=(cx,yTop,sz,on)=>{const x=cx-sz/2,by=H-yTop-sz,ty=H-yTop;C+=`0.25 G 0.8 w ${x.toFixed(1)} ${by.toFixed(1)} ${sz} ${sz} re S\n`;if(on)C+=`0 G 1.2 w ${(x+2).toFixed(1)} ${(by+sz*0.5).toFixed(1)} m ${(x+sz*0.42).toFixed(1)} ${(by+2).toFixed(1)} l ${(x+sz-1.5).toFixed(1)} ${(ty-1.5).toFixed(1)} l S\n`;};
  const nlines=(s,maxw,sz)=>{s=String(s);const words=s.split(' ');const out=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(t.length*sz*0.5<=maxw||!cur)cur=t;else{out.push(cur);cur=w;}if(out.length>=2)break;}if(cur){if(out.length<3)out.push(cur);}return out.slice(0,3);};
  let pubs=DB.filter(p=>gi<0||p.grupoIdx===gi).slice().sort((a,b)=>(a.apellidos+' '+a.nombre).localeCompare(b.apellidos+' '+b.nombre,'es'));
  const monthLabel=MESES_CAL[m]+' '+y;
  const groupLabel=gi<0?'Todos los grupos - Todos':(REAL_GROUPS[gi].n+' - '+REAL_GROUPS[gi].sup);
  const printDate='Impreso '+TODAY.getFullYear()+'/'+String(TODAY.getMonth()+1).padStart(2,'0')+'/'+String(TODAY.getDate()).padStart(2,'0');
  const RED='0.78 0.09 0.09',GREEN='0.13 0.60 0.29',ORANGE='0.90 0.50 0.05',REDD='0.85 0.20 0.15',GRAY='0.55 0.55 0.55',INK='0.13 0.13 0.13';
  const pages=[];let tableTop;
  const colHeaders=top=>{L(ML,top,MR,top);
    CTR((XE[4]+XE[5])/2,top+11,7,'F2','Participó en');CTR((XE[4]+XE[5])/2,top+19,7,'F2','la');CTR((XE[4]+XE[5])/2,top+27,7,'F2','predicación');
    CTR((XE[5]+XE[6])/2,top+13,7,'F2','Cursos');CTR((XE[5]+XE[6])/2,top+22,7,'F2','bíblicos');
    CTR((XE[6]+XE[7])/2,top+13,7,'F2','Precursor');CTR((XE[6]+XE[7])/2,top+22,7,'F2','auxiliar');
    CTR((XE[7]+XE[8])/2,top+18,7.5,'F2','Horas');CTR((XE[8]+XE[9])/2,top+18,7.5,'F2','Crédito');CTR((XE[9]+XE[10])/2,top+18,7.5,'F2','Comentarios');
    L(ML,top+34,MR,top+34);return top+34;};
  const startPage=first=>{C='';let top;
    if(first){T(ML,44,14,'F2','Resumen del servicio de campo de los');T(ML,62,14,'F2','publicadores');RT(MR,52,15,'F2','Las Flores');C+=`0 G 1 w ${ML} ${(H-72).toFixed(1)} m ${MR} ${(H-72).toFixed(1)} l S\n`;
      CTR((ML+MR)/2,94,13,'F2',monthLabel,RED);CTR((ML+MR)/2,112,12,'F2',groupLabel,RED);top=124;}
    else top=40;
    tableTop=top;return colHeaders(top);};
  const endPage=bot=>{XE.forEach(x=>{C+=`0.75 G 0.7 w ${x.toFixed(1)} ${(H-tableTop).toFixed(1)} m ${x.toFixed(1)} ${(H-bot).toFixed(1)} l S\n`;});RT(MR,782,8,'F1',printDate,GRAY);pages.push(C);};
  let y2=startPage(true);
  pubs.forEach(p=>{
    const sd='fs'+p.id+'_'+y+'_'+m;
    const base=p.estado==='Activo'?0.9:p.estado==='Irregular'?0.35:0.05;
    const participo=seededBool(sd+'p',base);
    const isPrec=p.role.includes('Precursor'),isPR=p.role==='Precursor Regular';
    const aux=!isPrec&&seededBool(sd+'a',0.08);
    const cursos=(participo&&seededBool(sd+'cc',0.25))?String(1+hashStr(sd+'cu')%3):'';
    const horas=isPR?String(30+hashStr(sd+'h')%150):(aux?String(15+hashStr(sd+'h')%25):'');
    const credito=seededBool(sd+'cr',0.04)?String(5+hashStr(sd+'cd')%20):'';
    const tipo=p.role==='Anciano'?'ANC':p.role==='Siervo Ministerial'?'SM':p.role==='Publicador no bautizado'?'PNB':'PUB';
    const tipoCol=tipo==='PNB'?GRAY:INK;
    const estCol=p.estado==='Activo'?GREEN:p.estado==='Irregular'?ORANGE:REDD;
    const nm=`${esc(p.fullName)} - ${esc(p.apellidos)}, ${esc(p.nombre)}`;
    const lines=nlines(nm,XE[1]-XE[0]-8,8.5);const rowH=Math.max(24,lines.length*10+7);
    if(y2+rowH>770){endPage(y2);y2=startPage(false);}
    const top=y2,cy=top+rowH/2+3;
    lines.forEach((ln,i)=>T(XE[0]+5,top+13+i*10,8.5,'F1',ln,INK));
    CTR((XE[1]+XE[2])/2,cy,8.5,'F2',tipo,tipoCol);
    T(XE[2]+5,cy,8.5,'F1',p.estado,estCol);
    if(isPR)CTR((XE[3]+XE[4])/2,cy,8.5,'F2','PR',INK);
    cbox((XE[4]+XE[5])/2,cy-6,11,participo);
    if(cursos)CTR((XE[5]+XE[6])/2,cy,8.5,'F1',cursos,INK);
    cbox((XE[6]+XE[7])/2,cy-6,11,aux);
    if(horas)CTR((XE[7]+XE[8])/2,cy,8.5,'F1',horas,INK);
    if(credito)CTR((XE[8]+XE[9])/2,cy,8.5,'F1',credito,INK);
    L(ML,top+rowH,MR,top+rowH);
    y2=top+rowH;
  });
  endPage(y2);
  downloadBlob(`Resumen_Servicio_Campo_${MESES_CAL[m]}_${y}.pdf`,buildMultiPagePDF(pages,W,H),'application/pdf');
  toast('Resumen de servicio de campo descargado · '+monthLabel);
}
/* ---- Servicio de campo y asistencia a reuniones (S-1) · por mes · PDF final (no editable) ---- */
function fsRow(p,y,m){const sd='fs'+p.id+'_'+y+'_'+m;const base=p.estado==='Activo'?0.9:p.estado==='Irregular'?0.35:0.05;const participo=seededBool(sd+'p',base);const isPrec=p.role.includes('Precursor'),isPR=p.role==='Precursor Regular';const aux=!isPrec&&seededBool(sd+'a',0.08);const cursos=(participo&&seededBool(sd+'cc',0.25))?(1+hashStr(sd+'cu')%3):0;const horas=isPR?(30+hashStr(sd+'h')%150):(aux?(15+hashStr(sd+'h')%25):0);return {participo,isPR,aux,cursos,horas};}
function openS1Select(){
  const opts=[];let y=TODAY.getFullYear(),m=TODAY.getMonth();for(let i=0;i<14;i++){opts.push({y,m});m--;if(m<0){m=11;y--}}
  openModalCustom({icon:'chart',tint:'t-violet',title:'Servicio de campo y asistencia (S-1)',sub:'Selecciona el mes del reporte',
    body:`<div class="form-row"><label>Mes</label><select class="select" id="s1Month">${opts.map((o,i)=>`<option value="${o.y}-${o.m}" ${i===1?'selected':''}>${MESES_CAL[o.m]} ${o.y}</option>`).join('')}</select></div>
      <p class="muted" style="font-size:12.5px;margin-top:14px">Se genera un PDF final (no editable), listo para imprimir o distribuir.</p>`,
    footer:`<button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="var v=document.getElementById('s1Month').value.split('-');closeModal();exportS1Pdf(+v[0],+v[1])">${svg('download')}Generar PDF</button>`});
}
function exportS1Pdf(y,m){
  const W=612,H=792,M=40;
  const esc=s=>String(s==null?'':s).replace(/[Ā-￿]/g,'').replace(/[()\\]/g,'\\$&');
  let C='';
  const BOX=(x,top,w,h)=>C+=`0.45 G 0.9 w ${x.toFixed(1)} ${(H-top-h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S\n`;
  const T=(x,yT,sz,f,s,col)=>C+=`BT /${f} ${sz} Tf ${col||'0 0 0'} rg ${x.toFixed(1)} ${(H-yT).toFixed(1)} Td (${esc(s)}) Tj ET\n`;
  const RT=(xr,yT,sz,f,s,col)=>T(xr-esc(s).length*sz*0.5,yT,sz,f,s,col);
  // ---- agregados del mes ----
  let pubN=0,pubC=0,auxN=0,auxH=0,auxC=0,regN=0,regH=0,regC=0;
  DB.forEach(p=>{if(p.estado==='Inactivo')return;const r=fsRow(p,y,m);
    if(r.isPR){if(r.participo){regN++;regC+=r.cursos;regH+=r.horas;}}
    else if(r.aux){if(r.participo){auxN++;auxC+=r.cursos;auxH+=r.horas;}}
    else {if(r.participo){pubN++;pubC+=r.cursos;}}});
  let activos=0;DB.forEach(p=>{let any=false;for(let k=0;k<6;k++){let mm=m-k,yy=y;if(mm<0){mm+=12;yy--}if(fsRow(p,yy,mm).participo){any=true;break;}}if(any)activos++;});
  const promWE=ATT_WE[m];
  const monthLabel=MESES_CAL[m]+' '+y;
  const printDate='Impreso '+TODAY.getFullYear()+'/'+String(TODAY.getMonth()+1).padStart(2,'0')+'/'+String(TODAY.getDate()).padStart(2,'0');
  const GRAY='0.5 0.5 0.5',RED='0.80 0.10 0.10',INK='0.13 0.13 0.13';
  // ---- encabezado ----
  T(M,46,12.5,'F2','SERVICIO DE CAMPO Y ASISTENCIA A REUNIONES (S-1)',GRAY);
  RT(W-M,46,15,'F2','Las Flores',INK);
  C+=`0 G 1 w ${M} ${(H-60).toFixed(1)} m ${W-M} ${(H-60).toFixed(1)} l S\n`;
  T(M,92,20,'F2',monthLabel,RED);
  // ---- recuadro superior ----
  BOX(M,108,W-2*M,132);
  T(M+14,128,12,'F2','Publicadores activos',INK);
  T(M+14,145,10,'F1','Cuente a todas las personas de la congregación que informaron al menos una vez en los últimos 6 meses.',INK);
  T(M+14,169,16,'F1',String(activos),INK);
  T(M+14,204,12,'F2','Promedio de asistencia a las reuniones del fin de semana',INK);
  T(M+14,228,16,'F1',String(promWE),INK);
  // ---- bloques ----
  const BW=320;
  const block=(top,titulo,rows)=>{T(M,top,15,'F2',titulo,INK);const bt=top+10,bh=rows.length*40+8;BOX(M,bt,BW,bh);
    rows.forEach((r,i)=>{const yy=bt+20+i*40;T(M+14,yy,11,'F2',r[0],INK);T(M+14,yy+17,14,'F1',String(r[1]),INK);});return bt+bh;};
  let yb=block(276,'Publicadores',[['Número de informes',pubN],['Cursos bíblicos',pubC]]);
  yb=block(yb+30,'Precursores auxiliares',[['Número de informes',auxN],['Horas',auxH],['Cursos bíblicos',auxC]]);
  block(yb+30,'Precursores regulares',[['Número de informes',regN],['Horas',regH],['Cursos bíblicos',regC]]);
  // ---- pie ----
  RT(W-M,766,9,'F1',printDate,GRAY);
  downloadBlob(`Servicio_Campo_Asistencia_S-1_${MESES_CAL[m]}_${y}.pdf`,buildMultiPagePDF([C],W,H),'application/pdf');
  toast('Reporte S-1 descargado · '+monthLabel);
}
function repPredicacion(){const rows=[['Grupo','Superintendente','Publicadores','Horas (mes)','Cursos bíblicos','Participación']];REAL_GROUPS.forEach((g,i)=>{const m=DB.filter(p=>p.grupoIdx===i);const horas=m.length*rint(6,14);const part=78+hashStr('gp'+i)%20;rows.push([g.n,g.sup,String(m.length),String(horas),String(rint(8,30)),part+'%'])});downloadBlob('Predicacion_Las_Flores.xlsx',buildXlsx(rows,'Predicacion'),XMIME);toast('Reporte de predicación exportado')}
