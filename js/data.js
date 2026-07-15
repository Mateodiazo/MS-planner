/* MS Planner · js/data.js — modelo de datos de demostración + generadores
   (publicadores, territorios, tareas, informes, anuncios, notificaciones) +
   estado derivado (males/elders/pubsActive/STATS) y refreshStats/refreshDerived.
   Script CLÁSICO (global). Depende solo de seed.js + constants.js. */
const DB=[];
const OTHER_ROLES=['Precursor Regular','Precursor Auxiliar','Publicador','Publicador','Publicador','Publicador','Publicador no bautizado'];
let _id=0;
REAL_GROUPS.forEach((g,gi)=>{
  g.m.forEach(fullName=>{
    _id++;
    const parts=fullName.split(' ');
    const sex=MALE_NAMES.has(fullName)?'M':'F';
    let role; if(fullName===g.sup)role='Anciano'; else if(fullName===g.aux)role='Siervo Ministerial'; else role=seededPick(OTHER_ROLES,fullName+'r');
    const baptized=role!=='Publicador no bautizado';
    const estado=seededPick(['Activo','Activo','Activo','Activo','Activo','Irregular','Inactivo'],fullName+'e');
    const loc=seededPick(LOCALIDADES,fullName+'l');
    let nombre,apellidos;
    if(parts.length>=4){nombre=parts.slice(0,2).join(' ');apellidos=parts.slice(2).join(' ')}
    else if(parts.length===3){nombre=parts[0];apellidos=parts.slice(1).join(' ')}
    else {nombre=parts[0];apellidos=parts[1]||''}
    DB.push({id:_id,nombre,apellidos,fullName,sex,grupoIdx:gi,superintendente:g.sup,auxiliar:g.aux,
      tel:`3${hashStr(fullName)%3}${hashStr(fullName+'x')%10} ${100+hashStr(fullName+'a')%900} ${1000+hashStr(fullName+'b')%9000}`,
      email:(parts[0]+'.'+parts[parts.length-1]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')+'@correo.com',
      nacimiento:diso(daysAgo(7000+hashStr(fullName+'n')%17000)),
      dir:`${seededPick(VIAS,fullName+'v')} ${100+hashStr(fullName+'c')%60} #${90+hashStr(fullName+'d')%40}-${String(10+hashStr(fullName+'f')%80).padStart(2,'0')}, ${seededPick(BARRIOS_BOG[loc],fullName+'bb')}`,
      localidad:loc,grupo:GRUPOS[gi],role,privilegio:role,privilegios:[role],accessRole:defaultAccessRole([role]),estado,
      bautismo:baptized?diso(daysAgo(400+hashStr(fullName+'ba')%8000)):'',
      nombramiento:(role==='Anciano'||role==='Siervo Ministerial')?diso(daysAgo(300+hashStr(fullName+'no')%3700)):'',obs:''});
  });
});
const males=DB.filter(p=>p.sex==='M'&&p.estado!=='Inactivo');
const elders=DB.filter(p=>p.role==='Anciano');
const eldersM=elders.length?elders:males;
const pubsActive=DB.filter(p=>p.estado!=='Inactivo');
const pickMale=()=>pick(males);

/* OVERRIDE STORES (mutaciones del usuario sobre los datos seeded; se persisten en localStorage) */
let MEET_OVR={};   // clave: diso(date)+type+'|'+role → {personId|null, confirmed}
let DISC_OVR={};   // clave: iso domingo → {oradorId,bosq,cancion,tema,cong}
let EXHIB_OVR={};  // clave: exName|iso|slotIdx → 'empty' | [id,id]
let CONG_CFG={};   // configuración general de la congregación (inputs de Config)
/* MEETINGS (only Tue 7:00 p.m. & Sun 8:00 a.m.) */
function mkParts(date,type){
  const key=diso(date)+type;
  const P=(role,opt={})=>{const seed=key+role;const vac=opt.vac&&seededBool(seed+'v',0.12);const person=vac?null:seededPick(males,seed);const part={role,sub:opt.sub,person,confirmed:vac?false:seededBool(seed+'c',0.7),theme:opt.theme};
    const o=MEET_OVR[key+'|'+role];if(o){part.person=o.personId==null?null:(DB.find(x=>String(x.id)===String(o.personId))||part.person);part.confirmed=!!o.confirmed;}
    return part};
  if(type==='mid')return [P('Presidente'),P('Oración inicial'),P('Tesoros de la Biblia',{sub:'10 min'}),P('Busquemos perlas escondidas',{sub:'10 min'}),P('Lectura de la Biblia',{sub:'Estudiante',vac:1}),P('Primera conversación',{sub:'Estudiante',vac:1}),P('Revisita',{sub:'Estudiante',vac:1}),P('Curso bíblico',{sub:'Estudiante',vac:1}),P('Discurso',{sub:'Estudiante',vac:1}),P('Nuestra vida cristiana'),P('Estudio bíblico de la congregación'),P('Audio'),P('Video'),P('Micrófono 1'),P('Micrófono 2'),P('Acomodador 1'),P('Acomodador 2'),P('Oración final',{vac:1})];
  return [P('Presidente'),P('Oración inicial'),P('Discurso público',{theme:seededPick(DISCURSOS,key)}),P('Conductor de La Atalaya'),P('Lector de La Atalaya',{sub:'Estudio Atalaya',vac:1}),P('Audio'),P('Video'),P('Micrófono 1'),P('Micrófono 2'),P('Acomodador 1'),P('Acomodador 2'),P('Oración final',{vac:1})];
}
function meetingMeta(type){return type==='mid'?{time:'7:00 p. m.',title:'Vida y Ministerio Cristianos',cls:'mid'}:{time:'8:00 a. m.',title:'Reunión pública + La Atalaya',cls:'we'}}
function unconfirmedCount(date,type){return mkParts(date,type).filter(p=>!p.confirmed).length}
function upcomingMeetings(n){const res=[];let d=new Date(TODAY);let guard=0;while(res.length<n&&guard<120){const dw=d.getDay();if(dw===2)res.push({date:new Date(d),type:'mid'});if(dw===0)res.push({date:new Date(d),type:'we'});d.setDate(d.getDate()+1);guard++}return res}

/* TERRITORIOS (37) */
const TERR=[];
const terrStateQueue=[];
for(let i=0;i<24;i++)terrStateQueue.push('Completado');
for(let i=0;i<7;i++)terrStateQueue.push('Activo');
for(let i=0;i<4;i++)terrStateQueue.push('Pendiente');
for(let i=0;i<2;i++)terrStateQueue.push('Vencido');
for(let i=terrStateQueue.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[terrStateQueue[i],terrStateQueue[j]]=[terrStateQueue[j],terrStateQueue[i]]}
for(let i=0;i<37;i++){
  const loc=pick(LOCALIDADES);const barrio=pick(BARRIOS_BOG[loc]);const estado=terrStateQueue[i];
  const resp=estado==='Pendiente'?null:pickMale();const asign=daysAgo(rint(5,150));
  const comp=estado==='Completado'?dstr(daysAgo(rint(1,40))):'—';
  const cobertura=estado==='Completado'?`${rint(2,8)} semanas`:(estado==='Vencido'?`${rint(16,30)} semanas`:`${rint(1,10)} semanas`);
  const hist=[];const nh=rint(3,5);let lastD=rint(700,900);
  for(let h=0;h<nh;h++){const a=daysAgo(lastD);lastD-=rint(90,160);const isLast=h===nh-1&&estado!=='Completado'&&chance(.5);
    hist.push({resp:(isLast&&resp?resp.fullName:pickMale().fullName),asign:dstr(a),comp:isLast?'Pendiente':dstr(daysAgo(lastD+rint(20,60))),obs:pick(['Cobertura completa','Pendiente sección norte','Sin novedades','Varios no en casa','Zona de difícil acceso','Completado a tiempo'])});}
  TERR.push({num:String(i+1).padStart(3,'0'),localidad:loc,barrio,resp,estado,asign:estado==='Pendiente'?'—':dstr(asign),comp,cobertura,hist,cuadras:rint(6,20),viviendas:rint(40,180),img:null,maps:null});
}
const NO_PREDICA=[];
for(let i=0;i<14;i++){const loc=pick(LOCALIDADES);NO_PREDICA.push({terr:String(rint(1,37)).padStart(3,'0'),dir:`${dirBogota()}, ${pick(BARRIOS_BOG[loc])}`,localidad:loc,motivo:pick(['Oposición','No molestar','Perro agresivo','Acceso restringido','Solicitud expresa']),fecha:dstr(daysAgo(rint(20,500))),obs:pick(['Residente solicitó no visitar','Conjunto sin acceso','Animal peligroso','Aviso de no visitas'])});}
// territory field-service schedule (calendar): assign a territory + captain to Wed/Sat/Sun
function terrForDate(date){const seed='terr'+diso(date);const idx=hashStr(seed)%37;const t=TERR[idx];const past=diso(date)<diso(TODAY);return {num:t.num,captain:seededPick(males,seed+'c').fullName,estado:past?'Completado':(seededBool(seed+'e',0.5)?'Pendiente':'En progreso')}}

/* EXHIBIDORES (2) — Dom a Dom, 7am-7pm, turnos de 2h, 2 personas */
const EXHIB_NAMES=['El Solar','Lombardía'];
const TURN_SLOTS=[['7:00','9:00'],['9:00','11:00'],['11:00','13:00'],['13:00','15:00'],['15:00','17:00'],['17:00','19:00']];
const DOW_FULL=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DOW_ABBR=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
function exhibTurn(exName,date,slotIdx){const ov=EXHIB_OVR[exName+'|'+diso(date)+'|'+slotIdx];
  if(ov!==undefined){if(ov==='empty')return null;const a=DB.find(x=>String(x.id)===String(ov[0])),b=DB.find(x=>String(x.id)===String(ov[1]));if(a&&b)return [a,b];}
  const seed=exName+diso(date)+slotIdx;if(seededBool(seed+'empty',0.22))return null;return [seededPick(pubsActive,seed+'a'),seededPick(pubsActive,seed+'b')]}
function weekDates(offset=0){const d=new Date(TODAY);d.setDate(d.getDate()-d.getDay()+offset*7);return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return x})}

/* TAREAS (15) */
const TASK_TITLES=['Revisar territorios vencidos','Actualizar informe de grupo','Preparar discurso público','Coordinar aseo del Salón','Confirmar oradores visitantes','Revisar solicitudes de precursorado','Organizar predicación especial','Actualizar lista de exhibidores','Contactar publicadores irregulares','Planear visita del superintendente','Revisar cuentas mensuales','Asignar nuevos territorios','Preparar reunión de servicio','Verificar equipo de sonido','Actualizar datos de contacto'];
const TASKS=[];
for(let i=0;i<15;i++){const r=rng();const estado=r<.55?'Pendiente':'Completada';const creadaD=daysAgo(rint(2,30));const limiteD=daysFwd(rint(-3,21));
  TASKS.push({id:i+1,titulo:TASK_TITLES[i],desc:pick(['Coordinar con el cuerpo de ancianos antes de la fecha límite.','Revisar y documentar el estado actual con observaciones.','Asegurar que todos los involucrados estén notificados.','Validar la información y reportar avances al coordinador.']),creadoPor:pick(eldersM).fullName,asignadoA:pick(eldersM),creada:dstr(creadaD),creadaD,limite:dstr(limiteD),limiteD,prioridad:pick(['Alta','Media','Baja']),estado,progreso:estado==='Completada'?100:estado==='En proceso'?rint(25,80):rint(0,15)});}

/* INFORMES */
const INFORMES=DB.map(p=>{const entregado=chance(.78);return {pub:p,entregado,horas:entregado?(p.role.includes('Precursor')?rint(30,75):rint(1,18)):0,estudios:entregado?rint(0,8):0,auxiliar:p.role==='Precursor Regular'||p.role==='Precursor Auxiliar'}});

/* ANUNCIOS / NOTIFS */
const ANUNCIOS=[
  {ico:'flag',tint:'t-brand',t:'Asamblea de circuito',d:'18-19 de julio · circuito CO-12. Registro abierto.',time:'Hace 2 h'},
  {ico:'star',tint:'t-amber',t:'Visita del superintendente',d:'Semana del 13 de julio. Preparar informes.',time:'Hace 1 d'},
  {ico:'people',tint:'t-green',t:'Nuevos precursores auxiliares',d:'5 publicadores se inscribieron para julio.',time:'Hace 2 d'},
  {ico:'home',tint:'t-violet',t:'Aseo del Salón del Reino',d:'Sábado 4 de julio · grupos 1 y 2.',time:'Hace 3 d'},
];
const EVENTS=[
  {i:'flag',t:'t-brand',n:'Asamblea de circuito',d:'18-19 jul · Estadio del circuito'},
  {i:'star',t:'t-amber',n:'Visita del superintendente',d:'13 jul · Semana de actividades'},
  {i:'home',t:'t-violet',n:'Aseo del Salón',d:'4 jul · Grupos 1 y 2'},
  {i:'people',t:'t-green',n:'Reunión de servicio',d:'27 jul · Todos los grupos'},
];
const NOTIF_TYPES=[{type:'Nueva asignación',ico:'calendar',tint:'t-brand'},{type:'Recordatorio (7 días)',ico:'clock',tint:'t-cyan'},{type:'Recordatorio (1 día)',ico:'clock',tint:'t-amber'},{type:'Recordatorio (1 hora)',ico:'bell',tint:'t-red'},{type:'Cambio de asignación',ico:'refresh',tint:'t-violet'},{type:'Informe pendiente',ico:'report',tint:'t-amber'},{type:'Territorio asignado',ico:'map',tint:'t-green'},{type:'Nueva tarea',ico:'tasks',tint:'t-brand'},{type:'Nuevo anuncio',ico:'flag',tint:'t-pink'}];
const NOTIFS=[];
for(let i=0;i<14;i++){const t=pick(NOTIF_TYPES);const who=pickMale();
  const msgs={'Nueva asignación':`Se asignó "${pick(DISCURSOS)}" a ${who.fullName}.`,'Recordatorio (7 días)':`La reunión del domingo es en 7 días.`,'Recordatorio (1 día)':`Mañana: ${who.fullName} tiene asignación de micrófonos.`,'Recordatorio (1 hora)':`En 1 hora inicia la reunión del martes.`,'Cambio de asignación':`${who.fullName} reasignó su parte de lectura.`,'Informe pendiente':`${rint(8,33)} publicadores aún no entregan su informe.`,'Territorio asignado':`Territorio ${String(rint(1,37)).padStart(3,'0')} asignado a ${who.fullName}.`,'Nueva tarea':`${pick(eldersM).fullName} te asignó una nueva tarea.`,'Nuevo anuncio':`Se publicó un nuevo anuncio para la congregación.`};
  const mins=i<3?rint(5,55):i<7?rint(2,9)*60:rint(1,5)*1440;const timeStr=mins<60?`Hace ${mins} min`:mins<1440?`Hace ${Math.round(mins/60)} h`:`Hace ${Math.round(mins/1440)} d`;
  NOTIFS.push({...t,msg:msgs[t.type],time:timeStr,read:i>4,date:new Date(TODAY.getTime()-mins*60000)});}

/* STATS (dinámicos: refreshStats() recalcula tras cada mutación; go() lo invoca antes de renderizar) */
let STATS={};
function refreshStats(){STATS={total:DB.length,ancianos:DB.filter(p=>p.role==='Anciano').length,siervos:DB.filter(p=>p.role==='Siervo Ministerial').length,precReg:DB.filter(p=>p.role==='Precursor Regular').length,precAux:DB.filter(p=>p.role==='Precursor Auxiliar').length,noBaut:DB.filter(p=>p.role==='Publicador no bautizado').length,
  infPend:INFORMES.filter(r=>!r.entregado).length,infEntreg:INFORMES.filter(r=>r.entregado).length,
  terrTotal:TERR.length,terrComp:TERR.filter(t=>t.estado==='Completado').length,terrActivos:TERR.filter(t=>t.estado==='Activo').length,terrPend:TERR.filter(t=>t.estado==='Pendiente'||t.estado==='Activo'||t.estado==='Vencido').length,terrVenc:TERR.filter(t=>t.estado==='Vencido').length,
  asignPend:upcomingMeetings(8).reduce((a,m)=>a+unconfirmedCount(m.date,m.type),0),tareasPend:TASKS.filter(t=>t.estado!=='Completada').length};}
refreshStats();
function refreshDerived(){males.length=0;DB.filter(p=>p.sex==='M'&&p.estado!=='Inactivo').forEach(p=>males.push(p));elders.length=0;DB.filter(p=>p.role==='Anciano').forEach(p=>elders.push(p));pubsActive.length=0;DB.filter(p=>p.estado!=='Inactivo').forEach(p=>pubsActive.push(p));refreshStats();}

