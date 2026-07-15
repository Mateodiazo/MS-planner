/* MS Planner · js/dom.js — seguridad/UI: escapeHTML/esc, sanitizeURL, MAX_LENGTHS, overLimit.
   Script CLÁSICO (global) cargado antes del script principal (Fase 2 del refactor). */
/* --- Seguridad: escape de HTML para prevenir XSS almacenado ---
   Úsalo en TODO dato que venga del usuario o de Supabase (nombres, obs, dir,
   títulos, notas) antes de inyectarlo en innerHTML.  `esc` es el alias corto. */
function escapeHTML(str){if(str==null)return '';return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
const esc=escapeHTML;
/* Sanea una URL para bloquear javascript:/data: en href/src de datos */
function sanitizeURL(url){if(!url)return '';try{const p=new URL(url,location.origin);return ['http:','https:','mailto:','tel:'].includes(p.protocol)?p.href:''}catch(e){return ''}}
/* --- Seguridad: límites de longitud de entrada (evita payloads gigantes) --- */
const MAX_LENGTHS={nombre:50,apellidos:50,email:100,tel:20,dir:200,obs:500,anuncio_titulo:100,anuncio_desc:1000,evento_nombre:100,evento_detalle:200,tarea_titulo:100,tarea_desc:500,terr_num:10,terr_barrio:80,terr_localidad:80};
/* overLimit({clave:[valor,'Etiqueta'], …}) → true (y avisa) si algún campo excede su tope. */
function overLimit(fields){for(const k in fields){const v=fields[k][0],label=fields[k][1],max=MAX_LENGTHS[k];if(max&&v&&String(v).length>max){toast(`${label} no puede superar ${max} caracteres`);return true}}return false}
