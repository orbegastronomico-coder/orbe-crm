
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, X } from 'lucide-react';
import { PipelineItem } from '../types';

interface PostponeModalProps {
  item: PipelineItem;
  postponeDate: string;
  setPostponeDate: (date: string) => void;
  postponeReason: string;
  setPostponeReason: (reason: string) => void;
  isConfirming: boolean;
  setIsConfirming: (val: boolean) => void;
  onClose: () => void;
  onConfirm: (item: PipelineItem, date: string, reason: string) => void;
  formatDateSafe: (date: string) => string;
}

export const PostponeModal: React.FC<PostponeModalProps> = ({
  item,
  postponeDate,
  setPostponeDate,
  postponeReason,
  setPostponeReason,
  isConfirming,
  setIsConfirming,
  onClose,
  onConfirm,
  formatDateSafe
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#3d4d42]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#3d4d42] p-8 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <Clock size={32} />
            </div>
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight">Postpone Action</h3>
          <p className="text-white/60 text-xs uppercase tracking-widest font-bold">{item.company}</p>
        </div>
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (!postponeReason || !postponeReason.trim()) {
              alert("Please provide a reason for postponing.");
              setIsConfirming(false);
              return;
            }
            onConfirm(item, postponeDate, postponeReason);
          }}
          className="p-8 space-y-6"
        >
          {!isConfirming ? (
            <>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest text-center">Select new Action Date</label>
                <input 
                  type="date"
                  required
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all text-sm font-bold text-center"
                />
                <p className="mt-2 text-[9px] text-gray-400 text-center italic">Limit: Next 3 months</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Reason for postponing <span className="text-red-400">*</span></label>
                <textarea 
                  value={postponeReason}
                  onChange={(e) => setPostponeReason(e.target.value)}
                  required
                  className="w-full p-4 bg-gray-50 border border-orbe-tan/30 rounded-xl focus:ring-2 ring-orbe-green/10 outline-none transition-all text-sm min-h-[80px]"
                  placeholder="Why are you rescheduling?"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    if (!postponeDate) {
                      alert("Please select a date.");
                      return;
                    }
                    if (!postponeReason || !postponeReason.trim()) {
                      alert("Please provide a reason for postponing.");
                      return;
                    }
                    setIsConfirming(true);
                  }}
                  className="w-full py-4 bg-orbe-green text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  Continue
                </button>
                <button 
                  type="button"
                  onClick={onClose} 
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h4 className="text-lg font-black text-orbe-green uppercase tracking-tight">Confirm rescheduling?</h4>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  You are about to postpone this action until <span className="font-bold text-orbe-green">{formatDateSafe(postponeDate)}</span>.
                </p>
              </div>
              
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  type="submit"
                  className="w-full py-4 bg-[#3d4d42] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95"
                >
                  YES, CONFIRM
                </button>
                <button 
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  NO, GO BACK
                </button>
              </div>
            </div>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
};
