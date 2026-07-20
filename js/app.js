/* MS Planner · js/app.js — entry point del panel admin (script principal).
   Extraído del HTML inline para permitir CSP script-src 'self' (Fase 3).
   Es un ES module: importa de las hojas y publica sus símbolos en window
   (puente de compatibilidad para los onclick inline hasta el event delegation). */
/* Fase b.2: imports ES reales desde los módulos hoja (el puente window queda de respaldo) */
import {svg} from './icons.js';
import {esc, overLimit} from './dom.js';
import {chance, hashStr, pick, rint, seededBool, seededPick} from './seed.js';
import {ACCESS_ROLES, DISCURSOS, GRUPOS, LOCALIDADES, PRIVILEGIOS, REAL_GROUPS, ROLES, TODAY, avColor, daysAgo, daysFwd, defaultAccessRole, diso, dlong, dshort, dstr, initials, primaryPriv} from './constants.js';
/* NOTA: CONG_CFG, DISC_OVR, EXHIB_OVR, MEET_OVR NO se importan porque el principal
   los REASIGNA (los bindings importados son read-only); se resuelven vía el puente
   window de data.js, cuyo setter permite reasignarlos. */
import {ANUNCIOS, DB, DOW_ABBR, EVENTS, EXHIB_NAMES, INFORMES, NOTIFS, NOTIF_TYPES, NO_PREDICA, STATS, TASKS, TERR, TURN_SLOTS, eldersM, exhibTurn, males, meetingMeta, mkParts, pubsActive, refreshDerived, refreshStats, terrForDate, unconfirmedCount, upcomingMeetings, weekDates} from './data.js';
import {CURRENT_SY, downloadAllCards, downloadCard, exportDbFiltered, exportTerrDocx, exportTerrPdf, openAsistYearSelect, openFieldSummarySelect, openS1Select, repBaseDatos, repInformes6m, repPrecursores, repPredicacion} from './exports.js';

/* LOGO (MS Planner) */
function logoSVG(){return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="msg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#4c1d95"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#msg)"/><circle cx="24" cy="24" r="15" fill="none" stroke="#a78bfa" stroke-width="2" opacity=".55"/><path d="M14 16c4 2 16 2 20 0" fill="none" stroke="#a78bfa" stroke-width="1.6" opacity=".4"/><path d="M14 32c4-2 16-2 20 0" fill="none" stroke="#a78bfa" stroke-width="1.6" opacity=".4"/><text x="24" y="30" font-family="Inter,Arial" font-size="17" font-weight="800" fill="#fff" text-anchor="middle">MS</text></svg>`}
document.getElementById('brandLogo').innerHTML=logoSVG();

/* NAV */
const NAV=[
  {sec:'Principal',items:[{id:'dashboard',label:'Dashboard',ico:'dashboard'},{id:'programaciones',label:'Programaciones',ico:'calendar',badge:STATS.asignPend,cap:'program.manage'},{id:'asistencia',label:'Asistencia',ico:'people',cap:'stats.view'}]},
  {sec:'Congregación',items:[{id:'database',label:'Base de datos',ico:'db',cap:'personal.view'},{id:'territorios',label:'Mapas y Territorios',ico:'map',cap:'territory.manage'},{id:'exhibidores',label:'Exhibidores',ico:'display',cap:'assign.manage'},{id:'usuarios',label:'Usuarios',ico:'shield',cap:'users.manage'}]},
  {sec:'Análisis',items:[{id:'informes',label:'Informes Mensuales',ico:'report',badge:STATS.infPend,cap:'stats.view'},{id:'actividad',label:'Actividad',ico:'bell',badge:activityPending()},{id:'reportes',label:'Reportes',ico:'chart',cap:'reports.download'},{id:'ia',label:'AI Insights',ico:'star',cap:'stats.view'}]},
];
/* Capacidad requerida por vista (para ocultar del menú y bloquear navegación directa) */
const VIEW_CAP={programaciones:'program.manage',asistencia:'stats.view',database:'personal.view',territorios:'territory.manage',exhibidores:'assign.manage',usuarios:'users.manage',informes:'stats.view',reportes:'reports.download',ia:'stats.view',config:'config.general'};
const TITLES={dashboard:'Dashboard',programaciones:'Programaciones',reuniones:'Reuniones',asistencia:'Asistencia',actividad:'Actividad',tareas:'Actividad',database:'Base de datos',territorios:'Mapas y Territorios',exhibidores:'Exhibidores',usuarios:'Usuarios',informes:'Informes Mensuales',reportes:'Reportes',ia:'AI Insights',notificaciones:'Actividad',config:'Configuración de la Congregación'};
let currentView='dashboard';
function navBadge(id){if(id==='actividad')return activityPending();if(id==='informes')return STATS.infPend;if(id==='programaciones')return STATS.asignPend;return 0}
function renderNav(){document.getElementById('nav').innerHTML=NAV.map(s=>{const items=s.items.filter(it=>!it.cap||can(it.cap));if(!items.length)return '';return `<div class="nav-section-title">${s.sec}</div>${items.map(it=>{const badge=navBadge(it.id);return `<div class="nav-item ${it.id===currentView?'active':''}" ${it.id===currentView?'aria-current="page"':''} data-click="go" data-click-args='["${it.id}"]' data-tip="${it.label}" title="${it.label}">${svg(it.ico)}<span class="nav-label">${it.label}</span>${badge?`<span class="nav-badge ${it.badgeMuted?'muted':''}">${badge}</span>`:''}</div>`}).join('')}`}).join('')}
function go(id){refreshStats();if(VIEW_CAP[id]&&!can(VIEW_CAP[id])){id='dashboard';}currentView=id;renderNav();document.getElementById('breadcrumbs').innerHTML=`<span>Las Flores</span><span class="sep">${svg('chevR')}</span><b>${TITLES[id]}</b>`;closeMobileNav();const c=document.getElementById('content');c.innerHTML='';c.scrollTop=0;VIEWS[id]()}

/* SHARED UI */
function avatarHTML(name,cls='av-sm'){return `<div class="${cls}" style="background:${avColor(name)}">${initials(name)}</div>`}
function pageHead(t,s,a=''){return `<div class="page-head"><div><div class="page-title">${t}</div><div class="page-sub">${s}</div></div><div class="actions">${a}</div></div>`}
function confBadge(c){return c?`<span class="badge green">${svg('check')}Confirmado</span>`:`<span class="badge amber">${svg('clock')}Por confirmar</span>`}
function estadoBadge(e){const m={'Activo':'green','Irregular':'amber','Inactivo':'gray','Completado':'green','Pendiente':'amber','Vencido':'red','En progreso':'blue'};const ic={'Activo':'check','Irregular':'warn','Inactivo':'pause','Completado':'check','Pendiente':'clock','Vencido':'warn','En progreso':'refresh'};const i=ic[e];return `<span class="badge ${m[e]||'gray'}">${i?svg(i):'<span class="bdot"></span>'}${e}</span>`}
function prioBadge(p){const m={Alta:'red',Media:'amber',Baja:'blue'};return `<span class="badge ${m[p]}">${p}</span>`}
function roleBadge(r){const m={'Anciano':'violet','Siervo Ministerial':'cyan','Precursor Regular':'green','Precursor Auxiliar':'blue','Publicador no bautizado':'amber','Publicador':'gray','Inactivo':'gray'};return `<span class="badge ${m[r]||'gray'}">${r}</span>`}
function fmtFecha(iso){if(!iso)return '—';return dstr(new Date(iso+'T00:00:00'))}
const VIEWS={};

/* -------- DASHBOARD -------- */
/* Datos de asistencia (reutilizados por módulo Asistencia) */
const ATT_LABELS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const ATT_MID=ATT_LABELS.map((_,i)=>85+hashStr('amid'+i)%26);
const ATT_WE=ATT_LABELS.map((_,i)=>108+hashStr('awe'+i)%34);
const ATT_CAP=150;
function INF_ACTUAL_(){return STATS.infEntreg}
function INF_PREV_(){return Math.min(STATS.total,STATS.infEntreg+(hashStr('ip')%9)-3)}
const INF_NEXT=0;

function renderPublisherHome(){
  const u=CURRENT_USER||{name:'Publicador'};
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Hola, '+(u.name?u.name.split(' ')[0]:'')+' 👋','Tu espacio personal de publicador · Congregación Las Flores','')}
    <div class="card" style="margin-bottom:20px;background:linear-gradient(120deg,var(--brand-50),var(--violet-50));border-color:var(--brand-200)"><div class="card-pad" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div class="kpi-ico t-brand" style="width:48px;height:48px;background:var(--brand-500);color:#fff">${svg('user')}</div>
      <div style="flex:1;min-width:200px"><b style="font-size:16px">Bienvenido a MS Planner</b><p style="color:var(--ink-500);font-size:13px;margin-top:3px">Desde aquí podrás consultar tu programa, ver y confirmar tus asignaciones y reportar tu predicación. Tu acceso de <b>Publicador</b> está activo.</p></div>
    </div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
      ${[
        {i:'calendar',t:'t-brand',n:'Mi programa',d:'Tus próximas reuniones y partes.',fn:"toast('Tu programa estará disponible próximamente')"},
        {i:'check',t:'t-green',n:'Mis asignaciones',d:'Confirma o rechaza lo asignado.',fn:"toast('Tus asignaciones estarán disponibles próximamente')"},
        {i:'report',t:'t-violet',n:'Reportar predicación',d:'Envía tu informe mensual.',fn:"toast('El reporte de predicación estará disponible próximamente')"},
        {i:'bell',t:'t-amber',n:'Notificaciones',d:'Avisos y recordatorios.',fn:"go('actividad')"},
        {i:'user',t:'t-cyan',n:'Mi perfil',d:'Edita tus datos y preferencias.',fn:"openUserConfig()"}
      ].map(c=>`<button type="button" onclick="${c.fn}" style="text-align:left;border:1.5px solid var(--border);border-radius:14px;padding:18px;background:var(--surface);cursor:pointer;transition:.15s" data-mouseover="hoverTintOn" data-mouseout="hoverTintOff"><div class="kpi-ico ${c.t}" style="width:40px;height:40px;margin-bottom:11px">${svg(c.i)}</div><b style="font-size:14px;display:block">${c.n}</b><p style="font-size:12.5px;color:var(--ink-500);margin-top:3px;line-height:1.45">${c.d}</p></button>`).join('')}
    </div>
    <p class="muted" style="font-size:12px;margin-top:22px;text-align:center">La experiencia completa del Publicador está en desarrollo. Por ahora puedes editar tu perfil y ver tus notificaciones.</p>
  </div>`;
}
function renderOpsDashboard(){
  const kpis=[
    {v:STATS.terrActivos,l:'Territorios activos',ico:'map',t:'t-green'},
    {v:STATS.terrVenc,l:'Territorios vencidos',ico:'warn',t:'t-red'},
    {v:STATS.asignPend,l:'Asignaciones por confirmar',ico:'clock',t:'t-amber'},
    {v:TERR_ASIGN.length,l:'Salidas de predicación',ico:'calendar',t:'t-brand'}
  ];
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Panel operativo','Programa, asignaciones y territorios · Congregación Las Flores','')}
    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fill,minmax(185px,1fr))">${kpis.map(k=>`<div class="kpi"><div class="kpi-top"><div class="kpi-ico ${k.t}">${svg(k.ico)}</div></div><div class="kpi-val">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}</div>
    <div class="dash-rowlabel">Accesos rápidos</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
      ${[{i:'calendar',t:'t-brand',n:'Programa de reuniones',d:'Partes y asignaciones.',v:'programaciones'},{i:'map',t:'t-green',n:'Territorios',d:'Entrega y devolución.',v:'territorios'},{i:'display',t:'t-cyan',n:'Exhibidores',d:'Turnos de predicación pública.',v:'exhibidores'},{i:'bell',t:'t-amber',n:'Actividad',d:'Tus tareas y avisos.',v:'actividad'}].map(c=>`<button type="button" data-click="go" data-click-args='["${c.v}"]' style="text-align:left;border:1.5px solid var(--border);border-radius:14px;padding:18px;background:var(--surface);cursor:pointer;transition:.15s" data-mouseover="hoverTintOn" data-mouseout="hoverTintOff"><div class="kpi-ico ${c.t}" style="width:40px;height:40px;margin-bottom:11px">${svg(c.i)}</div><b style="font-size:14px;display:block">${c.n}</b><p style="font-size:12.5px;color:var(--ink-500);margin-top:3px">${c.d}</p></button>`).join('')}
    </div></div>`;
}
VIEWS.dashboard=()=>{
  if(userLevel()>=4){return renderPublisherHome();}
  if(userLevel()===3){return renderOpsDashboard();}
  const cobertura=Math.round(STATS.terrComp/STATS.terrTotal*100);
  const irregulares=DB.filter(p=>p.estado==='Irregular').length;
  const next=upcomingMeetings(1)[0];
  // asignaciones sin confirmar próximas 2 semanas
  const horizon=daysFwd(14);const meets2=upcomingMeetings(10).filter(m=>m.date<=horizon);
  let unconfList=[];meets2.forEach(m=>{mkParts(m.date,m.type).forEach(p=>{if(!p.confirmed&&p.person)unconfList.push({role:p.role,person:p.person,date:m.date,type:m.type})})});
  const tareasPend=TASKS.filter(t=>t.estado==='Pendiente');
  const midPct=Math.round(ATT_MID[5]/ATT_CAP*100),wePct=Math.round(ATT_WE[5]/ATT_CAP*100);
  const infPct=Math.round(INF_ACTUAL_()/STATS.total*100);
  const general=Math.round((cobertura+infPct+Math.round((midPct+wePct)/2))/3);
  const kpis=[
    {v:STATS.total,l:'Publicadores',ico:'people',t:'t-brand',tr:'up',trv:'+4'},
    {v:STATS.ancianos+STATS.siervos,l:'Ancianos y siervos',ico:'shield',t:'t-violet',tr:'flat',trv:'0'},
    {v:STATS.precReg+STATS.precAux,l:'Precursores',ico:'flag',t:'t-green',tr:'up',trv:'+2'},
    {v:STATS.infPend,l:'Informes pendientes',ico:'report',t:'t-red',tr:'down',trv:'-6'},
    {v:STATS.terrActivos,l:'Territorios activos',ico:'map',t:'t-green',tr:'up',trv:'+3'},
    {v:STATS.asignPend,l:'Asignaciones por confirmar',ico:'clock',t:'t-amber',tr:'down',trv:'-4'},
  ];
  const rolesData=[{l:'Publicadores',v:DB.filter(p=>p.role==='Publicador').length,c:'#94a3b8'},{l:'Precursores',v:STATS.precReg+STATS.precAux,c:'#22C55E'},{l:'Siervos M.',v:STATS.siervos,c:'#06b6d4'},{l:'Ancianos',v:STATS.ancianos,c:'#8B5CF6'},{l:'No bautiz.',v:STATS.noBaut,c:'#F59E0B'}];
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Buenos días, Paublo 👋','Centro de control · Congregación Las Flores · '+dstr(TODAY),
      `${can('comm.send')?`<button class="btn" data-click="openComm">${svg('send')}Enviar notificación</button>`:''}<button class="btn primary" data-click="go" data-click-args='["programaciones"]'>${svg('calendar')}Ver calendario</button>`)}
    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fill,minmax(185px,1fr))">${kpis.map(k=>`<div class="kpi"><div class="kpi-top"><div class="kpi-ico ${k.t}">${svg(k.ico)}</div><span class="kpi-trend ${k.tr}">${k.tr==='down'?'▼':k.tr==='up'?'▲':'•'} ${k.trv}</span></div><div class="kpi-val">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}</div>

    <div class="dash-rowlabel">Indicadores y gráficas</div>
    <div class="dash-grid">
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-green" style="width:32px;height:32px">${svg('map')}</div><h3>Cobertura de territorios</h3></div>
        <div class="card-pad">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><b style="font-size:13.5px">${STATS.terrComp} de ${STATS.terrTotal} completados</b><b style="font-size:13.5px;color:var(--green-700)">${cobertura}%</b></div>
          <div class="progress lg"><span style="width:${cobertura}%;background:var(--green)"></span></div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><span class="badge green">${STATS.terrComp} completados</span><span class="badge amber">${STATS.terrTotal-STATS.terrComp} pendientes</span><span class="badge red">${STATS.terrVenc} vencidos</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-indigo" style="width:32px;height:32px">${svg('chart')}</div><h3>Cobertura general</h3></div>
        <div class="card-pad" style="text-align:center">${ringSVG(general,'#5B21B6')}
          <div style="display:flex;justify-content:space-around;margin-top:14px;font-size:12px"><div><b style="display:block;font-size:16px">${cobertura}%</b><span class="muted">Territorios</span></div><div><b style="display:block;font-size:16px">${infPct}%</b><span class="muted">Informes</span></div><div><b style="display:block;font-size:16px">${Math.round((midPct+wePct)/2)}%</b><span class="muted">Asistencia</span></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-pink" style="width:32px;height:32px">${svg('people')}</div><h3>Roles de la congregación</h3></div>
        <div class="card-pad">${donut(rolesData)}</div>
      </div>
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-cyan" style="width:32px;height:32px">${svg('people')}</div><h3>Asistencia a reuniones</h3><div class="actions"><button class="btn sm ghost" data-click="go" data-click-args='["asistencia"]'>Ver ${svg('chevR')}</button></div></div>
        <div class="card-pad">
          <div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><b>Entre semana</b><span class="muted">${ATT_MID[5]} · ${midPct}%</span></div><div class="progress"><span style="width:${midPct}%"></span></div></div>
          <div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><b>Fin de semana</b><span class="muted">${ATT_WE[5]} · ${wePct}%</span></div><div class="progress"><span style="width:${wePct}%;background:linear-gradient(90deg,#8B5CF6,#5B21B6)"></span></div></div>
          <div style="margin-top:16px;display:flex;align-items:flex-end;gap:6px;height:60px">${ATT_LABELS.slice(0,6).map((m,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end"><div style="width:100%;max-width:18px;border-radius:5px 5px 0 0;background:var(--brand-300);height:${ATT_WE[i]/ATT_CAP*100}%"></div><span style="font-size:9px;color:var(--ink-400)">${m}</span></div>`).join('')}</div>
        </div>
      </div>
    </div>

    <div class="dash-rowlabel">Actividad, asignaciones, informes y alertas</div>
    <div class="dash-grid">
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-violet" style="width:32px;height:32px">${svg('refresh')}</div><h3>Actividad reciente</h3></div>
        <div class="lst">${[{w:males[0],a:'confirmó',x:'Discurso público',t:'12 min',i:'check',ti:'t-green'},{w:males[3],a:'completó territorio',x:'#018',t:'1 h',i:'map',ti:'t-brand'},{w:males[5],a:'entregó informe',x:'junio',t:'3 h',i:'report',ti:'t-cyan'},{w:males[8],a:'reasignado a',x:'Micrófonos',t:'5 h',i:'mic',ti:'t-violet'}].map(e=>`<div class="lst-item"><div class="lst-ico ${e.ti}">${svg(e.i)}</div><div class="lst-body"><b style="font-size:13px">${e.w.fullName}</b><p>${e.a} ${e.x}</p></div><span class="lst-time">${e.t}</span></div>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-amber" style="width:32px;height:32px">${svg('clock')}</div><h3>Sin confirmar · 2 semanas</h3><div class="actions"><span class="badge amber">${unconfList.length}</span></div></div>
        <div class="lst">${unconfList.slice(0,5).map(a=>`<div class="lst-item">${avatarHTML(a.person.fullName)}<div class="lst-body"><b>${a.role}</b><p>${a.person.fullName} · ${dshort(a.date)}</p></div><span class="badge amber" style="font-size:10px">Pendiente</span></div>`).join('')||'<div class="empty" style="padding:24px">Todo confirmado 🎉</div>'}</div>
        <div style="padding:12px 22px;border-top:1px solid var(--border)"><button class="btn sm ghost" data-click="go" data-click-args='["programaciones"]'>Ver programaciones ${svg('chevR')}</button></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-violet" style="width:32px;height:32px">${svg('report')}</div><h3>Informes mensuales</h3></div>
        <div class="card-pad"><div style="display:flex;gap:12px;text-align:center">
          <div style="flex:1;background:var(--surface-3);border-radius:12px;padding:14px 8px"><b style="font-size:22px;display:block">${INF_PREV_()}</b><span class="muted" style="font-size:11px">Mes anterior</span></div>
          <div style="flex:1;background:var(--brand-50);border-radius:12px;padding:14px 8px"><b style="font-size:22px;display:block;color:var(--brand-600)">${INF_ACTUAL_()}</b><span class="muted" style="font-size:11px">Mes actual</span></div>
          <div style="flex:1;background:var(--surface-3);border-radius:12px;padding:14px 8px"><b style="font-size:22px;display:block">${INF_NEXT}</b><span class="muted" style="font-size:11px">Próximo mes</span></div>
        </div>
        <div style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px"><span class="muted">Entrega mes actual</span><b>${infPct}%</b></div><div class="progress"><span style="width:${infPct}%;background:var(--violet)"></span></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-red" style="width:32px;height:32px">${svg('bell')}</div><h3>Alertas</h3></div>
        <div class="alert-list">
          ${[{ico:'warn',t:'t-red',n:`${STATS.terrVenc} territorios vencidos`,d:'Requieren reasignación',badge:'red',action:'territorios'},{ico:'report',t:'t-amber',n:`${STATS.infPend} informes pendientes`,d:'Cierre de mes en 1 día',badge:'amber',action:'informes'},{ico:'clock',t:'t-violet',n:`${unconfList.length} asignaciones sin confirmar`,d:'Próximas 2 semanas',badge:'violet',action:'programaciones'},{ico:'people',t:'t-cyan',n:`${irregulares} publicadores irregulares`,d:'Sin actividad reciente',badge:'cyan',action:'database'}].map(a=>`<div class="alert-row" data-click="go" data-click-args='["${a.action}"]'><div class="alert-dot ${a.t}">${svg(a.ico)}</div><div class="alert-tx"><b>${a.n}</b><p>${a.d}</p></div><span class="badge ${a.badge}" style="font-size:10px">Revisar</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="dash-rowlabel">Eventos, calendario, tareas y anuncios</div>
    <div class="dash-grid">
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-amber" style="width:32px;height:32px">${svg('flag')}</div><h3>Próximos eventos</h3></div>
        <div class="lst">${[{i:'flag',t:'t-brand',n:'Asamblea de circuito',d:'18-19 jul · Estadio del circuito'},{i:'star',t:'t-amber',n:'Visita del superintendente',d:'13 jul · Semana de actividades'},{i:'home',t:'t-violet',n:'Aseo del Salón',d:'4 jul · Grupos 1 y 2'},{i:'people',t:'t-green',n:'Reunión de servicio',d:'27 jul · Todos los grupos'}].map(e=>`<div class="lst-item"><div class="lst-ico ${e.t}">${svg(e.i)}</div><div class="lst-body"><b>${e.n}</b><p>${e.d}</p></div></div>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-brand" style="width:32px;height:32px">${svg('calendar')}</div><h3>Calendario</h3><div class="actions"><span class="muted" style="font-size:12px;font-weight:600">Jun 2026</span></div></div>
        <div class="card-pad" style="display:flex;justify-content:center"><div style="max-width:230px;width:100%">${miniCalendar()}</div></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-brand" style="width:32px;height:32px">${svg('tasks')}</div><h3>Tareas pendientes</h3><div class="actions"><span class="badge blue">${tareasPend.length}</span></div></div>
        <div class="lst">${tareasPend.slice(0,5).map(t=>`<div class="lst-item">${avatarHTML(t.asignadoA.fullName)}<div class="lst-body"><b>${esc(t.titulo)}</b><p>${t.asignadoA.fullName} · vence ${t.limite}</p></div>${prioBadge(t.prioridad)}</div>`).join('')||'<div class="empty" style="padding:24px">Sin tareas pendientes</div>'}</div>
      </div>
      <div class="card">
        <div class="card-head"><div class="kpi-ico t-pink" style="width:32px;height:32px">${svg('flag')}</div><h3>Últimos anuncios</h3></div>
        <div class="lst">${ANUNCIOS.map(a=>`<div class="lst-item"><div class="lst-ico ${a.tint}">${svg(a.ico)}</div><div class="lst-body"><b>${a.t}</b><p>${a.d}</p></div><span class="lst-time">${a.time}</span></div>`).join('')}</div>
      </div>
    </div>
  </div>`;
};
function ringSVG(pct,color){const R=46,C=2*Math.PI*R,off=C*(1-pct/100);return `<svg width="120" height="120" viewBox="0 0 120 120" style="margin:0 auto"><circle cx="60" cy="60" r="${R}" fill="none" stroke="#e2e8f0" stroke-width="11"/><circle cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset .8s"/><text x="60" y="58" text-anchor="middle" font-size="26" font-weight="800" fill="#1E293B" font-family="Inter">${pct}%</text><text x="60" y="76" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="Inter">general</text></svg>`}
function miniCalendar(){
  const dows=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];const ev={2:['#5B21B6'],6:['#8B5CF6'],9:['#5B21B6'],13:['#8B5CF6'],16:['#5B21B6'],20:['#8B5CF6'],23:['#5B21B6'],27:['#8B5CF6'],4:['#22C55E'],29:['#5B21B6','#F59E0B']};
  let h=`<div class="cal">${dows.map(d=>`<div class="dow">${d}</div>`).join('')}`;
  for(let d=1;d<=30;d++){h+=`<div class="day ${d===29?'today':''}">${d}${ev[d]?`<div class="evdot">${ev[d].map(c=>`<i style="background:${c}"></i>`).join('')}</div>`:''}</div>`}
  return h+'</div>';
}

/* -------- PROGRAMACIONES (calendario Google/Outlook) -------- */
let progCal={y:2026,m:5},progTab='calendario',vmcMonth=0;
const VMC_PARTS=['Presidente','Oración inicial','Oración final','Discurso (Tesoros)','Perlas escondidas','Lectura de la Biblia','Primera conversación','Revisita','Curso bíblico','Nuestra vida cristiana'];
const DURACIONES=['1 min','2 min','3 min','4 min','5 min','8 min','10 min','15 min'];
VIEWS.programaciones=()=>{
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Programaciones','Reuniones entre semana y fin de semana, discursos y servicio del campo',
      `${can('assign.manage')?`<button class="btn primary" data-click="openAssignCategories">${svg('plus')}Nueva asignación</button>`:''}`)}
    <div class="tabs">
      <div class="tab ${progTab==='calendario'?'active':''}" data-click="setProgTab" data-click-args='["calendario"]'>Calendario</div>
      <div class="tab ${progTab==='vmc'?'active':''}" data-click="setProgTab" data-click-args='["vmc"]'>Reunión entre semana</div>
      <div class="tab ${progTab==='we'?'active':''}" data-click="setProgTab" data-click-args='["we"]'>Reunión fin de semana</div>
      <div class="tab ${progTab==='discursos'?'active':''}" data-click="setProgTab" data-click-args='["discursos"]'>Discursos Públicos</div>
    </div>
    <div id="progContent"></div></div>`;
  renderProgTab();
};
function setProgTab(t){progTab=t;VIEWS.programaciones()}
function renderProgTab(){if(progTab==='vmc')return document.getElementById('progContent').innerHTML=meetingCardsHTML('mid');if(progTab==='we')return document.getElementById('progContent').innerHTML=meetingCardsHTML('we');if(progTab==='discursos')return renderDiscursos();renderProgCalendar()}
function monthName(y,m){return new Date(y,m,1).toLocaleDateString('es-CO',{month:'long',year:'numeric'})}
function monthCalHTML(y,m){
  const first=new Date(y,m,1);const startDow=first.getDay();const dim=new Date(y,m+1,0).getDate();const dows=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  let cells='';
  for(let i=0;i<startDow;i++){const pd=new Date(y,m,1-startDow+i);cells+=`<div class="bigcal-cell out"><div class="dnum">${pd.getDate()}</div></div>`}
  for(let d=1;d<=dim;d++){const date=new Date(y,m,d);const dw=date.getDay();const isToday=diso(date)===diso(TODAY);let evs='';
    if(dw===2){const u=unconfirmedCount(date,'mid');evs+=`<div class="cal-event mid" data-click="openMeeting" data-click-args='["${diso(date)}", "mid"]'>7:00 p. m.<small>Reunión entre semana${u?` · ${u} s/c`:''}</small></div>`}
    if(dw===0){const u=unconfirmedCount(date,'we');evs+=`<div class="cal-event we" data-click="openMeeting" data-click-args='["${diso(date)}", "we"]'>8:00 a. m.<small>Discurso + Atalaya${u?` · ${u} s/c`:''}</small></div>`}
    cells+=`<div class="bigcal-cell ${isToday?'today':''}"><div class="dnum">${d}</div>${evs}</div>`;}
  const total=startDow+dim;const trail=(7-total%7)%7;for(let i=1;i<=trail;i++)cells+=`<div class="bigcal-cell out"><div class="dnum">${i}</div></div>`;
  return `<div class="bigcal"><div class="bigcal-head"><h3>${monthName(y,m)}</h3></div><div class="bigcal-grid">${dows.map(d=>`<div class="bigcal-dow">${d}</div>`).join('')}${cells}</div></div>`;
}
function progNav(delta){progCal.m+=delta;if(progCal.m<0){progCal.m=11;progCal.y--}if(progCal.m>11){progCal.m=0;progCal.y++}renderProgCalendar()}
function progToday(){progCal={y:2026,m:5};renderProgCalendar()}
function renderProgCalendar(){
  const ny=progCal.m===11?progCal.y+1:progCal.y,nm=(progCal.m+1)%12;
  document.getElementById('progContent').innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <b style="font-size:15px">Mes actual y próximo mes</b>
      <div style="margin-left:auto;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span class="cal-event mid" style="margin:0">Martes · Reunión entre semana</span><span class="cal-event we" style="margin:0">Domingo · Reunión fin de semana</span><button class="btn sm" data-click="progToday">Hoy</button><button class="icon-btn" data-click="progNav" data-click-args='[-1]'>${svg('chevL')}</button><button class="icon-btn" data-click="progNav" data-click-args='[1]'>${svg('chevR')}</button></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px">${monthCalHTML(progCal.y,progCal.m)}${monthCalHTML(ny,nm)}</div>`;
}
function openMeeting(isoDate,type){
  const date=new Date(isoDate+'T00:00:00');const meta=meetingMeta(type);const parts=mkParts(date,type);
  const conf=parts.filter(p=>p.confirmed).length;
  openModalCustom({icon:'meeting',tint:type==='mid'?'t-brand':'t-violet',title:`${dlong(date).replace(/^\w/,c=>c.toUpperCase())} · ${meta.time}`,sub:`${esc(meta.title)} · ${conf}/${parts.length} confirmadas`,size:'lg',
    body:`<div class="parts-list">${parts.map(p=>`<div class="part-row">
      <div class="part-role">${p.role}${p.sub?`<small>${p.sub}</small>`:''}${p.theme?`<small>“${p.theme}”</small>`:''}</div>
      <div class="part-person">${p.person?`${avatarHTML(p.person.fullName)}<b style="font-size:13px">${p.person.fullName}</b>`:`<span class="badge red"><span class="bdot"></span>Vacante</span>`}</div>
      <div class="part-badges">${p.person?confBadge(p.confirmed):''}<button class="icon-btn" style="width:32px;height:32px" data-tip="Reasignar" data-click="openReassignPart" data-click-args='["${isoDate}", "${type}", "${p.role}"]' data-preclose="closeModal">${svg('edit')}</button></div>
    </div>`).join('')}</div>`,
    footer:`<button class="btn" data-click="closeModal">Cerrar</button><button class="btn" data-click="openAttReg" data-click-args='["${isoDate}", "${type}"]' data-preclose="closeModal">${svg('check')}Registrar asistencia</button><button class="btn primary" data-click="openAssignCategories" data-preclose="closeModal">${svg('plus')}Añadir asignación</button>`});
}
/* (renderVMC eliminado: sustituido por la programación de 3 meses) */
function discFor(dt){const iso=diso(dt);const ov=DISC_OVR[iso]||{};
  const orador=(ov.oradorId!=null?DB.find(x=>String(x.id)===String(ov.oradorId)):null)||seededPick(males,'disc'+iso);
  return {iso,orador,bosq:ov.bosq!=null?ov.bosq:10+hashStr('b'+iso)%180,cancion:ov.cancion!=null?ov.cancion:1+hashStr('c'+iso)%150,tema:ov.tema||seededPick(DISCURSOS,'t'+iso),cong:ov.cong||seededPick(CIRCUITO_CONGS,'cg'+iso)};}
function renderDiscursos(){
  const sundays=[];let d=new Date(TODAY);let g=0;while(sundays.length<10&&g<90){if(d.getDay()===0)sundays.push(new Date(d));d.setDate(d.getDate()+1);g++}
  document.getElementById('progContent').innerHTML=`<div class="card"><div class="card-head"><div class="kpi-ico t-violet" style="width:34px;height:34px">${svg('speak')}</div><h3>Discursos públicos programados</h3><div class="actions"><button class="btn sm primary" data-click="openDiscursoModal">${svg('plus')}Nuevo discurso</button></div></div>
    <div class="table-wrap"><table class="data"><thead><tr><th>Fecha</th><th>Orador</th><th>N° Bosquejo</th><th>Tema</th><th>Canción</th><th>Congregación</th><th></th></tr></thead><tbody>
    ${sundays.map(dt=>{const dc=discFor(dt);
      return `<tr><td><b>${dshort(dt)}</b></td><td><div class="cell-user">${avatarHTML(dc.orador.fullName)}<b>${dc.orador.fullName}</b></div></td><td>#${dc.bosq}</td><td class="muted">“${dc.tema}”</td><td>${dc.cancion}</td><td>${dc.cong}</td><td style="text-align:right"><button class="icon-btn" style="width:32px;height:32px" data-click="openDiscursoMenu" data-click-args='["$event", "${dc.iso}"]'>${svg('dots')}</button></td></tr>`}).join('')}
    </tbody></table></div></div>`;
}
function openDiscursoMenu(e,iso){
  const dc=discFor(new Date(iso+'T00:00:00'));
  closeCtxMenu();const menu=document.createElement('div');menu.className='ctx-menu';menu.id='ctxMenu';
  menu.innerHTML=`<button class="ctx-item" onclick="closeCtxMenu();verOradorContacto('${dc.orador.fullName.replace(/'/g,'')}')">${svg('user')}Ver contacto</button>
    <button class="ctx-item" data-click="openDiscursoModal" data-click-args='["${iso}"]' data-preclose="closeCtxMenu">${svg('edit')}Editar información</button>
    <button class="ctx-item" data-click="openReemplazarOrador" data-click-args='["${iso}"]' data-preclose="closeCtxMenu">${svg('refresh')}Reemplazar discursante</button>
    <button class="ctx-item" data-click="openCambiarFechaDiscurso" data-click-args='["${iso}"]' data-preclose="closeCtxMenu">${svg('calendar')}Cambiar fecha</button>`;
  document.body.appendChild(menu);const r=e.currentTarget.getBoundingClientRect();
  let left=r.right-menu.offsetWidth,top=r.bottom+6;if(top+menu.offsetHeight>window.innerHeight)top=r.top-menu.offsetHeight-6;if(left<8)left=8;
  menu.style.left=left+'px';menu.style.top=top+'px';setTimeout(()=>document.addEventListener('click',closeCtxOnce),0);
}
function verOradorContacto(name){const p=DB.find(x=>x.fullName===name);if(p)openFicha(p.id);else toast('Contacto: '+name);}
function openReemplazarOrador(iso){if(!requireCap('assign.manage'))return;const dt=new Date(iso+'T00:00:00');const dc=discFor(dt);
  openModalCustom({icon:'refresh',tint:'t-violet',title:'Reemplazar discursante',sub:`${dstr(dt)} · actualmente ${dc.orador.fullName}`,
    body:`<div class="form-row full"><label>Nuevo discursante</label>${searchSelect('rep_orador',males.map(m=>({value:m.id,label:m.fullName})),dc.orador.id)}</div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveReemplazarOrador" data-save-args='["${iso}"]'>${svg('check')}Guardar</button>`});}
function saveReemplazarOrador(iso){const pid=sselValue('rep_orador');if(!pid){toast('Selecciona el nuevo discursante');return;}
  const dt=new Date(iso+'T00:00:00');const dc=discFor(dt);
  DISC_OVR[iso]={oradorId:pid,bosq:dc.bosq,cancion:dc.cancion,tema:dc.tema,cong:dc.cong};
  persistAll();closeModal();
  const per=DB.find(x=>String(x.id)===String(pid));
  notify('Cambio de asignación',`${per?per.fullName:'—'} dará el discurso público del ${dstr(dt)}.`);
  if(currentView==='programaciones')renderProgTab();
  toast('Discursante reemplazado por '+(per?per.fullName:'—'));}
function openCambiarFechaDiscurso(iso){if(!requireCap('assign.manage'))return;const dt=new Date(iso+'T00:00:00');const dc=discFor(dt);
  openModalCustom({icon:'calendar',tint:'t-violet',title:'Cambiar fecha del discurso',sub:`${dc.orador.fullName} · actual: ${dstr(dt)}`,
    body:`<div class="form-row full"><label>Nueva fecha (domingo)</label><input class="input" type="date" id="cfd_date" value="${iso}"/><span class="field-hint" id="cfd_hint" aria-live="polite" style="margin-top:6px">Los discursos públicos se programan los domingos.</span></div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveCambiarFechaDiscurso" data-save-args='["${iso}"]'>${svg('check')}Guardar</button>`});}
function saveCambiarFechaDiscurso(iso){const v=document.getElementById('cfd_date').value;if(!v){toast('Selecciona la nueva fecha');return;}
  const nd=new Date(v+'T00:00:00');
  if(nd.getDay()!==0){const h=document.getElementById('cfd_hint');if(h){h.textContent='La fecha elegida no es domingo. Selecciona un domingo.';h.className='field-hint err';}toast('La nueva fecha debe ser un domingo');return;}
  const dt=new Date(iso+'T00:00:00');const dc=discFor(dt);
  delete DISC_OVR[iso];
  DISC_OVR[v]={oradorId:dc.orador.id,bosq:dc.bosq,cancion:dc.cancion,tema:dc.tema,cong:dc.cong};
  persistAll();closeModal();
  notify('Cambio de asignación',`El discurso "${dc.tema}" se movió del ${dstr(dt)} al ${dstr(nd)}.`);
  if(currentView==='programaciones')renderProgTab();
  toast('Fecha del discurso actualizada ✓');}
function openDiscursoModal(iso){if(!requireCap('assign.manage'))return;const isEdit=!!iso;const dc=isEdit?discFor(new Date(iso+'T00:00:00')):null;
  const defIso=isEdit?iso:(function(){let d=new Date(TODAY);while(d.getDay()!==0)d.setDate(d.getDate()+1);return diso(d)})();
  openModalCustom({icon:'speak',tint:'t-violet',title:isEdit?'Editar discurso público':'Nuevo discurso público',sub:isEdit?`Programado para ${dstr(new Date(iso+'T00:00:00'))}`:'Programa un discurso para el fin de semana',
    body:`<div class="form-grid">
      <div class="form-row"><label>Orador</label>${searchSelect('disc_orador',males.map(m=>({value:m.id,label:m.fullName})),isEdit?dc.orador.id:males[0].id)}</div>
      <div class="form-row"><label>Congregación</label><select class="select" id="disc_cong">${CIRCUITO_CONGS.map(c=>`<option${isEdit&&dc.cong===c?' selected':''}>${c}</option>`).join('')}</select></div>
      <div class="form-row"><label>N° de bosquejo</label><input class="input" id="disc_bosq" type="number" placeholder="Ej. 45" value="${isEdit?dc.bosq:''}"/></div>
      <div class="form-row"><label>Canción</label><input class="input" id="disc_cancion" type="number" placeholder="Ej. 120" value="${isEdit?dc.cancion:''}"/></div>
      <div class="form-row full"><label>Tema</label><select class="select" id="disc_tema">${DISCURSOS.map(t=>`<option${isEdit&&dc.tema===t?' selected':''}>${t}</option>`).join('')}</select></div>
      <div class="form-row"><label>Fecha (domingo)</label><input class="input" id="disc_fecha" type="date" value="${defIso}"/></div>
    </div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" onclick="saveWithFeedback(this,()=>saveDiscurso(${isEdit?`'${iso}'`:'null'}))">${svg('check')}Guardar</button>`});
}
function saveDiscurso(prevIso){const v=document.getElementById('disc_fecha').value;if(!v){toast('Selecciona la fecha del discurso');return;}
  const nd=new Date(v+'T00:00:00');if(nd.getDay()!==0){toast('El discurso debe programarse un domingo');return;}
  const pid=sselValue('disc_orador');if(!pid){toast('Selecciona el orador');return;}
  const cur=discFor(nd);
  const ov={oradorId:pid,bosq:parseInt(document.getElementById('disc_bosq').value,10)||cur.bosq,cancion:parseInt(document.getElementById('disc_cancion').value,10)||cur.cancion,tema:document.getElementById('disc_tema').value,cong:document.getElementById('disc_cong').value};
  if(prevIso&&prevIso!==v)delete DISC_OVR[prevIso];
  DISC_OVR[v]=ov;persistAll();closeModal();
  const per=DB.find(x=>String(x.id)===String(pid));
  notify('Nueva asignación',`Discurso "${ov.tema}" asignado a ${per?per.fullName:'—'} (${dstr(nd)}).`);
  if(currentView==='programaciones')renderProgTab();
  toast(prevIso?'Discurso actualizado ✓':'Discurso programado ✓');}
/* Nueva asignación · categorías */
const ASSIGN_CATS=[
  {id:'vmc',ico:'meeting',t:'t-brand',l:'Reunión entre semana'},
  {id:'local',ico:'home',t:'t-cyan',l:'Necesidades Locales'},
  {id:'disc',ico:'speak',t:'t-violet',l:'Discursos Públicos'},
  {id:'we',ico:'star',t:'t-amber',l:'Reunión Fin de Semana'},
  {id:'campo',ico:'map',t:'t-green',l:'Servicio del Campo'},
  {id:'pub',ico:'display',t:'t-pink',l:'Predicación Pública'},
  {id:'limp',ico:'check',t:'t-blue',l:'Limpieza'},
];
function openAssignCategories(){if(!requireCap('assign.manage'))return;
  openModalCustom({icon:'plus',tint:'t-brand',title:'Nueva asignación',sub:'Selecciona la categoría que deseas programar',size:'lg',
    body:`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">${ASSIGN_CATS.map(c=>`<button type="button" data-click="pickAssignCat" data-click-args='["${c.id}"]' style="text-align:left;border:1.5px solid var(--border);border-radius:14px;padding:18px;background:var(--surface);transition:.15s;cursor:pointer" data-mouseover="hoverTintOn" data-mouseout="hoverTintOff"><div class="kpi-ico ${c.t}" style="width:42px;height:42px;margin-bottom:12px">${svg(c.ico)}</div><b style="font-size:14px;display:block;line-height:1.3">${c.l}</b></button>`).join('')}</div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button>`});
}
function pickAssignCat(id){closeModal();if(id==='disc'){openDiscursoModal()}else if(id==='vmc'||id==='we'){progTab=id;if(currentView==='programaciones')VIEWS.programaciones();else go('programaciones')}else{openModal('assignment')}}

/* -------- REUNIONES (programación por semanas) -------- */
function meetingsNextMonths(type,nMonths){const res=[];const dw=type==='mid'?2:0;let d=new Date(TODAY);const end=new Date(TODAY.getFullYear(),TODAY.getMonth()+nMonths,TODAY.getDate());while(d<=end){if(d.getDay()===dw)res.push(new Date(d));d.setDate(d.getDate()+1);}return res;}
function meetingCardsHTML(type){
  const meta=meetingMeta(type);const meets=meetingsNextMonths(type,3);
  if(!meets.length)return `<div class="empty" style="padding:40px">Sin reuniones próximas para mostrar.</div>`;
  const groups=[];let cur=null;
  meets.forEach(dt=>{const k=dt.getFullYear()+'-'+dt.getMonth();if(!cur||cur.k!==k){cur={k,y:dt.getFullYear(),m:dt.getMonth(),items:[]};groups.push(cur);}cur.items.push(dt);});
  const intro=`<div style="display:flex;align-items:center;gap:9px;margin-bottom:16px;font-size:13px;color:var(--ink-500)">${svg('calendar')}<span>Programación automática de los próximos 3 meses · <b>${meets.length}</b> reuniones ${type==='mid'?'entre semana':'de fin de semana'}, organizadas por mes y semana.</span></div>`;
  return intro+groups.map(g=>`
    <div style="margin-bottom:22px">
      <div style="display:flex;align-items:center;gap:8px;margin:0 2px 12px">${svg('calendar')}<h3 style="font-size:15px;font-weight:800;text-transform:capitalize;margin:0">${monthName(g.y,g.m)}</h3><span class="tag">${g.items.length} ${g.items.length===1?'semana':'semanas'}</span></div>
      ${g.items.map((dt,wi)=>meetingAccCard(dt,type,wi+1,meta)).join('')}
    </div>`).join('');
}
function meetingAccCard(dt,type,weekNo,meta){
  const parts=mkParts(dt,type);const conf=parts.filter(p=>p.confirmed).length;
  return `<div class="card acc-card" style="margin-bottom:14px"><div class="card-head acc-head" data-click="toggleAcc" data-click-args='["$el"]'><div class="kpi-ico ${type==='mid'?'t-brand':'t-violet'}" style="width:36px;height:36px">${svg('meeting')}</div><div><h3>Semana ${weekNo} · ${dshort(dt)}</h3><div class="muted" style="font-size:12.5px">${esc(meta.title)} · ${dlong(dt).replace(/^\w/,c=>c.toUpperCase())} · ${meta.time}</div></div><div class="actions"><span class="badge ${conf===parts.length?'green':'amber'}"><span class="bdot"></span>${conf}/${parts.length} confirmadas</span><button class="btn sm" data-click="openMeeting" data-click-args='["${diso(dt)}", "${type}"]' data-stop="1">${svg('eye')}Ver detalle</button><span class="acc-chev">${svg('chevD')}</span></div></div>
      <div class="acc-body" hidden><div class="table-wrap"><table class="data"><thead><tr><th>Parte</th><th>Responsable</th><th>Estado</th><th style="text-align:right">Acción</th></tr></thead><tbody>
        ${parts.map(p=>`<tr><td><b>${p.role}</b>${p.theme?`<br><small class="muted">“${p.theme}”</small>`:p.sub?`<br><small class="muted">${p.sub}</small>`:''}</td><td>${p.person?`<div class="cell-user">${avatarHTML(p.person.fullName)}<b>${p.person.fullName}</b></div>`:`<span class="badge red"><span class="bdot"></span>Vacante</span>`}</td><td>${p.person?confBadge(p.confirmed):'—'}</td><td style="text-align:right"><button class="btn sm ghost" data-click="openReassignPart" data-click-args='["${diso(dt)}", "${type}", "${p.role}"]'>${svg('refresh')}Reasignar</button></td></tr>`).join('')}
      </tbody></table></div></div></div>`;
}
function toggleAcc(head){const card=head.parentElement;const body=card.querySelector('.acc-body');const willOpen=body.hidden;body.hidden=!willOpen;card.classList.toggle('open',willOpen);}
function openReassignPart(iso,type,role){if(!requireCap('assign.manage'))return;const date=new Date(iso+'T00:00:00');const parts=mkParts(date,type);const part=parts.find(p=>p.role===role);if(!part)return;
  openModalCustom({icon:'refresh',tint:type==='mid'?'t-brand':'t-violet',title:'Reasignar parte',sub:`${role} · ${dstr(date)} · ${meetingMeta(type).title}`,
    body:`<div class="form-row full"><label>Publicador asignado</label>${searchSelect('rp_pub',[{value:'',label:'— Dejar vacante —'}].concat(males.map(m=>({value:m.id,label:m.fullName}))),part.person?part.person.id:'')}</div>
      <div class="form-row full" style="margin-top:12px"><label>Estado</label><select class="select" id="rp_conf"><option value="0"${!part.confirmed?' selected':''}>Por confirmar</option><option value="1"${part.confirmed?' selected':''}>Confirmado</option></select></div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveReassignPart" data-save-args='["${iso}", "${type}", "${role}"]'>${svg('check')}Guardar</button>`});}
function saveReassignPart(iso,type,role){const pid=sselValue('rp_pub');const conf=document.getElementById('rp_conf').value==='1';
  MEET_OVR[iso+type+'|'+role]={personId:pid||null,confirmed:pid?conf:false};
  refreshStats();persistAll();closeModal();
  const per=pid?DB.find(x=>String(x.id)===String(pid)):null;const fecha=dstr(new Date(iso+'T00:00:00'));
  notify(per?'Nueva asignación':'Cambio de asignación',per?`Se asignó "${role}" a ${per.fullName} (${fecha}).`:`La parte "${role}" quedó vacante (${fecha}).`);
  if(currentView==='programaciones')renderProgTab();renderNav();
  toast(per?`Parte asignada a ${per.fullName} ✓`:'La parte quedó vacante');}

/* (VIEWS.tareas legado eliminado: unificado en Actividad) */
/* -------- BASE DE DATOS (CRM) -------- */
let dbState={q:'',grupo:'',privilegio:'',estado:'',sortCol:'id',sortDir:'asc',page:1,pageSize:10,sel:new Set()};
VIEWS.database=()=>{
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Base de datos','CRM interno · '+DB.length+' registros de la congregación',
      `<button class="btn" data-click="exportDbFiltered">${svg('download')}Exportar</button>${can('data.create')?`<button class="btn primary" data-click="openModal" data-click-args='["publisher"]'>${svg('plus')}Nuevo publicador</button>`:''}`)}
    <div class="kpi-grid" style="margin-bottom:22px;grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">
      ${[{v:STATS.total,l:'Publicadores',t:'t-brand',i:'people'},{v:DB.filter(p=>p.estado==='Activo').length,l:'Activos',t:'t-green',i:'check'},{v:DB.filter(p=>p.estado==='Irregular').length,l:'Irregulares',t:'t-amber',i:'warn'},{v:STATS.precReg+STATS.precAux,l:'Precursores',t:'t-violet',i:'flag'},{v:GRUPOS.length,l:'Grupos',t:'t-cyan',i:'people'}].map(k=>`<div class="kpi"><div class="kpi-top"><div class="kpi-ico ${k.t}" style="width:36px;height:36px">${svg(k.i)}</div></div><div class="kpi-val" style="font-size:25px">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}
    </div>
    <div class="card">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border)"><div class="toolbar" style="margin-bottom:0">
        <div class="field search-field">${svg('search')}<input id="dbq" placeholder="Buscar por nombre, correo o teléfono…" value="${dbState.q}" data-input="applyFilter" data-fstate="dbState" data-fkey="q" data-fpage="1" data-frender="renderDbTable"/></div>
        <div class="field">${svg('filter')}<select data-change="applyFilter" data-fstate="dbState" data-fkey="grupo" data-fpage="1" data-frender="renderDbTable"><option value="">Todos los grupos</option>${GRUPOS.map(g=>`<option ${dbState.grupo===g?'selected':''}>${g}</option>`).join('')}</select></div>
        <div class="field">${svg('shield')}<select data-change="applyFilter" data-fstate="dbState" data-fkey="privilegio" data-fpage="1" data-frender="renderDbTable"><option value="">Todos los privilegios</option>${ROLES.map(r=>`<option ${dbState.privilegio===r?'selected':''}>${r}</option>`).join('')}</select></div>
        <div class="field"><select data-change="applyFilter" data-fstate="dbState" data-fkey="estado" data-fpage="1" data-frender="renderDbTable"><option value="">Todos los estados</option>${['Activo','Irregular','Inactivo'].map(e=>`<option ${dbState.estado===e?'selected':''}>${e}</option>`).join('')}</select></div>
        <button class="btn ghost sm" onclick="dbState={q:'',grupo:'',privilegio:'',estado:'',sortCol:'id',sortDir:'asc',page:1,pageSize:10,sel:new Set()};VIEWS.database()" style="margin-left:auto">${svg('refresh')}Limpiar</button>
      </div></div>
      <div class="table-wrap" id="dbTableWrap"></div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:12px;text-align:center">💡 Doble clic en una fila para abrir la ficha · casillas para seleccionar y actuar en lote · menú (⋯) para acciones · clic en columnas para ordenar</p>
  </div>`;
  renderDbTable();
};
function filteredDB(){
  let rows=DB.filter(p=>{const q=dbState.q.toLowerCase();
    if(q&&!(p.fullName.toLowerCase().includes(q)||p.email.includes(q)||p.tel.includes(q)))return false;
    if(dbState.grupo&&p.grupo!==dbState.grupo)return false;
    if(dbState.privilegio&&!(p.privilegios&&p.privilegios.length?p.privilegios:[p.role]).includes(dbState.privilegio))return false;
    if(dbState.estado&&p.estado!==dbState.estado)return false;return true;});
  const col=dbState.sortCol,dir=dbState.sortDir==='asc'?1:-1;
  rows.sort((a,b)=>{let va,vb;if(col==='nombre'){va=a.fullName;vb=b.fullName}else if(col==='grupo'){va=a.grupo;vb=b.grupo}else if(col==='role'){va=a.role;vb=b.role}else if(col==='estado'){va=a.estado;vb=b.estado}else if(col==='bautismo'){va=a.bautismo||'0';vb=b.bautismo||'0'}else{va=a.id;vb=b.id}return va>vb?dir:va<vb?-dir:0;});
  return rows;
}
function sortBy(col){if(dbState.sortCol===col){dbState.sortDir=dbState.sortDir==='asc'?'desc':'asc'}else{dbState.sortCol=col;dbState.sortDir='asc'}renderDbTable()}
function sortIco(col){const rot=dbState.sortCol===col&&dbState.sortDir==='asc'?-90:90;return `<span class="sort-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" style="transform:rotate(${rot}deg)"><path d="m9 18 6-6-6-6"/></svg></span>`}
function th(col,label){return `<th class="sortable ${dbState.sortCol===col?'sorted':''}" data-click="sortBy" data-click-args='["${col}"]'>${label}${sortIco(col)}</th>`}
function renderDbTable(){
  saveUiState();
  const all=filteredDB();const total=all.length;const pages=Math.max(1,Math.ceil(total/dbState.pageSize));
  if(dbState.page>pages)dbState.page=pages;const start=(dbState.page-1)*dbState.pageSize;const rows=all.slice(start,start+dbState.pageSize);
  const sel=dbState.sel;const allIds=all.map(p=>p.id);const allSelected=total>0&&allIds.every(id=>sel.has(id));
  const bulk=sel.size?`<div class="bulk-bar"><span class="bulk-count"><span class="dot"></span>${sel.size} seleccionado${sel.size!==1?'s':''}</span>
      <button class="btn sm primary" data-click="bulkRemind">${svg('send')}Enviar recordatorio</button>
      <button class="btn sm" data-click="bulkExport">${svg('download')}Exportar selección</button>
      <button class="btn sm ghost" style="margin-left:auto" data-click="clearSel">${svg('x')}Quitar selección</button></div>`:'';
  document.getElementById('dbTableWrap').innerHTML=`${bulk}
    <table class="data"><thead><tr><th style="width:40px"><input type="checkbox" class="row-chk" id="dbSelAll" ${allSelected?'checked':''} data-click="toggleSelAll" data-click-args='["$checked"]' aria-label="Seleccionar todos"></th>${th('nombre','Publicador')}<th>Contacto</th>${th('grupo','Grupo')}${th('role','Privilegio')}${th('estado','Estado')}${th('bautismo','Bautismo')}<th></th></tr></thead><tbody>
      ${rows.map(p=>`<tr class="clickable ${sel.has(p.id)?'row-sel':''}" data-dblclick="openFicha" data-dblclick-args='[${p.id}]'>
        <td><input type="checkbox" class="row-chk" ${sel.has(p.id)?'checked':''} onclick="event.stopPropagation();toggleSel(${p.id},this.checked)" aria-label="Seleccionar ${esc(p.fullName)}"></td>
        <td><div class="cell-user">${avatarHTML(p.fullName)}<div><b>${esc(p.fullName)}</b><small>${esc(p.localidad)}</small></div></div></td>
        <td><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:12.5px">${esc(p.tel)}</span><span class="muted" style="font-size:11.5px">${esc(p.email)}</span></div></td>
        <td>${p.grupo}</td><td>${roleBadge(p.role)}</td><td>${estadoBadge(p.estado)}</td><td class="muted">${fmtFecha(p.bautismo)}</td>
        <td style="text-align:right"><button class="icon-btn" style="width:32px;height:32px" data-click="openRowMenu" data-click-args='["$event", ${p.id}]' data-stop="1">${svg('dots')}</button></td>
      </tr>`).join('')||`<tr><td colspan="8"><div class="empty">Sin resultados para los filtros aplicados</div></td></tr>`}
    </tbody></table>
    <div class="pager"><span class="pager-info">Mostrando <b>${total?start+1:0}–${Math.min(start+dbState.pageSize,total)}</b> de <b>${total}</b> registros</span>
      <div class="pager-ctrl"><button class="pg" ${dbState.page===1?'disabled':''} data-click="dbGo" data-click-args='[${dbState.page-1}]'>${svg('chevL')}</button>${pageButtons(pages)}<button class="pg" ${dbState.page===pages?'disabled':''} data-click="dbGo" data-click-args='[${dbState.page+1}]'>${svg('chevR')}</button></div>
    </div>`;
  const hc=document.getElementById('dbSelAll');if(hc)hc.indeterminate=sel.size>0&&!allSelected;
}
function toggleSel(id,on){if(on)dbState.sel.add(id);else dbState.sel.delete(id);renderDbTable()}
function toggleSelAll(on){const ids=filteredDB().map(p=>p.id);if(on)ids.forEach(id=>dbState.sel.add(id));else ids.forEach(id=>dbState.sel.delete(id));renderDbTable()}
function clearSel(){dbState.sel.clear();renderDbTable()}
function bulkRemind(){const n=dbState.sel.size;if(!n)return;dbState.sel.clear();renderDbTable();notify('Informe pendiente',`Se envió recordatorio a ${n} publicador${n!==1?'es':''}.`);toast(`Recordatorio enviado a ${n} publicador${n!==1?'es':''}`)}
function bulkExport(){const n=dbState.sel.size;if(!n)return;toast(`Exportando ${n} registro${n!==1?'s':''} seleccionado${n!==1?'s':''}…`)}
function pagerButtons(pages,cur,go){let b=[];const add=p=>b.push(`<button class="pg ${p===cur?'active':''}" onclick="${go}(${p})">${p}</button>`);
  if(pages<=7){for(let p=1;p<=pages;p++)add(p)}else{add(1);if(cur>3)b.push('<span style="padding:0 4px;color:var(--ink-400)">…</span>');for(let p=Math.max(2,cur-1);p<=Math.min(pages-1,cur+1);p++)add(p);if(cur<pages-2)b.push('<span style="padding:0 4px;color:var(--ink-400)">…</span>');add(pages)}return b.join('')}
function pageButtons(pages){return pagerButtons(pages,dbState.page,'dbGo')}
function sortHeader(state,onclick,col,label,align){const s=state.sortCol===col;const rot=s&&state.sortDir==='asc'?-90:90;return `<th class="sortable ${s?'sorted':''}"${align?` style="text-align:${align}"`:''} onclick="${onclick}('${col}')">${label}<span class="sort-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" style="transform:rotate(${rot}deg)"><path d="m9 18 6-6-6-6"/></svg></span></th>`}
function dbGo(p){dbState.page=p;renderDbTable()}

function openRowMenu(e,id){
  closeCtxMenu();const menu=document.createElement('div');menu.className='ctx-menu';menu.id='ctxMenu';
  menu.innerHTML=`<button class="ctx-item" data-click="openFicha" data-click-args='[${id}]' data-preclose="closeCtxMenu">${svg('eye')}Ver</button>
    <button class="ctx-item" data-click="openEditContact" data-click-args='[${id}]' data-preclose="closeCtxMenu">${svg('edit')}Editar</button>
    <button class="ctx-item" data-click="downloadCard" data-click-args='[${id}]' data-preclose="closeCtxMenu">${svg('download')}Descargar tarjeta</button>
    <button class="ctx-item" data-click="openHistAsign" data-click-args='[${id}]' data-preclose="closeCtxMenu">${svg('calendar')}Historial</button>
    <button class="ctx-item" data-click="openPrivilegio" data-click-args='[${id}]' data-preclose="closeCtxMenu">${svg('shield')}Cambiar privilegios</button>
    <div class="ctx-sep"></div>
    <button class="ctx-item danger" data-click="deletePublisher" data-click-args='[${id}]' data-preclose="closeCtxMenu">${svg('trash')}Eliminar</button>`;
  document.body.appendChild(menu);const r=e.currentTarget.getBoundingClientRect();
  let left=r.right-menu.offsetWidth,top=r.bottom+6;if(top+menu.offsetHeight>window.innerHeight)top=r.top-menu.offsetHeight-6;if(left<8)left=8;
  menu.style.left=left+'px';menu.style.top=top+'px';setTimeout(()=>document.addEventListener('click',closeCtxOnce),0);
}
function closeCtxOnce(e){const m=document.getElementById('ctxMenu');if(m&&!m.contains(e.target))closeCtxMenu()}
function closeCtxMenu(){const m=document.getElementById('ctxMenu');if(m)m.remove();document.removeEventListener('click',closeCtxOnce)}

function infoCard(ico,label,val){return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 13px;display:flex;align-items:flex-start;gap:11px"><div class="set-ico">${svg(ico)}</div><div style="min-width:0"><div style="font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--ink-400)">${label}</div><div style="font-size:13.5px;font-weight:600;word-break:break-word;line-height:1.35;margin-top:3px">${val||'—'}</div></div></div>`}
function statCard(val,label){return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:13px 14px"><div style="font-size:21px;font-weight:800;letter-spacing:-.5px;line-height:1">${val}</div><div style="font-size:10.5px;color:var(--ink-500);margin-top:5px;line-height:1.3">${label}</div></div>`}
function fichaViewConfig(id){
  const p=DB.find(x=>x.id===id);const inf=INFORMES.find(r=>r.pub.id===id);
  const familia='Familia '+(p.apellidos.split(' ')[0]||p.nombre);
  const terrCount=TERR.filter(t=>t.resp&&t.resp.id===p.id).length;
  const infAno=6+hashStr('ia'+id)%7, parts=8+hashStr('pt'+id)%20, estudios=inf.estudios||hashStr('eb'+id)%5, asist=80+hashStr('as'+id)%18;
  const ultimoInf=inf.entregado?('Junio 2026 · '+inf.horas+' h'):'Pendiente';
  const proxAsign=seededPick(['Discurso público','Lectura de la Biblia','Micrófonos','Oración','Acomodador','Presidente'],'pa'+id)+' · '+dshort(daysFwd(3+hashStr('pd'+id)%25));
  return {icon:'user',tint:'t-brand',title:'Ver contacto',sub:'Ficha del publicador',size:'lg',
    body:`
      <div style="display:flex;align-items:center;gap:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:20px;flex-wrap:wrap">
        <div class="avatar" style="width:58px;height:58px;font-size:21px;background:${avColor(p.fullName)}">${initials(p.fullName)}</div>
        <div style="flex:1;min-width:150px"><div style="font-size:19px;font-weight:750;letter-spacing:-.3px">${esc(p.fullName)}</div><div style="font-size:12.5px;color:var(--ink-500);margin-top:2px">${p.grupo} · Congregación Las Flores</div><div style="display:flex;gap:7px;margin-top:9px;flex-wrap:wrap">${roleBadge(p.role)}${estadoBadge(p.estado)}</div></div>
        <div style="display:flex;gap:8px;flex-shrink:0"><button class="btn sm" data-click="fichaToEdit" data-click-args='[${id}]'>${svg('edit')}Editar</button><button class="btn sm primary" data-click="downloadCard" data-click-args='[${id}]'>${svg('download')}Descargar tarjeta</button></div>
      </div>

      <div class="form-section-title">${svg('phone')} Información de contacto</div>
      <div class="form-grid">
        ${infoCard('phone','Teléfono móvil',p.tel)}
        ${infoCard('mail','Correo electrónico',p.email)}
        ${infoCard('pin','Dirección',p.dir)}
        ${infoCard('people','Familia',familia)}
      </div>

      <div class="form-section-title">${svg('user')} Información personal</div>
      <div class="form-grid">
        ${infoCard('cake','Fecha de nacimiento',fmtFecha(p.nacimiento))}
        ${infoCard('check','Fecha de bautismo',fmtFecha(p.bautismo))}
        ${infoCard('user','Sexo',p.sex==='M'?'Hombre':'Mujer')}
        ${infoCard('star','Privilegios',`<span style="display:flex;flex-wrap:wrap;gap:5px">${(p.privilegios&&p.privilegios.length?p.privilegios:[p.role]).map(roleBadge).join('')}</span>`)}
        ${infoCard('shield','Nivel de acceso',p.accessRole||defaultAccessRole(p.privilegios||[p.role]))}
        ${infoCard('flag','Fecha de nombramiento',fmtFecha(p.nombramiento))}
        ${infoCard('doc','Observaciones',p.obs||'Sin observaciones')}
      </div>

      <div class="form-section-title">${svg('shield')} Información congregacional</div>
      <div class="form-grid">
        ${infoCard('home','Congregación','Las Flores')}
        ${infoCard('people','Grupo',p.grupo)}
        ${infoCard('star','Superintendente',p.superintendente)}
        ${infoCard('user','Auxiliar',p.auxiliar)}
        ${infoCard('flag','Estado',estadoBadge(p.estado))}
        ${infoCard('report','Último informe enviado',ultimoInf)}
        <div style="grid-column:1/-1">${infoCard('calendar','Próxima asignación',proxAsign)}</div>
      </div>

      <div class="form-section-title">${svg('chart')} Estadísticas rápidas</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:11px">
        ${statCard(infAno,'Informes este año')}
        ${statCard(terrCount,'Territorios asignados')}
        ${statCard(parts,'Participaciones en reuniones')}
        ${statCard(estudios,'Estudios bíblicos')}
        ${statCard(asist+'%','Asistencia promedio')}
      </div>`,
    footer:`<button class="btn" data-click="openHistAsign" data-click-args='[${id}]' data-preclose="closeModal">${svg('calendar')}Historial</button><button class="btn primary" data-click="closeModal">Cerrar</button>`};
}
function openFicha(id){if(!requireCap('personal.view'))return;openModalCustom(fichaViewConfig(id))}
function fichaToEdit(id){if(!requireCap('data.edit'))return;swapModalContent(fichaEditConfig(id,true))}
function editFichaCancel(id){swapModalContent(fichaViewConfig(id))}
function fichaField(label,ico,val){return `<div class="form-row"><label style="color:var(--ink-400);display:flex;align-items:center;gap:6px;font-size:11.5px;text-transform:uppercase;letter-spacing:.3px">${svg(ico)} ${label}</label><div style="font-size:14px;font-weight:600">${val}</div></div>`}
function fichaInline(label,ico,val){return `<label style="color:var(--ink-400);display:flex;align-items:center;gap:6px;font-size:11.5px;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">${svg(ico)} ${label}</label><div style="font-size:14px;font-weight:600">${val}</div>`}

function fichaEditConfig(id,fromView){
  const p=DB.find(x=>x.id===id);
  const privs=(p.privilegios&&p.privilegios.length)?p.privilegios:[p.role];
  const access=p.accessRole||defaultAccessRole(privs);
  return {icon:'edit',tint:'t-brand',title:'Editar contacto',sub:`Actualiza la ficha de ${esc(p.fullName)}`,size:'lg',
    body:`<div class="form-section-title">${svg('user')} Información personal</div>
      <div class="form-grid">
        <div class="form-row"><label>Nombre</label><input class="input" id="ec_nombre" value="${esc(p.nombre)}"/></div>
        <div class="form-row"><label>Apellidos</label><input class="input" id="ec_ape" value="${esc(p.apellidos)}"/></div>
        <div class="form-row"><label>Fecha de nacimiento</label><input class="input" type="date" id="ec_nac" value="${p.nacimiento}"/></div>
        <div class="form-row"><label>Teléfono</label><input class="input" id="ec_tel" value="${esc(p.tel)}" inputmode="numeric" data-input="maskPhone" data-input-args='["$el"]' aria-describedby="ec_tel_hint"/><span class="field-hint" id="ec_tel_hint" aria-live="polite"></span></div>
        <div class="form-row"><label>Correo electrónico</label><input class="input" type="email" id="ec_mail" value="${esc(p.email)}" data-input="validateEmail" data-input-args='["$el"]' aria-describedby="ec_mail_hint"/><span class="field-hint" id="ec_mail_hint" aria-live="polite"></span></div>
        <div class="form-row"><label>Dirección</label><input class="input" id="ec_dir" value="${esc(p.dir)}"/></div></div>
      <div class="form-section-title">${svg('shield')} Información congregacional</div>
      <div class="form-grid">
        <div class="form-row"><label>Grupo</label><select class="select" id="ec_grupo">${GRUPOS.map(g=>`<option ${g===p.grupo?'selected':''}>${g}</option>`).join('')}</select></div>
        <div class="form-row"><label>Nivel de acceso (rol)</label><select class="select" id="ec_access">${ACCESS_ROLES.map(r=>`<option ${r===access?'selected':''}>${r}</option>`).join('')}</select></div>
        <div class="form-row"><label>Estado</label><select class="select" id="ec_estado">${['Activo','Irregular','Inactivo'].map(e=>`<option ${e===p.estado?'selected':''}>${e}</option>`).join('')}</select></div>
        <div class="form-row full"><label>Privilegios ministeriales</label>
          <div id="ec_privs" style="display:flex;flex-wrap:wrap;gap:8px">${PRIVILEGIOS.map(pr=>`<button type="button" class="chip-sel${privs.includes(pr)?' on':''}" data-priv="${pr}" aria-pressed="${privs.includes(pr)}" data-click="togglePrivChip" data-click-args='["$el"]'>${pr}</button>`).join('')}</div>
          <span class="field-hint" style="margin-top:8px">Selecciona uno o varios privilegios. El nivel de acceso se ajusta automáticamente (Anciano → Administrador de Congregación; Siervo Ministerial → Administrador de Asignaciones; los demás → Publicador). El Super Administrador se asigna manualmente.</span>
        </div></div>
      <div class="form-section-title">${svg('doc')} Información adicional</div>
      <div class="form-grid">
        <div class="form-row"><label>Fecha de bautismo</label><input class="input" type="date" id="ec_baut" value="${p.bautismo}"/></div>
        <div class="form-row"><label>Fecha de nombramiento</label><input class="input" type="date" id="ec_nomb" value="${p.nombramiento}"/></div>
        <div class="form-row full"><label>Observaciones</label><textarea class="textarea" id="ec_obs" placeholder="Notas internas…">${esc(p.obs)}</textarea></div></div>`,
    footer:`<button class="btn" onclick="${fromView?`editFichaCancel(${id})`:'closeModal()'}">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveContact" data-save-args='[${id}, ${fromView?'true':'false'}]'>${svg('check')}Guardar cambios</button>`};
}
function openEditContact(id){if(!requireCap('data.edit'))return;openModalCustom(fichaEditConfig(id,false))}
function fieldHintEl(el){const hid=el.getAttribute('aria-describedby')||(el.id?el.id+'_hint':'');return hid?document.getElementById(hid):null}
function validateEmail(el){const v=el.value.trim();const ok=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);el.classList.toggle('valid',ok&&!!v);el.classList.toggle('invalid',!!v&&!ok);el.setAttribute('aria-invalid',(!!v&&!ok)?'true':'false');const h=fieldHintEl(el);if(h){h.textContent=v?(ok?'✓ Correo válido':'Formato de correo inválido'):'';h.className='field-hint '+(ok?'ok':(v?'err':''))}}
function maskPhone(el){const d=el.value.replace(/\D/g,'').slice(0,10);let out=d;if(d.length>6)out=d.slice(0,3)+' '+d.slice(3,6)+' '+d.slice(6);else if(d.length>3)out=d.slice(0,3)+' '+d.slice(3);el.value=out;const full=d.length===10;el.classList.toggle('valid',full);el.classList.toggle('invalid',d.length>0&&!full);el.setAttribute('aria-invalid',(d.length>0&&!full)?'true':'false');const h=fieldHintEl(el);if(h){const falta=10-d.length;h.textContent=d.length===0?'':(full?'✓ Número válido':`Faltan ${falta} dígito${falta!==1?'s':''}`);h.className='field-hint '+(full?'ok':'err')}}
function saveWithFeedback(btn,fn){if(btn.disabled)return;const html=btn.innerHTML;btn.disabled=true;btn.classList.add('loading');btn.setAttribute('aria-busy','true');btn.innerHTML='<span class="spinner"></span>Guardando…';setTimeout(()=>{fn();if(btn.isConnected){btn.disabled=false;btn.classList.remove('loading');btn.removeAttribute('aria-busy');btn.innerHTML=html}},700)}
/* --- Searchable Select / Autocomplete --- */
function ssEsc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function searchSelect(id,options,selected,opts){opts=opts||{};
  const norm=options.map(o=>(o&&typeof o==='object')?{value:String(o.value),label:String(o.label)}:{value:String(o),label:String(o)});
  const cur=norm.find(o=>o.value===String(selected))||(opts.placeholder?null:norm[0]);
  return `<div class="ssel" id="${id}" data-value="${cur?ssEsc(cur.value):''}"${opts.onchange?` data-onchange="${ssEsc(opts.onchange)}"`:''}>
    <button type="button" class="ssel-toggle" data-click="sselToggle" data-click-args='["${id}"]' aria-haspopup="listbox"><span class="ssel-cur">${cur?cur.label:(opts.placeholder||'Seleccionar…')}</span>${svg('chevD')}</button>
    <div class="ssel-pop" hidden><div class="ssel-search-wrap">${svg('search')}<input class="ssel-search" placeholder="Buscar por nombre o apellido…" data-input="sselFilter" data-input-args='["${id}", "$val"]' data-click="__absorb"></div>
      <div class="ssel-list">${norm.map(o=>`<div class="ssel-opt${cur&&cur.value===o.value?' sel':''}" data-value="${ssEsc(o.value)}" data-l="${ssEsc(o.label.toLowerCase())}" data-click="sselPick" data-click-args='["${id}", "${ssEsc(o.value)}"]'>${o.label}</div>`).join('')}<div class="ssel-empty" hidden>Sin coincidencias</div></div>
    </div></div>`;
}
function sselToggle(id){const w=document.getElementById(id);if(!w)return;const pop=w.querySelector('.ssel-pop');const wasOpen=!pop.hidden;document.querySelectorAll('.ssel-pop').forEach(p=>p.hidden=true);if(!wasOpen){pop.hidden=false;const s=pop.querySelector('.ssel-search');s.value='';sselFilter(id,'');setTimeout(()=>s.focus(),10);}}
function sselFilter(id,q){q=(q||'').toLowerCase().trim();const w=document.getElementById(id);let vis=0;w.querySelectorAll('.ssel-opt').forEach(o=>{const m=!q||o.getAttribute('data-l').indexOf(q)>=0;o.style.display=m?'':'none';if(m)vis++;});const e=w.querySelector('.ssel-empty');if(e)e.hidden=vis>0;}
function sselPick(id,val){const w=document.getElementById(id);w.dataset.value=val;let picked=null;w.querySelectorAll('.ssel-opt').forEach(o=>{const on=o.getAttribute('data-value')===val;o.classList.toggle('sel',on);if(on)picked=o;});w.querySelector('.ssel-cur').textContent=picked?picked.textContent:val;w.querySelector('.ssel-pop').hidden=true;const oc=w.getAttribute('data-onchange');if(oc){try{new Function('value','id',oc)(val,id);}catch(e){}}}
function sselValue(id){const w=document.getElementById(id);return w?(w.dataset.value||''):'';}
document.addEventListener('click',function(e){if(!(e.target.closest&&e.target.closest('.ssel')))document.querySelectorAll('.ssel-pop').forEach(p=>p.hidden=true);});
function saveContact(id,fromView){
  const p=DB.find(x=>x.id===id);const gv=k=>{const el=document.getElementById(k);return el?el.value:undefined};
  const n=gv('ec_nombre'),a=gv('ec_ape');if(n)p.nombre=n;if(a!==undefined)p.apellidos=a;p.fullName=`${p.nombre} ${p.apellidos}`.trim(); /* crudo en el modelo; se escapa al renderizar */
  const tel=gv('ec_tel');if(tel!==undefined)p.tel=tel;
  const mail=gv('ec_mail');if(mail!==undefined)p.email=mail;
  const dir=gv('ec_dir');if(dir!==undefined)p.dir=dir;
  const nac=gv('ec_nac');if(nac)p.nacimiento=nac;
  const baut=gv('ec_baut');if(baut)p.bautismo=baut;
  const nomb=gv('ec_nomb');if(nomb)p.nombramiento=nomb;
  const obs=gv('ec_obs');if(obs!==undefined)p.obs=obs;
  const privsSel=selectedPrivs();if(privsSel.length){p.privilegios=privsSel;p.role=primaryPriv(privsSel);p.privilegio=p.role;}
  const access=gv('ec_access');if(access)p.accessRole=access;
  const est=gv('ec_estado');if(est)p.estado=est;
  const grp=gv('ec_grupo');if(grp){const gi=GRUPOS.indexOf(grp);if(gi>=0){p.grupo=grp;p.grupoIdx=gi;if(REAL_GROUPS[gi]){p.superintendente=REAL_GROUPS[gi].sup;p.auxiliar=REAL_GROUPS[gi].aux;}}}
  refreshDerived();persistAll();
  if(currentView==='database')renderDbTable();
  if(fromView)swapModalContent(fichaViewConfig(id));else closeModal();
  toast('Cambios guardados correctamente');
}
function selectedPrivs(){return Array.prototype.slice.call(document.querySelectorAll('#ec_privs .chip-sel.on')).map(b=>b.getAttribute('data-priv'));}
function togglePrivChip(el){const on=el.classList.toggle('on');el.setAttribute('aria-pressed',on?'true':'false');syncAccessRole();}
function syncAccessRole(){const sel=document.getElementById('ec_access');if(!sel)return;if(sel.value==='Nivel 1 – Super Administrador')return;sel.value=defaultAccessRole(selectedPrivs());}

function openHistAsign(id){
  const p=DB.find(x=>x.id===id);const items=[];
  for(let i=0;i<8;i++)items.push({fecha:dstr(daysAgo(rint(3,180))),tipo:pick(['Discurso público','Lectura de la Biblia','Micrófonos','Acomodadores','Audio','Conductor de La Atalaya','Oración','Presidente']),estado:chance(.85)?'Completada':'Programada'});
  openModalCustom({icon:'calendar',tint:'t-violet',title:'Historial de asignaciones',sub:p.fullName,
    body:`<div class="table-wrap" style="border:1px solid var(--border);border-radius:13px"><table class="data"><thead><tr><th>Fecha</th><th>Asignación</th><th>Estado</th></tr></thead><tbody>${items.map(a=>`<tr><td class="muted">${a.fecha}</td><td><b>${a.tipo}</b></td><td>${a.estado==='Completada'?'<span class="badge green"><span class="bdot"></span>Completada</span>':'<span class="badge blue"><span class="bdot"></span>Programada</span>'}</td></tr>`).join('')}</tbody></table></div>`,
    footer:`<button class="btn" data-click="closeModal">Cerrar</button>`});
}
function openInformesPub(id){
  const p=DB.find(x=>x.id===id);const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio'];
  openModalCustom({icon:'report',tint:'t-cyan',title:'Informes mensuales',sub:p.fullName+' · 2026',
    body:`<div class="table-wrap" style="border:1px solid var(--border);border-radius:13px"><table class="data"><thead><tr><th>Mes</th><th>Estado</th><th>Horas</th><th>Estudios</th></tr></thead><tbody>${meses.map((m,i)=>{const ent=i<5?true:chance(.7);return `<tr><td><b>${m}</b></td><td>${ent?'<span class="badge green"><span class="bdot"></span>Entregado</span>':'<span class="badge red"><span class="bdot"></span>Pendiente</span>'}</td><td>${ent?rint(2,60)+' h':'—'}</td><td>${ent?rint(0,6):'—'}</td></tr>`}).join('')}</tbody></table></div>`,
    footer:`<button class="btn" data-click="closeModal">Cerrar</button>`});
}
function openPrivilegio(id){
  const p=DB.find(x=>x.id===id);
  openModalCustom({icon:'shield',tint:'t-amber',title:'Cambiar privilegios',sub:p.fullName,
    body:`<div class="form-row"><label>Privilegio actual</label><div style="margin:4px 0 16px">${roleBadge(p.role)}</div></div>
      <div class="form-row"><label>Nuevo privilegio</label><select class="select" id="newPriv">${PRIVILEGIOS.map(r=>`<option ${r===p.role?'selected':''}>${r}</option>`).join('')}</select></div>
      <div class="form-row full" style="margin-top:16px"><label>Fecha de nombramiento</label><input class="input" type="date" value="${diso(TODAY)}"/></div>
      <div class="form-row full" style="margin-top:16px"><label>Observaciones</label><textarea class="textarea" placeholder="Acuerdo del cuerpo de ancianos…"></textarea></div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="applyPriv" data-click-args='[${id}]'>${svg('check')}Actualizar</button>`});
}
function applyPriv(id){const v=document.getElementById('newPriv').value;const p=DB.find(x=>x.id===id);p.role=v;p.privilegio=v;p.privilegios=[v];p.accessRole=defaultAccessRole([v]);closeModal();if(currentView==='database')renderDbTable();toast('Privilegio actualizado')}
function markInactive(id){
  const p=DB.find(x=>x.id===id);
  openModalCustom({icon:'pause',tint:'t-red',title:'Marcar como inactivo',sub:`¿Confirmas esta acción para ${esc(p.fullName)}?`,
    body:`<p style="font-size:14px;color:var(--ink-700);line-height:1.6">El publicador se marcará como <b>inactivo</b> y dejará de aparecer en las asignaciones activas. Podrás reactivarlo en cualquier momento desde su ficha.</p>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn danger" data-click="applyInactive" data-click-args='[${id}]'>${svg('pause')}Marcar inactivo</button>`});
}
function applyInactive(id){const p=DB.find(x=>x.id===id);p.estado='Inactivo';closeModal();if(currentView==='database')renderDbTable();toast(p.nombre+' marcado como inactivo')}
function deletePublisher(id){
  const p=DB.find(x=>x.id===id);
  openModalCustom({icon:'trash',tint:'t-red',title:'Eliminar publicador',sub:`¿Seguro que deseas eliminar a ${esc(p.fullName)}?`,
    body:`<p style="font-size:14px;color:var(--ink-700);line-height:1.6">Esta acción quitará de forma permanente a <b>${esc(p.fullName)}</b> de la base de datos de la congregación. Sus asignaciones e informes asociados dejarán de mostrarse.</p><p class="muted" style="font-size:12.5px;margin-top:12px">Esta acción no se puede deshacer.</p>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn danger" data-click="applyDelete" data-click-args='[${id}]'>${svg('trash')}Eliminar definitivamente</button>`});
}
function applyDelete(id){if(!requireCap('personal.manage'))return;const i=DB.findIndex(x=>x.id===id);if(i>=0){const p=DB[i];DB.splice(i,1);refreshDerived();persistAll();closeModal();if(currentView==='database')renderDbTable();toastAction(`${esc(p.fullName)} eliminado de la base de datos`,'Deshacer',()=>{DB.splice(Math.min(i,DB.length),0,p);refreshDerived();persistAll();if(currentView==='database')renderDbTable();toast(`${esc(p.fullName)} restaurado`)},{icon:'trash',cls:'undo',duration:6000})}}


/* -------- TERRITORIOS -------- */
let terrTab='mapa', terrCal={y:2026,m:6};
let terrState={q:'',sortCol:'num',sortDir:'asc',page:1,pageSize:10};
let terrAsignFilter={month:'',encargado:''};let taSeq=100;
const TERR_ASIGN=[];
(function(){const cf=['conf','pend','conf','rech','pend','conf'];[-2,-5,-9,-13,3,7].forEach((off,i)=>{const d=new Date(TODAY);d.setDate(d.getDate()+off);const enc=males[hashStr('taE'+i)%males.length];const nt=1+hashStr('taN'+i)%3;const terrs=[];for(let k=0;k<nt;k++)terrs.push(TERR[hashStr('taT'+i+k)%TERR.length].num);TERR_ASIGN.push({id:'ta'+i,date:diso(d),encargadoId:enc.id,territorios:Array.from(new Set(terrs)),obs:i%2?'Salida matutina · punto de encuentro Salón del Reino':'',conf:cf[i]||'pend'});});})();
VIEWS.territorios=()=>{
  const cobertura=Math.round(STATS.terrComp/STATS.terrTotal*100);
  const proximo=TERR.find(t=>t.estado==='Pendiente')||TERR.find(t=>t.estado==='Activo');
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Mapas y Territorios','Panel de administración · '+STATS.terrTotal+' territorios en Bogotá D.C.',
      `<button class="btn" data-click="exportTerrDocx">${svg('download')}Descargar reporte</button>${can('territory.manage')?`<button class="btn primary" data-click="openTerrCreate">${svg('plus')}Nuevo territorio</button>`:''}`)}
    <div class="kpi-grid" style="margin-bottom:18px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">
      ${[{v:STATS.terrTotal,l:'Total de territorios',t:'t-brand',i:'map'},{v:STATS.terrTotal-STATS.terrComp,l:'Pendientes por cubrir',t:'t-amber',i:'clock'},{v:STATS.terrComp,l:'Completados este ciclo',t:'t-green',i:'check'},{v:cobertura+'%',l:'Cobertura del ciclo',t:'t-cyan',i:'chart'},{v:'#'+(proximo?proximo.num:'—'),l:'Próximo programado',t:'t-violet',i:'flag'}].map(k=>`<div class="kpi"><div class="kpi-top"><div class="kpi-ico ${k.t}" style="width:38px;height:38px">${svg(k.i)}</div></div><div class="kpi-val" style="font-size:25px">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}
    </div>
    <div class="card" style="margin-bottom:22px"><div class="card-pad">
      <div style="display:flex;justify-content:space-between;margin-bottom:9px;flex-wrap:wrap;gap:8px"><b style="font-size:14px">Progreso del ciclo de territorios</b><span class="muted" style="font-size:13px">${STATS.terrComp} de ${STATS.terrTotal} completados</span></div>
      <div class="progress lg"><span style="width:${cobertura}%;background:linear-gradient(90deg,#22C55E,#15803d)"></span></div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><span class="badge green">${STATS.terrComp} completados</span><span class="badge amber">${STATS.terrTotal-STATS.terrComp} pendientes</span><span class="badge red">${STATS.terrVenc} vencidos</span><span class="muted" style="font-size:12px;margin-left:auto;align-self:center">Faltan ${STATS.terrTotal-STATS.terrComp} para completar el ciclo</span></div>
    </div></div>
    <div class="tabs">
      <div class="tab ${terrTab==='mapa'?'active':''}" data-click="setTerrTab" data-click-args='["mapa"]'>Vista de mapa</div>
      <div class="tab ${terrTab==='asignaciones'?'active':''}" data-click="setTerrTab" data-click-args='["asignaciones"]'>Asignaciones</div>
      <div class="tab ${terrTab==='nopredica'?'active':''}" data-click="setTerrTab" data-click-args='["nopredica"]'>Casas donde no se predica</div>
    </div>
    <div id="terrContent"></div></div>`;
  renderTerr();
};
function setTerrTab(t){terrTab=t;saveUiState();VIEWS.territorios()}
function openAsignTerr(num){if(!requireCap('territory.manage'))return;const t=num?TERR.find(x=>x.num===num):null;
  openModalCustom({icon:'calendar',tint:'t-green',title:'Reasignar territorio',sub:t?`Territorio #${t.num} · ${esc(t.barrio)} (${esc(t.localidad)})`:'Programa una salida de predicación',
    body:`<div class="form-grid">
      <div class="form-row"><label>Fecha de asignación</label><input class="input" id="at_fecha" type="date" value="${diso(TODAY)}"/></div>
      <div class="form-row"><label>Responsable *</label>${searchSelect('at_resp',males.map(p=>({value:p.id,label:p.fullName})),t&&t.resp?t.resp.id:'')}</div>
      <div class="form-row full"><label>Territorio</label><select class="select" id="at_terr">${TERR.map(x=>`<option value="${x.num}"${t&&x.num===t.num?' selected':''}>Territorio ${x.num} · ${esc(x.barrio)} (${esc(x.localidad)})</option>`).join('')}</select></div>
    </div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveAsignTerr">${svg('check')}Guardar</button>`});
}
function saveAsignTerr(){const num=document.getElementById('at_terr').value;const t=TERR.find(x=>x.num===num);if(!t)return;
  const rid=sselValue('at_resp');if(!rid){toast('Selecciona el responsable');return;}
  const p=DB.find(x=>String(x.id)===String(rid));if(!p)return;
  const fecha=document.getElementById('at_fecha').value;const fd=fecha?new Date(fecha+'T00:00:00'):TODAY;
  if(t.resp&&t.resp.id!==p.id)t.hist.unshift({resp:t.resp.fullName,asign:t.asign,comp:'Pendiente',obs:'Reasignado'});
  t.resp=p;t.asign=dstr(fd);if(t.estado==='Pendiente'||t.estado==='Vencido')t.estado='Activo';
  refreshStats();persistAll();closeModal();
  notify('Territorio asignado',`Territorio ${num} asignado a ${p.fullName}.`); /* notify almacena crudo; el render escapa */
  if(currentView==='territorios')VIEWS.territorios();renderNav();
  toast(`Territorio #${num} asignado a ${esc(p.fullName)} ✓`);}
function renderTerr(){
  const el=document.getElementById('terrContent');
  if(terrTab==='asignaciones'){renderTerrAsign();return}
  if(terrTab==='nopredica'){
    el.innerHTML=`<div class="card"><div class="card-head"><div class="kpi-ico t-red" style="width:34px;height:34px">${svg('home')}</div><h3>Casas donde no se predica</h3><div class="actions"><button class="btn sm primary" data-click="openModal" data-click-args='["nopredica"]'>${svg('plus')}Registrar</button></div></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>N° Territorio</th><th>Dirección</th><th>Localidad</th><th>Motivo</th><th>Fecha</th><th>Observaciones</th><th style="text-align:right">Acción</th></tr></thead><tbody>${NO_PREDICA.map((n,i)=>`<tr><td><b>#${n.terr}</b></td><td><b>${esc(n.dir.split(',')[0])}</b></td><td>${esc(n.localidad)}</td><td><span class="badge red">${esc(n.motivo)}</span></td><td class="muted">${n.fecha}</td><td class="muted">${esc(n.obs)}</td><td style="text-align:right"><button class="icon-btn" style="width:30px;height:30px" data-tip="Eliminar" data-click="delNoPredica" data-click-args='[${i}]'>${svg('trash')}</button></td></tr>`).join('')||`<tr><td colspan="7"><div class="empty">No hay casas registradas. Usa «Registrar» para añadir la primera.</div></td></tr>`}</tbody></table></div></div>`;
    return;
  }
  // Vista de mapa (con listado integrado)
  el.innerHTML=terrMap()+`<div class="card" style="margin-top:18px"><div class="card-head"><div class="kpi-ico t-brand" style="width:32px;height:32px">${svg('db')}</div><h3>Listado de territorios</h3><div class="actions"><div class="field" style="height:36px">${svg('search')}<input placeholder="Buscar por barrio o localidad…" value="${terrState.q}" data-input="applyFilter" data-fstate="terrState" data-fkey="q" data-fpage="1" data-frender="renderTerrTable"/></div></div></div><div class="table-wrap" id="terrTableWrap"></div></div>`;
  renderTerrTable();
}
/* --- Asignaciones de predicación diaria (CRUD) --- */
function encName(id){const p=DB.find(x=>String(x.id)===String(id));return p?p.fullName:'—';}
function mesLabel(ym){const p=ym.split('-');return new Date(+p[0],+p[1]-1,1).toLocaleDateString('es-CO',{month:'long',year:'numeric'});}
function diaSemana(iso){return new Date(iso+'T00:00:00').toLocaleDateString('es-CO',{weekday:'long'});}
function confBadgeAsign(c){if(c==='conf')return `<span class="badge green">${svg('check')}Confirmado</span>`;if(c==='rech')return `<span class="badge red">${svg('x')}Rechazado</span>`;return `<span class="badge amber">${svg('clock')}Pendiente</span>`;}
function setAsignConf(id,val){const a=TERR_ASIGN.find(x=>x.id===id);if(a){a.conf=val;persistAll();renderTerrAsign();toast('Confirmación actualizada ✓');}}
function renderTerrAsign(){
  saveUiState();
  const el=document.getElementById('terrContent');
  const months=Array.from(new Set(TERR_ASIGN.map(a=>a.date.slice(0,7)))).sort().reverse();
  const encs=Array.from(new Set(TERR_ASIGN.map(a=>String(a.encargadoId))));
  let list=TERR_ASIGN.slice().sort((a,b)=>a.date<b.date?1:(a.date>b.date?-1:0));
  if(terrAsignFilter.month)list=list.filter(a=>a.date.slice(0,7)===terrAsignFilter.month);
  if(terrAsignFilter.encargado)list=list.filter(a=>String(a.encargadoId)===terrAsignFilter.encargado);
  el.innerHTML=`<div class="card"><div class="card-head"><div class="kpi-ico t-green" style="width:34px;height:34px">${svg('calendar')}</div><h3>Asignaciones de predicación diaria</h3><div class="actions"><button class="btn sm primary" data-click="openTerrAsignModal">${svg('plus')}Nueva asignación</button></div></div>
    <div style="padding:11px 18px;background:var(--brand-50);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--ink-500);line-height:1.4">${svg('phone')}<span>La <b>Confirmación</b> se actualiza automáticamente según la respuesta del hermano desde su aplicación (Confirmado o Rechazado). El administrador solo puede visualizar este estado, no modificarlo.</span></div>
    <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      <div class="field" style="height:38px">${svg('calendar')}<select data-change="applyFilter" data-fstate="terrAsignFilter" data-fkey="month" data-frender="renderTerrAsign"><option value="">Todos los meses</option>${months.map(m=>`<option value="${m}"${terrAsignFilter.month===m?' selected':''} style="text-transform:capitalize">${mesLabel(m)}</option>`).join('')}</select></div>
      <div class="field" style="height:38px">${svg('user')}<select data-change="applyFilter" data-fstate="terrAsignFilter" data-fkey="encargado" data-frender="renderTerrAsign"><option value="">Todos los encargados</option>${encs.map(e=>`<option value="${e}"${terrAsignFilter.encargado===e?' selected':''}>${encName(e)}</option>`).join('')}</select></div>
      <button class="btn ghost sm" style="margin-left:auto" onclick="terrAsignFilter={month:'',encargado:''};renderTerrAsign()">${svg('refresh')}Limpiar</button>
    </div>
    <div class="table-wrap"><table class="data"><thead><tr><th>Fecha</th><th>Encargado</th><th>Territorios</th><th>Confirmación</th><th>Observaciones</th><th style="text-align:right">Acciones</th></tr></thead><tbody>
      ${list.map(a=>`<tr><td><b>${dstr(new Date(a.date+'T00:00:00'))}</b><br><small class="muted" style="text-transform:capitalize">${diaSemana(a.date)}</small></td><td><div class="cell-user">${avatarHTML(encName(a.encargadoId))}<b>${encName(a.encargadoId)}</b></div></td><td><div style="display:flex;flex-wrap:wrap;gap:5px">${a.territorios.map(n=>`<span class="badge violet">#${n}</span>`).join('')||'<span class="muted">—</span>'}</div></td><td>${confBadgeAsign(a.conf)}<div class="muted" style="font-size:10.5px;margin-top:4px;display:flex;align-items:center;gap:3px">${svg('phone')}<span>vía app del hermano</span></div></td><td class="muted">${esc(a.obs||'—')}</td><td style="text-align:right"><button class="icon-btn" style="width:30px;height:30px" data-tip="Editar" data-click="openTerrAsignModal" data-click-args='["${a.id}"]'>${svg('edit')}</button><button class="icon-btn" style="width:30px;height:30px" data-tip="Eliminar" data-click="delTerrAsign" data-click-args='["${a.id}"]'>${svg('trash')}</button></td></tr>`).join('')||`<tr><td colspan="6"><div class="empty">Sin asignaciones para los filtros aplicados.</div></td></tr>`}
    </tbody></table></div></div>`;
}
function openTerrAsignModal(id){const a=id?TERR_ASIGN.find(x=>x.id===id):null;const sel=a?a.territorios.slice():[];
  const usados={};TERR_ASIGN.forEach(x=>{if(!a||x.id!==a.id)x.territorios.forEach(n=>{usados[n]=x.date;});});
  openModalCustom({icon:'calendar',tint:'t-green',title:id?'Editar asignación':'Nueva asignación',sub:'Encargado y territorios para un día de predicación',size:'lg',
    body:`<div class="form-grid">
      <div class="form-row"><label>Fecha *</label><input class="input" type="date" id="ta_date" value="${a?a.date:diso(TODAY)}"/></div>
      <div class="form-row"><label>Encargado de la predicación *</label>${searchSelect('ta_enc',males.map(m=>({value:m.id,label:m.fullName})),a?a.encargadoId:'')}</div>
    </div>
    <div class="form-section-title">${svg('map')} Territorios asignados</div>
    <div id="ta_terrs" style="display:flex;flex-wrap:wrap;gap:7px;max-height:220px;overflow:auto;padding:4px 2px">${TERR.map(t=>`<button type="button" class="chip-sel${sel.includes(t.num)?' on':''}" data-terr="${t.num}" onclick="this.classList.toggle('on')" title="${esc(t.barrio)} · ${esc(t.localidad)}">#${t.num}${usados[t.num]?' •':''}</button>`).join('')}</div>
    <span class="field-hint" style="margin-top:8px">Puedes asignar uno o varios territorios para el mismo día. El punto (•) indica territorios ya asignados en otra fecha.</span>
    <div class="form-row full" style="margin-top:14px"><label>Observaciones (opcional)</label><textarea class="textarea" id="ta_obs" placeholder="Notas de la salida…">${a?a.obs||'':''}</textarea></div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" onclick="saveWithFeedback(this,()=>saveTerrAsign('${id||''}'))">${svg('check')}Guardar</button>`});
}
function saveTerrAsign(id){const date=document.getElementById('ta_date').value;const enc=sselValue('ta_enc');const terrs=Array.prototype.slice.call(document.querySelectorAll('#ta_terrs .chip-sel.on')).map(b=>b.getAttribute('data-terr'));const obs=(document.getElementById('ta_obs').value||'').trim();
  if(!date){toast('Selecciona una fecha');return;}
  if(!terrs.length){toast('Selecciona al menos un territorio');return;}
  if(id){const a=TERR_ASIGN.find(x=>x.id===id);if(a){a.date=date;a.encargadoId=enc;a.territorios=terrs;a.obs=obs;}}
  else{TERR_ASIGN.push({id:'ta'+(taSeq++),date:date,encargadoId:enc,territorios:terrs,obs:obs,conf:'pend'});}
  persistAll();closeModal();renderTerrAsign();toast(id?'Asignación actualizada ✓':'Asignación creada ✓');
}
function delTerrAsign(id){if(!requireCap('assign.manage'))return;const i=TERR_ASIGN.findIndex(x=>x.id===id);if(i<0)return;const removed=TERR_ASIGN.splice(i,1)[0];persistAll();renderTerrAsign();toastAction('Asignación eliminada','Deshacer',()=>{TERR_ASIGN.splice(Math.min(i,TERR_ASIGN.length),0,removed);persistAll();renderTerrAsign();toast('Asignación restaurada');},{icon:'trash',cls:'undo'});}
function terrFiltered(){
  const q=terrState.q.toLowerCase();
  let rows=TERR.filter(t=>!q||(t.barrio+t.localidad+t.num).toLowerCase().includes(q));
  const col=terrState.sortCol,dir=terrState.sortDir==='asc'?1:-1;
  rows.sort((a,b)=>{let va,vb;if(col==='barrio'){va=a.barrio;vb=b.barrio}else if(col==='resp'){va=a.resp?a.resp.fullName:'~';vb=b.resp?b.resp.fullName:'~'}else if(col==='estado'){va=a.estado;vb=b.estado}else if(col==='cobertura'){va=a.cobertura;vb=b.cobertura}else{va=a.num;vb=b.num}return va>vb?dir:va<vb?-dir:0;});
  return rows;
}
function terrSortBy(col){if(terrState.sortCol===col)terrState.sortDir=terrState.sortDir==='asc'?'desc':'asc';else{terrState.sortCol=col;terrState.sortDir='asc'}terrState.page=1;renderTerrTable()}
function terrGo(p){terrState.page=p;renderTerrTable()}
function renderTerrTable(){
  const all=terrFiltered();const total=all.length;const pages=Math.max(1,Math.ceil(total/terrState.pageSize));
  if(terrState.page>pages)terrState.page=pages;const start=(terrState.page-1)*terrState.pageSize;const rows=all.slice(start,start+terrState.pageSize);
  document.getElementById('terrTableWrap').innerHTML=`<table class="data"><thead><tr>${sortHeader(terrState,'terrSortBy','num','N°')}${sortHeader(terrState,'terrSortBy','barrio','Localidad / Barrio')}${sortHeader(terrState,'terrSortBy','estado','Estado')}<th>Asignación</th><th>Completado</th>${sortHeader(terrState,'terrSortBy','cobertura','Cobertura')}<th></th></tr></thead><tbody>
    ${rows.map(t=>`<tr class="clickable" data-dblclick="openTerrHist" data-dblclick-args='["${t.num}"]'><td><b>${t.num}</b></td><td><b>${esc(t.barrio)}</b><br><small class="muted">${esc(t.localidad)} · ${t.cuadras} cuadras · ${t.viviendas} viviendas</small></td><td>${estadoBadge(t.estado)}</td><td class="muted">${t.asign}</td><td class="muted">${t.comp}</td><td><span class="badge ${t.estado==='Vencido'?'red':'gray'}">${t.cobertura}</span></td><td style="text-align:right"><button class="btn sm ghost" data-click="openTerrHist" data-click-args='["${t.num}"]' data-stop="1">${svg('eye')}Ficha</button></td></tr>`).join('')||`<tr><td colspan="7"><div class="empty">Sin territorios para la búsqueda</div></td></tr>`}
  </tbody></table>
  <div class="pager"><span class="pager-info">Mostrando <b>${total?start+1:0}–${Math.min(start+terrState.pageSize,total)}</b> de <b>${total}</b> territorios</span>
    <div class="pager-ctrl"><button class="pg" ${terrState.page===1?'disabled':''} data-click="terrGo" data-click-args='[${terrState.page-1}]'>${svg('chevL')}</button>${pagerButtons(pages,terrState.page,'terrGo')}<button class="pg" ${terrState.page===pages?'disabled':''} data-click="terrGo" data-click-args='[${terrState.page+1}]'>${svg('chevR')}</button></div>
  </div>`;
}
function setTerrResp(num,id){if(!requireCap('territory.manage'))return;const t=TERR.find(x=>x.num===num);if(!t)return;const p=id?DB.find(x=>String(x.id)===String(id)):null;t.resp=p;if(p&&t.asign==='—')t.asign=dstr(TODAY);persistAll();renderTerrTable();toast(p?`Responsable de #${num}: ${esc(p.fullName)}`:`Asignación eliminada · Territorio #${num}`);}
/* --- imagen y ubicación de territorios --- */
let terrEditImg=null;
function terrImgFieldHTML(img,wrapId){const acc='image/jpeg,image/jpg,image/png,image/webp';
  if(img)return `<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><img src="${img}" alt="Imagen del territorio" style="width:250px;max-width:100%;height:158px;object-fit:cover;border-radius:12px;border:1px solid var(--border)"/><div style="display:flex;flex-direction:column;gap:8px"><label class="btn sm" style="cursor:pointer">${svg('edit')}Reemplazar<input type="file" accept="${acc}" style="display:none" data-change="terrImgPick" data-change-args='["$el", "${wrapId}"]'/></label><button type="button" class="btn sm danger" data-click="terrImgRemove" data-click-args='["${wrapId}"]'>${svg('trash')}Quitar</button></div></div>`;
  return `<label class="terr-drop">${svg('map')}<div><b>Subir imagen del territorio</b><small>JPG, JPEG, PNG o WEBP</small></div><input type="file" accept="${acc}" style="display:none" data-change="terrImgPick" data-change-args='["$el", "${wrapId}"]'/></label>`;}
function terrImgPick(input,wrapId){const f=input.files&&input.files[0];if(!f)return;if(!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)){toast('Formato no válido · usa JPG, PNG o WEBP');return;}
  const r=new FileReader();r.onload=e=>{terrEditImg=e.target.result;const w=document.getElementById(wrapId);if(w)w.innerHTML=terrImgFieldHTML(terrEditImg,wrapId);
    if(dataBackend()==='supabase'){
      const localPreview=terrEditImg;
      sbUploadTerrImage(f).then(url=>{if(terrEditImg!==localPreview)return;terrEditImg=url;const w2=document.getElementById(wrapId);if(w2)w2.innerHTML=terrImgFieldHTML(terrEditImg,wrapId);toast('Imagen subida a la nube ✓');})
        .catch(()=>{toast('No se pudo subir la imagen a la nube · se guardará localmente');});
    }else{toast('Imagen cargada · recuerda guardar');}
  };r.readAsDataURL(f);}
/* Sube la imagen a Supabase Storage (bucket público "territorios") y devuelve su URL pública */
async function sbUploadTerrImage(file){
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path='terr-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
  const s=loadSession();
  const r=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/object/territorios/'+path,{method:'POST',headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+((s&&s.access_token)||SUPABASE_ANON_KEY),'Content-Type':file.type},body:file});
  if(!r.ok)throw new Error('Storage '+r.status+': '+(await r.text().catch(()=>'')));
  return SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/object/public/territorios/'+path;
}
function terrImgRemove(wrapId){terrEditImg=null;const w=document.getElementById(wrapId);if(w)w.innerHTML=terrImgFieldHTML(null,wrapId);}
function isValidMaps(v){v=(v||'').trim();return /^https?:\/\/\S+$/.test(v)&&/(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.)/i.test(v);}
function validateMapsUrl(el){const v=el.value.trim();const ok=!v||isValidMaps(v);el.classList.toggle('valid',!!v&&ok);el.classList.toggle('invalid',!!v&&!ok);el.setAttribute('aria-invalid',(!!v&&!ok)?'true':'false');const h=fieldHintEl(el);if(h){h.textContent=v?(ok?'✓ Enlace válido':'Ingresa un enlace de Google Maps válido'):'';h.className='field-hint '+(ok?(v?'ok':''):'err');}}
function openTerrMaps(num){const t=TERR.find(x=>x.num===num);if(t&&t.maps)window.open(t.maps,'_blank','noopener');}
function openTerrEdit(num){if(!requireCap('territory.manage'))return;const t=TERR.find(x=>x.num===num);if(!t)return;terrEditImg=t.img||null;
  openModalCustom({icon:'edit',tint:'t-green',title:`Editar territorio #${t.num}`,sub:`${esc(t.barrio)} · ${esc(t.localidad)}`,size:'lg',
    body:`<div class="form-grid">
        <div class="form-row"><label>Responsable</label>${searchSelect('te_resp',[{value:'',label:'Sin asignar'}].concat(males.map(m=>({value:m.id,label:m.fullName}))),t.resp?t.resp.id:'')}</div>
        <div class="form-row"><label>Estado</label><select class="select" id="te_estado">${['Activo','Pendiente','Completado','Vencido'].map(e=>`<option${e===t.estado?' selected':''}>${e}</option>`).join('')}</select></div>
        <div class="form-row full"><label>Ubicación (Google Maps)</label><input class="input" id="te_maps" value="${t.maps||''}" placeholder="https://maps.app.goo.gl/… o https://www.google.com/maps/…" data-input="validateMapsUrl" data-input-args='["$el"]' aria-describedby="te_maps_hint"/><span class="field-hint" id="te_maps_hint" aria-live="polite"></span></div>
      </div>
      <div class="form-section-title">${svg('map')} Imagen de referencia del territorio</div>
      <div id="te_img_wrap">${terrImgFieldHTML(t.img,'te_img_wrap')}</div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveTerrEdit" data-save-args='["${num}"]'>${svg('check')}Guardar cambios</button>`});}
function saveTerrEdit(num){const t=TERR.find(x=>x.num===num);if(!t)return;
  const mapsEl=document.getElementById('te_maps');const maps=(mapsEl.value||'').trim();
  if(maps&&!isValidMaps(maps)){validateMapsUrl(mapsEl);toast('El enlace de Google Maps no es válido');return;}
  const rid=sselValue('te_resp');t.resp=rid?DB.find(x=>String(x.id)===String(rid)):null;
  t.estado=document.getElementById('te_estado').value;t.maps=maps||null;t.img=terrEditImg||null;
  if(t.resp&&t.asign==='—')t.asign=dstr(TODAY);
  persistAll();renderTerrTable();closeModal();toast(`Territorio #${num} actualizado`);}
function openTerrCreate(){if(!requireCap('territory.manage'))return;terrEditImg=null;const nextNum=String(TERR.length+1).padStart(3,'0');
  openModalCustom({icon:'map',tint:'t-green',title:'Nuevo territorio',sub:'Registra un territorio de predicación en Bogotá',size:'lg',
    body:`<div class="form-grid">
      <div class="form-row"><label>Número</label><input class="input" value="${nextNum}" disabled/></div>
      <div class="form-row"><label>Localidad</label><select class="select" id="tc_loc">${LOCALIDADES.map(l=>`<option>${l}</option>`).join('')}</select></div>
      <div class="form-row full"><label>Barrio *</label><input class="input" id="tc_barrio" placeholder="Ej. Niza Norte"/></div>
      <div class="form-row"><label>Cuadras</label><input class="input" id="tc_cuadras" type="number" placeholder="0"/></div>
      <div class="form-row"><label>Viviendas aprox.</label><input class="input" id="tc_viv" type="number" placeholder="0"/></div>
      <div class="form-row"><label>Responsable</label>${searchSelect('tc_resp',[{value:'',label:'Sin asignar'}].concat(males.map(m=>({value:m.id,label:m.fullName}))),'')}</div>
      <div class="form-row"><label>Estado</label><select class="select" id="tc_estado"><option>Pendiente</option><option>Activo</option></select></div>
      <div class="form-row full"><label>Ubicación (Google Maps)</label><input class="input" id="tc_maps" placeholder="https://maps.app.goo.gl/…" data-input="validateMapsUrl" data-input-args='["$el"]' aria-describedby="tc_maps_hint"/><span class="field-hint" id="tc_maps_hint" aria-live="polite"></span></div>
    </div>
    <div class="form-section-title">${svg('map')} Imagen de referencia del territorio</div>
    <div id="tc_img_wrap">${terrImgFieldHTML(null,'tc_img_wrap')}</div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveTerrCreate" data-save-args='["${nextNum}"]'>${svg('check')}Guardar</button>`});}
function saveNoPredica(){
  const dir=(document.getElementById('npd_dir').value||'').trim();
  if(!dir){document.getElementById('npd_dir').classList.add('invalid');toast('Ingresa la dirección');return;}
  const fecha=document.getElementById('npd_fecha').value;
  NO_PREDICA.unshift({terr:document.getElementById('npd_terr').value,dir,localidad:document.getElementById('npd_loc').value,motivo:document.getElementById('npd_motivo').value,fecha:fecha?dstr(new Date(fecha+'T00:00:00')):dstr(TODAY),obs:(document.getElementById('npd_obs').value||'').trim()||'—'});
  persistAll();closeModal();
  if(currentView==='territorios')renderTerr();
  toast('Dirección registrada ✓');}
function delNoPredica(i){if(!requireCap('territory.manage'))return;const n=NO_PREDICA[i];if(!n)return;
  confirmAction({title:'Eliminar registro',sub:n.dir.split(',')[0],body:'La dirección se quitará de la lista de casas donde no se predica.',ok:'Eliminar'},()=>{
    const removed=NO_PREDICA.splice(i,1)[0];persistAll();if(currentView==='territorios')renderTerr();
    toastAction('Registro eliminado','Deshacer',()=>{NO_PREDICA.splice(Math.min(i,NO_PREDICA.length),0,removed);persistAll();if(currentView==='territorios')renderTerr();toast('Registro restaurado');},{icon:'trash',cls:'undo'});});}
function saveTerrCreate(num){
  const barrio=(document.getElementById('tc_barrio').value||'').trim();
  if(!barrio){toast('Ingresa el barrio del territorio');return;}
  const mapsEl=document.getElementById('tc_maps');const maps=(mapsEl.value||'').trim();
  if(maps&&!isValidMaps(maps)){validateMapsUrl(mapsEl);toast('El enlace de Google Maps no es válido');return;}
  const loc=document.getElementById('tc_loc').value;const rid=sselValue('tc_resp');const resp=rid?DB.find(x=>String(x.id)===String(rid)):null;
  const estado=document.getElementById('tc_estado').value;
  TERR.push({num,localidad:loc,barrio,resp,estado,asign:resp?dstr(TODAY):'—',comp:'—',cobertura:'0 semanas',hist:[],cuadras:parseInt(document.getElementById('tc_cuadras').value,10)||0,viviendas:parseInt(document.getElementById('tc_viv').value,10)||0,img:terrEditImg||null,maps:maps||null});
  refreshStats();persistAll();closeModal();
  notify('Territorio asignado',`Territorio ${num} (${barrio}) registrado${resp?' · responsable '+resp.fullName:''}.`);
  if(currentView==='territorios')VIEWS.territorios();
  toast(`Territorio #${num} registrado correctamente`);
}
function renderTerrCal(){
  const {y,m}=terrCal;const first=new Date(y,m,1);const startDow=first.getDay();const dim=new Date(y,m+1,0).getDate();
  const monName=first.toLocaleDateString('es-CO',{month:'long',year:'numeric'});const dows=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  let cells='';
  for(let i=0;i<startDow;i++){const pd=new Date(y,m,1-startDow+i);cells+=`<div class="bigcal-cell out"><div class="dnum">${pd.getDate()}</div></div>`}
  for(let d=1;d<=dim;d++){const date=new Date(y,m,d);const isToday=diso(date)===diso(TODAY);const t=terrForDate(date);
    let ev='';if(t)ev=`<div class="cal-event terr ${t.estado==='Pendiente'?'pend':''}" data-click="openTerrHist" data-click-args='["${t.num}"]'>Territorio #${t.num}<small>Cap. ${t.captain.split(' ')[0]} ${t.captain.split(' ')[1]||''} · ${t.estado}</small></div>`;
    cells+=`<div class="bigcal-cell ${isToday?'today':''}"><div class="dnum">${d}</div>${ev}</div>`;}
  const total=startDow+dim;const trail=(7-total%7)%7;for(let i=1;i<=trail;i++)cells+=`<div class="bigcal-cell out"><div class="dnum">${i}</div></div>`;
  document.getElementById('terrContent').innerHTML=`<div class="bigcal"><div class="bigcal-head"><h3>${monName}</h3><div class="actions"><span class="muted" style="font-size:12px;margin-right:6px">Salidas de predicación: todos los días</span><button class="icon-btn" data-click="terrCalNav" data-click-args='[-1]'>${svg('chevL')}</button><button class="icon-btn" data-click="terrCalNav" data-click-args='[1]'>${svg('chevR')}</button></div></div><div class="bigcal-grid">${dows.map(d=>`<div class="bigcal-dow">${d}</div>`).join('')}${cells}</div></div>`;
}
function terrCalNav(delta){terrCal.m+=delta;if(terrCal.m<0){terrCal.m=11;terrCal.y--}if(terrCal.m>11){terrCal.m=0;terrCal.y++}renderTerrCal()}
function lfMapBG(){
  const calles=[[70,'Av. Calle 145'],[120,'Calle 144'],[170,'Calle 142'],[220,'Calle 141'],[270,'Calle 140A'],[320,'Calle 139']];
  const carreras=[[130,'Cra 118'],[230,'Cra 114'],[330,'Cra 111'],[430,'Cra 110'],[530,'Cra 108'],[630,'Cra 107'],[730,'Cra 104']];
  let g='<rect width="820" height="360" fill="#eef2f6"/>';
  g+='<ellipse cx="250" cy="118" rx="30" ry="17" fill="#dcefe0"/><ellipse cx="560" cy="180" rx="34" ry="20" fill="#dcefe0"/><ellipse cx="470" cy="288" rx="26" ry="14" fill="#dcefe0"/>';
  calles.forEach(([y],i)=>{g+=`<line x1="20" y1="${y}" x2="800" y2="${y}" stroke="${i===0?'#cdd6e0':'#dfe5ec'}" stroke-width="${i===0?5:2}"/>`});
  carreras.forEach(([x],i)=>{g+=`<line x1="${x}" y1="34" x2="${x}" y2="345" stroke="${i===6?'#cdd6e0':'#dfe5ec'}" stroke-width="${i===6?5:2}"/>`});
  calles.forEach(([y,l])=>{g+=`<text x="26" y="${y-4}" font-size="9.5" fill="#9aa3b2" font-family="Inter">${l}</text>`});
  carreras.forEach(([x,l])=>{g+=`<text x="${x+3}" y="342" font-size="9" fill="#9aa3b2" font-family="Inter">${l}</text>`});
  g+='<polygon points="165,98 470,72 712,96 740,205 662,300 360,322 178,255 150,150" fill="rgba(91,33,182,0.05)" stroke="#1f2430" stroke-width="4" stroke-linejoin="round"/>';
  g+='<circle cx="430" cy="150" r="9" fill="#EF4444"/><text x="430" y="154" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" font-family="Inter">H</text><text x="444" y="154" font-size="9.5" fill="#b91c1c" font-family="Inter">Cafam Suba</text>';
  g+='<rect x="150" y="42" width="166" height="26" rx="13" fill="#fff" stroke="#e2e8f0"/><circle cx="168" cy="55" r="4" fill="#5B21B6"/><text x="180" y="59" font-size="12" font-weight="700" fill="#5B21B6" font-family="Inter">Las Flores · Suba</text>';
  return g;
}
const LF_X0=205,LF_Y0=118,LF_SX=66,LF_SY=29,LF_CW=56,LF_CH=23;
function lfCell(i){return {x:LF_X0+(i%7)*LF_SX,y:LF_Y0+Math.floor(i/7)*LF_SY}}
function terrMap(){
  let cells='';
  for(let i=0;i<37;i++){const t=TERR[i];const{x,y}=lfCell(i);
    const fill={Activo:'#f0fdf4',Pendiente:'#fffbeb',Completado:'#ecfeff',Vencido:'#fef2f2'}[t.estado];const stroke={Activo:'#22C55E',Pendiente:'#F59E0B',Completado:'#06b6d4',Vencido:'#EF4444'}[t.estado];
    cells+=`<g style="cursor:pointer" data-click="openTerrHist" data-click-args='["${t.num}"]'><rect x="${x}" y="${y}" width="${LF_CW}" height="${LF_CH}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.4"/><text x="${x+LF_CW/2}" y="${y+15}" text-anchor="middle" font-size="11" font-weight="800" fill="${stroke}" font-family="Inter">${t.num}</text></g>`;}
  return `<div class="card card-pad"><div style="display:flex;gap:14px;margin-bottom:16px;flex-wrap:wrap;align-items:center"><b style="font-size:13.5px">Territorio Las Flores · 37 sectores</b><span class="badge green"><span class="bdot"></span>Activo</span><span class="badge amber"><span class="bdot"></span>Pendiente</span><span class="badge cyan"><span class="bdot"></span>Completado</span><span class="badge red"><span class="bdot"></span>Vencido</span></div><div style="overflow-x:auto;background:var(--surface-2);border-radius:14px;border:1px solid var(--border);padding:8px"><svg viewBox="0 0 820 360" style="width:100%;min-width:720px">${lfMapBG()}${cells}</svg></div></div>`;
}
function tStat(label,value,ico,tint){return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:13px 14px;display:flex;align-items:center;gap:11px"><div class="kpi-ico ${tint}" style="width:32px;height:32px;flex-shrink:0">${svg(ico)}</div><div style="min-width:0"><div style="font-size:10.5px;font-weight:700;letter-spacing:.3px;text-transform:uppercase;color:var(--ink-400)">${label}</div><div style="font-size:14px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${value}</div></div></div>`}
function openTerrHist(num){
  const t=TERR.find(x=>x.num===num);
  const noPred=NO_PREDICA.filter(n=>n.terr===t.num);
  const ultPred=t.comp!=='—'?t.comp:(t.hist.find(h=>h.comp!=='Pendiente')?.comp||'—');
  const proxAsign=dstr(daysFwd(7+hashStr('px'+t.num)%50));
  openModalCustom({icon:'map',tint:'t-green',title:`Territorio #${t.num} · ${esc(t.barrio)}`,sub:`${esc(t.localidad)}, Bogotá D.C.`,size:'lg',
    body:`<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:16px;align-items:start" class="terr-ficha-top">
        <div style="border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--surface)">
          <div style="display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid var(--border)"><div class="kpi-ico t-green" style="width:28px;height:28px">${svg('map')}</div><b style="font-size:13px">Mapa del territorio</b><span class="badge gray" style="margin-left:auto">Mini mapa GIS</span></div>
          <div class="terr-map">${terrMiniMap(t)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
          ${tStat('Estado',t.estado,'flag',t.estado==='Completado'?'t-green':t.estado==='Vencido'?'t-red':'t-amber')}
          ${tStat('Responsable',t.resp?t.resp.fullName.split(' ').slice(0,2).join(' '):'Sin asignar','user','t-brand')}
          ${tStat('Última predicación',ultPred,'check','t-cyan')}
          ${tStat('Próxima asignación',proxAsign,'calendar','t-violet')}
        </div>
      </div>
      ${t.img?`<div class="form-section-title">${svg('map')} Imagen del territorio</div><img src="${t.img}" alt="Imagen del territorio #${t.num}" style="width:100%;max-height:340px;object-fit:contain;border-radius:12px;border:1px solid var(--border);background:var(--surface-2)"/>`:''}
      <div class="form-section-title">Información general</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:11px">
        ${tStat('Localidad',t.localidad,'pin','t-brand')}
        ${tStat('Barrio',t.barrio,'home','t-cyan')}
        ${tStat('Cuadras',t.cuadras,'grid','t-violet')}
        ${tStat('Viviendas',t.viviendas+' aprox.','people','t-green')}
        ${tStat('Cobertura',t.cobertura,'clock','t-amber')}
        ${tStat('No se predica',noPred.length+' casas','warn','t-red')}
      </div>
      ${noPred.length?`<div class="form-section-title">Casas donde no se predica</div><div class="table-wrap" style="border:1px solid var(--border);border-radius:13px"><table class="data"><thead><tr><th>Dirección</th><th>Motivo</th><th>Fecha</th></tr></thead><tbody>${noPred.map(n=>`<tr><td><b>${esc(n.dir.split(',')[0])}</b></td><td><span class="badge red">${esc(n.motivo)}</span></td><td class="muted">${n.fecha}</td></tr>`).join('')}</tbody></table></div>`:''}
      <div class="form-section-title">Historial de asignaciones</div>
      <div class="table-wrap" style="border:1px solid var(--border);border-radius:13px"><table class="data"><thead><tr><th>Responsable</th><th>Fecha asignación</th><th>Fecha completado</th><th>Observaciones</th></tr></thead><tbody>${t.hist.map(h=>`<tr><td><b>${h.resp}</b></td><td class="muted">${h.asign}</td><td>${h.comp==='Pendiente'?'<span class="badge amber">Pendiente</span>':`<span class="muted">${h.comp}</span>`}</td><td class="muted">${esc(h.obs)}</td></tr>`).join('')}</tbody></table></div>`,
    footer:`<button class="btn" data-click="closeModal">Cerrar</button>${t.maps?`<button class="btn" data-click="openTerrMaps" data-click-args='["${t.num}"]'>${svg('pin')}Abrir en Google Maps</button>`:''}<button class="btn" data-click="openAsignTerr" data-click-args='["${t.num}"]' data-preclose="closeModal">${svg('refresh')}Reasignar</button><button class="btn primary" data-click="openTerrEdit" data-click-args='["${t.num}"]' data-preclose="closeModal">${svg('edit')}Editar territorio</button>`});
}
function terrMiniMap(t){
  const idx=(parseInt(t.num,10)-1)%42;const{x,y}=lfCell(idx);const cx=x+LF_CW/2,cy=y+LF_CH/2;
  const hl=`<rect x="${x-2}" y="${y-2}" width="${LF_CW+4}" height="${LF_CH+4}" rx="7" fill="#5B21B6" stroke="#fff" stroke-width="2"/><text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="Inter">${t.num}</text><circle cx="${cx}" cy="${y-13}" r="7" fill="#5B21B6" stroke="#fff" stroke-width="2"/><path d="M${cx-5},${y-9} L${cx+5},${y-9} L${cx},${y-1} Z" fill="#5B21B6"/>`;
  return `<svg viewBox="0 0 820 360" style="width:100%;display:block">${lfMapBG()}${hl}</svg>`;
}


/* -------- EXHIBIDORES (cuadrícula semanal) -------- */
let exhibSel=0, exhibWeek=0;
VIEWS.exhibidores=()=>{
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Exhibidores','Predicación pública · domingo a domingo · 7:00 a. m. a 7:00 p. m. · turnos de 2 h',
      `${can('assign.manage')?`<button class="btn primary" onclick="openExhibTurn(EXHIB_NAMES[exhibSel],diso(TODAY),0)">${svg('plus')}Asignar turno</button>`:''}`)}
    <div id="exhibSummary"></div>
    <div class="tabs">${EXHIB_NAMES.map((n,i)=>`<div class="tab ${exhibSel===i?'active':''}" data-click="setExhib" data-click-args='[${i}]'>${n}</div>`).join('')}</div>
    <div class="card"><div class="card-head"><div class="kpi-ico t-brand" style="width:34px;height:34px">${svg('grid')}</div><h3>Agenda semanal · ${EXHIB_NAMES[exhibSel]}</h3>
      <div class="actions"><span class="badge green"><span class="bdot"></span>Completo</span><span class="badge gray">Vacante</span><button class="icon-btn" data-click="exhibNav" data-click-args='[-1]'>${svg('chevL')}</button><button class="icon-btn" data-click="exhibNav" data-click-args='[1]'>${svg('chevR')}</button></div></div>
      <div class="card-pad" id="exhibGridWrap"></div>
    </div></div>`;
  renderExhib();
};
function setExhib(i){exhibSel=i;VIEWS.exhibidores()}
function exhibNav(d){exhibWeek+=d;VIEWS.exhibidores()}
function renderExhib(){
  const days=weekDates(exhibWeek);const ex=EXHIB_NAMES[exhibSel];const todayISO=diso(TODAY);const tomISO=diso(daysFwd(1));
  // summary cards
  let todayTurns=0,todayFull=0,tomTurns=0;
  TURN_SLOTS.forEach((s,si)=>{const td=days.find(d=>diso(d)===todayISO);if(td){const t=exhibTurn(ex,td,si);if(t){todayTurns++;todayFull++}}});
  const sumToday=TURN_SLOTS.map((s,si)=>{const td=days.find(d=>diso(d)===todayISO);if(!td)return null;return exhibTurn(ex,td,si)}).filter(Boolean);
  const sumTom=TURN_SLOTS.map((s,si)=>{const td=days.find(d=>diso(d)===tomISO);if(!td)return null;return exhibTurn(ex,td,si)}).filter(Boolean);
  const wk=days[0],we=days[6];
  document.getElementById('exhibSummary').innerHTML=`<div class="cols-3" style="margin-bottom:20px">
    <div class="card card-pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div class="kpi-ico t-brand" style="width:32px;height:32px">${svg('clock')}</div><b style="font-size:14px">Turno de hoy</b></div>${sumToday.length?sumToday.slice(0,2).map((t,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="tag">${TURN_SLOTS[i][0]}–${TURN_SLOTS[i][1]}</span><div style="display:flex;gap:-4px">${t.map(p=>avatarHTML(p.fullName,'av-xs')).join('')}</div><small class="muted">${t[0].fullName.split(' ')[0]} y ${t[1].fullName.split(' ')[0]}</small></div>`).join(''):'<span class="muted" style="font-size:13px">Sin turnos hoy en esta semana</span>'}</div>
    <div class="card card-pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div class="kpi-ico t-violet" style="width:32px;height:32px">${svg('calendar')}</div><b style="font-size:14px">Turno de mañana</b></div>${sumTom.length?sumTom.slice(0,2).map((t,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="tag">${TURN_SLOTS[i][0]}–${TURN_SLOTS[i][1]}</span><small class="muted">${t[0].fullName.split(' ')[0]} y ${t[1].fullName.split(' ')[0]}</small></div>`).join(''):'<span class="muted" style="font-size:13px">Sin turnos mañana</span>'}</div>
    <div class="card card-pad"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div class="kpi-ico t-green" style="width:32px;height:32px">${svg('check')}</div><b style="font-size:14px">Cobertura semanal</b></div><div style="font-size:13px;color:var(--ink-500)">Semana ${dshort(wk)} – ${dshort(we)}</div><div style="margin-top:8px;font-size:22px;font-weight:800">${countExhibFull(ex,days)}<span style="font-size:14px;color:var(--ink-400);font-weight:600"> / 42 turnos</span></div></div>
  </div>`;
  // grid
  let html=`<div class="exwrap"><div class="exgrid"><div class="gh corner">Hora</div>${days.map(d=>`<div class="gh ${diso(d)===todayISO?'today':''}">${DOW_ABBR[d.getDay()]}<small>${d.getDate()}</small></div>`).join('')}`;
  TURN_SLOTS.forEach((s,si)=>{html+=`<div class="gt">${s[0]}<br>${s[1]}</div>`;days.forEach(d=>{const t=exhibTurn(ex,d,si);const isT=diso(d)===todayISO;
    html+=`<div class="gc ${isT?'today':''}" role="button" data-click="openExhibTurn" data-click-args='["${ex}", "${diso(d)}", ${si}]'>${t?`<div class="ex-full">${t.map(p=>`<div class="ex-person">${avatarHTML(p.fullName,'av-xs')}<span>${esc(p.fullName.split(' ')[0])}</span></div>`).join('')}</div>`:`<div class="ex-empty">Vacante</div>`}</div>`;});});
  html+='</div></div>';
  document.getElementById('exhibGridWrap').innerHTML=html;
}
function countExhibFull(ex,days){let c=0;days.forEach(d=>TURN_SLOTS.forEach((s,si)=>{if(exhibTurn(ex,d,si))c++}));return c}
function openExhibTurn(ex,iso,si){if(!requireCap('assign.manage'))return;const d=new Date(iso+'T00:00:00');const cur=exhibTurn(ex,d,si);
  openModalCustom({icon:'display',tint:'t-cyan',title:'Turno de exhibidor',sub:`${ex} · ${dstr(d)} · ${TURN_SLOTS[si][0]}–${TURN_SLOTS[si][1]}`,
    body:`<div class="form-grid">
      <div class="form-row"><label>Exhibidor</label><select class="select" id="ext_ex">${EXHIB_NAMES.map(n=>`<option${n===ex?' selected':''}>${n}</option>`).join('')}</select></div>
      <div class="form-row"><label>Fecha</label><input class="input" id="ext_fecha" type="date" value="${iso}"/></div>
      <div class="form-row full"><label>Turno (2 h)</label><select class="select" id="ext_slot">${TURN_SLOTS.map((t,i)=>`<option value="${i}"${i===si?' selected':''}>${t[0]} – ${t[1]}</option>`).join('')}</select></div>
      <div class="form-row"><label>Responsable 1 *</label>${searchSelect('ext_p1',pubsActive.map(p=>({value:p.id,label:p.fullName})),cur?cur[0].id:'')}</div>
      <div class="form-row"><label>Responsable 2 *</label>${searchSelect('ext_p2',pubsActive.map(p=>({value:p.id,label:p.fullName})),cur?cur[1].id:'')}</div>
    </div>
    <span class="field-hint" style="margin-top:10px">Cada turno requiere dos publicadores. También puedes dejar el turno vacante.</span>`,
    footer:`<button class="btn danger" data-click="vaciarExhibTurn">${svg('trash')}Dejar vacante</button><button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveExhibTurn">${svg('check')}Guardar</button>`});}
function __extKey(){const ex=document.getElementById('ext_ex').value;const iso=document.getElementById('ext_fecha').value;const si=document.getElementById('ext_slot').value;if(!iso){toast('Selecciona la fecha del turno');return null}return ex+'|'+iso+'|'+si;}
function saveExhibTurn(){const key=__extKey();if(!key)return;
  const p1=sselValue('ext_p1'),p2=sselValue('ext_p2');
  if(!p1||!p2){toast('Selecciona los dos responsables del turno');return;}
  if(String(p1)===String(p2)){toast('Los dos responsables deben ser distintos');return;}
  EXHIB_OVR[key]=[p1,p2];persistAll();closeModal();
  const a=DB.find(x=>String(x.id)===String(p1)),b=DB.find(x=>String(x.id)===String(p2));
  notify('Nueva asignación',`Turno de exhibidor (${key.split('|')[0]}) asignado a ${a?a.fullName.split(' ')[0]:''} y ${b?b.fullName.split(' ')[0]:''}.`);
  if(currentView==='exhibidores')VIEWS.exhibidores();renderNav();
  toast('Turno guardado ✓');}
function vaciarExhibTurn(){const key=__extKey();if(!key)return;
  EXHIB_OVR[key]='empty';persistAll();closeModal();
  if(currentView==='exhibidores')VIEWS.exhibidores();
  toast('El turno quedó vacante');}

/* -------- INFORMES (filtros corregidos) -------- */
let informeFilter='todos';
let infState={sortCol:'nombre',sortDir:'asc',page:1,pageSize:10};
function setInformeFilter(f){informeFilter=f;infState.page=1;saveUiState();VIEWS.informes()}
VIEWS.informes=()=>{
  const base=INFORMES.filter(r=>{
    if(informeFilter==='entregados')return r.entregado;
    if(informeFilter==='pendientes')return !r.entregado;
    if(informeFilter==='precursores')return r.auxiliar;
    return true;});
  const entregados=base.filter(r=>r.entregado);
  const totalHoras=entregados.reduce((a,r)=>a+r.horas,0);const totalEst=entregados.reduce((a,r)=>a+r.estudios,0);
  const pct=base.length?Math.round(entregados.length/base.length*100):0;
  const allEnt=INFORMES.filter(r=>r.entregado).length;const globalPct=Math.round(allEnt/INFORMES.length*100);
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Informes Mensuales','Junio 2026 · seguimiento de entrega y actividad',`${can('report.send')?`<button class="btn primary" data-click="saveDelegated" data-save="remindAllPending">${svg('send')}Recordar pendientes</button>`:''}`)}
    <div class="kpi-grid" style="margin-bottom:22px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
      ${[{v:entregados.length,l:'Informes entregados',t:'t-green',i:'check'},{v:base.length-entregados.length,l:'Pendientes',t:'t-amber',i:'clock'},{v:totalHoras,l:'Horas reportadas',t:'t-brand',i:'clock'},{v:totalEst,l:'Estudios bíblicos',t:'t-violet',i:'people'},{v:pct+'%',l:'Tasa de entrega',t:'t-cyan',i:'chart'}].map(k=>`<div class="kpi"><div class="kpi-top"><div class="kpi-ico ${k.t}" style="width:38px;height:38px">${svg(k.i)}</div></div><div class="kpi-val">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}
    </div>
    <div class="card" style="margin-bottom:20px"><div class="card-pad"><div style="display:flex;justify-content:space-between;margin-bottom:9px"><b style="font-size:13.5px">Avance global de entrega del mes</b><b style="font-size:13.5px;color:var(--green-700)">${globalPct}%</b></div><div class="progress lg"><span style="width:${globalPct}%;background:var(--green)"></span></div></div></div>
    <div class="card"><div class="card-head"><h3>Detalle por publicador</h3>
      <div class="actions"><div class="seg">
        <button class="${informeFilter==='todos'?'active':''}" data-click="setInformeFilter" data-click-args='["todos"]'>Todos</button>
        <button class="${informeFilter==='entregados'?'active':''}" data-click="setInformeFilter" data-click-args='["entregados"]'>Entregados</button>
        <button class="${informeFilter==='pendientes'?'active':''}" data-click="setInformeFilter" data-click-args='["pendientes"]'>Pendientes</button>
        <button class="${informeFilter==='precursores'?'active':''}" data-click="setInformeFilter" data-click-args='["precursores"]'>Precursores</button>
      </div></div></div>
      <div class="table-wrap" id="infTableWrap"></div>
      </div></div>`;
  renderInfTable();
};
function infFiltered(){
  let rows=INFORMES.filter(r=>{if(informeFilter==='entregados')return r.entregado;if(informeFilter==='pendientes')return !r.entregado;if(informeFilter==='precursores')return r.auxiliar;return true;});
  const col=infState.sortCol,dir=infState.sortDir==='asc'?1:-1;
  rows.sort((a,b)=>{let va,vb;if(col==='grupo'){va=a.pub.grupo;vb=b.pub.grupo}else if(col==='estado'){va=a.entregado?1:0;vb=b.entregado?1:0}else if(col==='horas'){va=a.entregado?a.horas:-1;vb=b.entregado?b.horas:-1}else if(col==='estudios'){va=a.entregado?a.estudios:-1;vb=b.entregado?b.estudios:-1}else if(col==='tipo'){va=a.auxiliar?1:0;vb=b.auxiliar?1:0}else{va=a.pub.fullName;vb=b.pub.fullName}return va>vb?dir:va<vb?-dir:0;});
  return rows;
}
function infSortBy(col){if(infState.sortCol===col)infState.sortDir=infState.sortDir==='asc'?'desc':'asc';else{infState.sortCol=col;infState.sortDir='asc'}infState.page=1;renderInfTable()}
function infGo(p){infState.page=p;renderInfTable()}
function renderInfTable(){
  const all=infFiltered();const total=all.length;const pages=Math.max(1,Math.ceil(total/infState.pageSize));
  if(infState.page>pages)infState.page=pages;const start=(infState.page-1)*infState.pageSize;const rows=all.slice(start,start+infState.pageSize);
  document.getElementById('infTableWrap').innerHTML=`<table class="data"><thead><tr>${sortHeader(infState,'infSortBy','nombre','Publicador')}${sortHeader(infState,'infSortBy','grupo','Grupo')}${sortHeader(infState,'infSortBy','estado','Estado')}${sortHeader(infState,'infSortBy','horas','Horas')}${sortHeader(infState,'infSortBy','estudios','Estudios')}${sortHeader(infState,'infSortBy','tipo','Tipo')}<th style="text-align:right">Acción</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td><div class="cell-user">${avatarHTML(r.pub.fullName)}<div><b>${r.pub.fullName}</b><small>${r.pub.role}</small></div></div></td><td class="muted">${r.pub.grupo}</td><td>${r.entregado?`<span class="badge green">${svg('check')}Entregado</span>`:`<span class="badge red">${svg('warn')}Pendiente</span>`}</td><td>${r.entregado?'<b>'+r.horas+' h</b>':'—'}</td><td>${r.entregado?r.estudios:'—'}</td><td>${r.auxiliar?'<span class="badge violet">Precursor</span>':'<span class="badge gray">Publicador</span>'}</td><td style="text-align:right">${r.entregado?`<button class="btn sm ghost" data-click="openRegistrarInforme" data-click-args='[${r.pub.id}]'>${svg('edit')}Editar</button>`:`<button class="btn sm ghost" data-click="remindInforme" data-click-args='[${r.pub.id}]'>${svg('send')}Recordar</button><button class="btn sm primary" style="margin-left:6px" data-click="openRegistrarInforme" data-click-args='[${r.pub.id}]'>${svg('check')}Registrar</button>`}</td></tr>`).join('')||`<tr><td colspan="7"><div class="empty">Sin registros para este filtro</div></td></tr>`}
    </tbody></table>
    <div class="pager"><span class="pager-info">Mostrando <b>${total?start+1:0}–${Math.min(start+infState.pageSize,total)}</b> de <b>${total}</b> · filtro: <b>${informeFilter}</b></span>
      <div class="pager-ctrl"><button class="pg" ${infState.page===1?'disabled':''} data-click="infGo" data-click-args='[${infState.page-1}]'>${svg('chevL')}</button>${pagerButtons(pages,infState.page,'infGo')}<button class="pg" ${infState.page===pages?'disabled':''} data-click="infGo" data-click-args='[${infState.page+1}]'>${svg('chevR')}</button></div>
    </div>`;
}

function openSendReport(titulo){
  openModalCustom({icon:'send',tint:'t-brand',title:'Enviar reporte por correo',sub:titulo,
    body:`<div class="form-grid">
      <div class="form-row full"><label>Destinatario *</label><input class="input" id="sr_mail" type="email" placeholder="correo@ejemplo.com" value="${CONG_CFG.mail||'lasflores@congregacion.org'}" data-input="validateEmail" data-input-args='["$el"]' aria-describedby="sr_mail_hint"/><span class="field-hint" id="sr_mail_hint" aria-live="polite"></span></div>
      <div class="form-row full"><label>Mensaje (opcional)</label><textarea class="textarea" id="sr_msg" placeholder="Mensaje para el destinatario…"></textarea></div>
    </div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" onclick="saveWithFeedback(this,()=>sendReportMail('${titulo.replace(/'/g,'')}'))">${svg('send')}Enviar</button>`});}
function sendReportMail(titulo){const el=document.getElementById('sr_mail');const mail=(el.value||'').trim();
  if(!mail||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){el.classList.add('invalid');toast('Ingresa un correo válido');return;}
  closeModal();notify('Nuevo anuncio',`Reporte "${titulo}" enviado a ${mail}.`);toast(`Reporte "${titulo}" enviado a ${mail} ✓`);}
function remindAllPending(){const n=INFORMES.filter(r=>!r.entregado).length;
  if(!n){toast('No hay informes pendientes 🎉');return;}
  notify('Informe pendiente',`Se envió recordatorio a ${n} publicadores con informe pendiente.`);
  toast(`Recordatorio enviado a ${n} publicador${n!==1?'es':''} ✓`);}
function remindInforme(pubId){const r=INFORMES.find(x=>String(x.pub.id)===String(pubId));if(!r)return;
  notify('Informe pendiente',`Recordatorio de informe enviado a ${r.pub.fullName}.`);
  toast(`Recordatorio enviado a ${r.pub.fullName} ✓`);}
function openRegistrarInforme(pubId){const r=INFORMES.find(x=>String(x.pub.id)===String(pubId));if(!r)return;
  openModalCustom({icon:'report',tint:r.entregado?'t-brand':'t-green',title:r.entregado?'Editar informe':'Registrar informe',sub:`${r.pub.fullName} · ${r.pub.grupo} · Junio 2026`,
    body:`<div class="form-grid">
      <div class="form-row"><label>Horas de servicio</label><input class="input" id="ri_horas" type="number" min="0" max="200" value="${r.entregado?r.horas:''}" placeholder="0"/></div>
      <div class="form-row"><label>Estudios bíblicos</label><input class="input" id="ri_est" type="number" min="0" max="30" value="${r.entregado?r.estudios:''}" placeholder="0"/></div>
    </div>
    <label class="check" style="margin-top:14px"><input type="checkbox" id="ri_aux" ${r.auxiliar?'checked':''}/><span class="box">${svg('check')}</span>Participó como precursor (regular/auxiliar)</label>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveRegistrarInforme" data-save-args='[${r.pub.id}]'>${svg('check')}Guardar informe</button>`});}
function saveRegistrarInforme(pubId){const r=INFORMES.find(x=>String(x.pub.id)===String(pubId));if(!r)return;
  const horas=parseInt(document.getElementById('ri_horas').value,10);
  if(!(horas>=0)||horas>200){document.getElementById('ri_horas').classList.add('invalid');toast('Ingresa un número de horas válido (0–200)');return;}
  r.horas=horas;r.estudios=Math.max(0,parseInt(document.getElementById('ri_est').value,10)||0);
  r.auxiliar=document.getElementById('ri_aux').checked;
  const nuevo=!r.entregado;r.entregado=true;
  refreshStats();persistAll();closeModal();
  if(nuevo)notify('Informe pendiente',`${r.pub.fullName} entregó su informe (${horas} h).`);
  if(currentView==='informes')VIEWS.informes();renderNav();
  toast(nuevo?'Informe registrado ✓':'Informe actualizado ✓');}
/* -------- REPORTES -------- */
VIEWS.reportes=()=>{
  const reportes=[
    {ico:'db',t:'t-cyan',titulo:'Base de datos',d:'Todos los publicadores con sus datos.',dl:'repBaseDatos',pv:'bd'},
    {ico:'report',t:'t-brand',titulo:'Informes mensuales',d:'Resumen de los últimos 6 meses.',dl:'repInformes6m',pv:'inf6'},
    {ico:'doc',t:'t-pink',titulo:'Tarjetas',d:'Formato oficial S-21 · una por publicador (PDF final).',dl:'downloadAllCards',pv:'cards'},
    {ico:'map',t:'t-green',titulo:'Reporte de Territorios',d:'Formato oficial S-13 · historial de asignaciones.',pv:'terr',docx:'exportTerrDocx',pdf:'exportTerrPdf'},
    {ico:'people',t:'t-violet',titulo:'Asistencia',d:'Formato oficial S-88 · año de servicio sep–ago (PDF).',dl:'openAsistYearSelect',pv:'asist'},
    {ico:'flag',t:'t-amber',titulo:'Predicación',d:'Horas y participación por grupo.',dl:'repPredicacion',pv:'pred'},
    {ico:'doc',t:'t-brand',titulo:'Resumen de servicio de campo',d:'Por mes · publicadores (PDF final).',dl:'openFieldSummarySelect',pv:'campo'},
    {ico:'chart',t:'t-violet',titulo:'Servicio de campo y asistencia (S-1)',d:'Resumen mensual · PDF final (no editable).',dl:'openS1Select',pv:'s1'},
  ];
  const estados=['Excelente','Bueno','Regular'];
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Reportes','Genera, envía o previsualiza los reportes de la congregación','')}
    <div class="card" style="margin-bottom:22px"><div class="card-head"><div class="kpi-ico t-brand" style="width:34px;height:34px">${svg('download')}</div><h3>Reportes descargables</h3></div>
      <div style="padding:8px">${reportes.map(r=>`<div class="rep-row">
        <div class="kpi-ico ${r.t}" style="width:36px;height:36px;flex-shrink:0">${svg(r.ico)}</div>
        <div class="rep-info"><b>${esc(r.titulo)}</b><p>${r.d}</p></div>
        <div class="rep-actions"><button class="btn sm ghost" data-click="repPreview" data-click-args='["${r.pv}"]'>${svg('eye')}Vista previa</button><button class="btn sm" onclick="openSendReport('${r.titulo.replace(/'/g,'')}')">${svg('send')}Enviar</button>${r.pdf?`<button class="btn sm" onclick="${r.docx}()">${svg('download')}Word</button><button class="btn sm primary" onclick="${r.pdf}()">${svg('download')}PDF</button>`:`<button class="btn sm primary" onclick="${r.dl}()">${svg('download')}Descargar</button>`}</div>
      </div>`).join('')}</div>
    </div>

    <div class="card"><div class="card-head"><div class="kpi-ico t-cyan" style="width:34px;height:34px">${svg('people')}</div><h3>Actividad por grupos</h3></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Grupo</th><th>Publicadores</th><th>Informes enviados</th><th>Territorios asignados</th><th>Estado</th></tr></thead><tbody>
        ${REAL_GROUPS.map((g,i)=>{const members=DB.filter(p=>p.grupoIdx===i);const ent=members.filter(p=>{const r=INFORMES.find(x=>x.pub.id===p.id);return r&&r.entregado}).length;const terr=TERR.filter(t=>t.resp&&t.resp.grupoIdx===i).length;const asist=78+hashStr('ga'+i)%20;const est=estados[asist>=90?0:asist>=82?1:2];const eb=asist>=90?'green':asist>=82?'blue':'amber';
          return `<tr><td><div class="cell-user">${avatarHTML(g.sup)}<div><b>${g.n}</b><small>${g.sup}</small></div></div></td><td><b>${members.length}</b></td><td>${ent} / ${members.length}</td><td>${terr}</td><td><span class="badge ${eb}"><span class="bdot"></span>${est}</span></td></tr>`}).join('')}
      </tbody></table></div>
    </div>
  </div>`;
};
function lineChart(data,labels,color){const W=560,H=180,pad=14;const max=Math.max(...data)*1.1,min=Math.min(...data)*0.9;const n=data.length;const xs=i=>pad+i*(W-2*pad)/(n-1);const ys=v=>H-pad-((v-min)/(max-min))*(H-2*pad);const pts=data.map((v,i)=>`${xs(i)},${ys(v)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H+22}" style="width:100%"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${data.map((v,i)=>`<circle cx="${xs(i)}" cy="${ys(v)}" r="3.5" fill="#fff" stroke="${color}" stroke-width="2"/><text x="${xs(i)}" y="${ys(v)-9}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#334155" font-family="Inter">${v}</text>`).join('')}${labels.map((l,i)=>`<text x="${xs(i)}" y="${H+14}" text-anchor="middle" font-size="9.5" fill="#94a3b8" font-family="Inter">${l}</text>`).join('')}</svg>`;}
function repPreview(type){
  let title='Vista previa',body='';
  if(type==='bd'||type==='pub'){title='Base de datos · vista previa';body=tablePreview(['Nombre','Grupo','Privilegio','Estado'],DB.slice(0,10).map(p=>[p.fullName,p.grupo,p.role,p.estado]),DB.length)}
  else if(type==='prec'){const pr=DB.filter(p=>p.role==='Precursor Regular');title='Precursores regulares · vista previa';body=tablePreview(['Nombre','Grupo','Teléfono'],pr.slice(0,10).map(p=>[p.fullName,p.grupo,p.tel]),pr.length)}
  else if(type==='inf6'){title='Resumen informes · vista previa';body=tablePreview(['Mes','Entregados','Tasa'],[['Enero','118','93%'],['Febrero','121','95%'],['Marzo','116','91%'],['Abril','124','98%'],['Mayo','120','94%'],['Junio',String(STATS.infEntreg),Math.round(STATS.infEntreg/STATS.total*100)+'%']],6)}
  else if(type==='cards'){title='Tarjetas individuales · vista previa';body=`<div style="display:flex;justify-content:center"><div style="transform:scale(.8);transform-origin:top center">${cardPreviewHTML(pubsActive[0])}</div></div><p class="muted" style="text-align:center;font-size:12.5px;margin-top:8px">Se generará una tarjeta por cada uno de los ${pubsActive.length} publicadores en un único PDF.</p>`}
  else if(type==='terr'){title='Territorios · vista previa';body=tablePreview(['N°','Localidad / Barrio','Estado','Última fecha'],TERR.slice(0,10).map(t=>[t.num,t.localidad+' / '+t.barrio,t.estado,t.comp]),TERR.length)}
  else if(type==='asist'){title='Asistencia · vista previa';body=tablePreview(['Mes','Entre semana','Fin de semana'],['Enero','Febrero','Marzo','Abril','Mayo','Junio'].map((m,i)=>[m,String(ATT_MID[i]),String(ATT_WE[i])]),6)}
  else if(type==='pred'){title='Predicación · vista previa';body=tablePreview(['Grupo','Superintendente','Publicadores'],REAL_GROUPS.map((g,i)=>[g.n,g.sup,String(DB.filter(p=>p.grupoIdx===i).length)]),6)}
  else if(type==='campo'){title='Resumen de servicio de campo · vista previa';body=tablePreview(['Publicador','Tipo','Estado','PR'],DB.slice(0,10).map(p=>[p.fullName,p.role==='Anciano'?'ANC':p.role==='Siervo Ministerial'?'SM':p.role==='Publicador no bautizado'?'PNB':'PUB',p.estado,p.role==='Precursor Regular'?'PR':'']),DB.length)}
  else if(type==='s1'){title='Servicio de campo y asistencia (S-1) · vista previa';body=tablePreview(['Indicador','Valor'],[['Publicadores activos',String(DB.filter(p=>p.estado!=='Inactivo').length)],['Promedio asistencia fin de semana',String(ATT_WE[TODAY.getMonth()])],['Publicadores · N.º informes','—'],['Precursores auxiliares · Horas','—'],['Precursores regulares · Horas','—']],5)}
  const dlAction=type==='terr'
    ? `<button class="btn" data-click="exportTerrDocx" data-preclose="closeModal">${svg('download')}Word</button><button class="btn primary" data-click="exportTerrPdf" data-preclose="closeModal">${svg('download')}PDF</button>`
    : `<button class="btn primary" onclick="closeModal();${REPORT_DL[type]||''}()">${svg('download')}Descargar</button>`;
  openModalCustom({icon:'eye',tint:'t-brand',title,sub:'Así se verá el reporte antes de descargarlo',size:'lg',body,footer:`<button class="btn" data-click="closeModal">Cerrar</button>${dlAction}`});
}
const REPORT_DL={bd:'repBaseDatos',pub:'repBaseDatos',prec:'repPrecursores',inf6:'repInformes6m',cards:'downloadAllCards',asist:'openAsistYearSelect',pred:'repPredicacion',campo:'openFieldSummarySelect',s1:'openS1Select'};
function tablePreview(head,rows,total){return `<div class="table-wrap" style="border:1px solid var(--border);border-radius:13px"><table class="data"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="muted" style="font-size:12px;margin-top:10px">Mostrando ${rows.length} de ${total} registros.</p>`}
function cardPreviewHTML(p){return `<div style="width:300px;border-radius:16px;overflow:hidden;box-shadow:var(--sh-md);border:1px solid var(--border)"><div style="background:linear-gradient(135deg,#8B5CF6,#5B21B6);padding:18px 18px 40px;color:#fff"><div style="font-size:11px;font-weight:700;letter-spacing:1px">MS PLANNER</div><div style="font-size:10px;opacity:.85">Congregación Las Flores</div></div><div style="padding:0 18px 18px;margin-top:-28px"><div class="avatar" style="width:60px;height:60px;font-size:20px;border:3px solid #fff;background:${avColor(p.fullName)}">${initials(p.fullName)}</div><div style="font-size:17px;font-weight:750;margin-top:10px">${esc(p.fullName)}</div><div style="font-size:12px;color:var(--ink-500);margin-bottom:12px">${p.role} · ${p.grupo}</div>${[['Fecha de nacimiento',fmtFecha(p.nacimiento)],['Sexo',p.sex==='M'?'Hombre':'Mujer'],['Fecha de bautismo',fmtFecha(p.bautismo)],['Esperanza','Otras ovejas'],['Nombramiento',p.role]].map(([l,v])=>`<div style="font-size:11px;color:var(--ink-400);text-transform:uppercase;margin-top:8px">${l}</div><div style="font-size:12.5px;font-weight:600">${v}</div>`).join('')}</div></div>`}
function donut(data){
  const total=data.reduce((a,d)=>a+d.v,0)||1;let acc=0;const R=54,C=2*Math.PI*R;
  const segs=data.map(d=>{const frac=d.v/total;const dash=frac*C;const s=`<circle cx="70" cy="70" r="${R}" fill="none" stroke="${d.c}" stroke-width="20" stroke-dasharray="${dash} ${C-dash}" stroke-dashoffset="${-acc*C}" transform="rotate(-90 70 70)"/>`;acc+=frac;return s}).join('');
  return `<div class="donut-wrap" style="display:flex;align-items:center;gap:24px;flex-wrap:wrap"><svg width="140" height="140" viewBox="0 0 140 140">${segs}<text x="70" y="66" text-anchor="middle" font-size="22" font-weight="800" fill="#1E293B" font-family="Inter">${total}</text><text x="70" y="84" text-anchor="middle" font-size="11" fill="#94a3b8" font-family="Inter">total</text></svg><div style="display:flex;flex-direction:column;gap:10px">${data.map(d=>`<div style="display:flex;align-items:center;gap:9px;font-size:13px"><i style="width:11px;height:11px;border-radius:4px;flex-shrink:0;background:${d.c}"></i>${d.l}<b style="margin-left:auto;font-weight:700">${d.v}</b></div>`).join('')}</div></div>`;
}

/* -------- NOTIFICACIONES -------- */
/* -------- ACTIVIDAD (Notificaciones + Tareas unificadas) -------- */
let actFilter='all';
function activityPending(){return NOTIFS.filter(n=>!n.read).length+TASKS.filter(t=>t.estado!=='Completada').length;}
function actItems(){
  const items=[];
  NOTIFS.forEach((n,i)=>items.push({kind:'notif',idx:i,title:n.type,desc:n.msg,ico:n.ico,tint:n.tint,date:n.date,pending:!n.read,prio:n.tint==='t-red'?3:(n.tint==='t-amber'?2:1)}));
  TASKS.forEach(t=>items.push({kind:'tarea',idx:t.id,title:t.titulo,desc:t.desc,ico:'tasks',tint:t.prioridad==='Alta'?'t-red':(t.prioridad==='Media'?'t-amber':'t-cyan'),date:t.limiteD,pending:t.estado!=='Completada',prio:t.prioridad==='Alta'?3:(t.prioridad==='Media'?2:1),prioridad:t.prioridad}));
  items.sort((a,b)=>{if(a.pending!==b.pending)return a.pending?-1:1;if(a.prio!==b.prio)return b.prio-a.prio;return b.date-a.date;});
  return items;
}
function actRelTime(d){const ms=TODAY-d;const past=ms>=0;const mins=Math.abs(ms)/60000;let s;if(mins<60)s=Math.max(1,Math.round(mins))+' min';else if(mins<1440)s=Math.round(mins/60)+' h';else s=Math.round(mins/1440)+' d';return past?('Hace '+s):('En '+s);}
VIEWS.actividad=()=>{
  const items=actItems();
  const counts={all:items.length,notif:items.filter(i=>i.kind==='notif').length,tarea:items.filter(i=>i.kind==='tarea').length};
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Actividad','Centro unificado de notificaciones y tareas · todo lo pendiente en un solo lugar',`<button class="btn" data-click="markAllActivity">${svg('check')}Marcar todo leído</button><button class="btn" data-click="openNotifPrefs">${svg('settings')}Preferencias</button>${can('data.create')?`<button class="btn primary" data-click="openModal" data-click-args='["task"]'>${svg('plus')}Nueva tarea</button>`:''}`)}
    <div class="kpi-grid" style="margin-bottom:20px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">
      ${[{v:activityPending(),l:'Pendientes en total',t:'t-brand',i:'bell'},{v:NOTIFS.filter(n=>!n.read).length,l:'Notificaciones sin leer',t:'t-amber',i:'bell'},{v:TASKS.filter(t=>t.estado!=='Completada').length,l:'Tareas por completar',t:'t-violet',i:'tasks'}].map(k=>`<div class="kpi"><div class="kpi-top"><div class="kpi-ico ${k.t}" style="width:36px;height:36px">${svg(k.i)}</div></div><div class="kpi-val" style="font-size:25px">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}
    </div>
    <div class="card">
      <div class="card-head"><h3>Bandeja de actividad</h3><div class="actions"><div class="seg">${[['all','Todas'],['notif','Notificaciones'],['tarea','Tareas']].map(([k,l])=>`<button class="${actFilter===k?'active':''}" data-click="setActFilter" data-click-args='["${k}"]'>${l} (${counts[k]})</button>`).join('')}</div></div></div>
      <div id="actList" class="lst"></div>
    </div></div>`;
  renderActList();
};
function setActFilter(f){actFilter=f;saveUiState();VIEWS.actividad();}
function renderActList(){
  const el=document.getElementById('actList');if(!el)return;
  let items=actItems();if(actFilter!=='all')items=items.filter(i=>i.kind===actFilter);
  el.innerHTML=items.map(it=>{
    const typeBadge=it.kind==='notif'?`<span class="badge blue">${svg('bell')}Notificación</span>`:`<span class="badge violet">${svg('tasks')}Tarea</span>`;
    const stateBadge=it.pending?`<span class="badge amber">${svg('clock')}${it.kind==='notif'?'Sin leer':'Pendiente'}</span>`:`<span class="badge green">${svg('check')}${it.kind==='notif'?'Leída':'Completada'}</span>`;
    const prioB=it.kind==='tarea'?prioBadge(it.prioridad):'';
    const action=it.pending?(it.kind==='notif'?`<button class="btn sm ghost" data-click="markNotifRead" data-click-args='[${it.idx}]' data-stop="1">${svg('check')}Marcar leída</button>`:`<button class="btn sm primary" data-click="completeActTask" data-click-args='[${it.idx}]' data-stop="1">${svg('check')}Completar</button>`):`<span class="muted" style="font-size:11.5px;display:inline-flex;align-items:center;gap:4px">${svg('check')}Resuelto</span>`;
    const rowClick=it.kind==='tarea'?`openTaskDetail(${it.idx})`:(it.pending?`markNotifRead(${it.idx})`:'');
    return `<div class="lst-item" ${rowClick?`onclick="${rowClick}" role="button" tabindex="0"`:''} style="${it.pending?'background:var(--brand-50);':''}align-items:flex-start;gap:12px;padding:14px 18px${rowClick?';cursor:pointer':''}">
      <div class="lst-ico ${it.tint}">${svg(it.ico)}</div>
      <div class="lst-body" style="flex:1"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">${typeBadge}${prioB}${stateBadge}</div><b>${esc(it.title)}</b><p>${esc(it.desc)}</p></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0"><span class="lst-time">${actRelTime(it.date)}</span>${action}</div>
    </div>`;
  }).join('')||`<div class="empty" style="padding:40px">No hay elementos para este filtro.</div>`;
}
function afterActChange(msg){persistAll();if(currentView==='actividad')VIEWS.actividad();renderNav();toast(msg);}
function markNotifRead(i){if(NOTIFS[i])NOTIFS[i].read=true;afterActChange('Notificación marcada como leída');}
function completeActTask(id){const t=TASKS.find(x=>x.id===id);if(t){t.estado='Completada';t.progreso=100;}afterActChange('Tarea completada ✓');}
function markAllActivity(){NOTIFS.forEach(n=>n.read=true);afterActChange('Todo marcado como leído');}
VIEWS.notificaciones=VIEWS.actividad;VIEWS.tareas=VIEWS.actividad;
function saveTaskModal(){
  const titulo=(document.getElementById('tk_titulo').value||'').trim();
  if(!titulo){document.getElementById('tk_titulo').classList.add('invalid');toast('Ingresa el nombre de la tarea');return;}
  const asigId=document.getElementById('tk_asig').value;const asig=DB.find(x=>String(x.id)===String(asigId))||eldersM[0];
  const estado=document.getElementById('tk_estado').value;const limIso=document.getElementById('tk_limite').value||diso(daysFwd(7));const limD=new Date(limIso+'T00:00:00');
  const id=TASKS.reduce((m,t)=>Math.max(m,t.id),0)+1;
  TASKS.push({id,titulo,desc:(document.getElementById('tk_desc').value||'').trim()||'Sin descripción.',creadoPor:'Paublo Díaz',asignadoA:asig,creada:dstr(TODAY),creadaD:new Date(TODAY),limite:dstr(limD),limiteD:limD,prioridad:document.getElementById('tk_prio').value,estado,progreso:estado==='Completada'?100:0});
  refreshStats();persistAll();closeModal();
  notify('Nueva tarea',`"${titulo}" asignada a ${asig.fullName}.`);
  if(currentView==='actividad')VIEWS.actividad();renderNav();
  toast('Tarea creada ✓');
}
function openTaskDetail(id){const t=TASKS.find(x=>x.id===id);if(!t)return;
  openModalCustom({icon:'tasks',tint:t.estado==='Completada'?'t-green':'t-violet',title:t.titulo,sub:`Creada por ${t.creadoPor} · ${t.creada}`,size:'lg',
    body:`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${prioBadge(t.prioridad)}${t.estado==='Completada'?`<span class="badge green">${svg('check')}Completada</span>`:`<span class="badge amber">${svg('clock')}Pendiente</span>`}<span class="badge gray">${svg('clock')} Límite: ${t.limite}</span></div>
      <p style="font-size:13.5px;color:var(--ink-500);line-height:1.6;margin-bottom:16px">${esc(t.desc)}</p>
      <div class="form-section-title">${svg('user')} Responsable</div>
      <div class="cell-user" style="margin-bottom:6px">${avatarHTML(t.asignadoA.fullName)}<div><b>${t.asignadoA.fullName}</b><br><small class="muted">${t.asignadoA.role||''}</small></div></div>`,
    footer:`<button class="btn danger" data-click="deleteTask" data-click-args='[${t.id}]'>${svg('trash')}Eliminar</button><button class="btn" data-click="openTaskEdit" data-click-args='[${t.id}]'>${svg('edit')}Editar</button>${t.estado!=='Completada'?`<button class="btn primary" data-click="completeActTask" data-click-args='[${t.id}]' data-preclose="closeModal">${svg('check')}Completar</button>`:`<button class="btn primary" data-click="reopenTask" data-click-args='[${t.id}]'>${svg('refresh')}Reabrir</button>`}`});}
function openTaskEdit(id){const t=TASKS.find(x=>x.id===id);if(!t)return;
  swapModalContent({icon:'edit',tint:'t-violet',title:'Editar tarea',sub:t.titulo,size:'lg',
    body:`<div class="form-grid"><div class="form-row full"><label>Nombre de la tarea *</label><input class="input" id="tk_titulo" value="${esc(t.titulo)}"/></div><div class="form-row full"><label>Descripción</label><textarea class="textarea" id="tk_desc">${esc(t.desc)}</textarea></div><div class="form-row"><label>Asignada a</label><select class="select" id="tk_asig">${eldersM.map(p=>`<option value="${p.id}"${String(p.id)===String(t.asignadoA.id)?' selected':''}>${esc(p.fullName)}</option>`).join('')}</select></div><div class="form-row"><label>Prioridad</label><select class="select" id="tk_prio">${['Alta','Media','Baja'].map(x=>`<option${x===t.prioridad?' selected':''}>${x}</option>`).join('')}</select></div><div class="form-row"><label>Fecha límite</label><input class="input" id="tk_limite" type="date" value="${t.limiteD?diso(t.limiteD):diso(TODAY)}"/></div><div class="form-row"><label>Estado</label><select class="select" id="tk_estado">${['Pendiente','Completada'].map(x=>`<option${x===t.estado?' selected':''}>${x}</option>`).join('')}</select></div></div>`,
    footer:`<button class="btn" data-click="openTaskDetail" data-click-args='[${t.id}]'>Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveTaskEdit" data-save-args='[${t.id}]'>${svg('check')}Guardar</button>`});}
function saveTaskEdit(id){const t=TASKS.find(x=>x.id===id);if(!t)return;
  const titulo=(document.getElementById('tk_titulo').value||'').trim();
  if(!titulo){document.getElementById('tk_titulo').classList.add('invalid');toast('Ingresa el nombre de la tarea');return;}
  t.titulo=titulo;t.desc=(document.getElementById('tk_desc').value||'').trim()||t.desc;
  const asigId=document.getElementById('tk_asig').value;t.asignadoA=DB.find(x=>String(x.id)===String(asigId))||t.asignadoA;
  t.prioridad=document.getElementById('tk_prio').value;
  const limIso=document.getElementById('tk_limite').value;if(limIso){t.limiteD=new Date(limIso+'T00:00:00');t.limite=dstr(t.limiteD);}
  const est=document.getElementById('tk_estado').value;t.estado=est;t.progreso=est==='Completada'?100:Math.min(t.progreso,99);
  refreshStats();persistAll();
  if(currentView==='actividad')VIEWS.actividad();renderNav();
  closeModal();
  toast('Tarea actualizada ✓');}
function reopenTask(id){const t=TASKS.find(x=>x.id===id);if(!t)return;t.estado='Pendiente';t.progreso=0;refreshStats();persistAll();closeModal();if(currentView==='actividad')VIEWS.actividad();renderNav();toast('Tarea reabierta');}
function deleteTask(id){if(!requireCap('assign.manage'))return;const t=TASKS.find(x=>x.id===id);if(!t)return;
  confirmAction({title:'Eliminar tarea',sub:t.titulo,body:'La tarea se eliminará de la lista de actividad. Podrás deshacer esta acción durante unos segundos.',ok:'Eliminar'},()=>{
    const i=TASKS.findIndex(x=>x.id===id);if(i<0)return;const removed=TASKS.splice(i,1)[0];refreshStats();persistAll();
    if(currentView==='actividad')VIEWS.actividad();renderNav();
    toastAction('Tarea eliminada','Deshacer',()=>{TASKS.splice(Math.min(i,TASKS.length),0,removed);refreshStats();persistAll();if(currentView==='actividad')VIEWS.actividad();renderNav();toast('Tarea restaurada');},{icon:'trash',cls:'undo'});});}

/* -------- COMUNICACIÓN (#4) -------- */
const COMM_DEST=['Congregación completa','Capitanes de grupo','Territorios','Cuerpo de Ancianos','Predicación Pública'];
function openComm(){if(!requireCap('comm.send'))return;
  openModalCustom({icon:'send',tint:'t-brand',title:'Enviar notificación',sub:'Comunica a la congregación de forma segmentada',size:'lg',
    body:`<div class="form-section-title">${svg('people')} Destinatarios</div>
      <div style="display:flex;flex-wrap:wrap;gap:9px;margin-bottom:6px">${COMM_DEST.map((d,i)=>`<button type="button" data-on="${i===0?'1':'0'}" data-click="commChip" data-click-args='["$el"]' style="display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:20px;font-size:13px;font-weight:600;border:1.5px solid ${i===0?'var(--brand-500)':'var(--border-strong)'};background:${i===0?'var(--brand-500)':'var(--surface-3)'};color:${i===0?'#fff':'var(--ink-700)'};transition:.15s">${svg('check')}${d}</button>`).join('')}</div>
      <div class="form-section-title">${svg('doc')} Contenido</div>
      <div class="form-grid">
        <div class="form-row full"><label>Título *</label><input class="input" id="comm_titulo" placeholder="Ej. Recordatorio reunión de servicio"/></div>
        <div class="form-row full"><label>Mensaje *</label><textarea class="textarea" id="comm_msg" placeholder="Escribe el mensaje…"></textarea></div>
        <div class="form-row"><label>Fecha de envío</label><input class="input" type="date" value="${diso(TODAY)}"/></div>
        <div class="form-row"><label>Hora de envío</label><input class="input" type="time" value="08:00"/></div>
      </div>
      <label class="check" style="margin-top:16px"><input type="checkbox"/><span class="box">${svg('check')}</span>Programar envío para la fecha y hora indicadas</label>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn" data-click="saveDelegated" data-save="sendComm" data-save-args='[true]'>${svg('clock')}Programar</button><button class="btn primary" data-click="saveDelegated" data-save="sendComm" data-save-args='[false]'>${svg('send')}Enviar ahora</button>`});
}
function sendComm(scheduled){
  const t=(document.getElementById('comm_titulo').value||'').trim();const m=(document.getElementById('comm_msg').value||'').trim();
  if(!t||!m){if(!t)document.getElementById('comm_titulo').classList.add('invalid');if(!m)document.getElementById('comm_msg').classList.add('invalid');toast('Completa el título y el mensaje');return;}
  closeModal();
  notify('Nuevo anuncio',`${t} — ${m.length>90?m.slice(0,90)+'…':m}`);
  toast(scheduled?'Notificación programada para envío ✓':'Notificación enviada a los destinatarios ✓');}
function commChip(el){const on=el.dataset.on==='1'?'0':'1';el.dataset.on=on;el.style.background=on==='1'?'var(--brand-500)':'var(--surface-3)';el.style.color=on==='1'?'#fff':'var(--ink-700)';el.style.borderColor=on==='1'?'var(--brand-500)':'var(--border-strong)';}

/* -------- CONFIGURACIÓN DE CONGREGACIÓN (#6) -------- */
let configTab='general';
let legalTab='legal';
const CIRCUITO_CONGS=['Las Flores','Bellavista','El Carmelo','Nueva Esperanza','Monte Sion'];
const PAGOS=[{f:'01 ene 2026',c:'Plan Anual 2026',m:'USD 20,00',e:'Pagado'},{f:'01 ene 2025',c:'Plan Anual 2025',m:'USD 20,00',e:'Pagado'},{f:'01 ene 2024',c:'Plan Anual 2024',m:'USD 18,00',e:'Pagado'}];
VIEWS.config=()=>{
  if(!can('config.general')){document.getElementById('content').innerHTML=`<div class="page">${pageHead('Configuración de la Congregación','Las Flores · ajustes generales','')}<div class="card"><div class="empty" style="padding:52px 24px;text-align:center"><div class="kpi-ico t-amber" style="width:52px;height:52px;margin:0 auto 14px">${svg('shield')}</div><b style="font-size:15px;display:block;margin-bottom:6px">Acceso restringido</b><p class="muted" style="font-size:13px;max-width:420px;margin:0 auto">La configuración de la congregación está disponible solo para administradores (Nivel 1 y 2). Tu rol actual es <b>${(CURRENT_USER&&CURRENT_USER.role)||'Publicador'}</b>.</p></div></div></div>`;return;}
  const tabs=[['general','Información general'],['anuncios','Anuncios'],['inf','Informes'],['grupos','Grupos'],['sync','Sincronización'],['legalseg','Legal y seguridad']].concat(can('billing')?[['sub','Suscripción']]:[]).concat([['soporte','Soporte']]);
  if(configTab==='sub'&&!can('billing'))configTab='general';
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Configuración de la Congregación','Las Flores · administra los datos y ajustes generales',`<button class="btn primary" data-click="saveDelegated" data-save="saveCongConfig">${svg('check')}Guardar cambios</button>`)}
    <div class="tabs">${tabs.map(([id,l])=>`<div class="tab ${configTab===id?'active':''}" data-click="setConfigTab" data-click-args='["${id}"]'>${l}</div>`).join('')}</div>
    <div id="configContent"></div></div>`;
  renderConfig();
};
function setConfigTab(t){configTab=t;saveUiState();VIEWS.config()}
/* --- Administración de grupos (Nuevo / Configurar) --- */
function grpMembersChips(){return Array.from(window.__grpSel).map(id=>{const p=DB.find(x=>String(x.id)===String(id));return p?`<span style="display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:20px;background:var(--surface-3);border:1px solid var(--border);font-size:12.5px;font-weight:600">${esc(p.fullName)}<button type="button" data-click="grpRemoveMember" data-click-args='["${id}"]' style="background:none;color:var(--ink-400);font-weight:800;font-size:15px;line-height:1;cursor:pointer">×</button></span>`:'';}).join('')||'<span class="muted" style="font-size:12.5px">Sin integrantes aún.</span>';}
function grpRefresh(){const m=document.getElementById('grp_members');if(m)m.innerHTML=grpMembersChips();const c=document.getElementById('grp_count');if(c)c.textContent='('+window.__grpSel.size+')';}
function grpAddMember(){const id=sselValue('grp_add');if(!id)return;window.__grpSel.add(String(id));grpRefresh();}
function grpRemoveMember(id){window.__grpSel.delete(String(id));grpRefresh();}
function openGrupoModal(idx){if(!requireCap('data.edit'))return;const isEdit=(idx!==undefined&&idx!==null&&idx!=='');const gi=isEdit?+idx:-1;const g=isEdit?REAL_GROUPS[gi]:null;
  const curMembers=isEdit?DB.filter(p=>p.grupoIdx===gi).map(p=>String(p.id)):[];window.__grpSel=new Set(curMembers);
  openModalCustom({icon:'people',tint:'t-brand',title:isEdit?'Configurar grupo':'Nuevo grupo',sub:isEdit?g.n:'Crea un nuevo grupo de servicio del campo',size:'lg',
    body:`<div class="form-grid">
      <div class="form-row"><label>Nombre / número del grupo *</label><input class="input" id="grp_nombre" value="${isEdit?g.n:('Grupo '+(REAL_GROUPS.length+1))}"/></div>
      <div class="form-row"><label>Superintendente *</label>${searchSelect('grp_sup',males.map(m=>m.fullName),isEdit?g.sup:males[0].fullName)}</div>
      <div class="form-row full"><label>Auxiliar</label>${searchSelect('grp_aux',males.map(m=>m.fullName),isEdit?g.aux:males[1].fullName)}</div>
    </div>
    <div class="form-section-title">${svg('people')} Integrantes <span id="grp_count" style="color:var(--ink-400);font-weight:600">(${curMembers.length})</span></div>
    <div class="form-row full" style="margin-bottom:12px"><label>Agregar publicador al grupo</label><div style="display:flex;gap:8px;align-items:flex-start">${searchSelect('grp_add',DB.filter(p=>p.estado!=='Inactivo').map(p=>({value:p.id,label:p.fullName})),'',{placeholder:'Buscar publicador…'})}<button type="button" class="btn" style="flex-shrink:0" data-click="grpAddMember">${svg('plus')}Agregar</button></div></div>
    <div id="grp_members" style="display:flex;flex-wrap:wrap;gap:7px;max-height:200px;overflow:auto;padding:2px">${grpMembersChips()}</div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" onclick="saveWithFeedback(this,()=>saveGrupo('${isEdit?gi:''}'))">${svg('check')}Guardar</button>`});
}
function saveGrupo(idx){const nombre=(document.getElementById('grp_nombre').value||'').trim();const sup=sselValue('grp_sup');const aux=sselValue('grp_aux');
  if(!nombre){toast('Ingresa el nombre del grupo');return;}
  const members=Array.from(window.__grpSel);const isEdit=(idx!==''&&idx!=null);const gi=isEdit?+idx:REAL_GROUPS.length;
  if(isEdit){REAL_GROUPS[gi].n=nombre;REAL_GROUPS[gi].sup=sup;REAL_GROUPS[gi].aux=aux;GRUPOS[gi]=nombre;}
  else{REAL_GROUPS.push({n:nombre,sup:sup,aux:aux,m:[]});GRUPOS.push(nombre);}
  members.forEach(id=>{const p=DB.find(x=>String(x.id)===String(id));if(p){p.grupoIdx=gi;p.grupo=nombre;p.superintendente=sup;p.auxiliar=aux;}});
  persistAll();closeModal();if(currentView==='config')VIEWS.config();toast(isEdit?'Grupo actualizado ✓':'Grupo creado ✓');
}
function saveCongConfig(){if(!requireCap('config.general'))return;
  const ids=['nombre','numero','idioma','pais','dir','diamid','horamid','diawe','horawe','zoomid','zoompw','zoomurl','tel','mail','coord','secre'];
  let touched=false;
  ids.forEach(k=>{const el=document.getElementById('cfg_'+k);if(el){CONG_CFG[k]=el.value;touched=true;}});
  persistAll();
  toast(touched?'Configuración guardada ✓':'Cambios guardados ✓');}
function openAnuncioModal(i){if(!requireCap('anuncio.manage'))return;const isEdit=(i!==undefined&&i!==null);const a=isEdit?ANUNCIOS[i]:null;
  openModalCustom({icon:'bell',tint:'t-brand',title:isEdit?'Editar anuncio':'Nuevo anuncio',sub:isEdit?a.t:'Publica un anuncio para la congregación',
    body:`<div class="form-grid">
      <div class="form-row full"><label>Título *</label><input class="input" id="an_titulo" value="${isEdit?a.t.replace(/"/g,'&quot;'):''}" placeholder="Ej. Asamblea de circuito"/></div>
      <div class="form-row full"><label>Descripción *</label><textarea class="textarea" id="an_desc" placeholder="Detalles del anuncio…">${isEdit?a.d:''}</textarea></div>
    </div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveAnuncio" data-save-args='[${isEdit?i:'null'}]'>${svg('check')}Guardar</button>`});}
function saveAnuncio(i){
  const t=(document.getElementById('an_titulo').value||'').trim();const d=(document.getElementById('an_desc').value||'').trim();
  if(!t||!d){if(!t)document.getElementById('an_titulo').classList.add('invalid');if(!d)document.getElementById('an_desc').classList.add('invalid');toast('Completa título y descripción');return;}
  if(overLimit({anuncio_titulo:[t,'El título'],anuncio_desc:[d,'La descripción']}))return;
  if(i!==null&&ANUNCIOS[i]){ANUNCIOS[i].t=t;ANUNCIOS[i].d=d;}
  else ANUNCIOS.unshift({ico:'flag',tint:'t-brand',t,d,time:'Ahora'});
  persistAll();closeModal();
  if(i===null)notify('Nuevo anuncio',`Se publicó el anuncio "${t}".`);
  if(currentView==='config')VIEWS.config();renderNav();
  toast(i!==null?'Anuncio actualizado ✓':'Anuncio publicado ✓');}
function delAnuncio(i){if(!requireCap('anuncio.manage'))return;const a=ANUNCIOS[i];if(!a)return;
  confirmAction({title:'Eliminar anuncio',sub:a.t,body:'El anuncio dejará de mostrarse a la congregación.',ok:'Eliminar'},()=>{
    const removed=ANUNCIOS.splice(i,1)[0];persistAll();if(currentView==='config')VIEWS.config();
    toastAction('Anuncio eliminado','Deshacer',()=>{ANUNCIOS.splice(Math.min(i,ANUNCIOS.length),0,removed);persistAll();if(currentView==='config')VIEWS.config();toast('Anuncio restaurado');},{icon:'trash',cls:'undo'});});}
function openEventoModal(){if(!requireCap('anuncio.manage'))return;
  openModalCustom({icon:'calendar',tint:'t-violet',title:'Nuevo evento',sub:'Añade un evento al calendario de la congregación',
    body:`<div class="form-grid">
      <div class="form-row full"><label>Nombre del evento *</label><input class="input" id="ev_nombre" placeholder="Ej. Reunión de servicio"/></div>
      <div class="form-row"><label>Fecha</label><input class="input" id="ev_fecha" type="date" value="${diso(TODAY)}"/></div>
      <div class="form-row"><label>Detalle</label><input class="input" id="ev_det" placeholder="Ej. Todos los grupos"/></div>
    </div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveEvento">${svg('check')}Guardar</button>`});}
function saveEvento(){
  const n=(document.getElementById('ev_nombre').value||'').trim();
  if(!n){document.getElementById('ev_nombre').classList.add('invalid');toast('Ingresa el nombre del evento');return;}
  const f=document.getElementById('ev_fecha').value;const det=(document.getElementById('ev_det').value||'').trim();
  if(overLimit({evento_nombre:[n,'El nombre'],evento_detalle:[det,'El detalle']}))return;
  EVENTS.unshift({i:'calendar',t:'t-violet',n,d:`${f?dshort(new Date(f+'T00:00:00')):''}${det?' · '+det:''}`||'Por definir'});
  persistAll();closeModal();
  notify('Nuevo anuncio',`Nuevo evento en el calendario: ${n}.`);
  if(currentView==='config')VIEWS.config();renderNav();
  toast('Evento creado ✓');}
function delEvento(i){if(!requireCap('anuncio.manage'))return;const e=EVENTS[i];if(!e)return;
  confirmAction({title:'Eliminar evento',sub:e.n,body:'El evento se quitará del calendario.',ok:'Eliminar'},()=>{
    EVENTS.splice(i,1);persistAll();if(currentView==='config')VIEWS.config();toast('Evento eliminado');});}
function openSubGestion(){if(!requireCap('billing'))return;
  const plan=CONG_CFG.plan||'Plan Anual';
  openModalCustom({icon:'star',tint:'t-brand',title:'Gestionar suscripción',sub:'MS Planner · congregación Las Flores',
    body:`<div class="form-row full"><label>Plan</label><select class="select" id="sub_plan">${['Plan Anual','Plan Mensual'].map(x=>`<option${plan===x?' selected':''}>${x}</option>`).join('')}</select></div>
      <div class="lst" style="margin-top:14px;border:1px solid var(--border);border-radius:13px">
        <div class="lst-item"><div class="lst-ico t-green">${svg('check')}</div><div class="lst-body"><b>Suscripción activa</b><p>Renovación: 01 ene 2027 · USD 20,00/año</p></div></div>
        <div class="lst-item"><div class="lst-ico t-brand">${svg('people')}</div><div class="lst-body"><b>Publicadores ilimitados</b><p>Incluye todos los módulos y reportes oficiales</p></div></div>
      </div>`,
    footer:`<button class="btn" data-click="closeModal">Cerrar</button><button class="btn primary" onclick="saveWithFeedback(this,()=>{CONG_CFG.plan=document.getElementById('sub_plan').value;persistAll();closeModal();toast('Suscripción actualizada ✓')})">${svg('check')}Guardar cambios</button>`});}
function renderConfig(){
  const el=document.getElementById('configContent');let h='';
  if(['reuniones','eventos','circuitos'].includes(configTab))configTab='general';
  if(configTab==='general'){const C=k=>CONG_CFG[k];h=`<div class="card"><div class="card-pad">
    <div class="form-section-title">${svg('home')} Información de la congregación</div>
    <div class="form-grid">
      <div class="form-row"><label>Nombre de la congregación</label><input class="input" id="cfg_nombre" value="${C('nombre')||'Las Flores'}"/></div>
      <div class="form-row"><label>Número</label><input class="input" id="cfg_numero" value="${C('numero')||'CO-2148'}"/></div>
      <div class="form-row"><label>Idioma</label><select class="select" id="cfg_idioma">${['Español','Inglés','Portugués'].map(x=>`<option${(C('idioma')||'Español')===x?' selected':''}>${x}</option>`).join('')}</select></div>
      <div class="form-row"><label>País</label><select class="select" id="cfg_pais">${['Colombia','México','España'].map(x=>`<option${(C('pais')||'Colombia')===x?' selected':''}>${x}</option>`).join('')}</select></div>
      <div class="form-row full"><label>Dirección del Salón del Reino</label><input class="input" id="cfg_dir" value="${C('dir')||'Calle 142 #115-40, Suba, Bogotá D.C.'}"/></div>
    </div>
    <div class="form-section-title">${svg('meeting')} Reuniones</div>
    <div class="form-grid">
      <div class="form-row"><label>Día · entre semana</label><select class="select" id="cfg_diamid">${['Martes','Lunes','Miércoles','Jueves','Viernes'].map(d=>`<option${(C('diamid')||'Martes')===d?' selected':''}>${d}</option>`).join('')}</select></div>
      <div class="form-row"><label>Hora · entre semana</label><input class="input" id="cfg_horamid" type="time" value="${C('horamid')||'19:00'}"/></div>
      <div class="form-row"><label>Día · fin de semana</label><select class="select" id="cfg_diawe">${['Domingo','Sábado'].map(d=>`<option${(C('diawe')||'Domingo')===d?' selected':''}>${d}</option>`).join('')}</select></div>
      <div class="form-row"><label>Hora · fin de semana</label><input class="input" id="cfg_horawe" type="time" value="${C('horawe')||'08:00'}"/></div>
    </div>
    <div class="form-section-title">${svg('display')} Datos generales · Zoom</div>
    <div class="form-grid">
      <div class="form-row"><label>ID de reunión</label><input class="input" id="cfg_zoomid" value="${C('zoomid')||'845 2210 9921'}"/></div>
      <div class="form-row"><label>Contraseña</label><input class="input" id="cfg_zoompw" value="${C('zoompw')||'lasflores'}"/></div>
      <div class="form-row full"><label>Enlace de Zoom</label><input class="input" id="cfg_zoomurl" value="${C('zoomurl')||'https://zoom.us/j/84522109921'}"/></div>
    </div>
    <div class="form-section-title">${svg('phone')} Información de contacto</div>
    <div class="form-grid">
      <div class="form-row"><label>Teléfono de la congregación</label><input class="input" id="cfg_tel" value="${C('tel')||'601 742 1180'}" inputmode="numeric" data-input="maskPhone" data-input-args='["$el"]'/></div>
      <div class="form-row"><label>Correo de contacto</label><input class="input" id="cfg_mail" type="email" value="${C('mail')||'lasflores@congregacion.org'}" data-input="validateEmail" data-input-args='["$el"]' aria-describedby="cfg_mail_hint"/><span class="field-hint" id="cfg_mail_hint" aria-live="polite"></span></div>
      <div class="form-row"><label>Coordinador del cuerpo de ancianos</label><input class="input" id="cfg_coord" value="${C('coord')||'Paublo Díaz'}"/></div>
      <div class="form-row"><label>Secretario</label><input class="input" id="cfg_secre" value="${C('secre')||'Hugo Molano'}"/></div>
    </div>
    <div class="form-section-title">${svg('refresh')} Datos de demostración</div>
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><p class="muted" style="font-size:12.5px;flex:1;min-width:220px">Los cambios se guardan en este navegador (almacenamiento local). Puedes volver al estado original del demo en cualquier momento.</p><button class="btn" data-click="resetDemoData">${svg('refresh')}Restablecer datos demo</button></div>
  </div></div>`;}
  else if(configTab==='anuncios'){h=`<div class="card" style="margin-bottom:20px"><div class="card-head"><div class="kpi-ico t-brand" style="width:32px;height:32px">${svg('bell')}</div><h3>Anuncios</h3><div class="actions"><button class="btn sm primary" data-click="openAnuncioModal">${svg('plus')}Crear anuncio</button></div></div>
    <div class="table-wrap"><table class="data"><thead><tr><th>Título</th><th>Descripción</th><th>Fecha</th><th style="text-align:right">Acciones</th></tr></thead><tbody>${ANUNCIOS.map((a,i)=>`<tr><td><b>${a.t}</b></td><td class="muted">${a.d}</td><td class="muted">${a.time}</td><td style="text-align:right"><button class="icon-btn" style="width:30px;height:30px" data-tip="Editar" data-click="openAnuncioModal" data-click-args='[${i}]'>${svg('edit')}</button><button class="icon-btn" style="width:30px;height:30px" data-tip="Eliminar" data-click="delAnuncio" data-click-args='[${i}]'>${svg('trash')}</button></td></tr>`).join('')||`<tr><td colspan="4"><div class="empty">Sin anuncios. Crea el primero con «Crear anuncio».</div></td></tr>`}</tbody></table></div></div>
    <div class="cols-2"><div class="card"><div class="card-head"><div class="kpi-ico t-violet" style="width:32px;height:32px">${svg('calendar')}</div><h3>Calendario de eventos</h3></div><div class="card-pad" style="display:flex;justify-content:center"><div style="max-width:300px;width:100%">${miniCalendar()}</div></div></div>
      <div class="card"><div class="card-head"><h3>Próximos eventos</h3><div class="actions"><button class="btn sm primary" data-click="openEventoModal">${svg('plus')}Nuevo evento</button></div></div><div class="lst">
        ${EVENTS.map((e,i)=>`<div class="lst-item"><div class="lst-ico ${e.t}">${svg(e.i)}</div><div class="lst-body"><b>${e.n}</b><p>${e.d}</p></div><button class="icon-btn" style="width:28px;height:28px;flex-shrink:0" data-tip="Eliminar" data-click="delEvento" data-click-args='[${i}]'>${svg('trash')}</button></div>`).join('')||`<div class="empty" style="padding:26px">Sin eventos próximos.</div>`}
      </div></div></div>`;}
  else if(configTab==='inf'){const sw=(on)=>`<label class="switch"><input type="checkbox" ${on?'checked':''}/><span class="tr"></span></label>`;h=`
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px;align-items:start">
      <div class="card"><div class="card-head" style="padding:14px 18px"><h3 style="font-size:14px">Recordatorios y entrega</h3></div><div class="set-list">
        <div class="set-row"><div class="set-ico">${svg('bell')}</div><div><b>Recordatorio automático</b><p>El día 25 de cada mes</p></div><div class="ctrl">${sw(true)}</div></div>
        <div class="set-row"><div class="set-ico">${svg('report')}</div><div><b>Informe simple</b><p>Permitir solo marcar participación</p></div><div class="ctrl">${sw(true)}</div></div>
        <div class="set-row"><div class="set-ico">${svg('shield')}</div><div><b>Bloquear tras cierre</b><p>Impedir edición pasado el cierre</p></div><div class="ctrl">${sw(false)}</div></div>
        <div class="set-row"><div class="set-ico">${svg('send')}</div><div><b>Notificar al cuerpo de ancianos</b><p>Resumen al cerrar el mes</p></div><div class="ctrl">${sw(true)}</div></div>
      </div></div>
      <div class="card"><div class="card-head" style="padding:14px 18px"><h3 style="font-size:14px">Parámetros generales</h3></div><div class="set-list">
        <div class="set-row"><div class="set-ico">${svg('calendar')}</div><div><b>Día de cierre mensual</b><p>Fecha límite de entrega</p></div><div class="ctrl"><input class="set-input" type="number" value="6"/></div></div>
        <div class="set-row"><div class="set-ico">${svg('clock')}</div><div><b>Meta precursor regular</b><p>Horas mensuales</p></div><div class="ctrl"><input class="set-input" type="number" value="50"/></div></div>
        <div class="set-row"><div class="set-ico">${svg('flag')}</div><div><b>Meta precursor auxiliar</b><p>Horas mensuales</p></div><div class="ctrl"><input class="set-input" type="number" value="30"/></div></div>
        <div class="set-row"><div class="set-ico">${svg('star')}</div><div><b>Año de servicio</b><p>Periodo activo</p></div><div class="ctrl"><input class="set-input" type="text" value="2026"/></div></div>
      </div></div>
    </div>`;}
  else if(configTab==='grupos'){h=`<div class="card"><div class="card-head"><h3>Administración de grupos</h3><div class="actions"><button class="btn sm primary" data-click="openGrupoModal">${svg('plus')}Nuevo grupo</button></div></div>
    <div class="table-wrap"><table class="data"><thead><tr><th>Grupo</th><th>Superintendente</th><th>Auxiliar</th><th>Publicadores</th><th style="text-align:right">Acciones</th></tr></thead><tbody>${REAL_GROUPS.map((g,i)=>`<tr><td><b>${g.n}</b></td><td><div class="cell-user">${avatarHTML(g.sup)}<b>${g.sup}</b></div></td><td><div class="cell-user">${avatarHTML(g.aux)}<b>${g.aux}</b></div></td><td>${DB.filter(p=>p.grupoIdx===i).length}</td><td style="text-align:right"><button class="btn sm ghost" data-click="openGrupoModal" data-click-args='[${i}]'>${svg('settings')}Configurar</button></td></tr>`).join('')}</tbody></table></div></div>`;}
  else if(configTab==='sub'){h=`<div class="cols-2">
    <div class="card"><div class="card-head"><div class="kpi-ico t-brand" style="width:32px;height:32px">${svg('star')}</div><h3>Plan actual</h3></div><div class="card-pad">
      <div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:30px;font-weight:800">USD 20</b><span class="muted">/ año</span></div>
      <p class="muted" style="font-size:13px;margin:8px 0 16px">Plan Anual · todas las funciones · publicadores ilimitados</p>
      <span class="badge green"><span class="bdot"></span>Activo</span>
      <div style="margin-top:18px;padding:14px;background:var(--surface-3);border-radius:12px;display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:13px;display:block">Próximo pago</b><span class="muted" style="font-size:12.5px">01 ene 2027</span></div><b style="font-size:16px">USD 20,00</b></div>
      <button class="btn primary" style="margin-top:16px;width:100%" data-click="openSubGestion">Gestionar suscripción</button>
    </div></div>
    <div class="card"><div class="card-head"><h3>Historial de pagos</h3></div><div class="table-wrap"><table class="data"><thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th><th>Estado</th></tr></thead><tbody>${PAGOS.map(p=>`<tr><td class="muted">${p.f}</td><td><b>${p.c}</b></td><td>${p.m}</td><td><span class="badge green"><span class="bdot"></span>${p.e}</span></td></tr>`).join('')}</tbody></table></div></div>
  </div>`;}
  else if(configTab==='legalseg'){
    const seg=`<div class="seg" style="margin-bottom:20px">
      <button class="${legalTab==='legal'?'active':''}" data-click="setLegalTab" data-click-args='["legal"]'>${svg('scale')}Cumplimiento Legal</button>
      <button class="${legalTab==='seguridad'?'active':''}" data-click="setLegalTab" data-click-args='["seguridad"]'>${svg('shield')}Seguridad</button>
    </div>`;
    const item=(ic,tint,t,d)=>`<div class="card" style="padding:16px 18px;display:flex;gap:13px;align-items:flex-start;box-shadow:var(--sh-xs)"><div class="lst-ico ${tint}" style="width:38px;height:38px;flex-shrink:0">${svg(ic)}</div><div><b style="font-size:13.5px;display:block;margin-bottom:3px">${t}</b><p style="font-size:12.5px;color:var(--ink-500);line-height:1.5">${d}</p></div></div>`;
    const grid=items=>`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">${items.map(a=>item(...a)).join('')}</div>`;
    const banner=(ic,title,desc,tags)=>`<div class="card" style="padding:20px 22px;margin-bottom:18px;background:linear-gradient(135deg,var(--brand-50),var(--surface));border-color:var(--brand-200)"><div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><div class="lst-ico t-brand" style="width:44px;height:44px;flex-shrink:0">${svg(ic)}</div><div style="flex:1;min-width:220px"><b style="font-size:15px;display:block;margin-bottom:4px">${title}</b><p style="font-size:13px;color:var(--ink-500);line-height:1.55">${desc}</p><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">${tags}</div></div></div></div>`;
    if(legalTab==='legal'){
      h=seg+banner('scale','Compromiso con la protección de datos','MS Planner trata los datos de los publicadores de la congregación Las Flores conforme a la normativa de protección de datos personales aplicable, garantizando confidencialidad, finalidad legítima y control por parte de cada titular.','<span class="badge violet">Ley 1581 de 2012</span><span class="badge blue">Decreto 1377 de 2013</span><span class="badge cyan">GDPR / RGPD</span><span class="badge green">Habeas Data</span>')+grid([
        ['db','t-brand','Habeas Data','Derecho de cada publicador a conocer, actualizar y rectificar la información que la congregación mantiene sobre él.'],
        ['shield','t-violet','Política de privacidad','Describe qué datos se recolectan, con qué finalidad, quién los administra y durante cuánto tiempo se conservan.'],
        ['doc','t-blue','Tratamiento de datos personales','Los datos se procesan únicamente con fines administrativos y espirituales de la congregación, nunca con fines comerciales.'],
        ['star','t-amber','Información religiosa sensible','La afiliación religiosa es un dato sensible: se protege con medidas reforzadas y acceso restringido a los ancianos autorizados.'],
        ['check','t-green','Consentimiento informado','El almacenamiento y procesamiento se realiza previa autorización expresa e informada del titular o su representante.'],
        ['user','t-cyan','Derechos del titular (ARCO)','Cada persona puede ejercer en cualquier momento sus derechos de consulta, actualización, corrección y eliminación de datos.'],
        ['clock','t-pink','Retención y eliminación','La información se conserva solo el tiempo necesario y se elimina de forma segura al perder su finalidad legítima.'],
        ['flag','t-brand','Cumplimiento normativo','La plataforma se alinea con las normativas de protección de datos aplicables a nivel nacional e internacional.'],
      ]);
    } else {
      h=seg+banner('shield','Seguridad y confianza de la plataforma','La información de la congregación Las Flores se protege con controles técnicos y organizativos de nivel empresarial, orientados a preservar la confidencialidad, integridad y disponibilidad de los datos.','<span class="badge blue">TLS 1.3</span><span class="badge violet">AES-256</span><span class="badge cyan">RBAC</span><span class="badge green">Backups diarios</span>')+grid([
        ['lock','t-brand','Cifrado en tránsito y en reposo','Los datos viajan cifrados con TLS 1.3 y se almacenan cifrados con AES-256, ilegibles ante cualquier acceso no autorizado.'],
        ['user','t-violet','Control de acceso por roles','Permisos granulares (RBAC): cada usuario accede solo a los datos y acciones que su rol —anciano, siervo o publicador— requiere.'],
        ['check','t-green','Autenticación segura','Inicio de sesión con credenciales robustas y verificación en dos pasos (MFA) para las cuentas administrativas.'],
        ['eye','t-cyan','Protección de datos confidenciales','La información personal de los publicadores permanece aislada y solo es visible para el personal debidamente autorizado.'],
        ['report','t-amber','Registro y auditoría','Cada acción relevante queda registrada, permitiendo rastrear quién consultó o modificó la información y cuándo.'],
        ['db','t-blue','Copias de seguridad automáticas','Respaldos cifrados diarios que garantizan que ninguna información se pierda ante fallos o errores.'],
        ['refresh','t-pink','Recuperación ante desastres','Planes y procedimientos de restauración para reanudar el servicio rápidamente frente a incidentes graves.'],
        ['bell','t-red','Monitoreo y detección','Vigilancia continua que detecta y alerta sobre intentos de acceso no autorizado o actividad sospechosa.'],
        ['shield','t-brand','Buenas prácticas de ciberseguridad','Actualizaciones periódicas, pruebas de seguridad y principios de mínimo privilegio aplicados en toda la plataforma.'],
      ]);
    }
  }
  else if(configTab==='sync'){h=syncPanelHTML();}
  else if(configTab==='soporte'){
    const tipos=['Problema técnico','Error en la plataforma','Solicitud de nueva funcionalidad','Consulta general','Problema con reportes','Problema con usuarios o permisos','Otro'];
    h=`<div class="cols-2">
      <div class="card"><div class="card-head"><div class="kpi-ico t-brand" style="width:34px;height:34px">${svg('send')}</div><h3>Solicitar soporte técnico</h3></div><div class="card-pad">
        <p class="muted" style="font-size:12.5px;margin:-4px 0 16px">Completa el formulario y nuestro equipo te responderá en el menor tiempo posible. Los campos con * son obligatorios.</p>
        <div class="form-grid">
          <div class="form-row"><label>Nombre completo *</label><input class="input" id="sop_nombre" placeholder="Tu nombre" value="Paublo Díaz"/></div>
          <div class="form-row"><label>Correo electrónico *</label><input class="input" type="email" id="sop_correo" placeholder="correo@ejemplo.com" value="nikoleonv@gmail.com" data-input="validateEmail" data-input-args='["$el"]' aria-describedby="sop_correo_hint"/><span class="field-hint" id="sop_correo_hint" aria-live="polite"></span></div>
          <div class="form-row"><label>Teléfono (opcional)</label><input class="input" id="sop_tel" inputmode="numeric" placeholder="3XX XXX XXXX" data-input="maskPhone" data-input-args='["$el"]' aria-describedby="sop_tel_hint"/><span class="field-hint" id="sop_tel_hint" aria-live="polite"></span></div>
          <div class="form-row"><label>Tipo de solicitud</label><select class="select" id="sop_tipo">${tipos.map(t=>`<option>${t}</option>`).join('')}</select></div>
          <div class="form-row"><label>Prioridad</label><select class="select" id="sop_prio"><option>Baja</option><option selected>Media</option><option>Alta</option></select></div>
          <div class="form-row"><label>Asunto *</label><input class="input" id="sop_asunto" placeholder="Resumen breve de la solicitud"/></div>
          <div class="form-row full"><label>Descripción detallada *</label><textarea class="textarea" id="sop_desc" placeholder="Describe el problema o solicitud con el mayor detalle posible…"></textarea></div>
          <div class="form-row full"><label>Adjuntar archivo o captura (opcional)</label><input class="input" type="file" id="sop_file" style="height:auto;padding:9px 12px"/></div>
        </div>
        <span class="field-hint err" id="sop_error" role="alert" style="display:none;margin-top:10px"></span>
        <div style="margin-top:16px"><button class="btn primary" data-click="enviarSoporte" data-click-args='["$el"]'>${svg('send')}Enviar solicitud</button></div>
      </div></div>
      <div class="card" style="align-self:start"><div class="card-head"><div class="kpi-ico t-violet" style="width:34px;height:34px">${svg('user')}</div><h3>Contacto de Soporte</h3></div><div class="card-pad">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px"><div class="avatar" style="width:52px;height:52px;font-size:18px;background:${avColor('Mateo Diaz')}">MD</div><div><b style="font-size:15px">Mateo Diaz</b><div style="font-size:12.5px;color:var(--ink-500)">Chief Marketing Officer (CMO)</div></div></div>
        <div class="lst" style="margin:0 -6px">
          <a class="lst-item" href="mailto:mateo.diaz@claria-co.com" style="border-radius:10px"><div class="lst-ico t-brand">${svg('mail')}</div><div class="lst-body"><b>Correo electrónico</b><p>mateo.diaz@claria-co.com</p></div></a>
          <a class="lst-item" href="tel:+573203350849" style="border-radius:10px"><div class="lst-ico t-green">${svg('phone')}</div><div class="lst-body"><b>Teléfono</b><p>+57 320 335 0849</p></div></a>
        </div>
        <p class="muted" style="font-size:12.5px;line-height:1.65;margin-top:14px">Si tienes alguna duda, inconveniente o sugerencia sobre la plataforma, puedes completar el formulario anterior o comunicarte directamente por correo electrónico o teléfono. Nuestro objetivo es brindarte una respuesta en el menor tiempo posible.</p>
      </div></div>
    </div>`;
  }
  el.innerHTML=h;
}
function setLegalTab(t){legalTab=t;saveUiState();renderConfig()}
function enviarSoporte(btn){
  const g=id=>document.getElementById(id);
  const nombre=(g('sop_nombre').value||'').trim(),correo=(g('sop_correo').value||'').trim(),tel=(g('sop_tel').value||'').trim();
  const tipo=g('sop_tipo').value,prio=g('sop_prio').value,asunto=(g('sop_asunto').value||'').trim(),desc=(g('sop_desc').value||'').trim();
  const fileEl=g('sop_file');const fname=fileEl&&fileEl.files&&fileEl.files.length?fileEl.files[0].name:'';
  const mark=(id,ok)=>{const el=g(id);if(el){el.classList.toggle('invalid',!ok);el.setAttribute('aria-invalid',ok?'false':'true')}};
  const okN=!!nombre,okC=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo),okA=!!asunto,okD=!!desc;
  mark('sop_nombre',okN);mark('sop_correo',okC);mark('sop_asunto',okA);mark('sop_desc',okD);
  const err=g('sop_error');
  if(!(okN&&okC&&okA&&okD)){if(err){err.textContent='Por favor completa los campos obligatorios marcados en rojo.';err.style.display='block'}toast('Revisa los campos obligatorios');return}
  if(err){err.textContent='';err.style.display='none'}
  saveWithFeedback(btn,()=>{
    const bodyRaw=`Nombre: ${nombre}\nCorreo: ${correo}\nTeléfono: ${tel||'—'}\nTipo de solicitud: ${tipo}\nPrioridad: ${prio}\n\nDescripción:\n${desc}${fname?('\n\nArchivo adjunto: '+fname):''}\n\n— Enviado desde MS Planner · Congregación Las Flores`;
    const mail=`mailto:mateo.diaz@claria-co.com?subject=${encodeURIComponent('[Soporte MS Planner] '+asunto)}&body=${encodeURIComponent(bodyRaw)}`;
    try{window.location.href=mail}catch(e){}
    ['sop_nombre','sop_tel','sop_asunto','sop_desc'].forEach(id=>{const el=g(id);if(el&&id!=='sop_nombre')el.value='';});
    toast('Solicitud de soporte enviada correctamente ✓');
  });
}

/* -------- ASISTENCIA (#7) -------- */
let asistCal={y:2026,m:5};
const ATT_REG={};
let asistFY=CURRENT_SY;
let asistVista='mensual';let asistWeekMonth=5;
function asistWeeks(fy,ci){const yr=ci>=8?fy-1:fy;const dim=new Date(yr,ci+1,0).getDate();const startDow=new Date(yr,ci,1).getDay();const nWeeks=Math.ceil((startDow+dim)/7);const bMid=attVal(fy,ci,'mid'),bWe=attVal(fy,ci,'we');const arr=[];for(let w=0;w<nWeeks;w++){const dm=hashStr('wk'+fy+ci+w+'m')%17-8,dw=hashStr('wk'+fy+ci+w+'w')%17-8;arr.push({label:'Sem '+(w+1),mid:Math.max(60,Math.min(ATT_CAP,bMid+dm)),we:Math.max(60,Math.min(ATT_CAP,bWe+dw))});}return arr;}
const FY_ORDER=[8,9,10,11,0,1,2,3,4,5,6,7];
const FY_LABELS=FY_ORDER.map(i=>ATT_LABELS[i]);
function attVal(fy,ci,type){const base=type==='mid'?ATT_MID[ci]:ATT_WE[ci];const delta=fy===CURRENT_SY?0:(hashStr('fy'+fy+type+ci)%18-9);return Math.max(60,Math.min(ATT_CAP,base+delta));}
function attMeeting(date,type){const iso=diso(date);const key=type+iso;const past=date<=TODAY;if(ATT_REG[key])return {registered:true,count:ATT_REG[key].count};const seed='att'+iso+type;const registered=past&&seededBool(seed+'r',0.82);const base=type==='mid'?ATT_MID:ATT_WE;const count=base[date.getMonth()]+(hashStr(seed)%14-7);return {registered,count:registered?count:null}}
function attScanList(){const reg=[],pend=[];let d=new Date(TODAY);d.setDate(d.getDate()-90);while(d<=TODAY){const dw=d.getDay();if(dw===2||dw===0){const type=dw===2?'mid':'we';const a=attMeeting(new Date(d),type);(a.registered?reg:pend).push({date:new Date(d),type,count:a.count});}d.setDate(d.getDate()+1);}reg.reverse();pend.reverse();return {reg,pend};}
VIEWS.asistencia=()=>{
  const avgMid=Math.round(FY_ORDER.reduce((a,ci)=>a+attVal(asistFY,ci,'mid'),0)/12);
  const avgWe=Math.round(FY_ORDER.reduce((a,ci)=>a+attVal(asistFY,ci,'we'),0)/12);
  const {reg:regList,pend:pendList}=attScanList();const reg=regList.length,pend=pendList.length;
  const kpis=[{v:avgMid,l:'Promedio entre semana',t:'t-brand',i:'meeting',act:"openAttAvg('mid')"},{v:avgWe,l:'Promedio fin de semana',t:'t-violet',i:'meeting',act:"openAttAvg('we')"},{v:reg,l:'Reuniones registradas',t:'t-green',i:'check',act:'openRegistradas()'},{v:pend,l:'Pendientes de registrar',t:'t-amber',i:'clock',act:'openPendientes()'}];
  const yearSel=`<select class="select" style="height:36px;width:auto;padding:0 34px 0 12px" data-change="applyFilter" data-fkey="asistFY" data-fnum="1" data-frender="asistencia" aria-label="Año de servicio">${[CURRENT_SY,CURRENT_SY-1,CURRENT_SY-2].map(fy=>`<option value="${fy}"${fy===asistFY?' selected':''}>${fy-1}–${fy}</option>`).join('')}</select>`;
  const vistaSeg=`<div class="seg"><button class="${asistVista==='mensual'?'active':''}" data-click="setStateVal" data-skey="asistVista" data-sval="mensual" data-srender="asistencia">Mensual</button><button class="${asistVista==='semanal'?'active':''}" data-click="setStateVal" data-skey="asistVista" data-sval="semanal" data-srender="asistencia">Semanal</button></div>`;
  const monthSel=asistVista==='semanal'?`<select class="select" style="height:36px;width:auto;padding:0 34px 0 12px;text-transform:capitalize" data-change="applyFilter" data-fkey="asistWeekMonth" data-fnum="1" data-frender="asistencia" aria-label="Mes">${FY_ORDER.map(ci=>`<option value="${ci}"${asistWeekMonth===ci?' selected':''}>${new Date(2000,ci,1).toLocaleDateString('es-CO',{month:'long'})}</option>`).join('')}</select>`:'';
  const bars=asistVista==='semanal'?asistWeeks(asistFY,asistWeekMonth):FY_ORDER.slice(0,6).map(ci=>({label:ATT_LABELS[ci],mid:attVal(asistFY,ci,'mid'),we:attVal(asistFY,ci,'we')}));
  const compTitle=asistVista==='semanal'?('Asistencia semanal · '+new Date(2000,asistWeekMonth,1).toLocaleDateString('es-CO',{month:'long'})+' '+(asistWeekMonth>=8?asistFY-1:asistFY)):'Asistencia mensual · comparativo';
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Asistencia','Registro de asistencia a las reuniones de la congregación',`<button class="btn primary" data-click="openRegAsist">${svg('plus')}Registrar asistencia</button>`)}
    <div class="kpi-grid" style="margin-bottom:20px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">
      ${kpis.map(k=>`<div class="kpi" style="cursor:pointer" role="button" tabindex="0" onclick="${k.act}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${k.act}}"><div class="kpi-top"><div class="kpi-ico ${k.t}" style="width:38px;height:38px">${svg(k.i)}</div><span class="kpi-chev">${svg('chevR')}</span></div><div class="kpi-val">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap"><b style="font-size:14px">Métricas de asistencia</b><div style="margin-left:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap">${vistaSeg}${monthSel}<span style="font-size:12.5px;color:var(--ink-500);font-weight:600">Año de servicio</span>${yearSel}</div></div>
    <div class="cols-2" style="margin-bottom:22px">
      <div class="card"><div class="card-head"><div class="kpi-ico t-brand" style="width:32px;height:32px">${svg('chart')}</div><h3>${compTitle}</h3></div><div class="card-pad">
        <div style="display:flex;align-items:flex-end;gap:14px;height:200px">${bars.map(b=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end"><div style="display:flex;gap:3px;align-items:flex-end;width:100%;height:100%;justify-content:center"><div data-tip="Entre semana: ${b.mid}" style="width:40%;max-width:18px;border-radius:5px 5px 0 0;background:#5B21B6;height:${(b.mid/ATT_CAP*100).toFixed(1)}%"></div><div data-tip="Fin de semana: ${b.we}" style="width:40%;max-width:18px;border-radius:5px 5px 0 0;background:#06b6d4;height:${(b.we/ATT_CAP*100).toFixed(1)}%"></div></div><span style="font-size:11px;color:var(--ink-400);font-weight:600">${b.label}</span></div>`).join('')}</div>
        <div style="display:flex;gap:16px;margin-top:14px;justify-content:center;font-size:12.5px"><span style="display:flex;align-items:center;gap:6px"><i style="width:11px;height:11px;border-radius:3px;background:#5B21B6"></i>Entre semana</span><span style="display:flex;align-items:center;gap:6px"><i style="width:11px;height:11px;border-radius:3px;background:#06b6d4"></i>Fin de semana</span></div>
      </div></div>
      <div class="card"><div class="card-head"><div class="kpi-ico t-cyan" style="width:32px;height:32px">${svg('chart')}</div><h3>Tendencia anual · ${asistFY-1}–${asistFY}</h3></div><div class="card-pad">${areaChart(FY_ORDER.map(ci=>Math.round((attVal(asistFY,ci,'mid')+attVal(asistFY,ci,'we'))/2)),FY_LABELS,'#06b6d4',ATT_CAP)}
        <div style="text-align:center;font-size:11.5px;color:var(--ink-400);margin-top:6px">Promedio de asistencia · orden por año de servicio (sep → ago)</div>
      </div></div>
    </div>
    <div id="asistCalWrap"></div>
    <div style="display:flex;gap:14px;margin:16px 0 4px;flex-wrap:wrap;align-items:center"><span style="font-size:12.5px;color:var(--ink-500);font-weight:600">Estados:</span><span class="badge green">${svg('check')}Registrado</span><span class="badge amber">${svg('clock')}Pendiente</span></div>
  </div>`;
  renderAsistCal();
};
function renderAsistCal(){
  const {y,m}=asistCal;const first=new Date(y,m,1);const startDow=first.getDay();const dim=new Date(y,m+1,0).getDate();
  const monName=first.toLocaleDateString('es-CO',{month:'long',year:'numeric'});const dows=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  let cells='';
  for(let i=0;i<startDow;i++){const pd=new Date(y,m,1-startDow+i);cells+=`<div class="bigcal-cell out"><div class="dnum">${pd.getDate()}</div></div>`}
  for(let dn=1;dn<=dim;dn++){const date=new Date(y,m,dn);const dw=date.getDay();const isToday=diso(date)===diso(TODAY);let ev='';
    if(dw===2||dw===0){const type=dw===2?'mid':'we';const a=attMeeting(date,type);const reg=a.registered;
      ev=`<div class="cal-event ${reg?'terr':'mid'}" style="${reg?'':'background:var(--amber-50);color:var(--amber-700);border-color:var(--amber)'}" data-click="openAttReg" data-click-args='["${diso(date)}", "${type}"]'>${type==='mid'?'Entre semana':'Fin de semana'}<small>${reg?'🟢 '+a.count+' asistentes':(date<=TODAY?'🟡 Pendiente':'Programada')}</small></div>`;}
    cells+=`<div class="bigcal-cell ${isToday?'today':''}"><div class="dnum">${dn}</div>${ev}</div>`;}
  const total=startDow+dim;const trail=(7-total%7)%7;for(let i=1;i<=trail;i++)cells+=`<div class="bigcal-cell out"><div class="dnum">${i}</div></div>`;
  document.getElementById('asistCalWrap').innerHTML=`<div class="bigcal"><div class="bigcal-head"><h3>${monName}</h3><div class="actions"><button class="icon-btn" data-click="asistNav" data-click-args='[-1]'>${svg('chevL')}</button><button class="icon-btn" data-click="asistNav" data-click-args='[1]'>${svg('chevR')}</button></div></div><div class="bigcal-grid">${dows.map(d=>`<div class="bigcal-dow">${d}</div>`).join('')}${cells}</div></div>`;
}
function asistNav(d){asistCal.m+=d;if(asistCal.m<0){asistCal.m=11;asistCal.y--}if(asistCal.m>11){asistCal.m=0;asistCal.y++}renderAsistCal()}
function openAttReg(iso,type){const date=new Date(iso+'T00:00:00');const meta=meetingMeta(type);const a=attMeeting(date,type);const reg=ATT_REG[type+iso];const ya=reg||a.registered;
  openModalCustom({icon:'people',tint:type==='mid'?'t-brand':'t-violet',title:'Registrar asistencia',sub:`${dlong(date).replace(/^\w/,c=>c.toUpperCase())} · ${esc(meta.title)}`,
    body:`<div class="form-grid"><div class="form-row"><label>Total de asistentes *</label><input class="input" type="number" min="0" id="att_total" value="${(reg?reg.count:a.count)||''}" placeholder="0" aria-describedby="att_total_hint"/><span class="field-hint" id="att_total_hint" aria-live="polite"></span></div><div class="form-row"><label>Conexiones Zoom</label><input class="input" type="number" min="0" id="att_zoom" value="${reg?reg.zoom:Math.round((a.count||30)*0.2)}"/></div><div class="form-row full"><label>Observaciones</label><textarea class="textarea" id="att_obs" placeholder="Notas opcionales…">${reg?reg.obs||'':''}</textarea></div></div>
      <div style="margin-top:14px">${ya?`<span class="badge green">${svg('check')}Registrado</span>`:`<span class="badge amber">${svg('clock')}Pendiente de registrar</span>`}</div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveAttReg" data-save-args='["${iso}", "${type}"]'>${svg('check')}Guardar registro</button>`});
}
function saveAttReg(iso,type){const el=document.getElementById('att_total');const val=parseInt((el.value||'').trim(),10);
  if(!(val>=1)||val>2000){el.classList.add('invalid');el.setAttribute('aria-invalid','true');const h=document.getElementById('att_total_hint');if(h){h.textContent='Ingresa un total de asistentes válido (1 o más).';h.className='field-hint err';}toast('Revisa el total de asistentes');return;}
  const zoom=parseInt((document.getElementById('att_zoom').value||'0').trim(),10)||0;const obs=(document.getElementById('att_obs').value||'').trim();
  ATT_REG[type+iso]={count:val,zoom,obs};persistAll();
  closeModal();if(currentView==='asistencia')VIEWS.asistencia();toast('Asistencia registrada correctamente ✓');
}
function scheduledMeetings(){const res=[];let d=new Date(TODAY);d.setDate(d.getDate()-90);const end=new Date(TODAY);end.setDate(end.getDate()+30);while(d<=end){const dw=d.getDay();if(dw===2||dw===0){const type=dw===2?'mid':'we';const dt=new Date(d);const a=attMeeting(dt,type);res.push({date:dt,type,iso:diso(dt),registered:a.registered,past:dt<=TODAY});}d.setDate(d.getDate()+1);}return res.reverse();}
function openRegAsist(){const list=scheduledMeetings();const def=list.find(m=>m.past&&!m.registered)||list.find(m=>m.past)||list[0];
  openModalCustom({icon:'calendar',tint:'t-brand',title:'Registrar asistencia',sub:'Selecciona la reunión que deseas registrar',
    body:`<div class="form-row full"><label>Fecha de la reunión programada</label><select class="select" id="ra_sel">${list.map(m=>{const meta=meetingMeta(m.type);return `<option value="${m.iso}|${m.type}"${def&&m.iso===def.iso&&m.type===def.type?' selected':''}>${dstr(m.date)} · ${m.type==='mid'?'Entre semana':'Fin de semana'} · ${esc(meta.title)}${m.registered?' — registrada':(m.past?' — pendiente':' — programada')}</option>`;}).join('')}</select><span class="field-hint" style="margin-top:8px">Solo se muestran fechas con reunión programada (martes y domingo).</span></div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="raContinue">${svg('chevR')}Continuar</button>`});
}
function raContinue(){const v=document.getElementById('ra_sel').value;const p=v.split('|');closeModal();openAttReg(p[0],p[1]);}
function openPendientes(){const {pend}=attScanList();
  openModalCustom({icon:'clock',tint:'t-amber',title:'Pendientes por registrar',sub:`${pend.length} reunión(es) con fecha pasada sin asistencia registrada`,size:'lg',
    body:pend.length?`<div class="table-wrap" style="border:1px solid var(--border);border-radius:13px"><table class="data"><thead><tr><th>Fecha</th><th>Tipo</th><th>Reunión</th><th>Estado</th><th style="text-align:right">Acción</th></tr></thead><tbody>${pend.map(m=>{const meta=meetingMeta(m.type);const iso=diso(m.date);return `<tr><td class="muted">${dstr(m.date)}</td><td>${m.type==='mid'?'Entre semana':'Fin de semana'}</td><td><b>${esc(meta.title)}</b></td><td><span class="badge amber">${svg('clock')}Pendiente</span></td><td style="text-align:right"><button class="btn sm primary" data-click="openAttReg" data-click-args='["${iso}", "${m.type}"]' data-preclose="closeModal">${svg('check')}Registrar</button></td></tr>`;}).join('')}</tbody></table></div>`:`<div class="empty">🎉 No hay reuniones pendientes por registrar.</div>`,
    footer:`<button class="btn" data-click="closeModal">Cerrar</button>`});
}
function openRegistradas(){const {reg}=attScanList();
  openModalCustom({icon:'check',tint:'t-green',title:'Reuniones registradas',sub:`${reg.length} reunión(es) con asistencia registrada · últimos 90 días`,size:'lg',
    body:reg.length?`<div class="table-wrap" style="border:1px solid var(--border);border-radius:13px"><table class="data"><thead><tr><th>Fecha</th><th>Tipo</th><th>Reunión</th><th>Asistentes</th><th>Estado</th></tr></thead><tbody>${reg.map(m=>{const meta=meetingMeta(m.type);return `<tr><td class="muted">${dstr(m.date)}</td><td>${m.type==='mid'?'Entre semana':'Fin de semana'}</td><td><b>${esc(meta.title)}</b></td><td><b>${m.count}</b></td><td><span class="badge green">${svg('check')}Registrado</span></td></tr>`;}).join('')}</tbody></table></div>`:`<div class="empty">Aún no hay reuniones registradas en el periodo.</div>`,
    footer:`<button class="btn" data-click="closeModal">Cerrar</button>`});
}
function openAttAvg(type){const label=type==='mid'?'Entre semana':'Fin de semana';const avg=Math.round(FY_ORDER.reduce((a,ci)=>a+attVal(asistFY,ci,type),0)/12);
  openModalCustom({icon:'meeting',tint:type==='mid'?'t-brand':'t-violet',title:`Promedio ${label.toLowerCase()}`,sub:`Año de servicio ${asistFY-1}–${asistFY} · promedio ${avg} asistentes`,size:'lg',
    body:`<div class="table-wrap" style="border:1px solid var(--border);border-radius:13px"><table class="data"><thead><tr><th>Mes (año de servicio)</th><th>Asistentes</th><th>% de aforo</th></tr></thead><tbody>${FY_ORDER.map(ci=>{const v=attVal(asistFY,ci,type);return `<tr><td><b>${ATT_LABELS[ci]}</b></td><td>${v}</td><td class="muted">${Math.round(v/ATT_CAP*100)}%</td></tr>`;}).join('')}</tbody></table></div>`,
    footer:`<button class="btn" data-click="closeModal">Cerrar</button>`});
}
function areaChart(data,labels,color,cap){
  const W=560,H=180,pad=8;const max=cap||Math.max(...data);const n=data.length;
  const xs=i=>pad+i*(W-2*pad)/(n-1);const ys=v=>H-pad-(v/max)*(H-2*pad);
  const pts=data.map((v,i)=>`${xs(i)},${ys(v)}`).join(' ');
  const area=`${pad},${H-pad} ${pts} ${W-pad},${H-pad}`;
  return `<svg viewBox="0 0 ${W} ${H+22}" style="width:100%"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <polygon points="${area}" fill="url(#ag)"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
    ${data.map((v,i)=>`<circle cx="${xs(i)}" cy="${ys(v)}" r="3" fill="#fff" stroke="${color}" stroke-width="2"/>`).join('')}
    ${labels.map((l,i)=>`<text x="${xs(i)}" y="${H+14}" text-anchor="middle" font-size="9.5" fill="#94a3b8" font-family="Inter">${l}</text>`).join('')}</svg>`;
}

/* -------- INTELIGENCIA ARTIFICIAL (#11) -------- */
VIEWS.ia=()=>{
  const sinInforme=INFORMES.filter(r=>!r.entregado);
  const terrRetraso=TERR.filter(t=>t.estado==='Vencido').concat(TERR.filter(t=>t.estado==='Activo')).slice(0,5);
  // carga de asignaciones por persona (próx 12 reuniones)
  const carga={};upcomingMeetings(12).forEach(mm=>mkParts(mm.date,mm.type).forEach(p=>{if(p.person){carga[p.person.fullName]=(carga[p.person.fullName]||0)+1}}));
  const cargaArr=Object.entries(carga).sort((a,b)=>b[1]-a[1]);
  const sobre=cargaArr.slice(0,4),sub=males.filter(p=>!carga[p.fullName]).slice(0,4);
  const recs=[
    {ico:'report',t:'t-red',titulo:`${sinInforme.length} publicadores sin informe este mes`,d:'Se recomienda enviar recordatorio personalizado antes del cierre.',cta:'Ver informes',action:'informes'},
    {ico:'map',t:'t-amber',titulo:`${STATS.terrVenc} territorios con mayor retraso`,d:'Territorios vencidos que requieren reasignación inmediata para mantener la cobertura.',cta:'Ver territorios',action:'territorios'},
    {ico:'people',t:'t-violet',titulo:'Asignaciones desbalanceadas',d:`${sobre[0]?sobre[0][0]:'—'} tiene ${sobre[0]?sobre[0][1]:0} asignaciones próximas mientras ${sub.length} hermanos no tienen ninguna.`,cta:'Ver programaciones',action:'programaciones'},
    {ico:'check',t:'t-green',titulo:'Equilibra la carga del programa',d:`Considera asignar partes a: ${sub.map(p=>p.fullName.split(' ')[0]).join(', ')||'—'}.`,cta:'Auto-balancear',action:'programaciones'},
  ];
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('AI Insights','Recomendaciones inteligentes basadas en informes, asistencia, territorios y programaciones',`<button class="btn primary" onclick="saveWithFeedback(this,()=>{if(currentView==='ia')VIEWS.ia();toast('Análisis actualizado con los datos más recientes ✓')})">${svg('refresh')}Re-analizar</button>`)}
    <div class="card" style="margin-bottom:22px;background:linear-gradient(120deg,var(--brand-50),var(--violet-50));border-color:var(--brand-200)"><div class="card-pad" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div class="kpi-ico t-brand" style="width:48px;height:48px;background:var(--brand-500);color:#fff">${svg('star')}</div>
      <div style="flex:1;min-width:200px"><b style="font-size:16px">Asistente de la congregación Las Flores</b><p style="color:var(--ink-500);font-size:13px;margin-top:3px">He analizado ${DB.length} publicadores, ${STATS.terrTotal} territorios y las próximas reuniones. Encontré <b>${recs.length} recomendaciones</b> para optimizar la operación.</p></div>
    </div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:18px;margin-bottom:22px">
      ${recs.map(r=>`<div class="card"><div class="card-pad"><div style="display:flex;gap:13px;align-items:flex-start"><div class="kpi-ico ${r.t}" style="width:40px;height:40px;flex-shrink:0">${svg(r.ico)}</div><div style="flex:1"><b style="font-size:14.5px;line-height:1.35;display:block">${esc(r.titulo)}</b><p style="font-size:13px;color:var(--ink-500);margin:7px 0 14px;line-height:1.5">${r.d}</p><button class="btn sm" data-click="go" data-click-args='["${r.action}"]'>${r.cta} ${svg('chevR')}</button></div></div></div></div>`).join('')}
    </div>
    <div class="cols-2">
      <div class="card"><div class="card-head"><div class="kpi-ico t-red" style="width:32px;height:32px">${svg('report')}</div><h3>Publicadores que no entregan informes</h3><div class="actions"><span class="badge red">${sinInforme.length}</span></div></div>
        <div class="lst">${sinInforme.slice(0,6).map(r=>`<div class="lst-item">${avatarHTML(r.pub.fullName)}<div class="lst-body"><b>${r.pub.fullName}</b><p>${r.pub.grupo} · ${r.pub.role}</p></div><button class="btn sm" data-click="remindInforme" data-click-args='[${r.pub.id}]'>${svg('send')}</button></div>`).join('')}</div></div>
      <div class="card"><div class="card-head"><div class="kpi-ico t-violet" style="width:32px;height:32px">${svg('chart')}</div><h3>Estadísticas inteligentes</h3></div><div class="card-pad">
        <div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><b>Tasa de entrega de informes</b><span class="muted">${Math.round(STATS.infEntreg/STATS.total*100)}%</span></div><div class="progress"><span style="width:${Math.round(STATS.infEntreg/STATS.total*100)}%;background:var(--green)"></span></div></div>
        <div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><b>Cobertura de territorios</b><span class="muted">${Math.round(STATS.terrComp/STATS.terrTotal*100)}%</span></div><div class="progress"><span style="width:${Math.round(STATS.terrComp/STATS.terrTotal*100)}%"></span></div></div>
        <div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><b>Asignaciones confirmadas</b><span class="muted">68%</span></div><div class="progress"><span style="width:68%;background:var(--violet)"></span></div></div>
        <p class="muted" style="font-size:12px;margin-top:16px;line-height:1.5">💡 La tasa de entrega mejoró respecto al mes anterior. El grupo con mayor participación es ${REAL_GROUPS[2].n}.</p>
      </div></div>
    </div>
  </div>`;
};

/* -------- MODALS (create) -------- */
function maleOptions(){return males.slice(0,40).map(p=>`<option>${esc(p.fullName)}</option>`).join('')}
function pubOptions(){return pubsActive.slice(0,40).map(p=>`<option>${esc(p.fullName)}</option>`).join('')}
function elderOptions(){return eldersM.map(p=>`<option>${esc(p.fullName)}</option>`).join('')}
const MODALS={
  assignment:{icon:'calendar',tint:'t-brand',title:'Nueva asignación',sub:'Asigna un publicador a una parte de la reunión',body:`<div class="form-grid"><div class="form-row full"><label>Reunión</label><select class="select" id="asg_meet" data-change="asgUpdateParts">${upcomingMeetings(8).map(m=>`<option value="${diso(m.date)}|${m.type}">${dstr(m.date)} · ${m.type==='mid'?'Entre semana (Vida y Ministerio)':'Fin de semana (Discurso + Atalaya)'}</option>`).join('')}</select></div><div class="form-row full"><label>Parte / Rol</label><select class="select" id="asg_part"></select></div><div class="form-row full"><label>Publicador asignado</label>${searchSelect('asg_pub',males.map(m=>({value:m.id,label:m.fullName})),males[0].id)}</div><div class="form-row full"><label>Estado</label><select class="select" id="asg_estado"><option>Por confirmar</option><option>Confirmado</option></select></div></div>`},
  task:{icon:'tasks',tint:'t-violet',title:'Nueva tarea',sub:'Asigna una tarea al cuerpo de ancianos',body:`<div class="form-grid"><div class="form-row full"><label>Nombre de la tarea *</label><input class="input" id="tk_titulo" placeholder="Ej. Revisar territorios vencidos"/></div><div class="form-row full"><label>Descripción</label><textarea class="textarea" id="tk_desc" placeholder="Describe la tarea…"></textarea></div><div class="form-row"><label>Asignada a</label><select class="select" id="tk_asig">${eldersM.map(p=>`<option value="${p.id}">${esc(p.fullName)}</option>`).join('')}</select></div><div class="form-row"><label>Prioridad</label><select class="select" id="tk_prio"><option>Alta</option><option selected>Media</option><option>Baja</option></select></div><div class="form-row"><label>Fecha límite</label><input class="input" id="tk_limite" type="date" value="2026-07-10"/></div><div class="form-row"><label>Estado</label><select class="select" id="tk_estado"><option>Pendiente</option><option>Completada</option></select></div></div>`},
  publisher:{icon:'people',tint:'t-brand',title:'Nuevo publicador',sub:'Crea el registro completo del publicador',size:'lg',body:`
    <div class="form-section-title">${svg('user')} Información personal</div>
    <div class="form-grid">
      <div class="form-row"><label>Primer nombre *</label><input class="input" id="np_nombre1" placeholder="Primer nombre"/></div>
      <div class="form-row"><label>Segundo nombre</label><input class="input" id="np_nombre2" placeholder="Segundo nombre"/></div>
      <div class="form-row"><label>Primer apellido *</label><input class="input" id="np_ape1" placeholder="Primer apellido"/></div>
      <div class="form-row"><label>Segundo apellido</label><input class="input" id="np_ape2" placeholder="Segundo apellido"/></div>
      <div class="form-row"><label>Nombre para mostrar</label><input class="input" id="np_display" placeholder="Ej. Juan Pérez"/></div>
      <div class="form-row"><label>Sexo</label><select class="select" id="np_sexo"><option>Masculino</option><option>Femenino</option></select></div>
      <div class="form-row"><label>Fecha de nacimiento</label><input class="input" id="np_nac" type="date"/></div>
      <div class="form-row"><label>Estado</label><select class="select" id="np_estado"><option>Activo</option><option>Irregular</option><option>Inactivo</option></select></div>
    </div>
    <div class="form-section-title">${svg('phone')} Información de contacto</div>
    <div class="form-grid">
      <div class="form-row"><label>Teléfono casa</label><input class="input" id="np_telcasa" placeholder="601 000 0000" inputmode="numeric" data-input="maskPhone" data-input-args='["$el"]'/></div>
      <div class="form-row"><label>Teléfono móvil</label><input class="input" id="np_tel" placeholder="3XX XXX XXXX" inputmode="numeric" data-input="maskPhone" data-input-args='["$el"]'/></div>
      <div class="form-row"><label>Trabajo</label><input class="input" id="np_trabajo" placeholder="Teléfono / lugar de trabajo"/></div>
      <div class="form-row"><label>Correo</label><input class="input" id="np_mail" type="email" placeholder="correo@ejemplo.com" data-input="validateEmail" data-input-args='["$el"]'/></div>
      <div class="form-row full"><label>Dirección</label><input class="input" id="np_dir" placeholder="Calle, número, barrio, localidad"/></div>
      <div class="form-row full"><label>Familia / grupo familiar</label><input class="input" id="np_fam" placeholder="Ej. Familia Pérez Gómez"/></div>
    </div>
    <div class="form-section-title">${svg('shield')} Información congregacional</div>
    <div class="form-grid">
      <div class="form-row"><label>Grupo</label><select class="select" id="np_grupo">${GRUPOS.map(g=>`<option>${g}</option>`).join('')}</select></div>
      <div class="form-row"><label>Privilegio</label><select class="select" id="np_priv">${ROLES.map(r=>`<option>${r}</option>`).join('')}</select></div>
      <div class="form-row"><label>Fecha de bautismo</label><input class="input" id="np_baut" type="date"/></div>
      <div class="form-row"><label>Fecha de nombramiento</label><input class="input" id="np_nomb" type="date"/></div>
    </div>
    <div class="form-section-title">${svg('flag')} Etiquetas especiales</div>
    <div style="display:flex;flex-wrap:wrap;gap:9px">${['Adulto mayor','Enfermo','Sordo','Ciego','Menor','Encarcelado'].map(t=>`<button type="button" data-on="0" data-click="commChip" data-click-args='["$el"]' style="display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 13px;border-radius:20px;font-size:12.5px;font-weight:600;border:1.5px solid var(--border-strong);background:var(--surface-3);color:var(--ink-700);transition:.15s">${t}</button>`).join('')}</div>`},
  territory:{icon:'map',tint:'t-green',title:'Nuevo territorio',sub:'Registra un territorio de predicación en Bogotá',body:`<div class="form-grid"><div class="form-row"><label>Número</label><input class="input" value="038" disabled/></div><div class="form-row"><label>Localidad</label><select class="select">${LOCALIDADES.map(l=>`<option>${l}</option>`).join('')}</select></div><div class="form-row full"><label>Barrio</label><input class="input" placeholder="Ej. Niza Norte"/></div><div class="form-row"><label>Cuadras</label><input class="input" type="number" placeholder="0"/></div><div class="form-row"><label>Viviendas aprox.</label><input class="input" type="number" placeholder="0"/></div><div class="form-row"><label>Responsable</label><select class="select"><option>Sin asignar</option>${maleOptions()}</select></div><div class="form-row"><label>Estado</label><select class="select"><option>Pendiente</option><option>Activo</option></select></div></div>`},
  nopredica:{icon:'home',tint:'t-red',title:'Registrar casa donde no se predica',sub:'Documenta direcciones a evitar',body:`<div class="form-grid"><div class="form-row full"><label>Dirección *</label><input class="input" id="npd_dir" placeholder="Calle, número"/></div><div class="form-row"><label>Territorio</label><select class="select" id="npd_terr">${TERR.map(t=>`<option value="${t.num}">#${t.num} · ${esc(t.barrio)}</option>`).join('')}</select></div><div class="form-row"><label>Localidad</label><select class="select" id="npd_loc">${LOCALIDADES.map(l=>`<option>${l}</option>`).join('')}</select></div><div class="form-row"><label>Motivo</label><select class="select" id="npd_motivo"><option>Oposición</option><option>No molestar</option><option>Perro agresivo</option><option>Acceso restringido</option><option>Solicitud expresa</option></select></div><div class="form-row"><label>Fecha</label><input class="input" id="npd_fecha" type="date" value="${diso(TODAY)}"/></div><div class="form-row full"><label>Observaciones</label><textarea class="textarea" id="npd_obs"></textarea></div></div>`},
};
const MODAL_SAVES={publisher:'savePublisher',task:'saveTaskModal',assignment:'saveAssignment',nopredica:'saveNoPredica'};
const MODAL_INITS={assignment:()=>asgUpdateParts()};
const MODAL_CAP={publisher:'personal.manage',task:'assign.manage',nopredica:'territory.manage',assignment:'assign.manage'};
function openModal(type){if(MODAL_CAP[type]&&!requireCap(MODAL_CAP[type]))return;const m=MODALS[type];const fn=MODAL_SAVES[type]||'defaultModalSave';openModalCustom({...m,footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" onclick="saveWithFeedback(this,()=>${fn}())">${svg('check')}Guardar</button>`});if(MODAL_INITS[type])MODAL_INITS[type]();}
function asgUpdateParts(){const sel=document.getElementById('asg_meet');if(!sel)return;const v=sel.value.split('|');const parts=mkParts(new Date(v[0]+'T00:00:00'),v[1]);document.getElementById('asg_part').innerHTML=parts.map(p=>`<option>${p.role}</option>`).join('');}
function saveAssignment(){const v=document.getElementById('asg_meet').value.split('|');const iso=v[0],type=v[1];const role=document.getElementById('asg_part').value;const pid=sselValue('asg_pub');
  if(!pid){toast('Selecciona un publicador');return;}
  if(!role){toast('Selecciona la parte de la reunión');return;}
  const conf=document.getElementById('asg_estado').value==='Confirmado';
  MEET_OVR[iso+type+'|'+role]={personId:pid,confirmed:conf};
  refreshStats();persistAll();closeModal();
  const per=DB.find(x=>String(x.id)===String(pid));
  notify('Nueva asignación',`Se asignó "${role}" a ${per?per.fullName:'—'} (${dstr(new Date(iso+'T00:00:00'))}).`);
  if(currentView==='programaciones')VIEWS.programaciones();renderNav();
  toast('Asignación guardada ✓');}
function defaultModalSave(){closeModal();toast('Guardado correctamente')}
function savePublisher(){
  const gv=k=>{const el=document.getElementById(k);return el?(el.value||'').trim():''};
  const n1=gv('np_nombre1'),a1=gv('np_ape1');
  if(!n1||!a1){toast('Nombre y primer apellido son obligatorios');['np_nombre1','np_ape1'].forEach(k=>{const el=document.getElementById(k);if(el&&!(el.value||'').trim())el.classList.add('invalid')});return;}
  const nombre=[n1,gv('np_nombre2')].filter(Boolean).join(' ');
  const apellidos=[a1,gv('np_ape2')].filter(Boolean).join(' ');
  if(overLimit({nombre:[nombre,'El nombre'],apellidos:[apellidos,'Los apellidos'],email:[gv('np_mail'),'El correo'],tel:[gv('np_tel')||gv('np_telcasa'),'El teléfono'],dir:[gv('np_dir'),'La dirección'],obs:[gv('np_fam'),'La familia/observación']}))return;
  const fullName=gv('np_display')||`${n1} ${a1}`;
  const sex=gv('np_sexo')==='Femenino'?'F':'M';
  const role=gv('np_priv')||'Publicador';
  const grupo=gv('np_grupo');const gi=Math.max(0,GRUPOS.indexOf(grupo));
  const id=DB.reduce((m2,p)=>Math.max(m2,+p.id||0),0)+1;
  const p={id,nombre,apellidos,fullName,sex,grupoIdx:gi,superintendente:REAL_GROUPS[gi]?REAL_GROUPS[gi].sup:'',auxiliar:REAL_GROUPS[gi]?REAL_GROUPS[gi].aux:'',
    tel:gv('np_tel')||gv('np_telcasa'),email:gv('np_mail'),nacimiento:gv('np_nac'),dir:gv('np_dir'),localidad:'Suba',grupo:GRUPOS[gi]||grupo,
    role,privilegio:role,privilegios:[role],accessRole:defaultAccessRole([role]),estado:gv('np_estado')||'Activo',
    bautismo:gv('np_baut'),nombramiento:gv('np_nomb'),obs:gv('np_fam')?('Familia: '+gv('np_fam')):''};
  DB.push(p);
  INFORMES.push({pub:p,entregado:false,horas:0,estudios:0,auxiliar:role==='Precursor Regular'||role==='Precursor Auxiliar'});
  refreshDerived();persistAll();closeModal();
  notify('Nueva asignación',`${fullName} fue registrado en la base de datos (${GRUPOS[gi]||grupo}).`);
  dbState.page=1;if(currentView==='database')VIEWS.database();
  toast(`${fullName} registrado correctamente ✓`);
}
function focusablesIn(container){return Array.from(container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el=>el.offsetParent!==null);}
let __modalReturnFocus=null;
function openModalCustom({icon,tint,title,sub,body,footer,size=''}){
  closeModal();__modalReturnFocus=document.activeElement;
  const ov=document.createElement('div');ov.className='modal-overlay';ov.id='modalOverlay';ov.onclick=e=>{if(e.target===ov)closeModal()};
  ov.innerHTML=`<div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modalTitle" tabindex="-1"><div class="modal-head">${icon?`<div class="mh-ico ${tint||'t-brand'}">${svg(icon)}</div>`:''}<div style="flex:1"><h3 id="modalTitle">${title}</h3><p>${sub||''}</p></div><button class="icon-btn" data-click="closeModal" aria-label="Cerrar">${svg('x')}</button></div><div class="modal-body">${body}</div><div class="modal-foot">${footer||`<button class="btn" data-click="closeModal">Cerrar</button>`}</div></div>`;
  document.body.appendChild(ov);document.body.classList.add('modal-lock');document.addEventListener('keydown',modalKeydown);
  const modal=ov.querySelector('.modal');const f=focusablesIn(modal);(f[0]||modal).focus();
}
function swapModalContent({icon,tint,title,sub,body,footer,size}){
  const ov=document.getElementById('modalOverlay');if(!ov)return openModalCustom({icon,tint,title,sub,body,footer,size});
  const m=ov.querySelector('.modal');if(!m)return;
  if(size!==undefined)m.className='modal '+size;
  m.querySelector('.modal-head').innerHTML=`${icon?`<div class="mh-ico ${tint||'t-brand'}">${svg(icon)}</div>`:''}<div style="flex:1"><h3 id="modalTitle">${title}</h3><p>${sub||''}</p></div><button class="icon-btn" data-click="closeModal" aria-label="Cerrar">${svg('x')}</button>`;
  const b=m.querySelector('.modal-body');b.innerHTML=body;b.scrollTop=0;
  m.querySelector('.modal-foot').innerHTML=footer||`<button class="btn" data-click="closeModal">Cerrar</button>`;
}
function modalKeydown(e){
  if(e.key==='Escape'){closeModal();return;}
  if(e.key==='Tab'){
    const ov=document.getElementById('modalOverlay');if(!ov)return;
    const modal=ov.querySelector('.modal');if(!modal)return;
    const f=focusablesIn(modal);if(!f.length)return;
    const first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
}
function closeModal(){const ov=document.getElementById('modalOverlay');if(!ov)return;ov.classList.add('closing');document.body.classList.remove('modal-lock');document.removeEventListener('keydown',modalKeydown);
  const returnTo=__modalReturnFocus;__modalReturnFocus=null;
  setTimeout(()=>{ov.remove();if(returnTo&&returnTo.isConnected)returnTo.focus();},190)}

/* -------- POPOVERS -------- */
function toggleNotif(e){e.stopPropagation();const ex=document.getElementById('notifPop');if(ex){ex.remove();return}closeProfile();
  const pop=document.createElement('div');pop.id='notifPop';pop.className='popover notif';
  pop.innerHTML=`<div class="popover-head"><b>Notificaciones</b><button class="btn sm ghost" onclick="go('actividad');document.getElementById('notifPop')?.remove()">Ver todas</button></div><div class="popover-body">${NOTIFS.slice(0,7).map((n,i)=>`<div class="lst-item" ${!n.read?`role="button" style="background:var(--brand-50);cursor:pointer" onclick="markNotifRead(${i});document.getElementById('notifPop')?.remove()"`:''}><div class="lst-ico ${n.tint}">${svg(n.ico)}</div><div class="lst-body"><b>${esc(n.type)}</b><p>${esc(n.msg)}</p></div><span class="lst-time">${esc(n.time)}</span></div>`).join('')||`<div class="empty" style="padding:22px">Sin notificaciones</div>`}</div>`;
  document.body.appendChild(pop);setTimeout(()=>document.addEventListener('click',closeNotifOnce),0);}
function closeNotifOnce(e){const p=document.getElementById('notifPop');if(p&&!p.contains(e.target)&&e.target.id!=='notifBtn'){p.remove();document.removeEventListener('click',closeNotifOnce)}}
function toggleProfile(e){e.stopPropagation();const ex=document.getElementById('profilePop');if(ex){ex.remove();return}
  const pop=document.createElement('div');pop.id='profilePop';pop.className='popover profile';
  const u=CURRENT_USER||{name:'Paublo Díaz',email:'demo@lasflores.org',level:1,role:ACCESS_LEVELS[1]};
  pop.innerHTML=`<div class="profile-card"><div class="avatar">${initials(u.name)}</div><div><b>${u.name}</b><small>${u.email}</small><div style="margin-top:6px"><span class="badge ${u.level===1?'violet':u.level===2?'blue':u.level===3?'cyan':'gray'}">${svg('shield')}Nivel ${u.level} · ${u.role}</span></div></div></div><div class="profile-menu"><button class="ctx-item" data-click="openMiPerfil" data-preclose="closeProfile">${svg('user')}Mi perfil</button><button class="ctx-item" data-click="openUserConfig" data-preclose="closeProfile">${svg('settings')}Configuración</button><button class="ctx-item" data-click="openIdioma" data-preclose="closeProfile">${svg('refresh')}Cambiar idioma</button><div class="ctx-sep"></div><button class="ctx-item danger" data-click="signOut" data-preclose="closeProfile">${svg('logout')}Cerrar sesión</button></div>`;
  document.body.appendChild(pop);setTimeout(()=>document.addEventListener('click',closeProfileOnce),0);}
function closeProfileOnce(e){const p=document.getElementById('profilePop');if(p&&!p.contains(e.target)&&!document.getElementById('profileBtn').contains(e.target)){p.remove();document.removeEventListener('click',closeProfileOnce)}}
function closeProfile(){const p=document.getElementById('profilePop');if(p)p.remove()}
/* --- Preferencias de notificaciones --- */
const NOTIF_PREFS={enabled:true,tipos:{asignaciones:true,informes:true,territorios:true,reuniones:true,eventos:false},recordatorios:'25',canal:'ambos'};
function openNotifPrefs(){const sw=(k)=>`<label class="switch"><input type="checkbox" id="np_${k}" ${NOTIF_PREFS.tipos[k]?'checked':''}/><span class="tr"></span></label>`;
  openModalCustom({icon:'settings',tint:'t-brand',title:'Preferencias de notificaciones',sub:'Configura cómo y cuándo recibir avisos',size:'lg',
    body:`<div class="set-list" style="margin-bottom:6px">
        <div class="set-row"><div class="set-ico">${svg('bell')}</div><div><b>Activar notificaciones</b><p>Habilita o deshabilita todos los avisos</p></div><div class="ctrl"><label class="switch"><input type="checkbox" id="np_enabled" ${NOTIF_PREFS.enabled?'checked':''}/><span class="tr"></span></label></div></div>
      </div>
      <div class="form-section-title">${svg('filter')} Tipos de notificación</div>
      <div class="set-list">
        <div class="set-row"><div class="set-ico">${svg('calendar')}</div><div><b>Asignaciones</b><p>Nuevas partes y confirmaciones</p></div><div class="ctrl">${sw('asignaciones')}</div></div>
        <div class="set-row"><div class="set-ico">${svg('report')}</div><div><b>Informes</b><p>Entregas y recordatorios de cierre</p></div><div class="ctrl">${sw('informes')}</div></div>
        <div class="set-row"><div class="set-ico">${svg('map')}</div><div><b>Territorios</b><p>Vencimientos y reasignaciones</p></div><div class="ctrl">${sw('territorios')}</div></div>
        <div class="set-row"><div class="set-ico">${svg('meeting')}</div><div><b>Reuniones</b><p>Cambios de programa y asistencia</p></div><div class="ctrl">${sw('reuniones')}</div></div>
        <div class="set-row"><div class="set-ico">${svg('star')}</div><div><b>Eventos</b><p>Asambleas, visitas y actividades</p></div><div class="ctrl">${sw('eventos')}</div></div>
      </div>
      <div class="form-grid" style="margin-top:8px">
        <div class="form-row"><label>Recordatorios (día del mes)</label><select class="select" id="np_recordatorios">${['20','25','28','Último día'].map(o=>`<option ${o===NOTIF_PREFS.recordatorios?'selected':''}>${o}</option>`).join('')}</select></div>
        <div class="form-row"><label>Canal de notificación</label><select class="select" id="np_canal">${[['ambos','Correo + plataforma'],['correo','Solo correo'],['plataforma','Solo dentro de la plataforma']].map(([v,l])=>`<option value="${v}" ${v===NOTIF_PREFS.canal?'selected':''}>${l}</option>`).join('')}</select></div>
      </div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveNotifPrefs">${svg('check')}Guardar preferencias</button>`});
}
function saveNotifPrefs(){const g=id=>document.getElementById(id);NOTIF_PREFS.enabled=g('np_enabled').checked;Object.keys(NOTIF_PREFS.tipos).forEach(k=>{const el=g('np_'+k);if(el)NOTIF_PREFS.tipos[k]=el.checked;});NOTIF_PREFS.recordatorios=g('np_recordatorios').value;NOTIF_PREFS.canal=g('np_canal').value;try{localStorage.setItem('msp_notif',JSON.stringify(NOTIF_PREFS))}catch(e){}closeModal();toast('Preferencias guardadas correctamente ✓');}
/* --- Mi perfil --- */
function openMiPerfil(){
  openModalCustom({icon:'user',tint:'t-brand',title:'Mi perfil',sub:'Gestiona tu información de usuario',size:'lg',
    body:`<div style="display:flex;align-items:center;gap:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:20px;flex-wrap:wrap"><div class="avatar" style="width:58px;height:58px;font-size:21px">PD</div><div style="flex:1;min-width:150px"><div style="font-size:19px;font-weight:750">Paublo Díaz</div><div style="font-size:12.5px;color:var(--ink-500);margin-top:2px">Anciano · Coordinador · Congregación Las Flores</div></div>${roleBadge('Anciano')}</div>
      <div class="form-section-title">${svg('user')} Datos personales</div>
      <div class="form-grid">
        <div class="form-row"><label>Nombre</label><input class="input" id="mp_nombre" value="Paublo"/></div>
        <div class="form-row"><label>Apellidos</label><input class="input" id="mp_ape" value="Díaz"/></div>
        <div class="form-row"><label>Correo electrónico</label><input class="input" type="email" id="mp_mail" value="compumat2009@hotmail.com" data-input="validateEmail" data-input-args='["$el"]' aria-describedby="mp_mail_hint"/><span class="field-hint" id="mp_mail_hint" aria-live="polite"></span></div>
        <div class="form-row"><label>Teléfono</label><input class="input" id="mp_tel" value="311 550 4820" inputmode="numeric" data-input="maskPhone" data-input-args='["$el"]'/></div>
      </div>
      <div class="form-section-title">${svg('shield')} Seguridad</div>
      <div class="form-grid">
        <div class="form-row full"><label>Contraseña</label><input class="input" type="password" value="********"/></div>
      </div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" onclick="saveWithFeedback(this,()=>{closeModal();toast('Perfil actualizado correctamente ✓')})">${svg('check')}Guardar cambios</button>`});
}
/* --- Idioma --- */
let APP_LANG='es';
try{const l=localStorage.getItem('msp_lang');if(l)APP_LANG=l;}catch(e){}
function openIdioma(){const LANGS=[['es','Español','🇪🇸'],['en','Inglés (English)','🇬🇧']];
  openModalCustom({icon:'refresh',tint:'t-brand',title:'Cambiar idioma',sub:'Selecciona el idioma de la plataforma',
    body:`<div style="display:flex;flex-direction:column;gap:10px">${LANGS.map(([v,l,f])=>`<label style="display:flex;align-items:center;gap:12px;padding:14px 16px;border:1.5px solid ${v===APP_LANG?'var(--brand-500)':'var(--border)'};border-radius:12px;cursor:pointer" onclick="document.querySelectorAll('input[name=lang]').forEach(r=>r.parentElement.style.borderColor='var(--border)');this.style.borderColor='var(--brand-500)'"><input type="radio" name="lang" value="${v}" ${v===APP_LANG?'checked':''} style="accent-color:var(--brand-500);width:18px;height:18px"/><span style="font-size:20px">${f}</span><b style="font-size:14px">${l}</b></label>`).join('')}</div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveIdioma">${svg('check')}Guardar</button>`});
}
function saveIdioma(){const r=document.querySelector('input[name=lang]:checked');if(r){APP_LANG=r.value;try{localStorage.setItem('msp_lang',APP_LANG)}catch(e){}}closeModal();toast(APP_LANG==='en'?'Language set to English (demo)':'Idioma cambiado a Español');}
/* --- Configuración del usuario (perfil) --- */
const USER_PREFS={tz:'(GMT-05:00) Bogotá, Lima, Quito',dateFmt:'DD/MM/AAAA',timeFmt:'12 horas (a. m./p. m.)',compact:false,twofa:false};
try{const up=localStorage.getItem('msp_userprefs');if(up)Object.assign(USER_PREFS,JSON.parse(up));}catch(e){}
function openUserConfig(){const dark=document.documentElement.getAttribute('data-theme')==='dark';const sw=(id,on,attr)=>`<label class="switch"><input type="checkbox" id="${id}" ${on?'checked':''}${attr||''}/><span class="tr"></span></label>`;
  openModalCustom({icon:'settings',tint:'t-brand',title:'Configuración',sub:'Preferencias de tu cuenta',size:'lg',
    body:`
      <div class="form-section-title">${svg('bell')} Notificaciones</div>
      <div class="set-list"><div class="set-row"><div class="set-ico">${svg('bell')}</div><div><b>Preferencias de notificaciones</b><p>Tipos, recordatorios y canal de envío</p></div><div class="ctrl"><button class="btn sm" data-click="openNotifPrefs" data-preclose="closeModal">${svg('settings')}Configurar</button></div></div></div>
      <div class="form-section-title">${svg('refresh')} Idioma y región</div>
      <div class="form-grid">
        <div class="form-row"><label>Idioma</label><select class="select" id="uc_lang"><option value="es"${APP_LANG==='es'?' selected':''}>Español</option><option value="en"${APP_LANG==='en'?' selected':''}>Inglés (English)</option></select></div>
        <div class="form-row"><label>Zona horaria</label><select class="select" id="uc_tz">${['(GMT-05:00) Bogotá, Lima, Quito','(GMT-06:00) Ciudad de México','(GMT-03:00) Buenos Aires','(GMT+01:00) Madrid'].map(t=>`<option${USER_PREFS.tz===t?' selected':''}>${t}</option>`).join('')}</select></div>
        <div class="form-row"><label>Formato de fecha</label><select class="select" id="uc_datefmt">${['DD/MM/AAAA','MM/DD/AAAA','AAAA-MM-DD'].map(f=>`<option${USER_PREFS.dateFmt===f?' selected':''}>${f}</option>`).join('')}</select></div>
        <div class="form-row"><label>Formato de hora</label><select class="select" id="uc_timefmt">${['12 horas (a. m./p. m.)','24 horas'].map(f=>`<option${USER_PREFS.timeFmt===f?' selected':''}>${f}</option>`).join('')}</select></div>
      </div>
      <div class="form-section-title">${svg('eye')} Preferencias de la interfaz</div>
      <div class="set-list">
        <div class="set-row"><div class="set-ico">${svg('star')}</div><div><b>Modo oscuro</b><p>Tema visual de la plataforma</p></div><div class="ctrl">${sw('uc_dark',dark,' data-change="toggleTheme"')}</div></div>
        <div class="set-row"><div class="set-ico">${svg('grid')}</div><div><b>Densidad compacta</b><p>Menos espaciado en tablas y listas</p></div><div class="ctrl">${sw('uc_compact',USER_PREFS.compact)}</div></div>
      </div>
      <div class="form-section-title">${svg('shield')} Seguridad de la cuenta</div>
      <div class="set-list" style="margin-bottom:16px"><div class="set-row"><div class="set-ico">${svg('lock')}</div><div><b>Verificación en dos pasos (2FA)</b><p>Protege el acceso a tu cuenta</p></div><div class="ctrl">${sw('uc_2fa',USER_PREFS.twofa)}</div></div></div>
      <div class="form-grid">
        <div class="form-row"><label>Contraseña actual</label><input class="input" type="password" id="uc_pw0" placeholder="••••••••"/></div>
        <div class="form-row"><label>Nueva contraseña</label><input class="input" type="password" id="uc_pw1" placeholder="Mínimo 8 caracteres"/></div>
        <div class="form-row full"><label>Confirmar nueva contraseña</label><input class="input" type="password" id="uc_pw2" placeholder="Repite la nueva contraseña"/></div>
      </div>`,
    footer:`<button class="btn" data-click="closeModal">Cerrar</button><button class="btn primary" data-click="saveDelegated" data-save="saveUserConfig">${svg('check')}Guardar cambios</button>`});
}
function saveUserConfig(){const g=id=>document.getElementById(id);
  const p1=g('uc_pw1').value,p2=g('uc_pw2').value;
  if(p1||p2){if(p1.length<8){toast('La nueva contraseña debe tener al menos 8 caracteres');return;}if(p1!==p2){toast('Las contraseñas no coinciden');return;}}
  APP_LANG=g('uc_lang').value;try{localStorage.setItem('msp_lang',APP_LANG)}catch(e){}
  USER_PREFS.tz=g('uc_tz').value;USER_PREFS.dateFmt=g('uc_datefmt').value;USER_PREFS.timeFmt=g('uc_timefmt').value;USER_PREFS.compact=g('uc_compact').checked;USER_PREFS.twofa=g('uc_2fa').checked;
  try{localStorage.setItem('msp_userprefs',JSON.stringify(USER_PREFS))}catch(e){}
  closeModal();toast('Configuración guardada correctamente ✓');
}

/* -------- ACCESIBILIDAD: role/tabindex para clicables no nativos + aria-label desde data-tip -------- */
const A11Y_NATIVE=['BUTTON','A','SELECT','INPUT','TEXTAREA','LABEL'];
function a11yEnhance(root){
  if(!root||root.nodeType!==1)return;
  const list=[];
  if(root.matches&&root.matches('[onclick],[data-tip]'))list.push(root);
  if(root.querySelectorAll)list.push(...root.querySelectorAll('[onclick],[data-tip]'));
  list.forEach(el=>{
    if(el.hasAttribute('onclick')&&!A11Y_NATIVE.includes(el.tagName)){
      if(!el.hasAttribute('role'))el.setAttribute('role','button');
      if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','0');
    }
    if(el.hasAttribute('data-tip')&&!el.hasAttribute('aria-label')&&!el.textContent.trim())el.setAttribute('aria-label',el.getAttribute('data-tip'));
  });
}
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.getAttribute&&e.target.getAttribute('role')==='button'&&!e.target.hasAttribute('onkeydown')){
    e.preventDefault();e.target.click();
  }
});
new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>a11yEnhance(n)))).observe(document.body,{childList:true,subtree:true});
a11yEnhance(document.body);

/* -------- PERSISTENCIA DE ESTADO DE UI (sidebar, pestañas, filtros) -------- */
const UI_STATE_KEY='msp_ui_state_v1';
let __uiSaveTimer=null;
function saveUiState(){
  if(__uiSaveTimer)clearTimeout(__uiSaveTimer);
  __uiSaveTimer=setTimeout(()=>{try{localStorage.setItem(UI_STATE_KEY,JSON.stringify({
    sidebarCollapsed:!!document.getElementById('sidebar')?.classList.contains('collapsed'),
    configTab,legalTab,terrTab,informeFilter,actFilter,
    dbFilters:{q:dbState.q,grupo:dbState.grupo,privilegio:dbState.privilegio,estado:dbState.estado,sortCol:dbState.sortCol,sortDir:dbState.sortDir},
    terrAsignFilter:{month:terrAsignFilter.month,encargado:terrAsignFilter.encargado}
  }));}catch(e){}},300);
}
function loadUiState(){
  let s;try{s=JSON.parse(localStorage.getItem(UI_STATE_KEY)||'null');}catch(e){s=null;}
  if(!s)return;
  if(s.sidebarCollapsed)document.getElementById('sidebar')?.classList.add('collapsed');
  if(s.configTab)configTab=s.configTab;
  if(s.legalTab)legalTab=s.legalTab;
  if(s.terrTab)terrTab=s.terrTab;
  if(s.informeFilter)informeFilter=s.informeFilter;
  if(s.actFilter)actFilter=s.actFilter;
  if(s.dbFilters)Object.assign(dbState,s.dbFilters);
  if(s.terrAsignFilter)Object.assign(terrAsignFilter,s.terrAsignFilter);
}

/* -------- UI HELPERS -------- */
function toggleTheme(){const d=document.documentElement;const dark=d.getAttribute('data-theme')==='dark';if(dark)d.removeAttribute('data-theme');else d.setAttribute('data-theme','dark');try{localStorage.setItem('msp_theme',dark?'light':'dark')}catch(e){}updateThemeToggle()}
function updateThemeToggle(){const dark=document.documentElement.getAttribute('data-theme')==='dark';const b=document.getElementById('themeToggle');if(b){b.innerHTML=svg(dark?'sun':'moon');b.setAttribute('data-tip',dark?'Modo claro':'Modo oscuro');b.setAttribute('aria-label',dark?'Cambiar a modo claro':'Cambiar a modo oscuro')}}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('collapsed');saveUiState();}
function openMobileNav(){document.getElementById('sidebar').classList.add('mobile-open');document.getElementById('scrim').classList.add('show')}
function closeMobileNav(){document.getElementById('sidebar').classList.remove('mobile-open');document.getElementById('scrim').classList.remove('show')}
function toast(msg){const t=document.createElement('div');t.className='toast';t.innerHTML=`${svg('check')}<span>${msg}</span>`;document.getElementById('toastWrap').appendChild(t);setTimeout(()=>{t.style.transition='.3s';t.style.opacity='0';t.style.transform='translateX(50px)';setTimeout(()=>t.remove(),300)},2600)}
function toastAction(msg,actionLabel,onAction,opts){opts=opts||{};const t=document.createElement('div');t.className='toast'+(opts.cls?' '+opts.cls:'');t.innerHTML=`${svg(opts.icon||'check')}<span style="flex:1">${msg}</span><button class="toast-action">${actionLabel}</button>`;document.getElementById('toastWrap').appendChild(t);let done=false;const dismiss=()=>{if(done)return;done=true;t.style.transition='.3s';t.style.opacity='0';t.style.transform='translateX(50px)';setTimeout(()=>t.remove(),300)};t.querySelector('.toast-action').addEventListener('click',()=>{done||onAction();dismiss()});setTimeout(dismiss,opts.duration||6000);return t}
function gsClose(){const p=document.getElementById('gsPop');if(p)p.remove();document.removeEventListener('click',gsCloseOnce);}
function gsCloseOnce(e){const p=document.getElementById('gsPop');if(p&&!p.contains(e.target)&&e.target.id!=='globalSearch')gsClose();}
function gsGo(kind,id){gsClose();const inp=document.getElementById('globalSearch');inp.value='';inp.blur();
  if(kind==='pub'){const p=DB.find(x=>String(x.id)===String(id));go('database');if(p)openFicha(p.id);}
  else if(kind==='terr'){go('territorios');openTerrHist(id);}
  else if(kind==='task'){go('actividad');openTaskDetail(+id);}
  else go(id);}
function renderGlobalSearch(){const inp=document.getElementById('globalSearch');const q=(inp.value||'').trim().toLowerCase();
  if(q.length<2){gsClose();return;}
  const res=[];const qd=q.replace(/\s/g,'');
  if(can('personal.view'))DB.forEach(p=>{if(res.filter(r=>r.k==='pub').length<5&&(p.fullName.toLowerCase().includes(q)||(p.email||'').toLowerCase().includes(q)||(p.tel||'').replace(/\s/g,'').includes(qd)))res.push({k:'pub',id:p.id,t:p.fullName,s:p.grupo+' · '+p.role,ico:'user',tint:'t-brand'})});
  TERR.forEach(t=>{if(res.filter(r=>r.k==='terr').length<4&&(t.num.includes(qd)||('territorio '+t.num).includes(q)||('territorio '+(+t.num)).includes(q)||t.barrio.toLowerCase().includes(q)||t.localidad.toLowerCase().includes(q)))res.push({k:'terr',id:t.num,t:'Territorio #'+t.num,s:t.barrio+' · '+t.localidad,ico:'map',tint:'t-green'})});
  TASKS.forEach(t=>{if(res.filter(r=>r.k==='task').length<3&&t.titulo.toLowerCase().includes(q))res.push({k:'task',id:t.id,t:t.titulo,s:'Tarea · '+t.estado,ico:'tasks',tint:'t-violet'})});
  NAV.forEach(sec=>sec.items.forEach(it=>{if(it.label.toLowerCase().includes(q))res.push({k:'view',id:it.id,t:it.label,s:'Ir al módulo',ico:it.ico,tint:'t-cyan'})}));
  let p=document.getElementById('gsPop');
  if(!p){p=document.createElement('div');p.id='gsPop';document.body.appendChild(p);setTimeout(()=>document.addEventListener('click',gsCloseOnce),0);}
  const r=inp.getBoundingClientRect();
  p.style.cssText=`position:fixed;top:${r.bottom+8}px;left:${r.left}px;width:${Math.max(r.width,340)}px;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:0 14px 44px rgba(15,23,42,.16);z-index:300;max-height:420px;overflow-y:auto`;
  p.innerHTML=res.length?res.slice(0,10).map(x=>`<div class="lst-item" role="button" tabindex="0" style="cursor:pointer" data-click="gsGo" data-click-args='["${x.k}", "${x.id}"]'><div class="lst-ico ${x.tint}">${svg(x.ico)}</div><div class="lst-body"><b>${x.t}</b><p>${x.s}</p></div>${svg('chevR')}</div>`).join(''):`<div class="empty" style="padding:22px">Sin resultados para «${q}»</div>`;
}
const gsInput=document.getElementById('globalSearch');
gsInput.addEventListener('input',renderGlobalSearch);
gsInput.addEventListener('keydown',e=>{if(e.key==='Escape'){gsClose();e.target.blur()}else if(e.key==='Enter')renderGlobalSearch()});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();document.getElementById('globalSearch').focus()}});

/* INIT */
/* -------- PERSISTENCIA (API simulada sobre localStorage; los datos sobreviven recargas) -------- */
const PERSIST_KEY='msp_data_v1';
let __hydrating=false;
let __sbReady=false;      // true tras cargar/sembrar Supabase con éxito
let __syncState={state:'idle',at:0,msg:''};
function dataBackend(){return (SB_ENABLED&&CURRENT_USER&&!CURRENT_USER.demo)?'supabase':'local';}
/* Instantánea completa del estado (misma forma para localStorage y Postgres) */
function buildSnapshot(){return {v:1,
  db:DB,
  tasks:TASKS.map(t=>({id:t.id,titulo:t.titulo,desc:t.desc,creadoPor:t.creadoPor,asignadoAId:t.asignadoA?t.asignadoA.id:null,creada:t.creada,creadaISO:t.creadaD?diso(t.creadaD):null,limite:t.limite,limiteISO:t.limiteD?diso(t.limiteD):null,prioridad:t.prioridad,estado:t.estado,progreso:t.progreso})),
  notifs:NOTIFS.map(n=>({type:n.type,ico:n.ico,tint:n.tint,msg:n.msg,time:n.time,read:n.read,dateMs:n.date?n.date.getTime():null})),
  terr:TERR.map(t=>Object.assign({},t,{resp:undefined,respId:t.resp?t.resp.id:null})),
  terrAsign:TERR_ASIGN.map(a=>Object.assign({},a)),taSeq:taSeq,
  noPredica:NO_PREDICA.map(x=>Object.assign({},x)),anuncios:ANUNCIOS.map(x=>Object.assign({},x)),eventos:EVENTS.map(x=>Object.assign({},x)),
  grupos:REAL_GROUPS.map(g=>({n:g.n,sup:g.sup,aux:g.aux})),
  informes:INFORMES.map(r=>({pubId:r.pub.id,entregado:r.entregado,horas:r.horas,estudios:r.estudios,auxiliar:r.auxiliar})),
  attReg:ATT_REG,meetOvr:MEET_OVR,discOvr:DISC_OVR,exhibOvr:EXHIB_OVR,congCfg:CONG_CFG};}
function persistAll(){if(__hydrating)return;
  if(dataBackend()==='supabase'){scheduleSbSync();return;}
  try{localStorage.setItem(PERSIST_KEY,JSON.stringify(buildSnapshot()))}catch(e){}}
function readLocalSnapshot(){let raw=null;try{raw=localStorage.getItem(PERSIST_KEY)}catch(e){}if(!raw)return null;try{return JSON.parse(raw)}catch(e){return null}}
/* Reconstruye el estado en memoria a partir de una instantánea (relinkea referencias) */
function applySnapshot(d){
  if(!d||d.v!==1)return;__hydrating=true;
  try{
    const byId=id=>DB.find(x=>String(x.id)===String(id))||null;
    if(Array.isArray(d.db)&&d.db.length){const cur={};DB.forEach(p=>cur[p.id]=p);const next=d.db.map(sp=>{const p=cur[sp.id];if(p){Object.assign(p,sp);return p}return sp});DB.length=0;next.forEach(p=>DB.push(p));refreshDerived();}
    if(Array.isArray(d.grupos)){d.grupos.forEach((g,i)=>{if(REAL_GROUPS[i]){REAL_GROUPS[i].n=g.n;REAL_GROUPS[i].sup=g.sup;REAL_GROUPS[i].aux=g.aux;GRUPOS[i]=g.n}else{REAL_GROUPS.push({n:g.n,sup:g.sup,aux:g.aux,m:[]});GRUPOS.push(g.n)}});}
    if(Array.isArray(d.tasks)){TASKS.length=0;d.tasks.forEach(t=>TASKS.push({id:t.id,titulo:t.titulo,desc:t.desc,creadoPor:t.creadoPor,asignadoA:byId(t.asignadoAId)||eldersM[0],creada:t.creada,creadaD:t.creadaISO?new Date(t.creadaISO+'T00:00:00'):new Date(TODAY),limite:t.limite,limiteD:t.limiteISO?new Date(t.limiteISO+'T00:00:00'):new Date(TODAY),prioridad:t.prioridad,estado:t.estado,progreso:t.progreso}));}
    if(Array.isArray(d.notifs)){NOTIFS.length=0;d.notifs.forEach(n=>NOTIFS.push({type:n.type,ico:n.ico,tint:n.tint,msg:n.msg,time:n.time,read:n.read,date:n.dateMs!=null?new Date(n.dateMs):new Date(TODAY)}));}
    if(Array.isArray(d.terr)){d.terr.forEach(st=>{const respId=st.respId;const clone=Object.assign({},st);delete clone.respId;delete clone.resp;const t=TERR.find(x=>x.num===clone.num);if(t){Object.assign(t,clone);t.resp=respId!=null?byId(respId):null;}else{clone.resp=respId!=null?byId(respId):null;TERR.push(clone);}});}
    if(Array.isArray(d.terrAsign)){TERR_ASIGN.length=0;d.terrAsign.forEach(a=>TERR_ASIGN.push(a));}
    if(typeof d.taSeq==='number')taSeq=d.taSeq;
    if(Array.isArray(d.noPredica)){NO_PREDICA.length=0;d.noPredica.forEach(x=>NO_PREDICA.push(x));}
    if(Array.isArray(d.anuncios)){ANUNCIOS.length=0;d.anuncios.forEach(a=>ANUNCIOS.push(a));}
    if(Array.isArray(d.eventos)){EVENTS.length=0;d.eventos.forEach(ev=>EVENTS.push(ev));}
    if(Array.isArray(d.informes)){d.informes.forEach(si=>{const r=INFORMES.find(x=>x.pub&&String(x.pub.id)===String(si.pubId));if(r){r.entregado=si.entregado;r.horas=si.horas;r.estudios=si.estudios;r.auxiliar=si.auxiliar}else{const p=byId(si.pubId);if(p)INFORMES.push({pub:p,entregado:si.entregado,horas:si.horas,estudios:si.estudios,auxiliar:si.auxiliar})}});}
    if(d.attReg){Object.keys(ATT_REG).forEach(k=>delete ATT_REG[k]);Object.keys(d.attReg).forEach(k=>ATT_REG[k]=d.attReg[k]);}
    if(d.meetOvr)MEET_OVR=d.meetOvr;
    if(d.discOvr)DISC_OVR=d.discOvr;
    if(d.exhibOvr)EXHIB_OVR=d.exhibOvr;
    if(d.congCfg)CONG_CFG=d.congCfg;
    refreshStats();
  }catch(e){}
  __hydrating=false;
}
async function hydrateAll(){
  if(dataBackend()==='supabase'){await hydrateFromSupabase();}
  else{applySnapshot(readLocalSnapshot());}
}

/* ============ CAPA DE DATOS SUPABASE (Postgres como espejo del estado) ============
   Cada entidad se guarda en su tabla: columnas legibles + columna data(jsonb) con el
   objeto completo (hidratación sin pérdida). Los "overrides"/config van en app_state. */
/* Datos personales SENSIBLES: viven en tabla aparte (publisher_private), solo Nivel 1-2 los leen/escriben */
const SENSITIVE_FIELDS=['tel','email','dir','nacimiento','obs'];
function cleanPub(p){const o=Object.assign({},p);SENSITIVE_FIELDS.forEach(k=>delete o[k]);return o;}
function pubPrivate(p){const o={};SENSITIVE_FIELDS.forEach(k=>{o[k]=p[k]!==undefined?p[k]:null});return o;}
/* wcap = capacidad requerida para ESCRIBIR esa entidad (sincroniza solo lo que el rol puede modificar) */
const SB_ARRAYS=[
  {t:'groups',               f:'grupos',    id:(x,i)=>i,               wcap:'data.edit',        typed:x=>({name:x.n,overseer:x.sup,assistant:x.aux})},
  {t:'publishers',           f:'db',        id:x=>x.id,                wcap:'personal.manage',  clean:cleanPub, typed:x=>({full_name:x.fullName,first_name:x.nombre,last_name:x.apellidos,sex:x.sex,group_id:x.grupoIdx,role:x.role,status:x.estado})},
  {t:'territories',          f:'terr',      id:x=>parseInt(x.num,10),  wcap:'territory.manage', typed:x=>({number:x.num,neighborhood:x.barrio,locality:x.localidad,status:x.estado,responsible_id:(x.respId!=null?x.respId:null)})},
  {t:'territory_assignments',f:'terrAsign', id:x=>x.id,                wcap:'assign.manage',    typed:x=>({assign_date:x.date,captain_id:x.encargadoId,confirmation:x.conf,notes:x.obs})},
  {t:'do_not_call',          f:'noPredica', id:(x,i)=>i,               wcap:'territory.manage', typed:x=>({territory_number:x.terr,address:x.dir,locality:x.localidad,reason:x.motivo,notes:x.obs})},
  {t:'tasks',                f:'tasks',     id:x=>x.id,                wcap:'assign.manage',    typed:x=>({title:x.titulo,description:x.desc,priority:x.prioridad,status:x.estado,progress:x.progreso})},
  {t:'reports',              f:'informes',  id:(x,i)=>i,               wcap:'informe.register', typed:x=>({publisher_id:x.pubId,submitted:x.entregado,hours:x.horas,studies:x.estudios,pioneer:x.auxiliar,period:'2026-06'})},
  {t:'announcements',        f:'anuncios',  id:(x,i)=>i,               wcap:'anuncio.manage',   typed:x=>({title:x.t,body:x.d})},
  {t:'events',               f:'eventos',   id:(x,i)=>i,               wcap:'anuncio.manage',   typed:x=>({name:x.n,detail:x.d})}
];
const SB_STATE=['notifs','attReg','meetOvr','discOvr','exhibOvr','congCfg','taSeq'];
const SB_STATE_OPS=['meetOvr','discOvr','exhibOvr','taSeq']; // operativo (Nivel<=3); el resto es admin (Nivel<=2)
function sbInList(ids){return ids.map(v=>typeof v==='string'?('"'+v+'"'):v).join(',');}
async function sbSyncNow(snap){snap=snap||buildSnapshot();
  try{
    for(const e of SB_ARRAYS){
      if(e.wcap&&!can(e.wcap))continue; // el rol no puede escribir esta entidad → no la toca
      const arr=snap[e.f]||[];
      const rows=arr.map((x,i)=>Object.assign({id:e.id(x,i),ord:i,data:(e.clean?e.clean(x):x)},e.typed(x,i)));
      if(rows.length)await sbRest(e.t+'?on_conflict=id',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:rows});
      const ids=rows.map(r=>r.id);
      await sbRest(e.t+(ids.length?('?id=not.in.('+sbInList(ids)+')'):'?id=not.is.null'),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
    }
    if(can('personal.view')){ // datos sensibles en tabla aparte
      const priv=(snap.db||[]).map((p,i)=>({id:p.id,ord:i,data:pubPrivate(p)}));
      if(priv.length)await sbRest('publisher_private?on_conflict=id',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:priv});
      const pids=priv.map(r=>r.id);
      await sbRest('publisher_private'+(pids.length?('?id=not.in.('+sbInList(pids)+')'):'?id=not.is.null'),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
    }
    if(can('assign.manage')){ // overrides/config: Nivel<=2 escribe todo; Nivel 3 solo lo operativo
      const keys=can('config.general')?SB_STATE:SB_STATE_OPS;
      const kv=keys.map(k=>({key:k,value:(snap[k]!==undefined?snap[k]:null)}));
      await sbRest('app_state?on_conflict=key',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:kv});
    }
    setSyncState('ok');
  }catch(err){setSyncState('error',err);throw err;}
}
async function hydrateFromSupabase(){
  try{
    const probe=await sbRest('publishers?select=id&limit=1');
    if(!probe||probe.length===0){ // proyecto vacío → sembrar (solo administradores con permiso de datos)
      const local=readLocalSnapshot();if(local)applySnapshot(local);
      if(can('personal.manage')){__sbReady=true;await sbSyncNow(buildSnapshot());setSyncState('seeded');}
      else{setSyncState('ok');}
      return;
    }
    const d={v:1};
    for(const e of SB_ARRAYS){const rows=await sbRest(e.t+'?select=data,ord&order=ord.asc');d[e.f]=(rows||[]).map(r=>r.data);}
    if(can('personal.view')){ // fusiona datos sensibles si el rol puede verlos
      try{const priv=await sbRest('publisher_private?select=id,data');const pmap={};(priv||[]).forEach(r=>{pmap[r.id]=r.data});(d.db||[]).forEach(p=>{const pv=pmap[p.id];if(pv)Object.assign(p,pv);});}catch(e){}
    }
    const kv=await sbRest('app_state?select=key,value');const map={};(kv||[]).forEach(r=>{map[r.key]=r.value});
    SB_STATE.forEach(k=>{if(map[k]!==undefined&&map[k]!==null)d[k]=map[k]});
    applySnapshot(d);__sbReady=true;setSyncState('ok');
  }catch(err){setSyncState('error',err);toast('No se pudo conectar con Supabase; usando datos locales');applySnapshot(readLocalSnapshot());}
}
let __sbTimer=null,__sbSyncing=false,__sbPending=false;
function scheduleSbSync(){if(!__sbReady)return;if(__sbTimer)clearTimeout(__sbTimer);__sbTimer=setTimeout(runSbSync,700);}
async function runSbSync(){if(__sbSyncing){__sbPending=true;return;}__sbSyncing=true;try{await sbSyncNow()}catch(e){}__sbSyncing=false;if(__sbPending){__sbPending=false;runSbSync();}}
function setSyncState(state,err){__syncState={state:state,at:Date.now(),msg:err?String(err.message||err):''};const el=document.getElementById('syncStatusBox');if(el)el.innerHTML=syncStatusHTML();}

/* ============ REALTIME (multi-usuario en vivo, sin librerías) ============
   WebSocket directo al canal Realtime de Supabase (protocolo Phoenix, el mismo
   que usa supabase-js por debajo). Se une a UN canal con postgres_changes para
   todas las tablas de SB_ARRAYS + app_state (+ publisher_private si el rol ve
   datos sensibles). Ante CUALQUIER cambio remoto, en vez de mergear cada tabla
   a mano (9 formas distintas + fechas + sensibles = mucho riesgo), se agenda
   una re-hidratación completa vía hydrateFromSupabase() ya probada (debounce
   corto) — más simple y reutiliza toda la reconciliación de applySnapshot. */
let __rtSocket=null,__rtRef=0,__rtHeartbeat=null,__rtJoined=false,__rtRetry=0,__rtRetryTimer=null,__rtPullTimer=null,__rtManualClose=false,__rtState='idle';
function rtProjectRef(){const m=/^https:\/\/([^.]+)\.supabase\.co/.exec(SUPABASE_URL);return m?m[1]:null;}
function rtNextRef(){return String(++__rtRef);}
function rtSend(msg){if(__rtSocket&&__rtSocket.readyState===1)__rtSocket.send(JSON.stringify(msg));}
function sbRealtimeConnect(){
  if(!SB_ENABLED||!CURRENT_USER||CURRENT_USER.demo)return; // solo backend real, no en modo demo
  if(__rtSocket)return; // ya conectado/conectando
  const ref=rtProjectRef();if(!ref)return;
  __rtManualClose=false;
  let ws;
  try{ws=new WebSocket('wss://'+ref+'.supabase.co/realtime/v1/websocket?apikey='+encodeURIComponent(SUPABASE_ANON_KEY)+'&vsn=1.0.0');}
  catch(e){return;}
  __rtSocket=ws;
  ws.onopen=function(){
    __rtRetry=0;setRtState('connecting');
    if(__rtHeartbeat)clearInterval(__rtHeartbeat);
    __rtHeartbeat=setInterval(function(){rtSend({topic:'phoenix',event:'heartbeat',payload:{},ref:rtNextRef()})},25000);
    rtJoinChannel();
  };
  ws.onmessage=function(ev){try{rtHandleMessage(JSON.parse(ev.data));}catch(e){}};
  ws.onclose=function(){__rtJoined=false;__rtSocket=null;if(__rtHeartbeat){clearInterval(__rtHeartbeat);__rtHeartbeat=null;}
    if(__rtManualClose){setRtState('idle');}else{setRtState('error');rtScheduleReconnect();}};
  ws.onerror=function(){/* el cierre lo maneja onclose */};
}
function rtJoinChannel(){
  const tables=SB_ARRAYS.map(e=>e.t).concat(['app_state']);
  if(can('personal.view'))tables.push('publisher_private');
  const changes=tables.map(t=>({event:'*',schema:'public',table:t}));
  rtSend({topic:'realtime:msplanner-sync',event:'phx_join',payload:{config:{broadcast:{self:false},presence:{key:''},postgres_changes:changes}},ref:rtNextRef()});
}
function rtHandleMessage(msg){
  if(!msg||!msg.event)return;
  if(msg.event==='phx_reply'){
    if(msg.topic==='realtime:msplanner-sync'&&msg.payload){
      if(msg.payload.status==='ok'){__rtJoined=true;setRtState('live');}
      else{setRtState('error');}
    }
    return;
  }
  if(msg.event==='postgres_changes'){rtScheduleRemotePull();return;}
  if(msg.event==='phx_close'||msg.event==='phx_error'){__rtJoined=false;setRtState('error');}
}
function rtScheduleRemotePull(){if(__rtPullTimer)clearTimeout(__rtPullTimer);__rtPullTimer=setTimeout(rtPullNow,900);}
async function rtPullNow(){
  if(__sbSyncing||__hydrating){rtScheduleRemotePull();return;} // no pisar un push/hydrate en curso
  try{await hydrateFromSupabase();renderNav();if(typeof currentView==='string'&&VIEWS[currentView])VIEWS[currentView]();}catch(e){}
}
function sbRealtimeDisconnect(){
  __rtManualClose=true;
  if(__rtRetryTimer){clearTimeout(__rtRetryTimer);__rtRetryTimer=null;}
  if(__rtPullTimer){clearTimeout(__rtPullTimer);__rtPullTimer=null;}
  if(__rtHeartbeat){clearInterval(__rtHeartbeat);__rtHeartbeat=null;}
  if(__rtSocket){try{__rtSocket.close();}catch(e){}__rtSocket=null;}
  __rtJoined=false;setRtState('idle');
}
function rtScheduleReconnect(){
  __rtRetry=Math.min(__rtRetry+1,6);
  const wait=Math.min(30000,1000*Math.pow(2,__rtRetry));
  if(__rtRetryTimer)clearTimeout(__rtRetryTimer);
  __rtRetryTimer=setTimeout(sbRealtimeConnect,wait);
}
function setRtState(s){__rtState=s;const el=document.getElementById('syncStatusBox');if(el)el.innerHTML=syncStatusHTML();}
function rtStateBadge(){
  const map={idle:['gray','Sin tiempo real'],connecting:['amber','Conectando…'],live:['green','En vivo'],error:['amber','Reconectando…']};
  const st=map[__rtState]||map.idle;
  return `<span class="badge ${st[0]}"><span class="bdot"></span>${st[1]}</span>`;
}

/* ---- Panel de sincronización (Config → Sincronización) ---- */
function syncStatusHTML(){const s=__syncState;const back=dataBackend();
  const map={idle:['gray','Inactivo'],ok:['green','Sincronizado'],seeded:['green','Datos iniciales enviados'],error:['red','Error de sincronización']};
  const st=map[s.state]||map.idle;
  return `<div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap"><span class="badge ${back==='supabase'?'green':'gray'}">${svg(back==='supabase'?'db':'home')}${back==='supabase'?'Supabase (nube)':'Local (este navegador)'}</span><span class="badge ${st[0]}"><span class="bdot"></span>${st[1]}</span>${back==='supabase'?rtStateBadge():''}${s.msg?`<small class="muted" style="font-size:11px">${s.msg}</small>`:''}</div>`;}
function syncPanelHTML(){const back=dataBackend();
  const counts=[['Publicadores',DB.length],['Territorios',TERR.length],['Tareas',TASKS.length],['Informes',INFORMES.length],['Asignaciones',TERR_ASIGN.length],['Notificaciones',NOTIFS.length]];
  return `<div class="card"><div class="card-pad">
    <div class="form-section-title">${svg('db')} Estado de la conexión</div>
    <div id="syncStatusBox" style="margin-bottom:16px">${syncStatusHTML()}</div>
    ${SB_ENABLED?`<div class="lst" style="border:1px solid var(--border);border-radius:12px;margin-bottom:16px">${counts.map(c=>`<div class="lst-item"><div class="lst-body"><b>${c[0]}</b></div><span class="tag">${c[1]}</span></div>`).join('')}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-click="testSbConnection">${svg('refresh')}Probar conexión</button><button class="btn" data-click="manualPull">${svg('download')}Recargar desde Supabase</button><button class="btn primary" data-click="manualPush">${svg('send')}Enviar datos a Supabase</button></div>
    <p class="muted" style="font-size:12px;margin-top:14px;line-height:1.6">La sincronización con la nube es automática tras cada cambio cuando inicias sesión con una cuenta real, y los cambios de <b>otros usuarios conectados</b> llegan solos (tiempo real) sin recargar la página. Usa <b>Enviar</b> para forzar una copia y <b>Recargar</b> para traer la versión del servidor.</p>`
    :`<div style="font-size:13px;color:var(--ink-500);background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;line-height:1.6">${svg('shield')} Estás en <b>modo local</b>: los datos se guardan solo en este navegador. Para activar el respaldo en la nube y compartir datos entre dispositivos, configura Supabase siguiendo <b>SETUP_SUPABASE.md</b> (pega tu URL y anon key en el archivo).</div>`}
  </div></div>`;}
async function testSbConnection(){if(!SB_ENABLED){toast('Supabase no está configurado');return;}toast('Probando conexión…');try{await sbRest('profiles?select=id&limit=1');setSyncState('ok');toast('Conexión con Supabase correcta ✓');}catch(e){setSyncState('error',e);toast('No se pudo conectar: '+(e.message||e));}}
function manualPush(){if(!SB_ENABLED){toast('Supabase no está configurado');return;}confirmAction({icon:'send',tint:'t-brand',danger:false,title:'Enviar datos a Supabase',sub:'Copia el estado actual a la nube',body:'Se enviará el estado actual de la app a tu base de datos Supabase (crea o actualiza los registros). Úsalo para la carga inicial o para forzar una copia.',ok:'Enviar'},async()=>{toast('Enviando…');try{__sbReady=true;await sbSyncNow(buildSnapshot());toast('Datos enviados a Supabase ✓');if(currentView==='config')VIEWS.config();}catch(e){toast('Error al enviar: '+(e.message||e));}});}
function manualPull(){if(!SB_ENABLED){toast('Supabase no está configurado');return;}confirmAction({icon:'download',tint:'t-amber',title:'Recargar desde Supabase',sub:'Reemplaza los datos en pantalla',body:'Se descargará la versión guardada en Supabase y reemplazará lo que ves ahora. Los cambios locales sin enviar se perderán.',ok:'Recargar'},async()=>{toast('Descargando…');try{await hydrateFromSupabase();renderNav();go('config');toast('Datos recargados desde Supabase ✓');}catch(e){toast('Error al recargar: '+(e.message||e));}});}
/* overlay de carga de datos */
function showDataLoading(on){let o=document.getElementById('dataLoading');
  if(on){if(!o){o=document.createElement('div');o.id='dataLoading';o.style.cssText='position:fixed;inset:0;z-index:1200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;background:var(--bg)';o.innerHTML='<div class="spinner" style="width:34px;height:34px;border-width:3px"></div><div style="font-size:13.5px;color:var(--ink-500);font-weight:600">Cargando datos de la congregación…</div>';document.body.appendChild(o);}}
  else if(o)o.remove();}

function resetDemoData(){confirmAction({icon:'refresh',tint:'t-amber',title:'Restablecer datos de demostración',sub:'Se descartan todos los cambios guardados',body:'Se eliminarán los datos guardados en este navegador y la aplicación volverá al estado de demostración original. Esta acción no se puede deshacer.',ok:'Restablecer'},()=>{try{localStorage.removeItem(PERSIST_KEY)}catch(e){}location.reload();});}
/* Confirmación genérica (antes de acciones destructivas) */
let __confirmCb=null;
function confirmAction(opts,cb){__confirmCb=cb;openModalCustom({icon:opts.icon||'warn',tint:opts.tint||'t-red',title:opts.title||'¿Estás seguro?',sub:opts.sub||'',body:`<p style="font-size:13.5px;color:var(--ink-500);line-height:1.6">${opts.body||'Esta acción no se puede deshacer.'}</p>`,footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn ${opts.danger===false?'primary':'danger'}" data-click="__confirmRun">${svg('check')}${opts.ok||'Confirmar'}</button>`});}
function __confirmRun(){const cb=__confirmCb;__confirmCb=null;closeModal();if(cb)cb();}
/* Notificación generada por acciones del usuario (alimenta Actividad + campana) */
function notify(type,msg){const t=NOTIF_TYPES.find(x=>x.type===type)||{type:type,ico:'bell',tint:'t-brand'};NOTIFS.unshift({type:t.type,ico:t.ico,tint:t.tint,msg:msg,time:'Ahora',read:false,date:new Date(TODAY)});renderNav();persistAll();}

/* ================= AUTENTICACIÓN + ROLES (Supabase-ready) =================
   Para activar el BACKEND REAL pega aquí las credenciales de tu proyecto Supabase.
   (Supabase → Project Settings → API). Usa la anon/public key, NUNCA la service_role.
   Si quedan vacías, la app corre en MODO DEMO: login local por rol, datos en este navegador. */
const SUPABASE_URL='https://iibparqecemexsscgnay.supabase.co';        // ej: https://abcdxyz.supabase.co
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpYnBhcnFlY2VtZXhzc2NnbmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTA4OTAsImV4cCI6MjA5OTA4Njg5MH0.ra6DLxpgaosKL-d-tC4N0cUU7IJTArUalp5PA5W7Wj8';   // anon public key (empieza por eyJ...)
const SB_ENABLED=/^https:\/\/.+\.supabase\.co\/?$/.test(SUPABASE_URL)&&SUPABASE_ANON_KEY.length>20;

const ACCESS_LEVELS={1:'Super Administrador',2:'Administrador de Congregación',3:'Administrador de Asignaciones',4:'Publicador'};
let CURRENT_USER=null; // {id,email,name,level,role,demo}

/* Capacidades por nivel (número MENOR = más permisos). can(cap)=nivel del usuario <= mínimo requerido.
   1 Super Admin · 2 Admin de Congregación · 3 Admin de Asignaciones · 4 Publicador */
const CAP_MIN={
  /* Solo Nivel 1 (global) */
  'config.global':1,'config.admin':1,'congregations.manage':1,'billing':1,'legal.edit':1,
  /* Nivel 1-2 (administración de la congregación) */
  'users.manage':2,'roles.manage':2,'personal.view':2,'personal.manage':2,'data.edit':2,
  'anuncio.manage':2,'comm.send':2,'config.general':2,'report.send':2,
  'reports.download':2,'data.export':2,'report.generate':2,'informe.register':2,
  'attendance.register':2,'dashboard.full':2,'stats.view':2,
  /* Nivel 1-3 (operativo: programa, asignaciones, territorios) */
  'territory.manage':3,'assign.manage':3,'program.manage':3,'assign.create':3,'assign.confirm':3,
  /* Nivel 1-4 (todos) */
  'field.report':4,'profile.edit.own':4,'view':4
};
function userLevel(){return (CURRENT_USER&&CURRENT_USER.level)||1;}
function can(cap){const m=CAP_MIN[cap];return m==null?true:userLevel()<=m;}
function requireCap(cap){if(can(cap))return true;toast('No tienes permisos para realizar esta acción');return false;}
function redact(val,ph){return can('personal.view')?(val==null?'':val):(ph||'— restringido —');}

/* ---- sesión (localStorage) ---- */
const SESSION_KEY='msp_session';
function saveSession(s){try{localStorage.setItem(SESSION_KEY,JSON.stringify(s))}catch(e){}}
function loadSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
function clearSession(){try{localStorage.removeItem(SESSION_KEY)}catch(e){}}

/* ---- Supabase sin librerías: fetch a GoTrue (/auth) y PostgREST (/rest) ---- */
async function sbAuth(grant,payload){
  const r=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/token?grant_type='+grant,{method:'POST',headers:{'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error_description||j.msg||j.error||('Error '+r.status));
  return j;
}
/* fetch con timeout (AbortController) y 1 reintento ante fallo de red/timeout.
   No reintenta ante respuestas HTTP (4xx/5xx llegan como Response, no como throw). */
const SB_TIMEOUT_MS=15000;
async function fetchWithTimeout(url,init,timeoutMs){const ctrl=new AbortController();const to=setTimeout(()=>ctrl.abort(),timeoutMs||SB_TIMEOUT_MS);
  try{return await fetch(url,Object.assign({},init,{signal:ctrl.signal}))}
  finally{clearTimeout(to)}
}
async function sbRest(path,opts){opts=opts||{};const s=loadSession();
  const headers=Object.assign({'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'},opts.headers||{});
  if(s&&s.access_token)headers['Authorization']='Bearer '+s.access_token;
  const url=SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+path;
  const init={method:opts.method||'GET',headers,body:opts.body?JSON.stringify(opts.body):undefined};
  let r;
  try{r=await fetchWithTimeout(url,init)}
  catch(e){ // timeout o red caída → un reintento
    try{r=await fetchWithTimeout(url,init)}
    catch(e2){throw new Error(e2.name==='AbortError'?'Supabase no respondió (timeout)':'Sin conexión con Supabase')}
  }
  if(!r.ok){throw new Error('REST '+r.status+': '+(await r.text().catch(()=>'')))}
  if(r.status===204)return null;
  const text=await r.text();if(!text)return null; // escrituras con Prefer:return=minimal responden sin cuerpo
  try{return JSON.parse(text)}catch(e){return null}
}
/* Llama a la Edge Function segura de gestión de usuarios (admin-users) */
async function sbFunc(action,payload){const s=loadSession();
  const r=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/admin-users',{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+((s&&s.access_token)||SUPABASE_ANON_KEY)},body:JSON.stringify(Object.assign({action:action},payload||{}))});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||('Error '+r.status));
  return j;
}
/* -------- USUARIOS (gestión de accesos · Nivel 1-2) -------- */
let USERS_CACHE=[];
function usersBackendReady(){return SB_ENABLED&&CURRENT_USER&&!CURRENT_USER.demo;}
VIEWS.usuarios=()=>{
  document.getElementById('content').innerHTML=`<div class="page">
    ${pageHead('Usuarios','Gestiona el acceso y los roles de la congregación',(usersBackendReady()?`<button class="btn primary" data-click="openUserModal">${svg('plus')}Nuevo usuario</button>`:''))}
    <div id="usersWrap"><div class="card"><div class="empty" style="padding:40px">Cargando usuarios…</div></div></div></div>`;
  loadUsers();
};
async function loadUsers(){const wrap=document.getElementById('usersWrap');if(!wrap)return;
  if(!usersBackendReady()){wrap.innerHTML=`<div class="card"><div class="empty" style="padding:46px 24px;text-align:center"><div class="kpi-ico t-amber" style="width:52px;height:52px;margin:0 auto 14px">${svg('shield')}</div><b style="font-size:15px">Disponible con el backend real</b><p class="muted" style="font-size:13px;max-width:460px;margin:8px auto 0;line-height:1.6">La gestión de usuarios usa una función segura de Supabase. Inicia sesión con tu cuenta real (no el modo demostración) para crear y administrar usuarios.</p></div></div>`;return;}
  wrap.innerHTML=`<div class="card"><div class="empty" style="padding:40px">Cargando usuarios…</div></div>`;
  try{const res=await sbFunc('list',{});USERS_CACHE=res.users||[];renderUsersTable();}
  catch(e){wrap.innerHTML=`<div class="card"><div class="empty" style="padding:40px;text-align:center">No se pudo cargar la lista de usuarios.<br><small class="muted">${(e.message||e)}</small><br><button class="btn sm" style="margin-top:14px" data-click="loadUsers">${svg('refresh')}Reintentar</button><p class="muted" style="font-size:12px;margin-top:16px;max-width:460px;margin-left:auto;margin-right:auto">Si la función aún no está desplegada, sigue los pasos de <b>SETUP_USERS.md</b>.</p></div></div>`;}
}
function renderUsersTable(){const wrap=document.getElementById('usersWrap');if(!wrap)return;
  const me=CURRENT_USER?CURRENT_USER.id:'';const myLevel=userLevel();
  const rows=USERS_CACHE.map(u=>{
    const canEdit=(u.access_level>=myLevel)&&(u.id!==me);
    const lvlSel=`<select class="select" style="height:32px;font-size:12px;min-width:200px" ${canEdit?'':'disabled'} data-change="setUserLevel" data-change-args='["${u.id}", "$val"]'>${[1,2,3,4].filter(l=>l>=myLevel).map(l=>`<option value="${l}"${u.access_level===l?' selected':''}>Nivel ${l} · ${ACCESS_LEVELS[l]}</option>`).join('')}</select>`;
    const estado=u.banned?`<span class="badge red">${svg('x')}Inactivo</span>`:`<span class="badge green">${svg('check')}Activo</span>`;
    const actBtn=canEdit?(u.banned?`<button class="btn sm" data-click="toggleUserActive" data-click-args='["${u.id}", true]'>${svg('check')}Activar</button>`:`<button class="btn sm ghost" data-click="toggleUserActive" data-click-args='["${u.id}", false]'>${svg('x')}Desactivar</button>`):'<span class="muted" style="font-size:11.5px">—</span>';
    return `<tr><td><div class="cell-user">${avatarHTML(u.full_name||u.email||'?')}<div><b>${u.full_name||'—'}</b>${u.id===me?' <span class="badge gray" style="font-size:9.5px">tú</span>':''}<br><small class="muted">${u.email||''}</small></div></div></td><td>${lvlSel}</td><td>${estado}</td><td style="text-align:right">${actBtn}</td></tr>`;
  }).join('');
  wrap.innerHTML=`<div class="card"><div class="card-head"><div class="kpi-ico t-brand" style="width:34px;height:34px">${svg('people')}</div><h3>Usuarios (${USERS_CACHE.length})</h3><div class="actions"><button class="btn sm" data-click="loadUsers">${svg('refresh')}Actualizar</button></div></div>
    <div class="table-wrap"><table class="data"><thead><tr><th>Usuario</th><th>Nivel de acceso</th><th>Estado</th><th style="text-align:right">Acción</th></tr></thead><tbody>${rows||`<tr><td colspan="4"><div class="empty">Sin usuarios.</div></td></tr>`}</tbody></table></div>
    <div style="padding:12px 18px;border-top:1px solid var(--border);font-size:11.5px;color:var(--ink-500);line-height:1.5;display:flex;align-items:center;gap:7px">${svg('shield')}<span>Solo puedes asignar niveles iguales o inferiores al tuyo y no puedes modificar tu propia cuenta desde aquí.</span></div>
  </div>`;
}
function openUserModal(){if(!requireCap('users.manage'))return;const myLevel=userLevel();
  openModalCustom({icon:'people',tint:'t-brand',title:'Nuevo usuario',sub:'Crea un acceso y asigna su nivel',
    body:`<div class="form-grid">
      <div class="form-row"><label>Nombre completo *</label><input class="input" id="nu_name" placeholder="Ej. Juan Pérez"/></div>
      <div class="form-row"><label>Correo *</label><input class="input" id="nu_email" type="email" placeholder="correo@congregacion.org" data-input="validateEmail" data-input-args='["$el"]' aria-describedby="nu_email_hint"/><span class="field-hint" id="nu_email_hint" aria-live="polite"></span></div>
      <div class="form-row"><label>Nivel de acceso *</label><select class="select" id="nu_level">${[1,2,3,4].filter(l=>l>=myLevel).map(l=>`<option value="${l}"${l===Math.max(myLevel,2)?' selected':''}>Nivel ${l} · ${ACCESS_LEVELS[l]}</option>`).join('')}</select></div>
      <div class="form-row"><label>Contraseña inicial *</label><input class="input" id="nu_pw" type="text" placeholder="Mínimo 8 caracteres"/><span class="field-hint" style="margin-top:6px">Compártela con el usuario; podrá cambiarla luego.</span></div>
    </div>`,
    footer:`<button class="btn" data-click="closeModal">Cancelar</button><button class="btn primary" data-click="saveDelegated" data-save="saveNewUser">${svg('check')}Crear usuario</button>`});
}
async function saveNewUser(){
  const name=(document.getElementById('nu_name').value||'').trim();
  const email=(document.getElementById('nu_email').value||'').trim().toLowerCase();
  const level=parseInt(document.getElementById('nu_level').value,10)||4;
  const pw=document.getElementById('nu_pw').value||'';
  if(!name){toast('Ingresa el nombre');return;}
  if(!email||email.indexOf('@')<1){toast('Ingresa un correo válido');return;}
  if(pw.length<8){toast('La contraseña debe tener al menos 8 caracteres');return;}
  try{await sbFunc('create',{email:email,password:pw,full_name:name,access_level:level});closeModal();toast('Usuario creado ✓');loadUsers();}
  catch(e){toast('No se pudo crear: '+(e.message||e));}
}
async function setUserLevel(id,level){try{await sbFunc('set_level',{id:id,access_level:parseInt(level,10)});toast('Nivel actualizado ✓');loadUsers();}catch(e){toast('No se pudo cambiar: '+(e.message||e));loadUsers();}}
function toggleUserActive(id,active){const u=USERS_CACHE.find(x=>x.id===id);const nm=u?(u.full_name||u.email):'este usuario';
  confirmAction({icon:active?'check':'x',tint:active?'t-green':'t-amber',danger:active?false:true,title:active?'Activar usuario':'Desactivar usuario',sub:nm,body:active?'El usuario podrá volver a iniciar sesión.':'El usuario no podrá iniciar sesión hasta que lo actives de nuevo.',ok:active?'Activar':'Desactivar'},async()=>{
    try{await sbFunc('set_active',{id:id,active:active});toast(active?'Usuario activado ✓':'Usuario desactivado');loadUsers();}catch(e){toast('No se pudo: '+(e.message||e));}
  });
}
function profileToUser(authUser,prof){const level=(prof&&prof.access_level)||4;
  return {id:authUser.id,email:authUser.email,name:(prof&&prof.full_name)||(authUser.email||'').split('@')[0]||'Usuario',level:level,role:ACCESS_LEVELS[level]};}
async function doLogin(email,password){
  const tok=await sbAuth('password',{email:email,password:password});
  saveSession({access_token:tok.access_token,refresh_token:tok.refresh_token,expires_at:Date.now()+(tok.expires_in||3600)*1000,user:tok.user});
  let prof=null;try{const rows=await sbRest('profiles?select=*&id=eq.'+tok.user.id);prof=rows&&rows[0]}catch(e){}
  CURRENT_USER=profileToUser(tok.user,prof);return CURRENT_USER;
}
async function refreshIfNeeded(){const s=loadSession();if(!s||!s.access_token)return null;
  if(s.expires_at&&s.expires_at>Date.now()+60000)return s;
  try{const tok=await sbAuth('refresh_token',{refresh_token:s.refresh_token});const ns={access_token:tok.access_token,refresh_token:tok.refresh_token,expires_at:Date.now()+(tok.expires_in||3600)*1000,user:tok.user||s.user};saveSession(ns);return ns;}
  catch(e){clearSession();return null;}
}
function demoLogin(level){let extra={};
  CURRENT_USER=Object.assign({id:'demo',email:'demo@lasflores.org',name:'Paublo Díaz',level:level,role:ACCESS_LEVELS[level],demo:true},extra);
  saveSession({demo:true,level:level,name:CURRENT_USER.name,email:CURRENT_USER.email,publisherId:CURRENT_USER.publisherId});startApp();}
async function signOut(){sbRealtimeDisconnect();clearTimeout(__inactTimer);const s=loadSession();if(SB_ENABLED&&s&&s.access_token){try{await fetch(SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/logout',{method:'POST',headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+s.access_token}})}catch(e){}}clearSession();CURRENT_USER=null;location.reload();}
/* --- Seguridad: cierre de sesión automático tras 8 h de inactividad --- */
let __inactTimer=null;const INACTIVITY_MS=8*60*60*1000;
function resetInactivityTimer(){if(!CURRENT_USER)return;clearTimeout(__inactTimer);__inactTimer=setTimeout(()=>{if(!CURRENT_USER)return;toast('Sesión cerrada por inactividad');setTimeout(signOut,1200)},INACTIVITY_MS);}
['click','keydown','mousemove','touchstart'].forEach(ev=>document.addEventListener(ev,resetInactivityTimer,{passive:true}));
/* ---- Publicador (Nivel 4): exclusivo de la app móvil, no disponible en la web ---- */
function showPublisherMobileOnly(){document.querySelector('.app')&&(document.querySelector('.app').style.display='none');
  authOverlay().innerHTML=`<div style="width:100%;max-width:410px">
    <div style="text-align:center;margin-bottom:20px;color:#fff"><div style="font-size:30px;font-weight:800;letter-spacing:-.5px">MS <span style="font-weight:400;opacity:.85">PLANNER</span></div><div style="font-size:13px;opacity:.85;margin-top:4px">App del Publicador</div></div>
    <div class="card" style="padding:30px 24px;text-align:center">
      <div class="kpi-ico t-indigo" style="width:56px;height:56px;margin:0 auto 16px">${svg('user')}</div>
      <h3 style="font-size:18px;font-weight:750;margin-bottom:8px">Tu cuenta es de Publicador</h3>
      <p style="font-size:13px;color:var(--ink-500);line-height:1.6;margin-bottom:22px">El perfil de Publicador está disponible únicamente en la <b>app móvil</b>. Ábrela desde tu teléfono para ver tus asignaciones, registrar tu predicación y enviar tu informe.</p>
      <a class="btn primary" href="publicador.html" style="width:100%;height:46px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px">${svg('logout')}Abrir la app del Publicador</a>
      <div style="margin-top:12px"><button class="btn ghost sm" data-click="signOut">Cerrar sesión</button></div>
    </div>
  </div>`;}

/* ---- pantalla de login ---- */
function authOverlay(){let o=document.getElementById('authOverlay');if(o)return o;o=document.createElement('div');o.id='authOverlay';
  o.style.cssText='position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(135deg,#312E81,#5B21B6 55%,#8B5CF6);overflow:auto';document.body.appendChild(o);return o;}
function removeAuthOverlay(){const o=document.getElementById('authOverlay');if(o)o.remove();document.getElementById('app')&&(document.getElementById('app').style.visibility='visible');}
function showLogin(){document.querySelector('.app')&&(document.querySelector('.app').style.visibility='hidden');
  const demoDesc={1:'Acceso total: todas las congregaciones, usuarios, configuración y datos',2:'Su congregación: publicadores (info completa), territorios, programa, reportes',3:'Operativo: programa, asignaciones y territorios · sin datos personales ni reportes',4:'Su app móvil: sus salidas, informe de predicación y perfil'};
  const demoIco={1:'shield',2:'db',3:'map',4:'user'};const demoTint={1:'t-violet',2:'t-brand',3:'t-cyan',4:'t-indigo'};
  const demoBtns=`<div style="display:grid;gap:9px">${[1,2,3].map(l=>`<button class="btn" style="justify-content:flex-start;height:auto;padding:12px 14px;text-align:left;width:100%;white-space:normal" data-click="demoLogin" data-click-args='[${l}]'><span style="display:flex;align-items:center;gap:11px;width:100%;min-width:0"><span class="kpi-ico ${demoTint[l]}" style="width:34px;height:34px;flex-shrink:0">${svg(demoIco[l])}</span><span style="min-width:0"><b style="display:block;font-size:13.5px">Nivel ${l} · ${ACCESS_LEVELS[l]}</b><small style="display:block;color:var(--ink-500);font-size:11.5px;line-height:1.4">${demoDesc[l]}</small></span></span></button>`).join('')}</div>`;
  const realForm=`<form id="loginForm" data-submit="submitLogin" data-submit-args='["$event"]' style="display:grid;gap:13px">
      <div class="field-wrap"><label style="font-size:12.5px;font-weight:600;color:var(--ink-600);display:block;margin-bottom:5px">Correo electrónico</label><input class="input" id="lg_email" type="email" autocomplete="username" placeholder="tucorreo@congregacion.org" required/></div>
      <div class="field-wrap"><label style="font-size:12.5px;font-weight:600;color:var(--ink-600);display:block;margin-bottom:5px">Contraseña</label><input class="input" id="lg_pw" type="password" autocomplete="current-password" placeholder="••••••••" required/></div>
      <div id="lg_err" style="display:none;font-size:12.5px;color:var(--red);background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:9px;padding:9px 11px"></div>
      <button class="btn primary" id="lg_submit" type="submit" style="width:100%;height:44px;margin-top:2px">${svg('logout')}Iniciar sesión</button>
    </form>`;
  const body=SB_ENABLED
    ? `${realForm}<div style="text-align:center;margin-top:16px"><button class="btn ghost sm" data-click="toggleDemoPanel" id="demoToggle">o entrar en modo demostración</button></div><div id="demoPanel" hidden style="margin-top:12px">${demoBtns}</div>`
    : `<div style="font-size:12.5px;color:var(--ink-500);background:var(--surface-2);border:1px solid var(--border);border-radius:11px;padding:11px 13px;margin-bottom:16px;line-height:1.5">${svg('shield')} Backend Supabase no configurado. Entra en <b>modo demostración</b> eligiendo un rol para probar el control de accesos.</div>${demoBtns}`;
  authOverlay().innerHTML=`<div style="width:100%;max-width:410px">
    <div style="text-align:center;margin-bottom:20px;color:#fff"><div style="font-size:30px;font-weight:800;letter-spacing:-.5px">MS <span style="font-weight:400;opacity:.85">PLANNER</span></div><div style="font-size:13px;opacity:.85;margin-top:4px">Administración de la congregación Las Flores</div></div>
    <div class="card" style="padding:26px 24px"><h3 style="font-size:17px;font-weight:750;margin-bottom:4px">Iniciar sesión</h3><p style="font-size:12.5px;color:var(--ink-500);margin-bottom:18px">${SB_ENABLED?'Ingresa con tu correo y contraseña.':'Selecciona un rol para continuar.'}</p>${body}</div>
    <div style="text-align:center;margin-top:16px;font-size:11.5px;color:rgba(255,255,255,.7)">© 2026 MS Planner · Las Flores</div>
  </div>`;
  const em=document.getElementById('lg_email');if(em)setTimeout(()=>em.focus(),40);
}
function toggleDemoPanel(){const p=document.getElementById('demoPanel');if(p)p.hidden=!p.hidden;}
async function submitLogin(e){e.preventDefault();const btn=document.getElementById('lg_submit');const err=document.getElementById('lg_err');
  const email=document.getElementById('lg_email').value.trim();const pw=document.getElementById('lg_pw').value;
  if(!email||!pw)return;err.style.display='none';btn.disabled=true;btn.classList.add('loading');btn.innerHTML='<span class="spinner"></span>Ingresando…';
  try{await doLogin(email,pw);await startApp();}
  catch(ex){err.textContent=/invalid|credentials|grant/i.test(String(ex.message))?'Correo o contraseña incorrectos.':('No se pudo iniciar sesión: '+ex.message);err.style.display='block';btn.disabled=false;btn.classList.remove('loading');btn.innerHTML=svg('logout')+'Iniciar sesión';}
}
function applyUserToChrome(){if(!CURRENT_USER)return;const u=CURRENT_USER;
  const chip=document.getElementById('profileBtn');
  if(chip)chip.innerHTML=`<div class="avatar">${initials(u.name)}</div><div class="profile-meta"><b>${u.name}</b><small>${u.role}${u.demo?' · demo':''}</small></div><div class="chev">${svg('chevD')}</div>`;
  document.body.setAttribute('data-level',String(u.level));
}
async function startApp(){removeAuthOverlay();
  if(CURRENT_USER&&CURRENT_USER.level===4){ // Publicador: exclusivo de la app móvil (no web)
    showPublisherMobileOnly();
    return;
  }
  const ph=document.getElementById('pubApp');if(ph)ph.style.display='none';
  document.querySelector('.app')&&(document.querySelector('.app').style.visibility='visible',document.querySelector('.app').style.display='');
  applyUserToChrome();
  if(dataBackend()==='supabase')showDataLoading(true);
  try{await hydrateAll();}catch(e){}
  showDataLoading(false);
  if(dataBackend()==='supabase')sbRealtimeConnect();
  renderNav();go('dashboard');updateThemeToggle();resetInactivityTimer();
  if(CURRENT_USER)toast(`Bienvenido, ${esc(CURRENT_USER.name.split(' ')[0])} · ${esc(CURRENT_USER.role)}`);
}
async function initAuth(){const s=loadSession();
  if(s&&s.demo){CURRENT_USER={id:'demo',email:s.email,name:s.name,level:s.level,role:ACCESS_LEVELS[s.level],demo:true,publisherId:s.publisherId};return startApp();}
  if(SB_ENABLED&&s&&s.access_token){const ns=await refreshIfNeeded();if(ns){try{const rows=await sbRest('profiles?select=*&id=eq.'+ns.user.id);CURRENT_USER=profileToUser(ns.user,rows&&rows[0]);return startApp();}catch(e){clearSession();}}}
  showLogin();
}
loadUiState();
initAuth();

/* --- puente a window (Fase b.1): expone símbolos como globales para
   compatibilidad con onclick inline y referencias entre módulos.
   getter=valor vivo; setter=permite `x=...` desde handlers inline. --- */
try{Object.defineProperties(window,{
  A11Y_NATIVE:{get(){return A11Y_NATIVE},configurable:true},
  ACCESS_LEVELS:{get(){return ACCESS_LEVELS},configurable:true},
  ASSIGN_CATS:{get(){return ASSIGN_CATS},configurable:true},
  ATT_CAP:{get(){return ATT_CAP},configurable:true},
  ATT_LABELS:{get(){return ATT_LABELS},configurable:true},
  ATT_MID:{get(){return ATT_MID},configurable:true},
  ATT_REG:{get(){return ATT_REG},configurable:true},
  ATT_WE:{get(){return ATT_WE},configurable:true},
  CAP_MIN:{get(){return CAP_MIN},configurable:true},
  CIRCUITO_CONGS:{get(){return CIRCUITO_CONGS},configurable:true},
  COMM_DEST:{get(){return COMM_DEST},configurable:true},
  DURACIONES:{get(){return DURACIONES},configurable:true},
  FY_LABELS:{get(){return FY_LABELS},configurable:true},
  FY_ORDER:{get(){return FY_ORDER},configurable:true},
  INF_ACTUAL_:{get(){return INF_ACTUAL_},configurable:true},
  INF_NEXT:{get(){return INF_NEXT},configurable:true},
  INF_PREV_:{get(){return INF_PREV_},configurable:true},
  LF_X0:{get(){return LF_X0},configurable:true},
  MODALS:{get(){return MODALS},configurable:true},
  MODAL_CAP:{get(){return MODAL_CAP},configurable:true},
  MODAL_INITS:{get(){return MODAL_INITS},configurable:true},
  MODAL_SAVES:{get(){return MODAL_SAVES},configurable:true},
  NAV:{get(){return NAV},configurable:true},
  NOTIF_PREFS:{get(){return NOTIF_PREFS},configurable:true},
  PAGOS:{get(){return PAGOS},configurable:true},
  PERSIST_KEY:{get(){return PERSIST_KEY},configurable:true},
  REPORT_DL:{get(){return REPORT_DL},configurable:true},
  SB_ARRAYS:{get(){return SB_ARRAYS},configurable:true},
  SB_ENABLED:{get(){return SB_ENABLED},configurable:true},
  SB_STATE:{get(){return SB_STATE},configurable:true},
  SB_STATE_OPS:{get(){return SB_STATE_OPS},configurable:true},
  SB_TIMEOUT_MS:{get(){return SB_TIMEOUT_MS},configurable:true},
  SENSITIVE_FIELDS:{get(){return SENSITIVE_FIELDS},configurable:true},
  SESSION_KEY:{get(){return SESSION_KEY},configurable:true},
  SUPABASE_ANON_KEY:{get(){return SUPABASE_ANON_KEY},configurable:true},
  SUPABASE_URL:{get(){return SUPABASE_URL},configurable:true},
  TERR_ASIGN:{get(){return TERR_ASIGN},configurable:true},
  TITLES:{get(){return TITLES},configurable:true},
  UI_STATE_KEY:{get(){return UI_STATE_KEY},configurable:true},
  USER_PREFS:{get(){return USER_PREFS},configurable:true},
  VIEWS:{get(){return VIEWS},configurable:true},
  VIEW_CAP:{get(){return VIEW_CAP},configurable:true},
  VMC_PARTS:{get(){return VMC_PARTS},configurable:true},
  __confirmRun:{get(){return __confirmRun},configurable:true},
  __extKey:{get(){return __extKey},configurable:true},
  a11yEnhance:{get(){return a11yEnhance},configurable:true},
  actItems:{get(){return actItems},configurable:true},
  actRelTime:{get(){return actRelTime},configurable:true},
  activityPending:{get(){return activityPending},configurable:true},
  afterActChange:{get(){return afterActChange},configurable:true},
  applyDelete:{get(){return applyDelete},configurable:true},
  applyInactive:{get(){return applyInactive},configurable:true},
  applyPriv:{get(){return applyPriv},configurable:true},
  applySnapshot:{get(){return applySnapshot},configurable:true},
  applyUserToChrome:{get(){return applyUserToChrome},configurable:true},
  areaChart:{get(){return areaChart},configurable:true},
  asgUpdateParts:{get(){return asgUpdateParts},configurable:true},
  asistNav:{get(){return asistNav},configurable:true},
  asistWeeks:{get(){return asistWeeks},configurable:true},
  attMeeting:{get(){return attMeeting},configurable:true},
  attScanList:{get(){return attScanList},configurable:true},
  attVal:{get(){return attVal},configurable:true},
  authOverlay:{get(){return authOverlay},configurable:true},
  avatarHTML:{get(){return avatarHTML},configurable:true},
  buildSnapshot:{get(){return buildSnapshot},configurable:true},
  bulkExport:{get(){return bulkExport},configurable:true},
  bulkRemind:{get(){return bulkRemind},configurable:true},
  can:{get(){return can},configurable:true},
  cardPreviewHTML:{get(){return cardPreviewHTML},configurable:true},
  cleanPub:{get(){return cleanPub},configurable:true},
  clearSel:{get(){return clearSel},configurable:true},
  clearSession:{get(){return clearSession},configurable:true},
  closeCtxMenu:{get(){return closeCtxMenu},configurable:true},
  closeCtxOnce:{get(){return closeCtxOnce},configurable:true},
  closeMobileNav:{get(){return closeMobileNav},configurable:true},
  closeModal:{get(){return closeModal},configurable:true},
  closeNotifOnce:{get(){return closeNotifOnce},configurable:true},
  closeProfile:{get(){return closeProfile},configurable:true},
  closeProfileOnce:{get(){return closeProfileOnce},configurable:true},
  commChip:{get(){return commChip},configurable:true},
  completeActTask:{get(){return completeActTask},configurable:true},
  confBadge:{get(){return confBadge},configurable:true},
  confBadgeAsign:{get(){return confBadgeAsign},configurable:true},
  confirmAction:{get(){return confirmAction},configurable:true},
  countExhibFull:{get(){return countExhibFull},configurable:true},
  dataBackend:{get(){return dataBackend},configurable:true},
  dbGo:{get(){return dbGo},configurable:true},
  defaultModalSave:{get(){return defaultModalSave},configurable:true},
  delAnuncio:{get(){return delAnuncio},configurable:true},
  delEvento:{get(){return delEvento},configurable:true},
  delNoPredica:{get(){return delNoPredica},configurable:true},
  delTerrAsign:{get(){return delTerrAsign},configurable:true},
  deletePublisher:{get(){return deletePublisher},configurable:true},
  deleteTask:{get(){return deleteTask},configurable:true},
  demoLogin:{get(){return demoLogin},configurable:true},
  diaSemana:{get(){return diaSemana},configurable:true},
  discFor:{get(){return discFor},configurable:true},
  doLogin:{get(){return doLogin},configurable:true},
  donut:{get(){return donut},configurable:true},
  editFichaCancel:{get(){return editFichaCancel},configurable:true},
  elderOptions:{get(){return elderOptions},configurable:true},
  encName:{get(){return encName},configurable:true},
  enviarSoporte:{get(){return enviarSoporte},configurable:true},
  estadoBadge:{get(){return estadoBadge},configurable:true},
  exhibNav:{get(){return exhibNav},configurable:true},
  fetchWithTimeout:{get(){return fetchWithTimeout},configurable:true},
  fichaEditConfig:{get(){return fichaEditConfig},configurable:true},
  fichaField:{get(){return fichaField},configurable:true},
  fichaInline:{get(){return fichaInline},configurable:true},
  fichaToEdit:{get(){return fichaToEdit},configurable:true},
  fichaViewConfig:{get(){return fichaViewConfig},configurable:true},
  fieldHintEl:{get(){return fieldHintEl},configurable:true},
  filteredDB:{get(){return filteredDB},configurable:true},
  fmtFecha:{get(){return fmtFecha},configurable:true},
  focusablesIn:{get(){return focusablesIn},configurable:true},
  go:{get(){return go},configurable:true},
  grpAddMember:{get(){return grpAddMember},configurable:true},
  grpMembersChips:{get(){return grpMembersChips},configurable:true},
  grpRefresh:{get(){return grpRefresh},configurable:true},
  grpRemoveMember:{get(){return grpRemoveMember},configurable:true},
  gsClose:{get(){return gsClose},configurable:true},
  gsCloseOnce:{get(){return gsCloseOnce},configurable:true},
  gsGo:{get(){return gsGo},configurable:true},
  gsInput:{get(){return gsInput},configurable:true},
  hydrateAll:{get(){return hydrateAll},configurable:true},
  hydrateFromSupabase:{get(){return hydrateFromSupabase},configurable:true},
  infFiltered:{get(){return infFiltered},configurable:true},
  infGo:{get(){return infGo},configurable:true},
  infSortBy:{get(){return infSortBy},configurable:true},
  infoCard:{get(){return infoCard},configurable:true},
  initAuth:{get(){return initAuth},configurable:true},
  isValidMaps:{get(){return isValidMaps},configurable:true},
  lfCell:{get(){return lfCell},configurable:true},
  lfMapBG:{get(){return lfMapBG},configurable:true},
  lineChart:{get(){return lineChart},configurable:true},
  loadSession:{get(){return loadSession},configurable:true},
  loadUiState:{get(){return loadUiState},configurable:true},
  loadUsers:{get(){return loadUsers},configurable:true},
  logoSVG:{get(){return logoSVG},configurable:true},
  maleOptions:{get(){return maleOptions},configurable:true},
  manualPull:{get(){return manualPull},configurable:true},
  manualPush:{get(){return manualPush},configurable:true},
  markAllActivity:{get(){return markAllActivity},configurable:true},
  markInactive:{get(){return markInactive},configurable:true},
  markNotifRead:{get(){return markNotifRead},configurable:true},
  maskPhone:{get(){return maskPhone},configurable:true},
  meetingAccCard:{get(){return meetingAccCard},configurable:true},
  meetingCardsHTML:{get(){return meetingCardsHTML},configurable:true},
  meetingsNextMonths:{get(){return meetingsNextMonths},configurable:true},
  mesLabel:{get(){return mesLabel},configurable:true},
  miniCalendar:{get(){return miniCalendar},configurable:true},
  modalKeydown:{get(){return modalKeydown},configurable:true},
  monthCalHTML:{get(){return monthCalHTML},configurable:true},
  monthName:{get(){return monthName},configurable:true},
  navBadge:{get(){return navBadge},configurable:true},
  notify:{get(){return notify},configurable:true},
  openAnuncioModal:{get(){return openAnuncioModal},configurable:true},
  openAsignTerr:{get(){return openAsignTerr},configurable:true},
  openAssignCategories:{get(){return openAssignCategories},configurable:true},
  openAttAvg:{get(){return openAttAvg},configurable:true},
  openAttReg:{get(){return openAttReg},configurable:true},
  openCambiarFechaDiscurso:{get(){return openCambiarFechaDiscurso},configurable:true},
  openComm:{get(){return openComm},configurable:true},
  openDiscursoMenu:{get(){return openDiscursoMenu},configurable:true},
  openDiscursoModal:{get(){return openDiscursoModal},configurable:true},
  openEditContact:{get(){return openEditContact},configurable:true},
  openEventoModal:{get(){return openEventoModal},configurable:true},
  openExhibTurn:{get(){return openExhibTurn},configurable:true},
  openFicha:{get(){return openFicha},configurable:true},
  openGrupoModal:{get(){return openGrupoModal},configurable:true},
  openHistAsign:{get(){return openHistAsign},configurable:true},
  openIdioma:{get(){return openIdioma},configurable:true},
  openInformesPub:{get(){return openInformesPub},configurable:true},
  openMeeting:{get(){return openMeeting},configurable:true},
  openMiPerfil:{get(){return openMiPerfil},configurable:true},
  openMobileNav:{get(){return openMobileNav},configurable:true},
  openModal:{get(){return openModal},configurable:true},
  openModalCustom:{get(){return openModalCustom},configurable:true},
  openNotifPrefs:{get(){return openNotifPrefs},configurable:true},
  openPendientes:{get(){return openPendientes},configurable:true},
  openPrivilegio:{get(){return openPrivilegio},configurable:true},
  openReassignPart:{get(){return openReassignPart},configurable:true},
  openReemplazarOrador:{get(){return openReemplazarOrador},configurable:true},
  openRegAsist:{get(){return openRegAsist},configurable:true},
  openRegistradas:{get(){return openRegistradas},configurable:true},
  openRegistrarInforme:{get(){return openRegistrarInforme},configurable:true},
  openRowMenu:{get(){return openRowMenu},configurable:true},
  openSendReport:{get(){return openSendReport},configurable:true},
  openSubGestion:{get(){return openSubGestion},configurable:true},
  openTaskDetail:{get(){return openTaskDetail},configurable:true},
  openTaskEdit:{get(){return openTaskEdit},configurable:true},
  openTerrAsignModal:{get(){return openTerrAsignModal},configurable:true},
  openTerrCreate:{get(){return openTerrCreate},configurable:true},
  openTerrEdit:{get(){return openTerrEdit},configurable:true},
  openTerrHist:{get(){return openTerrHist},configurable:true},
  openTerrMaps:{get(){return openTerrMaps},configurable:true},
  openUserConfig:{get(){return openUserConfig},configurable:true},
  openUserModal:{get(){return openUserModal},configurable:true},
  pageButtons:{get(){return pageButtons},configurable:true},
  pageHead:{get(){return pageHead},configurable:true},
  pagerButtons:{get(){return pagerButtons},configurable:true},
  persistAll:{get(){return persistAll},configurable:true},
  pickAssignCat:{get(){return pickAssignCat},configurable:true},
  prioBadge:{get(){return prioBadge},configurable:true},
  profileToUser:{get(){return profileToUser},configurable:true},
  progNav:{get(){return progNav},configurable:true},
  progToday:{get(){return progToday},configurable:true},
  pubOptions:{get(){return pubOptions},configurable:true},
  pubPrivate:{get(){return pubPrivate},configurable:true},
  raContinue:{get(){return raContinue},configurable:true},
  readLocalSnapshot:{get(){return readLocalSnapshot},configurable:true},
  redact:{get(){return redact},configurable:true},
  refreshIfNeeded:{get(){return refreshIfNeeded},configurable:true},
  remindAllPending:{get(){return remindAllPending},configurable:true},
  remindInforme:{get(){return remindInforme},configurable:true},
  removeAuthOverlay:{get(){return removeAuthOverlay},configurable:true},
  renderActList:{get(){return renderActList},configurable:true},
  renderAsistCal:{get(){return renderAsistCal},configurable:true},
  renderConfig:{get(){return renderConfig},configurable:true},
  renderDbTable:{get(){return renderDbTable},configurable:true},
  renderDiscursos:{get(){return renderDiscursos},configurable:true},
  renderExhib:{get(){return renderExhib},configurable:true},
  renderGlobalSearch:{get(){return renderGlobalSearch},configurable:true},
  renderInfTable:{get(){return renderInfTable},configurable:true},
  renderNav:{get(){return renderNav},configurable:true},
  renderOpsDashboard:{get(){return renderOpsDashboard},configurable:true},
  renderProgCalendar:{get(){return renderProgCalendar},configurable:true},
  renderProgTab:{get(){return renderProgTab},configurable:true},
  renderPublisherHome:{get(){return renderPublisherHome},configurable:true},
  renderTerr:{get(){return renderTerr},configurable:true},
  renderTerrAsign:{get(){return renderTerrAsign},configurable:true},
  renderTerrCal:{get(){return renderTerrCal},configurable:true},
  renderTerrTable:{get(){return renderTerrTable},configurable:true},
  renderUsersTable:{get(){return renderUsersTable},configurable:true},
  reopenTask:{get(){return reopenTask},configurable:true},
  repPreview:{get(){return repPreview},configurable:true},
  requireCap:{get(){return requireCap},configurable:true},
  resetDemoData:{get(){return resetDemoData},configurable:true},
  resetInactivityTimer:{get(){return resetInactivityTimer},configurable:true},
  ringSVG:{get(){return ringSVG},configurable:true},
  roleBadge:{get(){return roleBadge},configurable:true},
  rtHandleMessage:{get(){return rtHandleMessage},configurable:true},
  rtJoinChannel:{get(){return rtJoinChannel},configurable:true},
  rtNextRef:{get(){return rtNextRef},configurable:true},
  rtProjectRef:{get(){return rtProjectRef},configurable:true},
  rtPullNow:{get(){return rtPullNow},configurable:true},
  rtScheduleReconnect:{get(){return rtScheduleReconnect},configurable:true},
  rtScheduleRemotePull:{get(){return rtScheduleRemotePull},configurable:true},
  rtSend:{get(){return rtSend},configurable:true},
  rtStateBadge:{get(){return rtStateBadge},configurable:true},
  runSbSync:{get(){return runSbSync},configurable:true},
  saveAnuncio:{get(){return saveAnuncio},configurable:true},
  saveAsignTerr:{get(){return saveAsignTerr},configurable:true},
  saveAssignment:{get(){return saveAssignment},configurable:true},
  saveAttReg:{get(){return saveAttReg},configurable:true},
  saveCambiarFechaDiscurso:{get(){return saveCambiarFechaDiscurso},configurable:true},
  saveCongConfig:{get(){return saveCongConfig},configurable:true},
  saveContact:{get(){return saveContact},configurable:true},
  saveDiscurso:{get(){return saveDiscurso},configurable:true},
  saveEvento:{get(){return saveEvento},configurable:true},
  saveExhibTurn:{get(){return saveExhibTurn},configurable:true},
  saveGrupo:{get(){return saveGrupo},configurable:true},
  saveIdioma:{get(){return saveIdioma},configurable:true},
  saveNewUser:{get(){return saveNewUser},configurable:true},
  saveNoPredica:{get(){return saveNoPredica},configurable:true},
  saveNotifPrefs:{get(){return saveNotifPrefs},configurable:true},
  savePublisher:{get(){return savePublisher},configurable:true},
  saveReassignPart:{get(){return saveReassignPart},configurable:true},
  saveReemplazarOrador:{get(){return saveReemplazarOrador},configurable:true},
  saveRegistrarInforme:{get(){return saveRegistrarInforme},configurable:true},
  saveSession:{get(){return saveSession},configurable:true},
  saveTaskEdit:{get(){return saveTaskEdit},configurable:true},
  saveTaskModal:{get(){return saveTaskModal},configurable:true},
  saveTerrAsign:{get(){return saveTerrAsign},configurable:true},
  saveTerrCreate:{get(){return saveTerrCreate},configurable:true},
  saveTerrEdit:{get(){return saveTerrEdit},configurable:true},
  saveUiState:{get(){return saveUiState},configurable:true},
  saveUserConfig:{get(){return saveUserConfig},configurable:true},
  saveWithFeedback:{get(){return saveWithFeedback},configurable:true},
  sbAuth:{get(){return sbAuth},configurable:true},
  sbFunc:{get(){return sbFunc},configurable:true},
  sbInList:{get(){return sbInList},configurable:true},
  sbRealtimeConnect:{get(){return sbRealtimeConnect},configurable:true},
  sbRealtimeDisconnect:{get(){return sbRealtimeDisconnect},configurable:true},
  sbRest:{get(){return sbRest},configurable:true},
  sbSyncNow:{get(){return sbSyncNow},configurable:true},
  sbUploadTerrImage:{get(){return sbUploadTerrImage},configurable:true},
  scheduleSbSync:{get(){return scheduleSbSync},configurable:true},
  scheduledMeetings:{get(){return scheduledMeetings},configurable:true},
  searchSelect:{get(){return searchSelect},configurable:true},
  selectedPrivs:{get(){return selectedPrivs},configurable:true},
  sendComm:{get(){return sendComm},configurable:true},
  sendReportMail:{get(){return sendReportMail},configurable:true},
  setActFilter:{get(){return setActFilter},configurable:true},
  setAsignConf:{get(){return setAsignConf},configurable:true},
  setConfigTab:{get(){return setConfigTab},configurable:true},
  setExhib:{get(){return setExhib},configurable:true},
  setInformeFilter:{get(){return setInformeFilter},configurable:true},
  setLegalTab:{get(){return setLegalTab},configurable:true},
  setProgTab:{get(){return setProgTab},configurable:true},
  setRtState:{get(){return setRtState},configurable:true},
  setSyncState:{get(){return setSyncState},configurable:true},
  setTerrResp:{get(){return setTerrResp},configurable:true},
  setTerrTab:{get(){return setTerrTab},configurable:true},
  setUserLevel:{get(){return setUserLevel},configurable:true},
  showDataLoading:{get(){return showDataLoading},configurable:true},
  showLogin:{get(){return showLogin},configurable:true},
  showPublisherMobileOnly:{get(){return showPublisherMobileOnly},configurable:true},
  signOut:{get(){return signOut},configurable:true},
  sortBy:{get(){return sortBy},configurable:true},
  sortHeader:{get(){return sortHeader},configurable:true},
  sortIco:{get(){return sortIco},configurable:true},
  ssEsc:{get(){return ssEsc},configurable:true},
  sselFilter:{get(){return sselFilter},configurable:true},
  sselPick:{get(){return sselPick},configurable:true},
  sselToggle:{get(){return sselToggle},configurable:true},
  sselValue:{get(){return sselValue},configurable:true},
  startApp:{get(){return startApp},configurable:true},
  statCard:{get(){return statCard},configurable:true},
  submitLogin:{get(){return submitLogin},configurable:true},
  swapModalContent:{get(){return swapModalContent},configurable:true},
  syncAccessRole:{get(){return syncAccessRole},configurable:true},
  syncPanelHTML:{get(){return syncPanelHTML},configurable:true},
  syncStatusHTML:{get(){return syncStatusHTML},configurable:true},
  tStat:{get(){return tStat},configurable:true},
  tablePreview:{get(){return tablePreview},configurable:true},
  terrCalNav:{get(){return terrCalNav},configurable:true},
  terrFiltered:{get(){return terrFiltered},configurable:true},
  terrGo:{get(){return terrGo},configurable:true},
  terrImgFieldHTML:{get(){return terrImgFieldHTML},configurable:true},
  terrImgPick:{get(){return terrImgPick},configurable:true},
  terrImgRemove:{get(){return terrImgRemove},configurable:true},
  terrMap:{get(){return terrMap},configurable:true},
  terrMiniMap:{get(){return terrMiniMap},configurable:true},
  terrSortBy:{get(){return terrSortBy},configurable:true},
  testSbConnection:{get(){return testSbConnection},configurable:true},
  th:{get(){return th},configurable:true},
  toast:{get(){return toast},configurable:true},
  toastAction:{get(){return toastAction},configurable:true},
  toggleAcc:{get(){return toggleAcc},configurable:true},
  toggleDemoPanel:{get(){return toggleDemoPanel},configurable:true},
  toggleNotif:{get(){return toggleNotif},configurable:true},
  togglePrivChip:{get(){return togglePrivChip},configurable:true},
  toggleProfile:{get(){return toggleProfile},configurable:true},
  toggleSel:{get(){return toggleSel},configurable:true},
  toggleSelAll:{get(){return toggleSelAll},configurable:true},
  toggleSidebar:{get(){return toggleSidebar},configurable:true},
  toggleTheme:{get(){return toggleTheme},configurable:true},
  toggleUserActive:{get(){return toggleUserActive},configurable:true},
  updateThemeToggle:{get(){return updateThemeToggle},configurable:true},
  userLevel:{get(){return userLevel},configurable:true},
  usersBackendReady:{get(){return usersBackendReady},configurable:true},
  vaciarExhibTurn:{get(){return vaciarExhibTurn},configurable:true},
  validateEmail:{get(){return validateEmail},configurable:true},
  validateMapsUrl:{get(){return validateMapsUrl},configurable:true},
  verOradorContacto:{get(){return verOradorContacto},configurable:true},
  APP_LANG:{get(){return APP_LANG},set(v){APP_LANG=v},configurable:true},
  CURRENT_USER:{get(){return CURRENT_USER},set(v){CURRENT_USER=v},configurable:true},
  USERS_CACHE:{get(){return USERS_CACHE},set(v){USERS_CACHE=v},configurable:true},
  __confirmCb:{get(){return __confirmCb},set(v){__confirmCb=v},configurable:true},
  __hydrating:{get(){return __hydrating},set(v){__hydrating=v},configurable:true},
  __inactTimer:{get(){return __inactTimer},set(v){__inactTimer=v},configurable:true},
  __modalReturnFocus:{get(){return __modalReturnFocus},set(v){__modalReturnFocus=v},configurable:true},
  __rtSocket:{get(){return __rtSocket},set(v){__rtSocket=v},configurable:true},
  __sbReady:{get(){return __sbReady},set(v){__sbReady=v},configurable:true},
  __sbTimer:{get(){return __sbTimer},set(v){__sbTimer=v},configurable:true},
  __syncState:{get(){return __syncState},set(v){__syncState=v},configurable:true},
  __uiSaveTimer:{get(){return __uiSaveTimer},set(v){__uiSaveTimer=v},configurable:true},
  actFilter:{get(){return actFilter},set(v){actFilter=v},configurable:true},
  asistCal:{get(){return asistCal},set(v){asistCal=v},configurable:true},
  asistFY:{get(){return asistFY},set(v){asistFY=v},configurable:true},
  asistVista:{get(){return asistVista},set(v){asistVista=v},configurable:true},
  configTab:{get(){return configTab},set(v){configTab=v},configurable:true},
  currentView:{get(){return currentView},set(v){currentView=v},configurable:true},
  dbState:{get(){return dbState},set(v){dbState=v},configurable:true},
  exhibSel:{get(){return exhibSel},set(v){exhibSel=v},configurable:true},
  infState:{get(){return infState},set(v){infState=v},configurable:true},
  informeFilter:{get(){return informeFilter},set(v){informeFilter=v},configurable:true},
  legalTab:{get(){return legalTab},set(v){legalTab=v},configurable:true},
  progCal:{get(){return progCal},set(v){progCal=v},configurable:true},
  terrAsignFilter:{get(){return terrAsignFilter},set(v){terrAsignFilter=v},configurable:true},
  terrEditImg:{get(){return terrEditImg},set(v){terrEditImg=v},configurable:true},
  terrState:{get(){return terrState},set(v){terrState=v},configurable:true},
  terrTab:{get(){return terrTab},set(v){terrTab=v},configurable:true}
})}catch(e){console.error('bridge',e)}


/* ============================================================
   EVENT DELEGATION (Fase 3) — reemplaza los handlers inline para CSP estricta.
   Uso en el HTML/templates:
     data-click="fnGlobal"                     -> window.fnGlobal.call(el)
     data-click="fn" data-click-args='["x",1]' -> window.fn.call(el, "x", 1)
   Tokens especiales en args: "$event" (el evento) y "$el" (el elemento).
   Soporta: click, change, input, dblclick, keydown, mouseover, mouseout, submit.
   ============================================================ */
function kbdActivate(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); this.click(); } }
function focusGlobalSearch(){ const s=document.getElementById('globalSearch'); if(s) s.focus(); }
(function(){
  const TYPES=['click','change','input','dblclick','keydown','mouseover','mouseout','submit'];
  function handle(e){
    const t=e.target; if(!t||!t.closest) return;
    const el=t.closest('[data-'+e.type+']');
    if(!el) return;
    if(el.hasAttribute('data-stop')) e.stopPropagation();
    const pre=el.getAttribute('data-preclose'); if(pre&&typeof window[pre]==='function') window[pre]();
    const fn=window[el.getAttribute('data-'+e.type)];
    if(typeof fn!=='function') return;
    let args=[]; const raw=el.getAttribute('data-'+e.type+'-args');
    if(raw){ try{ args=JSON.parse(raw).map(a=> a==='$event'?e : a==='$el'?el : a==='$val'?el.value : a==='$checked'?el.checked : a); }catch(_){} }
    return fn.apply(el,args);
  }
  TYPES.forEach(ty=>document.addEventListener(ty,handle,false));
})();
Object.assign(window,{kbdActivate,focusGlobalSearch});
function saveDelegated(){var fn=window[this.getAttribute("data-save")];var raw=this.getAttribute("data-save-args");var args=[];if(raw){try{args=JSON.parse(raw)}catch(_){}}if(typeof fn==="function")saveWithFeedback(this,function(){fn.apply(null,args)});}
Object.assign(window,{saveDelegated});
function hoverTintOn(){this.style.borderColor="var(--brand-300)";this.style.background="var(--brand-50)"}
function hoverTintOff(){this.style.borderColor="var(--border)";this.style.background="var(--surface)"}
Object.assign(window,{hoverTintOn,hoverTintOff});
function __absorb(){}
function applyFilter(){var el=this;var val=el.hasAttribute("data-fnum")?+el.value:(el.type==="checkbox"?el.checked:el.value);var st=el.getAttribute("data-fstate"),key=el.getAttribute("data-fkey");if(st){if(window[st]){window[st][key]=val;if(el.hasAttribute("data-fpage"))window[st].page=1;}}else if(key){window[key]=val;}var r=el.getAttribute("data-frender"),fn=window[r]||(window.VIEWS&&window.VIEWS[r]);if(typeof fn==="function")fn();}
function setStateVal(){var el=this;window[el.getAttribute("data-skey")]=el.getAttribute("data-sval");var r=el.getAttribute("data-srender"),fn=window[r]||(window.VIEWS&&window.VIEWS[r]);if(typeof fn==="function")fn();}
Object.assign(window,{__absorb,applyFilter,setStateVal});



