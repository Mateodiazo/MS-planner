/* MS Planner · js/constants.js — constantes de datos (nombres, grupos, roles,
   barrios…) + helpers puros (fechas, avatar, TODAY/DEMO_DATE). Script CLÁSICO. */
const NOMBRES_H=['Juan','Carlos','Andrés','David','Daniel','Felipe','Sebastián','Nicolás','Miguel','Alejandro','Santiago','Mateo','Camilo','Esteban','Diego','Julián','Fabián','Óscar','Javier','Cristian','Hernán','Mauricio','Édgar','Wilson','Gustavo','Ricardo','Fernando','Jorge','Álvaro','Germán'];
const NOMBRES_M=['María','Ana','Luz','Marcela','Diana','Paola','Andrea','Carolina','Sandra','Catalina','Daniela','Valentina','Camila','Laura','Juliana','Natalia','Ángela','Patricia','Adriana','Claudia','Yolanda','Mónica','Liliana','Constanza','Esperanza'];
const APELLIDOS=['Pérez','Rodríguez','Gómez','Martínez','Herrera','Castro','Rojas','Ramírez','Torres','Vargas','González','López','García','Sánchez','Díaz','Moreno','Muñoz','Romero','Suárez','Gutiérrez','Jiménez','Hernández','Ruiz','Álvarez','Castillo','Ortiz','Acosta','Cárdenas','Mendoza','Quintero','Beltrán','Cortés','Guerrero','Salazar','Pinzón'];
const GRUPOS=['Grupo 1','Grupo 2','Grupo 3','Grupo 4','Grupo 5','Grupo 6'];
const REAL_GROUPS=[
  {n:'Grupo 1',sup:'Paublo Díaz',aux:'Hugo Molano',m:['Aidee Morales','Alicia Ángel','Ana Luz Montiel','Andrés Esteban Mora','Blanca Frontado','Carolina Montalvo','David Raigosa','Diana Carolina Martínez','Diana Molano','Elías González','Gabriela Díaz','Gloria Carrillo','Hugo Molano','Laura Díaz','Mabel Ortega','Miriam Velandia','Narda Carvajal','Nelly Mora','Paublo Díaz','Saúl Capera']},
  {n:'Grupo 2',sup:'Cristian Vaca',aux:'Juan David Ríos',m:['Adriana Milena Altamiranda','Alba Lucero Guarnizo','Alfonso Manosalva','Andrea Martínez','Blanca Garavito','Carlos Jiménez','Cristian Vaca','Eliana Vaca','Elizabeth Jara','Jaqueline Jara','Jazmín Rojas','Jhon Freddy Rendón Gallego','Jorge Martínez','Juan David Ríos','Juana González','Luis Manuel Furnieles','Manuel Quintero','Nidia Guarnizo','Rocío Jara','Serafín Mateus']},
  {n:'Grupo 3',sup:'Geovanny Sánchez',aux:'Arfaxad Aguiar',m:['Alejandro Castro','Amparo Merchán','Ana Cecilia Lamón','Angelina González','Arfaxad Aguiar','Daniel González','Elizabeth Mateus','Elvia Bernal','Erika Sánchez','Félix Bonacho','Geovanny Sánchez','Gratiniano Prieto','Irene González','Matías Mora','Nubelly Mora','Paula Manosalva','Ricardo Mora','Samuel Aguiar','Sara Cañón','Steven Moreno','Thomás González']},
  {n:'Grupo 4',sup:'Camilo Ortiz',aux:'Alexis Quintero',m:['Adriana Rodríguez','Alexis Quintero','Andrés Mateo Díaz','Angie Guzmán','Camilo Ortiz','Carlos Guzmán','Dahian Sofía Guzmán','Danna Córdoba','Diana Ortiz','Diannys Quintero','Isabel Mongua','Jairo Córdoba','Johana Heredia','Libia Rodríguez','María Isabel Bastos Rojas','María Leyla Cruz','Pilar Farfán','Rauberto Rodríguez','Rosario Córdoba','Tatiana Guzmán','Yamilet Quintero']},
  {n:'Grupo 5',sup:'Didier Flórez',aux:'Nel Soto',m:['Ana Mercedes Castro','Ana Dolores Pinilla','Andrés Peña','Ángela Castro','Beatriz Rincón','Didier Flórez','Dídimo Quintero','Dolly Rincón','Elsa Cabuya','Gloria Martínez','Jhon Rincón','Juan Carlos Manosalva','Ladith Flórez','Lady Daniela Vidal Herrera','María Inés Cerón','Nancy Parra','Nel Soto','Reinaldo Rippe','Rita Quintero','Samanta Reyes','Stiven Rippe']},
  {n:'Grupo 6',sup:'José Manuel Rodríguez',aux:'Orlando Manosalva',m:['Alcira Quintero','Angie Montenegro','Astrid Carolina Sánchez','César Rodríguez','Daniel Cubillos','Diana Georgina Zuluaga','Érica Milena Ruiz','Gerardo Suárez','Graciela Montenegro','Gustavo Montenegro','Johan Tavera','Jonathan David Sánchez','José Manuel Rodríguez','Judith González','Lorena Muñoz','Lorena Ríos','Orlando Manosalva','Pilar Fandiño','Pilar González','Rosaura Miranda','Samuel Rodríguez','Viviana Ríos','Yraida Alarcón','Yamile Rueda']},
];
const MALE_NAMES=new Set(['Andrés Esteban Mora','David Raigosa','Elías González','Hugo Molano','Paublo Díaz','Saúl Capera','Alfonso Manosalva','Carlos Jiménez','Cristian Vaca','Jhon Freddy Rendón Gallego','Jorge Martínez','Juan David Ríos','Luis Manuel Furnieles','Manuel Quintero','Serafín Mateus','Alejandro Castro','Arfaxad Aguiar','Daniel González','Félix Bonacho','Geovanny Sánchez','Gratiniano Prieto','Matías Mora','Ricardo Mora','Samuel Aguiar','Steven Moreno','Thomás González','Alexis Quintero','Andrés Mateo Díaz','Camilo Ortiz','Carlos Guzmán','Jairo Córdoba','Rauberto Rodríguez','Andrés Peña','Didier Flórez','Dídimo Quintero','Jhon Rincón','Juan Carlos Manosalva','Nel Soto','Reinaldo Rippe','Stiven Rippe','César Rodríguez','Daniel Cubillos','Gerardo Suárez','Gustavo Montenegro','Johan Tavera','Jonathan David Sánchez','José Manuel Rodríguez','Orlando Manosalva','Samuel Rodríguez']);
const ROLES=['Anciano','Siervo Ministerial','Precursor Regular','Precursor Auxiliar','Publicador','Publicador no bautizado'];
const PRIVILEGIOS=['Publicador','Publicador no bautizado','Precursor Auxiliar','Precursor Regular','Siervo Ministerial','Anciano'];
const ACCESS_ROLES=['Nivel 1 – Super Administrador','Nivel 2 – Administrador de Congregación','Nivel 3 – Administrador de Asignaciones','Nivel 4 – Publicador'];
const PRIV_RANK={'Anciano':6,'Siervo Ministerial':5,'Precursor Regular':4,'Precursor Auxiliar':3,'Publicador':2,'Publicador no bautizado':1};
function primaryPriv(list){if(!list||!list.length)return 'Publicador';return list.slice().sort((a,b)=>(PRIV_RANK[b]||0)-(PRIV_RANK[a]||0))[0];}
function defaultAccessRole(list){if(!list)return 'Nivel 4 – Publicador';if(list.indexOf('Anciano')>=0)return 'Nivel 2 – Administrador de Congregación';if(list.indexOf('Siervo Ministerial')>=0)return 'Nivel 3 – Administrador de Asignaciones';return 'Nivel 4 – Publicador';}
const DISCURSOS=['¿Cómo afrontar la ansiedad?','La esperanza del Reino','El valor de la familia','La verdadera adoración','La sabiduría que viene de Dios','Confianza en tiempos difíciles','El amor que nunca falla','Vivir con propósito'];
const AV_COLORS=['#5B21B6','#8B5CF6','#3B82F6','#06b6d4','#22C55E','#F59E0B','#ec4899','#4F46E5','#15803d'];
function avColor(n){let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%AV_COLORS.length;return AV_COLORS[h]}
function initials(n){const p=n.trim().split(/\s+/);return ((p[0]?.[0]||'')+(p[1]?.[0]||'')).toUpperCase()}
function dstr(d){return d.toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}
function dlong(d){return d.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'})}
function dshort(d){return d.toLocaleDateString('es-CO',{day:'2-digit',month:'short'})}
function diso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
/* DEMO_DATE: los datos sembrados están anclados a junio 2026. Deja `true` para
   la demostración; ponlo en `false` en producción para usar la fecha real. */
const DEMO_DATE=true;
const TODAY=DEMO_DATE?new Date(2026,5,29):new Date();
function daysAgo(n){const d=new Date(TODAY);d.setDate(d.getDate()-n);return d}
function daysFwd(n){const d=new Date(TODAY);d.setDate(d.getDate()+n);return d}

const BARRIOS_BOG={
  'Chapinero':['Chicó','El Nogal','Quinta Camacho','Chapinero Alto','Lago Gaitán'],'Usaquén':['Cedritos','Santa Bárbara','Country Club','Usaquén Centro','La Carolina'],
  'Suba':['Niza','Niza Norte','La Campiña','Suba Centro','El Rincón','Lombardía','Almendros','Tibabuyes'],'Engativá':['Normandía','La Florida','Boyacá Real','Las Ferias','El Encanto'],
  'Kennedy':['Castilla','Timiza','Patio Bonito','Class','Kennedy Central'],'Fontibón':['Modelia','Hayuelos','Fontibón Centro','Versalles'],'Bosa':['Bosa Centro','El Recreo','La Libertad','San Bernardino'],
  'Teusaquillo':['La Soledad','Palermo','Galerías','Quesada'],'Barrios Unidos':['Doce de Octubre','La Castellana','Polo Club','San Fernando'],'Puente Aranda':['Ciudad Montes','El Remanso','San Rafael','Pensilvania'],
  'Ciudad Bolívar':['El Lucero','Meissen','San Francisco','Candelaria La Nueva'],'San Cristóbal':['La Victoria','Veinte de Julio','San Blas','La Gloria'],'Antonio Nariño':['Restrepo','Ciudad Jardín','La Fragua'],
  'Rafael Uribe':['Quiroga','Olaya','El Claret','San José'],'Tunjuelito':['Venecia','Tunjuelito Centro','El Carmen'],
};
const LOCALIDADES=Object.keys(BARRIOS_BOG);
const VIAS=['Calle','Carrera','Avenida','Transversal','Diagonal'];
function dirBogota(){return `${pick(VIAS)} ${rint(100,160)} #${rint(90,130)}-${String(rint(1,99)).padStart(2,'0')}`}

/* --- puente a window (Fase b.1): expone símbolos como globales para
   compatibilidad con onclick inline y referencias entre módulos.
   getter=valor vivo; setter=permite `x=...` desde handlers inline. --- */
try{Object.defineProperties(window,{
  ACCESS_ROLES:{get(){return ACCESS_ROLES},configurable:true},
  APELLIDOS:{get(){return APELLIDOS},configurable:true},
  AV_COLORS:{get(){return AV_COLORS},configurable:true},
  BARRIOS_BOG:{get(){return BARRIOS_BOG},configurable:true},
  DEMO_DATE:{get(){return DEMO_DATE},configurable:true},
  DISCURSOS:{get(){return DISCURSOS},configurable:true},
  GRUPOS:{get(){return GRUPOS},configurable:true},
  LOCALIDADES:{get(){return LOCALIDADES},configurable:true},
  MALE_NAMES:{get(){return MALE_NAMES},configurable:true},
  NOMBRES_H:{get(){return NOMBRES_H},configurable:true},
  NOMBRES_M:{get(){return NOMBRES_M},configurable:true},
  PRIVILEGIOS:{get(){return PRIVILEGIOS},configurable:true},
  PRIV_RANK:{get(){return PRIV_RANK},configurable:true},
  REAL_GROUPS:{get(){return REAL_GROUPS},configurable:true},
  ROLES:{get(){return ROLES},configurable:true},
  TODAY:{get(){return TODAY},configurable:true},
  VIAS:{get(){return VIAS},configurable:true},
  avColor:{get(){return avColor},configurable:true},
  daysAgo:{get(){return daysAgo},configurable:true},
  daysFwd:{get(){return daysFwd},configurable:true},
  defaultAccessRole:{get(){return defaultAccessRole},configurable:true},
  dirBogota:{get(){return dirBogota},configurable:true},
  diso:{get(){return diso},configurable:true},
  dlong:{get(){return dlong},configurable:true},
  dshort:{get(){return dshort},configurable:true},
  dstr:{get(){return dstr},configurable:true},
  initials:{get(){return initials},configurable:true},
  primaryPriv:{get(){return primaryPriv},configurable:true}
})}catch(e){console.error('bridge',e)}
export {ACCESS_ROLES, APELLIDOS, AV_COLORS, BARRIOS_BOG, DEMO_DATE, DISCURSOS, GRUPOS, LOCALIDADES, MALE_NAMES, NOMBRES_H, NOMBRES_M, PRIVILEGIOS, PRIV_RANK, REAL_GROUPS, ROLES, TODAY, VIAS, avColor, daysAgo, daysFwd, defaultAccessRole, dirBogota, diso, dlong, dshort, dstr, initials, primaryPriv};
