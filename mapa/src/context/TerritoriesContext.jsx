import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

export const TerritoriesContext = createContext();

// Cliente de Supabase (las variables vienen de .env vía Vite).
// persistSession + autoRefreshToken → la sesión sobrevive a recargas (reemplaza el modal de nombre).
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'msp_map_session' } }
);

const EMPTY_PERMS = {
  can_clear: false, can_download_report: false, can_delete_log: false,
  can_set_business: false, can_manage_permissions: false, isAdmin: false,
};

// ---- lógica de estado de manzana (reimplementa getBlockState del server) ----
// Devuelve 'none' | 'partial' | 'complete' considerando SOLO caras normales (no negocios).
function blockState(states, territoryId, block) {
  const n = block.puntos.length;
  let normalCount = 0, normalDone = 0;
  for (let i = 0; i < n; i++) {
    const fid = `${territoryId}_${block.id}_p${i}`;
    if (states[`type_${fid}`] === 'business') continue;
    normalCount++;
    if (states[fid] === 'completed') normalDone++;
  }
  if (normalCount === 0 || normalDone === 0) return 'none';
  if (normalDone === normalCount) return 'complete';
  return 'partial';
}

// Tipo de entrada de log según la transición de estado de la manzana.
function logTypeFor(prev, next) {
  if (prev === next) return null;
  if (next === 'complete' && prev === 'none') return 'completar_manzana';
  if (next === 'complete' && prev === 'partial') return 'terminar_parcial';
  if (next === 'partial' && prev === 'none') return 'parcial_manzana';
  return null; // desmarcar no genera log (igual que el server)
}

export const TerritoriesProvider = ({ children }) => {
  const [partStates, setPartStates] = useState({});
  const [territories, setTerritories] = useState([]);
  const [currentZoom, setCurrentZoom] = useState(16);
  const [mapBounds, setMapBounds] = useState(null);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [businessLayerActive, setBusinessLayerActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mapPermissions, setMapPermissions] = useState(EMPTY_PERMS);

  // refs con el estado más reciente (para calcular transiciones dentro de las acciones)
  const statesRef = useRef({});
  useEffect(() => { statesRef.current = partStates; }, [partStates]);
  const nameRef = useRef('');
  useEffect(() => { nameRef.current = userName; }, [userName]);

  // ============================================================
  // 1. AUTENTICACIÓN + PERMISOS (sesión de Supabase, sin modal de nombre)
  // ============================================================
  const applySession = useCallback(async (session) => {
    if (!session?.user) {
      setUserName(''); setUserId(null); setIsAuthenticated(false);
      setIsReadOnly(true); setMapPermissions(EMPTY_PERMS);
      return;
    }
    setUserId(session.user.id);
    setIsAuthenticated(true);
    setIsReadOnly(false);
    let profile = null;
    try {
      const { data } = await supabase.from('profiles')
        .select('full_name, access_level').eq('id', session.user.id).single();
      profile = data;
    } catch (_) { /* ignore */ }
    setUserName(profile?.full_name || session.user.email || 'Usuario');

    const isAdmin = (profile?.access_level ?? 99) <= 2;
    if (isAdmin) {
      setMapPermissions({
        can_clear: true, can_download_report: true, can_delete_log: true,
        can_set_business: true, can_manage_permissions: true, isAdmin: true,
      });
    } else {
      let perms = null;
      try {
        const { data } = await supabase.from('map_permissions')
          .select('*').eq('user_id', session.user.id).single();
        perms = data;
      } catch (_) { /* sin fila = sin permisos */ }
      setMapPermissions({
        can_clear: !!perms?.can_clear,
        can_download_report: !!perms?.can_download_report,
        can_delete_log: !!perms?.can_delete_log,
        can_set_business: !!perms?.can_set_business,
        can_manage_permissions: !!perms?.can_manage_permissions,
        isAdmin: false,
      });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => applySession(session));
    return () => subscription.unsubscribe();
  }, [applySession]);

  // ============================================================
  // 2. CARGA INICIAL (funciona con o sin login — lectura pública)
  // ============================================================
  useEffect(() => {
    (async function loadInitial() {
      try {
        const { data: geo, error: geoErr } = await supabase
          .from('territories_geojson').select('*').order('numero_territorio');
        if (geoErr) throw geoErr;
        setTerritories((geo || []).map(t => ({
          territorio_id: t.territorio_id, numero_territorio: t.numero_territorio,
          limites: t.limites, manzanas: t.manzanas,
        })));

        const { data: states } = await supabase.from('map_part_states').select('*');
        const obj = {};
        for (const r of (states || [])) {
          obj[r.id] = r.status;
          if (r.face_type && r.face_type !== 'normal') obj[`type_${r.id}`] = r.face_type;
        }
        const { data: bags } = await supabase.from('map_bag_positions').select('*');
        for (const r of (bags || [])) obj[`bag_pos_${r.territory_id}`] = r.position;
        setPartStates(obj);

        // Log solo para autenticados (contiene nombres)
        const { data: sess } = await supabase.auth.getSession();
        if (sess?.session) {
          const { data: log } = await supabase.from('map_activity_log')
            .select('*').order('created_at', { ascending: false }).limit(200);
          setActivityLog((log || []).map(e => ({
            type: e.type, userName: e.user_name, date: e.created_at,
            territoryNum: e.territory_num, blockNum: e.block_num,
          })).reverse());
        }
        setIsConnected(true);
      } catch (err) {
        console.error('Error cargando datos del mapa:', err);
        setIsConnected(false);
      }
    })();
  }, [isAuthenticated]);

  // ============================================================
  // 3. REALTIME (reemplaza socket.on)
  // ============================================================
  useEffect(() => {
    const channel = supabase.channel('map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_part_states' }, (p) => {
        if (p.eventType === 'DELETE') {
          setPartStates(prev => { const n = { ...prev }; delete n[p.old.id]; delete n[`type_${p.old.id}`]; return n; });
        } else {
          const r = p.new;
          setPartStates(prev => ({
            ...prev, [r.id]: r.status,
            ...(r.face_type && r.face_type !== 'normal' ? { [`type_${r.id}`]: r.face_type } : {}),
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_bag_positions' }, (p) => {
        const r = p.new; if (r) setPartStates(prev => ({ ...prev, [`bag_pos_${r.territory_id}`]: r.position }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'map_activity_log' }, (p) => {
        if (!isAuthenticated) return;
        const e = p.new;
        setActivityLog(prev => [...prev, {
          type: e.type, userName: e.user_name, date: e.created_at,
          territoryNum: e.territory_num, blockNum: e.block_num,
        }]);
      })
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  // ---- helper: insertar entrada de log si la manzana cambió de estado ----
  const logBlockTransition = useCallback(async (territory, block, prevBlockState) => {
    const next = blockState(statesRef.current, territory.territorio_id, block);
    const type = logTypeFor(prevBlockState, next);
    if (!type) return;
    try {
      await supabase.from('map_activity_log').insert({
        type, user_name: nameRef.current || 'Usuario',
        territory_num: territory.numero_territorio, block_num: block.numero,
      });
    } catch (e) { console.error('log error', e); }
  }, []);

  // ============================================================
  // 4. ACCIONES (reemplazan socket.emit) — todas verifican isReadOnly / permisos
  // ============================================================
  const togglePart = useCallback(async (territory, block, partIndex, currentStatus) => {
    if (isReadOnly) return;
    const id = `${territory.territorio_id}_${block.id}_p${partIndex}`;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const prevBlockState = blockState(statesRef.current, territory.territorio_id, block);
    setPartStates(prev => ({ ...prev, [id]: newStatus }));
    statesRef.current = { ...statesRef.current, [id]: newStatus };
    const { error } = await supabase.from('map_part_states').upsert({
      id, territory_id: territory.territorio_id, status: newStatus,
      face_type: statesRef.current[`type_${id}`] || 'normal',
      updated_at: new Date().toISOString(), updated_by: userId,
    });
    if (error) { console.error(error); setPartStates(prev => ({ ...prev, [id]: currentStatus })); return; }
    await logBlockTransition(territory, block, prevBlockState);
  }, [isReadOnly, userId, logBlockTransition]);

  // Marca/desmarca varias caras de una manzana de una vez (Marcar Normales / Negocios). Un solo log.
  const markBlockParts = useCallback(async (territory, block, indices, targetStatus) => {
    if (isReadOnly) return;
    const prevBlockState = blockState(statesRef.current, territory.territorio_id, block);
    const rows = indices.map(i => {
      const id = `${territory.territorio_id}_${block.id}_p${i}`;
      return { id, territory_id: territory.territorio_id, status: targetStatus,
               face_type: statesRef.current[`type_${id}`] || 'normal',
               updated_at: new Date().toISOString(), updated_by: userId };
    });
    setPartStates(prev => { const n = { ...prev }; rows.forEach(r => n[r.id] = r.status); return n; });
    statesRef.current = { ...statesRef.current }; rows.forEach(r => statesRef.current[r.id] = r.status);
    const { error } = await supabase.from('map_part_states').upsert(rows);
    if (error) { console.error(error); return; }
    await logBlockTransition(territory, block, prevBlockState);
  }, [isReadOnly, userId, logBlockTransition]);

  const toggleFaceType = useCallback(async (territory, block, partIndex, isBusiness) => {
    if (isReadOnly || !mapPermissions.can_set_business) return;
    const id = `${territory.territorio_id}_${block.id}_p${partIndex}`;
    const newType = isBusiness ? 'normal' : 'business';
    setPartStates(prev => ({ ...prev, [`type_${id}`]: newType }));
    statesRef.current = { ...statesRef.current, [`type_${id}`]: newType };
    const { error } = await supabase.from('map_part_states').upsert({
      id, territory_id: territory.territorio_id, status: statesRef.current[id] || 'pending',
      face_type: newType, updated_at: new Date().toISOString(), updated_by: userId,
    });
    if (error) { console.error(error); setPartStates(prev => ({ ...prev, [`type_${id}`]: isBusiness ? 'business' : 'normal' })); }
  }, [isReadOnly, mapPermissions.can_set_business, userId]);

  const updateBagPosition = useCallback(async (territoryId, position) => {
    if (isReadOnly) return;
    setPartStates(prev => ({ ...prev, [`bag_pos_${territoryId}`]: position }));
    const { error } = await supabase.from('map_bag_positions').upsert({ territory_id: territoryId, position });
    if (error) console.error(error);
  }, [isReadOnly]);

  const clearAll = useCallback(async () => {
    if (!mapPermissions.can_clear) { alert('No tienes permiso para limpiar territorios.'); return; }
    const { error } = await supabase.from('map_part_states').delete().neq('id', '');
    if (error) { console.error(error); return; }
    await supabase.from('map_activity_log').insert({ type: 'limpiar_todo', user_name: nameRef.current });
    // conservar posiciones de maletín y tipos de negocio; quitar estados de completado
    setPartStates(prev => {
      const n = {};
      for (const k in prev) { if (k.startsWith('bag_pos_') || k.startsWith('type_')) n[k] = prev[k]; }
      return n;
    });
  }, [mapPermissions.can_clear]);

  const deleteLogEntry = useCallback(async (dateStr) => {
    if (!mapPermissions.can_delete_log) return;
    const { error } = await supabase.from('map_activity_log').delete().eq('created_at', dateStr);
    if (error) { console.error(error); return; }
    setActivityLog(prev => prev.filter(e => e.date !== dateStr));
  }, [mapPermissions.can_delete_log]);

  return (
    <TerritoriesContext.Provider value={{
      supabase,
      partStates, setPartStates,
      territories, setTerritories,
      currentZoom, setCurrentZoom,
      mapBounds, setMapBounds,
      userName, setUserName, userId,
      activityLog, setActivityLog,
      isReadOnly, setIsReadOnly,
      isAuthenticated,
      mapPermissions,
      businessLayerActive, setBusinessLayerActive,
      isConnected,
      togglePart, markBlockParts, toggleFaceType, updateBagPosition, clearAll, deleteLogEntry,
    }}>
      {children}
    </TerritoriesContext.Provider>
  );
};
