/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Users, LayoutDashboard, Database, PlusCircle, Plus,
  Search, AlertCircle, CheckCircle, CheckCircle2, Calendar, 
  UserCircle, Mail, Phone, MapPin, ChevronRight, PhoneCall,
  Filter, MoreHorizontal, LogOut, Briefcase, Clock, CheckSquare,
  Settings, Save, XCircle, History, ArrowLeft, Loader2, Star,
  Mic, MicOff, Leaf, Eye, EyeOff, ShieldCheck, Target, Zap, ArrowUpDown,
  Edit2, AlertTriangle, Trash2, MessageSquare, BarChart, BarChart3, PieChart, TrendingUp, Layers, Building2, Globe, ZapOff, CalendarOff, ShieldAlert, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { supabase, supabaseUrl, supabaseAnonKey } from './lib/supabase';

const config = { 
  url: supabaseUrl, 
  key: supabaseAnonKey, 
  isValid: supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder')
};

const USERS = ['All', 'Juanjo', 'Alejandro'] as const;
type User = typeof USERS[number];

const PRIORITIES = {
  'Urgent': 1,
  'High': 2,
  'Medium': 7,
  'Low': 15,
  'Contact in 1 month': 30,
  'Postpone': 60
} as const;

const PREDEFINED_ACTIONS = [
  'Send email',
  'Send email with catalogue',
  'Call',
  'WhatsApp/IG message',
  'Visit',
  'Meeting',
  'Drop samples'
] as const;

const PIPELINE_STATUSES = [
  'Not interested',
  '1st contact',
  'Baking off',
  'Grajales',
  'Client'
] as const;

type PipelineStatus = typeof PIPELINE_STATUSES[number];
type Priority = keyof typeof PRIORITIES;
type PredefinedAction = typeof PREDEFINED_ACTIONS[number];

interface Client {
  client_id: string | number;
  company_name: string;
  contact_name: string;
  lead_name: string;
  email: string;
  phone: string;
  mobile: string;
  address_line_1: string;
  website?: string;
  pipeline_stage?: string;
  industry?: string;
  country?: string;
  city?: string;
  postal_code?: string;
  notes?: string;
  client_type?: 'Potential client' | 'Client' | 'Temporary Discarded';
  created_at?: string;
  product_interest_tags?: string[];
}

interface PipelineItem {
  id: string | number;
  client_id: string | number;
  company_name?: string; 
  client_status?: string; 
  client_type?: string; // Added to store relationship for filtering
  owner_id: User;
  status: PipelineStatus;
  last_contact_date: string;
  samples_sent: string;
  last_activity: string;
  notes?: string;
  priority: Priority;
  next_action_date: string;
  action_status: 'Pending' | 'Done' | string;
  created_at?: string;
}

const PRODUCT_INTEREST_TAGS = [
  'olive_oil',
  'anchovies',
  'seafood_preserves',
  'iberico_ham',
  'iberico_lomo',
  'iberico_charcuterie',
  'nuts',
  'premium_crisps'
] as const;

type ProductTag = typeof PRODUCT_INTEREST_TAGS[number];

const PRODUCT_TAG_LABELS: Record<ProductTag, string> = {
  olive_oil: 'Olive Oil',
  anchovies: 'Anchovies',
  seafood_preserves: 'Seafood Preserves',
  iberico_ham: 'Ibérico Ham',
  iberico_lomo: 'Ibérico Lomo',
  iberico_charcuterie: 'Ibérico Charcuterie',
  nuts: 'Nuts',
  premium_crisps: 'Premium Crisps'
};

const getProductTagLabel = (tag: string) => {
  return PRODUCT_TAG_LABELS[tag as ProductTag] || tag;
};

const renderProductTags = (clientTags: string[] | undefined, maxVisible = 3) => {
  if (!clientTags || clientTags.length === 0) {
    return (
      <span className="text-[8px] text-gray-400/60 font-bold uppercase tracking-widest italic select-none">No product tags</span>
    );
  }

  const visibleTags = clientTags.slice(0, maxVisible);
  const remainingCount = clientTags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleTags.map((tag) => (
        <span 
          key={tag} 
          className="text-[8px] bg-orbe-tan/10 text-orbe-green px-2 py-0.5 rounded-md border border-orbe-tan/30 uppercase font-black tracking-tighter whitespace-nowrap"
        >
          {getProductTagLabel(tag)}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="text-[8px] text-orbe-green font-black bg-orbe-tan/20 px-1.5 py-0.5 rounded-md border border-orbe-tan/40">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

interface OrbeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'blue' | 'amber';
  mobileMode?: 'fullscreen' | 'bottom-sheet';
  modalKey?: string;
}

const OrbeModal = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  icon, 
  children, 
  footer, 
  size = 'md', 
  variant = 'default',
  mobileMode = 'bottom-sheet',
  modalKey = 'modal'
}: OrbeModalProps) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-7xl'
  };

  const variantClasses = {
    default: 'bg-orbe-green',
    success: 'bg-green-600',
    warning: 'bg-amber-600',
    amber: 'bg-amber-500',
    danger: 'bg-red-600',
    blue: 'bg-blue-600'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        key={`${modalKey}-overlay`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-orbe-green/40 backdrop-blur-sm"
      />
      <motion.div 
        key={`${modalKey}-content`}
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className={`bg-white w-full ${sizeClasses[size]} rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-orbe-tan/30 max-h-[90vh] z-10 ${mobileMode === 'fullscreen' ? 'h-full md:h-auto mt-0' : 'mt-auto md:mt-0'}`}
      >
        {/* Header */}
        <div className={`${variantClasses[variant]} p-5 md:p-6 text-white flex justify-between items-center shrink-0`}>
          <div className="flex flex-1 items-center gap-3 overflow-hidden">
            {icon && <div className="p-2 bg-white/10 rounded-xl shrink-0">{icon}</div>}
            <div className="overflow-hidden">
              <h3 className="text-xl md:text-2xl font-bold italic tracking-tight truncate">{title}</h3>
              {subtitle && <p className="text-white/60 text-[10px] md:text-xs font-medium tracking-widest uppercase mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white shrink-0 ml-2">
            <XCircle size={28} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-orbe-tan/40 scrollbar-track-transparent">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 md:p-6 bg-gray-50 border-t border-orbe-tan/20 shrink-0">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
};

const PIPELINE_STAGE_CARDS = [
  '1st contact',
  'Pending',
  'Baking off',
  'Grajales',
  'Client',
  'Not interested',
  'No status',
  'Other'
] as const;

const PIPELINE_ACTION_CARDS = [
  'Send email',
  'Send email with catalogue',
  'Call',
  'WhatsApp/IG message',
  'Visit',
  'Meeting',
  'Drop samples',
  'No action',
  'Other'
] as const;

const getRawPipelineStage = (p: Partial<PipelineItem>) => {
  const raw = String(p.client_status || p.status || '').trim();
  return raw || 'No status';
};

const normalizePipelineStage = (stage: string) => {
  const s = String(stage || '').trim().toLowerCase();

  if (!s || s === 'no status') return 'No status';

  if (['1st contact', 'first contact', 'first_contact', 'new lead', 'new', 'contactado'].includes(s)) return '1st contact';

  if (['pending', 'follow up', 'follow-up', 'awaiting response', 'seguimiento iniciado', 'seguimiento'].includes(s)) return 'Pending';

  if (['baking off', 'baking-off', 'bakingoff'].includes(s)) return 'Baking off';

  if (['grajales'].includes(s)) return 'Grajales';

  if (['client', 'customer', 'won'].includes(s)) return 'Client';

  if (['not interested', 'lost', 'disqualified', 'temporary discarded', 'discarded', 'temp discarded'].includes(s)) return 'Not interested';

  return 'Other';
};

const normalizeActionType = (value: string) => {
  const v = String(value || '').toLowerCase().trim();
  if (v.includes('email with catalogue') || v.includes('catalogue') || v.includes('catalog')) return 'Send email with catalogue';
  if (v.includes('email')) return 'Send email';
  if (v.includes('call') || v.includes('llamada')) return 'Call';
  if (v.includes('meeting') || v.includes('reunion') || v.includes('reunión')) return 'Meeting';
  if (v.includes('whatsapp') || v.includes('instagram') || v === 'ig' || v.includes('ig message')) return 'WhatsApp/IG message';
  if (v.includes('visit') || v.includes('visita')) return 'Visit';
  if (v.includes('sample') || v.includes('muestra')) return 'Drop samples';
  return 'Other';
};

const getRawPipelineAction = (p: Partial<PipelineItem>) => {
  const raw = String(p.last_activity || (p as any).last_action || '').trim();
  return raw || 'No action';
};

const normalizePipelineAction = (action: string) => {
  const a = String(action || '').trim().toLowerCase();

  if (!a || a === 'no action') return 'No action';

  if (['send email', 'email', 'send mail'].includes(a)) return 'Send email';

  if ([
    'send email with catalogue',
    'email with catalogue',
    'send catalogue',
    'catalogue email',
    'send catalog',
    'send email with catalog'
  ].includes(a)) return 'Send email with catalogue';

  if (['call', 'phone call', 'llamada'].includes(a)) return 'Call';

  if ([
    'whatsapp/ig message',
    'whatsapp',
    'ig message',
    'instagram message',
    'whatsapp message'
  ].includes(a)) return 'WhatsApp/IG message';

  if (['visit', 'visita'].includes(a)) return 'Visit';

  if (['meeting', 'reunion', 'reunión'].includes(a)) return 'Meeting';

  if ([
    'drop samples',
    'samples',
    'sample drop',
    'samples delivered',
    'entrega muestras',
    'muestras'
  ].includes(a)) return 'Drop samples';

  if ([
    'seguimiento iniciado',
    'follow up started',
    'follow-up started',
    'review inactive lead'
  ].includes(a)) return 'Other';

  return 'Other';
};

interface HistoryEntry {
  id: string | number;
  client_id: string | number;
  type: 'status_change' | 'note' | 'system' | 'priority_change';
  last_activity: string;
  notes?: string;
  next_action_date: string;
  created_at: string;
  created_by: string;
}

const safeKey = (prefix: string, value: any, index?: number) => {
  const clean = String(value ?? '').trim();
  return `${prefix}-${clean || 'unknown'}${index !== undefined ? `-${index}` : ''}`;
};

const getPipelineKey = (item: PipelineItem, prefix = 'pipeline', index?: number) => {
  const id = String(item?.id ?? '').trim();
  if (id) return `${prefix}-${id}`;
  return `${prefix}-${item?.client_id || 'no-client'}-${item?.next_action_date || 'no-date'}-${item?.last_activity || 'no-activity'}-${index ?? 'no-index'}`;
};

const getClientKey = (client: Client, prefix = 'client', index?: number) => {
  const id = String((client as any)?.id ?? client?.client_id ?? '').trim();
  if (id) return `${prefix}-${id}`;
  return `${prefix}-${client?.company_name || 'no-company'}-${index ?? 'no-index'}`;
};

const MOCK_CLIENTS: Client[] = [
  { client_id: 1, company_name: 'Tech Solutions SL', contact_name: 'Ana García', lead_name: 'Lead Orbe A', email: 'ana@tech.com', phone: '600111222', mobile: '699000111', address_line_1: 'Calle Falsa 123', client_type: 'Potential client' },
  { client_id: 2, company_name: 'Construcciones Orbe', contact_name: 'Luis Perez', lead_name: 'Lead Orbe B', email: 'luis@orbe.es', phone: '655333444', mobile: '688222333', address_line_1: 'Av. Principal 45', client_type: 'Client' },
  { client_id: 3, company_name: 'Digital Marketing Inc', contact_name: 'Elena Rius', lead_name: 'Lead Orbe C', email: 'elena@dm.com', phone: '677888999', mobile: '611444555', address_line_1: 'Business Park B', client_type: 'Temporary Discarded' }
];

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [view, setView] = useState<'pipeline' | 'new' | 'database' | 'control' | 'weekly'>('pipeline');
  const [dashboardTab, setDashboardTab] = useState<'priorities' | 'overview' | 'activity'>('overview');
  const [selectedPostponedList, setSelectedPostponedList] = useState<{ owner: string; items: PipelineItem[] } | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{ type: string; label: string; items: any[] } | null>(null);
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

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<Client | null>(null);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  const normalizeName = (name: string) => {
    return (name || '').toLowerCase().replace(/[\s\-\.]/g, '');
  };

  const getLevenshteinDistance = (a: string, b: string): number => {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  };

  const calculateSimilarity = (a: string, b: string): number => {
    const normA = normalizeName(a);
    const normB = normalizeName(b);
    if (normA === normB) return 1;
    
    const distance = getLevenshteinDistance(normA, normB);
    const maxLength = Math.max(normA.length, normB.length);
    return 1 - distance / maxLength;
  };

  const checkDuplicateClient = async (companyName: string): Promise<Client | null> => {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase.from('clients').select('client_id, company_name').neq('client_type', 'deleted');
      if (error) throw error;

      for (const client of (data || [])) {
        const similarity = calculateSimilarity(companyName, client.company_name);
        if (similarity >= 0.8) {
          return client as Client;
        }
      }
    } catch (err) {
      console.error("Error checking duplicates:", err);
    }
    return null;
  };

  const executeSaveClient = async (payload: any) => {
    setIsSaving(true);
    try {
      if (!supabase) {
        const newId = clients.length + 1;
        setClients(prev => [...prev, { client_id: newId, ...payload } as any]);
        alert('Demo Mode: Client saved locally');
        setView('database');
        return;
      }

      const { data: inserted, error } = await supabase.from('clients').insert([payload]).select();
      if (error) throw error;
      
      if (inserted && inserted[0]) {
        addHistoryEntry(inserted[0].client_id || inserted[0].id, 'system', 'Client registered in system');
      }

      alert('Client successfully registered in database');
      fetchClients();
      setView('database');
    } catch (err: any) {
      console.error(err);
      alert('Error saving data: ' + err.message);
    } finally {
      setIsSaving(false);
      setShowDuplicateModal(false);
      setDuplicateMatch(null);
      setPendingPayload(null);
    }
  };

  const handleDeleteClient = async (clientId: string | number) => {
    if (!clientId) {
      alert("Error: Client ID is missing. Cannot delete.");
      return;
    }

    setIsSaving(true);
    try {
      if (!supabase) {
        setClients(prev => prev.filter(c => String(c.client_id) !== String(clientId) && String(c.id) !== String(clientId)));
        alert('Demo Mode: Client removed locally');
        setEditingClient(null);
        return;
      }

      // Soft Delete: Update client_type to 'deleted'
      const { error: error1 } = await supabase.from('clients').update({ client_type: 'deleted' }).eq('client_id', clientId);
      
      let finalError = error1;
      if (error1) {
        const { error: error2 } = await supabase.from('clients').update({ client_type: 'deleted' }).eq('id', clientId);
        finalError = error2;
      }

      if (finalError) throw finalError;

      alert(`Client ${clientId} moved to trash!`);
      setEditingClient(null);
      fetchClients();
    } catch (err: any) {
      console.error("Delete operation failed:", err);
      alert('Error deleting client: ' + (err.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAccountTags = async (clientId: string | number, tags: string[]) => {
    if (!supabase) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ product_interest_tags: tags })
        .eq('client_id', clientId);
      if (error) throw error;
      setClients(prev => prev.map(c => 
        String(c.client_id) === String(clientId) ? { ...c, product_interest_tags: tags } : c
      ));
    } catch (err: any) {
      console.error('Error updating tags:', err);
      alert('Error updating tags: ' + err.message);
    } finally {
      setIsSaving(false);
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
  const [overviewDateRange, setOverviewDateRange] = useState<string>('All time');
  const [overviewOwnerFilter, setOverviewOwnerFilter] = useState<User>('All');
  const [overviewClientTypeFilter, setOverviewClientTypeFilter] = useState<string>('All client types');
  
  // Weekly Priorities window state
  const [weeklyDateRange, setWeeklyDateRange] = useState<string>('Next 7 days');
  const [weeklyActionTypeFilter, setWeeklyActionTypeFilter] = useState<string>('All actions');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingClientTags, setEditingClientTags] = useState<string[]>([]);
  const [productTagFilter, setProductTagFilter] = useState<string>('All products');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Potential client' | 'Client' | 'Temporary Discarded'>('Potential client');
  const [taskToAccomplish, setTaskToAccomplish] = useState<PipelineItem | null>(null);
  const [postponeItem, setPostponeItem] = useState<PipelineItem | null>(null);
  const [editingItem, setEditingItem] = useState<PipelineItem | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeReason, setPostponeReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'action_date' | 'last_contact'>('priority');
  const [accomplishDate, setAccomplishDate] = useState('');
  const [accomplishAction, setAccomplishAction] = useState('');
  const [isConfirmingPostpone, setIsConfirmingPostpone] = useState(false);
  const [pipelineColumns, setPipelineColumns] = useState<string[]>([]);
  const [selectedActivityList, setSelectedActivityList] = useState<{ owner: string, days: number, items: PipelineItem[] } | null>(null);
  const [timelineSellerFilter, setTimelineSellerFilter] = useState<User>('All');
  const [commandSellerFilter, setCommandSellerFilter] = useState<User>('All');
  const [timelineTemperature, setTimelineTemperature] = useState<'Active' | 'Warning' | 'Cold'>('Cold');
  const [showDeleteModal, setShowDeleteModal] = useState<string | number | null>(null);
  const [selectedAccount360, setSelectedAccount360] = useState<Client | null>(null);
  const [account360Tags, setAccount360Tags] = useState<string[]>([]);

  useEffect(() => {
    if (selectedAccount360) {
      setAccount360Tags(selectedAccount360.product_interest_tags || []);
    } else {
      setAccount360Tags([]);
    }
  }, [selectedAccount360]);

  // Wizard estados para asignación
  const [assigningClient, setAssigningClient] = useState<Client | null>(null);
  const [assigningOwner, setAssigningOwner] = useState<'Alejandro' | 'Juanjo' | ''>('');
  const [showAssignConfirm, setShowAssignConfirm] = useState(false);

  // Estados para el formulario de nuevo cliente (controlados para IA)
  const [newClientForm, setNewClientForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    mobile: '',
    address_line_1: '',
    notes: ''
  });
  const [newClientTags, setNewClientTags] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const isValidOwner = (owner: any) => {
    const normalized = String(owner || '').trim().toLowerCase();
    return normalized === 'juanjo' || normalized === 'alejandro';
  };

  const assignedClientIds = useMemo(() => {
    return new Set(
      pipeline
        .filter(p => isValidOwner(p.owner_id))
        .map(p => String(p.client_id))
    );
  }, [pipeline]);

  useEffect(() => {
    localStorage.setItem('orbe_user', currentUser);
    fetchClients();
  }, [currentUser]);

  useEffect(() => {
    if (selectedClientForHistory) {
      fetchClientHistory(selectedClientForHistory.client_id || (selectedClientForHistory as any).id);
    } else {
      setClientHistory([]);
    }
  }, [selectedClientForHistory]);

  useEffect(() => {
    if (editingClient) {
      setEditingClientTags(editingClient.product_interest_tags || []);
    } else {
      setEditingClientTags([]);
    }
  }, [editingClient]);

  const parseFlexibleDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    
    // Format DD/MM/YYYY
    if (str.includes('/') && !str.includes('T') && !str.includes('-')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    
    // Format ISO or YYYY-MM-DD
    let normalized = str;
    if (normalized.includes(' ') && !normalized.includes('T')) {
      normalized = normalized.replace(' ', 'T');
    }
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  };

  // --- ROLLING DATE HELPERS ---
  const getToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  };

  const normalizeStatus = (val: string | null | undefined) => String(val || '').trim().toLowerCase();
  const isDone = (status: string | null | undefined) => normalizeStatus(status) === 'done';

  const normalizeSamplesStatus = (val: string | null | undefined) => {
    const s = String(val || '').trim().toLowerCase();
    if (['yes', 'y', 'si', 'sí', 'all', 'sent', 'samples sent'].includes(s)) return 'sent';
    if (['no', 'n', '', 'null', 'undefined', '-'].includes(s)) return 'not_sent_or_unknown';
    return 'other';
  };

  const getMainPipelineRecord = (records: PipelineItem[]) => {
    if (!records || records.length === 0) return null;
    const activeRecords = records.filter(r => !isDone(r.action_status));
    if (activeRecords.length > 0) {
      return [...activeRecords].sort((a, b) => {
        const dateA = new Date(a.next_action_date || 0).getTime();
        const dateB = new Date(b.next_action_date || 0).getTime();
        return dateA - dateB;
      })[0];
    }
    return [...records].sort((a, b) => {
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      if (idB !== idA) return idB - idA;
      const dateA = new Date(a.created_at || a.last_contact_date || 0).getTime();
      const dateB = new Date(b.created_at || b.last_contact_date || 0).getTime();
      return dateB - dateA;
    })[0];
  };

  const isOverdue = (dateStr: string | null | undefined, actionStatus?: string | null | undefined) => {
    if (isDone(actionStatus)) return false;
    const d = parseFlexibleDate(dateStr);
    if (!d) return false;
    return d < getToday();
  };

  const isDueToday = (dateStr: string | null | undefined, actionStatus?: string | null | undefined) => {
    if (isDone(actionStatus)) return false;
    const d = parseFlexibleDate(dateStr);
    if (!d) return false;
    const today = getToday();
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear();
  };

  const isWithinNextDays = (dateStr: string | null | undefined, days: number, actionStatus?: string | null | undefined) => {
    if (isDone(actionStatus)) return false;
    const d = parseFlexibleDate(dateStr);
    if (!d) return false;
    const today = getToday();
    const limit = new Date(today);
    limit.setDate(limit.getDate() + days);
    return d >= today && d <= limit;
  };

  const isWithinLastDays = (dateStr: string | null | undefined, days: number) => {
    const d = parseFlexibleDate(dateStr);
    if (!d) return false;
    const today = getToday();
    const limit = new Date(today);
    limit.setDate(limit.getDate() - days);
    // Para historial suele ser (limit <= d <= today+1day_end)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d >= limit && d < tomorrow;
  };

  const isMissingNextActionDate = (p: PipelineItem) => {
    if (isDone(p.action_status)) return false;
    const status = getEffectivePipelineStage(p);
    if (isClosedPipelineStage(status)) return false;
    return !p.next_action_date;
  };
  // --- END ROLLING HELPERS ---

  const getClientCompanyName = (clientId: string | number, fallback?: string) => {
    const client = clients.find(c => String(c.client_id) === String(clientId) || String((c as any).id) === String(clientId));
    return client?.company_name || fallback || 'Unknown company';
  };

  const isClosedPipelineStage = (stage: any) => {
    const s = String(stage || '').trim().toLowerCase();
    return [
      'not interested',
      'lost',
      'disqualified',
      'temporary discarded',
      'discarded'
    ].includes(s);
  };

  const getEffectivePipelineStage = (item: PipelineItem) => {
    return String(item.client_status || item.status || '').trim();
  };

  const logPipelineActivity = async (
    pipelineId: string | number | null,
    clientId: string | number,
    companyName: string,
    activityType: string,
    description: string,
    metadata: any = {}
  ) => {
    if (!supabase || !session?.user) return;

    try {
      const auditEntry = {
        pipeline_id: pipelineId ? String(pipelineId) : null,
        client_id: String(clientId),
        company_name: companyName,
        user_id: session.user.id,
        user_email: session.user.email,
        activity_type: activityType,
        activity_description: description,
        metadata: metadata,
        activity_date: new Date().toISOString()
      };

      // 1. Insert into activity log (invisible)
      const { error: logError } = await supabase.from('pipeline_activity_log').insert([auditEntry]);
      if (logError) console.error("Error logging pipeline activity:", logError);

      // 2. Update pipeline row with user tracking info if pipelineId exists
      if (pipelineId) {
        const { error: updateError } = await supabase.from('pipeline').update({
          user_id: session.user.id,
          last_user_activity_at: new Date().toISOString()
        }).eq('id', pipelineId);
        
        if (updateError) console.error("Error updating pipeline user activity:", updateError);
      }
    } catch (err) {
      console.error("Critical error in logPipelineActivity:", err);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    // Limpiar formulario al cambiar de vista si es necesario, 
    // pero aquí lo usamos para asegurar que el estado inicial es limpio
    if (view === 'database') {
      setNewClientForm({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        mobile: '',
        address_line_1: '',
        notes: ''
      });
      setNewClientTags([]);
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
        .select('*')
        .neq('client_type', 'deleted');
      
      if (clientsError) throw clientsError;

      // 2. Cargar Items del Pipeline
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipeline')
        .select('*');
      
      // LOG DE DIAGNÓSTICO: Ver las columnas reales de la tabla
      if (pipelineData && pipelineData.length > 0) {
        const keys = Object.keys(pipelineData[0]);
        setPipelineColumns(keys);
      }

      // Permitir que la tabla pipeline no exista todavía sin romper la app, pero avisar
      if (pipelineError && !pipelineError.message.includes('relation "pipeline" does not exist')) {
        throw pipelineError;
      }

      setDbError(null);

      // Sanear Clientes
      const sanitizedClients = (clientsData || []).map((c: any) => ({
        client_id: c.client_id || c.id || c.ID || c.n || c.N,
        company_name: c.company_name || c.Company || c.Empresa || c.empresa || 'Empresa sin nombre',
        contact_name: c.contact_name || c.contact_person || c['Contact name'] || c['Contact Name'] || c.persona_contacto || c['Nombre del Contacto'] || c['Persona de contacto'] || '',
        lead_name: c.lead_name || c.lead || c.Lead || c.Referencia || c['Lead Name'] || '',
        email: c.email || c.Email || c['Correo Electrónico'] || c['Correo electrónico'] || c.correo || '',
        phone: c.phone || c['Teléfono'] || c.telefono || '',
        mobile: c.mobile || c['Móvil'] || c.movil || '',
        address_line_1: c.address_line_1 || c.address || c['Dirección'] || c.direccion || c.Adress || '',
        website: c.website || c['Sitio web'] || c['Sitio Web'] || '',
        pipeline_stage: c.pipeline_stage || c.status_possible || c['Estado de Posible cliente'] || '',
        industry: c.industry || c.sector || c.Sector || '',
        country: c.country || c.location || c.Location || '',
        city: c.city || c.Ciudad || '',
        postal_code: c.postal_code || c['Código postal'] || '',
        notes: c.notes || c.description || c.desc || c.Descripción || c.Descripcion || '',
        client_type: c.client_type || c.client_status || c.status || c.Status || 'Potential client',
        product_interest_tags: c.product_interest_tags || [],
        created_at: c.created_at
      }));

      // Sanear Pipeline y vincular con compañía
      const sanitizedPipeline = (pipelineData || [])
        .map((p: any) => {
          const cId = p.client_id || p.id_cliente || p.ID_CLIENTE || p.cliente_id;
          const relatedClient = sanitizedClients.find(c => String(c.client_id) === String(cId));
          
          if (!relatedClient && supabase) return null; // Filtrar items sin cliente (p.ej. eliminados)
          
          const dbOwner = p.owner_id || p.owner || p.Owner || p.assigned_to || p.assigned_to_user || p.operador || p.dueño;
        const dbPriority = p.priority || p.Priority || p.prioridad || 'Medium';
        const dbStatus = p.client_status || p.status || p.Status || p.estado || 'Pending';

        // Identificar fechas con múltiples fallbacks y validación estricta usando parseFlexibleDate
        const rawLastContact = p.last_contact_date || p['last contact date'] || p.last_contact || p.fecha_contacto || p.updated_at || p.created_at;
        const parsedLastContact = parseFlexibleDate(rawLastContact);
        const lastContact = parsedLastContact ? parsedLastContact.toISOString() : new Date().toISOString();

        const rawActionDate = p.next_action_date || p['actions date'] || p['action date'] || p.action_date || p.fecha_accion || p.next_step;
        const parsedActionDate = parseFlexibleDate(rawActionDate);
        // Do not auto-calculate if missing to preserve pipeline gaps
        const actionDateVal = parsedActionDate ? parsedActionDate.toISOString() : '';

        const dbActionStatus = p.action_status || p['action status'] || p['Action Status'] || p['Action status'] || p.estado_accion || 'Pending';
        const dbCreatedAt = p.created_at || p['created at'] || p['Created At'] || p.inserted_at || p.fecha_creacion || p.timestamp || p.date_created || p.created;

        return {
          id: p.id || p.ID || p.n || p.N,
          client_id: cId,
          company_name: relatedClient?.company_name || 'Cliente Desconocido',
          client_status: dbStatus, // Corrected: Use dbStatus for pipeline stage
          status: dbStatus,
          client_type: relatedClient?.client_type || 'Potential client', // Preservation of account type
          owner_id: (dbOwner || currentUser) as User,
          last_contact_date: lastContact,
          samples_sent: p.samples_sent || p.samples || p.Samples || p.muestras || '-',
          last_activity: p.last_activity || p.last_action || p.LastAction || p.accion || 'Seguimiento iniciado',
          notes: p.notes || p.notas || '',
          priority: dbPriority as Priority,
          next_action_date: actionDateVal,
          action_status: dbActionStatus,
          created_at: dbCreatedAt
        };
      }).filter((item): item is PipelineItem => item !== null);
      
      // Ordenar pipeline por fecha de acción
      sanitizedPipeline.sort((a, b) => {
        const dateA = new Date(a.next_action_date).getTime();
        const dateB = new Date(b.next_action_date).getTime();
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

  const OrbeLogo = ({ className = "w-full h-full", invert = false }) => (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className={`w-full h-full ${invert ? 'text-white' : 'text-orbe-green'}`} fill="currentColor">
        {/* Laurel Wreath Left */}
        <path d="M40 80c-5-2-10-6-13-11-3-5-5-10-5-16 0-3 1-5 2-8l1-3 2-4c2-4 5-7 8-10l3-3 2-1c2-1 4-1 6-1h2l-2 3c-1 2-2 4-3 7l-1 4v4l1 4 2 4c1 2 3 4 5 6l4 3 2 1c1 1 2 2 3 3l-4 1c-3 1-5 2-8 3l-4 1h-4l4-2c3-1 6-3 8-5l3-2h-5c-4 0-8 1-11 3l-3 2-2 2-2 3c-1 2-2 4-2 7s1 5 2 7c1 2 3 4 5 6l3 3 4 2 4 1-5 1c-5 0-10-1-14-3z" />
        {/* Laurel Wreath Right */}
        <path d="M60 80c5-2 10-6 13-11 3-5 5-10 5-16 0-3-1-5-2-8l-1-3-2-4c-2-4-5-7-8-10l-3-3-2-1c-2-1-4-1-6-1h-2l2 3c1 2 2 4 3 7l1 4v4l-1 4-2 4c-1 2-3 4-5 6l-4 3-2 1c-1 1-2 2-3 3l4 1c3 1 5 2 8 3l4 1h4l-4-2c-3-1-6-3-8-5l-3-2h5c4 0 8 1 11 3l3 2 2 2 2 3c1 2 2 4 2 7s-1 5-2 7c-1 2-3 4-5 6l-3 3-4 2-4 1 5 1c5 0 10-1 14-3z" />
        {/* center circle */}
        <circle cx="50" cy="50" r="1.5" />
      </svg>
    </div>
  );

  const formatDateSafe = (dateStr: string | undefined | null, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: '2-digit' }, fallback = '-') => {
    const d = parseFlexibleDate(dateStr);
    if (!d) return fallback;
    try {
      return d.toLocaleDateString('en-GB', options);
    } catch {
      return fallback;
    }
  };

  const formatDateTimeSafe = (dateStr: string | undefined | null, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }, fallback = 'No date') => {
    const d = parseFlexibleDate(dateStr);
    if (!d) return fallback;
    try {
      return d.toLocaleString('en-GB', options);
    } catch {
      return fallback;
    }
  };

  const toISODateOnly = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    const d = parseFlexibleDate(dateStr);
    if (!d) return '';
    return d.toISOString().split('T')[0];
  };

  const getStatusBadge = (date: string) => {
    const d = parseFlexibleDate(date);
    if (!d) return <span className="text-[10px] text-gray-300 italic">No date</span>;
    
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
    if (!clientId) return;
    setLoadingHistory(true);
    setClientHistory([]);

    try {
      if (!supabase) {
        console.warn("Supabase not initialized");
        setLoadingHistory(false);
        return;
      }

      // 1. Query Agresiva: Intentar por varios métodos para encontrar registros
      let finalData: any[] = [];
      
      // Intento A: client_id como número (más común para IDs internos)
      const { data: dataNum } = await supabase
        .from('pipeline')
        .select('*')
        .eq('client_id', isNaN(Number(clientId)) ? -1 : Number(clientId))
        .order('id', { ascending: false });
      
      if (dataNum && dataNum.length > 0) finalData = [...dataNum];
      
      // Intento B: client_id como string (por si el esquema varió)
      const { data: dataStr } = await supabase
        .from('pipeline')
        .select('*')
        .eq('client_id', String(clientId))
        .order('id', { ascending: false });
      
      if (dataStr && dataStr.length > 0) {
        // Unir evitando duplicados por ID físico
        const existingIds = new Set(finalData.map(d => d.id));
        dataStr.forEach(d => {
          if (!existingIds.has(d.id)) finalData.push(d);
        });
      }

      // Intento C: Por nombre de compañía si todavía no hay nada (fallback desesperado)
      if (finalData.length === 0 && selectedClientForHistory?.company_name) {
        const { data: dataCompany } = await supabase
          .from('pipeline')
          .select('*')
          .eq('company_name', selectedClientForHistory.company_name)
          .order('id', { ascending: false });
        if (dataCompany && dataCompany.length > 0) finalData = dataCompany;
      }

      // 2. Mapeo de campos ultra-resiliente basado en las capturas reales de Supabase
      const historyRecords: HistoryEntry[] = finalData.map((item, index) => ({
        id: item.id || `hist-${index}`,
        client_id: item.client_id || clientId,
        type: 'note',
        // Fallbacks: La imagen muestra last_contact_date, pero el usuario pidió last_activity
        last_activity: item.last_activity || item.last_action || item.activity || item.last_contact_date || 'Actividad registrada',
        // La imagen muestra la columna 'notes'
        notes: item.notes || item.notas || '',
        // Fechas
        next_action_date: item.next_action_date || item.last_contact_date || item.created_at || new Date().toISOString(),
        created_at: item.created_at || item.last_contact_date || new Date().toISOString(),
        // Quién lo hizo
        created_by: item.owner || item.assigned_to || item.owner_id || 'Sistema'
      }));

      // Ordenar por ID descendente para que lo más nuevo en el pipeline (mayor ID) salga arriba
      historyRecords.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

      setClientHistory(historyRecords);
    } catch (err) {
      console.error("Error crítico recuperando historial:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const addHistoryEntry = async (clientId: string | number, type: HistoryEntry['type'], last_activity: string, notes?: string, extraData?: any) => {
    const entry: any = {
      client_id: clientId,
      type,
      last_activity,
      notes: notes || '',
      next_action_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      created_by: currentUser || session?.user?.email || 'Sistema'
    };

    if (extraData) {
      Object.assign(entry, extraData);
    }

    // Siempre actualizamos localmente para feedback inmediato (ID temporal alto para que salga arriba)
    setClientHistory(prev => [ { id: Date.now(), ...entry } as HistoryEntry, ...prev]);

    if (!supabase) return;

    try {
      // 1. Guardar en client_history (si existe)
      try {
        await supabase.from('client_history').insert([entry]);
      } catch (e) {
        console.warn("Could not save to client_history, continuing...");
      }

      // 2. IMPORTANTÍSIMO: Guardar en 'pipeline' para que el nuevo Log (que lee de pipeline) lo vea
      const companyName = getClientCompanyName(clientId);
      const pipelineEntry: any = {
        client_id: clientId,
        company_name: companyName,
        company: companyName, // Redundant fallback for different schemas
        last_activity: last_activity,
        notes: notes || '',
        next_action_date: entry.next_action_date,
        owner: entry.created_by,
        action_status: 'Done', // Marcamos como Done para que no cree una nueva tarjeta en el tablero
        user_id: session?.user?.id,
        last_user_activity_at: new Date().toISOString()
      };

      // Si tenemos datos del cliente original, los incluimos para mantener integridad
      const originalClient = clients.find(c => String(c.client_id) === String(clientId));
      if (originalClient) {
        pipelineEntry.company = originalClient.company_name;
        pipelineEntry.client_status = originalClient.client_type;
      }

      const { data: insertedData, error: insertError } = await supabase.from('pipeline').insert([pipelineEntry]).select();
      
      if (!insertError && insertedData && insertedData[0]) {
        logPipelineActivity(
          insertedData[0].id,
          clientId,
          companyName,
          'notes_updated',
          `History entry added: ${last_activity}`,
          { type, source: 'addHistoryEntry' }
        );
      }
      
    } catch (e) {
      console.error("Error saving entry to pipeline:", e);
    }
  };

  const handleUpdateClient = async (id: string | number, updates: Partial<Client>) => {
    if (!supabase) {
      setClients(prev => prev.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c));
      return;
    }

    try {
      setIsSaving(true);
      
      // Intentar encontrar el cliente original para saber qué columnas ID usar
      const originalClient = clients.find(c => String(c.id) === String(id));
      
      const dbUpdates: any = {};
      
      // We only use columns that are highly likely to exist based on common patterns
      // avoiding 'Company', 'Adress', etc. which caused PGRST204 errors.
      if (updates.company_name !== undefined) dbUpdates.company_name = updates.company_name;
      if (updates.contact_name !== undefined) dbUpdates.contact_name = updates.contact_name;
      if (updates.lead_name !== undefined) dbUpdates.lead_name = updates.lead_name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.mobile !== undefined) dbUpdates.mobile = updates.mobile;
      
      const addr = (updates as any).address || updates.address_line_1;
      if (addr !== undefined) {
        // Try both common naming conventions but we'll catch errors if they fail
        dbUpdates.address_line_1 = addr;
      }

      if (updates.notes !== undefined) {
        dbUpdates.notes = updates.notes;
      }
      
      if (updates.client_type !== undefined) {
        dbUpdates.client_type = updates.client_type;
        // Some systems use 'status' or 'client_status', but we'll stick to client_type 
        // as the user confirmed this is the one.
      }

      if (updates.product_interest_tags !== undefined) {
        dbUpdates.product_interest_tags = updates.product_interest_tags;
      }
      
      console.log("Supabase Update Attempt Payload:", dbUpdates);
      
      const idCols = ['client_id', 'id', 'ID'];
      let success = false;
      let lastError: any = null;

      const idsToTry = [id, String(id)];
      if (!isNaN(Number(id))) idsToTry.push(Number(id));
      
      const uniqueIds = Array.from(new Set(idsToTry));

      for (const col of idCols) {
        for (const targetId of uniqueIds) {
          try {
            const { data, error } = await supabase.from('clients')
              .update(dbUpdates)
              .eq(col, targetId)
              .select();
            
            if (!error && data && data.length > 0) {
              console.log(`Update SUCCESS with ${col}=${targetId}`);
              success = true;
              break;
            }
            if (error) {
              lastError = error;
              // If it's a column error, we might want to try a version without that column
              // but for now we just log it and try next ID/Col
              console.warn(`Update error with ${col}=${targetId}:`, error.message);
            }
          } catch (e) {
            lastError = e;
          }
        }
        if (success) break;
      }

      // If multiple columns failed, it might be because one of the update fields is missing
      // Let's try a fallback: only update the client_type if the first attempt failed
      if (!success && updates.client_type) {
        console.log("Full update failed. Trying to update ONLY client_type...");
        for (const col of idCols) {
          for (const targetId of uniqueIds) {
            const { data, error } = await supabase.from('clients')
              .update({ client_type: updates.client_type })
              .eq(col, targetId)
              .select();
            if (!error && data && data.length > 0) {
              success = true;
              break;
            }
          }
          if (success) break;
        }
      }

      if (!success) {
        throw lastError || new Error("Could not update client. No rows were affected.");
      }
      
      await fetchClients();
    } catch (err: any) {
      console.error("Supabase Error Update:", err);
      const msg = err.message || (err.error?.message) || 'Unknown Database Error';
      alert(`Database Error: ${msg}\n\nPlease contact support if this persists.`);
      throw err; 
    } finally {
      setIsSaving(false);
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
      updates.next_action_date = baseDate.toISOString();
    }

    if (!supabase) {
      setPipeline(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      return;
    }

    try {
      const fullUpdates = {
        ...updates,
        user_id: session?.user?.id,
        last_user_activity_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('pipeline').update(fullUpdates).eq('id', id);
      if (error) throw error;

      // Log the changes
      if (existingItem) {
        const company = getClientCompanyName(existingItem.client_id, existingItem.company_name);
        
        // Log individual field changes as requested
        if (updates.status && updates.status !== existingItem.status) {
          logPipelineActivity(id, existingItem.client_id, company, 'status_changed', `Status changed from ${existingItem.status} to ${updates.status}`, { old: existingItem.status, new: updates.status });
        }
        if (updates.priority && updates.priority !== existingItem.priority) {
          logPipelineActivity(id, existingItem.client_id, company, 'priority_changed', `Priority changed from ${existingItem.priority} to ${updates.priority}`, { old: existingItem.priority, new: updates.priority });
        }
        if (updates.owner_id && updates.owner_id !== existingItem.owner_id) {
          logPipelineActivity(id, existingItem.client_id, company, 'owner_changed', `Owner changed from ${existingItem.owner_id} to ${updates.owner_id}`, { old: existingItem.owner_id, new: updates.owner_id });
        }
        if (updates.last_activity && updates.last_activity !== existingItem.last_activity) {
          logPipelineActivity(id, existingItem.client_id, company, 'last_activity_changed', `Activity changed from ${existingItem.last_activity} to ${updates.last_activity}`, { old: existingItem.last_activity, new: updates.last_activity });
        }
        if (updates.next_action_date && updates.next_action_date !== existingItem.next_action_date) {
          logPipelineActivity(id, existingItem.client_id, company, 'next_action_date_changed', `Next action date changed from ${existingItem.next_action_date} to ${updates.next_action_date}`, { old: existingItem.next_action_date, new: updates.next_action_date });
        }
        if (updates.action_status && updates.action_status !== existingItem.action_status) {
          logPipelineActivity(id, existingItem.client_id, company, 'action_status_changed', `Action status changed from ${existingItem.action_status} to ${updates.action_status}`, { old: existingItem.action_status, new: updates.action_status });
        }
        if (updates.samples_sent && updates.samples_sent !== existingItem.samples_sent) {
          logPipelineActivity(id, existingItem.client_id, company, 'samples_sent_updated', `Samples sent status updated from ${existingItem.samples_sent} to ${updates.samples_sent}`, { old: existingItem.samples_sent, new: updates.samples_sent });
        }
        if (updates.notes && updates.notes !== existingItem.notes) {
          logPipelineActivity(id, existingItem.client_id, company, 'notes_updated', `Pipeline notes updated`, { source: 'handleUpdatePipeline' });
        }
      }

      fetchClients();
    } catch (err) {
      console.error("Error updating pipeline:", err);
    }
  };

  const handlePostponeTask = async (item: PipelineItem, newDate: string, reason: string) => {
    if (!supabase) {
      const entryId = Date.now();
      setPipeline(prev => [...prev, { 
        ...item, 
        id: entryId, 
        next_action_date: newDate,
        action_status: 'Postpone',
        notes: reason,
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
    
    // Explicitly inherit owner from the current item to ensure persistence
    const currentOwner = (item.owner_id && item.owner_id !== 'All') ? item.owner_id : (currentUser === 'All' ? 'Juanjo' : currentUser);
    setMapping(['owner_id', 'owner', 'operador', 'assigned_to'], currentOwner);
    
    setMapping(['client_status', 'status', 'estado', 'Status'], item.client_status);
    setMapping(['last_activity', 'last_action', 'accion', 'LastAction'], item.last_activity);
    setMapping(['priority', 'prioridad', 'Priority'], item.priority);
    setMapping(['samples_sent', 'samples', 'muestras', 'Samples'], item.samples_sent);
    setMapping(['last_contact_date', 'fecha_contacto', 'last_contact'], new Date().toISOString());
    setMapping(['company_name', 'company', 'Empresa'], getClientCompanyName(item.client_id, item.company_name));
    setMapping(['notes', 'notas'], reason);

    // Datos específicos de la posposición
    setMapping(['next_action_date', 'actions date', 'action_date', 'fecha_accion'], newDate);
    setMapping(['action_status', 'action status'], 'Postpone');

    try {
      // 1. Marcar la acción actual como 'done'
      const oldCol = cols.find(c => ['action_status', 'action status'].includes(c)) || 'action_status';
      const updateData: any = { 
        [oldCol]: 'Done',
        user_id: session?.user?.id,
        last_user_activity_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('pipeline')
        .update(updateData)
        .eq('id', item.id);
      
      if (updateError) {
        console.warn("Retrying update mark as done with alternative column names");
        const altCol = oldCol === 'action_status' ? 'action status' : 'action_status';
        await supabase.from('pipeline').update(updateData).eq('id', item.id);
      }

      // 2. Insertar la nueva acción como 'postpone'
      payload.user_id = session?.user?.id;
      payload.last_user_activity_at = new Date().toISOString();
      
      const { data: insertedData, error: insertError } = await supabase.from('pipeline').insert([payload]).select();
      if (insertError) throw insertError;
      
      if (insertedData && insertedData[0]) {
        logPipelineActivity(
          insertedData[0].id,
          item.client_id,
          getClientCompanyName(item.client_id, item.company_name),
          'action_postponed',
          `Action postponed until ${formatDateSafe(newDate)}`,
          { old_date: item.next_action_date, new_date: newDate, reason }
        );
      }
      
      addHistoryEntry(item.client_id, 'note', `Acción pospuesta hasta el ${formatDateSafe(newDate)}`, reason);
      setPostponeItem(null);
      setPostponeDate('');
      setPostponeReason('');
      setIsConfirmingPostpone(false);
      fetchClients();
    } catch (err: any) {
      console.error("Error al posponer:", err);
      alert(`Error al posponer: ${err.message}`);
    }
  };

  const calculatePriority = (status: PipelineStatus, action: string): Priority => {
    const s = status as string;
    const a = action.toLowerCase();

    if (s === 'Not interested') return 'Low';

    if (s === 'Client') {
      if (a.includes('email') || a.includes('call') || a.includes('whatsapp') || a.includes('ig')) return 'Medium';
      if (a.includes('visit') || a.includes('meeting') || a.includes('samples')) return 'High';
      return 'Medium';
    }

    if (s === 'Grajales') {
      if (a.includes('call') || a.includes('whatsapp') || a.includes('ig') || a.includes('visit') || a.includes('samples') || a.includes('meeting')) return 'Urgent';
      if (a.includes('email')) return 'High';
      return 'Urgent';
    }

    if (s === 'Baking off') {
      if (a.includes('call') || a.includes('whatsapp') || a.includes('ig') || a.includes('visit') || a.includes('meeting')) return 'High';
      if (a.includes('email')) return 'Medium';
      return 'High';
    }

    if (s === '1st contact' || s === 'Potential client') {
      if (a.includes('visit') || a.includes('meeting')) return 'High';
      if (a.includes('call') || a.includes('whatsapp') || a.includes('ig')) return 'Medium';
      if (a.includes('email')) return 'Low';
      return 'Medium';
    }

    return 'Medium';
  };

  const handleAccomplishTask = async (prevItem: PipelineItem, nextAction: string, nextDate: string, comments: string, newStatus?: PipelineStatus) => {
    const statusForPriority = newStatus || prevItem.status;
    const nextPriority = calculatePriority(statusForPriority, nextAction);

    if (!supabase) {
      const entryId = Date.now();
      setPipeline(prev => {
        const updated = prev.map(p => p.id === prevItem.id ? { ...p, 'action status': 'Done' } : p);
        return [...updated, { 
          client_id: prevItem.client_id, 
          owner: currentUser === 'All' ? 'Juanjo' : currentUser, 
          status: statusForPriority, 
          last_action: nextAction, 
          priority: nextPriority,
          "actions date": nextDate,
          "action status": 'Pending',
          id: entryId,
          company_name: prevItem.company_name,
          created_at: new Date().toISOString()
        } as any];
      });
      addHistoryEntry(prevItem.client_id, 'note', `Tarea Completada (Módulo Demo). Siguiente paso: ${nextAction} - ${comments}`);
      setTaskToAccomplish(null);
      return;
    }

    const now = new Date().toISOString();

    // Asegurar que tenemos columnas detectadas
    let cols = pipelineColumns;
    if (cols.length === 0) {
      const { data } = await supabase.from('pipeline').select('*').limit(1);
      if (data && data[0]) cols = Object.keys(data[0]);
    }

    const clientCompany = getClientCompanyName(prevItem.client_id, prevItem.company_name);

    const payload: any = {};
    
    // Mapeo exhaustivo dirigido: busca la columna correcta en el esquema real
    const setMapping = (candidates: string[], value: any) => {
      const col = candidates.find(c => cols.includes(c));
      if (col) payload[col] = value;
      else if (cols.length === 0) payload[candidates[0]] = value; // Fallback razonable
    };

    setMapping(['client_id', 'id_cliente', 'cliente_id', 'ID_CLIENTE'], prevItem.client_id);
    
    // Explicitly inherit owner from the previous task to ensure persistence
    const currentOwner = (prevItem.owner_id && prevItem.owner_id !== 'All') ? prevItem.owner_id : (currentUser === 'All' ? 'Juanjo' : currentUser);
    setMapping(['owner_id', 'owner', 'operador', 'assigned_to'], currentOwner);
    
    setMapping(['client_status', 'status', 'estado', 'Status'], statusForPriority);
    setMapping(['last_activity', 'last_action', 'accion', 'LastAction'], nextAction);
    setMapping(['priority', 'prioridad', 'Priority'], nextPriority);
    setMapping(['next_action_date', 'actions date', 'action_date', 'fecha_accion'], nextDate);
    setMapping(['last_contact_date', 'fecha_contacto', 'last_contact'], now);
    setMapping(['samples_sent', 'samples', 'muestras', 'Samples'], prevItem.samples_sent);
    
    // Columnas físicas detectadas
    setMapping(['company_name', 'company', 'Empresa'], clientCompany);
    setMapping(['notes', 'notas'], comments.trim());

    if (isClosedPipelineStage(statusForPriority)) {
      setMapping(['action status', 'action_status'], 'Done');
      setMapping(['priority', 'prioridad', 'Priority'], 'Low');
      // No next action date if closed
      payload.next_action_date = null;
      if (cols.includes('actions date')) payload['actions date'] = null;
      if (cols.includes('action_date')) payload['action_date'] = null;
    } else {
      setMapping(['action status', 'action_status'], 'Pending');
    }

    try {
      // 1. Marcar el registro anterior como 'Done'
      const oldCol = cols.find(c => ['action status', 'action_status'].includes(c)) || 'action status';
      const updateData: any = { 
        [oldCol]: 'Done',
        user_id: session?.user?.id,
        last_user_activity_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase.from('pipeline').update(updateData).eq('id', prevItem.id);
      if (updateError) console.warn("No se pudo marcar la tarea anterior como Done:", updateError);

      // 2. Actualizar el status del cliente en la tabla 'clients'
      if (newStatus) {
        // ... (existing logic for clients update remains same)
        const clientIdCol = clients.length > 0 && Object.keys(clients[0]).includes('client_id') ? 'client_id' : 'id';
        
        // Determinar el client_type (tipo de cuenta) basado en el nuevo stage
        let finalClientType = 'Potential client';
        const s = String(newStatus).toLowerCase();
        if (s === 'client' || s === 'customer') {
          finalClientType = 'Client';
        } else if (s.includes('discard') || s.includes('interest') || s === 'fail') {
          finalClientType = 'Not interested';
        } else {
          // Si es un stage intermedio (Grajales, Baking off, etc.), mantenemos el tipo original si es posible
          const currentClient = clients.find(c => String(c.client_id) === String(prevItem.client_id));
          finalClientType = currentClient?.client_type || 'Potential client';
        }

        await supabase.from('clients').update({ 
          client_type: finalClientType
        }).eq(clientIdCol, prevItem.client_id);
      }

      // 3. Insertar el nuevo registro como 'Pending'
      payload.user_id = session?.user?.id;
      payload.last_user_activity_at = new Date().toISOString();
      
      const { data: insertedData, error } = await supabase.from('pipeline').insert([payload]).select();
      if (error) throw error;
      
      if (insertedData && insertedData[0]) {
        logPipelineActivity(
          insertedData[0].id,
          prevItem.client_id,
          clientCompany,
          'action_completed',
          `Task completed: ${prevItem.last_activity}. Next: ${nextAction}`,
          { 
            prev_status: prevItem.status, 
            new_status: statusForPriority,
            next_date: nextDate
          }
        );
        
        // Log status change if happened
        if (newStatus && newStatus !== prevItem.status) {
          logPipelineActivity(
            insertedData[0].id,
            prevItem.client_id,
            clientCompany,
            'status_changed',
            `Status changed from ${prevItem.status} to ${newStatus}`,
            { old_status: prevItem.status, new_status: newStatus }
          );
        }
      }
      
      // Guardar log detallado en client_history
      addHistoryEntry(
        prevItem.client_id, 
        'note', 
        nextAction, // La acción realizada
        comments, // Las notas detalladas
        { 
          status: statusForPriority,
          prev_action: prevItem.last_activity || ''
        }
      );

      setTaskToAccomplish(null);
      setAccomplishDate('');
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

  const handleEditTask = async (id: string | number, clientId: string | number, updates: { last_activity: string, status: PipelineStatus, notes: string }) => {
    const isClosed = isClosedPipelineStage(updates.status);
    const priority = isClosed ? 'Low' : calculatePriority(updates.status, updates.last_activity);
    
    try {
      const finalNotes = isClosed 
        ? `${updates.notes}\n\n[System: Account marked as ${updates.status} - Closed operatively]`
        : updates.notes;

      // 1. Actualizar el registro en 'pipeline'
      const pipelineUpdates: any = {
        last_activity: updates.last_activity,
        client_status: updates.status,
        priority: priority,
        notes: finalNotes,
        user_id: session?.user?.id,
        last_user_activity_at: new Date().toISOString()
      };

      if (isClosed) {
        const actionCol = pipelineColumns.find(c => ['action status', 'action_status'].includes(c)) || 'action_status';
        pipelineUpdates[actionCol] = 'Done';
        
        const dateCol = pipelineColumns.find(c => ['next_action_date', 'actions date', 'action_date', 'fecha_accion'].includes(c)) || 'next_action_date';
        pipelineUpdates[dateCol] = null;
      }

      // Handle potential column variations
      if (pipelineColumns.includes('last_action')) pipelineUpdates.last_action = updates.last_activity;
      if (pipelineColumns.includes('status')) pipelineUpdates.status = updates.status;

      const { error: pipeError } = await supabase.from('pipeline').update(pipelineUpdates).eq('id', id);

      if (pipeError) throw pipeError;

      // Log the edit
      logPipelineActivity(
        id,
        clientId,
        getClientCompanyName(clientId),
        'notes_updated',
        `Manual edit performed. Action: ${updates.last_activity}`,
        { updates }
      );

      // Check for specific changes to log
      const originalItem = pipeline.find(p => String(p.id) === String(id));
      if (originalItem) {
        if (originalItem.status !== updates.status) {
          logPipelineActivity(id, clientId, getClientCompanyName(clientId), 'status_changed', `Status changed from ${originalItem.status} to ${updates.status}`, { old: originalItem.status, new: updates.status });
        }
        if (originalItem.priority !== priority) {
          logPipelineActivity(id, clientId, getClientCompanyName(clientId), 'priority_changed', `Priority changed from ${originalItem.priority} to ${priority}`, { old: originalItem.priority, new: priority });
        }
        if (originalItem.last_activity !== updates.last_activity) {
          logPipelineActivity(id, clientId, getClientCompanyName(clientId), 'last_activity_changed', `Activity changed from ${originalItem.last_activity} to ${updates.last_activity}`, { old: originalItem.last_activity, new: updates.last_activity });
        }
      }

      addHistoryEntry(clientId, 'note', `Registro editado manualmente. Nuevo status: ${updates.status}, Acción: ${updates.last_activity}, Prioridad: ${priority}`, updates.notes);
      
      setEditingItem(null);
      fetchClients();
    } catch (err: any) {
      console.error("Error updating task:", err);
      alert("Error saving changes. Please try again.");
    }
  };

  const handleStartFollowup = async (client: Client, selectedOwner: string) => {
    if (!supabase) {
      alert(`Seguimiento iniciado para ${client.company_name} asignado a ${selectedOwner} (Modo Demo)`);
      // Update local state for demo
      const entryId = Date.now();
      setPipeline(prev => [...prev, { 
        client_id: client.client_id, 
        id: entryId, 
        owner_id: selectedOwner as any,
        client_status: 'Pending',
        last_activity: 'Seguimiento iniciado',
        priority: 'High',
        next_action_date: calculateActionDate('High'),
        last_contact_date: new Date().toISOString(),
        samples_sent: '-',
        company_name: client.company_name
      } as any]);
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

    setMapping(['client_id', 'id_cliente', 'cliente_id', 'ID_CLIENTE'], client.client_id);
    setMapping(['owner_id', 'owner', 'operador', 'assigned_to'], selectedOwner);
    setMapping(['client_status', 'status', 'estado', 'Status'], 'Pending');
    setMapping(['last_activity', 'last_action', 'accion', 'LastAction'], 'Seguimiento iniciado');
    setMapping(['priority', 'prioridad', 'Priority'], 'High');
    setMapping(['next_action_date', 'actions date', 'action_date', 'fecha_accion'], calculateActionDate('High'));
    setMapping(['last_contact_date', 'fecha_contacto', 'last_contact'], new Date().toISOString());
    setMapping(['samples_sent', 'samples', 'muestras', 'Samples'], '-');
    setMapping(['company_name', 'company', 'Empresa'], client.company_name);
    setMapping(['action_status', 'action status'], 'Pending');

    try {
      payload.user_id = session?.user?.id;
      payload.last_user_activity_at = new Date().toISOString();
      
      const { data: insertedData, error } = await supabase.from('pipeline').insert([payload]).select();
      if (error) throw error;
      
      if (insertedData && insertedData[0]) {
        logPipelineActivity(
          insertedData[0].id,
          client.client_id,
          client.company_name,
          'pipeline_created',
          `New follow-up started by ${selectedOwner}`,
          { owner: selectedOwner }
        );
      }
      
      addHistoryEntry(client.client_id, 'note', `Seguimiento académico iniciado por ${selectedOwner}`);
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

      // Try multiple ways to get the API key (platform standard, Vite standard, and global process)
      const apiKey = 
        (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : null) || 
        (import.meta as any).env?.VITE_GEMINI_API_KEY ||
        (import.meta as any).env?.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please ensure GEMINI_API_KEY is set in your environment.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
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

      if (!response.text) {
        throw new Error("No text extracted from the card.");
      }

      console.log("Extraction successful:", response.text);
      const extracted = JSON.parse(response.text);
      
      // Pre-rellenar formulario manteniendo lo que ya esté si no se encontró nada nuevo
      setNewClientForm(prev => ({
        ...prev,
        company_name: extracted.company || prev.company_name,
        contact_name: extracted.contact_name || prev.contact_name,
        email: extracted.email || prev.email,
        phone: extracted.phone || prev.phone,
        mobile: extracted.mobile || prev.mobile,
        address_line_1: extracted.address || prev.address_line_1
      }));

      alert("Scan completed successfully. Please review the extracted data.");
    } catch (err: any) {
      console.error("Error scanning card:", err);
      alert(`Error scanning card: ${err.message || 'Unknown error'}. Please fill details manually.`);
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
        .map((result: any) => result && result[0] ? result[0] : { transcript: '' })
        .map((result: any) => result.transcript)
        .join('');
      
      setNewClientForm(prev => ({
        ...prev,
        notes: transcript
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
          const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY;
          if (!apiKey) throw new Error("An API Key must be set (VITE_GEMINI_API_KEY)");
          const ai = new GoogleGenAI({ apiKey });
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

    // Filtro crítico: Solo acciones PENDING o POSTPONE, EXCLUYENDO leads cerrados
    filtered = filtered.filter(p => {
      const actionStatus = String(p.action_status || p['action status'] || '').toLowerCase().trim();
      const isOperational = actionStatus === 'pending' || actionStatus === 'postpone' || actionStatus === 'postponed' || actionStatus === '';
      if (!isOperational) return false;

      // Excluir si el stage es cerrado (Not interested, etc.)
      const stage = getEffectivePipelineStage(p);
      return !isClosedPipelineStage(stage);
    });

    if (currentUser === 'All') {
      filtered = filtered.filter(p => 
        ['juanjo', 'alejandro'].includes(String(p.owner_id || '').toLowerCase().trim())
      );
    } else if (currentUser !== 'Orbe Admin') {
      filtered = filtered.filter(p => 
        String(p.owner_id || '').toLowerCase().trim() === currentUser.toLowerCase().trim()
      );
    }

    // 2. Filtrar por término de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        (p.company_name?.toLowerCase() || '').includes(search)
      );
    }

    // 3. Colapsar por cliente: Solo la acción PENDING (normalmente debería ser solo una)
    // Si hay varias, priorizamos la más ANTIGUA (la más urgente)
    const clientMap = new Map<string, PipelineItem>();
    
    filtered.forEach(item => {
      const clientId = String(item.client_id);
      const currentActionDate = item.next_action_date;
      
      const parseDateVal = (d: string) => {
        const parsed = parseFlexibleDate(d);
        return parsed ? parsed.getTime() : 0;
      };

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, item);
      } else {
        const existing = clientMap.get(clientId)!;
        // Priorizar la más antigua (más urgente) si hay duplicados pendientes
        if (parseDateVal(currentActionDate) < parseDateVal(existing.next_action_date)) {
          clientMap.set(clientId, item);
        }
      }
    });

    // 4. Filtrar por Status semántico del cliente (columna client_status en tabla clients)
    let finalItems = Array.from(clientMap.values());
    if (statusFilter !== 'All') {
      finalItems = finalItems.filter(item => {
        // Use client_type for account type filtering (Potential vs Client vs Discarded)
        // client_status now contains the commercial stage (pipeline stage)
        const cType = String(item.client_type || 'Potential client').toLowerCase().trim();
        const fStatus = String(statusFilter).toLowerCase().trim();
        
        if (fStatus === 'not interested') {
          return cType.includes('discard') || cType.includes('interest') || cType.includes('fail') || cType.includes('disqual');
        }
        if (fStatus === 'potential client') {
          return cType.includes('potential') || cType.includes('prospect') || cType === 'new';
        }
        if (fStatus === 'client') {
          return cType === 'client' || cType === 'customer' || cType === 'won';
        }
        
        return cType === fStatus;
      });
    }

    // 5. Ordenar según selección
    const sortedResult = finalItems.sort((a, b) => {
      const parseDateVal = (d: string) => {
        const parsed = parseFlexibleDate(d);
        return parsed ? parsed.getTime() : 0;
      };

      if (sortBy === 'priority') {
        const weightA = PRIORITIES[a.priority as Priority] || 999;
        const weightB = PRIORITIES[b.priority as Priority] || 999;
        if (weightA !== weightB) return weightA - weightB;
        return parseDateVal(a.next_action_date) - parseDateVal(b.next_action_date);
      }

      if (sortBy === 'action_date') {
        const tA = parseDateVal(a.next_action_date);
        const tB = parseDateVal(b.next_action_date);
        if (tA !== tB) return tA - tB;
        const wA = PRIORITIES[a.priority as Priority] || 999;
        const wB = PRIORITIES[b.priority as Priority] || 999;
        return wA - wB;
      }

      if (sortBy === 'last_contact') {
        const tA = parseDateVal(a.last_contact_date);
        const tB = parseDateVal(b.last_contact_date);
        // Reciente arriba
        return tB - tA || (PRIORITIES[a.priority as Priority] - PRIORITIES[b.priority as Priority]);
      }

      return 0;
    });

    return sortedResult;
  }, [pipeline, currentUser, searchTerm, statusFilter, sortBy]);

  const baseFilteredClients = useMemo(() => {
    let result = clients.filter(c => 
      (c.company_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.contact_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (statusFilter !== 'All') {
      result = result.filter(c => c.client_type === statusFilter);
    }

    if (productTagFilter !== 'All products') {
      result = result.filter(c => 
        c.product_interest_tags && c.product_interest_tags.includes(productTagFilter)
      );
    }

    return result;
  }, [clients, searchTerm, statusFilter, productTagFilter]);

  const assignedInBase = useMemo(() => {
    return baseFilteredClients.filter(c => assignedClientIds.has(String(c.client_id || (c as any).id)));
  }, [baseFilteredClients, assignedClientIds]);

  const unassignedInBase = useMemo(() => {
    return baseFilteredClients.filter(c => !assignedClientIds.has(String(c.client_id || (c as any).id)));
  }, [baseFilteredClients, assignedClientIds]);

  const filteredClients = useMemo(() => {
    let result = [...baseFilteredClients];

    if (assignmentFilter === 'assigned') {
      result = assignedInBase;
    } else if (assignmentFilter === 'unassigned') {
      result = unassignedInBase;
    }

    // Apply alphabetical sort by company as default
    return result.slice().sort((a, b) => 
      (a.company_name || '').localeCompare(b.company_name || '')
    );
  }, [baseFilteredClients, assignedInBase, unassignedInBase, assignmentFilter]);

  const latestPipelineByClient = useMemo(() => {
    const map = new Map<string, PipelineItem>();

    pipeline.forEach((item) => {
      const clientId = String(item.client_id || '').trim();
      if (!clientId) return;

      const existing = map.get(clientId);

      const itemId = Number(item.id) || 0;
      const existingId = Number(existing?.id) || 0;

      if (!existing || itemId > existingId) {
        map.set(clientId, item);
      }
    });

    return Array.from(map.values());
  }, [pipeline]);

  const overviewData = useMemo(() => {
    const isDateInRange = (dateStr: string | null | undefined) => {
      if (overviewDateRange === 'All time') return true;
      if (overviewDateRange === 'Last 7 days') return isWithinLastDays(dateStr, 7);
      if (overviewDateRange === 'Last 14 days') return isWithinLastDays(dateStr, 14);
      if (overviewDateRange === 'Last 30 days') return isWithinLastDays(dateStr, 30);
      
      const d = parseFlexibleDate(dateStr);
      if (!d) return false;
      const today = getToday();
      
      if (overviewDateRange === 'This month') {
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      }
      if (overviewDateRange === 'Last month') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return d >= lastMonth && d < nextMonth;
      }
      return true;
    };

    // Build the unified dataset using ONLY the latest rows for each client
    const overviewPipelineRows = latestPipelineByClient.map(p => {
      const stage = getRawPipelineStage(p);
      const effectiveStage = normalizePipelineStage(stage);
      
      const action = getRawPipelineAction(p);
      const effectiveAction = normalizePipelineAction(action);

      const relatedClient = clients.find(c => String(c.client_id) === String(p.client_id) || String((c as any).id) === String(p.client_id));
      
      return {
        ...p,
        effectiveStage,
        effectiveAction,
        relatedClient,
        isOverdue: isOverdue(p.next_action_date, p.action_status),
        hasNoNextAction: isMissingNextActionDate(p)
      };
    }).filter(p => {
      const matchesSeller = overviewOwnerFilter === 'All' || p.owner_id === overviewOwnerFilter;
      
      // Date filter applies to the latest record's relevant date
      const matchesDate = isDateInRange(p.last_contact_date || p.created_at || p.next_action_date);
      
      let matchesType = true;
      const type = (p.relatedClient?.client_type || p.client_type || '').toLowerCase();
      if (overviewClientTypeFilter === 'Client') {
        matchesType = type === 'client' || type === 'customer';
      } else if (overviewClientTypeFilter === 'Potential client') {
        matchesType = type.includes('potential') || type.includes('prospect');
      } else if (overviewClientTypeFilter === 'Discarded') {
        matchesType = type.includes('discard') || type.includes('disqual') || type.includes('temp');
      }

      return matchesSeller && matchesDate && matchesType;
    });

    const filteredC = clients.filter(c => {
      let matchesType = true;
      const type = (c.client_type || '').toLowerCase();
      if (overviewClientTypeFilter === 'Client') {
        matchesType = type === 'client' || type === 'customer';
      } else if (overviewClientTypeFilter === 'Potential client') {
        matchesType = type.includes('potential') || type.includes('prospect');
      } else if (overviewClientTypeFilter === 'Discarded') {
        matchesType = type.includes('discard') || type.includes('disqual') || type.includes('temp');
      }
      return matchesType;
    });

    return {
      overviewPipelineRows,
      filteredC,
      totalPipeline: overviewPipelineRows.length
    };
  }, [latestPipelineByClient, clients, overviewOwnerFilter, overviewDateRange, overviewClientTypeFilter]);

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
              <div className="w-32 h-32 mb-6 relative flex items-center justify-center p-2">
                <OrbeLogo />
              </div>
              <h1 className="text-2xl font-black text-orbe-green tracking-tighter text-center uppercase leading-tight">
                Welcome to <br/> <span className="text-3xl font-serif">OrBe Serresiete</span>
              </h1>
              <div className="h-1 w-12 bg-orbe-tan mt-4 rounded-full"></div>
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
            className="flex flex-col items-center mb-10 text-center"
          >
            <div className="w-20 h-20 mb-4 flex items-center justify-center p-1">
              <OrbeLogo invert />
            </div>
            <div>
              <h1 className="text-white text-2xl font-black tracking-tighter leading-none uppercase">OrBe</h1>
              <div className="h-0.5 w-10 bg-orbe-tan mx-auto my-2"></div>
              <span className="text-[9px] text-white/40 uppercase font-bold tracking-[0.4em]">Serresiete</span>
            </div>
          </motion.div>

          <nav className="space-y-1">
            {[
              { id: 'pipeline', icon: <LayoutDashboard size={18}/>, label: 'Pipeline' },
              { id: 'database', icon: <Database size={18}/>, label: 'Database' },
              { id: 'weekly', icon: <ShieldCheck size={18}/>, label: 'Weekly Priorities' },
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
                {item.id === 'control' && pipeline.some(p => isOverdue(p.next_action_date, p.action_status)) && (
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
          onClick={() => setView('weekly')} 
          className={`flex flex-col items-center gap-1 transition-all ${view === 'weekly' ? 'text-white scale-110' : 'text-white/40'}`}
        >
          <ShieldCheck size={22} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Weekly Priorities</span>
        </button>
        <button 
          onClick={() => setView('control')} 
          className={`flex flex-col items-center gap-1 transition-all ${view === 'control' ? 'text-white scale-110' : 'text-white/40'} relative`}
        >
          <LayoutDashboard size={22} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Dashboard</span>
          {pipeline.some(p => isOverdue(p.next_action_date, p.action_status)) && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orbe-overdue rounded-full animate-pulse border border-white" />
          )}
        </button>
      </nav>

      {/* WIZARD DE ASIGNACIÓN DE SEGUIMIENTO */}
      <AnimatePresence>
        {assigningClient && (
          <OrbeModal
            isOpen={!!assigningClient}
            onClose={() => setAssigningClient(null)}
            title="Account Assignment"
            subtitle={assigningClient.company_name}
            icon={<Briefcase size={20} />}
            variant="default"
            modalKey="assign-modal"
          >
            <div className="space-y-6">
              {!showAssignConfirm ? (
                <>
                  <div className="bg-orbe-cream/30 p-6 rounded-2xl border border-orbe-tan/20 flex flex-col items-center text-center">
                    <p className="text-gray-500 text-sm font-medium">Select the team member responsible for managing this account:</p>
                    <p className="text-orbe-green font-black text-lg mt-1 truncate w-full">{assigningClient.company_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {['Alejandro', 'Juanjo'].map(name => (
                      <button
                        key={name}
                        onClick={() => {
                          setAssigningOwner(name as any);
                          setShowAssignConfirm(true);
                        }}
                        className={`p-6 rounded-2xl border-2 transition-all group flex flex-col items-center gap-3 ${
                          assigningOwner === name 
                          ? 'border-orbe-green bg-orbe-green text-white shadow-lg shadow-orbe-green/10' 
                          : 'border-orbe-tan/30 hover:border-orbe-green/50 text-orbe-green bg-gray-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${assigningOwner === name ? 'bg-white text-orbe-green' : 'bg-orbe-green/10 text-orbe-green'}`}>
                          {(name || '?')[0]}
                        </div>
                        <span className="font-bold text-sm tracking-tight">{name.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setAssigningClient(null)}
                    className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase text-[10px] tracking-widest border border-transparent hover:border-gray-200 rounded-xl"
                  >
                    Cancel assignment
                  </button>
                </>
              ) : (
                <div className="space-y-8 py-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto border border-amber-100 italic">
                    <AlertCircle size={32} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-black text-orbe-green uppercase tracking-tight">Confirm Assignment</h3>
                    <p className="text-gray-500 mt-2 font-medium">
                      Are you sure you want to assign this account to <span className="text-orbe-green font-black">{assigningOwner}</span>?
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleStartFollowup(assigningClient, assigningOwner)}
                      className="w-full bg-orbe-green text-white py-4 rounded-xl font-bold shadow-lg shadow-orbe-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-[11px] tracking-widest"
                    >
                      Yes, Assign Now
                    </button>
                    <button
                      onClick={() => setShowAssignConfirm(false)}
                      className="w-full border-2 border-orbe-tan/30 text-gray-400 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all uppercase text-[11px] tracking-widest"
                    >
                      No, go back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </OrbeModal>
        )}
      </AnimatePresence>


      {/* MODAL DE CONFIGURACIÓN DE SUPABASE */}
      <AnimatePresence>
        {showConfigWizard && (
          <OrbeModal
            isOpen={!!showConfigWizard}
            onClose={() => setShowConfigWizard(false)}
            title="Database Configuration"
            subtitle="Secure your connection to Supabase"
            icon={<Database size={20} />}
            modalKey="config-wizard-modal"
            footer={
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    localStorage.setItem('ORBE_SUPABASE_URL', wizardConfig.url);
                    localStorage.setItem('ORBE_SUPABASE_KEY', wizardConfig.key);
                    window.location.reload();
                  }}
                  className="w-full bg-orbe-green text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orbe-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Save and Establish Connection
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      localStorage.removeItem('ORBE_SUPABASE_URL');
                      localStorage.removeItem('ORBE_SUPABASE_KEY');
                      window.location.reload();
                    }}
                    className="flex-1 border border-orbe-tan/30 text-gray-400 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Reset Connection
                  </button>
                  <button 
                    onClick={() => setShowConfigWizard(false)}
                    className="flex-1 bg-gray-50 text-gray-500 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-100 transition-all"
                  >
                    Close Settings
                  </button>
                </div>
              </div>
            }
          >
            <div className="space-y-6">
              <div className="bg-orbe-cream/50 p-4 rounded-2xl border border-orbe-tan/20 flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl text-orbe-green shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-widest leading-none mb-1">Security Protocol</h4>
                  <p className="text-[11px] text-gray-500 italic">Enter the unique credentials from your Supabase Dashboard to enable cloud synchronization.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Project Interface URL</label>
                  <input 
                    type="text" 
                    value={wizardConfig.url} 
                    onChange={e => setWizardConfig({...wizardConfig, url: e.target.value})}
                    placeholder="https://su-proyecto.supabase.co"
                    className="w-full bg-white border border-orbe-tan/30 rounded-xl px-4 py-4 text-sm focus:ring-4 ring-orbe-green/5 outline-none transition-all placeholder:text-gray-300 font-medium"
                  />
                  <p className="text-[8px] text-orbe-green/40 mt-2 px-1 font-bold italic">PATH: Settings → API → Project URL</p>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Public Access Token (AnonKey)</label>
                  <textarea 
                    rows={4}
                    value={wizardConfig.key} 
                    onChange={e => setWizardConfig({...wizardConfig, key: e.target.value})}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                    className="w-full bg-white border border-orbe-tan/30 rounded-xl px-4 py-4 text-sm focus:ring-4 ring-orbe-green/5 outline-none font-mono resize-none transition-all placeholder:text-gray-300"
                  />
                  <p className="text-[8px] text-orbe-green/40 mt-2 px-1 font-bold italic">PATH: Settings → API → `anon` public key</p>
                </div>
              </div>
            </div>
          </OrbeModal>
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:hidden">
                <OrbeLogo />
              </div>
              <h2 className="text-base md:text-lg font-black text-orbe-green tracking-tighter uppercase leading-none mt-1">OrBe Serresiete</h2>
            </div>
            {/* Indicador de vista actual en móvil */}
            <div className="md:hidden px-3 py-1 bg-orbe-green/5 border border-orbe-green/10 rounded-full">
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
                  <p className="text-sm md:text-xl font-black leading-none">{baseFilteredClients.length}</p>
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
                  <p className="text-sm md:text-xl font-black leading-none">{assignedInBase.length}</p>
                </button>

                <button 
                  onClick={() => setAssignmentFilter('unassigned')}
                  className={`flex-1 md:flex-none p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-sm border text-center min-w-[70px] md:min-w-[120px] transition-all ${
                    assignmentFilter === 'unassigned'
                    ? 'bg-red-500 text-white border-red-500 shadow-red-500/20' 
                    : 'bg-white text-red-500 border-orbe-tan/40 opacity-60'
                  }`}
                >
                  <p className="text-[7px] md:text-[8px] font-bold uppercase tracking-tight opacity-70">Unass.</p>
                  <p className="text-sm md:text-xl font-black leading-none">{unassignedInBase.length}</p>
                </button>
              </>
            )}
          </div>
        </header>

        <section className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <AnimatePresence>
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
                    
                    const companyName = (newClientForm.company_name || '').trim();
                    const email = (newClientForm.email || '').trim();
                    const phone = (newClientForm.phone || '').trim();

                    // Calcular siguiente ID manual (ya que la tabla parece no tener auto-incremento)
                    const nextId = clients.length > 0 
                      ? Math.max(...clients.map(c => Number(c.client_id) || 0)) + 1 
                      : 1;

                    // Validación de requisitos indispensables
                    if (!companyName) {
                      alert('Company name is required.');
                      return;
                    }
                    if (!email && !phone) {
                      alert('You must provide at least one contact method (Email or Phone).');
                      return;
                    }

                    const payload: any = {
                      client_id: nextId,
                      company_name: companyName,
                      contact_name: newClientForm.contact_name || '',
                      lead_name: newClientForm.contact_name || '',
                      email: email,
                      phone: phone,
                      mobile: newClientForm.mobile || '',
                      address_line_1: newClientForm.address_line_1 || '',
                      notes: newClientForm.notes || '',
                      client_type: 'Potential client',
                      product_interest_tags: newClientTags
                    };

                    if (!supabase) {
                      const newId = clients.length + 1;
                      setClients(prev => [...prev, { client_id: newId, ...payload } as any]);
                      alert('Demo Mode: Client saved locally');
                      setView('database');
                      return;
                    }

                    try {
                      // 1. Verificación de Duplicados (Fuzzy Match / Normalización)
                      const potentialDuplicate = await checkDuplicateClient(companyName);
                      
                      if (potentialDuplicate) {
                        setDuplicateMatch(potentialDuplicate);
                        setPendingPayload(payload);
                        setShowDuplicateModal(true);
                        return; // Detenemos el flujo inicial hasta confirmación
                      }

                      // 2. Proceder con el guardado si no hay duplicados sospechosos
                      await executeSaveClient(payload);
                    } catch (err) {
                      console.error(err);
                      alert('Error processing request.');
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
                          value={newClientForm.company_name}
                          onChange={e => setNewClientForm({...newClientForm, company_name: e.target.value})}
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

                      {/* Product Opportunity Tags Section */}
                      <div className="col-span-2 space-y-4 pt-4 border-t border-orbe-tan/20">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-amber-500" />
                          <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-[0.2em]">Product Opportunity Tags</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {PRODUCT_INTEREST_TAGS.map(tag => {
                            const isSelected = newClientTags.includes(tag);
                            return (
                              <button
                                type="button"
                                key={tag}
                                onClick={() => {
                                  if (isSelected) {
                                    setNewClientTags(newClientTags.filter(t => t !== tag));
                                  } else {
                                    setNewClientTags([...newClientTags, tag]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all border ${
                                  isSelected 
                                    ? 'bg-orbe-green text-white border-orbe-green shadow-sm scale-105' 
                                    : 'bg-white text-orbe-green/40 border-orbe-tan/20 hover:border-orbe-green/30 hover:text-orbe-green'
                                }`}
                              >
                                {getProductTagLabel(tag)}
                              </button>
                            );
                          })}
                        </div>
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
                          value={newClientForm.address_line_1}
                          onChange={e => setNewClientForm({...newClientForm, address_line_1: e.target.value})}
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
                          value={newClientForm.notes}
                          onChange={e => setNewClientForm({...newClientForm, notes: e.target.value})}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 w-full lg:w-auto">
                    <div className="flex items-center gap-3 bg-orbe-green border border-orbe-green px-4 py-2 rounded-xl shadow-lg shadow-orbe-green/20 transition-all">
                      <ArrowUpDown size={14} className="text-white opacity-70" />
                      <span className="text-[9px] font-black text-white/60 uppercase tracking-widest border-r border-white/20 pr-3 hidden md:inline">Order by:</span>
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="flex-1 lg:flex-none text-[10px] font-black text-white uppercase tracking-wider outline-none bg-transparent cursor-pointer"
                      >
                        <option value="priority" className="bg-orbe-green text-white">PRIORITY</option>
                        <option value="action_date" className="bg-orbe-green text-white">ACTION DATE</option>
                        <option value="last_contact" className="bg-orbe-green text-white">LAST CONTACT</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 bg-orbe-green border border-orbe-green px-4 py-2 rounded-xl shadow-lg shadow-orbe-green/20 transition-all">
                      <Users size={14} className="text-white opacity-70" />
                      <span className="text-[9px] font-black text-white/60 uppercase tracking-widest border-r border-white/20 pr-3 hidden md:inline">Owner:</span>
                      <select 
                        value={currentUser} 
                        onChange={(e) => setCurrentUser(e.target.value as User)}
                        className="flex-1 lg:flex-none text-[10px] font-black text-white uppercase tracking-wider outline-none bg-transparent cursor-pointer"
                      >
                        {USERS.map(u => (
                          <option key={u} value={u} className="bg-orbe-green text-white">{u.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-1 lg:flex-1 flex items-center gap-3 bg-orbe-green border border-orbe-green px-4 py-2 rounded-xl shadow-lg shadow-orbe-green/20 transition-all">
                      <Filter size={14} className="text-white opacity-70" />
                      <span className="text-[9px] font-black text-white/60 uppercase tracking-widest border-r border-white/20 pr-3 hidden md:inline">Status:</span>
                      <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="flex-1 lg:flex-none text-[10px] font-black text-white uppercase tracking-wider outline-none bg-transparent cursor-pointer"
                      >
                        <option value="All" className="bg-orbe-green text-white">ALL STATUS</option>
                        <option value="Potential client" className="bg-orbe-green text-white">POTENTIAL</option>
                        <option value="Client" className="bg-orbe-green text-white">CLIENT</option>
                        <option value="Not interested" className="bg-orbe-green text-white">DISCARDED</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-orbe-tan/20 scrollbar-track-transparent p-4 md:p-0">
                  {/* VISTA DESKTOP: TABLA */}
                  <table className="w-full text-left border-collapse hidden md:table desktop-table-only">
                    <thead className="bg-[#fcfaf7] border-b border-orbe-tan/30 sticky top-0 z-10 whitespace-nowrap">
                      <tr>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Owner</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action Date</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priority</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Contact</th>
                        <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Action</th>
                        <th className="p-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-28">Action Status</th>
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
                        userPipeline.map((item, index) => (
                          <tr key={getPipelineKey(item, 'pipeline-row', index)} className="hover:bg-orbe-cream/30 transition-colors">
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <div className="font-bold text-orbe-green">{item.company_name}</div>
                                </div>
                                <div className="mt-1">
                                  {(() => {
                                    const relatedClient = clients.find(c => String(c.client_id) === String(item.client_id));
                                    return renderProductTags(relatedClient?.product_interest_tags, 2);
                                  })()}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <UserCircle size={14} className="text-orbe-tan" />
                                <span className="font-semibold text-gray-600">{item.owner_id || (item as any).owner || 'Unassigned'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1">
                                <span className="font-mono font-bold text-orbe-green/70 text-[11px]">
                                  {formatDateSafe(item.next_action_date).toUpperCase()}
                                </span>
                                {getStatusBadge(item.next_action_date)}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span 
                                className={`font-black text-[10px] uppercase tracking-widest ${
                                  item.priority === 'Urgent' ? 'text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded' :
                                  item.priority === 'High' ? 'text-red-500' : 
                                  item.priority === 'Medium' ? 'text-orange-500' : 
                                  'text-blue-500'
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
                                defaultValue={item.last_activity}
                                 onBlur={(e) => handleUpdatePipeline(item.id, { last_activity: e.target.value })}
                                className="bg-transparent w-full outline-none text-xs"
                                placeholder="Action note..."
                              />
                            </td>
                             <td className="p-3 text-center">
                               <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                 String(item.action_status).toLowerCase() === 'postpone' 
                                   ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                   : 'bg-blue-50 text-blue-700 border border-blue-100'
                               }`}>
                                  {(String(item.action_status).toLowerCase() === 'postpone' || String(item.action_status).toLowerCase() === 'postponed') ? 'Postponed' : (item.action_status || 'Pending')}
                               </span>
                             </td>
                              <td className="p-3 text-center">
                                <span 
                                  className={`px-2 py-1 rounded-full font-bold text-[9px] border shadow-sm transition-all inline-block uppercase tracking-wider ${
                                    item.status === 'Client' ? 'bg-green-50 text-green-700 border-green-100' : 
                                    (item.status === 'Not interested' || item.status === 'Temporary Discarded' || item.status === 'Fail') ? 'bg-red-50 text-red-700 border-red-100' :
                                    'bg-gray-100 text-orbe-green border-gray-200'
                                  }`}
                                >
                                  {item.status === 'Not interested' ? 'Discarded' : (item.status || '1st contact')}
                                </span>
                              </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => {
                                  const targetClient = clients.find(c => String(c.client_id) === String(item.client_id));
                                  if (targetClient) {
                                    setSelectedClientForHistory(targetClient);
                                  } else {
                                    setSelectedClientForHistory({
                                      client_id: item.client_id,
                                      company_name: item.company_name || 'Desconocido',
                                    } as any);
                                  }
                                }}
                                className="p-2 bg-orbe-tan/10 text-orbe-green rounded-lg hover:bg-orbe-tan/30 transition-all shadow-sm"
                                title="Interaction Log"
                              >
                                <Clock size={14} />
                              </button>
                            </td>
                            <td className="p-5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => {
                                    setAccomplishDate('');
                                    setAccomplishAction('');
                                    setModalError(null);
                                    setTaskToAccomplish(item);
                                  }}
                                  className="p-2 bg-orbe-green/10 text-orbe-green rounded-lg hover:bg-orbe-green hover:text-white transition-all shadow-sm flex items-center gap-1 group"
                                  title="Task Accomplished"
                                >
                                  <CheckCircle size={14} className="group-hover:scale-110" />
                                  <span className="text-[9px] font-black uppercase">Close</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setModalError(null);
                                    setPostponeItem(item);
                                  }}
                                  className="p-2 bg-orbe-tan/10 text-orbe-green rounded-lg hover:bg-orbe-green hover:text-white transition-all shadow-sm flex items-center gap-1 group"
                                  title="Postpone Action"
                                >
                                  <Calendar size={14} className="group-hover:scale-110" />
                                  <span className="text-[9px] font-black uppercase">Postpone</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setModalError(null);
                                    setEditingItem(item);
                                  }}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1 group"
                                  title="Edit Entry"
                                >
                                  <Edit2 size={14} className="group-hover:scale-110" />
                                  <span className="text-[9px] font-black uppercase">Edit</span>
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
                      <div key="empty-pipeline-mobile" className="py-20 text-center text-gray-400 font-medium italic bg-white rounded-xl border border-dashed border-orbe-tan">
                        No active follow-ups found.
                      </div>
                    ) : (
                      userPipeline.map((item, idx) => (
                        <div key={getPipelineKey(item, 'mobile-pipeline-card', idx)} className="bg-orbe-cream/30 rounded-2xl border border-orbe-tan/40 overflow-hidden shadow-sm flex flex-col">
                          <div className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-black text-orbe-green text-lg leading-tight uppercase tracking-tight">{item.company_name}</h4>
                                <div className="mt-1">
                                  {(() => {
                                    const relatedClient = clients.find(c => String(c.client_id) === String(item.client_id));
                                    return renderProductTags(relatedClient?.product_interest_tags, 2);
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                                  <UserCircle size={10} /> {item.owner_id || (item as any).owner || 'Unassigned'} | #{item.client_id}
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
                                  <span className="font-mono font-black text-orbe-green text-sm">{formatDateSafe(item.next_action_date).toUpperCase()}</span>
                                  {isOverdue(item.next_action_date) && <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter animate-pulse">🔴 Overdue</span>}
                                </div>
                              </div>
                              <div className="h-px bg-orbe-tan/20 my-1" />
                              <div className="flex items-start gap-2">
                                <div className="p-1.5 bg-orbe-tan/10 rounded-lg text-orbe-tan mt-0.5">
                                  <CheckSquare size={12} />
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Last Action</p>
                                  <p className="text-xs font-semibold text-gray-600 italic mt-1 leading-snug">"{item.last_activity || 'No recent notes'}"</p>
                                </div>
                              </div>
                              <div className="h-px bg-orbe-tan/20 my-1" />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-orbe-green/70">
                                  <Layers size={14} />
                                  <span className="text-xs font-black uppercase tracking-tight">Stage</span>
                                </div>
                                <span 
                                  className={`px-2 py-1 rounded-full font-bold text-[9px] border shadow-sm transition-all inline-block uppercase tracking-wider ${
                                    item.status === 'Client' ? 'bg-green-50 text-green-700 border-green-100' : 
                                    (item.status === 'Not interested' || item.status === 'Temporary Discarded' || item.status === 'Fail') ? 'bg-red-50 text-red-700 border-red-100' :
                                    'bg-gray-100 text-orbe-green border-gray-200'
                                  }`}
                                >
                                  {item.status === 'Not interested' ? 'Discarded' : (item.status || '1st contact')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex border-t border-orbe-tan/30 h-16">
                            <button 
                              onClick={() => {
                                setAccomplishDate('');
                                setAccomplishAction('');
                                setModalError(null);
                                setTaskToAccomplish(item);
                              }}
                              className="flex-1 bg-orbe-green text-white font-black text-[9px] uppercase tracking-tighter flex flex-col items-center justify-center gap-1 active:opacity-80 transition-all border-r border-white/10"
                            >
                              <CheckCircle size={18} /> Close
                            </button>
                            <button 
                              onClick={() => {
                                setModalError(null);
                                setPostponeItem(item);
                              }}
                              className="flex-1 bg-orbe-tan/20 text-orbe-green font-black text-[9px] uppercase tracking-tighter flex flex-col items-center justify-center gap-1 active:bg-orbe-tan/40 transition-all border-r border-orbe-tan/10"
                            >
                              <Calendar size={18} /> Postpone
                            </button>
                            <button 
                              onClick={() => {
                                setModalError(null);
                                setEditingItem(item);
                              }}
                              className="flex-1 bg-blue-50 text-blue-600 font-black text-[9px] uppercase tracking-tighter flex flex-col items-center justify-center gap-1 active:bg-blue-100 transition-all border-r border-blue-100"
                            >
                              <Edit2 size={18} /> Edit
                            </button>
                            <button 
                              onClick={() => {
                                const targetClient = clients.find(c => String(c.client_id) === String(item.client_id));
                                if (targetClient) {
                                  setSelectedClientForHistory(targetClient);
                                } else {
                                  setSelectedClientForHistory({
                                    client_id: item.client_id,
                                    company_name: item.company_name || 'Unknown',
                                  } as any);
                                }
                              }}
                              className="flex-1 bg-gray-50 text-orbe-green font-black text-[9px] uppercase tracking-tighter flex flex-col items-center justify-center gap-1 active:bg-gray-100 transition-all"
                            >
                              <Clock size={18} /> Log
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
                {/* SUB-NAVIGATION TABS */}
                <div className="flex items-center gap-1 bg-orbe-tan/10 p-1 rounded-xl w-fit shrink-0 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setDashboardTab('overview')}
                    className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 whitespace-nowrap ${dashboardTab === 'overview' ? 'bg-orbe-green text-white shadow-md' : 'text-orbe-green hover:bg-black/5'}`}
                  >
                    <LayoutDashboard size={14} />
                    Overview
                  </button>
                  <button 
                    onClick={() => setDashboardTab('activity')}
                    className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 whitespace-nowrap ${dashboardTab === 'activity' ? 'bg-orbe-green text-white shadow-md' : 'text-orbe-green hover:bg-black/5'}`}
                  >
                    <ShieldCheck size={14} />
                    Activity Control
                  </button>
                </div>

                {dashboardTab === 'overview' && (
                  <motion.div 
                    key="overview-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8 pb-20"
                  >
                    {/* HEADER & FILTERS */}
                    <div className="bg-white rounded-3xl border border-orbe-tan/30 shadow-sm p-6 md:p-8 space-y-8">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                          <h2 className="text-2xl font-black text-orbe-green tracking-tighter uppercase leading-none">Commercial Performance Overview</h2>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-2 h-2 rounded-full bg-orbe-green animate-pulse" />
                            <span className="text-[9px] font-black text-orbe-green uppercase tracking-widest">Real-time Metrics</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full md:w-auto">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Date Range</label>
                            <div className="flex flex-wrap gap-1 p-1 bg-gray-50 rounded-xl border border-orbe-tan/10">
                              {['Last 7 days', 'Last 14 days', 'Last 30 days', 'This month', 'Last month', 'All time'].map(range => (
                                <button
                                  key={range}
                                  onClick={() => setOverviewDateRange(range)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${overviewDateRange === range ? 'bg-orbe-green text-white shadow-sm' : 'text-orbe-green/40 hover:text-orbe-green/60'}`}
                                >
                                  {range}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Seller</label>
                            <div className="flex gap-1 p-1 bg-gray-50 rounded-xl border border-orbe-tan/10">
                              {USERS.map(user => (
                                <button
                                  key={user}
                                  onClick={() => setOverviewOwnerFilter(user)}
                                  className={`flex-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${overviewOwnerFilter === user ? 'bg-orbe-green text-white shadow-sm' : 'text-orbe-green/40 hover:text-orbe-green/60'}`}
                                >
                                  {user}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Account Type</label>
                            <div className="flex gap-1 p-1 bg-gray-50 rounded-xl border border-orbe-tan/10">
                              {['All client types', 'Client', 'Potential client', 'Discarded'].map(type => (
                                <button
                                  key={type}
                                  onClick={() => setOverviewClientTypeFilter(type)}
                                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${overviewClientTypeFilter === type ? 'bg-orbe-green text-white shadow-sm' : 'text-orbe-green/40 hover:text-orbe-green/60'}`}
                                >
                                  {type.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* KPI SNAPSHOT */}
                      {(() => {
                        const { filteredC, overviewPipelineRows } = overviewData;
                        const isClient = (type: string) => ['client', 'customer'].includes((type || '').toLowerCase());
                        const isDiscarded = (type: string) => (type || '').toLowerCase().includes('discard') || (type || '').toLowerCase().includes('disqual') || (type || '').toLowerCase().includes('temp');

                        const kpis = [
                          { label: 'Total Accounts', value: filteredC.length, color: 'text-orbe-green', bg: 'bg-orbe-green/5', icon: <Users size={18} />, items: filteredC },
                          { label: 'Potential Clients', value: filteredC.filter(c => !isClient(c.client_type || '') && !isDiscarded(c.client_type || '')).length, color: 'text-blue-600', bg: 'bg-blue-50', icon: <Target size={18} />, items: filteredC.filter(c => !isClient(c.client_type || '') && !isDiscarded(c.client_type || '')) },
                          { label: 'Customers', value: filteredC.filter(c => isClient(c.client_type || '')).length, color: 'text-green-600', bg: 'bg-green-50', icon: <Briefcase size={18} />, items: filteredC.filter(c => isClient(c.client_type || '')) },
                          { label: 'Discarded', value: filteredC.filter(c => isDiscarded(c.client_type || '')).length, color: 'text-gray-400', bg: 'bg-gray-100', icon: <XCircle size={18} />, items: filteredC.filter(c => isDiscarded(c.client_type || '')) },
                          { label: 'Current Clients', value: overviewPipelineRows.length, color: 'text-orange-600', bg: 'bg-orange-50', icon: <Layers size={18} />, items: overviewPipelineRows }
                        ];

                        return (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-orbe-tan/10">
                            {kpis.map((kpi, index) => (
                              <div 
                                key={safeKey('overview-kpi', kpi.label, index)} 
                                className="bg-white p-4 rounded-2xl border border-orbe-tan/30 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer" 
                                onClick={() => setSelectedDetail({ type: 'kpi', label: kpi.label, items: kpi.items })}
                              >
                                <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-sm`}>
                                  {kpi.icon}
                                </div>
                                <div>
                                  <h3 className="text-xl font-black text-orbe-green leading-none">{kpi.value}</h3>
                                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1.5 leading-tight">{kpi.label}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* 8 STAGE BREAKDOWN GRID */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 px-1">
                        <Layers size={20} className="text-orbe-green" />
                        <h3 className="text-lg font-black text-orbe-green uppercase tracking-tight">Pipeline Stage Breakdown</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {PIPELINE_STAGE_CARDS.map((stage, idx) => {
                          const items = overviewData.overviewPipelineRows.filter(p => p.effectiveStage === stage);
                          const pending = items.filter(p => p.action_status !== 'Done').length;
                          const done = items.filter(p => p.action_status === 'Done').length;
                          const overdue = items.filter(p => p.isOverdue).length;

                          const isSoftRed = stage === 'Not interested';

                          return (
                            <motion.div
                              key={safeKey('stage-card', stage, idx)}
                              whileHover={{ y: -5 }}
                              onClick={() => setSelectedDetail({ type: 'stage', label: `Stage: ${stage}`, items })}
                              className={`p-6 rounded-3xl border shadow-sm cursor-pointer transition-all ${
                                isSoftRed 
                                  ? 'bg-red-50/50 border-red-100 hover:border-red-200' 
                                  : 'bg-white border-orbe-tan/30 hover:border-orbe-green/30'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <h4 className={`text-xs font-black uppercase tracking-widest ${isSoftRed ? 'text-red-600' : 'text-orbe-green'}`}>
                                  {stage}
                                </h4>
                                <ChevronRight size={14} className={isSoftRed ? 'text-red-400' : 'text-orbe-tan'} />
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <div className="text-3xl font-black text-orbe-green leading-none">{items.length}</div>
                                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-1 border-l-2 border-orbe-tan/20">Latest client status</div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50">
                                  <div className="text-center">
                                    <div className="text-[10px] font-black text-blue-600 leading-none">{pending}</div>
                                    <div className="text-[7px] font-bold text-gray-400 uppercase mt-1">Pending</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-[10px] font-black text-green-600 leading-none">{done}</div>
                                    <div className="text-[7px] font-bold text-gray-400 uppercase mt-1">Done</div>
                                  </div>
                                  <div className="text-center">
                                    <div className={`text-[10px] font-black leading-none ${overdue > 0 ? 'text-red-500' : 'text-gray-300'}`}>{overdue}</div>
                                    <div className="text-[7px] font-bold text-gray-400 uppercase mt-1">Overdue</div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* PIPELINE ACTIONS GRID */}
                    <div className="space-y-6 mt-12 pb-12">
                      <div className="flex items-center gap-3 px-1">
                        <Activity size={20} className="text-orbe-green" />
                        <h3 className="text-lg font-black text-orbe-green uppercase tracking-tight">Pipeline Actions</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {PIPELINE_ACTION_CARDS.map((action, idx) => {
                          const items = overviewData.overviewPipelineRows.filter(p => (p as any).effectiveAction === action);
                          const pending = items.filter(p => p.action_status !== 'Done').length;
                          const done = items.filter(p => p.action_status === 'Done').length;
                          const overdue = items.filter(p => p.isOverdue).length;

                          return (
                            <motion.div
                              key={safeKey('action-card', action, idx)}
                              whileHover={{ y: -5 }}
                              onClick={() => setSelectedDetail({ type: 'action', label: `Action: ${action}`, items })}
                              className="p-6 rounded-3xl border bg-white border-orbe-tan/30 hover:border-orbe-green/30 shadow-sm cursor-pointer transition-all"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-orbe-green">
                                  {action}
                                </h4>
                                <ChevronRight size={14} className="text-orbe-tan" />
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <div className="text-3xl font-black text-orbe-green leading-none">{items.length}</div>
                                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-1 border-l-2 border-orbe-tan/20">Latest client action</div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50">
                                  <div className="text-center">
                                    <div className="text-[10px] font-black text-blue-600 leading-none">{pending}</div>
                                    <div className="text-[7px] font-bold text-gray-400 uppercase mt-1">Pending</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-[10px] font-black text-green-600 leading-none">{done}</div>
                                    <div className="text-[7px] font-bold text-gray-400 uppercase mt-1">Done</div>
                                  </div>
                                  <div className="text-center">
                                    <div className={`text-[10px] font-black leading-none ${overdue > 0 ? 'text-red-500' : 'text-gray-300'}`}>{overdue}</div>
                                    <div className="text-[7px] font-bold text-gray-400 uppercase mt-1">Overdue</div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                    {dashboardTab === 'activity' && (
                  <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                    {/* CONTROL DE ACTIVIDAD */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orbe-green/10 rounded-xl">
                            <ShieldCheck size={20} className="text-orbe-green" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-orbe-green uppercase tracking-tight">Active Operation Center</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Activity & Progress Control</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {['Juanjo', 'Alejandro'].map((owner) => {
                          const now = new Date();
                          
                          const getActivityItems = (days: number) => {
                            const limit = new Date();
                            limit.setHours(0, 0, 0, 0);
                            limit.setDate(now.getDate() - days);
                            return pipeline.filter(p => 
                              String(p.owner_id || '').trim().toLowerCase() === owner.toLowerCase() && 
                              parseFlexibleDate(p.last_contact_date) && 
                              parseFlexibleDate(p.last_contact_date)!.getTime() >= limit.getTime()
                            );
                          };

                          const getPostponedStats = (days: number) => {
                            const getBaseline = (daysAgo: number) => {
                              const d = new Date();
                              d.setDate(d.getDate() - daysAgo);
                              d.setHours(0, 0, 0, 0);
                              return d.getTime();
                            };

                            const currentLimit = getBaseline(days);
                            const prevLimit = getBaseline(days + 7); // Comparar con la semana exacta anterior

                            const relevantItems = pipeline.filter(p => 
                              String(p.owner_id || '').trim().toLowerCase() === owner.toLowerCase() && 
                              (String(p.action_status || '').trim().toLowerCase() === 'postpone' || 
                               String(p.action_status || '').trim().toLowerCase() === 'postponed')
                            );

                            const currentCount = relevantItems.filter(p => {
                              const itemDate = (parseFlexibleDate(p.created_at) || parseFlexibleDate(p.last_contact_date))?.getTime();
                              return itemDate && itemDate >= currentLimit;
                            }).length;

                            const prevPeriodCount = relevantItems.filter(p => {
                              const itemDate = (parseFlexibleDate(p.created_at) || parseFlexibleDate(p.last_contact_date))?.getTime();
                              const comparisonLimit = getBaseline(days * 2);
                              return itemDate && itemDate >= comparisonLimit && itemDate < currentLimit;
                            }).length;

                            const prevWeekLimit = getBaseline(days + 7);
                            const prevWeekCount = relevantItems.filter(p => {
                              const itemDate = (parseFlexibleDate(p.created_at) || parseFlexibleDate(p.last_contact_date))?.getTime();
                              return itemDate && itemDate >= prevWeekLimit && itemDate < currentLimit;
                            }).length;

                            let trend = 0;
                            const countForTrend = days === 7 ? prevWeekCount : prevPeriodCount;
                            if (countForTrend > 0) {
                              trend = Math.round(((currentCount - countForTrend) / countForTrend) * 100);
                            } else if (currentCount > 0) {
                              trend = 100;
                            }

                            return { count: currentCount, trend };
                          };

                          const allTimePostponed = pipeline.filter(p => 
                            String(p.owner_id || '').trim().toLowerCase() === owner.toLowerCase() && 
                            (String(p.action_status || '').trim().toLowerCase() === 'postpone' || String(p.action_status || '').trim().toLowerCase() === 'postponed')
                          ).length;

                          const p7 = getPostponedStats(7);
                          const p14 = getPostponedStats(14);
                          const p30 = getPostponedStats(30);

                          return (
                            <div key={`activity-tab-${owner}`} className="bg-white rounded-3xl p-6 border border-orbe-tan/30 shadow-sm flex flex-col gap-6 transition-all hover:shadow-md relative overflow-hidden group">
                              {/* Decor sutil */}
                              <div className="absolute -right-4 -top-4 w-24 h-24 bg-orbe-green/5 rounded-full blur-2xl group-hover:bg-orbe-green/10 transition-all duration-700" />
                              
                              <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg ${owner === 'Juanjo' ? 'bg-[#5B8C5A] shadow-[#5B8C5A]/10' : 'bg-[#7C9A92] shadow-[#7C9A92]/10'}`}>
                                    {(owner || '?')[0]}
                                  </div>
                                  <div>
                                    <h5 className="font-black text-orbe-green text-xl leading-none">{owner}</h5>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${owner === 'Juanjo' ? 'bg-[#5B8C5A]' : 'bg-[#7C9A92]'}`} />
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Monitoring</p>
                                    </div>
                                  </div>
                                </div>

                                <button 
                                  onClick={() => {
                                    const postponedItems = pipeline.filter(p => 
                                      String(p.owner_id || '').trim().toLowerCase() === owner.toLowerCase() && 
                                      (String(p.action_status || '').trim().toLowerCase() === 'postpone' || 
                                       String(p.action_status || '').trim().toLowerCase() === 'postponed')
                                    ).sort((a,b) => {
                                      const dateA = (parseFlexibleDate(a.created_at) || parseFlexibleDate(a.last_contact_date) || parseFlexibleDate(a.next_action_date))?.getTime() || 0;
                                      const dateB = (parseFlexibleDate(b.created_at) || parseFlexibleDate(b.last_contact_date) || parseFlexibleDate(b.next_action_date))?.getTime() || 0;
                                      return dateB - dateA;
                                    });
                                    setSelectedPostponedList({ owner, items: postponedItems });
                                  }}
                                  className="flex flex-col items-end hover:bg-orange-100/30 p-2 rounded-2xl transition-all group/postpone"
                                >
                                  <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 group-hover/postpone:bg-orange-100">
                                    <Clock size={12} className="text-orange-500" />
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Postponed Balance</span>
                                  </div>
                                  <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-2xl font-black text-orange-600">{allTimePostponed}</span>
                                    <span className={`text-[10px] font-bold ${p7.trend > 0 ? 'text-red-500' : p7.trend < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                      {p7.trend > 0 ? '↑' : p7.trend < 0 ? '↓' : ''}{Math.abs(p7.trend)}% vs prev week
                                    </span>
                                  </div>
                                </button>
                              </div>

                              {/* Activity Buckets */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Registered Interactions</p>
                                <div className="grid grid-cols-3 gap-3">
                                  {[
                                    { label: '30 DÍAS', days: 30, color: 'bg-orbe-green text-white border-orbe-green shadow-lg shadow-orbe-green/10 hover:brightness-110 flex-col' },
                                    { label: '14 DÍAS', days: 14, color: 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100/50' },
                                    { label: '7 DÍAS', days: 7, color: 'bg-[#F2F9F2] text-[#3D7A3C] border-[#E0F2E0] hover:bg-[#E8F5E8]' },
                                  ].map(card => {
                                    const items = getActivityItems(card.days);
                                    return (
                                      <button 
                                        key={card.label} 
                                        onClick={() => setSelectedActivityList({ owner, days: card.days, items })}
                                        className={`${card.color} p-4 rounded-2xl border flex flex-col items-center justify-center transition-all hover:scale-[1.05] active:scale-95 group/card`}
                                      >
                                        <span className="text-2xl font-black tracking-tighter">{items.length}</span>
                                        <span className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-70 flex items-center gap-1">
                                          {card.label} <ChevronRight size={10} className="group-hover/card:translate-x-0.5 transition-transform" />
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Postponed Breakdown */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Postpone Analysis</p>
                                <div className="grid grid-cols-3 gap-3">
                                  {[
                                    { label: '7d', stats: p7 },
                                    { label: '14d', stats: p14 },
                                    { label: '30d', stats: p30 }
                                  ].map(item => (
                                    <div key={`p-break-${item.label}`} className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 flex flex-col items-center">
                                      <span className="text-lg font-black text-gray-700 leading-none">{item.stats.count}</span>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase mt-1 tracking-widest">{item.label}</span>
                                      <span className={`text-[7px] font-black mt-1 ${item.stats.trend > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {item.stats.trend === 0 ? '' : item.stats.trend > 0 ? `+${item.stats.trend}%` : `${item.stats.trend}%`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Timeline of Last Contacts (Seniority) */}
                    <div className="bg-white rounded-3xl border border-orbe-tan/30 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-orbe-tan/20 bg-gray-50/30 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Clock size={20} />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-orbe-green uppercase tracking-tight">Timeline Seniority & Recovery</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identify abandoned clients by contact age</p>
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-3">
                          {/* Seller Filter */}
                          <div className="flex p-1 bg-gray-100 rounded-xl gap-1 w-full md:w-auto">
                            {USERS.map(user => (
                              <button 
                                key={`timeline-seller-${user}`}
                                onClick={() => setTimelineSellerFilter(user)}
                                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timelineSellerFilter === user ? 'bg-orbe-green text-white shadow-sm' : 'text-orbe-green/40 hover:text-orbe-green/60'}`}
                              >
                                {user}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Temperature Tabs */}
                      <div className="flex border-b border-orbe-tan/10 bg-white sticky top-0 z-20">
                        {[
                          { label: 'Cold', range: '> 60 days', icon: <AlertCircle size={14} />, color: 'text-red-500', active: 'border-red-500 bg-red-50/30 text-red-600' },
                          { label: 'Warning', range: '30-60 days', icon: <Clock size={14} />, color: 'text-orange-500', active: 'border-orange-500 bg-orange-50/30 text-orange-600' },
                          { label: 'Active', range: '< 30 days', icon: <Zap size={14} />, color: 'text-green-500', active: 'border-green-500 bg-green-50/30 text-green-600' },
                        ].map(tab => (
                          <button
                            key={tab.label}
                            onClick={() => setTimelineTemperature(tab.label as any)}
                            className={`flex-1 py-4 border-b-4 transition-all flex flex-col items-center gap-1 ${timelineTemperature === tab.label ? tab.active : 'border-transparent text-gray-400 hover:bg-gray-50'}`}
                          >
                            <div className="flex items-center gap-2">
                              {tab.icon}
                              <span className="text-[11px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
                            </div>
                            <span className="text-[8px] font-bold opacity-60 uppercase">{tab.range}</span>
                          </button>
                        ))}
                      </div>
                      
                      <div className="max-h-[600px] overflow-auto scrollbar-thin scrollbar-thumb-orbe-tan/20">
                        <table className="w-full text-left desktop-table-only">
                          <thead className="bg-[#fcfaf7] sticky top-0 border-b border-orbe-tan/20 z-10">
                            <tr>
                              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Empresa</th>
                              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Responsable</th>
                              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Último Contacto</th>
                              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Seniority</th>
                              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Quick Task</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-orbe-tan/10 text-[11px]">
                            {pipeline
                              .filter(p => {
                                const d = parseFlexibleDate(p.last_contact_date);
                                if (!d) return false;
                                const days = Math.floor((new Date().getTime() - d.getTime()) / (1000 * 3600 * 24));
                                
                                // Filter by Seller
                                if (timelineSellerFilter !== 'All' && p.owner_id !== timelineSellerFilter) return false;

                                // Filter by Temperature
                                if (timelineTemperature === 'Active') return days < 30;
                                if (timelineTemperature === 'Warning') return days >= 30 && days <= 60;
                                if (timelineTemperature === 'Cold') return days > 60;
                                return true;
                              })
                              .sort((a, b) => {
                                const dA = parseFlexibleDate(a.last_contact_date)?.getTime() || 0;
                                const dB = parseFlexibleDate(b.last_contact_date)?.getTime() || 0;
                                return dA - dB; // Antiguo a nuevo
                              })
                              .map(item => {
                                const d = parseFlexibleDate(item.last_contact_date);
                                const daysGone = d ? Math.floor((new Date().getTime() - d.getTime()) / (1000 * 3600 * 24)) : '?';
                                
                                return (
                                  <tr key={`timeline-full-${item.id}`} className="hover:bg-orbe-cream/20 transition-all group">
                                    <td className="p-4">
                                      <div className="flex items-center gap-2 group">
                                        <div className="font-black text-orbe-green text-[13px] group-hover:translate-x-1 transition-transform">{item.company_name}</div>
                                      </div>
                                      <div className="text-[10px] text-gray-400 truncate max-w-[200px] mt-0.5 italic">"{item.last_activity}"</div>
                                    </td>
                                    <td className="p-4">
                                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${String(item.owner_id || '').trim().toLowerCase() === 'juanjo' ? 'bg-[#5B8C5A]/10 text-[#5B8C5A]' : 'bg-[#7C9A92]/10 text-[#7C9A92]'}`}>
                                        {item.owner_id || item.owner || 'Unassigned'}
                                      </span>
                                    </td>
                                    <td className="p-4 font-mono text-gray-500 font-bold">
                                      {formatDateSafe(item.last_contact_date)}
                                    </td>
                                    <td className="p-4 text-right">
                                      <span className={`font-black text-[10px] flex justify-end items-center gap-2 ${Number(daysGone) > 60 ? 'text-red-500' : Number(daysGone) >= 30 ? 'text-orange-500' : 'text-green-500'}`}>
                                        {Number(daysGone) > 60 ? <AlertCircle size={12} /> : Number(daysGone) >= 30 ? <Clock size={12} /> : <Zap size={12} />}
                                        {daysGone} DÍAS
                                      </span>
                                    </td>
                                    <td className="p-4 text-right">
                                      <button 
                                        onClick={() => {
                                          setAccomplishDate('');
                                          setAccomplishAction('');
                                          setModalError(null);
                                          setTaskToAccomplish(item);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orbe-green/10 text-orbe-green rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orbe-green hover:text-white transition-all shadow-sm active:scale-95"
                                      >
                                        <PlusCircle size={12} />
                                        Schedule
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            {pipeline.filter(p => {
                              const d = parseFlexibleDate(p.last_contact_date);
                              if (!d) return false;
                              const days = Math.floor((new Date().getTime() - d.getTime()) / (1000 * 3600 * 24));
                              if (timelineSellerFilter !== 'All' && p.owner_id !== timelineSellerFilter) return false;
                              if (timelineTemperature === 'Active') return days < 30;
                              if (timelineTemperature === 'Warning') return days >= 30 && days <= 60;
                              if (timelineTemperature === 'Cold') return days > 60;
                              return true;
                            }).length === 0 && (
                              <tr>
                                <td colSpan={5} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px] italic bg-gray-50/50">
                                  No clients found in this segment
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'weekly' && (
              <motion.div 
                key="weekly-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-6 flex-1 flex flex-col overflow-y-auto pr-2"
              >
                 <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                    {/* 1. HEADER & FILTER */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-orbe-tan/30 shadow-sm relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="p-2 bg-orbe-green text-white rounded-xl shadow-lg shadow-orbe-green/20">
                            <ShieldCheck size={20} />
                          </div>
                          <h4 className="text-xl font-black text-orbe-green uppercase tracking-tight">Weekly Priorities</h4>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Execution plan • {getToday().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {(() => {
                            const d = getToday();
                            const days = weeklyDateRange === 'Next 30 days' ? 30 : weeklyDateRange === 'Next 14 days' ? 14 : 7;
                            d.setDate(d.getDate() + days);
                            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                          })()}
                        </p>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-2 relative z-10 w-full md:w-auto">
                        {/* Selector de Ventana Rolling */}
                        <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
                          {['Next 7 days', 'Next 14 days', 'Next 30 days'].map((range, index) => (
                            <button 
                              key={safeKey('weekly-range', range, index)}
                              onClick={() => setWeeklyDateRange(range)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${weeklyDateRange === range ? 'bg-white text-orbe-green shadow-sm' : 'text-orbe-green/40 hover:text-orbe-green/60'}`}
                            >
                              {range.split(' ')[1]} Days
                            </button>
                          ))}
                        </div>

                        <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
                          {USERS.map((user, index) => (
                            <button 
                              key={safeKey('command-filter', user, index)}
                              onClick={() => setCommandSellerFilter(user)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${commandSellerFilter === user ? 'bg-orbe-green text-white shadow-sm' : 'text-orbe-green/40 hover:text-orbe-green/60'}`}
                            >
                              {user}
                            </button>
                          ))}
                        </div>

                        {/* Action Type Filter */}
                        <div className="relative group/filter">
                          <select 
                            value={weeklyActionTypeFilter}
                            onChange={(e) => setWeeklyActionTypeFilter(e.target.value)}
                            className="appearance-none bg-gray-100 border-none rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-tight text-orbe-green focus:ring-2 focus:ring-orbe-green/20 outline-none cursor-pointer pr-8 w-full md:w-auto"
                          >
                            <option value="All actions">All actions</option>
                            {PREDEFINED_ACTIONS.map(action => (
                              <option key={action} value={action}>{action}</option>
                            ))}
                            <option value="Other">Other</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-orbe-green/40">
                            <Filter size={10} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const today = getToday();
                      const rollingDays = weeklyDateRange === 'Next 30 days' ? 30 : weeklyDateRange === 'Next 14 days' ? 14 : 7;
                      
                      const clientMap = new Map<string, PipelineItem>();
                      pipeline.forEach(p => {
                        const matchesSeller = commandSellerFilter === 'All' || p.owner_id === commandSellerFilter;
                        const isNotDone = !isDone(p.action_status);
                        const isOperational = !isClosedPipelineStage(getEffectivePipelineStage(p));
                        
                        if (matchesSeller && isNotDone && isOperational) {
                          const cid = String(p.client_id);
                          const currentD = parseFlexibleDate(p.next_action_date)?.getTime() || 0;
                          const existing = clientMap.get(cid);
                          const existingD = existing ? (parseFlexibleDate(existing.next_action_date)?.getTime() || 0) : Infinity;
                          
                          if (!clientMap.has(cid) || currentD < existingD) {
                            clientMap.set(cid, p);
                          }
                        }
                      });
                      const filteredPipeline = Array.from(clientMap.values());

                      const overdueItems = filteredPipeline.filter(p => isOverdue(p.next_action_date, p.action_status))
                        .sort((a,b) => {
                          const prioA = PRIORITIES[a.priority as Priority] || 99;
                          const prioB = PRIORITIES[b.priority as Priority] || 99;
                          if (prioA !== prioB) return prioA - prioB;
                          const dateA = parseFlexibleDate(a.next_action_date)?.getTime() || 0;
                          const dateB = parseFlexibleDate(b.next_action_date)?.getTime() || 0;
                          return dateA - dateB;
                        });

                      // KPI calculations
                      const urgentCount = filteredPipeline.filter(p => p.priority === 'Urgent' && isWithinNextDays(p.next_action_date, rollingDays, p.action_status)).length;
                      const highCount = filteredPipeline.filter(p => p.priority === 'High' && isWithinNextDays(p.next_action_date, rollingDays, p.action_status)).length;
                      const windowItemsCount = filteredPipeline.filter(p => isWithinNextDays(p.next_action_date, rollingDays, p.action_status)).length;
                      const missingDateCount = filteredPipeline.filter(p => isMissingNextActionDate(p)).length;
                      const dueTodayCount = filteredPipeline.filter(p => isDueToday(p.next_action_date, p.action_status)).length;

                      return (
                        <>
                          {/* 2. CLEAN THE SLATE */}
                          <div className={`rounded-3xl border p-6 transition-all ${overdueItems.length > 0 ? 'bg-red-50/50 border-red-100 shadow-sm' : 'bg-green-50/30 border-green-100'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${overdueItems.length > 0 ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-green-500'}`}>
                                  {overdueItems.length > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                                </div>
                                <div>
                                  <h5 className={`text-lg font-black uppercase tracking-tight ${overdueItems.length > 0 ? 'text-red-700' : 'text-green-700'}`}>Clean the Slate</h5>
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                                    {overdueItems.length > 0 
                                      ? `${commandSellerFilter === 'All' ? 'The team has' : commandSellerFilter + ' has'} ${overdueItems.length} overdue actions. Resolve them now to unlock the week.`
                                      : "No overdue actions. The slate is clean."}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {overdueItems.length > 0 && (
                              <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto hidden md:block">
                                  <table className="w-full text-left text-[11px] desktop-table-only">
                                    <thead className="bg-red-50 text-red-700">
                                      <tr>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest">Company</th>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest">Owner</th>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest">Next Action</th>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest">Priority</th>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest">Stage</th>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest">Due Date</th>
                                        <th className="p-3 text-[9px] font-black uppercase tracking-widest">Quick Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-50">
                                      {overdueItems.slice(0, 5).map((item, index) => {
                                        const d = parseFlexibleDate(item.next_action_date);
                                        const daysOverdue = d ? Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24)) : 0;
                                        return (
                                          <tr key={getPipelineKey(item, 'overdue-row', index)} className="hover:bg-red-50/30 transition-colors">
                                            <td className="p-3">
                                              <div className="flex items-center gap-2 group">
                                                <div className="font-bold text-orbe-green">{item.company_name}</div>
                                              </div>
                                            </td>
                                            <td className="p-3">
                                               <span className="px-2 py-0.5 bg-gray-100 rounded text-[8px] font-black uppercase">{item.owner_id || (item as any).owner || 'Unassigned'}</span>
                                            </td>
                                            <td className="p-3 italic text-gray-500">{item.last_activity}</td>
                                            <td className="p-3">
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.priority === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {item.priority}
                                              </span>
                                            </td>
                                            <td className="p-3 text-gray-400 font-bold uppercase text-[9px]">{item.status}</td>
                                            <td className="p-3">
                                              <div className="flex flex-col">
                                                <span className="font-bold text-red-600">{formatDateSafe(item.next_action_date)}</span>
                                                <span className="text-[9px] text-red-400 font-black">{daysOverdue} days late</span>
                                              </div>
                                            </td>
                                            <td className="p-3">
                                              <div className="flex items-center gap-1">
                                                <button 
                                                  onClick={() => setTaskToAccomplish(item)}
                                                  className="p-1.5 bg-orbe-green text-white rounded-lg hover:brightness-110 transition-all"
                                                  title="Resolve Action"
                                                >
                                                  <CheckSquare size={14} />
                                                </button>
                                                <button 
                                                  onClick={() => setPostponeItem(item)}
                                                  className="p-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all"
                                                  title="Postpone"
                                                >
                                                  <Clock size={14} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* MOBILE VERSION: CARDS (Overdue) */}
                                <div className="md:hidden divide-y divide-red-50">
                                  {overdueItems.slice(0, 5).map((item, index) => {
                                    const d = parseFlexibleDate(item.next_action_date);
                                    const daysOverdue = d ? Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24)) : 0;
                                    return (
                                      <div key={getPipelineKey(item, 'overdue-mobile-card', index)} className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <h6 className="font-black text-orbe-green text-[13px] uppercase tracking-tight">{item.company_name}</h6>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[7px] font-black uppercase text-gray-400">{item.owner_id || (item as any).owner || 'Unassigned'}</span>
                                              <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">{item.status}</span>
                                            </div>
                                          </div>
                                          <div className="flex flex-col items-end text-right">
                                            <span className="text-[11px] font-bold text-red-600">{formatDateSafe(item.next_action_date)}</span>
                                            <span className="text-[9px] text-red-400 font-black uppercase">{daysOverdue} days late</span>
                                          </div>
                                        </div>
                                        <p className="text-[11px] text-gray-500 italic">"{item.last_activity}"</p>
                                        <div className="flex gap-2">
                                          <button 
                                            onClick={() => setTaskToAccomplish(item)}
                                            className="flex-1 py-3 bg-orbe-green text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                                          >
                                            <CheckCircle size={16} /> Resolve
                                          </button>
                                          <button 
                                            onClick={() => setPostponeItem(item)}
                                            className="px-4 py-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl active:bg-amber-100 transition-all"
                                          >
                                            <Clock size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {overdueItems.length > 5 && (
                                  <div className="p-3 bg-red-50/50 border-t border-red-50 text-center">
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">And {overdueItems.length - 5} more overdue actions...</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 3. KPI SUMMARY */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                              { label: 'Due Today', val: dueTodayCount, icon: <CheckSquare />, color: 'text-blue-500', bg: 'bg-blue-50' },
                              { label: 'Overdue', val: overdueItems.length, icon: <AlertCircle />, color: 'text-red-500', bg: 'bg-red-50' },
                              { label: 'Upcoming', val: windowItemsCount, icon: <Calendar />, color: 'text-orbe-green', bg: 'bg-orbe-green/5' },
                              { label: 'Urgent', val: urgentCount, icon: <Zap />, color: 'text-red-600', bg: 'bg-orange-50' },
                              { label: 'Pipeline Gaps', val: missingDateCount, icon: <Filter />, color: 'text-purple-500', bg: 'bg-purple-50' },
                            ].map((kpi, index) => (
                              <div key={safeKey('weekly-kpi', kpi.label, index)} className="bg-white p-4 rounded-2xl border border-orbe-tan/30 shadow-sm group hover:scale-[1.02] transition-all">
                                <div className={`w-8 h-8 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center mb-3`}>
                                  {React.cloneElement(kpi.icon as React.ReactElement, { size: 16 })}
                                </div>
                                <h3 className="text-xl font-black text-orbe-green leading-none">{kpi.val}</h3>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">{kpi.label}</p>
                              </div>
                            ))}
                          </div>

                          {/* 4. EXECUTION TIMELINE (ROLLING) */}
                          <div className="space-y-6">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-lg font-black text-orbe-green uppercase tracking-tight">Execution Timeline</h4>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operation focus</div>
                            </div>

                            {/* DESKTOP TIMELINE */}
                            <div className="hidden md:grid grid-cols-7 gap-4">
                              {Array.from({ length: 7 }).map((_, i) => {
                                const targetDate = new Date(today);
                                targetDate.setDate(targetDate.getDate() + i);
                                
                                const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : targetDate.toLocaleDateString('en-US', { weekday: 'long' });
                                const dayDate = targetDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                                
                                const dayItems = filteredPipeline.filter(p => {
                                  const matchesDate = (isDueToday(p.next_action_date, p.action_status) && i === 0) || 
                                         (parseFlexibleDate(p.next_action_date)?.toLocaleDateString() === targetDate.toLocaleDateString());
                                  
                                  if (!matchesDate) return false;
                                  
                                  if (weeklyActionTypeFilter !== 'All actions') {
                                    return normalizeActionType(p.last_activity) === weeklyActionTypeFilter;
                                  }
                                  
                                  return true;
                                }).sort((a,b) => (PRIORITIES[a.priority as Priority] || 99) - (PRIORITIES[b.priority as Priority] || 99));

                                return (
                                  <div key={safeKey('weekly-col', dayName, i)} className={`flex flex-col bg-white rounded-2xl border ${i === 0 ? 'border-orbe-green shadow-md ring-4 ring-orbe-green/5' : 'border-orbe-tan/30 shadow-sm'} overflow-hidden min-h-[300px]`}>
                                    <div className={`p-4 border-b ${i === 0 ? 'bg-orbe-green text-white' : 'bg-gray-50 text-orbe-green'}`}>
                                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none">{dayName}</p>
                                      <p className="text-lg font-black mt-1 leading-none">{dayDate}</p>
                                    </div>
                                    <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                                      {dayItems.length === 0 ? (
                                        <div className="h-full flex items-center justify-center p-4">
                                          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center italic">
                                            {weeklyActionTypeFilter !== 'All actions' ? 'No actions of this type in the selected window.' : 'Rest or Prepare'}
                                          </p>
                                        </div>
                                      ) : (
                                        dayItems.map((item, index) => (
                                          <div key={getPipelineKey(item, 'weekly-day-item', index)} className="p-2 bg-gray-50 border border-gray-100 rounded-xl hover:bg-orbe-cream/30 transition-all group relative">
                                            <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${item.priority === 'Urgent' ? 'bg-red-500' : item.priority === 'High' ? 'bg-orange-500' : 'bg-blue-400'}`} />
                                            <div className="flex items-center justify-between pl-2">
                                              <p className="text-[10px] font-black text-orbe-green leading-tight truncate">{item.company_name}</p>
                                            </div>
                                            <p className="text-[9px] text-gray-500 italic mt-1 pl-2 truncate">{item.last_activity}</p>
                                            <div className="mt-2 flex items-center justify-between pl-2">
                                              <span className="text-[8px] font-black uppercase text-gray-400">{item.owner_id}</span>
                                              <button 
                                                onClick={() => setTaskToAccomplish(item)}
                                                className="p-1 bg-white border border-orbe-tan/50 rounded-lg text-orbe-green hover:bg-orbe-green hover:text-white transition-all shadow-sm"
                                              >
                                                <CheckSquare size={10} />
                                              </button>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* MOBILE TIMELINE */}
                            <div className="md:hidden space-y-4">
                              {Array.from({ length: 7 }).map((_, i) => {
                                const targetDate = new Date(today);
                                targetDate.setDate(targetDate.getDate() + i);
                                const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : targetDate.toLocaleDateString('en-US', { weekday: 'long' });
                                const dayDate = targetDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                                const dayItems = filteredPipeline.filter(p => {
                                  const matchesDate = (isDueToday(p.next_action_date, p.action_status) && i === 0) || (parseFlexibleDate(p.next_action_date)?.toLocaleDateString() === targetDate.toLocaleDateString());
                                  if (!matchesDate) return false;
                                  if (weeklyActionTypeFilter !== 'All actions') {
                                    return normalizeActionType(p.last_activity) === weeklyActionTypeFilter;
                                  }
                                  return true;
                                });
                                if (dayItems.length === 0 && i !== 0) return null;
                                return (
                                  <div key={safeKey('weekly-mobile-day', dayName, i)} className="space-y-2">
                                    <div className={`flex items-center gap-2 px-1 ${i === 0 ? 'text-orbe-green' : 'text-gray-400'}`}>
                                      <span className="text-[10px] font-black uppercase tracking-widest">{dayName}</span>
                                      <span className="h-px bg-current opacity-20 flex-1" />
                                      <span className="text-[10px] font-bold opacity-60 font-mono">{dayDate}</span>
                                    </div>
                                    <div className="space-y-3">
                                      {dayItems.length === 0 ? (
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                                          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest italic">
                                            {weeklyActionTypeFilter !== 'All actions' ? 'No actions of this type in the selected window.' : 'No actions scheduled'}
                                          </p>
                                        </div>
                                      ) : (
                                        dayItems.map((item, index) => (
                                          <div key={getPipelineKey(item, 'weekly-mobile-item', index)} className="bg-white p-4 rounded-2xl border border-orbe-tan/20 shadow-sm space-y-3">
                                             <div className="flex justify-between items-start text-left">
                                               <div className="flex-1">
                                                 <h6 className="font-black text-orbe-green text-[13px] uppercase tracking-tight leading-none">{item.company_name}</h6>
                                                 <div className="flex items-center gap-2 mt-1.5">
                                                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{item.owner_id || (item as any).owner || 'Unassigned'}</span>
                                                   <span className="text-[8px] text-gray-300">•</span>
                                                   <span className="text-[8px] font-bold text-orbe-tan uppercase">{item.status}</span>
                                                 </div>
                                               </div>
                                               <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.priority === 'Urgent' ? 'bg-red-100 text-red-600' : item.priority === 'High' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                 {item.priority}
                                               </div>
                                             </div>
                                             <p className="text-[11px] text-gray-500 italic leading-snug">"{item.last_activity}"</p>
                                             <div className="flex gap-2 pt-1 border-t border-gray-50">
                                               <button onClick={() => setTaskToAccomplish(item)} className="flex-1 py-3 bg-orbe-green text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm">
                                                 <CheckCircle size={16} /> Close
                                               </button>
                                               <button onClick={() => setPostponeItem(item)} className="px-4 py-3 bg-orbe-tan/10 text-orbe-green border border-orbe-tan/20 rounded-xl active:bg-orbe-tan/20 transition-all font-black">
                                                 <Clock size={16} />
                                               </button>
                                             </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {rollingDays > 7 && (
                                <div className="p-4 bg-orbe-green/5 rounded-2xl border border-orbe-tan/20 text-center">
                                    <p className="text-[10px] font-black text-orbe-green uppercase tracking-widest">
                                        + {filteredPipeline.filter(p => isWithinNextDays(p.next_action_date, rollingDays, p.action_status) && !isWithinNextDays(p.next_action_date, 6, p.action_status)).length} more actions in the extended {rollingDays}-day window
                                    </p>
                                </div>
                            )}
                          </div>

                          {/* 5. HIGH IMPACT & GAPS */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* High Impact Opportunities */}
                            <div className="bg-white rounded-3xl border border-orbe-tan/30 shadow-sm overflow-hidden h-fit">
                              <div className="p-5 border-b border-orbe-tan/20 flex justify-between items-center bg-gray-50/50">
                                <div>
                                  <h4 className="text-xs font-black text-orbe-green uppercase tracking-widest">High Impact Opportunities</h4>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Key revenue drivers or advanced stages</p>
                                </div>
                                <Star size={18} className="text-orange-500" />
                              </div>
                              <div className="divide-y divide-orbe-tan/10 max-h-[400px] overflow-y-auto">
                                {(() => {
                                  const highImpact = filteredPipeline.filter(p => {
                                    const isHighPrio = p.priority === 'Urgent' || p.priority === 'High';
                                    const advancedStage = ['Baking off', 'Grajales', 'Negotiating'].includes(p.status);
                                    return isHighPrio || advancedStage;
                                  }).slice(0, 10);

                                  return highImpact.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest italic">No high impact leads detected</div>
                                  ) : (
                                    highImpact.map((item, index) => (
                                      <div 
                                        key={getPipelineKey(item, 'impact-item', index)} 
                                        className="p-4 flex items-center justify-between hover:bg-orbe-cream/20 transition-all group cursor-pointer active:bg-gray-100"
                                        onClick={() => setTaskToAccomplish(item)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${item.priority === 'Urgent' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                                            {item.priority === 'Urgent' ? 'U' : 'H'}
                                          </div>
                                          <div>
                                            <p className="font-bold text-orbe-green text-sm leading-tight">{item.company_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                               <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{item.status}</span>
                                               <span className="text-[8px] text-gray-300">•</span>
                                               <span className="text-[9px] text-orbe-tan font-bold leading-none">{formatDateSafe(item.next_action_date)}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="p-2 bg-gray-50 text-orbe-green rounded-xl border border-orbe-tan/20 group-hover:bg-orbe-green group-hover:text-white transition-all shadow-sm">
                                          <ChevronRight size={16} />
                                        </div>
                                      </div>
                                    )
                                  ));
                                })()}
                              </div>
                            </div>

                            {/* Pipeline Gaps */}
                            <div className="bg-white rounded-3xl border border-orbe-tan/30 shadow-sm overflow-hidden h-fit">
                              <div className="p-5 border-b border-orbe-tan/20 flex justify-between items-center bg-gray-50/50">
                                <div>
                                  <h4 className="text-xs font-black text-orbe-green uppercase tracking-widest">Pipeline Gaps</h4>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active leads missing next action date</p>
                                </div>
                                <AlertCircle size={18} className="text-purple-500" />
                              </div>
                              <div className="divide-y divide-orbe-tan/10 max-h-[400px] overflow-y-auto font-sans">
                                {(() => {
                                  const gaps = filteredPipeline.filter(p => !p.next_action_date).slice(0, 10);
                                  return gaps.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest italic">All active leads have a next action. Excellent!</div>
                                  ) : (
                                    gaps.map((item, index) => (
                                      <div 
                                        key={getPipelineKey(item, 'gap-item', index)} 
                                        className="p-4 flex items-center justify-between hover:bg-orbe-cream/20 transition-all group cursor-pointer active:bg-gray-100"
                                        onClick={() => setTaskToAccomplish(item)}
                                      >
                                        <div>
                                          <p className="font-bold text-orbe-green text-sm leading-tight">{item.company_name}</p>
                                          <p className="text-[9px] text-red-400 font-black uppercase tracking-widest mt-1 leading-none">Missing follow-up date</p>
                                        </div>
                                        <div className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-all text-[10px] font-black uppercase tracking-widest shadow-sm">
                                          Fix Momentum
                                        </div>
                                      </div>
                                    )
                                  ));
                                })()}
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
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
                <div className="p-4 md:p-8 border-b border-orbe-tan/30 bg-gray-50/50 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sticky top-0 z-20">
                  <div className="flex-1 flex flex-col md:flex-row gap-4">
                    <div className="max-w-md flex-1 relative">
                      <Search className="absolute left-4 top-3.5 md:top-3.5 text-orbe-tan" size={18} />
                      <input 
                        className="w-full pl-12 pr-4 py-3 bg-white border border-orbe-tan/50 rounded-xl outline-none focus:ring-2 ring-orbe-green/10 transition-all font-semibold text-orbe-green shadow-sm text-sm"
                        placeholder="Search by client, contact or lead..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="flex bg-gray-200/50 p-1 rounded-xl gap-1 overflow-x-auto scrollbar-none max-w-[280px] md:max-w-none">
                      {[
                        { value: 'All', label: 'ALL' },
                        { value: 'Potential client', label: 'POTENTIAL' },
                        { value: 'Client', label: 'CLIENT' },
                        { value: 'Not interested', label: 'DISCARDED' }
                      ].map((s, index) => {
                        const isActive = statusFilter === s.value;
                        return (
                          <button
                            key={safeKey('client-status-filter', s.value, index)}
                            onClick={() => setStatusFilter(s.value as any)}
                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                              isActive 
                                ? 'bg-orbe-green text-white shadow-md scale-105' 
                                : 'text-orbe-green/40 hover:bg-black/5'
                            }`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
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
                  <table className="hidden md:table min-w-[1100px] w-full text-left border-collapse desktop-table-only">
                    <thead className="bg-[#fcfaf7] border-b border-orbe-tan/30 sticky top-0 z-10 whitespace-nowrap">
                      <tr>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Notes</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Name</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Owner (Follow-up)</th>
                        <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orbe-tan/20 text-sm whitespace-nowrap">
                      {filteredClients.length === 0 ? (
                        <tr key="empty-db-row">
                          <td colSpan={8} className="p-20 text-center text-gray-400 font-medium italic">
                            No records found in client list.
                          </td>
                        </tr>
                      ) : (
                        filteredClients.map((c, idx) => {
                          const pipelineItem = pipeline.find(p => String(p.client_id) === String(c.client_id || c.id));
                          return (
                            <tr key={getClientKey(c, 'db-row', idx)} className="hover:bg-orbe-cream/30 transition-colors group">
                              <td className="p-5 font-mono text-xs text-gray-400">#{c.client_id || c.id || idx}</td>
                              <td className="p-5 font-bold text-orbe-green">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span>{c.company_name}</span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAccount360(c);
                                      }}
                                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-all border border-blue-100 bg-blue-50/30 cursor-pointer"
                                      title="Open Account 360º"
                                    >
                                      <LayoutDashboard size={14} />
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <span className={`text-[8px] uppercase tracking-tighter w-fit px-1 rounded border ${
                                      c.client_type === 'Client' ? 'bg-green-50 text-green-700 border-green-100' : 
                                      (c.client_type === 'Not interested' || c.client_type === 'Temporary Discarded' || c.client_type === 'Fail') ? 'bg-red-50 text-red-700 border-red-100' :
                                      'bg-gray-50 text-orbe-green border-orbe-tan'
                                    }`}>
                                      {c.client_type}
                                    </span>
                                    {renderProductTags(c.product_interest_tags)}
                                  </div>
                                </div>
                              </td>
                              <td className="p-5 text-center">
                                {c.notes ? (
                                  <div className="relative group/note flex justify-center">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        alert(c.notes);
                                      }}
                                      className="p-2 bg-blue-50 text-blue-600 rounded-lg transition-all hover:bg-blue-100 cursor-help"
                                    >
                                      <MessageSquare size={14} />
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white border border-orbe-tan/30 rounded-xl shadow-xl z-[100] opacity-0 invisible group-hover/note:opacity-100 group-hover/note:visible transition-all pointer-events-none">
                                      <div className="text-[10px] text-gray-600 font-medium whitespace-normal leading-relaxed text-left">
                                        <p className="font-black text-orbe-green uppercase tracking-widest mb-1 border-b border-orbe-tan/10 pb-1">Client Notes</p>
                                        <div className="max-h-40 overflow-y-auto pr-1">
                                          {c.notes}
                                        </div>
                                      </div>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="p-5 text-gray-600 font-medium">{c.contact_name}</td>
                              <td className="p-5">
                                <a href={`mailto:${c.email}`} className="text-orbe-green/70 hover:underline flex items-center gap-2">
                                  <Mail size={12} /> {c.email || '-'}
                                </a>
                              </td>
                              <td className="p-5 text-gray-500 font-mono text-xs">{c.mobile || '-'}</td>
                              <td className="p-5 text-gray-500 font-mono text-xs">{c.phone || '-'}</td>
                              <td className="p-5 text-center">
                                {pipelineItem ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-black text-orbe-green bg-orbe-tan/20 px-3 py-1 rounded-full uppercase tracking-wider">
                                      {pipelineItem.owner_id}
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
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => {
                                      const email = c.email;
                                      if (!email) {
                                        alert("Client has no email registered.");
                                        return;
                                      }
                                      window.location.href = `mailto:${email}`;
                                    }}
                                    className="p-2 bg-orbe-tan/10 text-orbe-green rounded-lg hover:bg-black/5 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                                    title="Enviar Email"
                                  >
                                    <Mail size={14} />
                                  </button>
                                  <a 
                                    href={`tel:${c.mobile || c.phone || ''}`}
                                    className="p-2 bg-orbe-tan/10 text-orbe-green rounded-lg hover:bg-black/5 transition-all shadow-sm flex items-center justify-center"
                                    title="Llamar"
                                  >
                                    <PhoneCall size={14} />
                                  </a>
                                  <button 
                                    onClick={() => setEditingClient(c)}
                                    className="p-2 bg-orbe-green text-white rounded-lg hover:bg-black/90 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                                    title="Editar Cliente"
                                  >
                                    <Settings size={14} />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const id = c.client_id || (c as any).id;
                                      setShowDeleteModal(id);
                                    }}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                                    title="Borrar Cliente"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
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
                      filteredClients.map((c, idx) => {
                        const pipelineItem = pipeline.find(p => String(p.client_id) === String(c.client_id || c.id));
                        return (
                          <div key={getClientKey(c, 'db-mob', idx)} className="bg-white rounded-2xl border border-orbe-tan/40 shadow-sm overflow-hidden flex flex-col active:bg-orbe-cream/10 transition-all">
                            <div className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-2">
                                  <h4 className="font-black text-orbe-green text-lg leading-tight truncate uppercase tracking-tighter">{c.company_name}</h4>
                                  <div className="flex items-center gap-2 mt-1 text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-none">
                                    <UserCircle size={10} /> {c.contact_name || 'No contact'}
                                  </div>
                                </div>
                                <div className={`shrink-0 px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-tighter border ${
                                  c.client_type === 'Client' ? 'bg-green-50 text-green-700 border-green-100' : 
                                  c.client_type === 'Temporary Discarded' ? 'bg-red-50 text-red-700 border-red-100' :
                                  'bg-gray-50 text-orbe-green border-orbe-tan'
                                }`}>
                                  {c.client_type}
                                </div>
                              </div>

                              <div className="mt-2">
                                {renderProductTags(c.product_interest_tags, 5)}
                              </div>

                              {c.notes && (
                                <div className="mt-3 p-3 bg-blue-50/30 rounded-xl border border-blue-100/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare size={10} className="text-blue-500" />
                                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Notes</span>
                                  </div>
                                  <p className="text-[10px] text-gray-600 leading-tight line-clamp-2">{c.notes}</p>
                                </div>
                              )}

                              <div className="mt-3 grid grid-cols-3 gap-2">
                                <a href={`mailto:${c.email}`} className="bg-gray-50 py-2 px-1 rounded-lg border border-orbe-tan/20 flex items-center justify-center gap-1 group active:bg-orbe-tan/10 transition-colors">
                                  <Mail size={12} className="text-orbe-tan group-active:text-orbe-green transition-colors" />
                                  <span className="text-[8px] font-black text-orbe-green/70 uppercase tracking-widest">Email</span>
                                </a>
                                <a href={`tel:${c.mobile || c.phone}`} className="bg-gray-50 py-2 px-1 rounded-lg border border-orbe-tan/20 flex items-center justify-center gap-1 group active:bg-orbe-tan/10 transition-colors">
                                  <PhoneCall size={12} className="text-orbe-tan group-active:text-orbe-green transition-colors" />
                                  <span className="text-[8px] font-black text-orbe-green/70 uppercase tracking-widest">Call</span>
                                </a>
                                <button 
                                  onClick={() => setSelectedAccount360(c)}
                                  className="bg-blue-50 py-2 px-1 rounded-lg border border-blue-100 flex items-center justify-center gap-1 group active:bg-blue-100 transition-colors"
                                >
                                  <LayoutDashboard size={12} className="text-blue-500" />
                                  <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">360º</span>
                                </button>
                              </div>
                            </div>
                            <div className="bg-orbe-cream/20 px-4 py-3 border-t border-orbe-tan/20 flex justify-between items-center">
                              {pipelineItem ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-orbe-green flex items-center justify-center text-white text-[9px] font-black">
                                    {(pipelineItem.owner_id || '?')[0]}
                                  </div>
                                  <span className="text-[10px] font-black text-orbe-green uppercase tracking-tighter">{pipelineItem.owner_id}</span>
                                </div>
                              ) : (
                                <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Unassigned</span>
                              )}
                              <div className="flex gap-2">
                                {!pipelineItem && (
                                  <button onClick={() => { setAssigningClient(c); setAssigningOwner(''); setShowAssignConfirm(false); }} className="px-3 py-1.5 bg-orbe-green text-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-orbe-green active:opacity-80 transition-all">Assign</button>
                                )}
                                <button onClick={() => setEditingClient(c)} className="p-2 bg-white border border-orbe-tan/30 text-orbe-green rounded-lg active:bg-orbe-tan/20 transition-all shadow-sm"><Settings size={14} /></button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const id = c.client_id || (c as any).id;
                                    setShowDeleteModal(id);
                                  }}
                                  className="p-2 bg-red-50 text-red-600 border border-red-100 rounded-lg active:bg-red-100 transition-all shadow-sm"
                                >
                                  <Trash2 size={14} />
                                </button>
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

          {/* OVERVIEW DETAIL DRAWER */}
          <AnimatePresence>
            {selectedDetail && (
              <OrbeModal
                isOpen={!!selectedDetail}
                onClose={() => setSelectedDetail(null)}
                title={selectedDetail.label}
                subtitle={`Listing unique clients • ${selectedDetail.items.length} current status`}
                icon={<Database size={20} />}
                modalKey="overview-detail-modal"
                size="xl"
                footer={
                  <button 
                    onClick={() => setSelectedDetail(null)}
                    className="w-full py-4 bg-orbe-green text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-orbe-green/20 active:scale-[0.98] transition-all"
                  >
                    Close Overview
                  </button>
                }
              >
                <div className="space-y-4">
                  {selectedDetail.items.length > 0 ? (
                    selectedDetail.items.map((item, idx) => {
                      const client = item.client || (item.client_id ? item : null);
                      const mainP = item.principal || (item.id ? item : null);
                      const companyName = client?.company_name || mainP?.company_name || 'Unknown Company';
                      
                      return (
                        <div 
                          key={safeKey('detail-row', companyName, idx)}
                          className="bg-white rounded-2xl border border-orbe-tan/20 shadow-sm overflow-hidden flex flex-col hover:border-orbe-green/30 transition-all"
                        >
                          <div className="p-4 border-b border-orbe-tan/10 bg-gray-50/30 flex justify-between items-center">
                            <div>
                              <h5 className="font-black text-orbe-green uppercase text-xs truncate">{companyName}</h5>
                              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {client?.client_id || item.client_id || 'N/A'}</p>
                            </div>
                            <span className="px-2 py-0.5 bg-orbe-green/5 text-orbe-green text-[8px] font-black rounded-lg uppercase border border-orbe-tan/10">
                              {client?.client_type || item.client_type || 'Potential'}
                            </span>
                          </div>
                          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Responsable</label>
                              <div className="flex items-center gap-2">
                                <UserCircle size={10} className="text-orbe-green/40" />
                                <span className="text-[9px] font-black text-orbe-green uppercase">{item.owner_id || mainP?.owner_id || 'Unassigned'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Layers size={10} className="text-orbe-green/40" />
                                <span className="text-[9px] font-bold text-gray-600 uppercase truncate">{item.effectiveStage || mainP?.client_status || mainP?.status || 'No status'}</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Current Action</label>
                              <div className="flex items-center gap-2">
                                <Activity size={10} className="text-orbe-green/40" />
                                <span className="text-[9px] font-black text-orbe-green uppercase truncate">{item.effectiveAction || mainP?.last_activity || mainP?.last_action || 'No action'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${isDone(mainP?.action_status) ? 'bg-green-500' : 'bg-blue-500'}`} />
                                <span className="text-[9px] font-bold text-gray-600 uppercase">{mainP?.action_status || 'Pending'}</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Dates & Priority</label>
                              <div className="flex items-center gap-2">
                                <Calendar size={10} className="text-orbe-green/40" />
                                <span className={`text-[9px] font-black uppercase ${isOverdue(mainP?.next_action_date, mainP?.action_status) ? 'text-red-500' : 'text-gray-600'}`}>
                                  {formatDateSafe(mainP?.next_action_date)}
                                </span>
                              </div>
                              <div className={`text-[8px] font-black px-1.5 rounded-sm uppercase tracking-tighter w-fit ${
                                (mainP?.priority === 'High') ? 'bg-red-50 text-red-600' :
                                (mainP?.priority === 'Medium') ? 'bg-amber-50 text-amber-600' :
                                'bg-gray-50 text-gray-500'
                              }`}>
                                {mainP?.priority || 'Low'}
                              </div>
                            </div>

                            <div className="space-y-1 col-span-2 md:col-span-1">
                              <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Interaction Note</label>
                              <p className="text-[9px] text-gray-400 italic line-clamp-3 leading-tight">{mainP?.notes || client?.notes || item.notes || 'No notes available'}</p>
                            </div>
                          </div>
                          <div className="p-3 bg-gray-50/50 border-t border-orbe-tan/10 flex justify-end gap-3">
                             <button 
                               onClick={() => { setView('database'); setSearchTerm(companyName); setSelectedDetail(null); }}
                               className="text-[8px] font-black text-orbe-green uppercase tracking-widest hover:underline"
                             >
                               Open client
                             </button>
                             <button 
                               onClick={() => { setView('pipeline'); setSearchTerm(companyName); setSelectedDetail(null); }}
                               className="text-[8px] font-black text-orbe-green uppercase tracking-widest hover:underline"
                             >
                               Go to pipeline
                             </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                      <div className="w-16 h-16 bg-orbe-tan/10 rounded-full flex items-center justify-center text-orbe-tan/40">
                        <Database size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-orbe-green uppercase">No records found</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">No items match the selected segment or highlight</p>
                      </div>
                    </div>
                  )}
                </div>
              </OrbeModal>
            )}
          </AnimatePresence>

          {/* POSTPONED BALANCE MODAL */}
          <AnimatePresence>
            {selectedPostponedList && (
              <OrbeModal
                isOpen={!!selectedPostponedList}
                onClose={() => setSelectedPostponedList(null)}
                title="Postponed Balance"
                subtitle={`Analyzing delayed interactions for ${selectedPostponedList.owner}`}
                icon={<Clock size={20} />}
                variant="amber"
                modalKey="postponed-modal"
                size="2xl"
                footer={
                  <button 
                    onClick={() => setSelectedPostponedList(null)}
                    className="w-full py-4 bg-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all"
                  >
                    Close Report
                  </button>
                }
              >
                <div className="space-y-6">
                  {selectedPostponedList.items.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 italic font-medium bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 uppercase tracking-widest text-[10px]">
                      No postponed actions tracked for {selectedPostponedList.owner}.
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-orbe-tan/20 rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-orbe-tan/20">
                          <tr>
                            <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Company</th>
                            <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Delayed Action</th>
                            <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Orig. Date</th>
                            <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Target Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orbe-tan/10">
                          {selectedPostponedList.items.map((item, index) => {
                            const fromDate = item.last_contact_date || (item as any).previous_next_action_date || (item as any).old_next_action_date || (item as any).original_action_date || (item as any).previous_action_date;
                            
                            return (
                              <tr key={getPipelineKey(item, 'postponed-detail', index)} className="hover:bg-orange-50/30 transition-colors group">
                                <td className="p-4">
                                  <span className="text-[11px] font-black text-orbe-green uppercase tracking-tight group-hover:text-orange-600 transition-colors">
                                    {item.company_name || (item as any).company || 'Unknown account'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className="text-[10px] text-gray-500 font-medium truncate max-w-[150px] block">
                                    {item.last_activity || item.last_action || 'Pending follow-up'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase">
                                    {fromDate ? formatDateSafe(fromDate) : '---'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className="text-[10px] font-black text-orange-600 uppercase tabular-nums">
                                    {item.next_action_date ? formatDateSafe(item.next_action_date) : 'PENDING'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </OrbeModal>
            )}
          </AnimatePresence>

          {/* SELLER ACTIVITY MODAL */}
          <AnimatePresence>
            {selectedActivityList && (
              <OrbeModal
                isOpen={!!selectedActivityList}
                onClose={() => setSelectedActivityList(null)}
                title="Activity Analysis"
                subtitle={`Performance tracking for ${selectedActivityList.owner}`}
                icon={<Activity size={20} />}
                modalKey="seller-activity-modal"
                footer={
                  <button 
                    onClick={() => setSelectedActivityList(null)}
                    className="w-full py-4 bg-orbe-green text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-orbe-green/20 active:scale-[0.98] transition-all"
                  >
                    Close Analysis
                  </button>
                }
              >
                <div className="space-y-8">
                  {/* Stats Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(
                      selectedActivityList.items.reduce((acc: any, item) => {
                        const name = item.last_activity || 'Others';
                        acc[name] = (acc[name] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([name, count]: [string, any], index) => {
                      const percentage = Math.round((count / selectedActivityList.items.length) * 100);
                      return (
                        <div key={safeKey('drawer-stat', name, index)} className="bg-gray-50/50 border border-orbe-tan/10 p-4 rounded-2xl flex flex-col items-center text-center">
                          <span className="text-xl font-black text-orbe-green">{percentage}%</span>
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1 leading-tight">{name}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Activity Log */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <Clock size={14} className="text-orbe-green/40" />
                      <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-[0.2em]">Detailed History</h4>
                    </div>
                    <div className="space-y-3">
                      {selectedActivityList.items
                        .sort((a,b) => new Date(b.last_contact_date).getTime() - new Date(a.last_contact_date).getTime())
                        .map((item, index) => (
                        <div key={getPipelineKey(item, 'drawer-item', index)} className="bg-white border border-orbe-tan/10 p-5 rounded-3xl shadow-sm hover:border-orbe-green/30 transition-all flex flex-col gap-3 relative overflow-hidden group">
                          <div className="flex justify-between items-center bg-gray-50/50 -m-5 mb-0 px-5 py-3 border-b border-orbe-tan/10">
                            <h5 className="font-black text-orbe-green text-[10px] uppercase tracking-tight">{item.company_name}</h5>
                            <span className="text-[9px] font-black text-gray-400 tabular-nums">{formatDateSafe(item.last_contact_date)}</span>
                          </div>
                          <div className="pt-2">
                             <p className="text-xs text-gray-700 font-medium italic border-l-4 border-orbe-tan/20 pl-4 py-1">"{item.last_activity}"</p>
                             <div className="flex items-center gap-2 mt-4">
                               <div className={`w-1.5 h-1.5 rounded-full ${item.priority === 'High' ? 'bg-red-500' : 'bg-blue-500'}`} />
                               <span className={`text-[9px] font-black uppercase tracking-widest ${item.priority === 'High' ? 'text-red-600' : 'text-blue-600'}`}>
                                 {item.priority} Priority
                               </span>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </OrbeModal>
            )}
          </AnimatePresence>

          {/* MODAL EDITAR CLIENTE */}
          <AnimatePresence>
            {editingClient && (
              <OrbeModal
                isOpen={!!editingClient}
                onClose={() => setEditingClient(null)}
                title="Edit Account"
                subtitle={editingClient.company_name}
                icon={<Settings className="w-5 h-5 md:w-6 md:h-6" />}
                size="lg"
                variant="default"
                modalKey="edit-client-modal"
                footer={
                  <div className="flex flex-col md:flex-row gap-3">
                    <button 
                      type="button" 
                      onClick={() => setEditingClient(null)} 
                      className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all border border-gray-200"
                    >
                      CANCEL
                    </button>
                    <button 
                      form="edit-client-form-v2"
                      type="submit" 
                      disabled={isSaving} 
                      className="flex-[2] bg-orbe-green text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orbe-green/20"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SAVE UPDATES
                    </button>
                  </div>
                }
              >
                <form 
                  id="edit-client-form-v2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (isSaving) return;
                    setIsSaving(true);
                    try {
                      const formData = new FormData(e.currentTarget);
                      const updates: any = {
                        company_name: (formData.get('company_name') as string || '').trim(),
                        contact_name: (formData.get('contact_name') as string || '').trim(),
                        lead_name: (formData.get('lead_name') as string || '').trim(),
                        email: (formData.get('email') as string || '').trim(),
                        phone: (formData.get('phone') as string || '').trim(),
                        mobile: (formData.get('mobile') as string || '').trim(),
                        address: (formData.get('address') as string || '').trim(),
                        client_type: formData.get('client_type') as string,
                        notes: (formData.get('notes') as string || '').trim(),
                        product_interest_tags: editingClientTags,
                      };
                      await handleUpdateClient(editingClient.client_id, updates);
                      setEditingClient(null);
                      await fetchClients();
                    } catch (err: any) {
                      alert(`Error: ${err.message || 'Unknown'}`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="space-y-8"
                >
                  {/* SECTION 1: COMPANY */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-orbe-tan/20">
                      <Building2 size={14} className="text-orbe-green" />
                      <h4 className="text-[10px] font-black text-orbe-green/60 uppercase tracking-widest">Company Identification</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Company Name</label>
                        <input name="company_name" defaultValue={editingClient.company_name} className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all font-bold text-orbe-green" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Client Status</label>
                        <select name="client_type" defaultValue={editingClient.client_type || 'Potential client'} className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all font-bold text-orbe-green uppercase text-xs">
                          <option value="Potential client">POTENTIAL CLIENT</option>
                          <option value="Client">CLIENT</option>
                          <option value="Temporary Discarded">TEMPORARY DISCARDED</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: CONTACT */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-orbe-tan/20">
                      <Star size={14} className="text-orbe-green" />
                      <h4 className="text-[10px] font-black text-orbe-green/60 uppercase tracking-widest">Contact Information</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Lead Name</label>
                        <input name="lead_name" defaultValue={editingClient.lead_name} className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Contact Person</label>
                        <input name="contact_name" defaultValue={editingClient.contact_name} className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Corporate Email</label>
                        <input name="email" type="email" defaultValue={editingClient.email} className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Phone</label>
                        <input name="phone" defaultValue={editingClient.phone} className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Mobile</label>
                        <input name="mobile" defaultValue={editingClient.mobile} className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: ADDRESS & NOTES */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-orbe-tan/20">
                      <Globe size={14} className="text-orbe-green" />
                      <h4 className="text-[10px] font-black text-orbe-green/60 uppercase tracking-widest">Logistics & Notes</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Office Address</label>
                        <textarea name="address" rows={2} defaultValue={editingClient.address_line_1 || (editingClient as any).address} className="w-full p-3 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all resize-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Client Notes</label>
                        <textarea name="notes" rows={3} defaultValue={editingClient.notes} className="w-full p-3 bg-blue-50/20 border border-blue-100/50 rounded-xl focus:ring-2 ring-blue-500/10 outline-none transition-all resize-none text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: PRODUCT TAGS */}
                  <div className="space-y-4 bg-orbe-cream/20 p-4 md:p-6 rounded-2xl border border-orbe-tan/20">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-orbe-tan/20">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" />
                        <h4 className="text-[10px] font-black text-orbe-green tracking-widest uppercase">Product Opportunity Tags</h4>
                      </div>
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter italic">Select all that apply</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PRODUCT_INTEREST_TAGS.map(tag => {
                        const isSelected = editingClientTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setEditingClientTags(editingClientTags.filter(t => t !== tag));
                              } else {
                                setEditingClientTags([...editingClientTags, tag]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all border ${
                              isSelected 
                                ? 'bg-orbe-green text-white border-orbe-green shadow-md scale-105' 
                                : 'bg-white text-orbe-green/50 border-orbe-tan/40 hover:border-orbe-green/30 hover:text-orbe-green hover:bg-black/5'
                            }`}
                          >
                            {getProductTagLabel(tag)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </form>
              </OrbeModal>
            )}
          </AnimatePresence>


          {/* MODAL TASK ACCOMPLISHED */}
          <AnimatePresence>
            {taskToAccomplish && (
              <OrbeModal
                isOpen={!!taskToAccomplish}
                onClose={() => {
                  setTaskToAccomplish(null);
                  setModalError(null);
                }}
                title="Action Completed"
                subtitle={taskToAccomplish.company_name}
                icon={<CheckCircle2 size={20} />}
                variant="success"
                modalKey="task-accomplish-modal"
                footer={
                  <div className="flex flex-col md:flex-row gap-3">
                    <button 
                      type="button"
                      onClick={() => setTaskToAccomplish(null)}
                      className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] hover:bg-gray-100 transition-all border border-gray-200"
                    >
                      Cancel
                    </button>
                    <button 
                      form="task-accomplish-form"
                      type="submit"
                      disabled={!accomplishAction || !accomplishDate}
                      className={`flex-[2] py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                        (!accomplishAction || !accomplishDate) 
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                          : 'bg-orbe-green text-white hover:bg-orbe-green/90 shadow-orbe-green/20'
                      }`}
                    >
                      <CheckCircle size={18} />
                      Confirm & Schedule
                    </button>
                  </div>
                }
              >
                <form 
                  id="task-accomplish-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const nextAction = accomplishAction;
                    const comments = formData.get('comments') as string;

                    if (nextAction.trim().toLowerCase() === (taskToAccomplish.last_action || '').trim().toLowerCase()) {
                      setModalError("Please select a NEW action. You cannot repeat the same action twice.");
                      return;
                    }

                    if (!comments || comments.trim().length < 5) {
                      setModalError("Please provide more detailed comments (min 5 characters).");
                      return;
                    }

                    handleAccomplishTask(
                      taskToAccomplish, 
                      nextAction, 
                      accomplishDate,
                      comments,
                      formData.get('new_status') as PipelineStatus
                    );
                  }}
                  className="space-y-6"
                >
                  {modalError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest animate-shake">
                      {modalError}
                    </div>
                  )}

                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex flex-col items-center text-center">
                    <p className="text-green-800 text-sm font-medium italic">Logging accomplishment for:</p>
                    <p className="text-green-900 font-black text-lg mt-1 truncate w-full">{taskToAccomplish.company_name}</p>
                    <div className="mt-2 text-[10px] font-bold text-green-700/60 uppercase tracking-widest italic flex items-center gap-2">
                       <Activity size={12} /> {taskToAccomplish.last_action || 'Current Action'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-[0.1em]">Next Action <span className="text-red-400">*</span></label>
                      <select 
                        name="next_action"
                        required
                        value={accomplishAction}
                        onChange={(e) => {
                          setModalError(null);
                          setAccomplishAction(e.target.value);
                        }}
                        className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl outline-none focus:ring-4 ring-orbe-green/5 transition-all text-sm font-black text-orbe-green uppercase appearance-none cursor-pointer"
                      >
                        <option value="" disabled>SELECT ACTION</option>
                        {PREDEFINED_ACTIONS.map(action => {
                          const isCurrent = action.trim().toLowerCase() === (taskToAccomplish.last_action || '').trim().toLowerCase();
                          return (
                            <option 
                              key={action} 
                              value={action}
                              disabled={isCurrent}
                            >
                              {action.toUpperCase()} {isCurrent ? '(CURRENT)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-[0.1em]">Next Due Date <span className="text-red-400">*</span></label>
                      <input 
                        type="date"
                        name="next_due_date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={accomplishDate}
                        onChange={(e) => setAccomplishDate(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl outline-none focus:ring-4 ring-orbe-green/5 transition-all text-sm font-black text-orbe-green uppercase"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-[0.1em]">Target Account Stage</label>
                      <select 
                        name="new_status"
                        defaultValue={taskToAccomplish.status}
                        className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl outline-none focus:ring-4 ring-orbe-green/5 transition-all text-[12px] font-black text-orbe-green uppercase appearance-none cursor-pointer"
                      >
                        {PIPELINE_STATUSES.map(status => (
                          <option key={status} value={status}>{status.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-[0.1em]">Interaction Details / Feedback</label>
                      <textarea 
                        name="comments"
                        required
                        rows={4}
                        className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-4 ring-orbe-green/5 outline-none transition-all text-sm min-h-[100px] resize-none"
                        placeholder="Detail what happened during the contact..."
                      />
                    </div>
                  </div>
                </form>
              </OrbeModal>
            )}
          </AnimatePresence>


        {/* MODAL POSTPONE */}
        <AnimatePresence>
          {postponeItem && (
            <OrbeModal
              isOpen={!!postponeItem}
              onClose={() => {
                setPostponeItem(null);
                setModalError(null);
                setIsConfirmingPostpone(false);
              }}
              title="Postpone Action"
              subtitle={postponeItem.company_name}
              icon={<Clock size={20} />}
              variant="amber"
              modalKey="postpone-modal"
              footer={
                <div className="flex flex-col md:flex-row gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setPostponeItem(null);
                      setIsConfirmingPostpone(false);
                    }} 
                    className="flex-1 py-4 bg-white text-gray-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] hover:bg-gray-50 transition-all border border-orbe-tan/30"
                  >
                    Cancel
                  </button>
                  {!isConfirmingPostpone ? (
                    <button 
                      type="button"
                      onClick={() => {
                        if (!postponeDate) {
                          setModalError("Please select a date.");
                          return;
                        }
                        if (!postponeReason || !postponeReason.trim() || postponeReason.trim().length < 5) {
                          setModalError("Please provide a valid reason (min 5 characters).");
                          return;
                        }
                        setModalError(null);
                        setIsConfirmingPostpone(true);
                      }}
                      className="flex-[2] py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Save size={14} />
                      Continue
                    </button>
                  ) : (
                    <button 
                      form="postpone-form"
                      type="submit"
                      className="flex-[2] py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
                    >
                      Confirm Reschedule
                    </button>
                  )}
                </div>
              }
            >
              <form 
                id="postpone-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!postponeReason || !postponeReason.trim() || postponeReason.trim().length < 5) {
                    setModalError("Please provide a valid reason (min 5 characters).");
                    setIsConfirmingPostpone(false);
                    return;
                  }
                  handlePostponeTask(postponeItem, postponeDate, postponeReason);
                }}
                className="space-y-6"
              >
                {modalError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center animate-shake">
                    {modalError}
                  </div>
                )}
                
                {!isConfirmingPostpone ? (
                  <>
                    <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 flex flex-col items-center text-center">
                      <p className="text-amber-800 text-sm font-medium italic">Rescheduling current action for:</p>
                      <p className="text-amber-900 font-black text-lg mt-1 truncate w-full">{postponeItem.company_name}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-xl border border-orbe-tan/20 flex items-center gap-3">
                        <UserCircle size={18} className="text-orbe-green opacity-50" />
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Responsable</p>
                          <p className="text-xs font-black text-orbe-green uppercase">
                            {postponeItem.owner_id || 
                             (postponeItem as any).owner || 
                             (postponeItem as any).assigned_to || 
                             (postponeItem as any).assigned_to_user || 
                             'Unassigned'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Select New Date</label>
                        <input 
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          max={(() => {
                            const d = new Date();
                            d.setMonth(d.getMonth() + 3);
                            return d.toISOString().split('T')[0];
                          })()}
                          value={postponeDate}
                          onChange={(e) => {
                            setModalError(null);
                            setPostponeDate(e.target.value);
                          }}
                          className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-amber-500/10 outline-none transition-all text-sm font-bold text-orbe-green"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Justification <span className="text-red-400">*</span></label>
                        <textarea 
                          value={postponeReason}
                          onChange={(e) => {
                            setModalError(null);
                            setPostponeReason(e.target.value);
                          }}
                          required
                          rows={3}
                          className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-amber-500/10 outline-none transition-all text-sm resize-none"
                          placeholder="Why is this action being delayed?"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-8 py-4">
                    <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto border border-orange-100 rotate-12">
                      <AlertTriangle size={32} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="font-black text-orbe-green text-xl uppercase tracking-tight">Final Confirmation</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        You are postponing this action until <span className="font-black text-amber-600 underline decoration-2 underline-offset-4">{formatDateSafe(postponeDate)}</span>.
                      </p>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-orbe-tan/10 text-left">
                        <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Reason provided:</p>
                        <p className="text-xs text-gray-600 italic">"{postponeReason}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </OrbeModal>
          )}
        </AnimatePresence>

        {/* MODAL ADVERTENCIA DUPLICADOS */}
        <AnimatePresence>
          {showDuplicateModal && duplicateMatch && (
            <OrbeModal
              isOpen={showDuplicateModal}
              onClose={() => {
                setShowDuplicateModal(false);
                setDuplicateMatch(null);
                setPendingPayload(null);
              }}
              title="Duplicate Warning"
              subtitle="POSSIBLE EXISTING CLIENT MATCH"
              icon={<AlertTriangle size={20} />}
              variant="amber"
              modalKey="duplicate-warning-modal"
              footer={
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => executeSaveClient(pendingPayload)}
                    className="w-full py-4 bg-orbe-green text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-orbe-green/90 transition-all shadow-lg shadow-orbe-green/20 active:scale-95"
                  >
                    Confirm as New Account
                  </button>
                  <button 
                    onClick={() => {
                      setShowDuplicateModal(false);
                      setDuplicateMatch(null);
                      setPendingPayload(null);
                    }}
                    className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] hover:bg-gray-100 transition-all active:scale-95 border border-orbe-tan/30"
                  >
                    Cancel & Review
                  </button>
                </div>
              }
            >
              <div className="space-y-6">
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100/50 text-center">
                  <p className="text-amber-800 text-sm font-medium italic">We found a very similar entry:</p>
                  <p className="text-amber-900 font-black text-xl mt-1 uppercase tracking-tight leading-tight">
                    {duplicateMatch.company_name}
                  </p>
                  <div className="mt-2 text-[9px] font-bold text-amber-700/60 uppercase tracking-widest bg-white/50 py-1 px-3 rounded-full w-fit mx-auto border border-amber-200">
                    ID: {duplicateMatch.id.slice(0, 8)}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-500 text-xs leading-relaxed text-center px-4">
                    Creating duplicate entries can lead to data fragmentation and reporting errors. Are you sure <span className="font-bold text-orbe-green">"{pendingPayload?.company_name}"</span> is a different entity?
                  </p>
                  
                  <div className="bg-orbe-cream/30 p-4 rounded-xl border border-orbe-tan/10 space-y-2">
                    <p className="text-[9px] font-black text-orbe-green uppercase tracking-widest text-center">Security Checklist</p>
                    <ul className="text-[10px] text-gray-500 space-y-1">
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-amber-400 rounded-full" />
                        Verify Tax ID / CIF matches
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-amber-400 rounded-full" />
                        Check if it belongs to a different subsidiary
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-amber-400 rounded-full" />
                        Confirm it's not a variation of the same name
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </OrbeModal>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingItem && (
            <OrbeModal
              isOpen={!!editingItem}
              onClose={() => setEditingItem(null)}
              title="Edit Activity"
              subtitle={editingItem.company_name}
              icon={<Edit2 size={20} />}
              variant="blue"
              modalKey="edit-pipeline-modal"
              footer={
                <div className="flex flex-col md:flex-row gap-3">
                  <button 
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="flex-1 py-4 bg-white text-gray-400 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] hover:bg-gray-50 transition-all border border-orbe-tan/30"
                  >
                    Cancel
                  </button>
                  <button 
                    form="edit-pipeline-form"
                    type="submit"
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    Save Updates
                  </button>
                </div>
              }
            >
              <form 
                id="edit-pipeline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleEditTask(
                    editingItem.id,
                    editingItem.client_id,
                    {
                      last_activity: formData.get('last_activity') as string,
                      status: formData.get('status') as PipelineStatus,
                      notes: formData.get('notes') as string
                    }
                  );
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-orbe-tan/10">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Owner</p>
                    <div className="flex items-center gap-2">
                      <UserCircle size={16} className="text-orbe-green/40" />
                      <span className="text-sm font-black text-orbe-green uppercase">{editingItem.owner_id || 'System'}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-orbe-tan/10">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Next Deadline</p>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-orbe-green/40" />
                      <span className="text-sm font-black text-orbe-green uppercase font-mono">{formatDateSafe(editingItem.next_action_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest px-1">Pipeline Stage</label>
                    <select 
                      name="status"
                      defaultValue={editingItem.status}
                      className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-4 ring-blue-500/10 outline-none transition-all text-sm font-black text-blue-800 uppercase appearance-none cursor-pointer"
                    >
                      {PIPELINE_STATUSES.map(status => (
                        <option key={status} value={status}>{status.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest px-1">Engagement Type</label>
                    <select 
                      name="last_activity"
                      defaultValue={editingItem.last_activity}
                      className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-4 ring-blue-500/10 outline-none transition-all text-sm font-black text-blue-800 uppercase appearance-none cursor-pointer"
                    >
                      {PREDEFINED_ACTIONS.map(action => (
                        <option key={action} value={action}>{action.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest px-1">Internal Remarks</label>
                    <textarea 
                      name="notes"
                      defaultValue={editingItem.notes}
                      rows={4}
                      className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-4 ring-blue-500/10 outline-none transition-all text-sm min-h-[120px] resize-none"
                      placeholder="Enter internal details about this state..."
                    />
                  </div>
                </div>
              </form>
            </OrbeModal>
          )}
        </AnimatePresence>


        {/* MODAL HISTORIAL */}
        <AnimatePresence>
          {selectedClientForHistory && (
            <OrbeModal
              isOpen={!!selectedClientForHistory}
              onClose={() => setSelectedClientForHistory(null)}
              title="Interaction Log"
              subtitle={selectedClientForHistory.company_name}
              icon={<History size={20} />}
              modalKey="history-modal"
              size="lg"
            >
              <div className="space-y-8">
                {/* Añadir Nota */}
                <div className="bg-orbe-cream/30 p-5 rounded-2xl border border-orbe-tan/20">
                  <label className="block text-[10px] font-bold text-orbe-green/60 uppercase mb-3 tracking-widest px-1">Record a Quick Note</label>
                  <div className="flex flex-col md:flex-row gap-3">
                    <textarea 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1 p-4 bg-white border border-orbe-tan/30 rounded-xl text-sm outline-none focus:ring-4 ring-orbe-green/5 transition-all min-h-[80px] resize-none"
                      placeholder="Write relevant interaction details here..."
                    />
                    <button 
                      onClick={() => {
                        if (newNote.trim()) {
                          addHistoryEntry(selectedClientForHistory.client_id, 'note', newNote);
                          setNewNote('');
                        }
                      }}
                      className="bg-orbe-green text-white px-8 md:w-32 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orbe-green/90 shadow-lg shadow-orbe-green/20 transition-all active:scale-95 py-4 md:py-0"
                    >
                      Log Note
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 px-1">
                    <Activity size={14} className="text-orbe-green/40" />
                    <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-[0.2em]">Timeline Activity</h4>
                  </div>

                  <div className="space-y-4">
                    {loadingHistory ? (
                      <div key="loading-history" className="py-12 flex flex-col items-center justify-center gap-4 text-orbe-green/40 text-center italic">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Synchronizing records...</span>
                      </div>
                    ) : (!clientHistory || clientHistory.length === 0) ? (
                      <div key="no-history" className="py-16 text-center text-gray-400 font-bold bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 uppercase tracking-widest text-[10px] px-8">
                        No historical records found for this account.
                      </div>
                    ) : (
                      clientHistory.map((log, index) => (
                        <div key={safeKey('history-item', log.id, index)} className="relative pl-8 border-l border-orbe-tan/20 last:border-l-0 pb-8 group">
                          <div className={`absolute -left-[6px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all group-hover:scale-125 ${
                            log.type === 'status_change' ? 'bg-amber-400' : 
                            log.type === 'priority_change' ? 'bg-red-500' : 
                            'bg-orbe-green'
                          }`}></div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center bg-gray-50/40 p-2 rounded-lg">
                              <span className="text-[10px] font-black text-orbe-green/50 uppercase tracking-widest">
                                {formatDateTimeSafe(log.next_action_date || log.created_at)}
                              </span>
                              <div className="flex items-center gap-2 px-2 py-0.5 bg-white border border-orbe-tan/20 rounded-full">
                                <UserCircle size={10} className="text-orbe-green/30" />
                                <span className="text-[8px] font-black text-orbe-green/60 uppercase tracking-tighter truncate max-w-[100px]">
                                  {(log.created_by?.split('@') || [])[0] || 'ORBE SYSTEM'}
                                </span>
                              </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-orbe-tan/10 shadow-sm group-hover:border-orbe-tan/30 group-hover:shadow-md transition-all">
                              <div className="text-[11px] font-black text-orbe-green uppercase tracking-tight leading-tight flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  log.type === 'status_change' ? 'bg-amber-400' : 'bg-orbe-green'
                                }`} />
                                {log.last_activity || 'Activity Logged'}
                              </div>
                              
                              {log.notes && log.notes.trim() !== '' && (
                                <div className="mt-3 text-[12px] text-gray-700 leading-relaxed font-normal bg-orbe-cream/5 p-4 rounded-xl border border-orbe-tan/5 italic relative">
                                  <span className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-bold text-gray-300">DETAILS</span>
                                  {log.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </OrbeModal>
          )}
        </AnimatePresence>

      </section>
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

      {/* ACCOUNT 360 DRAWER */}
      <AnimatePresence>
        {selectedAccount360 && (() => {
          const clientPipeline = pipeline.filter(p => String(p.client_id) === String(selectedAccount360.client_id));
          const mainRecord = getMainPipelineRecord(clientPipeline);
          const currentStage = getEffectivePipelineStage(mainRecord);
          const samplesStatus = normalizeSamplesStatus(mainRecord?.samples_sent);
          
          return (
            <OrbeModal
              isOpen={!!selectedAccount360}
              onClose={() => setSelectedAccount360(null)}
              title={selectedAccount360.company_name}
              icon={<LayoutDashboard size={20} />}
              modalKey="account-360-modal"
              size="xl"
              mobileMode="fullscreen"
              footer={
                <div className="flex flex-wrap gap-3">
                   <button 
                     onClick={() => setEditingClient(selectedAccount360)}
                     className="flex-1 min-w-[120px] py-3 bg-white border border-orbe-tan/30 rounded-xl text-[10px] font-black text-orbe-green uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                   >
                     <Edit2 size={14} /> Edit Identity
                   </button>
                   {mainRecord && (
                     <button 
                       onClick={() => setEditingItem(mainRecord)}
                       className="flex-1 min-w-[120px] py-3 bg-white border border-orbe-tan/30 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                     >
                       <Briefcase size={14} /> Edit Pipeline
                     </button>
                   )}
                   {mainRecord && !isDone(mainRecord.action_status) && (
                     <>
                       <button 
                         onClick={() => setPostponeItem(mainRecord)}
                         className="flex-1 min-w-[120px] py-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                       >
                         <Clock size={14} /> Postpone
                       </button>
                       <button 
                         onClick={() => setTaskToAccomplish(mainRecord)}
                         className="flex-[2] min-w-[160px] py-3 bg-orbe-green text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-orbe-green/90 shadow-lg shadow-orbe-green/20 transition-all flex items-center justify-center gap-2"
                       >
                         <CheckCircle2 size={14} /> Complete Action
                       </button>
                     </>
                   )}
                </div>
              }
            >
              <div className="space-y-8">
                {/* SECTION 1: HEADER SUMMARY */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-orbe-tan/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Type</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase ${
                      selectedAccount360.client_type === 'Client' ? 'bg-green-50 text-green-600 border-green-100' : 
                      selectedAccount360.client_type === 'Temporary Discarded' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                      'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {selectedAccount360.client_type || 'Potential'}
                    </span>
                  </div>
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-orbe-tan/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Owner</p>
                    <div className="flex items-center gap-2">
                      <UserCircle size={14} className="text-orbe-green/40" />
                      <span className="text-[10px] font-black text-orbe-green uppercase">{mainRecord?.owner_id || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-orbe-tan/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Pipeline Stage</p>
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-orbe-green/40" />
                      <span className="text-[10px] font-black text-orbe-green uppercase truncate">{currentStage}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-orbe-tan/10">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Priority</p>
                    <div className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase w-fit ${
                      mainRecord?.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                      mainRecord?.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {mainRecord?.priority || 'Low'}
                    </div>
                  </div>
                </div>
 
                {/* SECTION 2: PRODUCT INTERESTS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-orbe-tan/20 pb-2">
                    <div className="flex items-center gap-2 px-1">
                      <Zap size={14} className="text-amber-500" />
                      <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-[0.2em]">Product Interest Profile</h4>
                    </div>
                    <button 
                      onClick={() => handleUpdateAccountTags(selectedAccount360.client_id, account360Tags)}
                      disabled={isSaving}
                      className="text-[8px] font-black text-orbe-green uppercase tracking-widest hover:underline disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Sync Profile'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_INTEREST_TAGS.map(tag => {
                      const isSelected = account360Tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            if (isSelected) {
                              setAccount360Tags(account360Tags.filter(t => t !== tag));
                            } else {
                              setAccount360Tags([...account360Tags, tag]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all border ${
                            isSelected 
                              ? 'bg-orbe-green text-white border-orbe-green shadow-sm scale-105' 
                              : 'bg-white text-orbe-green/40 border-orbe-tan/20 hover:border-orbe-green/30 hover:text-orbe-green'
                          }`}
                        >
                          {getProductTagLabel(tag)}
                        </button>
                      );
                    })}
                  </div>
                </div>
 
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* SECTION 3: PIPELINE SNAPSHOT */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1 border-b border-orbe-tan/20 pb-2">
                      <Target size={14} className="text-orbe-green" />
                      <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-[0.2em]">Pipeline Snapshot</h4>
                    </div>
                    {mainRecord ? (
                      <div className="bg-white rounded-2xl border border-orbe-tan/20 p-5 space-y-5 shadow-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase mb-1 tracking-widest">Last Activity</p>
                            <p className="text-xs font-bold text-orbe-green">{mainRecord.last_activity || 'No activity recorded'}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">{formatDateSafe(mainRecord.last_contact_date)}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase mb-1 tracking-widest">Next Deadline</p>
                            <p className={`text-xs font-black ${isOverdue(mainRecord.next_action_date, mainRecord.action_status) ? 'text-red-500' : 'text-orbe-green'}`}>
                              {formatDateSafe(mainRecord.next_action_date) || 'Not scheduled'}
                            </p>
                            <div className="flex gap-1 mt-1">
                              {isOverdue(mainRecord.next_action_date, mainRecord.action_status) && (
                                <span className="text-[7px] font-black bg-red-50 text-red-600 px-1 rounded uppercase">Overdue</span>
                              )}
                              {isDueToday(mainRecord.next_action_date, mainRecord.action_status) && (
                                <span className="text-[7px] font-black bg-amber-50 text-amber-600 px-1 rounded uppercase">Due Today</span>
                              )}
                            </div>
                          </div>
                        </div>
 
                        <div className="pt-4 border-t border-orbe-tan/10">
                           <p className="text-[8px] font-black text-gray-400 uppercase mb-2 tracking-widest">Strategy Notes</p>
                           <p className="text-[11px] text-gray-600 leading-relaxed italic bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                             "{mainRecord.notes || 'No strategy notes available for this stage'}"
                           </p>
                        </div>
 
                        <div className="pt-4 border-t border-orbe-tan/10 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isDone(mainRecord.action_status) ? 'bg-green-500' : 'bg-blue-500'}`} />
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{mainRecord.action_status}</span>
                          </div>
                          <span className="text-[8px] font-bold text-gray-300 uppercase">Registered {formatDateSafe(mainRecord.created_at)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 p-8 text-center">
                        <Target size={24} className="text-gray-200 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No active pipeline records</p>
                      </div>
                    )}
                  </div>
 
                  {/* SECTION 4: CONTACT & SAMPLES */}
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1 border-b border-orbe-tan/20 pb-2">
                        <History size={14} className="text-orbe-green" />
                        <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-[0.2em]">Contact Channels</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-orbe-tan/10 shadow-sm flex items-center gap-3">
                          <div className="p-2 bg-orbe-green/5 rounded-lg text-orbe-green"><UserCircle size={16} /></div>
                          <div className="overflow-hidden">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Key Contact</p>
                            <p className="text-[11px] font-bold text-orbe-green truncate">{selectedAccount360.contact_name || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-orbe-tan/10 shadow-sm flex items-center gap-3">
                          <div className="p-2 bg-orbe-green/5 rounded-lg text-orbe-green"><Mail size={16} /></div>
                          <div className="overflow-hidden">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Corporate Email</p>
                            {selectedAccount360.email ? (
                              <a href={`mailto:${selectedAccount360.email}`} className="text-[11px] font-bold text-orbe-green hover:underline truncate block">{selectedAccount360.email}</a>
                            ) : (
                              <p className="text-[11px] font-bold text-gray-300">N/A</p>
                            )}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-orbe-tan/10 shadow-sm flex items-center gap-3">
                          <div className="p-2 bg-orbe-green/5 rounded-lg text-orbe-green"><Phone size={16} /></div>
                          <div className="overflow-hidden">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Direct Phone</p>
                            {selectedAccount360.phone ? (
                              <a href={`tel:${selectedAccount360.phone}`} className="text-[11px] font-bold text-orbe-green hover:underline truncate block">{selectedAccount360.phone}</a>
                            ) : (
                                <p className="text-[11px] font-bold text-gray-300">N/A</p>
                            )}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-orbe-tan/10 shadow-sm flex items-center gap-3">
                          <div className="p-2 bg-orbe-green/5 rounded-lg text-orbe-green"><Globe size={16} /></div>
                          <div className="overflow-hidden">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Digital Presence</p>
                            {selectedAccount360.website ? (
                              <a href={selectedAccount360.website.startsWith('http') ? selectedAccount360.website : `https://${selectedAccount360.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-orbe-green hover:underline truncate block">{selectedAccount360.website}</a>
                            ) : (
                                <p className="text-[11px] font-bold text-gray-300">N/A</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
 
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1 border-b border-orbe-tan/20 pb-2">
                        <Zap size={14} className="text-orbe-green" />
                        <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-[0.2em]">Samples Logistics</h4>
                      </div>
                      <div className="bg-white p-5 rounded-3xl border border-orbe-tan/10 shadow-sm">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                             samplesStatus === 'sent' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-300'
                           }`}>
                             <Briefcase size={24} />
                           </div>
                           <div>
                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Stock Status</p>
                             <p className="text-sm font-black text-orbe-green uppercase">
                               {samplesStatus === 'sent' ? 'Inventory Samples Sent' : 'No Samples Logged'}
                             </p>
                           </div>
                        </div>
                        <div className="mt-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                           <p className="text-[9px] font-bold text-gray-500 italic">
                             {samplesStatus === 'sent' 
                               ? 'The client has received OrBe physical samples for evaluation. Ensure follow-up within 7 days of delivery.' 
                               : 'No samples have been dispatched to this account yet. Consider sending an introduction selection.'}
                           </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
 
                {/* SECTION 5: INTERACTION TIMELINE */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 px-1 border-b border-orbe-tan/20 pb-2">
                    <Activity size={14} className="text-orbe-green" />
                    <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-[0.2em]">Interaction Timeline</h4>
                  </div>
                  <div className="space-y-4">
                    {clientPipeline.length === 0 ? (
                      <div className="py-12 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No historical activities found</p>
                      </div>
                    ) : (
                      [...clientPipeline].sort((a,b) => new Date(b.last_contact_date || b.created_at || 0).getTime() - new Date(a.last_contact_date || a.created_at || 0).getTime()).map((item, idx) => (
                        <div key={getPipelineKey(item, 'account360-timeline', idx)} className="relative pl-8 border-l border-orbe-tan/20 last:border-l-0 pb-6">
                           <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${
                             isDone(item.action_status) ? 'bg-green-500' : 
                             isOverdue(item.next_action_date, item.action_status) ? 'bg-red-500' : 'bg-blue-500'
                           }`} />
                           <div className="bg-white rounded-2xl border border-orbe-tan/10 p-4 shadow-sm hover:shadow-md transition-shadow">
                             <div className="flex justify-between items-center mb-2">
                               <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{formatDateSafe(item.last_contact_date || item.created_at)}</span>
                               <div className="flex items-center gap-1.5">
                                 <UserCircle size={10} className="text-orbe-green/40" />
                                 <span className="text-[8px] font-bold text-orbe-green uppercase">{item.owner_id}</span>
                               </div>
                             </div>
                             <p className="text-[11px] font-black text-orbe-green uppercase tracking-tight mb-1">{item.last_activity}</p>
                             <div className="flex items-center gap-2 mb-2">
                               <span className="text-[7px] font-black bg-orbe-tan/20 text-orbe-green px-1 rounded uppercase">{getEffectivePipelineStage(item)}</span>
                               <span className={`text-[7px] font-black px-1 rounded uppercase ${
                                 item.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                               }`}>{item.priority}</span>
                             </div>
                             {item.notes && (
                               <p className="text-[10px] text-gray-600 italic bg-gray-50/50 p-2 rounded-lg border border-gray-100">"{item.notes}"</p>
                             )}
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
 
                {/* SECTION 6: NOTES */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1 border-b border-orbe-tan/20 pb-2">
                    <MessageSquare size={14} className="text-orbe-green" />
                    <h4 className="text-[10px] font-black text-orbe-green uppercase tracking-[0.2em]">Global Account Notes</h4>
                  </div>
                  <div className="bg-blue-50/20 p-5 rounded-3xl border border-blue-100/30">
                    <p className="text-[12px] text-blue-900/80 leading-relaxed font-medium">
                      {selectedAccount360.notes || 'No global notes available for this entity. Internal context should be added via identity editing.'}
                    </p>
                  </div>
                </div>
              </div>
            </OrbeModal>
          );
        })()}
      </AnimatePresence>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <OrbeModal
            isOpen={!!showDeleteModal}
            onClose={() => setShowDeleteModal(null)}
            title="Delete Account"
            subtitle={`RECORD ID: ${showDeleteModal}`}
            icon={<Trash2 size={20} />}
            variant="danger"
            modalKey="delete-modal"
            footer={
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    const id = showDeleteModal;
                    setShowDeleteModal(null);
                    await handleDeleteClient(id);
                  }}
                  className="w-full py-4 bg-red-600 rounded-2xl text-[11px] font-black text-white uppercase tracking-[0.2em] hover:bg-red-700 shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Permanently Delete
                </button>
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="w-full py-4 bg-gray-50 border border-orbe-tan/30 rounded-2xl text-[11px] font-black text-gray-500 uppercase tracking-[0.1em] hover:bg-gray-100 transition-all active:scale-95"
                >
                  Keep Account (Cancel)
                </button>
              </div>
            }
          >
            <div className="space-y-6">
              <div className="bg-red-50 p-8 rounded-3xl border border-red-100 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-red-600 shadow-sm mb-4 border border-red-100 rotate-12">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-2xl font-black text-orbe-green uppercase tracking-tighter leading-none mb-2">Are you positive?</h3>
                <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">Crucial Action Warning</p>
              </div>

              <div className="space-y-4 px-2">
                <p className="text-gray-500 text-sm leading-relaxed text-center">
                  This transaction is permanent. Deleting this account will also remove all associated <span className="font-black text-red-600 italic">historical activity, pipeline entries, and relationship logs</span>.
                </p>
                
                <div className="bg-red-50/30 p-4 rounded-xl border border-red-100/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    <p className="text-[9px] font-black text-red-800 uppercase tracking-widest">Protocol Notice</p>
                  </div>
                  <p className="text-[10px] text-red-700 font-medium italic">
                    Data recovery will not be possible once confirmed. Ensure you have backup of any critical correspondence.
                  </p>
                </div>
              </div>
            </div>
          </OrbeModal>
        )}
      </AnimatePresence>
    </div>
  );
}
