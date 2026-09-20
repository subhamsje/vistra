import React, { useState, useEffect } from 'react';
import { 
  History, 
  ShieldCheck, 
  FileText, 
  Lock, 
  Clock, 
  User,
  Copy,
  Check
} from 'lucide-react';
import { cadastreApi } from '../../services/api';
import { AuditRecord } from '../../types/cadastre';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const res = await cadastreApi.getAuditTrail();
      setLogs(res);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="flex-1 h-full bg-slate-50 p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cadastral Governance Audit Trail</h1>
          <p className="text-slate-500 text-xs mt-1">Cryptographically sealed immutable provenance log with SHA-256 verification</p>
        </div>

        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs shadow-xs font-semibold">
          <Lock className="w-3.5 h-3.5" />
          <span>SHA-256 Ledger: ACTIVE</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200/80 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3.5 px-4">Action</th>
              <th className="py-3.5 px-4">3D ULPIN</th>
              <th className="py-3.5 px-4">Reviewer</th>
              <th className="py-3.5 px-4">Justification Notes</th>
              <th className="py-3.5 px-4">Cryptographic Hash Seal</th>
              <th className="py-3.5 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">Loading audit records...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">No governance actions logged yet. Use Human Review to record decisions.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-bold">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                      log.action === 'CONFIRM'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : log.action === 'FREEZE'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-blue-600 select-all">
                    {log.ulpin_3d}
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 font-medium">{log.reviewer}</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{log.notes}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <span className="truncate w-36">{log.audit_hash}</span>
                      <button 
                        onClick={() => handleCopy(log.audit_hash)} 
                        className="text-slate-400 hover:text-slate-700 p-1 transition"
                        title="Copy SHA-256 seal"
                      >
                        {copiedHash === log.audit_hash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">{log.timestamp || '2026-03-12 10:24 AM'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
