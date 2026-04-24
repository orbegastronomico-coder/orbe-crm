
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Zap, Target, X } from 'lucide-react';
import { PipelineItem, PipelineStatus, PIPELINE_STATUSES, PREDEFINED_ACTIONS } from '../types';

interface TaskModalProps {
  item: PipelineItem;
  onClose: () => void;
  onConfirm: (item: PipelineItem, nextAction: string, nextDate: string, comments: string, newStatus: PipelineStatus) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ item, onClose, onConfirm }) => {
  const [nextDate, setNextDate] = useState('');
  const [nextAction, setNextAction] = useState(
    PREDEFINED_ACTIONS.find(a => a.toLowerCase() !== (item.last_action || '').toLowerCase()) || PREDEFINED_ACTIONS[0]
  );
  const [comments, setComments] = useState('');
  const [newStatus, setNewStatus] = useState<PipelineStatus>(item.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextDate) return;
    onConfirm(item, nextAction, nextDate, comments, newStatus);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-orbe-green/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-orbe-green p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-4 backdrop-blur-md">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight">Task Completed</h3>
            <p className="text-white/60 text-xs uppercase tracking-widest font-bold mt-1">{item.company}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-[0.1em]">Next Sales Action</label>
              <select 
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                required
                className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-orbe-green/30 rounded-xl outline-none transition-all text-xs font-black text-gray-700 uppercase appearance-none cursor-pointer"
              >
                {PREDEFINED_ACTIONS.map(action => (
                  <option 
                    key={action} 
                    value={action}
                    disabled={action.toLowerCase() === (item.last_action || '').toLowerCase()}
                  >
                    {action.toUpperCase()} {action.toLowerCase() === (item.last_action || '').toLowerCase() ? '(CURRENT)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-[0.1em]">Next Due Date <span className="text-red-400">*</span></label>
              <input 
                type="date"
                required
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-orbe-green/30 rounded-xl outline-none transition-all text-xs font-black text-gray-700 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-[0.1em]">Comments / Notes</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-orbe-tan/20 rounded-2xl focus:ring-4 ring-orbe-green/5 outline-none transition-all text-sm min-h-[100px] placeholder:text-gray-300 resize-none"
              placeholder="Add specific context for the follow-up..."
            />
          </div>

          <div className="bg-orbe-green/5 p-5 rounded-2xl border border-orbe-green/10 space-y-3 relative overflow-hidden group">
            <div className="relative">
              <label className="flex items-center gap-2 text-[11px] font-black text-orbe-green uppercase tracking-[0.15em] mb-1">
                <Target size={14} className="text-orbe-green" />
                Update Business Stage
              </label>
              <select 
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as PipelineStatus)}
                className="w-full p-3.5 bg-white border-2 border-orbe-green/20 rounded-xl outline-none focus:border-orbe-green focus:ring-4 ring-orbe-green/10 transition-all text-[12px] font-black text-orbe-green uppercase shadow-sm cursor-pointer"
              >
                {PIPELINE_STATUSES.map(status => (
                  <option key={status} value={status}>{status.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <button 
              type="submit"
              disabled={!nextDate}
              className="flex-1 py-4 bg-orbe-green text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-orbe-green/90 transition-all shadow-xl shadow-orbe-green/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
            >
              Confirm & Schedule
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="py-4 px-6 md:px-8 bg-gray-100 text-gray-400 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
