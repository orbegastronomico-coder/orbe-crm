
export const USERS = ['All', 'Juanjo', 'Alejandro'] as const;
export type User = typeof USERS[number];

export const PRIORITIES = {
  'Urgent': 1,
  'High': 2,
  'Medium': 7,
  'Low': 15,
  'Contact in 1 month': 30,
  'Postpone': 60
} as const;

export const PREDEFINED_ACTIONS = [
  'Send email',
  'Send email with catalogue',
  'Call',
  'Visit',
  'Meeting',
  'Drop samples'
] as const;

export const PIPELINE_STATUSES = [
  'Not interested',
  '1st contact',
  'Baking off',
  'Grajales',
  'Client'
] as const;

export type PipelineStatus = typeof PIPELINE_STATUSES[number];
export type Priority = keyof typeof PRIORITIES;
export type PredefinedAction = typeof PREDEFINED_ACTIONS[number];

export interface Client {
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
  client_status?: 'Potential client' | 'Client' | 'Temporary Discarded';
  created_at?: string;
}

export interface PipelineItem {
  id: string | number;
  client_id: string | number;
  company?: string;
  client_status?: string;
  owner: User;
  status: PipelineStatus;
  last_contact_date: string;
  samples: string;
  last_action: string;
  notes?: string;
  priority: Priority;
  action_date: string;
  action_status: 'Pending' | 'Done' | string;
  created_at?: string;
}

export interface HistoryEntry {
  id: string | number;
  client_id: string | number;
  type: 'status_change' | 'note' | 'system' | 'priority_change';
  content: string;
  notes?: string;
  created_at: string;
  created_by: string;
}
