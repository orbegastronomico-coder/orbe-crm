
import { PipelineStatus, Priority } from '../types';

export const calculatePriority = (status: PipelineStatus, action: string): Priority => {
  const s = status as string;
  const a = action.toLowerCase();

  // If status is "Not interested", priority is always Low
  if (s === 'Not interested') return 'Low';

  // Specific logic based on Status and Action
  if (s === 'Client') {
    if (a.includes('email') || a.includes('call')) return 'Medium';
    if (a.includes('visit') || a.includes('meeting') || a.includes('samples')) return 'High';
    return 'Medium';
  }

  if (s === 'Potential client' || s === '1st contact' || !s) {
    if (a.includes('visit') || a.includes('meeting')) return 'Urgent';
    if (a.includes('samples') || a.includes('call')) return 'High';
    return 'Medium';
  }

  // Fallback
  if (a.includes('urgent') || a.includes('important')) return 'Urgent';
  if (a.includes('visit') || a.includes('meeting')) return 'High';
  
  return 'Medium';
};
