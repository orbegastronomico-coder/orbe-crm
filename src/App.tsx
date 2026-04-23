/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Users, LayoutDashboard, Database, PlusCircle, Plus,
  Search, AlertCircle, CheckCircle, CheckCircle2, Calendar, 
  UserCircle, Mail, Phone, MapPin, ChevronRight, PhoneCall,
  Filter, MoreHorizontal, LogOut, Briefcase, Clock, CheckSquare,
  Settings, Save, XCircle, History, ArrowLeft,
  Mic, MicOff, Leaf, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- CONFIGURACIÓN DE CONEXIÓN DE EMERGENCIA ---
const SUPABASE_URL = 'https://eslddxxgogrbffpwqev.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbGRkeHhnb2dyYnJmZnB3cWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzA1NjcsImV4cCI6MjA5MjM0NjU2N30.BLDkVJmxUtMpBkPe5ZTflH1yqAEMBLNUn5v08Jr4rls';

const config = { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, isValid: true };
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS = ['All', 'Juanjo', 'Alejandro'] as const;
type User = typeof USERS[number];

const PRIORITIES = {
  'High': 1,
  'Medium': 7,
  'Low': 15,
  'Contact in 1 month': 30,
  'Postpone': 60
} as const;

const PREDEFINED_ACTIONS = [
  'Send email with catalogue',
  'Call',
  'Visit',
  'Meeting',
  'Drop samples'
] as const;

const PIPELINE_STATUSES = [
  '1st contact',
  'Baking off',
  'Grajales',
  'Client',
  'Not interested'
] as const;

type PipelineStatus = typeof PIPELINE_STATUSES[number];
type Priority = keyof typeof PRIORITIES;
type PredefinedAction = typeof PREDEFINED_ACTIONS[number];

interface Client {
  id: string | number;
  company: string;
  contact_person: string;
  lead_name: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  website?: string;
  status_possible?: string;
  sector?: string;
  location?: string;
  city?: string;
  postal_code?: string;
  description?: string;
  status?: string;
  created_at?: string;
}

interface PipelineItem {
  id: string | number;
  client_id: string | number;
  company?: string; // Joined field
  owner: User;
  status: PipelineStatus;
  last_contact_date: string;
  samples: string;
  last_action: string;
  priority: Priority;
  action_date: string;
  action_status: 'Pending' | 'Done' | string;
  created_at?: string;
}

interface HistoryEntry {
  id: string | number;
  client_id: string | number;
  type: 'status_change' | 'note' | 'system' | 'priority_change';
  content: string;
  created_at: string;
  created_by: string;
}

const MOCK_CLIENTS: Client[] = [
  { id: 1, company: 'Tech Solutions SL', contact_person: 'Ana García', lead_name: 'Lead Orbe A', email: 'ana@tech.com', phone: '600111222', mobile: '699000111', address: 'Calle Falsa 123' },
  { id: 2, company: 'Construcciones Orbe', contact_person: 'Luis Perez', lead_name: 'Lead Orbe B', email: 'luis@orbe.es', phone: '655333444', mobile: '688222333', address: 'Av. Principal 45' },
  { id: 3, company: 'Digital Marketing Inc', contact_person: 'Elena Rius', lead_name: 'Lead Orbe C', email: 'elena@dm.com', phone: '677888999', mobile: '611444555', address: 'Business Park B' }
];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [view, setView] = useState<'pipeline' | 'new' | 'database' | 'control'>('pipeline');
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('orbe_user');
    return (saved && USERS.includes(saved as User)) ? (saved as User) : USERS[0];
  });

  useEffect(() => {
    if (!supabase) return;

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });
      if (error) throw error;
    } catch (err: any) {
      setLoginError(err.message || 'Error occurred during login');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };
  const [clients, setClients] = useState<Client[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);
  const [showConfigWizard, setShowConfigWizard] = useState(false);
  const [wizardConfig, setWizardConfig] = useState({ url: config.url, key: config.key });
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Potencial' | 'Client' | 'Fail'>('Potencial');
  const [taskToAccomplish, setTaskToAccomplish] = useState<PipelineItem | null>(null);
  const [postponeItem, setPostponeItem] = useState<PipelineItem | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [isConfirmingPostpone, setIsConfirmingPostpone] = useState(false);
  const [pipelineColumns, setPipelineColumns] = useState<string[]>([]);

  // Wizard estados para asignación
  const [assigningClient, setAssigningClient] = useState<Client | null>(null);
  const [assigningOwner, setAssigningOwner] = useState<'Alejandro' | 'Juanjo' | ''>('');
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);

  // Estados para el formulario de nuevo cliente (controlados para IA)
  const [newClientForm, setNewClientForm] = useState({
    company: '',
    contact_name: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    description: ''
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const assignedClientIds = useMemo(() => {
    return new Set(pipeline.map(p => String(p.client_id)));
  }, [pipeline]);

  useEffect(() => {
    localStorage.setItem('orbe_user', currentUser);
    fetchClients();
  }, [currentUser]);

  useEffect(() => {
    if (selectedClientForHistory) {
      fetchClientHistory(selectedClientForHistory.id);
    } else {
      setClientHistory([]);
    }
  }, [selectedClientForHistory]);

  const fetchClients = async () => {
    setLoading(true);
    // Limpiar formulario al cambiar de vista si es necesario, 
    // pero aquí lo usamos para asegurar que el estado inicial es limpio
    if (view === 'database') {
      setNewClientForm({
        company: '',
        contact_name: '',
        email: '',
        phone: '',
        mobile: '',
        address: '',
        description: ''
      });
    }
    
    if (!supabase) {
      setClients(MOCK_CLIENTS);
      setPipeline([]);
      setLoading(false);
      return;
    }

    try {
      // 1. Cargar Clientes Maestros
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');
      
      if (clientsError) throw clientsError;

      // 2. Cargar Items del Pipeline
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipeline')
        .select('*');
      
      // LOG DE DIAGNÓSTICO: Ver las columnas reales de la tabla
      if (pipelineData && pipelineData.length > 0) {
        const keys = Object.keys(pipelineData[0]);
        setPipelineColumns(keys);
        console.log("ESQUEMA DETECTADO:", keys);
        
        if (!localStorage.getItem('debug_columns_shown')) {
          console.log("Columnas en Pipeline:", keys.join(", "));
          localStorage.setItem('debug_columns_shown', 'true');
        }
      }

      // Permitir que la tabla pipeline no exista todavía sin romper la app, pero avisar
      if (pipelineError && !pipelineError.message.includes('relation "pipeline" does not exist')) {
        throw pipelineError;
      }

      setDbError(null);

      // Sanear Clientes
      const sanitizedClients = (clientsData || []).map((c: any) => ({
        id: c.id || c.ID || c.n || c.N,
        company: c.company || c.Company || c.Empresa || c.empresa || 'Empresa sin nombre',
        contact_person: c.contact_person || c.contact_name || c['Contact name'] || c['Contact Name'] || c.persona_contacto || c['Nombre del Contacto'] || c['Persona de contacto'] || '',
        lead_name: c.lead_name || c.lead || c.Lead || c.Referencia || c['Lead Name'] || '',
        email: c.email || c.Email || c['Correo Electrónico'] || c['Correo electrónico'] || c.correo || '',
        phone: c.phone || c['Teléfono'] || c.telefono || '',
        mobile: c.mobile || c['Móvil'] || c.movil || '',
        address: c.address || c['Dirección'] || c.direccion || c.Adress || '',
        website: c.website || c['Sitio web'] || c['Sitio Web'] || '',
        status_possible: c.status_possible || c['Estado de Posible cliente'] || '',
        sector: c.sector || c.Sector || '',
        location: c.location || c.Location || '',
        city: c.city || c.Ciudad || '',
        postal_code: c.postal_code || c['Código postal'] || '',
        description: c.description || c.desc || c.Descripción || c.Descripcion || '',
        status: c.status || c.Estado || c.estado || 'Potencial',
        created_at: c.created_at
      }));

      // Sanear Pipeline y vincular con compañía
      const sanitizedPipeline = (pipelineData || []).map((p: any) => {
        const cId = p.client_id || p.id_cliente || p.ID_CLIENTE || p.cliente_id;
        const relatedClient = sanitizedClients.find(c => String(c.id) === String(cId));
        const dbOwner = p.owner || p.Owner || p.assigned_to || p.assigned_to_user || p.operador || p.dueño;
        const dbPriority = p.priority || p.Priority || p.prioridad || 'Medium';
        const dbStatus = p.status || p.Status || p.estado || 'Pending';

        // Función interna para validar si una cadena es una fecha ISO válida
        const isValidDate = (str: any) => {
          if (!str || typeof str !== 'string') return false;
          const d = new Date(str);
          return !isNaN(d.getTime());
        };

        // Identificar fechas con múltiples fallbacks y validación estricta
        let lastContact = p.last_contact_date || p['last contact date'] || p.last_contact || p.fecha_contacto || p.updated_at || p.created_at;
        if (!isValidDate(lastContact)) lastContact = new Date().toISOString();

        let actionDateVal = p['actions date'] || p['action date'] || p.action_date || p.fecha_accion || p.next_step;
        if (!isValidDate(actionDateVal)) actionDateVal = calculateActionDate(dbPriority as Priority);

        const dbActionStatus = p.action_status || p['action status'] || p['Action Status'] || p['Action status'] || p.estado_accion || 'Pending';

        return {
          id: p.id,
          client_id: cId,
          company: relatedClient?.company || 'Cliente Desconocido',
          owner: dbOwner || currentUser,
          status: dbStatus,
          last_contact_date: lastContact,
          samples: p.samples || p.Samples || p.muestras || '-',
          last_action: p.last_action || p.LastAction || p.accion || 'Seguimiento iniciado',
          priority: dbPriority as Priority,
          action_date: actionDateVal,
          action_status: dbActionStatus,
          created_at: p.created_at
        };
      });
      
      // Ordenar pipeline por fecha de acción
      sanitizedPipeline.sort((a, b) => {
        const dateA = new Date(a.action_date).getTime();
        const dateB = new Date(b.action_date).getTime();
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateA - dateB;
      });

      setClients(sanitizedClients);
      setPipeline(sanitizedPipeline);

    } catch (err: any) {
      console.error("Error fetching data:", err);
      if (err.message === 'Failed to fetch') {
        setDbError("Error de Red / Bloqueo Browser.");
      } else {
        setDbError(err.message || "Error al conectar.");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateActionDate = (priority: Priority) => {
    const days = PRIORITIES[priority] || 0;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  const formatDateSafe = (dateStr: string | undefined | null, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: '2-digit' }, fallback = '-') => {
    if (!dateStr) return fallback;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    try {
      return d.toLocaleDateString('en-GB', options);
    } catch {
      return fallback;
    }
  };

  const formatDateTimeSafe = (dateStr: string | undefined | null, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }, fallback = '-') => {
    if (!dateStr) return fallback;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    try {
      return d.toLocaleString('en-GB', options);
    } catch {
      return fallback;
    }
  };

  const toISODateOnly = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const isOverdue = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return target < today;
  };

  const getStatusBadge = (date: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return <span className="text-[10px] text-gray-300 italic">No date</span>;
    
    const overdue = isOverdue(date);
    
    return overdue ? (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black bg-white text-[#FF0000] border border-[#FF0000]/20 shadow-sm">
        🔴 OVERDUE
      </span>
    ) : (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black bg-green-50 text-green-600 border border-green-200">
        🟢 ON TIME
      </span>
    );
  };

  const fetchClientHistory = async (clientId: string | number) => {
    setLoadingHistory(true);
    if (!supabase) {
      setClientHistory([
        { id: 1, client_id: clientId, type: 'system', content: 'Cliente creado en el sistema', created_at: new Date().toISOString(), created_by: 'System' },
        { id: 2, client_id: clientId, type: 'note', content: 'Primera toma de contacto positiva.', created_at: new Date().toISOString(), created_by: 'Alejandro' }
      ]);
      setLoadingHistory(false);
      return;
    }

    try {
      // Función auxiliar para intentar buscar por varias columnas posibles
      const fetchRobust = async (table: string, id: string | number) => {
        const columns = ['client_id', 'id_cliente', 'cliente_id', 'ID_CLIENTE'];
        for (const col of columns) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .eq(col, id);
            
            // Si funciona y no hay error de columna inexistente, devolvemos los datos
            if (!error) return data || [];
            // Si el error no es de "columna no existe", lanzamos el error
            if (!error.message.includes('column') || !error.message.includes('not exist')) {
               console.warn(`Error en tabla ${table} columna ${col}:`, error.message);
            }
          } catch (e) {
            continue;
          }
        }
        return [];
      };

      // 2. Cargar hitos de la tabla pipeline
      const pipeData = await fetchRobust('pipeline', clientId);

      // Convertir registros de pipeline a formato de historial
      const pipelineHistory: HistoryEntry[] = (pipeData || []).map(p => {
        const cId = p.client_id || p.id_cliente || p.cliente_id || p.ID_CLIENTE || clientId;
        // Priorizar la fecha de la acción (field: action_date, actions date, fecha_accion) para el historial
        // Buscamos de forma insensible a mayúsculas/minúsculas y espacios
        const actionDateVal = p.action_date || p['actions date'] || p['Actions Date'] || p.fecha_accion || p.fecha_seguimiento;
        const logicalDate = actionDateVal || p.created_at || p.updated_at || new Date().toISOString();
        
        return {
          id: `pipe-${p.id}`,
          client_id: cId,
          type: 'system',
          content: `Acción: [${p.status || 'Pending'}] ${p.last_action || 'Sin nota'}`,
          created_at: logicalDate,
          created_by: p.owner || 'Sistema'
        };
      });

      // Ordenar por fecha descendente
      const unifiedHistory = pipelineHistory.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setClientHistory(unifiedHistory);
    } catch (err) {
      console.error("Error crítico recuperando historial:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const addHistoryEntry = async (clientId: string | number, type: HistoryEntry['type'], content: string) => {
    const entry = {
      client_id: clientId,
      type,
      content,
      created_at: new Date().toISOString(),
      created_by: currentUser
    };

    // Siempre actualizamos localmente para feedback inmediato
    setClientHistory(prev => [ { id: Math.random(), ...entry } as HistoryEntry, ...prev]);

    if (!supabase) return;

    // Nota: Hemos desactivado la inserción en 'client_history' porque 
    // ahora el historial se reconstruye dinámicamente desde la tabla 'pipeline'.
    // Esto evita el error PGRST205.
  };

  const handleUpdateClient = async (id: string | number, updates: Partial<Client>) => {
    if (!supabase) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      return;
    }

    try {
      const { error } = await supabase.from('clients').update(updates).eq('id', id);
      if (error) throw error;
      fetchClients();
    } catch (err) {
      console.error("Error updating client:", err);
    }
  };

  const handleUpdatePipeline = async (id: string | number, updates: Partial<PipelineItem>) => {
    const existingItem = pipeline.find(p => p.id === id);
    
    if (updates.status && existingItem && updates.status !== existingItem.status) {
      addHistoryEntry(existingItem.client_id, 'status_change', `Estado de seguimiento cambiado de ${existingItem.status} a ${updates.status}`);
    }
    if (updates.priority && existingItem && updates.priority !== existingItem.priority) {
      addHistoryEntry(existingItem.client_id, 'priority_change', `Prioridad de seguimiento cambiada de ${existingItem.priority} a ${updates.priority}`);
    }

    if (updates.priority || updates.last_contact_date) {
      const priority = updates.priority || existingItem?.priority || 'Medium';
      const baseDate = updates.last_contact_date ? new Date(updates.last_contact_date) : (existingItem?.last_contact_date ? new Date(existingItem.last_contact_date) : new Date());
      
      const days = PRIORITIES[priority] || 7;
      baseDate.setDate(baseDate.getDate() + days);
      updates.action_date = baseDate.toISOString();
    }

    if (!supabase) {
      setPipeline(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      return;
    }

    try {
      const { error } = await supabase.from('pipeline').update(updates).eq('id', id);
      if (error) throw error;
      fetchClients();
    } catch (err) {
      console.error("Error updating pipeline:", err);
    }
  };

  const handlePostponeTask = async (item: PipelineItem, newDate: string) => {
    if (!supabase) {
      const entryId = Date.now();
      setPipeline(prev => [...prev, { 
        ...item, 
        id: entryId, 
        action_date: newDate,
        created_at: new Date().toISOString()
      }]);
      setPostponeItem(null);
      setPostponeDate('');
      setIsConfirmingPostpone(false);
      return;
    }

    // Mapping columns
    let cols = pipelineColumns;
    if (cols.length === 0) {
      const { data } = await supabase.from('pipeline').select('*').limit(1);
      if (data && data[0]) cols = Object.keys(data[0]);
    }

    const payload: any = {};
    const setMapping = (candidates: string[], value: any) => {
      const col = candidates.find(c => cols.includes(c));
      if (col) payload[col] = value;
      else if (cols.length === 0) payload[candidates[0]] = value;
    };

    // Clonamos datos del item original
    setMapping(['client_id', 'id_cliente', 'cliente_id', 'ID_CLIENTE'], item.client_id);
    setMapping(['owner', 'operador', 'assigned_to'], (item.owner && item.owner !== 'All') ? item.owner : (currentUser === 'All' ? 'Juanjo' : currentUser));
    setMapping(['status', 'estado', 'Status'], item.status);
    setMapping(['last_action', 'accion', 'LastAction'], item.last_action);
    setMapping(['priority', 'prioridad', 'Priority'], item.priority);
    setMapping(['samples', 'muestras', 'Samples'], item.samples);
    setMapping(['last_contact_date', 'fecha_contacto', 'last_contact'], item.last_contact_date);
    setMapping(['company', 'Empresa'], item.company || 'Cliente');

    // Datos específicos de la posposición
    setMapping(['actions date', 'action_date', 'fecha_accion'], newDate);
    setMapping(['action status'], 'Postpone');

    try {
      const { error } = await supabase.from('pipeline').insert([payload]);
      if (error) throw error;
      
      addHistoryEntry(item.client_id, 'note', `Acción pospuesta hasta el ${formatDateSafe(newDate)}`);
      setPostponeItem(null);
      setPostponeDate('');
      setIsConfirmingPostpone(false);
      fetchClients();
    } catch (err: any) {
      console.error("Error al posponer:", err);
      alert(`Error al posponer: ${err.message}`);
    }
  };

  const handleAccomplishTask = async (prevItem: PipelineItem, nextAction: string, nextPriority: Priority, comments: string, newStatus?: PipelineStatus) => {
    if (!supabase) {
      const entryId = Date.now();
      const finalActionNote = comments.trim() ? `${nextAction} - ${comments.trim()}` : nextAction;
      setPipeline(prev => {
        // 1. Marcar anterior como Done
        const updated = prev.map(p => p.id === prevItem.id ? { ...p, 'action status': 'Done' } : p);
        // 2. Añadir nueva como Pending
        return [...updated, { 
          client_id: prevItem.client_id, 
          owner: currentUser === 'All' ? 'Juanjo' : currentUser, 
          status: newStatus || prevItem.status, 
          last_action: finalActionNote, 
          priority: nextPriority,
          "actions date": calculateActionDate(nextPriority),
          "action status": 'Pending',
          id: entryId,
          company: prevItem.company,
          created_at: new Date().toISOString()
        } as any];
      });
      addHistoryEntry(prevItem.client_id, 'note', `Tarea Completada (Módulo Demo). Siguiente paso: ${finalActionNote}`);
      setTaskToAccomplish(null);
      return;
    }

    const finalActionNote = comments.trim() ? `${nextAction} - ${comments.trim()}` : nextAction;
    const actionDate = calculateActionDate(nextPriority);
    const now = new Date().toISOString();

    // Asegurar que tenemos columnas detectadas
    let cols = pipelineColumns;
    if (cols.length === 0) {
      const { data } = await supabase.from('pipeline').select('*').limit(1);
      if (data && data[0]) cols = Object.keys(data[0]);
    }

    // Asegurar que company tenga valor (evita RLS failure si es obligatorio)
    const clientCompany = prevItem.company || clients.find(c => String(c.id) === String(prevItem.client_id))?.company || 'Cliente';

    const payload: any = {};
    
    // Mapeo exhaustivo dirigido: busca la columna correcta en el esquema real
    const setMapping = (candidates: string[], value: any) => {
      const col = candidates.find(c => cols.includes(c));
      if (col) payload[col] = value;
      else if (cols.length === 0) payload[candidates[0]] = value; // Fallback razonable
    };

    setMapping(['client_id', 'id_cliente', 'cliente_id', 'ID_CLIENTE'], prevItem.client_id);
    setMapping(['owner', 'operador', 'assigned_to'], currentUser === 'All' ? 'Juanjo' : currentUser);
    setMapping(['status', 'estado', 'Status'], newStatus || prevItem.status);
    setMapping(['last_action', 'accion', 'LastAction'], finalActionNote);
    setMapping(['priority', 'prioridad', 'Priority'], nextPriority);
    setMapping(['actions date', 'action_date', 'fecha_accion'], actionDate);
    setMapping(['last_contact_date', 'fecha_contacto', 'last_contact'], now);
    setMapping(['samples', 'muestras', 'Samples'], prevItem.samples);
    
    // Columnas físicas detectadas
    setMapping(['company', 'Empresa'], clientCompany);
    setMapping(['notes', 'notas'], comments.trim());
    setMapping(['action status', 'action_status'], 'Pending'); // El nuevo registro siempre nace como Pending

    try {
      // 1. Marcar el registro anterior como 'Done'
      const oldCol = cols.find(c => ['action status', 'action_status'].includes(c)) || 'action status';
      const { error: updateError } = await supabase.from('pipeline').update({ [oldCol]: 'Done' }).eq('id', prevItem.id);
      if (updateError) console.warn("No se pudo marcar la tarea anterior como Done, pero se intentará crear la nueva:", updateError);

      // 2. Insertar el nuevo registro como 'Pending'
      const { error } = await supabase.from('pipeline').insert([payload]);
      if (error) throw error;
      
      addHistoryEntry(prevItem.client_id, 'note', `Tarea Completada. Siguiente paso: ${finalActionNote} (Prioridad: ${nextPriority})`);
      setTaskToAccomplish(null);
      fetchClients();
    } catch (err: any) {
      console.error("Error al completar tarea:", err);
      let errorMsg = err.message;
      if (err.code === '42501') {
        errorMsg = "Error de Seguridad (RLS). El usuario no tiene permisos o falta un campo obligatorio. Columnas detectadas: " + (cols.length ? cols.join(", ") : "Ninguna");
      }
      alert(`Error al guardar: ${errorMsg}`);
    }
  };

  const handleStartFollowup = async (client: Client, selectedOwner: string) => {
    if (!supabase) {
      alert(`Seguimiento iniciado para ${client.company} asignado a ${selectedOwner} (Modo Demo)`);
      // Update local state for demo
      const entryId = Date.now();
      setPipeline(prev => [...prev, { 
        client_id: client.id, 
        id: entryId, 
        owner: selectedOwner as any,
        status: 'Pending',
        last_action: 'Seguimiento iniciado',
        priority: 'High',
        action_date: calculateActionDate('High'),
        last_contact_date: new Date().toISOString(),
        samples: '-',
        company: client.company
      }]);
      setAssigningClient(null);
      setAssigningOwner('');
      setShowAssignConfirm(false);
      return;
    }

    let cols = pipelineColumns;
    if (cols.length === 0) {
      const { data } = await supabase.from('pipeline').select('*').limit(1);
      if (data && data[0]) cols = Object.keys(data[0]);
    }

    const payload: any = {};
    const setMapping = (candidates: string[], value: any) => {
      const col = candidates.find(c => cols.includes(c));
      if (col) payload[col] = value;
      else if (cols.length === 0) payload[candidates[0]] = value;
    };

    setMapping(['client_id', 'id_cliente', 'cliente_id', 'ID_CLIENTE'], client.id);
    setMapping(['owner', 'operador', 'assigned_to'], selectedOwner);
    setMapping(['status', 'estado', 'Status'], 'Pending');
    setMapping(['last_action', 'accion', 'LastAction'], 'Seguimiento iniciado');
    setMapping(['priority', 'prioridad', 'Priority'], 'High');
    setMapping(['actions date', 'action_date', 'fecha_accion'], calculateActionDate('High'));
    setMapping(['last_contact_date', 'fecha_contacto', 'last_contact'], new Date().toISOString());
    setMapping(['samples', 'muestras', 'Samples'], '-');
    setMapping(['company'], client.company);
    setMapping(['action status', 'action_status'], 'Pending');

    try {
      const { error } = await supabase.from('pipeline').insert([payload]);
      if (error) throw error;
      
      addHistoryEntry(client.id, 'note', `Seguimiento académico iniciado por ${selectedOwner}`);
      setAssigningClient(null);
      setAssigningOwner('');
      setShowAssignConfirm(false);
      fetchClients();
    } catch (err: any) {
      console.error(err);
      alert("Error al iniciar seguimiento: " + err.message);
    }
  };

  const handleScanCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      // Convertir imagen a base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type
                }
              },
              {
                text: `Extract the following information from this business card: Company Name, Contact Name, Corporate Email, Phone, Mobile, and Office Address.
                
                CRITICAL RULES:
                1. Prioritize Corporate Email; it is the most critical data.
                2. If you are not completely sure about a piece of data, leave it empty in the JSON.
                3. Return strictly valid JSON format.
                `
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              company: { type: Type.STRING },
              contact_name: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              mobile: { type: Type.STRING },
              address: { type: Type.STRING }
            }
          }
        }
      });

      const extracted = JSON.parse(response.text);
      
      // Pre-rellenar formulario manteniendo lo que ya esté si no se encontró nada nuevo
      setNewClientForm(prev => ({
        ...prev,
        company: extracted.company || prev.company,
        contact_name: extracted.contact_name || prev.contact_name,
        email: extracted.email || prev.email,
        phone: extracted.phone || prev.phone,
        mobile: extracted.mobile || prev.mobile,
        address: extracted.address || prev.address
      }));

      alert("Scan completed. Please review the extracted data.");
    } catch (err) {
      console.error("Error scanning card:", err);
      alert("Error scanning card. Try again or fill manually.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleVoiceNote = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false; // Better to stop automatically for processing
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      
      setNewClientForm(prev => ({
        ...prev,
        description: transcript
      }));
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = async () => {
      setIsListening(false);
      // Pulir con Gemini si hay contenido
      if (newClientForm.description) {
        try {
          const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Improve the punctuation and coherence of this sales voice note, keeping all original information. Only return the improved text: "${newClientForm.description}"`,
          });
          const polished = response.text;
          if (polished) {
            setNewClientForm(prev => ({
              ...prev,
              description: polished.trim()
            }));
          }
        } catch (err) {
          console.error("Error polishing voice note:", err);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const userPipeline = useMemo(() => {
    // 1. Filtrar por propietario (si no es Admin y no es 'All')
    let filtered = pipeline;

    // Filtro crítico: Solo acciones PENDING (Regla de negocio: 1 lead = 1 pending action)
    filtered = filtered.filter(p => {
      const status = String(p['action status'] || p.action_status || '').toLowerCase().trim();
      // Si no tiene status, asumimos Pending (retrocompatibilidad)
      return status === 'pending' || status === '';
    });

    if (currentUser !== 'Orbe Admin' && currentUser !== 'All') {
      filtered = filtered.filter(p => 
        String(p.owner || '').toLowerCase().trim() === currentUser.toLowerCase().trim()
      );
    }

    // 2. Filtrar por término de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        (p.company?.toLowerCase() || '').includes(search)
      );
    }

    // 3. Colapsar por cliente: Solo el último registro en la tabla pipeline por cliente_id (orden cronológico real)
    const clientMap = new Map<string | number, PipelineItem>();
    
    // Ordenamos por fecha de creación ascendente para que el registro más reciente (el último) sobreescriba en el Map
    const sortedByTime = [...filtered].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
    
    sortedByTime.forEach(item => {
      clientMap.set(item.client_id, item);
    });

    // 4. Filtrar por Status semántico
    let finalItems = Array.from(clientMap.values());
    if (statusFilter !== 'All') {
      finalItems = finalItems.filter(item => {
        if (statusFilter === 'Client') return item.status === 'Client';
        if (statusFilter === 'Fail') return item.status === 'Not interested';
        if (statusFilter === 'Potencial') return item.status !== 'Client' && item.status !== 'Not interested';
        return true;
      });
    }

    // 5. Ordenar: 1º Action Date (Cercano primero), 2º Priority (High -> Postpone)
    const sortedResult = finalItems.sort((a, b) => {
      const dateA = new Date(a.action_date).getTime() || 0;
      const dateB = new Date(b.action_date).getTime() || 0;
      
      if (dateA !== dateB) {
        return dateA - dateB; // Lo más cercano primero
      }
      
      const priorityWeightA = PRIORITIES[a.priority as Priority] || 999;
      const priorityWeightB = PRIORITIES[b.priority as Priority] || 999;
      return priorityWeightA - priorityWeightB;
    });

    return sortedResult;
  }, [pipeline, currentUser, searchTerm]);

  const filteredClients = useMemo(() => {
    let result = clients.filter(c => 
      (c.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.contact_person?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (assignmentFilter === 'assigned') {
      result = result.filter(c => pipeline.some(p => String(p.client_id) === String(c.id)));
    } else if (assignmentFilter === 'unassigned') {
      result = result.filter(c => !pipeline.some(p => String(p.client_id) === String(c.id)));
    }

    return result;
  }, [clients, searchTerm, assignmentFilter, pipeline]);

  if (!session) {
    return (
      <div className="min-h-screen bg-orbe-green flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orbe-tan/10 rounded-full blur-[150px]"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden relative z-10 border border-white/20"
        >
          <div className="p-10">
            <div className="flex flex-col items-center mb-10">
              <div className="w-24 h-24 bg-orbe-green rounded-full flex items-center justify-center shadow-lg mb-6 p-2 border-2 border-orbe-tan/20">
                <Leaf className="w-12 h-12 text-orbe-tan transform rotate-[-45deg]" />
              </div>
              <h1 className="text-2xl font-black text-orbe-green tracking-tighter text-center uppercase leading-tight">
                Welcome to <br/> <span className="text-3xl">OrBe Serresiete</span>
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-3 bg-gray-50 px-4 py-1 rounded-full">
                Professional CRM Access
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  <input 
                    type="email" 
                    required
                    placeholder="name@orbegastronomico.es"
                    value={loginForm.email}
                    onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 ring-orbe-green/10 outline-none transition-all text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 ring-orbe-green/10 outline-none transition-all text-sm font-semibold"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-300 hover:text-orbe-green transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                    />
                    <div className="w-5 h-5 bg-gray-100 rounded-lg border border-gray-200 peer-checked:bg-orbe-green peer-checked:border-orbe-green transition-all"></div>
                    <CheckCircle className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-75 transition-all" size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-orbe-green transition-colors">Remember session</span>
                </label>
              </div>

              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-red-50 rounded-xl flex items-center gap-2 text-red-500 border border-red-100"
                >
                  <AlertCircle size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{loginError}</span>
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={loginLoading}
                className="w-full bg-orbe-green text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orbe-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                {loginLoading ? 'Authenticating...' : 'Sign In Now'}
              </button>
            </form>
          </div>
          <div className="bg-gray-50 p-6 flex justify-center border-t border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              Authorized access only
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading && clients.length === 0) {
    return (
      <div className="min-h-screen bg-orbe-green flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orbe-tan border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-bold tracking-[0.3em] uppercase text-[10px]">Cargando OrBe CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orbe-cream flex overflow-hidden">
      {/* SIDEBAR */}
      {/* SIDEBAR - ESCRITORIO */}
      <aside className="w-64 bg-orbe-green hidden md:flex flex-col h-full shadow-xl fixed z-20">
        <div className="p-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-10"
          >
            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center p-2 border border-white/20">
              <Leaf className="w-8 h-8 text-orbe-tan transform rotate-[-45deg]" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-white text-3xl font-black italic tracking-tighter leading-none">OrBe</h1>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-[0.2em] mt-1">Gastronómico</span>
            </div>
          </motion.div>

          <nav className="space-y-1">
            {[
              { id: 'pipeline', icon: <LayoutDashboard size={18}/>, label: 'Sales Pipeline' },
              { id: 'database', icon: <Database size={18}/>, label: 'Clients Database' },
              { id: 'control', icon: <AlertCircle size={18}/>, label: 'Dashboard' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group ${view === item.id ? 'bg-white/10 text-white border-l-4 border-orbe-ontime shadow-inner' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
              >
                <div className={`${view === item.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                  {item.icon}
                </div>
                <span className="font-medium text-sm">{item.label}</span>
                {item.id === 'control' && pipeline.some(p => p.owner === currentUser && new Date(p.action_date) < new Date()) && (
                  <div className="absolute right-3 w-2 h-2 bg-orbe-overdue rounded-full animate-ping"></div>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="w-full py-3 bg-white/5 hover:bg-red-500/10 border border-white/10 text-white/60 hover:text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* NAVEGACIÓN INFERIOR - MÓVIL */}
      <nav className="fixed bottom-0 left-0 right-0 bg-orbe-green md:hidden z-[100] flex justify-around items-center p-3 border-t border-white/10 safe-area-bottom shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
        <button 
          onClick={() => setView('pipeline')} 
          className={`flex flex-col items-center gap-1 transition-all ${view === 'pipeline' ? 'text-white scale-110' : 'text-white/40'}`}
        >
          <Briefcase size={22} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Pipeline</span>
        </button>
        <button 
          onClick={() => setView('database')} 
          className={`flex flex-col items-center gap-1 transition-all ${view === 'database' ? 'text-white scale-110' : 'text-white/40'}`}
        >
          <Database size={22} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Database</span>
        </button>
        <button 
          onClick={() => setView('control')} 
          className={`flex flex-col items-center gap-1 transition-all ${view === 'control' ? 'text-white scale-110' : 'text-white/40'}`}
        >
          <LayoutDashboard size={22} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Dashboard</span>
        </button>
      </nav>

      {/* WIZARD DE ASIGNACIÓN DE SEGUIMIENTO */}
      <AnimatePresence>
        {assigningClient && (
          <div key="assign-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div 
              key="assign-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-8">
                {!showAssignConfirm ? (
                  <>
                    <div className="w-16 h-16 bg-orbe-green/10 rounded-2xl flex items-center justify-center text-orbe-green mb-6 mx-auto">
                      <Briefcase size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-orbe-green text-center mb-2 leading-tight">MÓDULO DE ASIGNACIÓN</h3>
                    <p className="text-gray-400 text-sm text-center mb-8 font-medium">¿Quién es el responsable de esta cuenta?<br/><span className="text-orbe-green font-bold">{assigningClient.company}</span></p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      {['Alejandro', 'Juanjo'].map(name => (
                        <button
                          key={name}
                          onClick={() => {
                            setAssigningOwner(name as any);
                            setShowAssignConfirm(true);
                          }}
                          className={`p-6 rounded-2xl border-2 transition-all group flex flex-col items-center gap-3 ${
                            assigningOwner === name 
                            ? 'border-orbe-green bg-orbe-green text-white shadow-lg shadow-orbe-green/20' 
                            : 'border-orbe-tan/30 hover:border-orbe-green/50 text-orbe-green bg-gray-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${assigningOwner === name ? 'bg-white text-orbe-green' : 'bg-orbe-green/10 text-orbe-green'}`}>
                            {name[0]}
                          </div>
                          <span className="font-bold text-sm tracking-tight">{name.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => setAssigningClient(null)}
                      className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase text-xs tracking-widest"
                    >
                      Cancelar proceso
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-6 mx-auto">
                      <AlertCircle size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-orbe-green text-center mb-2 leading-tight">CONFIRMACIÓN REQUERIDA</h3>
                    <p className="text-gray-500 text-center mb-10 font-medium">
                      ¿Seguro que quieres asignar esta cuenta a <span className="text-orbe-green font-black">{assigningOwner}</span>?
                    </p>
                    
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleStartFollowup(assigningClient, assigningOwner)}
                        className="flex-1 bg-orbe-green text-white py-4 rounded-xl font-bold shadow-lg shadow-orbe-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-sm tracking-widest"
                      >
                        Sí, Asignar
                      </button>
                      <button
                        onClick={() => setShowAssignConfirm(false)}
                        className="flex-1 border-2 border-orbe-tan/30 text-gray-400 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all uppercase text-sm tracking-widest"
                      >
                        No
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIGURACIÓN DE SUPABASE */}
      <AnimatePresence>
        {showConfigWizard && (
          <div key="config-wizard-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              key="config-wizard-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden"
            >
              <div className="bg-orbe-green p-8 text-white">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <Database className="w-6 h-6" /> Asistente de Configuración
                </h3>
                <p className="text-white/60 text-sm mt-1">Configura la conexión con tu base de datos de Supabase</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Project URL</label>
                  <input 
                    type="text" 
                    value={wizardConfig.url} 
                    onChange={e => setWizardConfig({...wizardConfig, url: e.target.value})}
                    placeholder="https://su-proyecto.supabase.co"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orbe-green focus:ring-1 focus:ring-orbe-green outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">Copia esto de Settings → API → Project URL</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Anon Public Key</label>
                  <textarea 
                    rows={3}
                    value={wizardConfig.key} 
                    onChange={e => setWizardConfig({...wizardConfig, key: e.target.value})}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-orbe-green focus:ring-1 focus:ring-orbe-green outline-none font-mono resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">Copia esto de Settings → API → `anon` public key</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => {
                      localStorage.setItem('ORBE_SUPABASE_URL', wizardConfig.url);
                      localStorage.setItem('ORBE_SUPABASE_KEY', wizardConfig.key);
                      window.location.reload();
                    }}
                    className="flex-1 bg-orbe-green text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-orbe-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Guardar y Conectar
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('ORBE_SUPABASE_URL');
                      localStorage.removeItem('ORBE_SUPABASE_KEY');
                      window.location.reload();
                    }}
                    className="px-6 border border-gray-200 text-gray-400 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                  >
                    Resetear
                  </button>
                  <button 
                    onClick={() => setShowConfigWizard(false)}
                    className="px-4 text-gray-400 hover:text-gray-600 font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-0 md:ml-64 flex flex-col p-4 md:p-10 h-screen overflow-hidden relative">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 gap-3 md:gap-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between w-full md:w-auto"
          >
            <h2 className="text-sm md:text-lg font-black text-orbe-green tracking-tighter uppercase">OrBe Serresiete</h2>
            {/* Indicador de vista actual en móvil */}
            <div className="md:hidden px-3 py-1 bg-orbe-green/10 rounded-full">
              <span className="text-[10px] font-black text-orbe-green uppercase tracking-widest">{view}</span>
            </div>
          </motion.div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {view === 'database' && (
              <>
                <button 
                  onClick={() => setAssignmentFilter('all')}
                  className={`flex-1 md:flex-none p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-sm border text-center min-w-[70px] md:min-w-[120px] transition-all ${
                    assignmentFilter === 'all' 
                    ? 'bg-orbe-green text-white border-orbe-green shadow-orbe-green/20' 
                    : 'bg-white text-orbe-green border-orbe-tan/40 opacity-60'
                  }`}
                >
                  <p className="text-[7px] md:text-[8px] font-bold uppercase tracking-tight opacity-70">Pot.</p>
                  <p className="text-sm md:text-xl font-black leading-none">{clients.length}</p>
                </button>

                <button 
                  onClick={() => setAssignmentFilter('assigned')}
                  className={`flex-1 md:flex-none p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-sm border text-center min-w-[70px] md:min-w-[120px] transition-all ${
                    assignmentFilter === 'assigned'
                    ? 'bg-orbe-green text-white border-orbe-green shadow-orbe-green/20' 
                    : 'bg-white text-orbe-green border-orbe-tan/40 opacity-60'
                  }`}
                >
                  <p className="text-[7px] md:text-[8px] font-bold uppercase tracking-tight opacity-70">Asig.</p>
                  <p className="text-sm md:text-xl font-black leading-none">{assignedClientIds.size}</p>
                </button>

                <button 
                  onClick={() => setAssignmentFilter('unassigned')}
                  className={`flex-1 md:flex-none p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-sm border text-center min-w-[70px] md:min-w-[120px] transition-all ${
                    assignmentFilter === 'unassigned'
                    ? 'bg-red-500 text-white border-red-500 shadow-red-500/20' 
                    : 'bg-white text-red-500 border-orbe-tan/40 opacity-60'
                  }`}
                >
                  <p className="text-[7px] md:text-[8px] font-bold uppercase tracking-tight opacity-70">Pend.</p>
                  <p className="text-sm md:text-xl font-black leading-none">{clients.length - assignedClientIds.size}</p>
                </button>
              </>
            )}
          </div>
        </header>

        <section className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <AnimatePresence mode="wait">
            {view === 'new' && (
              <motion.div 
                key="new-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl mx-auto w-full min-h-0 overflow-y-auto"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-orbe-tan/50 overflow-hidden">
                  <div className="bg-orbe-green p-5 text-white relative flex justify-between items-center">
                    <h2 className="text-xl font-bold">New Client Registration</h2>
                    <button 
                      onClick={() => setView('database')}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-white/20"
                    >
                      Back to List
                    </button>
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    
                    const company = (newClientForm.company || '').trim();
                    const email = (newClientForm.email || '').trim();
                    const phone = (newClientForm.phone || '').trim();

                    // Calcular siguiente ID manual (ya que la tabla parece no tener auto-incremento)
                    const nextId = clients.length > 0 
                      ? Math.max(...clients.map(c => Number(c.id) || 0)) + 1 
                      : 1;

                    // Validación de requisitos indispensables
                    if (!company) {
                      alert('Company name is required.');
                      return;
                    }
                    if (!email && !phone) {
                      alert('You must provide at least one contact method (Email or Phone).');
                      return;
                    }

                    const payload: any = {
                      ID: nextId,
                      Company: company,
                      "Contact name": newClientForm.contact_name || '',
                      "Lead Name": newClientForm.contact_name || '',
                      "Correo electrónico": email,
                      "Teléfono": phone,
                      "Móvil": newClientForm.mobile || '',
                      "Adress": newClientForm.address || '',
                      "Descripción": newClientForm.description || ''
                    };

                    if (!supabase) {
                      const newId = clients.length + 1;
                      setClients(prev => [...prev, { id: newId, ...payload } as any]);
                      alert('Demo Mode: Client saved locally');
                      setView('database');
                      return;
                    }

                    try {
                      // Validación de duplicados
                      const { data: existingRecords, error: checkError } = await supabase
                        .from('clients')
                        .select('*')
                        .eq('Company', payload.Company);
                      
                      if (checkError) throw checkError;
                      
                      if (existingRecords && existingRecords.length > 0) {
                        const existing = existingRecords[0];
                        const foundId = existing.id || existing.ID || existing.n || existing.N || '?';
                        alert(`User already exists, check ID: ${foundId}`);
                        return;
                      }

                      const { data: inserted, error } = await supabase.from('clients').insert([payload]).select();
                      if (error) throw error;
                      
                      if (inserted && inserted[0]) {
                        addHistoryEntry(inserted[0].id, 'system', 'Client registered in system');
                      }

                      alert('Client successfully registered in database');
                      fetchClients();
                      setView('database');
                    } catch (err) {
                      console.error(err);
                      alert('Error saving data.');
                    }
                  }} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Business Card Scan at the TOP - Lean Design */}
                      <div className="col-span-2 mb-4">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={fileInputRef}
                          onChange={handleScanCard}
                        />
                        <div 
                          className={`relative overflow-hidden rounded-xl border border-orbe-tan/30 bg-orbe-tan/5 transition-all p-1 ${isScanning ? 'animate-pulse' : ''}`}
                        >
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanning}
                            className={`w-full py-4 px-6 flex items-center justify-between group transition-all rounded-lg overflow-hidden ${isScanning ? 'cursor-wait bg-white/50' : 'hover:bg-white active:bg-orbe-tan/10'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-full transition-colors ${isScanning ? 'bg-orbe-green text-white' : 'bg-orbe-green/10 text-orbe-green group-hover:bg-orbe-green group-hover:text-white'}`}>
                                {isScanning ? <Clock className="animate-spin" size={20} /> : <PlusCircle size={20} />}
                              </div>
                              <div className="text-left">
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isScanning ? 'text-orbe-green' : 'text-gray-400'}`}>
                                  {isScanning ? 'Extracting AI data...' : 'Card Scan'}
                                </p>
                                <p className="text-sm font-bold text-orbe-green tracking-tight">
                                  {isScanning ? 'Please wait a few seconds' : 'Upload photo to auto-fill'}
                                </p>
                              </div>
                            </div>
                            <div className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${isScanning ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-orbe-green border-orbe-tan/50 group-hover:border-orbe-green group-hover:shadow-sm'}`}>
                              Business Card
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Company Name <span className="text-red-400">*</span></label>
                        <input 
                          value={newClientForm.company}
                          onChange={e => setNewClientForm({...newClientForm, company: e.target.value})}
                          className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all font-semibold text-orbe-green" 
                          placeholder="Company name..." 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Contact Person</label>
                        <input 
                          value={newClientForm.contact_name}
                          onChange={e => setNewClientForm({...newClientForm, contact_name: e.target.value})}
                          className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" 
                          placeholder="Contact reference or name..." 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Corporate Email</label>
                        <input 
                          type="email"
                          value={newClientForm.email}
                          onChange={e => setNewClientForm({...newClientForm, email: e.target.value})}
                          className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Phone</label>
                          <input 
                            value={newClientForm.phone}
                            onChange={e => setNewClientForm({...newClientForm, phone: e.target.value})}
                            className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Mobile</label>
                          <input 
                            value={newClientForm.mobile}
                            onChange={e => setNewClientForm({...newClientForm, mobile: e.target.value})}
                            className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" 
                          />
                        </div>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Commercial Address</label>
                        <input 
                          value={newClientForm.address}
                          onChange={e => setNewClientForm({...newClientForm, address: e.target.value})}
                          className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notes / Description</label>
                          <button 
                            type="button"
                            onClick={toggleVoiceNote}
                            className={`p-1.5 rounded-full transition-all flex items-center gap-2 group ${isListening ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-orbe-green/5 text-orbe-green hover:bg-orbe-green/10'}`}
                          >
                            {isListening ? (
                              <>
                                <MicOff size={14} />
                                <span className="text-[9px] font-bold uppercase tracking-tight">Listening...</span>
                              </>
                            ) : (
                              <>
                                <Mic size={14} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[9px] font-bold uppercase tracking-tight">Dictate note</span>
                              </>
                            )}
                          </button>
                        </div>
                        <textarea 
                          value={newClientForm.description}
                          onChange={e => setNewClientForm({...newClientForm, description: e.target.value})}
                          rows={3} 
                          className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all resize-none" 
                          placeholder={isListening ? "Speak now..." : "Add relevant details..."} 
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-orbe-green text-white py-4 rounded-lg font-bold text-sm tracking-tight hover:opacity-90 transition-all shadow-md">
                      SAVE CLIENT TO ORBE
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {view === 'pipeline' && (
              <motion.div 
                key="pipeline-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-orbe-tan/50 overflow-hidden flex-1 flex flex-col min-h-0"
              >
                <div className="p-4 border-b border-orbe-tan/30 bg-gray-50/50 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sticky top-0 md:relative z-20">
                  <div className="max-w-md flex-1 relative">
                    <Search className="absolute left-4 top-2.5 text-orbe-tan" size={16} />
                    <input 
                      className="w-full pl-10 pr-4 py-3 md:py-2 bg-white border border-orbe-tan/50 rounded-lg outline-none focus:ring-2 ring-orbe-green/10 transition-all font-semibold text-orbe-green text-sm shadow-sm"
                      placeholder="Filter by follow-up company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-3 bg-orbe-green border border-orbe-green px-4 py-2 rounded-xl shadow-lg shadow-orbe-green/20 transition-all">
                      <Users size={14} className="text-white opacity-70" />
                      <span className="text-[9px] font-black text-white/60 uppercase tracking-widest border-r border-white/20 pr-3 hidden md:inline">Owner:</span>
                      <select 
                        value={currentUser} 
                        onChange={(e) => setCurrentUser(e.target.value as User)}
                        className="flex-1 md:flex-none text-[10px] font-black text-white uppercase tracking-wider outline-none bg-transparent cursor-pointer"
                      >
                        {USERS.map(u => (
                          <option key={u} value={u} className="bg-orbe-green text-white">{u.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 flex items-center gap-3 bg-orbe-green border border-orbe-green px-4 py-2 rounded-xl shadow-lg shadow-orbe-green/20 transition-all">
                      <Filter size={14} className="text-white opacity-70" />
                      <span className="text-[9px] font-black text-white/60 uppercase tracking-widest border-r border-white/20 pr-3 hidden md:inline">Status:</span>
                      <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="flex-1 md:flex-none text-[10px] font-black text-white uppercase tracking-wider outline-none bg-transparent cursor-pointer"
                      >
                        {['All', 'Potential', 'Client', 'Discarded'].map(s => (
                          <option key={s} value={s === 'Potential' ? 'Potencial' : s === 'Discarded' ? 'Fail' : s} className="bg-orbe-green text-white">{s.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-orbe-tan/20 scrollbar-track-transparent p-4 md:p-0">
                  {/* VISTA DESKTOP: TABLA */}
                  <table className="w-full text-left border-collapse hidden md:table">
                    <thead className="bg-[#fcfaf7] border-b border-orbe-tan/30 sticky top-0 z-10 whitespace-nowrap">
                      <tr>
                        <th className="p-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-16">ID</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Owner</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action Date</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Contact</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Action</th>
                        <th className="p-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-20">Samples</th>
                        <th className="p-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-28">Status</th>
                        <th className="p-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-20">Log</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orbe-tan/20 text-sm whitespace-nowrap">
                      {userPipeline.length === 0 ? (
                        <tr key="empty-clients-row">
                          <td colSpan={11} className="p-20 text-center text-gray-400 font-medium italic">
                            No active follow-ups matching the criteria.
                          </td>
                        </tr>
                      ) : (
                        userPipeline.map(item => (
                          <tr key={item.id} className="hover:bg-orbe-cream/30 transition-colors">
                            <td className="p-2 font-mono text-[10px] text-gray-400">#{item.client_id}</td>
                            <td className="px-3 py-2">
                              <div className="font-bold text-orbe-green">{item.company}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <UserCircle size={14} className="text-orbe-tan" />
                                <span className="font-semibold text-gray-600">{item.owner}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1">
                                <span className="font-mono font-bold text-orbe-green/70 text-[11px]">
                                  {formatDateSafe(item.action_date).toUpperCase()}
                                </span>
                                {getStatusBadge(item.action_date)}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span 
                                className={`font-bold text-[10px] uppercase tracking-widest ${
                                  item.priority === 'High' ? 'text-red-600' : 
                                  item.priority === 'Medium' ? 'text-orange-600' : 
                                  'text-blue-600'
                                }`}
                              >
                                {item.priority}
                              </span>
                            </td>
                            <td className="p-5">
                              <input 
                                type="date"
                                defaultValue={toISODateOnly(item.last_contact_date)}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleUpdatePipeline(item.id, { last_contact_date: new Date(e.target.value).toISOString() });
                                  }
                                }}
                                className="bg-transparent font-mono text-xs text-gray-500 outline-none border border-transparent focus:border-orbe-tan/30 rounded px-1"
                              />
                            </td>
                            <td className="p-5 text-gray-500 italic min-w-[250px]">
                              <input 
                                defaultValue={item.last_action}
                                onBlur={(e) => handleUpdatePipeline(item.id, { last_action: e.target.value })}
                                className="bg-transparent w-full outline-none text-xs"
                                placeholder="Action note..."
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                defaultValue={item.samples}
                                onBlur={(e) => handleUpdatePipeline(item.id, { samples: e.target.value })}
                                className="bg-transparent w-full text-center outline-none border-b border-transparent focus:border-orbe-tan/30"
                                placeholder="..."
                              />
                            </td>
                            <td className="p-3 text-center">
                              <span 
                                className={`px-2 py-1 rounded-full font-bold text-[9px] border shadow-sm transition-all inline-block uppercase tracking-wider ${
                                  item.status === 'Client' ? 'bg-green-50 text-green-700 border-green-100' : 
                                  item.status === 'Not interested' ? 'bg-red-50 text-red-700 border-red-100' :
                                  'bg-gray-100 text-orbe-green border-gray-200'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => setSelectedClientForHistory(clients.find(c => String(c.id) === String(item.client_id)) || null)}
                                className="p-2 bg-orbe-tan/10 text-orbe-green rounded-lg hover:bg-orbe-tan/30 transition-all shadow-sm"
                                title="Interaction Log"
                              >
                                <Clock size={14} />
                              </button>
                            </td>
                            <td className="p-5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => setTaskToAccomplish(item)}
                                  className="p-2 bg-orbe-green/10 text-orbe-green rounded-lg hover:bg-orbe-green hover:text-white transition-all shadow-sm flex items-center gap-1 group"
                                  title="Task Accomplished"
                                >
                                  <CheckCircle size={14} className="group-hover:scale-110" />
                                  <span className="text-[9px] font-black uppercase">Close</span>
                                </button>
                                <button 
                                  onClick={() => setPostponeItem(item)}
                                  className="p-2 bg-orbe-tan/10 text-orbe-green rounded-lg hover:bg-orbe-green hover:text-white transition-all shadow-sm flex items-center gap-1 group"
                                  title="Postpone Action"
                                >
                                  <Calendar size={14} className="group-hover:scale-110" />
                                  <span className="text-[9px] font-black uppercase">Postpone</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* VISTA MÓVIL: CARDS (Pipeline) */}
                  <div className="md:hidden space-y-4 mobile-cards-container">
                    {userPipeline.length === 0 ? (
                      <div className="py-20 text-center text-gray-400 font-medium italic bg-white rounded-xl border border-dashed border-orbe-tan">
                        No active follow-ups found.
                      </div>
                    ) : (
                      userPipeline.map(item => (
                        <div key={`mob-pipe-${item.id}`} className="bg-orbe-cream/30 rounded-2xl border border-orbe-tan/40 overflow-hidden shadow-sm flex flex-col">
                          <div className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-black text-orbe-green text-lg leading-tight uppercase tracking-tight">{item.company}</h4>
                                <div className="flex items-center gap-2 mt-1 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                                  <UserCircle size={10} /> {item.owner} | #{item.client_id}
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-tighter border ${
                                item.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 
                                item.priority === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                'bg-blue-50 text-blue-600 border-blue-100'
                              }`}>
                                {item.priority}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 bg-white/60 p-3 rounded-xl border border-orbe-tan/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-orbe-green/70">
                                  <Calendar size={14} />
                                  <span className="text-xs font-black uppercase tracking-tight">Action Date</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="font-mono font-black text-orbe-green text-sm">{formatDateSafe(item.action_date).toUpperCase()}</span>
                                  {isOverdue(item.action_date) && <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter animate-pulse">🔴 Overdue</span>}
                                </div>
                              </div>
                              <div className="h-px bg-orbe-tan/20 my-1" />
                              <div className="flex items-start gap-2">
                                <div className="p-1.5 bg-orbe-tan/10 rounded-lg text-orbe-tan mt-0.5">
                                  <CheckSquare size={12} />
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Last Action</p>
                                  <p className="text-xs font-semibold text-gray-600 italic mt-1 leading-snug">"{item.last_action || 'No recent notes'}"</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex border-t border-orbe-tan/30 h-14">
                            <button 
                              onClick={() => setTaskToAccomplish(item)}
                              className="flex-1 bg-orbe-green text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:opacity-80 transition-all border-r border-white/10"
                            >
                              <CheckCircle size={18} /> Close
                            </button>
                            <button 
                              onClick={() => setPostponeItem(item)}
                              className="flex-1 bg-orbe-tan/20 text-orbe-green font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:bg-orbe-tan/40 transition-all"
                            >
                              <Calendar size={18} /> Postpone
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-medium">Mostrando {userPipeline.length} seguimientos activos para {currentUser}</p>
                </div>
              </motion.div>
            )}

            {view === 'control' && (
              <motion.div 
                key="control-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-6 flex-1 flex flex-col overflow-y-auto pr-2"
              >
                {/* 1. SECCIÓN VISUAL - MÉTRICAS CRÍTICAS COMPACTAS */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Total Overdue */}
                  <div className="bg-white p-2 md:p-3 rounded-lg border border-orbe-tan/30 shadow-sm flex flex-col items-center md:items-start justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-red-50 text-red-500 rounded-lg">
                        <Clock size={16} />
                      </div>
                      <span className="hidden md:inline text-[8px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-widest">Red Alert</span>
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-lg md:text-xl font-black text-orbe-green leading-none">
                        {pipeline.filter(p => isOverdue(p.action_date) && String(p.action_status || '').trim().toLowerCase() !== 'done').length}
                      </h3>
                      <p className="text-[7px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Overdue</p>
                    </div>
                  </div>

                  {/* Unassigned Potentials */}
                  <div className="bg-white p-2 md:p-3 rounded-lg border border-orbe-tan/30 shadow-sm flex flex-col items-center md:items-start justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-orbe-tan/10 text-orbe-tan rounded-lg">
                        <Users size={16} />
                      </div>
                      <span className="hidden md:inline text-[8px] font-black text-orbe-tan bg-orbe-tan/10 px-1.5 py-0.5 rounded uppercase tracking-widest text-opacity-70">Pending</span>
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-lg md:text-xl font-black text-orbe-green leading-none">
                        {clients.length - assignedClientIds.size}
                      </h3>
                      <p className="text-[7px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Unassigned</p>
                    </div>
                  </div>

                  {/* Follow-ups in Progress */}
                  <div className="bg-white p-2 md:p-3 rounded-lg border border-orbe-tan/30 shadow-sm flex flex-col items-center md:items-start justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 md:p-2 bg-orange-50 text-orange-500 rounded-lg">
                        <Database size={16} />
                      </div>
                      <span className="hidden md:inline text-[8px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded uppercase tracking-widest">Follow-up</span>
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-lg md:text-xl font-black text-orbe-green leading-none">
                        {pipeline.filter(p => String(p.action_status || '').trim().toLowerCase() !== 'done').length}
                      </h3>
                      <p className="text-[7px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Active</p>
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN MÓVIL: URGENCIAS DEL VENDEDOR */}
                <div className="md:hidden flex-1 flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-xl font-black text-orbe-green uppercase tracking-tighter">My Pending Tasks</h4>
                    <span className="text-[10px] font-black bg-orbe-green text-white px-3 py-1 rounded-full uppercase tracking-widest tracking-tight">Active: {pipeline.filter(p => p.owner === currentUser && String(p.action_status || '').trim().toLowerCase() !== 'done').length}</span>
                  </div>
                  
                  <div className="flex-1 space-y-3 pb-20">
                    {pipeline
                      .filter(p => p.owner === currentUser && String(p.action_status || '').trim().toLowerCase() !== 'done')
                      .sort((a, b) => new Date(a.action_date).getTime() - new Date(b.action_date).getTime())
                      .map(item => (
                        <button 
                          key={`dash-mob-${item.id}`}
                          onClick={() => {
                            setSearchTerm(item.company);
                            setView('pipeline');
                          }}
                          className={`w-full text-left bg-white p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-95 shadow-sm overflow-hidden relative group ${isOverdue(item.action_date) ? 'border-red-200' : 'border-orbe-tan/30'}`}
                        >
                          {isOverdue(item.action_date) && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500" />}
                          <div className={`p-3 rounded-xl ${isOverdue(item.action_date) ? 'bg-red-50 text-red-500' : 'bg-orbe-green/5 text-orbe-green'}`}>
                            {isOverdue(item.action_date) ? <AlertCircle size={20} /> : <Calendar size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="font-black text-orbe-green text-sm truncate uppercase tracking-tight">{item.company}</p>
                              <p className={`font-mono font-black text-[10px] ${isOverdue(item.action_date) ? 'text-red-600' : 'text-gray-400'}`}>{formatDateSafe(item.action_date).toUpperCase()}</p>
                            </div>
                            <p className="text-[10px] text-gray-400 italic truncate mt-0.5">"{item.last_action || 'No notes'}"</p>
                          </div>
                          <div className="text-orbe-tan group-active:translate-x-1 transition-transform">
                            <ChevronRight size={18} />
                          </div>
                        </button>
                      ))}
                    {pipeline.filter(p => p.owner === currentUser && String(p.action_status || '').trim().toLowerCase() !== 'done').length === 0 && (
                      <div className="py-20 text-center bg-green-50/30 rounded-3xl border-2 border-dashed border-green-200 flex flex-col items-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle size={32} />
                        </div>
                        <p className="text-green-800 font-black text-lg uppercase tracking-tight">You're All Caught Up!</p>
                        <p className="text-green-600/70 text-sm font-medium">No pending tasks for today.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. SECCIÓN DESKTOP: DETALLE POR RESPONSABLE (Hidden on Mobile) */}
                <div className="hidden md:grid grid-cols-2 gap-6">
                  {['Alejandro', 'Juanjo'].map((owner) => {
                    const ownerActions = pipeline.filter(p => 
                      p.owner === owner && 
                      String(p.action_status || '').trim().toLowerCase() !== 'done'
                    );
                    const overdueActions = ownerActions.filter(p => isOverdue(p.action_date));
                    
                    return (
                      <div key={owner} className="bg-white rounded-2xl shadow-sm border border-orbe-tan/50 overflow-hidden flex flex-col flex-1 min-h-[500px]">
                        <div className="p-4 border-b border-orbe-tan/30 bg-gray-50/50 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orbe-green flex items-center justify-center text-white font-bold text-xs shadow-sm">
                              {owner[0]}
                            </div>
                            <h4 className="text-sm font-black text-orbe-green uppercase tracking-tight">{owner}</h4>
                          </div>
                          <div className="flex gap-2">
                             <div className="px-3 py-0.5 bg-white border border-orbe-tan/40 rounded-full text-[9px] font-bold text-gray-500">
                               Total: {ownerActions.length}
                             </div>
                             {overdueActions.length > 0 && (
                               <div className="px-3 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[9px] font-bold flex items-center gap-1">
                                 <AlertCircle size={9} /> {overdueActions.length} Overdue
                               </div>
                             )}
                          </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto bg-white">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#fcfaf7] sticky top-0 border-b border-orbe-tan/30 z-10">
                              <tr>
                                <th className="p-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Company</th>
                                <th className="p-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Due Date</th>
                                <th className="p-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-orbe-tan/10">
                              {ownerActions.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="p-10 text-center text-[11px] text-gray-400 italic">No active follow-ups</td>
                                </tr>
                              ) : (
                                ownerActions
                                  .sort((a, b) => new Date(a.action_date).getTime() - new Date(b.action_date).getTime())
                                  .map(item => (
                                  <tr key={item.id} className="hover:bg-orbe-cream/20 transition-colors">
                                    <td className="px-3 py-2">
                                      <div className="font-bold text-orbe-green text-[11px] truncate max-w-[150px]">{item.company}</div>
                                      <div className="text-[9px] text-gray-400 truncate max-w-[150px]">{item.last_action || 'No notes'}</div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-[10px] text-gray-500">
                                      {formatDateSafe(item.action_date)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${isOverdue(item.action_date) ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                        {isOverdue(item.action_date) ? 'Overdue' : 'On Time'}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="p-3 bg-gray-50 border-t border-orbe-tan/20">
                          {ownerActions.length > 0 && overdueActions.length === 0 ? (
                            <div className="flex items-center gap-2 text-green-600 text-[9px] font-bold">
                              <CheckCircle size={12} /> All up to date! Great job.
                            </div>
                          ) : ownerActions.length > 0 ? (
                             <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold">
                              <AlertCircle size={14} /> Has urgent actions to resolve.
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold">
                              <Clock size={14} /> No recent activity.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {view === 'database' && (
              <motion.div 
                key="database-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-orbe-tan/50 overflow-hidden flex-1 flex flex-col min-h-0 relative"
              >
                {/* BUSCADOR STICKY EN MÓVIL */}
                <div className="p-4 md:p-8 border-b border-orbe-tan/30 bg-gray-50/50 flex justify-between items-center gap-4 sticky top-0 z-20">
                  <div className="max-w-md flex-1 relative">
                    <Search className="absolute left-4 top-3.5 md:top-3.5 text-orbe-tan" size={18} />
                    <input 
                      className="w-full pl-12 pr-4 py-3 bg-white border border-orbe-tan/50 rounded-xl outline-none focus:ring-2 ring-orbe-green/10 transition-all font-semibold text-orbe-green shadow-sm text-sm"
                      placeholder="Search by client, contact or lead..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setView('new')}
                    className="hidden md:flex bg-orbe-green text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orbe-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all items-center gap-2 whitespace-nowrap"
                  >
                    <PlusCircle size={18} />
                    ADD NEW
                  </button>
                </div>

                {/* FAB PARA MÓVIL */}
                <button 
                  onClick={() => setView('new')}
                  className="md:hidden fixed bottom-24 right-6 w-16 h-16 bg-orbe-green text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform shadow-orbe-green/40 border-4 border-white"
                >
                  <Plus size={32} />
                </button>

                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-orbe-tan scrollbar-track-transparent">
                  {/* VISTA DESKTOP: TABLA */}
                  <table className="hidden md:table min-w-[1100px] w-full text-left border-collapse">
                    <thead className="bg-[#fcfaf7] border-b border-orbe-tan/30 sticky top-0 z-10 whitespace-nowrap">
                      <tr>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Name</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Owner (Follow-up)</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orbe-tan/20 text-sm whitespace-nowrap">
                      {filteredClients.length === 0 ? (
                        <tr key="empty-db-row">
                          <td colSpan={9} className="p-20 text-center text-gray-400 font-medium italic">
                            No records found in client list.
                          </td>
                        </tr>
                      ) : (
                        filteredClients.map(c => {
                          const pipelineItem = pipeline.find(p => String(p.client_id) === String(c.id));
                          return (
                            <tr key={c.id} className="hover:bg-orbe-cream/30 transition-colors group">
                              <td className="p-5 font-mono text-xs text-gray-400">#{c.id}</td>
                              <td className="p-5 font-bold text-orbe-green">{c.company}</td>
                              <td className="p-5 text-gray-600 font-medium">{c.contact_person}</td>
                              <td className="p-5">
                                <a href={`mailto:${c.email}`} className="text-orbe-green/70 hover:underline flex items-center gap-2">
                                  <Mail size={12} /> {c.email || '-'}
                                </a>
                              </td>
                              <td className="p-5 text-gray-500 font-mono text-xs">{c.mobile || '-'}</td>
                              <td className="p-5 text-gray-500 font-mono text-xs">{c.phone || '-'}</td>
                              <td className="p-5">
                                <select 
                                  value={c.status || 'Potential'}
                                  onChange={(e) => handleUpdateClient(c.id, { status: e.target.value })}
                                  className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest border outline-none cursor-pointer transition-all ${
                                    c.status === 'Client' ? 'bg-green-50 text-green-700 border-green-100' : 
                                    c.status === 'Fail' ? 'bg-red-50 text-red-700 border-red-100' :
                                    'bg-gray-100 text-orbe-green border-gray-200'
                                  }`}
                                >
                                  <option value="Potential">Potential</option>
                                  <option value="Client">Client</option>
                                  <option value="Fail">Fail</option>
                                </select>
                              </td>
                              <td className="p-5 text-center">
                                {pipelineItem ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-black text-orbe-green bg-orbe-tan/20 px-3 py-1 rounded-full uppercase tracking-wider">
                                      {pipelineItem.owner}
                                    </span>
                                    <span className="text-[8px] font-bold text-gray-400 italic">In Follow-up</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2">
                                     <span className="text-[9px] font-bold text-red-400 uppercase">Unassigned</span>
                                     <button 
                                      onClick={() => {
                                        setAssigningClient(c);
                                        setAssigningOwner('');
                                        setShowAssignConfirm(false);
                                      }}
                                      className="bg-orbe-green text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest hover:opacity-90 shadow-sm transition-all"
                                    >
                                      Start Follow-up
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="p-5 text-center">
                                <button 
                                  onClick={() => setEditingClient(c)}
                                  className="p-2 bg-orbe-green/10 text-orbe-green rounded-lg hover:bg-orbe-green hover:text-white transition-all shadow-sm"
                                  title="Edit Client"
                                >
                                  <Settings size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* VISTA MÓVIL: CARDS (Database) */}
                  <div className="md:hidden p-4 space-y-4 mobile-cards-container">
                    {filteredClients.length === 0 ? (
                      <div className="py-20 text-center text-gray-400 font-medium italic bg-[#f9f7f4] rounded-2xl border-2 border-dashed border-orbe-tan/30">
                        No clients matching your search.
                      </div>
                    ) : (
                      filteredClients.map(c => {
                        const pipelineItem = pipeline.find(p => String(p.client_id) === String(c.id));
                        return (
                          <div key={`db-mob-${c.id}`} className="bg-white rounded-2xl border border-orbe-tan/40 shadow-sm overflow-hidden flex flex-col active:bg-orbe-cream/10 transition-all">
                            <div className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-2">
                                  <h4 className="font-black text-orbe-green text-lg leading-tight truncate uppercase tracking-tighter">{c.company}</h4>
                                  <div className="flex items-center gap-2 mt-1 text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-none">
                                    <UserCircle size={10} /> {c.contact_person || 'No contact'}
                                  </div>
                                </div>
                                <div className={`shrink-0 px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-tighter border ${
                                  c.status === 'Client' ? 'bg-green-50 text-green-700 border-green-100' : 
                                  c.status === 'Fail' ? 'bg-red-50 text-red-700 border-red-100' :
                                  'bg-gray-50 text-orbe-green border-orbe-tan'
                                }`}>
                                  {c.status || 'Potencial'}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <a href={`mailto:${c.email}`} className="bg-gray-50 py-2 px-3 rounded-lg border border-orbe-tan/20 flex items-center justify-center gap-2 group active:bg-orbe-tan/10 transition-colors">
                                  <Mail size={14} className="text-orbe-tan group-active:text-orbe-green transition-colors" />
                                  <span className="text-[9px] font-black text-orbe-green/70 uppercase tracking-widest">Email</span>
                                </a>
                                <a href={`tel:${c.mobile || c.phone}`} className="bg-gray-50 py-2 px-3 rounded-lg border border-orbe-tan/20 flex items-center justify-center gap-2 group active:bg-orbe-tan/10 transition-colors">
                                  <PhoneCall size={14} className="text-orbe-tan group-active:text-orbe-green transition-colors" />
                                  <span className="text-[9px] font-black text-orbe-green/70 uppercase tracking-widest">Call</span>
                                </a>
                              </div>
                            </div>
                            <div className="bg-orbe-cream/20 px-4 py-3 border-t border-orbe-tan/20 flex justify-between items-center">
                              {pipelineItem ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-orbe-green flex items-center justify-center text-white text-[9px] font-black">
                                    {pipelineItem.owner[0]}
                                  </div>
                                  <span className="text-[10px] font-black text-orbe-green uppercase tracking-tighter">{pipelineItem.owner}</span>
                                </div>
                              ) : (
                                <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Unassigned</span>
                              )}
                              <div className="flex gap-2">
                                {!pipelineItem && (
                                  <button onClick={() => { setAssigningClient(c); setAssigningOwner(''); setShowAssignConfirm(false); }} className="px-3 py-1.5 bg-orbe-green text-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-orbe-green active:opacity-80 transition-all">Assign</button>
                                )}
                                <button onClick={() => setEditingClient(c)} className="p-2 bg-white border border-orbe-tan/30 text-orbe-green rounded-lg active:bg-orbe-tan/20 transition-all shadow-sm"><Settings size={14} /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div className="h-24" /> 
                  </div>
                </div>
                <div className="p-5 bg-gray-50 border-t border-orbe-tan/30 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                   <span>Total Records: {filteredClients.length}</span>
                   <span className="italic">Restricted Access - Read Only Information</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* MODAL EDITAR CLIENTE */}
        <AnimatePresence>
          {editingClient && (
            <div key="edit-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
              <motion.div 
                key="edit-modal-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden"
              >
                <div className="bg-orbe-green p-8 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                      <Settings className="w-6 h-6" /> Edit Information
                    </h3>
                    <p className="text-white/60 text-sm mt-1">{editingClient.company}</p>
                  </div>
                  <button onClick={() => setEditingClient(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                    <XCircle className="w-8 h-8" />
                  </button>
                </div>
                
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const updates = {
                      company: formData.get('company') as string,
                      contact_person: formData.get('contact_person') as string,
                      lead_name: formData.get('lead_name') as string,
                      email: formData.get('email') as string,
                      phone: formData.get('phone') as string,
                      mobile: formData.get('mobile') as string,
                      address: formData.get('address') as string,
                    };
                    await handleUpdateClient(editingClient.id, updates);
                    setEditingClient(null);
                  }}
                  className="p-8 space-y-6 max-h-[70vh] overflow-y-auto"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Company Name</label>
                      <input name="company" defaultValue={editingClient.company} required className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all font-semibold text-orbe-green" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Lead Name</label>
                      <input name="lead_name" defaultValue={editingClient.lead_name} required className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Contact Person</label>
                      <input name="contact_person" defaultValue={editingClient.contact_person} required className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Corporate Email</label>
                      <input name="email" type="email" defaultValue={editingClient.email} required className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Phone</label>
                        <input name="phone" defaultValue={editingClient.phone} required className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Mobile</label>
                        <input name="mobile" defaultValue={editingClient.mobile} required className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Office Address</label>
                      <textarea name="address" rows={2} defaultValue={editingClient.address} className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-lg focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setEditingClient(null)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
                      CANCEL
                    </button>
                    <button type="submit" className="flex-[2] bg-orbe-green text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                      <Save size={16} /> SAVE CHANGES
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL TASK ACCOMPLISHED */}
        <AnimatePresence>
          {taskToAccomplish && (
            <motion.div 
              key="task-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-orbe-green/60 backdrop-blur-md"
            >
              <motion.div 
                key="task-modal-content"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-orbe-tan/30"
              >
                <div className="bg-orbe-green p-6 text-white text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <h2 className="text-xl font-bold">Task Completed</h2>
                    <p className="text-white/60 text-xs uppercase tracking-widest font-bold">{taskToAccomplish.company}</p>
                  </div>
                  
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleAccomplishTask(
                        taskToAccomplish, 
                        formData.get('next_action') as string, 
                        formData.get('next_priority') as Priority,
                        formData.get('comments') as string,
                        formData.get('new_status') as PipelineStatus
                      );
                    }}
                    className="p-8 space-y-6"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Next Sales Action</label>
                      <div className="grid grid-cols-1 gap-2">
                        {PREDEFINED_ACTIONS.map(action => (
                          <label key={action} className="relative cursor-pointer">
                            <input type="radio" name="next_action" value={action} defaultChecked={action === PREDEFINED_ACTIONS[1]} className="peer hidden" required />
                            <div className="px-4 py-2 bg-gray-50 border border-orbe-tan/30 rounded-xl text-xs font-semibold text-gray-500 peer-checked:bg-orbe-green peer-checked:text-white peer-checked:border-orbe-green transition-all flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-current opacity-30" />
                               {action}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Comments / Details</label>
                      <textarea 
                        name="comments"
                        className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all text-sm min-h-[80px]"
                        placeholder="Write additional details here..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Next Step Priority</label>
                      <div className="flex gap-2">
                        {(Object.keys(PRIORITIES) as Priority[]).map(p => (
                          <label key={p} className="flex-1">
                            <input type="radio" name="next_priority" value={p} defaultChecked={p === 'Medium'} className="peer hidden" />
                            <div className="text-center py-2 rounded-lg border border-orbe-tan/30 text-[10px] font-bold text-gray-400 cursor-pointer peer-checked:bg-orbe-green peer-checked:text-white peer-checked:border-orbe-green transition-all uppercase">
                              {p}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Current Client Status</label>
                      <select 
                        name="new_status"
                        defaultValue={taskToAccomplish.status}
                        className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-xl outline-none focus:ring-2 ring-orbe-green/10 transition-all text-xs font-bold text-orbe-green uppercase"
                      >
                        {PIPELINE_STATUSES.map(status => (
                          <option key={status} value={status}>{status.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setTaskToAccomplish(null)} 
                        className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="flex-[2] py-4 bg-orbe-green text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95"
                      >
                        Confirm and Schedule
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* MODAL POSTPONE */}
        <AnimatePresence>
          {postponeItem && (
            <motion.div 
              key="postpone-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-orbe-green/40 backdrop-blur-sm"
            >
              <motion.div 
                key="postpone-modal-content"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-orbe-tan/30"
              >
                <div className="bg-orbe-green p-6 text-white text-center">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <h2 className="text-xl font-bold">Postpone Action</h2>
                  <p className="text-white/60 text-xs uppercase tracking-widest font-bold">{postponeItem.company}</p>
                </div>
                
                <div className="p-8 space-y-6">
                  {!isConfirmingPostpone ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest text-center">Select New Action Date</label>
                        <input 
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          max={(() => {
                            const d = new Date();
                            d.setMonth(d.getMonth() + 3);
                            return d.toISOString().split('T')[0];
                          })()}
                          value={postponeDate}
                          onChange={(e) => setPostponeDate(e.target.value)}
                          className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all text-sm font-bold text-orbe-green text-center"
                        />
                        <p className="mt-2 text-[9px] text-gray-400 text-center italic">Limit: Next 3 months</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => {
                            if (!postponeDate) {
                              alert("Please select a date.");
                              return;
                            }
                            setIsConfirmingPostpone(true);
                          }}
                          className="w-full py-4 bg-orbe-green text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Save size={14} />
                          Continue
                        </button>
                        <button 
                          onClick={() => {
                            setPostponeItem(null);
                            setPostponeDate('');
                            setIsConfirmingPostpone(false);
                          }} 
                          className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-6 py-2">
                      <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-100">
                        <AlertCircle size={32} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-orbe-green">Confirm rescheduling?</h3>
                        <p className="text-sm text-gray-500">
                          You are about to postpone this action until <span className="font-black text-orbe-green">{formatDateSafe(postponeDate, { day: '2-digit', month: 'long', year: 'numeric' })}</span>.
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-3 pt-4">
                        <button 
                          onClick={() => handlePostponeTask(postponeItem, postponeDate)}
                          className="w-full py-4 bg-orbe-green text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95"
                        >
                          YES, CONFIRM
                        </button>
                        <button 
                          onClick={() => setIsConfirmingPostpone(false)}
                          className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                          NO, GO BACK
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL HISTORIAL */}
        <AnimatePresence>
          {selectedClientForHistory && (
            <motion.div 
              key="history-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-orbe-green/40 backdrop-blur-sm"
            >
              <motion.div 
                key="history-modal-content"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-orbe-tan/30"
              >
                <div className="bg-orbe-green p-6 text-white flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">{selectedClientForHistory.company}</h2>
                    <p className="text-white/60 text-xs uppercase tracking-widest font-bold">Interaction Log</p>
                  </div>
                  <button 
                    onClick={() => setSelectedClientForHistory(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-all text-white/60 hover:text-white"
                  >
                    <PlusCircle size={24} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  {/* Añadir Nota */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-orbe-tan/30">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Add Note / Follow-up</label>
                    <div className="flex gap-2">
                      <textarea 
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1 p-3 bg-white border border-orbe-tan/50 rounded-lg text-sm outline-none focus:ring-2 ring-orbe-green/10 transition-all min-h-[80px]"
                        placeholder="Write interaction details here..."
                      />
                      <button 
                        onClick={() => {
                          if (newNote.trim()) {
                            addHistoryEntry(selectedClientForHistory.id, 'note', newNote);
                            setNewNote('');
                          }
                        }}
                        className="bg-orbe-green text-white px-4 rounded-lg font-bold text-xs hover:opacity-90 transition-all flex flex-col items-center justify-center gap-1"
                      >
                        <PlusCircle size={16} />
                        SAVE
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {loadingHistory ? (
                      <div key="loading-history" className="py-10 text-center text-gray-400 italic">Loading log...</div>
                    ) : clientHistory.length === 0 ? (
                      <div key="no-history" className="py-10 text-center text-gray-400 italic">No previous records.</div>
                    ) : (
                      clientHistory.map((item) => (
                        <div key={item.id} className="relative pl-8 border-l-2 border-orbe-tan/30 last:border-l-0 pb-6">
                          <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                            item.type === 'status_change' ? 'bg-orange-400' : 
                            item.type === 'priority_change' ? 'bg-red-500' : 
                            item.type === 'note' ? 'bg-orbe-green' : 'bg-gray-400'
                          }`}></div>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black text-orbe-green/40 uppercase tracking-widest">
                              {formatDateTimeSafe(item.created_at)}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded italic">
                              By {item.created_by}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-orbe-green/80">
                            {item.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* SYSTEM STATUS BAR */}
      <footer className="fixed bottom-0 left-64 right-0 bg-white/80 backdrop-blur-md border-t border-orbe-tan/30 py-2 px-8 flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest z-10">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            System Active
          </span>
          <span>Protocol OrBe v1.02</span>
        </div>
        <div className="flex gap-6">
          <span>{formatDateSafe(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span className="text-orbe-green opacity-50 underline decoration-orbe-tan">OrBe Gastronómico LTD</span>
        </div>
      </footer>
    </div>
  );
}
