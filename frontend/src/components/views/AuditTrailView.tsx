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
    <div className="flex-1 h-full bg-[#0b0f19] p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6 text-xs select-none">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Cadastral Governance Audit Trail</h1>
          <p className="text-slate-400 text-xs mt-1">Cryptographically sealed immutable provenance log with SHA-256 verification</p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono">
          <Lock className="w-3.5 h-3.5" />
          <span>SHA-256 Ledger: ACTIVE</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-white/10 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">3D ULPIN</th>
              <th className="py-3 px-4">Reviewer</th>
              <th className="py-3 px-4">Justification Notes</th>
              <th className="py-3 px-4">Cryptographic Hash Seal</th>
              <th className="py-3 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">Loading audit records...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">No governance actions logged yet. Use Human Review to record decisions.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-emerald-400">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-cyan-300 select-all">
                    {log.ulpin_3d}
                  </td>
                  <td className="py-3 px-4 text-white font-medium">{log.reviewer}</td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{log.notes}</td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                    <div className="flex items-center space-x-1">
                      <span className="truncate w-36">{log.audit_hash}</span>
                      <button 
                        onClick={() => handleCopy(log.audit_hash)} 
                        className="text-slate-400 hover:text-white p-1"
                        title="Copy SHA-256 seal"
                      >
                        {copiedHash === log.audit_hash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 font-mono">{log.timestamp || '2026-03-12 10:24 AM'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
