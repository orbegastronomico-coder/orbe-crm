
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, History, CheckSquare, Clock, Search, Filter } from 'lucide-react';
import { PipelineItem, Priority, PRIORITIES } from '../types';

interface PipelineProps {
  items: PipelineItem[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  onAccomplish: (item: PipelineItem) => void;
  onPostpone: (item: PipelineItem) => void;
  onHistory: (clientId: string | number) => void;
  onUpdate: (id: string | number, updates: Partial<PipelineItem>) => void;
  formatDateSafe: (date: string) => string;
  getStatusBadge: (date: string) => React.ReactNode;
}

export const Pipeline: React.FC<PipelineProps> = ({ 
  items, 
  searchTerm, 
  setSearchTerm, 
  onAccomplish, 
  onPostpone, 
  onHistory,
  onUpdate,
  formatDateSafe,
  getStatusBadge
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-orbe-tan/30 shadow-sm overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-orbe-tan/20 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search company or lead..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-orbe-tan/30 rounded-xl text-xs font-bold text-orbe-green hover:bg-orbe-tan/5 transition-all">
                <Filter size={14} />
                Filters
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 bg-white border-b border-orbe-tan/30 z-10">
            <tr className="bg-[#fcfaf7]">
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-48">Company</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-32">Status</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-40">Next Action</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-32">Date</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-24">Priority</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-24 text-center">User</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-24 text-center">History</th>
              <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orbe-tan/10 text-sm">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.tr 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={item.id} 
                  className="group hover:bg-orbe-cream/20 transition-all"
                >
                  <td className="p-4">
                    <div className="font-black text-orbe-green tracking-tight">{item.company}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      {item.client_status || 'Potential client'}
                    </div>
                  </td>
                  <td className="p-4">
                    <select 
                      value={item.status}
                      onChange={(e) => onUpdate(item.id, { status: e.target.value as any })}
                      className="bg-transparent border-none text-[10px] font-bold uppercase tracking-wider text-orbe-tan focus:ring-0 cursor-pointer hover:text-orbe-green transition-colors"
                    >
                      <option value="Not interested">Not interested</option>
                      <option value="1st contact">1st contact</option>
                      <option value="Baking off">Baking off</option>
                      <option value="Grajales">Grajales</option>
                      <option value="Client">Client</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 italic">
                      {item.last_action}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[11px] font-black text-orbe-green tabular-nums">
                        {formatDateSafe(item.action_date)}
                      </div>
                      {getStatusBadge(item.action_date)}
                    </div>
                  </td>
                  <td className="p-4">
                    <select 
                      value={item.priority}
                      onChange={(e) => onUpdate(item.id, { priority: e.target.value as any })}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all cursor-pointer ${
                        item.priority === 'Urgent' ? 'bg-red-50 text-red-600 border-red-200' : 
                        item.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        'bg-blue-50 text-blue-600 border-blue-200'
                      }`}
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="Contact in 1 month">1 month</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <div className="w-8 h-8 rounded-xl bg-orbe-tan/20 flex items-center justify-center text-[10px] font-black text-orbe-green mx-auto">
                      {String(item.owner || '?')[0]}
                    </div>
                  </td>
                   <td className="p-4 text-center">
                    <button 
                      onClick={() => onHistory(item.client_id)}
                      className="p-2.5 text-orbe-tan hover:text-orbe-green hover:bg-orbe-tan/10 rounded-xl transition-all group/hist"
                    >
                      <History size={18} className="group-hover/hist:rotate-[-20deg] transition-transform" />
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onPostpone(item)}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-orbe-tan/30 rounded-xl text-[10px] font-black text-orbe-tan hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50 transition-all shadow-sm active:scale-95"
                      >
                         <Clock size={14} />
                         POSTPONE
                      </button>
                      <button 
                        onClick={() => onAccomplish(item)}
                        className="flex items-center gap-2 px-4 py-2 bg-orbe-green text-white rounded-xl text-[10px] font-black shadow-lg shadow-orbe-green/20 hover:opacity-90 transition-all active:scale-95"
                      >
                         <CheckSquare size={14} />
                         DONE
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6">
              <Search size={40} className="text-gray-200" />
            </div>
            <h3 className="text-xl font-black text-orbe-green uppercase tracking-tight">No actions found</h3>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        )}
      </div>
    </div>
  );
};
