
import React from 'react';
import { Target, LayoutDashboard, ShieldCheck, History, Clock, AlertCircle } from 'lucide-react';
import { PipelineItem, Priority, PRIORITIES } from '../types';

interface DashboardProps {
  pipeline: PipelineItem[];
  dashboardTab: 'priorities' | 'overview' | 'activity';
  setDashboardTab: (tab: 'priorities' | 'overview' | 'activity') => void;
  clientsCount: number;
}

export const Dashboards: React.FC<DashboardProps> = ({ 
  pipeline, 
  dashboardTab, 
  setDashboardTab,
  clientsCount 
}) => {
  return (
    <div className="space-y-6 flex-1 flex flex-col overflow-y-auto pr-2 px-1">
      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1 bg-orbe-tan/10 p-1 rounded-xl w-fit shrink-0 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setDashboardTab('priorities')}
          className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2 whitespace-nowrap ${dashboardTab === 'priorities' ? 'bg-orbe-green text-white shadow-md' : 'text-orbe-green hover:bg-black/5'}`}
        >
          <Target size={14} />
          Priorities
        </button>
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

      {dashboardTab === 'priorities' && <PrioritiesView pipeline={pipeline} />}
      {dashboardTab === 'overview' && <OverviewView pipeline={pipeline} clientsCount={clientsCount} />}
      {dashboardTab === 'activity' && <ActivityView pipeline={pipeline} />}
    </div>
  );
};

const PrioritiesView: React.FC<{ pipeline: PipelineItem[] }> = ({ pipeline }) => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {['Juanjo', 'Alejandro'].map((owner) => {
        const ownerTasks = pipeline.filter(p => 
          String(p.owner || '').toLowerCase().trim() === owner.toLowerCase() && 
          String(p.action_status || '').trim().toLowerCase() !== 'done'
        ).sort((a, b) => {
          const wA = PRIORITIES[a.priority as Priority] || 999;
          const wB = PRIORITIES[b.priority as Priority] || 999;
          return wA - wB;
        });

        return (
          <div key={`priorities-${owner}`} className="bg-white rounded-2xl shadow-sm border border-orbe-tan/50 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-orbe-tan/30 bg-orbe-green/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orbe-green flex items-center justify-center text-white font-black text-sm shadow-sm">
                {owner[0]}
              </div>
              <div>
                <h4 className="text-sm font-black text-orbe-green uppercase tracking-tight">{owner}</h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Priority Ranking</p>
              </div>
            </div>
            
            <div className="overflow-auto bg-white max-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#fcfaf7] sticky top-0 border-b border-orbe-tan/30 z-10">
                  <tr>
                    <th className="p-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Company</th>
                    <th className="p-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Next Action</th>
                    <th className="p-3 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orbe-tan/10 text-[11px]">
                  {ownerTasks.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-10 text-center text-[11px] text-gray-400 italic">No priorities defined</td>
                    </tr>
                  ) : (
                    ownerTasks.map(item => (
                      <tr key={`prio-row-${item.id}`} className="hover:bg-orbe-cream/20 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-orbe-green">{item.company}</div>
                        </td>
                        <td className="p-3 text-gray-500 italic">
                          {item.last_action}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            item.priority === 'Urgent' ? 'bg-red-50 text-red-600 border border-red-100' :
                            item.priority === 'High' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                            'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            {item.priority}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const OverviewView: React.FC<{ pipeline: PipelineItem[], clientsCount: number }> = ({ pipeline, clientsCount }) => {
  const stats = {
    total: clientsCount,
    active: pipeline.filter(p => p.status !== 'Not interested').length,
    converted: pipeline.filter(p => p.status === 'Client').length,
    prospects: pipeline.filter(p => ['1st contact', 'Potential client'].includes(p.status)).length
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Database', val: stats.total, color: 'text-orbe-green', bg: 'bg-orbe-cream/30' },
          { label: 'Active Pipeline', val: stats.active, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Clients', val: stats.converted, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'New Prospects', val: stats.prospects, color: 'text-orange-600', bg: 'bg-orange-50' }
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-[32px] border border-orbe-tan/20 shadow-sm ${s.bg}`}>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ActivityView: React.FC<{ pipeline: PipelineItem[] }> = ({ pipeline }) => (
  <div className="space-y-6 animate-in fade-in duration-300">
     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {['Juanjo', 'Alejandro'].map((owner) => {
        const doneCount = pipeline.filter(p => p.owner === owner && p.action_status === 'Done').length;
        const pendingCount = pipeline.filter(p => p.owner === owner && p.action_status === 'Pending').length;
        const postponedCount = pipeline.filter(p => 
            p.owner === owner && 
            String(p.action_status || '').trim().toLowerCase() === 'postpone'
        ).length;

        return (
          <div key={`activity-tab-${owner}`} className="bg-white rounded-2xl p-6 border border-orbe-tan/50 shadow-sm flex flex-col gap-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orbe-green/10 flex items-center justify-center text-orbe-green font-black text-xl">
                  {owner[0]}
                </div>
                <div>
                  <h5 className="font-black text-orbe-green text-lg leading-none">{owner}</h5>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Action Metrics</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Postponed</span>
                <div className="flex items-center gap-1.5">
                  <History size={14} className="text-orange-400" />
                  <span className="text-xl font-black text-orange-500">{postponedCount}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100/50">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Actions Done</p>
                <p className="text-2xl font-black text-green-700">{doneCount}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active</p>
                <p className="text-2xl font-black text-gray-700">{pendingCount}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
