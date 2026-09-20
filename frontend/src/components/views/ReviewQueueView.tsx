import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  Check, 
  Ban, 
  Send, 
  ShieldCheck,
  Building,
  Radio
} from 'lucide-react';
import { useCadastre } from '../../store/CadastreContext';
import { cadastreApi } from '../../services/api';
import { ReviewQueueItem } from '../../types/cadastre';

export const ReviewQueueView: React.FC = () => {
  const { setSelectedEntityId, setActiveView, triggerFlyTo, user } = useCadastre();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchQueue = async () => {
      setLoading(true);
      const res = await cadastreApi.getReviewQueue();
      setQueue(res);
      setLoading(false);
    };
    fetchQueue();
  }, []);

  const handleAction = async (item: ReviewQueueItem, action: 'CONFIRM' | 'FREEZE' | 'REJECT') => {
    try {
      const res = await cadastreApi.submitGovernanceDecision({
        entity_id: item.entity_id,
        ulpin_3d: item.ulpin_3d,
        action: action,
        reviewer: user?.name || 'Chief Cadastral Officer',
        notes: decisionNotes[item.entity_id] || `Action ${action} approved based on sensor evidence review.`
      });

      alert(`Decision Logged Successfully!\nAction: [${action}]\nAudit Seal: ${res.audit_hash.substring(0, 24)}...`);
      setQueue(prev => prev.filter(q => q.entity_id !== item.entity_id));
    } catch (err: any) {
      alert('Failed submitting decision: ' + err.message);
    }
  };

  const handleFly = (item: ReviewQueueItem) => {
    setSelectedEntityId(item.entity_id);
    triggerFlyTo([77.6250, 12.9355]);
    setActiveView('3d_cadastre');
  };

  return (
    <div className="flex-1 h-full bg-slate-50 p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Human Review & Governance Queue</h1>
          <p className="text-slate-500 text-xs mt-1">Human-in-the-Loop Triage for AI Floor Predictions & Encroachment Flags</p>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs shadow-xs">
          Pending Reviews: {queue.length}
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            Loading review queue...
          </div>
        ) : queue.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-sm font-semibold text-slate-800">Review Queue Clean</div>
            <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              All vertical spatial units and 3D ULPIN identities are verified and approved.
            </div>
          </div>
        ) : (
          queue.map((item) => (
            <div 
              key={item.entity_id}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-[10px]">
                      CONFIDENCE: {Math.round(item.confidence * 100)}%
                    </span>
                    <span className="font-mono text-blue-600 font-semibold text-xs">{item.ulpin_3d}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <div className="text-slate-600 text-xs">{item.reason}</div>
                </div>

                <button
                  onClick={() => handleFly(item)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg flex items-center space-x-1.5 transition border border-slate-200/80"
                >
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  <span>Inspect 3D</span>
                </button>
              </div>

              {/* Evidence Bar */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Radio className="w-3.5 h-3.5 text-blue-600" />
                  <span>Evidence Source: <strong className="text-slate-800 font-semibold">{item.source}</strong></span>
                </div>
                <div className="text-slate-400 font-mono text-[10px]">Flagged: {item.flagged_at}</div>
              </div>

              {/* Reviewer Action Bar */}
              <div className="flex items-center space-x-3 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Reviewer justification notes..."
                  value={decisionNotes[item.entity_id] || ''}
                  onChange={(e) => setDecisionNotes({ ...decisionNotes, [item.entity_id]: e.target.value })}
                  className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-2xs"
                />

                <button
                  onClick={() => handleAction(item, 'CONFIRM')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve</span>
                </button>

                <button
                  onClick={() => handleAction(item, 'FREEZE')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition shadow-xs"
                >
                  <Ban className="w-4 h-4" />
                  <span>Freeze Dispute</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
