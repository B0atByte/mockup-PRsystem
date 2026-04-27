import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, FileText, CreditCard, Users, LogOut,
  Bell, Search, X, ChevronRight, Plus, Trash2, Edit2, Eye,
  CheckCircle, XCircle, Clock, DollarSign, AlertCircle,
  Upload, Moon, Sun, ChevronDown, Activity,
  Shield, KeyRound, UserPlus, BarChart2,
  FileCheck, Send, Banknote, History, RefreshCw, Menu, Package,
  Download, Filter, CalendarDays, MessageSquare, ChevronLeft
} from 'lucide-react';
import {
  ROLE_LABELS, ROLE_COLORS, STATUS_LABELS, STATUS_COLORS, CATEGORIES,
  type User, type PurchaseRequest, type AuditLog, type Role
} from './data';
import { api } from './lib/api';
import './index.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning'; }

type Page =
  | 'dashboard' | 'my-requests' | 'create-request'
  | 'pending-approval' | 'issue-pr-po' | 'forward-accounting'
  | 'payment-list' | 'record-payment' | 'payment-history'
  | 'user-management' | 'add-user' | 'audit-log'
  | 'all-requests' | 'reports' | 'tracking' | 'site-settings' | 'discord-settings';

interface SiteSettings {
  siteName: string; siteSubtitle: string; logoUrl?: string | null; updatedByName?: string; updatedAt?: string;
  discordWebhook?: string | null;
  discordOnNewRequest?: boolean; discordOnPurchasing?: boolean; discordOnAccounting?: boolean;
  discordOnTransferred?: boolean; discordOnRejected?: boolean; discordOnReceived?: boolean;
  discordReportEnabled?: boolean; discordReportTime?: string;
  discordBotToken?: string | null; discordChannelId?: string | null;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`toast-anim pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-[260px] max-w-sm
          ${t.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            t.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
              t.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'}`}>
          {t.type === 'success' ? <CheckCircle size={15} className="text-green-600 shrink-0" /> :
            t.type === 'error' ? <XCircle size={15} className="text-red-600 shrink-0" /> :
              t.type === 'warning' ? <AlertCircle size={15} className="text-amber-600 shrink-0" /> :
                <AlertCircle size={15} className="text-blue-600 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100 transition-opacity"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, title, children, onClose, footer }: {
  open: boolean; title: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-bg fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'ยืนยัน', confirmClass = 'bg-red-500 hover:bg-red-600 text-white' }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; confirmClass?: string;
}) {
  if (!open) return null;
  return (
    <div className="modal-bg fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">{title}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium">ยกเลิก</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>{STATUS_LABELS[status] || status}</span>;
}
function RoleBadge({ role }: { role: Role }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>;
}

// ─── Form Components ──────────────────────────────────────────────────────────
function Input({ label, className = '', ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      <input {...props} className={`px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 ${className}`} />
    </div>
  );
}
function Sel({ label, children, className = '', ...props }: { label?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      <select {...props} className={`px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all ${className}`}>{children}</select>
    </div>
  );
}
function Textarea({ label, className = '', ...props }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      <textarea {...props} className={`px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none ${className}`} />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon size={19} /></div>
      <div className="min-w-0"><div className="text-xl font-bold text-slate-800 dark:text-white truncate">{value}</div><div className="text-xs text-slate-400 mt-0.5">{label}</div></div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="text-[10px] text-slate-400 font-medium">{d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}</div>
          <div className="w-full rounded-t-lg bg-blue-500 dark:bg-blue-600 transition-all duration-700 min-h-[4px]" style={{ height: `${(d.value / max) * 100}%` }} />
          <div className="text-[10px] text-slate-400">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────
function PieChart({ data }: { data: { label: string; value: number }[] }) {
  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cum = 0;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const s = cum * 2 * Math.PI - Math.PI / 2;
    cum += pct;
    const e = cum * 2 * Math.PI - Math.PI / 2;
    const r = 40; const cx = 50; const cy = 50;
    const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
    return { ...d, path: `M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${x2} ${y2}Z`, color: COLORS[i % COLORS.length] };
  });
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="1.5" />)}
        <circle cx="50" cy="50" r="20" fill="white" className="dark:fill-slate-900" />
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{s.label}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 ml-auto">{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Table wrapper ────────────────────────────────────────────────────────────
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60">
            {headers.map((h, i) => <th key={i} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">{rows}</tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100];

function getPageNums(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function Pagination({ total, page, pageSize, onPage, onPageSize }: {
  total: number; page: number; pageSize: number;
  onPage: (p: number) => void; onPageSize: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const btnBase = 'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition-colors';
  const btnIdle = 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900';
  const btnActive = 'border-blue-600 bg-blue-600 text-white';
  const btnDisabled = 'border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 bg-white dark:bg-slate-900 cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
      <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <span>แสดง {from}–{to} จาก {total} รายการ</span>
        <select value={pageSize} onChange={e => { onPageSize(+e.target.value); onPage(1); }}
          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20">
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / หน้า</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className={`${btnBase} ${page === 1 ? btnDisabled : btnIdle}`}>
          <ChevronLeft size={13} />
        </button>
        {getPageNums(page, totalPages).map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} className="w-8 text-center text-xs text-slate-400">…</span>
            : <button key={p} onClick={() => onPage(p as number)}
              className={`${btnBase} ${p === page ? btnActive : btnIdle}`}>{p}</button>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className={`${btnBase} ${page === totalPages ? btnDisabled : btnIdle}`}>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder = 'ค้นหา...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="pl-8 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-full placeholder:text-slate-400" />
      {value && <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>}
    </div>
  );
}

// ─── Page Loader ─────────────────────────────────────────────────
function PageLoader({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] h-[3px] overflow-hidden">
      <div className="h-full bg-blue-500 loadbar-anim loadbar-fade" />
    </div>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────
function Sk({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function SkeletonPage({ page }: { page: Page }) {
  // skeleton สำหรับหน้าที่มี list การ์ด
  const listSkeleton = (rows = 5) => (
    <div className="page-anim space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Sk className="h-7 w-48" />
        <Sk className="h-9 w-32 rounded-xl" />
      </div>
      <div className="flex gap-3 mb-2">
        <Sk className="h-9 flex-1 max-w-xs rounded-xl" />
        <Sk className="h-9 w-32 rounded-xl" />
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex gap-4">
          {['w-24','w-32','w-20','w-28','w-16'].map((w,i) => <Sk key={i} className={`h-4 ${w}`} />)}
        </div>
        {Array.from({length: rows}).map((_,i) => (
          <div key={i} className="px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 flex gap-4 items-center">
            <Sk className="h-4 w-24" />
            <Sk className="h-4 w-40 flex-1" />
            <Sk className="h-4 w-20" />
            <Sk className="h-6 w-24 rounded-full" />
            <Sk className="h-4 w-16" />
            <Sk className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );

  // skeleton dashboard
  const dashSkeleton = () => (
    <div className="page-anim space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({length: 4}).map((_,i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <Sk className="h-4 w-20" />
              <Sk className="h-8 w-8 rounded-xl" />
            </div>
            <Sk className="h-8 w-16" />
            <Sk className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[6,4].map((rows,j) => (
          <div key={j} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
            <Sk className="h-5 w-32" />
            {Array.from({length: rows}).map((_,i) => (
              <div key={i} className="flex gap-3 items-center">
                <Sk className="h-8 w-8 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Sk className="h-3 w-3/4" />
                  <Sk className="h-3 w-1/2" />
                </div>
                <Sk className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  // skeleton form
  const formSkeleton = () => (
    <div className="page-anim max-w-2xl space-y-4">
      <Sk className="h-7 w-48 mb-4" />
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
        {Array.from({length: 6}).map((_,i) => (
          <div key={i} className="space-y-1.5">
            <Sk className="h-3 w-24" />
            <Sk className="h-10 w-full rounded-xl" />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <Sk className="h-10 flex-1 rounded-xl" />
          <Sk className="h-10 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );

  // skeleton settings / audit (wide content)
  const settingsSkeleton = () => (
    <div className="page-anim space-y-4">
      <Sk className="h-7 w-48" />
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-5">
        {Array.from({length: 5}).map((_,i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <Sk className="h-4 w-32" />
              <Sk className="h-3 w-56" />
            </div>
            <Sk className="h-10 w-48 rounded-xl" />
          </div>
        ))}
        <Sk className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );

  switch (page) {
    case 'dashboard':        return dashSkeleton();
    case 'create-request':
    case 'add-user':         return formSkeleton();
    case 'site-settings':
    case 'discord-settings':
    case 'audit-log':        return settingsSkeleton();
    default:                 return listSkeleton();
  }
}

// ─── File Upload Field ────────────────────────────────────────────────────────
function FileUploadField({ label, fileName, onFile, onError }: {
  label: string; fileName: string;
  onFile: (name: string, url: string) => void;
  onError?: (msg: string) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const result = await api.files.upload(f);
      onFile(result.name, result.url);
    } catch (err: any) {
      onError?.(err.message || 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      <div onClick={() => !uploading && ref.current?.click()}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none
          ${fileName ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-slate-800'}`}>
        <input ref={ref} type="file" className="hidden" onChange={handleChange} />
        {uploading ? (
          <>
            <RefreshCw size={15} className="text-blue-500 shrink-0 animate-spin" />
            <span className="text-sm text-blue-600 dark:text-blue-400">กำลังอัปโหลด...</span>
          </>
        ) : fileName ? (
          <>
            <FileCheck size={15} className="text-blue-500 shrink-0" />
            <span className="text-sm text-blue-700 dark:text-blue-300 truncate flex-1">{fileName}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onFile('', ''); }}
              className="text-slate-400 hover:text-red-500 transition-colors shrink-0"><X size={14} /></button>
          </>
        ) : (
          <>
            <Upload size={15} className="text-slate-400 shrink-0" />
            <span className="text-sm text-slate-400">คลิกเพื่อแนบไฟล์...</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── File View Button ────────────────────────────────────────────────────────
type FileMeta = { url: string; by?: string; byRole?: string; at?: string }

function parseFileMeta(raw?: string): FileMeta | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return { url: raw }; }
}

function FileButton({ label, raw }: { label: string; raw: string }) {
  const [loading, setLoading] = useState(false);
  const meta = parseFileMeta(raw);
  if (!meta) return null;
  const canView = meta.url.startsWith('/api/files/');
  const open = async () => {
    if (!canView) return;
    setLoading(true);
    try { await api.files.open(meta.url); } catch { /* ignore */ } finally { setLoading(false); }
  };
  const fileName = meta.url.split('/').pop() || '';
  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toUpperCase() : 'FILE';
  const atStr = meta.at ? new Date(meta.at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '';
  return (
    <button onClick={open} disabled={!canView || loading}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 hover:shadow-sm transition-all w-full text-left group disabled:opacity-50 disabled:cursor-not-allowed">
      <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
        {loading ? <RefreshCw size={11} className="animate-spin text-slate-400" /> : <FileCheck size={11} className="text-slate-500 dark:text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          {label}
          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1 rounded">{ext}</span>
        </div>
        {meta.by && <div className="text-[10px] text-slate-400 mt-0.5 truncate">{meta.by}{atStr ? ` · ${atStr}` : ''}</div>}
      </div>
      <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors shrink-0" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════
function LoginPage({ onLogin, siteSettings }: { onLogin: (u: User) => void; siteSettings: SiteSettings }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demos = [
    { username: 'owner', role: 'ผู้ประกอบการ', color: 'bg-purple-100 text-purple-700' },
    { username: 'employee', role: 'พนักงาน', color: 'bg-blue-100 text-blue-700' },
    { username: 'purchasing', role: 'ฝ่ายจัดซื้อ', color: 'bg-amber-100 text-amber-700' },
    { username: 'accounting', role: 'บัญชี', color: 'bg-green-100 text-green-700' },
    { username: 'itsupport', role: 'IT Support', color: 'bg-slate-100 text-slate-700' },
  ];

  const doLogin = async (u: string, p: string) => {
    if (!u || !p) { setError('กรุณากรอก username และ password'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.auth.login(u, p);
      localStorage.setItem('token', res.token);
      onLogin(res.user);
    } catch (err: any) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative transition-colors duration-300">
      {/* Dark Mode Toggle for Login Page */}
      <div className="absolute top-6 right-6">
        <button onClick={() => {
          const isDark = !document.documentElement.classList.contains('dark');
          document.documentElement.classList.toggle('dark', isDark);
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
          // Note: Since this is outside the main App state, it might need a page refresh or a shared state if we want it perfectly synced.
          // But for a simple implementation, we can just trigger a reload or use a small hack.
          window.location.reload();
        }} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm hover:scale-105 transition-all">
          {document.documentElement.classList.contains('dark') ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-7">
          {siteSettings.logoUrl && <img src={siteSettings.logoUrl} alt="logo" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-md rounded-xl" />}
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{siteSettings.siteName}</h1>
          <p className="text-slate-400 text-sm mt-1">{siteSettings.siteSubtitle}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-7">
          <div className="flex flex-col gap-4">
            <Input label="ชื่อผู้ใช้" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" onKeyDown={e => e.key === 'Enter' && doLogin(username, password)} autoFocus />
            <Input label="รหัสผ่าน" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" onKeyDown={e => e.key === 'Enter' && doLogin(username, password)} />
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5 border border-red-100 dark:border-red-800">
                <XCircle size={13} className="shrink-0" />{error}
              </div>
            )}
            <button onClick={() => doLogin(username, password)} disabled={loading}
              className="mt-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              {loading ? <><RefreshCw size={14} className="animate-spin" />กำลังเข้าสู่ระบบ...</> : 'เข้าสู่ระบบ'}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider text-center mb-3">Demo Accounts</p>
            <div className="flex flex-col gap-1">
              {demos.map(d => (
                <button key={d.username} onClick={() => doLogin(d.username, '1234')}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group text-left">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${d.color}`}>{d.role}</span>
                    <span className="text-xs text-slate-400 font-mono">{d.username}</span>
                  </div>
                  <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">รหัสผ่านทุก account: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">1234</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════
interface MenuItem { id: Page; label: string; icon: React.ElementType; roles: Role[]; }
const MENU: MenuItem[] = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard, roles: ['owner', 'itsupport'] },
  { id: 'all-requests', label: 'คำขอทั้งหมด', icon: FileText, roles: ['owner', 'itsupport'] },
  { id: 'reports', label: 'รายงานสรุป', icon: BarChart2, roles: ['owner'] },
  { id: 'create-request', label: 'สร้างใบขอซื้อ', icon: Plus, roles: ['employee'] },
  { id: 'my-requests', label: 'คำขอของฉัน', icon: FileText, roles: ['employee'] },
  { id: 'tracking', label: 'ติดตามคำขอ', icon: Package, roles: ['owner', 'employee', 'purchasing', 'accounting', 'itsupport'] },
  { id: 'pending-approval', label: 'รายการรออนุมัติ', icon: Clock, roles: ['purchasing', 'itsupport'] },
  { id: 'issue-pr-po', label: 'แนบเอกสาร PR / PO', icon: FileCheck, roles: ['purchasing'] },
  { id: 'forward-accounting', label: 'ส่งต่อบัญชี', icon: Send, roles: ['purchasing'] },
  { id: 'payment-list', label: 'รายการรอโอนเงิน', icon: Banknote, roles: ['accounting', 'itsupport'] },
  { id: 'record-payment', label: 'บันทึกการโอนเงิน', icon: CreditCard, roles: ['accounting'] },
  { id: 'payment-history', label: 'ประวัติการโอน', icon: History, roles: ['accounting', 'itsupport'] },
  { id: 'user-management', label: 'จัดการผู้ใช้', icon: Users, roles: ['itsupport'] },
  { id: 'add-user', label: 'เพิ่มผู้ใช้ใหม่', icon: UserPlus, roles: ['itsupport'] },
  { id: 'audit-log', label: 'Audit Log', icon: Activity, roles: ['itsupport'] },
  { id: 'site-settings', label: 'ตั้งค่าเว็บไซต์', icon: Shield, roles: ['itsupport'] },
  { id: 'discord-settings', label: 'Discord แจ้งเตือน', icon: MessageSquare, roles: ['itsupport'] },
];

function Sidebar({ user, page, setPage, collapsed, dark, toggleDark, mobileOpen, setMobileOpen, siteSettings }: {
  user: User; page: Page; setPage: (p: Page) => void; collapsed: boolean; dark: boolean; toggleDark: () => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void; siteSettings: SiteSettings;
}) {
  const items = MENU.filter(m => m.roles.includes(user.role));
  return (
    <aside className={`fixed md:relative z-40 h-screen flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-transform md:transition-all duration-200 shrink-0 w-64 ${collapsed ? 'md:w-14' : 'md:w-56'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-3 py-4 border-b border-slate-100 dark:border-slate-800 ${collapsed ? 'justify-center' : 'px-4'}`}>
        {siteSettings.logoUrl && <img src={siteSettings.logoUrl} alt="logo" className="w-8 h-8 object-contain shrink-0 rounded" />}
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-800 dark:text-white leading-tight truncate">{siteSettings.siteName}</div>
            <div className="text-[10px] text-slate-400 truncate">{siteSettings.siteSubtitle}</div>
          </div>
        )}
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{user.name}</div>
              <RoleBadge role={user.role} />
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {items.map(m => {
          const active = page === m.id;
          return (
            <button key={m.id} onClick={() => { setPage(m.id); setMobileOpen(false); }} title={collapsed ? m.label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all
                ${active ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white'}
                ${collapsed ? 'justify-center' : ''}`}>
              <m.icon size={17} className="shrink-0" />
              {!collapsed && <span className="truncate">{m.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`p-2 border-t border-slate-100 dark:border-slate-800 ${collapsed ? 'flex flex-col gap-1 items-center' : 'flex gap-1'}`}>
        <button onClick={toggleDark} title="Toggle Dark Mode"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors">
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOPBAR
// ═══════════════════════════════════════════════════════════════════
function Topbar({ page, user, requests, onLogout, collapsed, setCollapsed, mobileOpen, setMobileOpen }: {
  page: Page; user: User; requests: PurchaseRequest[]; onLogout: () => void; collapsed: boolean; setCollapsed: (v: boolean) => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void;
}) {
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const pageTitles: Partial<Record<Page, string>> = {
    dashboard: 'แดชบอร์ด', 'my-requests': 'คำขอของฉัน', 'create-request': 'สร้างใบขอซื้อ',
    'pending-approval': 'รายการรออนุมัติ', 'issue-pr-po': 'แนบเอกสาร PR / PO', 'forward-accounting': 'ส่งต่อบัญชี',
    'payment-list': 'รายการรอโอนเงิน', 'record-payment': 'บันทึกการโอนเงิน', 'payment-history': 'ประวัติการโอน',
    'discord-settings': 'Discord แจ้งเตือน',
    'user-management': 'จัดการผู้ใช้', 'add-user': 'เพิ่มผู้ใช้ใหม่', 'audit-log': 'Audit Log',
    'all-requests': 'คำขอทั้งหมด', reports: 'รายงานสรุป', tracking: 'ติดตามสถานะคำขอ',
  };

  const badgeCount = requests.filter(r =>
    (user.role === 'purchasing' && r.status === 'pending') ||
    (user.role === 'accounting' && r.status === 'accounting')
  ).length;

  const recent = [...requests].reverse().slice(0, 6);

  return (
    <div className="h-13 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-3 shrink-0 h-[52px]">
      <button onClick={() => { if (window.innerWidth < 768) setMobileOpen(!mobileOpen); else setCollapsed(!collapsed); }}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors">
        <Menu size={16} />
      </button>

      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <span>หน้าหลัก</span>
        <ChevronRight size={11} />
        <span className="font-medium text-slate-600 dark:text-slate-300">{pageTitles[page] || page}</span>
      </div>

      <div className="flex-1" />

      {/* Notification */}
      <div className="relative">
        <button onClick={() => { setShowNotif(!showNotif); setShowUserMenu(false); }}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors">
          <Bell size={16} />
          {badgeCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold leading-none">{badgeCount}</span>
          )}
        </button>
        {showNotif && (
          <div className="absolute right-0 top-10 w-76 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">การแจ้งเตือน</span>
              <button onClick={() => setShowNotif(false)}><X size={14} className="text-slate-400" /></button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
              {recent.map(r => (
                <div key={r.id} className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-default">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{r.title}</div>
                  <div className="flex items-center gap-2 mt-1"><StatusBadge status={r.status} /><span className="text-[10px] text-slate-400">{r.updatedAt}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotif(false); }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs">{user.name.charAt(0)}</div>
          <span className="text-sm text-slate-700 dark:text-slate-200 font-medium hidden sm:block max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
          <ChevronDown size={12} className="text-slate-400 hidden sm:block" />
        </button>
        {showUserMenu && (
          <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 py-2">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{user.name}</div>
              <RoleBadge role={user.role} />
            </div>
            <button onClick={() => { setShowUserMenu(false); onLogout(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <LogOut size={14} />ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════

function DashboardPage({ requests }: { requests: PurchaseRequest[] }) {
  const total = requests.length;
  const pending = requests.filter(r => ['pending', 'purchasing', 'accounting'].includes(r.status)).length;
  const done = requests.filter(r => r.status === 'transferred').length;
  const budget = requests.filter(r => r.status === 'transferred').reduce((s, r) => s + r.totalAmount, 0);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const m = new Date(); m.setMonth(m.getMonth() - 5 + i);
    return {
      label: m.toLocaleDateString('th-TH', { month: 'short' }),
      value: requests.filter(r => { const d = new Date(r.createdAt); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); }).reduce((s, r) => s + r.totalAmount, 0),
    };
  });

  const catData = CATEGORIES.map(cat => ({ label: cat, value: requests.filter(r => r.category === cat).length })).filter(d => d.value > 0);
  const recent = [...requests].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);

  return (
    <div className="page-anim flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="คำขอทั้งหมด" value={total} icon={FileText} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600" />
        <StatCard label="อยู่ระหว่างดำเนินการ" value={pending} icon={Clock} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" />
        <StatCard label="เสร็จสิ้นแล้ว" value={done} icon={CheckCircle} color="bg-green-100 dark:bg-green-900/30 text-green-600" />
        <StatCard label="งบประมาณใช้ไป" value={`฿${fmt(budget)}`} icon={DollarSign} color="bg-purple-100 dark:bg-purple-900/30 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="ยอดสั่งซื้อ 6 เดือนล่าสุด">
          <div className="px-5 pb-5 pt-2"><BarChart data={monthlyData} /></div>
        </Card>
        <Card title="สัดส่วนตามหมวดสินค้า">
          <div className="px-5 pb-5 pt-2"><PieChart data={catData} /></div>
        </Card>
      </div>

      <Card title="คำขอล่าสุด 10 รายการ">
        <Table headers={['เลขที่', 'รายการ', 'หมวด', 'จำนวนเงิน', 'สถานะ', 'วันที่']} rows={
          recent.map(r => (
            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-3 text-xs font-mono text-slate-400">{r.reqNo}</td>
              <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[160px] truncate">{r.title}</td>
              <td className="px-4 py-3 text-xs text-slate-400">{r.category}</td>
              <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">฿{fmt(r.totalAmount)}</td>
              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3 text-xs text-slate-400">{r.createdAt}</td>
            </tr>
          ))
        } />
      </Card>
    </div>
  );
}

function EditRequestModal({ req, onClose, onSaved, toast }: {
  req: PurchaseRequest; onClose: () => void;
  onSaved: (r: PurchaseRequest) => void; toast: (m: string, t?: Toast['type']) => void;
}) {
  const parseFile = (raw?: string) => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } };
  const existingFile = parseFile(req.requestFile);

  const [categories] = useState<string[]>(req.categories || []);
  const [supplierName] = useState(req.supplierName);
  const [supplierName2] = useState(req.supplierName2 || '');
  const [items] = useState((req.items ?? []).map(i => ({ code: i.code, name: i.name, qty: i.qty, unit: i.unit, price: i.price, itemNote: i.itemNote })));
  const [paymentMethod, setPaymentMethod] = useState(req.paymentMethod);
  const [paymentTiming, setPaymentTiming] = useState(req.paymentTiming);
  const [orderDate, setOrderDate] = useState(req.orderDate);
  const [deliveryDate, setDeliveryDate] = useState(req.deliveryDate || '');
  const [dueDate, setDueDate] = useState(req.dueDate || '');
  const [notes, setNotes] = useState(req.reason || '');
  const [contactName, setContactName] = useState(req.contactName);
  const [signedDate, setSignedDate] = useState(req.signedDate);
  const [reqFileName, setReqFileName] = useState(existingFile?.url ? 'ไฟล์เดิม' : '');
  const [reqFileUrl, setReqFileUrl] = useState(existingFile?.url || '');
  const [saving, setSaving] = useState(false);

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  // const updateItem = (i: number, f: string, v: string | number) =>
  //   setItems(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x));

  const handleSave = async () => {
    // if (categories.length === 0) return toast('กรุณาเลือกประเภทสินค้าอย่างน้อย 1 ประเภท', 'error');
    // if (!supplierName.trim()) return toast('กรุณากรอกชื่อ Supplier', 'error');
    // if (items.some(i => !i.name.trim())) return toast('กรุณากรอกชื่อสินค้าทุกรายการ', 'error');
    // if (total <= 0) return toast('ยอดรวมต้องมากกว่า 0', 'error');
    if (!reqFileUrl) return toast('กรุณาแนบใบขอสั่งซื้อ', 'error');
    if (!paymentMethod) return toast('กรุณาเลือกช่องทางการชำระเงิน', 'error');
    if (!paymentTiming) return toast('กรุณาเลือกกำหนดจ่าย', 'error');
    setSaving(true);
    try {
      const updated = await api.requests.update(req.id, {
        title: `สั่งซื้อ${categories.join('/')} - ${supplierName}`,
        category: categories[0] || '', categories, supplierName, supplierName2,
        items, totalAmount: total, reason: notes,
        paymentMethod, paymentTiming,
        orderDate, deliveryDate, dueDate, contactName, signedDate,
        requestFile: reqFileUrl || undefined,
      });
      onSaved(updated);
      toast('แก้ไขใบขอซื้อสำเร็จ');
      onClose();
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open title={`แก้ไขใบขอซื้อ ${req.reqNo}`} onClose={onClose} footer={
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
          <CheckCircle size={15} />{saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
        </button>
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">ยกเลิก</button>
      </div>
    }>
      <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
        {/* ปิดการใช้งานชั่วคราว
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">ประเภทสินค้า *</div>
          <CheckboxGroup options={CATEGORIES} selected={categories} onChange={setCategories} />
        </div>
        <Input label="ชื่อ (Supplier Name) *" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="ชื่อผู้จำหน่าย" />
        <Input label="Supplier 2 (ถ้ามี)" value={supplierName2} onChange={e => setSupplierName2(e.target.value)} placeholder="" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">รายการสินค้า *</div>
            <button onClick={() => setItems(p => [...p, { code: '', name: '', qty: 1, unit: 'หน่วย', price: 0, itemNote: '' }])}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"><Plus size={12} />เพิ่มรายการ</button>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="grid bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase"
              style={{ gridTemplateColumns: '70px 1fr 60px 70px 90px 1fr 32px' }}>
              {['Code', 'รายการ', 'จำนวน', 'หน่วย', 'ราคา', 'หมายเหตุ', ''].map((h, i) => (
                <div key={i} className={`px-2 py-2 ${i < 6 ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>{h}</div>
              ))}
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid border-b border-slate-50 dark:border-slate-800/80 last:border-0"
                style={{ gridTemplateColumns: '70px 1fr 60px 70px 90px 1fr 32px' }}>
                {[
                  <input value={item.code} onChange={e => updateItem(i, 'code', e.target.value)} placeholder="C..."
                    className="w-full px-2 py-2 text-xs bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 border-r border-slate-100 dark:border-slate-800" />,
                  <input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="ชื่อสินค้า"
                    className="w-full px-2 py-2 text-sm bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 border-r border-slate-100 dark:border-slate-800" />,
                  <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', +e.target.value)} min={1}
                    className="w-full px-2 py-2 text-sm text-center bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 border-r border-slate-100 dark:border-slate-800" />,
                  <input value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}
                    className="w-full px-2 py-2 text-xs text-center bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 border-r border-slate-100 dark:border-slate-800" />,
                  <input type="number" value={item.price || ''} onChange={e => updateItem(i, 'price', +e.target.value)} placeholder="0"
                    className="w-full px-2 py-2 text-sm text-right bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 border-r border-slate-100 dark:border-slate-800" />,
                  <input value={item.itemNote} onChange={e => updateItem(i, 'itemNote', e.target.value)} placeholder="-"
                    className="w-full px-2 py-2 text-xs bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 border-r border-slate-100 dark:border-slate-800" />,
                  <div className="flex items-center justify-center">
                    {items.length > 1 && (
                      <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 rounded transition-colors">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>,
                ].map((cell, ci) => <div key={ci}>{cell}</div>)}
              </div>
            ))}
            <div className="flex justify-end px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500">ยอดรวม: <span className="text-blue-600 text-sm">฿{fmt(total)}</span></span>
            </div>
          </div>
        </div>
        */}

        <div className="pt-2">
          <FileUploadField
            label="แนบใบขอสั่งซื้อ (ต้องมีเท่านั้น) *"
            fileName={reqFileName}
            onFile={(name, url) => { setReqFileName(name); setReqFileUrl(url); }}
            onError={msg => toast(msg, 'error')}
          />
          {existingFile?.url && !reqFileName.startsWith('ไฟล์') && (
            <p className="text-xs text-slate-400 mt-1">ไฟล์เดิม: {existingFile.url.split('/').pop()}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">ช่องทางการชำระเงิน</div>
            <RadioGroup options={[{ val: 'bank', label: 'บัญชีบริษัท' }, { val: 'cash', label: 'เงินสดย่อย' }, { val: 'transfer', label: 'สำรองจ่าย' }]} value={paymentMethod} onChange={v => setPaymentMethod(v as 'bank' | 'cash' | 'transfer' | '')} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">กำหนดจ่าย</div>
            <RadioGroup options={[{ val: 'before', label: 'ก่อนรับสินค้า' }, { val: 'after', label: 'หลังรับสินค้า' }]} value={paymentTiming} onChange={v => setPaymentTiming(v as 'before' | 'after' | '')} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input label="วันที่สั่งซื้อ" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
          <Input label="วันที่รับสินค้า" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
          <Sel label="วันที่ต้องชำระ" value={dueDate} onChange={e => setDueDate(e.target.value)}>
            <option value="">-- เลือกระยะเวลา --</option>
            <option value="วันที่ 10">วันที่ 10 </option>
            <option value="วันที่ 25">วันที่ 25 </option>
          </Sel>
        </div>

        <Textarea label="หมายเหตุ" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="ระบุหมายเหตุเพิ่มเติม..." />

        <div className="grid grid-cols-2 gap-3">
          <Input label="ชื่อผู้ติดต่อ" value={contactName} onChange={e => setContactName(e.target.value)} />
          <Input label="วันที่ลงชื่อ" type="date" value={signedDate} onChange={e => setSignedDate(e.target.value)} />
        </div>

      </div>
    </Modal>
  );
}

function ReceiveGoodsModal({ req, onClose, onSaved, toast }: {
  req: PurchaseRequest; onClose: () => void;
  onSaved: (r: PurchaseRequest) => void; toast: (m: string, t?: Toast['type']) => void;
}) {
  const [deliveryFile, setDeliveryFile] = useState('');
  const [deliveryFileUrl, setDeliveryFileUrl] = useState('');
  const [taxFile, setTaxFile] = useState('');
  const [taxFileUrl, setTaxFileUrl] = useState('');
  const [receivedAt, setReceivedAt] = useState(today());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photoUrls.length + files.length > 4) return toast('อัปโหลดได้สูงสุด 4 รูปเท่านั้น', 'error');
    setPhotoUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const token = localStorage.getItem('token');
        const res = await fetch('/api/files', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
        if (!res.ok) throw new Error('อัปโหลดรูปไม่สำเร็จ');
        const data = await res.json();
        uploaded.push(data.url);
      }
      setPhotoUrls(prev => [...prev, ...uploaded]);
    } catch (err: any) { toast(err.message || 'อัปโหลดรูปไม่สำเร็จ', 'error'); }
    finally { setPhotoUploading(false); if (photoRef.current) photoRef.current.value = ''; }
  };

  const handleSave = async () => {
    if (!deliveryFileUrl) return toast('กรุณาแนบใบส่งของ', 'error');
    if (!taxFileUrl) return toast('กรุณาแนบใบกำกับภาษี', 'error');
    setSaving(true);
    try {
      const updated = await api.requests.updateStatus(req.id, {
        status: 'received',
        deliveryNote: deliveryFileUrl,
        taxInvoice: taxFileUrl,
        receivedAt,
        productPhotos: photoUrls.length ? JSON.stringify(photoUrls) : undefined,
        notes: notes || undefined,
      });
      onSaved(updated);
      onClose();
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open title={`กดรับสินค้า — ${req.reqNo}`} onClose={onClose} footer={
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
          <CheckCircle size={15} />{saving ? 'กำลังบันทึก...' : 'ยืนยันรับสินค้า'}
        </button>
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">ยกเลิก</button>
      </div>
    }>
      <div className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{req.title}</div>
          <div className="text-xs text-slate-400 mt-0.5">{req.reqNo} · <span className="font-bold text-blue-600">฿{req.totalAmount.toLocaleString('th-TH')}</span></div>
        </div>
        <FileUploadField label="ใบส่งของ *" fileName={deliveryFile}
          onFile={(name, url) => { setDeliveryFile(name); setDeliveryFileUrl(url); }}
          onError={msg => toast(msg, 'error')} />
        <FileUploadField label="ใบกำกับภาษี *" fileName={taxFile}
          onFile={(name, url) => { setTaxFile(name); setTaxFileUrl(url); }}
          onError={msg => toast(msg, 'error')} />
        <Input label="วันที่รับสินค้า" type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} />

        {/* รูปสินค้า */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">รูปภาพสินค้า (ไม่เกิน 4 รูป)</label>
            <span className="text-xs text-slate-400">{photoUrls.length}/4</span>
          </div>
          {photoUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <img src={url} alt={`สินค้า ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => setPhotoUrls(p => p.filter((_, idx) => idx !== i))}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white rounded-lg">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photoUrls.length < 4 && (
            <>
              <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              <button onClick={() => photoRef.current?.click()} disabled={photoUploading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50">
                <Upload size={15} />{photoUploading ? 'กำลังอัปโหลด...' : `เลือกรูปภาพ (เหลือ ${4 - photoUrls.length} รูป)`}
              </button>
            </>
          )}
        </div>

        <Textarea label="หมายเหตุ" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="หมายเหตุเพิ่มเติม..." />
      </div>
    </Modal>
  );
}

function MyRequestsPage({ requests, user, onView, onEdit, onReceive }: { requests: PurchaseRequest[]; user: User; onView: (r: PurchaseRequest) => void; onEdit: (r: PurchaseRequest) => void; onReceive: (r: PurchaseRequest) => void }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const mine = requests.filter(r => r.createdBy === user.id)
    .filter(r => (r.title.toLowerCase().includes(search.toLowerCase()) || r.reqNo.includes(search)) && (!filterStatus || r.status === filterStatus));
  const paged = mine.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] max-w-xs"><SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} /></div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {/* Mobile card list */}
      <div className="sm:hidden flex flex-col gap-2">
        {mine.length === 0
          ? <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-12 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>
          : paged.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] font-mono text-slate-400">{r.reqNo}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{r.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{r.createdAt} · <span className="font-semibold text-slate-600 dark:text-slate-300">฿{fmt(r.totalAmount)}</span></div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {r.status === 'pending' && <button onClick={() => onEdit(r)} className="p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors" title="แก้ไข"><Edit2 size={16} /></button>}
                {r.status === 'transferred' && <button onClick={() => onReceive(r)} className="p-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors" title="กดรับสินค้า"><Package size={16} /></button>}
                <button onClick={() => onView(r)} className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="ดูรายละเอียด"><Eye size={16} /></button>
              </div>
            </div>
          ))
        }
        {mine.length > 0 && <Pagination total={mine.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />}
      </div>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <Card>
          <Table headers={['เลขที่', 'รายการ', 'จำนวนเงิน', 'สถานะ', 'วันที่', '']} rows={
            mine.length === 0
              ? <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">ไม่พบข้อมูล</td></tr>
              : paged.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{r.reqNo}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[180px] truncate">{r.title}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">฿{fmt(r.totalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {r.status === 'pending' && <button onClick={() => onEdit(r)} title="แก้ไข" className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors"><Edit2 size={14} /></button>}
                      {r.status === 'transferred' && <button onClick={() => onReceive(r)} title="กดรับสินค้า" className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors"><Package size={14} /></button>}
                      <button onClick={() => onView(r)} title="ดูรายละเอียด" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"><Eye size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
          } />
          {mine.length > 0 && <div className="px-4 pb-3"><Pagination total={mine.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} /></div>}
        </Card>
      </div>
    </div>
  );
}

/* ── Checkbox group — ชั่วคราว disabled (เปิดใช้เมื่อต้องการเลือกประเภท) ──
function CheckboxGroup({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all select-none
              ${on ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 bg-white dark:bg-slate-800'}`}>
            <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${on ? 'border-white' : 'border-current'}`}>
              {on && <CheckCircle size={9} className="text-white" />}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
}
*/

// ── Radio group ─────────────────────────────────────────────────────────────
function RadioGroup({ options, value, onChange }: { options: { val: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = value === opt.val;
        return (
          <button key={opt.val} type="button" onClick={() => onChange(on ? '' : opt.val)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all select-none
              ${on ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 bg-white dark:bg-slate-800'}`}>
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
              {on && <span className="w-2 h-2 rounded-full bg-blue-500 block" />}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Create Request Page ──────────────────────────────────────────────────────
function CreateRequestPage({ user, onSave, toast }: { user: User; onSave: (r: Omit<PurchaseRequest, 'id' | 'reqNo' | 'createdAt' | 'updatedAt'>) => void; toast: (m: string, t?: Toast['type']) => void }) {
  const [subAmount, setSubAmount] = useState('');
  const [vatAmount, setVatAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentTiming, setPaymentTiming] = useState('');
  const [orderDate, setOrderDate] = useState(today());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState(user.name);
  const [signedDate, setSignedDate] = useState(today());
  const [reqFileName, setReqFileName] = useState('');
  const [reqFileUrl, setReqFileUrl] = useState('');

  const vat = +vatAmount || 0;
  const sub = +subAmount || 0;
  const totalAmount = sub + vat;

  const handleReset = () => {
    setSubAmount(''); setVatAmount('');
    setPaymentMethod(''); setPaymentTiming('');
    setOrderDate(today()); setDeliveryDate(''); setDueDate('');
    setNotes(''); setContactName(user.name); setSignedDate(today());
    setReqFileName(''); setReqFileUrl('');
  };

  const handleSubmit = () => {
    if (!reqFileUrl) return toast('กรุณาแนบใบขอสั่งซื้อ', 'error');
    if (!subAmount || sub <= 0) return toast('กรุณากรอกยอดเงินก่อน VAT', 'error');
    if (!paymentMethod) return toast('กรุณาเลือกช่องทางการชำระเงิน', 'error');
    if (!paymentTiming) return toast('กรุณาเลือกกำหนดจ่าย', 'error');
    onSave({
      title: `ใบขอซื้อสินค้า ${orderDate}`,
      category: '', categories: [], supplierName: '', supplierName2: '',
      items: [], totalAmount, vatAmount: vat, reason: notes,
      paymentMethod: paymentMethod as any, paymentTiming: paymentTiming as any,
      orderDate, deliveryDate, dueDate, contactName, signedDate,
      requestFile: reqFileUrl,
      status: 'pending', createdBy: user.id, createdByName: user.name, notes,
    });
    handleReset();
  };

  const SLabel = ({ t }: { t: string }) => (
    <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{t}</div>
  );

  return (
    <div className="page-anim max-w-3xl">
      <Card>
        {/* Title */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">ใบขอซื้อสินค้า</h2>
          <p className="text-xs text-slate-400 mt-0.5">Purchase Request Form</p>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* วันที่แจ้ง + เลขที่ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="วันที่แจ้ง *" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">เลขที่เอกสาร</label>
              <div className="px-3 py-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-sm">สร้างอัตโนมัติ</div>
            </div>
          </div>

          {/* ปิดการใช้งานชั่วคราว
          <div>
            <SLabel t="ประเภท : ผัก / เนื้อ หมู ไก่ / ซอส / เครื่องดื่ม / อื่นๆ *" />
            <CheckboxGroup options={CATEGORIES} selected={categories} onChange={setCategories} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Input label="ชื่อ (Supplier Name) *" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="ชื่อผู้จำหน่าย" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <SLabel t="ตารางรายการสินค้า *" />
              <button onClick={() => setItems(p => [...p, { code: '', name: '', qty: 1, unit: 'หน่วย', price: 0, itemNote: '' }])}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                <Plus size={12} />เพิ่มรายการ
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
              <div className="hidden sm:block">
                <div className="grid bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wide"
                  style={{ gridTemplateColumns: '80px 1fr 64px 80px 100px 1fr 36px' }}>
                  {['Code', 'รายการ', 'จำนวน', 'หน่วย', 'ราคา', 'หมายเหตุ', ''].map((h, i) => (
                    <div key={i} className={`px-2 py-2 ${i < 6 ? 'border-r border-slate-200 dark:border-slate-700' : ''} ${i >= 2 && i <= 4 ? 'text-center' : ''}`}>{h}</div>
                  ))}
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/80">
                  {items.map((item, i) => (
                    <div key={i} className="grid items-stretch" style={{ gridTemplateColumns: '80px 1fr 64px 80px 100px 1fr 36px' }}>
                      {[
                        <input key="code" value={item.code} onChange={e => updateItem(i, 'code', e.target.value)} placeholder="C..."
                          className="w-full h-full px-2 py-2 text-xs bg-transparent outline-none text-slate-600 dark:text-slate-300 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="name" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="ชื่อสินค้า"
                          className="w-full h-full px-2 py-2 text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="qty" type="number" value={item.qty} onChange={e => updateItem(i, 'qty', +e.target.value)} min={1}
                          className="w-full h-full px-2 py-2 text-sm text-center bg-transparent outline-none text-slate-700 dark:text-slate-200 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="unit" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} placeholder="หน่วย"
                          className="w-full h-full px-2 py-2 text-xs text-center bg-transparent outline-none text-slate-600 dark:text-slate-300 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="price" type="number" value={item.price || ''} onChange={e => updateItem(i, 'price', +e.target.value)} placeholder="0"
                          className="w-full h-full px-2 py-2 text-sm text-right bg-transparent outline-none text-slate-700 dark:text-slate-200 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="note" value={item.itemNote} onChange={e => updateItem(i, 'itemNote', e.target.value)} placeholder="-"
                          className="w-full h-full px-2 py-2 text-xs bg-transparent outline-none text-slate-400 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <div key="del" className="flex items-center justify-center">
                          {items.length > 1 && (
                            <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                              className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>,
                      ].map((cell, ci) => (
                        <div key={ci} className={`${ci < 6 ? 'border-r border-slate-100 dark:border-slate-800' : ''}`}>{cell}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, i) => (
                  <div key={i} className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="ชื่อสินค้า *"
                        className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-700 dark:text-slate-200" />
                      {items.length > 1 && (
                        <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                          className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400">Code</span>
                        <input value={item.code} onChange={e => updateItem(i, 'code', e.target.value)} placeholder="C..."
                          className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-400 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400">จำนวน</span>
                        <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', +e.target.value)} min={1}
                          className="px-2 py-1.5 text-sm text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 dark:text-slate-200" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400">หน่วย</span>
                        <input value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} placeholder="หน่วย"
                          className="px-2 py-1.5 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-400 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400">ราคา</span>
                        <input type="number" value={item.price || ''} onChange={e => updateItem(i, 'price', +e.target.value)} placeholder="0"
                          className="px-2 py-1.5 text-sm text-right rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 dark:text-slate-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-bold">ยอดรวมทั้งสิ้น:</span>
                <span className="text-lg font-bold text-blue-600">฿{fmt(total)}</span>
              </div>
            </div>
          </div>
          */}

          <div className="pt-2">
            <FileUploadField
              label="แนบใบขอสั่งซื้อ (ต้องมีเท่านั้น) *"
              fileName={reqFileName}
              onFile={(name, url) => { setReqFileName(name); setReqFileUrl(url); }}
              onError={msg => toast(msg, 'error')}
            />
          </div>

          {/* ยอดเงิน */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">ยอดเงินก่อน VAT (บาท) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">฿</span>
                  <input type="number" min="0" step="0.01" value={subAmount} onChange={e => setSubAmount(e.target.value)} placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">ภาษีมูลค่าเพิ่ม VAT (บาท)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">฿</span>
                  <input type="number" min="0" step="0.01" value={vatAmount} onChange={e => setVatAmount(e.target.value)} placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" />
                </div>
              </div>
            </div>
            {/* Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-700 flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>ยอดก่อน VAT</span>
                <span>฿{sub.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>VAT</span>
                <span>฿{vat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white border-t border-slate-200 dark:border-slate-600 pt-1.5 mt-0.5">
                <span>ยอดรวมทั้งสิ้น</span>
                <span className="text-blue-600">฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
            {/* Payment Method */}
            <div className="flex flex-col gap-2">
              <SLabel t="ช่องทางการชำระเงิน :" />
              <RadioGroup options={[
                { val: 'bank', label: 'บัญชีบริษัท' },
                { val: 'cash', label: 'เงินสดย่อย' },
                { val: 'transfer', label: 'สำรองจ่าย' },
              ]} value={paymentMethod} onChange={setPaymentMethod} />
            </div>

            {/* Payment Timing */}
            <div className="flex flex-col gap-2">
              <SLabel t="กำหนดจ่าย :" />
              <RadioGroup options={[
                { val: 'before', label: 'ก่อนรับสินค้า' },
                { val: 'after', label: 'หลังรับสินค้า' },
              ]} value={paymentTiming} onChange={setPaymentTiming} />
            </div>
          </div>

          {/* Dates Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <Input label="วันที่สั่งซื้อ *" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
            <Input label="วันที่จะรับสินค้า" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
            <Sel label="วันที่ต้องชำระ" value={dueDate} onChange={e => setDueDate(e.target.value)}>
              <option value="">-- เลือกระยะเวลา --</option>
              <option value="วันที่ 10">วันที่ 10 </option>
              <option value="วันที่ 25">วันที่ 25 </option>
            </Sel>
          </div>

          {/* Notes */}
          <Textarea label="หมายเหตุ" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="ระบุหมายเหตุเพิ่มเติม..." />

          {/* Footer fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Input label="ชื่อผู้ติดต่อสั่งซื้อ" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="ระบุชื่อผู้ติดต่อ" />
            <Input label="วันที่ลงชื่อ" type="date" value={signedDate} onChange={e => setSignedDate(e.target.value)} />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none">
              <Send size={15} />บันทึกและส่งใบขอซื้อ
            </button>
            <button onClick={handleReset}
              className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              ล้างฟอร์ม
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PendingApprovalPage({ requests, onIssuePRPO, onReject, onView }: { requests: PurchaseRequest[]; onIssuePRPO: (r: PurchaseRequest) => void; onReject: (r: PurchaseRequest) => void; onView: (r: PurchaseRequest) => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pending = requests.filter(r => r.status === 'pending' && r.title.toLowerCase().includes(search.toLowerCase()));
  const paged = pending.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="max-w-xs"><SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="ค้นหาคำขอ..." /></div>
      {pending.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-16 text-center">
          <CheckCircle size={36} className="mx-auto text-green-400 mb-3" />
          <p className="text-slate-400 text-sm">ไม่มีรายการรออนุมัติ</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {paged.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                <div className="flex items-start justify-between gap-4">
                  <button onClick={() => onView(r)} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{r.reqNo}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-white text-sm leading-snug">{r.title}</div>
                    <div className="text-xs text-slate-400 mt-1.5 space-x-2">
                      <span>ผู้ขอ: <span className="text-slate-600 dark:text-slate-300">{r.createdByName}</span></span>
                      <span>·</span><span>{r.createdAt}</span>
                      <span>·</span><span>{r.category}</span>
                    </div>
                    <div className="text-sm font-bold text-blue-600 mt-2">฿{fmt(r.totalAmount)}</div>
                  </button>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => onIssuePRPO(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap">
                      <FileCheck size={13} />ออก PR/PO
                    </button>
                    <button onClick={() => onReject(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors whitespace-nowrap">
                      <XCircle size={13} />ปฏิเสธ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination total={pending.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </>
      )}
    </div>
  );
}

function IssuePRPOPage({ requests, onIssue, toast }: { requests: PurchaseRequest[]; onIssue: (id: string, prFile: string, poFile: string, notes: string, isDraft?: boolean) => void; toast: (m: string, t?: Toast['type']) => void }) {
  // แสดง pending + purchasing draft (ไฟล์ไม่ครบ)
  const avail = requests.filter(r =>
    r.status === 'pending' ||
    (r.status === 'purchasing' && (!r.prFile || !r.poFile))
  );
  const [selId, setSelId] = useState('');
  const [prFile, setPrFile] = useState('');
  const [prFileUrl, setPrFileUrl] = useState('');
  const [poFile, setPoFile] = useState('');
  const [poFileUrl, setPoFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const sel = avail.find(r => r.id === selId);
  const isDraft = sel?.status === 'purchasing';

  // เมื่อเลือกรายการใหม่ reset ไฟล์
  const handleSelect = (id: string) => {
    setSelId(id); setPrFile(''); setPrFileUrl(''); setPoFile(''); setPoFileUrl(''); setNotes('');
  };

  const hasPR = !!(prFileUrl || sel?.prFile);
  const hasPO = !!(poFileUrl || sel?.poFile);

  const handleSaveDraft = () => {
    if (!selId) return toast('กรุณาเลือกใบขอซื้อ', 'error');
    if (!hasPR && !hasPO) return toast('กรุณาแนบเอกสารอย่างน้อย 1 ไฟล์', 'error');
    onIssue(selId, prFileUrl, poFileUrl, notes, true);
    setSelId(''); setPrFile(''); setPrFileUrl(''); setPoFile(''); setPoFileUrl(''); setNotes('');
  };

  const handleSave = () => {
    if (!selId) return toast('กรุณาเลือกใบขอซื้อ', 'error');
    if (!hasPR) return toast('กรุณาแนบเอกสาร PR', 'error');
    if (!hasPO) return toast('กรุณาแนบเอกสาร PO', 'error');
    onIssue(selId, prFileUrl || sel?.prFile || '', poFileUrl || sel?.poFile || '', notes, false);
    setSelId(''); setPrFile(''); setPrFileUrl(''); setPoFile(''); setPoFileUrl(''); setNotes('');
  };

  return (
    <div className="page-anim max-w-xl">
      <Card title="แนบเอกสาร PR / PO">
        <div className="p-5 flex flex-col gap-4">
          <Sel label="เลือกใบขอซื้อ" value={selId} onChange={e => handleSelect(e.target.value)}>
            <option value="">-- เลือกรายการที่ต้องการ --</option>
            {avail.filter(r => r.status === 'pending').length > 0 && (
              <optgroup label="รอดำเนินการ">
                {avail.filter(r => r.status === 'pending').map(r =>
                  <option key={r.id} value={r.id}>{r.reqNo} — {r.title}</option>
                )}
              </optgroup>
            )}
            {avail.filter(r => r.status === 'purchasing').length > 0 && (
              <optgroup label="แบบร่าง (ไฟล์ไม่ครบ)">
                {avail.filter(r => r.status === 'purchasing').map(r =>
                  <option key={r.id} value={r.id}>{r.reqNo} — {r.title} {!r.prFile ? '[ขาด PR]' : ''}{!r.poFile ? '[ขาด PO]' : ''}</option>
                )}
              </optgroup>
            )}
          </Sel>

          {sel && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-xs space-y-1.5 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{sel.title}</span>
                {isDraft && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-1.5 py-0.5 rounded-full">แบบร่าง</span>}
              </div>
              <div className="text-slate-500">ผู้ขอ: {sel.createdByName} · <span className="font-bold text-blue-600">฿{fmt(sel.totalAmount)}</span></div>
              {isDraft && (
                <div className="flex gap-3 pt-1">
                  <span className={`flex items-center gap-1 font-medium ${sel.prFile ? 'text-green-600' : 'text-red-400'}`}>
                    {sel.prFile ? <CheckCircle size={11} /> : <XCircle size={11} />} PR
                  </span>
                  <span className={`flex items-center gap-1 font-medium ${sel.poFile ? 'text-green-600' : 'text-red-400'}`}>
                    {sel.poFile ? <CheckCircle size={11} /> : <XCircle size={11} />} PO
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FileUploadField
              label={sel?.prFile ? 'เอกสาร PR (มีแล้ว — อัปโหลดใหม่เพื่อแทนที่)' : 'เอกสาร PR *'}
              fileName={prFile}
              onFile={(name, url) => { setPrFile(name); setPrFileUrl(url); }}
              onError={msg => toast(msg, 'error')} />
            <FileUploadField
              label={sel?.poFile ? 'เอกสาร PO (มีแล้ว — อัปโหลดใหม่เพื่อแทนที่)' : 'เอกสาร PO *'}
              fileName={poFile}
              onFile={(name, url) => { setPoFile(name); setPoFileUrl(url); }}
              onError={msg => toast(msg, 'error')} />
          </div>
          <Textarea label="หมายเหตุ" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="หมายเหตุเพิ่มเติม..." />

          <div className="flex gap-2">
            <button onClick={handleSaveDraft}
              className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-2.5 rounded-xl transition-colors text-sm hover:bg-slate-200 dark:hover:bg-slate-600">
              บันทึกแบบร่าง
            </button>
            <button onClick={handleSave} disabled={!hasPR || !hasPO}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              <FileCheck size={15} />บันทึกครบ ✓
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ForwardAccountingPage({ requests, onForward, onAddFile }: {
  requests: PurchaseRequest[];
  onForward: (r: PurchaseRequest) => void;
  onAddFile: (r: PurchaseRequest) => void;
}) {
  const [search, setSearch] = useState('');
  const all = requests.filter(r => r.status === 'purchasing');
  const ready = all.filter(r =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.reqNo.toLowerCase().includes(search.toLowerCase()) ||
    (r.prNo || '').toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาเลขที่ / รายการ..." />
        </div>
        <span className="text-xs text-slate-400">{ready.length} รายการ</span>
      </div>
      {all.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-16 text-center">
          <CheckCircle size={36} className="mx-auto text-green-400 mb-3" />
          <p className="text-slate-400 text-sm">ไม่มีรายการรอส่งต่อบัญชี</p>
        </div>
      ) : ready.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-12 text-center text-slate-400 text-sm">ไม่พบรายการที่ค้นหา</div>
      ) : ready.map(r => {
        const hasAll = !!r.prFile && !!r.poFile;
        return (
          <div key={r.id} className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 flex items-center justify-between gap-4 ${!hasAll ? 'border-amber-200 dark:border-amber-700' : 'border-slate-100 dark:border-slate-800'}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-xs font-mono text-slate-400">{r.reqNo}</span>
                <StatusBadge status={r.status} />
                {!hasAll && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full">ไฟล์ไม่ครบ</span>}
              </div>
              <div className="font-semibold text-slate-800 dark:text-white text-sm truncate">{r.title}</div>
              <div className="text-xs text-slate-400 mt-1 flex gap-2 flex-wrap">
                <span className={r.prFile ? 'text-green-600' : 'text-red-400'}>
                  {r.prFile ? '✓' : '✗'} PR {r.prNo || '—'}
                </span>
                <span>·</span>
                <span className={r.poFile ? 'text-green-600' : 'text-red-400'}>
                  {r.poFile ? '✓' : '✗'} PO {r.poNo || '—'}
                </span>
                <span>·</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">฿{fmt(r.totalAmount)}</span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {!hasAll && (
                <button onClick={() => onAddFile(r)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-colors">
                  <Upload size={13} />แนบไฟล์
                </button>
              )}
              <button onClick={() => onForward(r)} disabled={!hasAll}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <Send size={13} />ส่งต่อบัญชี
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentListPage({ requests, onRecord }: { requests: PurchaseRequest[]; onRecord: (r: PurchaseRequest) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const waiting = requests
    .filter(r => r.status === 'accounting')
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  const dueBadge = (due: string) => {
    if (!due) return null;
    if (due < today) return <span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded-full">เกินกำหนด</span>;
    if (due === today) return <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 rounded-full">ครบกำหนดวันนี้</span>;
    const diff = Math.ceil((new Date(due).getTime() - new Date(today).getTime()) / 86400000);
    if (diff <= 3) return <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full">อีก {diff} วัน</span>;
    return null;
  };

  return (
    <div className="page-anim flex flex-col gap-4">
      {waiting.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-16 text-center">
          <CheckCircle size={36} className="mx-auto text-green-400 mb-3" />
          <p className="text-slate-400 text-sm">ไม่มีรายการรอโอนเงิน</p>
        </div>
      ) : waiting.map(r => (
        <div key={r.id} className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 flex items-center justify-between gap-4 ${r.dueDate && r.dueDate <= today ? 'border-red-200 dark:border-red-800' : 'border-slate-100 dark:border-slate-800'}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-mono text-slate-400">{r.reqNo}</span>
              <StatusBadge status={r.status} />
              {r.dueDate && dueBadge(r.dueDate)}
            </div>
            <div className="font-semibold text-slate-800 dark:text-white text-sm truncate">{r.title}</div>
            <div className="text-xs text-slate-400 mt-1 space-x-2">
              <span>PR: <span className="font-mono">{r.prNo}</span></span>
              <span>·</span>
              <span>PO: <span className="font-mono">{r.poNo}</span></span>
              {r.dueDate && <><span>·</span><span className="flex items-center gap-1 inline-flex"><CalendarDays size={10} />กำหนด: <span className="font-medium text-slate-600 dark:text-slate-300">{r.dueDate}</span></span></>}
            </div>
            <div className="text-sm font-bold text-blue-600 mt-1.5">฿{fmt(r.totalAmount)}</div>
          </div>
          <button onClick={() => onRecord(r)} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors shrink-0">
            <CreditCard size={13} />บันทึกโอนเงิน
          </button>
        </div>
      ))}
    </div>
  );
}

function RecordPaymentPage({ requests, onTransfer, toast }: { requests: PurchaseRequest[]; onTransfer: (id: string, ref: string, date: string, notes: string, fileUrl: string) => void; toast: (m: string, t?: Toast['type']) => void }) {
  const avail = requests.filter(r => r.status === 'accounting');
  const [selId, setSelId] = useState('');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [slipName, setSlipName] = useState('');
  const [slipUrl, setSlipUrl] = useState('');

  const handle = () => {
    if (!selId) return toast('กรุณาเลือกรายการ', 'error');
    if (!ref.trim()) return toast('กรุณากรอกเลขอ้างอิงการโอน', 'error');
    onTransfer(selId, ref, date, notes, slipUrl);
    setSelId(''); setRef(''); setNotes(''); setSlipName(''); setSlipUrl('');
  };

  return (
    <div className="page-anim max-w-xl">
      <Card title="บันทึกการโอนเงิน">
        <div className="p-5 flex flex-col gap-4">
          <Sel label="เลือกรายการ PR/PO" value={selId} onChange={e => setSelId(e.target.value)}>
            <option value="">-- เลือกรายการ --</option>
            {avail.map(r => <option key={r.id} value={r.id}>{r.reqNo} — {r.title} (฿{fmt(r.totalAmount)})</option>)}
          </Sel>
          <Input label="เลขอ้างอิงการโอน *" value={ref} onChange={e => setRef(e.target.value)} placeholder="เช่น TRF-010" />
          <Input label="วันที่โอน *" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Textarea label="หมายเหตุ" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          <FileUploadField label="แนบสลิปการโอน" fileName={slipName} onFile={(name, url) => { setSlipName(name); setSlipUrl(url); }} onError={msg => toast(msg, 'error')} />
          <button onClick={handle} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
            <Banknote size={15} />บันทึกการโอนเงิน
          </button>
        </div>
      </Card>
    </div>
  );
}

function PaymentHistoryPage({ requests }: { requests: PurchaseRequest[] }) {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const done = requests.filter(r => {
    if (r.status !== 'transferred') return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !(r.transferRef || '').includes(search)) return false;
    if (dateFrom && (r.transferDate || '') < dateFrom) return false;
    if (dateTo && (r.transferDate || '') > dateTo) return false;
    return true;
  });
  const totalAmt = done.reduce((s, r) => s + r.totalAmount, 0);
  const paged = done.slice((page - 1) * pageSize, page * pageSize);

  const exportCSV = () => {
    const headers = ['เลขที่', 'รายการ', 'จำนวนเงิน', 'Ref. โอน', 'วันที่โอน', 'ผู้ขอ'];
    const rows = done.map(r => [r.reqNo, r.title, r.totalAmount, r.transferRef || '', r.transferDate || '', r.createdByName]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `payment-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="max-w-xs flex-1"><SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} /></div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter size={12} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20" />
          <span>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20" />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} className="text-slate-400 hover:text-red-500"><X size={12} /></button>}
        </div>
        <div className="text-xs text-slate-500 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 px-3 py-1.5 rounded-xl">
          ยอดรวม: <span className="font-bold text-green-600">฿{fmt(totalAmt)}</span>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors">
          <Download size={12} />Export CSV
        </button>
      </div>
      <Card>
        <Table headers={['เลขที่', 'รายการ', 'จำนวนเงิน', 'Ref. โอน', 'วันที่โอน', 'ผู้ขอ']} rows={
          done.length === 0
            ? <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">ไม่พบข้อมูล</td></tr>
            : paged.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-slate-400">{r.reqNo}</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 max-w-[160px] truncate">{r.title}</td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600">฿{fmt(r.totalAmount)}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-500">{r.transferRef || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{r.transferDate || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.createdByName}</td>
              </tr>
            ))
        } />
        {done.length > 0 && <div className="px-4 pb-3"><Pagination total={done.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} /></div>}
      </Card>
    </div>
  );
}

function AllRequestsPage({ requests }: { requests: PurchaseRequest[] }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = requests.filter(r =>
    (r.title.toLowerCase().includes(search.toLowerCase()) || r.reqNo.includes(search)) &&
    (!filterStatus || r.status === filterStatus)
  );
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] max-w-xs"><SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} /></div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="text-xs text-slate-400">{filtered.length} รายการ</span>
        <button onClick={() => api.requests.exportExcel(filterStatus || undefined).catch(() => { })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors ml-auto">
          <Download size={13} />Export Excel
        </button>
      </div>
      <Card>
        <Table headers={['เลขที่', 'รายการ', 'ผู้ขอ', 'หมวด', 'จำนวนเงิน', 'สถานะ', 'วันที่']} rows={
          filtered.length === 0
            ? <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">ไม่พบข้อมูล</td></tr>
            : paged.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-slate-400">{r.reqNo}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[160px] truncate">{r.title}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{r.createdByName}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{r.category}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">฿{fmt(r.totalAmount)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs text-slate-400">{r.createdAt}</td>
              </tr>
            ))
        } />
        {filtered.length > 0 && <div className="px-4 pb-3"><Pagination total={filtered.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} /></div>}
      </Card>
    </div>
  );
}

function UserManagementPage({ users, onAdd, onEdit, onDelete, onReset }: {
  users: User[]; onAdd: () => void; onEdit: (u: User) => void; onDelete: (u: User) => void; onReset: (u: User) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.username.includes(search));

  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs"><SearchBar value={search} onChange={setSearch} placeholder="ค้นหาผู้ใช้..." /></div>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors ml-auto">
          <UserPlus size={15} />เพิ่มผู้ใช้
        </button>
      </div>
      <Card>
        <Table headers={['ผู้ใช้', 'Email', 'Role', 'สถานะ', 'การดำเนินการ']} rows={
          filtered.map(u => (
            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0">{u.name.charAt(0)}</div>
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.name}</div>
                    <div className="text-xs text-slate-400">@{u.username}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
              <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${u.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'}`}>
                  {u.active ? 'ใช้งาน' : 'ระงับ'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => onEdit(u)} title="แก้ไข" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => onReset(u)} title="Reset Password" className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors"><KeyRound size={14} /></button>
                  <button onClick={() => onDelete(u)} title="ลบ" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))
        } />
      </Card>
    </div>
  );
}

function AddUserPage({ editUser, onSave }: { editUser?: User | null; onSave: (d: Partial<User>) => void }) {
  const [name, setName] = useState(editUser?.name || '');
  const [username, setUsername] = useState(editUser?.username || '');
  const [email, setEmail] = useState(editUser?.email || '');
  const [role, setRole] = useState<Role>(editUser?.role || 'employee');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(editUser?.active ?? true);

  return (
    <div className="page-anim max-w-md">
      <Card title={editUser ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}>
        <div className="p-5 flex flex-col gap-4">
          <Input label="ชื่อ-นามสกุล *" value={name} onChange={e => setName(e.target.value)} placeholder="นายสมชาย ใจดี" />
          <Input label="Username *" value={username} onChange={e => setUsername(e.target.value)} placeholder="somchai" />
          <Input label="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" />
          <Input label={editUser ? 'Password ใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'Password *'} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน" />
          <Sel label="Role" value={role} onChange={e => setRole(e.target.value as Role)}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Sel>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">สถานะ</span>
            <button onClick={() => setActive(!active)} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <span className="text-xs text-slate-500">{active ? 'ใช้งาน' : 'ระงับ'}</span>
          </div>
          <button onClick={() => onSave({ name, username, email, role, password: password || editUser?.password, active })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
            <Shield size={15} />{editUser ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'}
          </button>
        </div>
      </Card>
    </div>
  );
}

function AuditLogPage({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const actionColor: Record<string, string> = {
    LOGIN: 'bg-blue-100 text-blue-700', CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-amber-100 text-amber-700', DELETE: 'bg-red-100 text-red-700',
    REJECT: 'bg-red-100 text-red-700', LOGOUT: 'bg-slate-100 text-slate-500',
  };
  const actions = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'REJECT'];

  const filtered = logs.filter(l => {
    const dateStr = l.timestamp?.slice(0, 10) || '';
    if (search && !l.userName.includes(search) && !l.action.includes(search) && !l.detail.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAction && l.action !== filterAction) return false;
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  });
  const pagedLogs = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCSV = () => {
    const headers = ['เวลา', 'ผู้ใช้', 'Action', 'Module', 'รายละเอียด', 'IP'];
    const rows = filtered.map(l => [l.timestamp, l.userName, l.action, l.module, l.detail, l.ip || '']);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="max-w-xs flex-1"><SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="ค้นหาใน audit log..." /></div>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="">ทุก Action</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter size={12} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20" />
          <span>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20" />
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-slate-400 hover:text-red-500"><X size={12} /></button>}
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors">
          <Download size={12} />Export CSV
        </button>
      </div>
      <Card>
        <Table headers={['เวลา', 'ผู้ใช้', 'Action', 'Module', 'รายละเอียด', 'IP']} rows={
          filtered.length === 0
            ? <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">ไม่พบข้อมูล</td></tr>
            : pagedLogs.map(l => (
              <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 text-[11px] font-mono text-slate-400 whitespace-nowrap">{l.timestamp}</td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{l.userName}</td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${actionColor[l.action] || 'bg-slate-100 text-slate-600'}`}>{l.action}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{l.module}</td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{l.detail}</td>
                <td className="px-4 py-3 text-[11px] font-mono text-slate-400">{l.ip}</td>
              </tr>
            ))
        } />
        {filtered.length > 0 && <div className="px-4 pb-3"><Pagination total={filtered.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} /></div>}
      </Card>
    </div>
  );
}

const MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const THAI_YEAR = (y: number) => y + 543

function ReportsPage({ requests }: { requests: PurchaseRequest[] }) {
  const now = new Date()
  const [period, setPeriod] = useState<'all' | 'day' | 'month' | 'year'>('month')
  const [selDate, setSelDate] = useState(now.toISOString().slice(0, 10))
  const [selMonth, setSelMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [selYear, setSelYear] = useState(now.getFullYear())

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  // กรองข้อมูลตาม period
  const filtered = requests.filter(r => {
    const d = r.createdAt || ''
    if (period === 'day') return d === selDate
    if (period === 'month') return d.slice(0, 7) === selMonth
    if (period === 'year') return d.slice(0, 4) === String(selYear)
    return true
  })

  // BarChart data ตาม period
  const barData = (() => {
    if (period === 'year') {
      return MONTH_SHORT.map((label, i) => {
        const m = `${selYear}-${String(i + 1).padStart(2, '0')}`
        return { label, value: filtered.filter(r => (r.createdAt || '').startsWith(m)).reduce((s, r) => s + r.totalAmount, 0) }
      })
    }
    if (period === 'month') {
      const [y, m] = selMonth.split('-').map(Number)
      const days = new Date(y, m, 0).getDate()
      return Array.from({ length: days }, (_, i) => {
        const day = `${selMonth}-${String(i + 1).padStart(2, '0')}`
        return { label: String(i + 1), value: filtered.filter(r => r.createdAt === day).reduce((s, r) => s + r.totalAmount, 0) }
      })
    }
    if (period === 'day') {
      return CATEGORIES.map(cat => ({
        label: cat.slice(0, 4), value: filtered.filter(r => r.category === cat).reduce((s, r) => s + r.totalAmount, 0)
      })).filter(d => d.value > 0)
    }
    // all — 6 เดือนล่าสุด
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(); m.setMonth(m.getMonth() - 5 + i)
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
      return { label: MONTH_SHORT[m.getMonth()], value: requests.filter(r => (r.createdAt || '').startsWith(key)).reduce((s, r) => s + r.totalAmount, 0) }
    })
  })()

  const periodLabel = (() => {
    if (period === 'day') return `วันที่ ${new Date(selDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`
    if (period === 'month') { const [y, m] = selMonth.split('-').map(Number); return `${MONTH_SHORT[m - 1]} ${THAI_YEAR(y)}` }
    if (period === 'year') return `ปี ${THAI_YEAR(selYear)}`
    return 'ทั้งหมด'
  })()

  const total = filtered.reduce((s, r) => s + r.totalAmount, 0)
  const transferred = filtered.filter(r => r.status === 'transferred' || r.status === 'received').reduce((s, r) => s + r.totalAmount, 0)
  const inProgress = filtered.filter(r => ['pending', 'purchasing', 'accounting', 'transferred'].includes(r.status)).reduce((s, r) => s + r.totalAmount, 0)
  const catData = CATEGORIES.map(cat => ({ label: cat, value: filtered.filter(r => r.category === cat).reduce((s, r) => s + r.totalAmount, 0) })).filter(d => d.value > 0)

  const exportCSV = () => {
    const headers = ['เลขที่', 'รายการ', 'หมวด', 'จำนวนเงิน', 'สถานะ', 'วันที่สร้าง', 'ผู้ขอ', 'วิธีชำระ']
    const rows = filtered.map(r => [r.reqNo, r.title, r.category, r.totalAmount, STATUS_LABELS[r.status] || r.status, r.createdAt, r.createdByName, r.paymentMethod])
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `report-${period}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const tabCls = (t: typeof period) =>
    `px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${period === t ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`

  return (
    <div className="page-anim flex flex-col gap-5">
      {/* Period selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {(['all', 'day', 'month', 'year'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={tabCls(p)}>
              {p === 'all' ? 'ทั้งหมด' : p === 'day' ? 'รายวัน' : p === 'month' ? 'รายเดือน' : 'รายปี'}
            </button>
          ))}
        </div>

        {period === 'day' && (
          <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" />
        )}
        {period === 'month' && (
          <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20" />
        )}
        {period === 'year' && (
          <select value={selYear} onChange={e => setSelYear(+e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20">
            {yearOptions.map(y => <option key={y} value={y}>ปี {THAI_YEAR(y)}</option>)}
          </select>
        )}

        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 ml-1">{periodLabel}</span>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} รายการ</span>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors">
          <Download size={12} />Export CSV
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label={`ยอดรวม${period === 'all' ? '' : ` (${periodLabel})`}`} value={`฿${fmt(total)}`} icon={DollarSign} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600" />
        <StatCard label="โอนเงิน/รับสินค้าแล้ว" value={`฿${fmt(transferred)}`} icon={CheckCircle} color="bg-green-100 dark:bg-green-900/30 text-green-600" />
        <StatCard label="กำลังดำเนินการ" value={`฿${fmt(inProgress)}`} icon={Clock} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-16 text-center">
          <CalendarDays size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">ไม่มีข้อมูลในช่วงเวลานี้</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title={period === 'year' ? `ยอดรายเดือน ปี ${THAI_YEAR(selYear)}` : period === 'month' ? `ยอดรายวัน ${periodLabel}` : period === 'day' ? 'ยอดตามหมวด' : 'ยอด 6 เดือนล่าสุด'}>
              <div className="px-5 pb-5 pt-2"><BarChart data={barData} /></div>
            </Card>
            <Card title="สัดส่วนตามหมวดหมู่">
              <div className="px-5 pb-5 pt-2">
                {catData.length > 0 ? <PieChart data={catData} /> : <p className="text-slate-400 text-sm py-8 text-center">ไม่มีข้อมูล</p>}
              </div>
            </Card>
          </div>

          <Card title="สรุปสถานะคำขอ">
            <div className="p-5">
              {Object.entries(STATUS_LABELS).map(([k]) => {
                const count = filtered.filter(r => r.status === k).length
                const amt = filtered.filter(r => r.status === k).reduce((s, r) => s + r.totalAmount, 0)
                const pct = total ? Math.round(amt / total * 100) : 0
                if (count === 0) return null
                return (
                  <div key={k} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <StatusBadge status={k} />
                      <span className="text-xs text-slate-500">{count} รายการ</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">฿{fmt(amt)}</span>
                      <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-7 text-right">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card title="สรุปตามหมวดหมู่">
            <Table headers={['หมวดหมู่', 'จำนวนคำขอ', 'ยอดรวม', 'สัดส่วน']} rows={
              catData.length === 0
                ? <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm">ไม่มีข้อมูล</td></tr>
                : catData.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{d.label}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{filtered.filter(r => r.category === d.label).length} รายการ</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">฿{fmt(d.value)}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{total ? Math.round(d.value / total * 100) : 0}%</td>
                  </tr>
                ))
            } />
          </Card>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRACKING PAGE
// ═══════════════════════════════════════════════════════════════════
function TrackingPage({ requests, user, onView }: {
  requests: PurchaseRequest[];
  user: User;
  onView: (r: PurchaseRequest) => void;
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  type StepState = 'done' | 'current' | 'pending' | 'rejected';

  const getSteps = (r: PurchaseRequest): { label: string; sub: string; state: StepState }[] => {
    const s = r.status;
    const hasPR = !!r.prFile;
    const hasPO = !!r.poFile;
    const done3 = ['transferred', 'received'].includes(s);
    const inPurchasing = ['purchasing', 'accounting', 'transferred', 'received'].includes(s);
    return [
      { label: 'สร้างคำขอ', sub: r.createdAt, state: 'done' },
      {
        label: 'ฝ่ายจัดซื้อ',
        sub: s === 'pending' ? 'รอดำเนินการ' : s === 'rejected' ? 'ปฏิเสธแล้ว' : r.updatedAt,
        state: s === 'pending' ? 'current' : s === 'rejected' ? 'rejected' : 'done',
      },
      {
        label: 'แนบเอกสาร PR',
        sub: hasPR ? (r.prNo || '—') : inPurchasing ? 'รอแนบไฟล์' : '—',
        state: s === 'rejected' || s === 'pending' ? 'pending' : hasPR ? 'done' : 'current',
      },
      {
        label: 'แนบเอกสาร PO',
        sub: hasPO ? (r.poNo || '—') : inPurchasing ? 'รอแนบไฟล์' : '—',
        state: s === 'rejected' || s === 'pending' ? 'pending' : hasPO ? 'done' : hasPR ? 'current' : 'pending',
      },
      {
        label: 'โอนเงิน',
        sub: done3 ? (r.transferDate || r.updatedAt) : s === 'accounting' ? 'รอโอนเงิน' : '—',
        state: done3 ? 'done' : s === 'accounting' ? 'current' : 'pending',
      },
      {
        label: 'รับสินค้า',
        sub: s === 'received' ? (r.receivedAt || r.updatedAt) : s === 'transferred' ? 'รอรับสินค้า' : '—',
        state: s === 'received' ? 'done' : s === 'transferred' ? 'current' : 'pending',
      },
    ];
  };

  const lineColor = (state: StepState) =>
    state === 'done' ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-700';

  const circleClass = (state: StepState) =>
    state === 'done' ? 'bg-green-500 border-green-500' :
      state === 'current' ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/40' :
        state === 'rejected' ? 'bg-red-500 border-red-500' :
          'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600';

  const labelClass = (state: StepState) =>
    state === 'done' ? 'text-green-600 dark:text-green-400' :
      state === 'current' ? 'text-blue-600 dark:text-blue-400 font-semibold' :
        state === 'rejected' ? 'text-red-500 dark:text-red-400' :
          'text-slate-400';

  const visible = requests
    .filter(r => user.role === 'employee' ? r.createdBy === user.id : true)
    .filter(r =>
      (!search || r.title.toLowerCase().includes(search.toLowerCase()) || r.reqNo.toLowerCase().includes(search.toLowerCase())) &&
      (!filterStatus || r.status === filterStatus)
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pagedVisible = visible.slice((page - 1) * pageSize, page * pageSize);

  const allCounts = (['pending', 'purchasing', 'accounting', 'transferred', 'received', 'rejected'] as const).map(k => ({
    key: k,
    count: requests.filter(r => (user.role === 'employee' ? r.createdBy === user.id : true) && r.status === k).length,
  })).filter(s => s.count > 0);

  return (
    <div className="page-anim flex flex-col gap-4">
      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2 items-center">
        {allCounts.map(s => (
          <button key={s.key}
            onClick={() => { setFilterStatus(filterStatus === s.key ? '' : s.key); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 transition-all hover:shadow-sm ${filterStatus === s.key ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
            <StatusBadge status={s.key} />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{s.count}</span>
          </button>
        ))}
        {filterStatus && (
          <button onClick={() => { setFilterStatus(''); setPage(1); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors">
            <X size={11} />ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Search + count + export */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="ค้นหาเลขที่ / รายการ..." />
        </div>
        <span className="text-xs text-slate-400">{visible.length} รายการ</span>
        <button onClick={() => api.requests.exportExcel(filterStatus || undefined).catch(() => { })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors ml-auto">
          <Download size={13} />Export Excel
        </button>
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-16 text-center text-slate-400 text-sm">
          ไม่พบรายการ
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pagedVisible.map(r => {
            const steps = getSteps(r);
            return (
              <div key={r.id} onClick={() => onView(r)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-mono text-slate-400 shrink-0">{r.reqNo}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{r.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{r.createdByName}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">฿{fmt(r.totalAmount)}</span>
                      {r.dueDate && (
                        <>
                          <span>·</span>
                          <span className={`flex items-center gap-1 font-medium ${r.dueDate < today() && !['received','rejected'].includes(r.status) ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                            <CalendarDays size={11} />ชำระ: {r.dueDate}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0 mt-1" />
                </div>

                {/* Timeline */}
                <div className="flex items-start">
                  {steps.map((step, i) => (
                    <React.Fragment key={i}>
                      <div className="flex flex-col items-center min-w-0 flex-1">
                        {/* Line + Circle + Line */}
                        <div className="flex items-center w-full">
                          <div className={`flex-1 h-0.5 transition-colors rounded-full ${i === 0 ? 'invisible' : lineColor(steps[i - 1].state)}`} />
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${circleClass(step.state)}`}>
                            {step.state === 'done' && <CheckCircle size={13} className="text-white" />}
                            {step.state === 'current' && <Clock size={13} className="text-white" />}
                            {step.state === 'rejected' && <XCircle size={13} className="text-white" />}
                            {step.state === 'pending' && null}
                          </div>
                          <div className={`flex-1 h-0.5 transition-colors rounded-full ${i === steps.length - 1 ? 'invisible' : lineColor(step.state)}`} />
                        </div>
                        {/* Step label */}
                        <div className={`mt-1.5 text-[10px] sm:text-[11px] font-medium text-center leading-tight ${labelClass(step.state)}`}>
                          {step.label}
                        </div>
                        {/* Sub-info */}
                        <div className="text-[9px] sm:text-[10px] text-slate-400 text-center mt-0.5 leading-tight px-1 w-full truncate">
                          {step.sub}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {visible.length > 0 && <Pagination total={visible.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REQUEST DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════
function RequestDetailModal({ req, onClose }: { req: PurchaseRequest | null; onClose: () => void }) {
  if (!req) return null;

  type StepState = 'done' | 'current' | 'pending' | 'rejected';
  const s = req.status;
  const hasPR = !!req.prFile;
  const hasPO = !!req.poFile;
  const done3 = ['transferred', 'received'].includes(s);
  const inPurchasing = ['purchasing', 'accounting', 'transferred', 'received'].includes(s);
  const steps: { label: string; sub: string; state: StepState }[] = [
    { label: 'สร้างคำขอ', sub: req.createdAt, state: 'done' },
    {
      label: 'ฝ่ายจัดซื้อ',
      sub: s === 'pending' ? 'รอดำเนินการ' : s === 'rejected' ? 'ปฏิเสธแล้ว' : req.updatedAt,
      state: s === 'pending' ? 'current' : s === 'rejected' ? 'rejected' : 'done',
    },
    {
      label: 'แนบเอกสาร PR',
      sub: hasPR ? (req.prNo || '—') : inPurchasing ? 'รอแนบไฟล์' : '—',
      state: s === 'rejected' || s === 'pending' ? 'pending' : hasPR ? 'done' : 'current',
    },
    {
      label: 'แนบเอกสาร PO',
      sub: hasPO ? (req.poNo || '—') : inPurchasing ? 'รอแนบไฟล์' : '—',
      state: s === 'rejected' || s === 'pending' ? 'pending' : hasPO ? 'done' : hasPR ? 'current' : 'pending',
    },
    {
      label: 'โอนเงิน',
      sub: done3 ? (req.transferDate || req.updatedAt) : s === 'accounting' ? 'รอโอนเงิน' : '—',
      state: done3 ? 'done' : s === 'accounting' ? 'current' : 'pending',
    },
    {
      label: 'รับสินค้า',
      sub: s === 'received' ? (req.receivedAt || req.updatedAt) : s === 'transferred' ? 'รอรับสินค้า' : '—',
      state: s === 'received' ? 'done' : s === 'transferred' ? 'current' : 'pending',
    },
  ];
  const lineColor = (st: StepState) =>
    st === 'done' ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-700';
  const circleClass = (st: StepState) =>
    st === 'done' ? 'bg-green-500 border-green-500' :
      st === 'current' ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/40' :
        st === 'rejected' ? 'bg-red-500 border-red-500' :
          'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
  const labelClass = (st: StepState) =>
    st === 'done' ? 'text-green-600 dark:text-green-400' :
      st === 'current' ? 'text-blue-600 dark:text-blue-400 font-semibold' :
        st === 'rejected' ? 'text-red-500 dark:text-red-400' : 'text-slate-400';

  return (
    <Modal open title={`${req.reqNo} — รายละเอียด`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        {/* Tracking Timeline */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
          <div className="text-[11px] text-slate-400 font-medium mb-3">สถานะการดำเนินการ</div>
          <div className="flex items-start">
            {steps.map((step, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center min-w-0 flex-1">
                  <div className="flex items-center w-full">
                    <div className={`flex-1 h-0.5 rounded-full ${i === 0 ? 'invisible' : lineColor(steps[i - 1].state)}`} />
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 ${circleClass(step.state)}`}>
                      {step.state === 'done' && <CheckCircle size={11} className="text-white" />}
                      {step.state === 'current' && <Clock size={11} className="text-white" />}
                      {step.state === 'rejected' && <XCircle size={11} className="text-white" />}
                      {step.state === 'pending' && null}
                    </div>
                    <div className={`flex-1 h-0.5 rounded-full ${i === steps.length - 1 ? 'invisible' : lineColor(step.state)}`} />
                  </div>
                  <div className={`mt-1 text-[9px] font-medium text-center leading-tight ${labelClass(step.state)}`}>{step.label}</div>
                  <div className="text-[8px] text-slate-400 text-center mt-0.5 px-0.5 w-full truncate">{step.sub}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap"><StatusBadge status={req.status} /></div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            ['ชื่อรายการ', req.title], ['หมวดหมู่', req.category],
            ['ผู้ขอ', req.createdByName], ['วันที่สร้าง', req.createdAt],
            ...(req.dueDate ? [['วันที่ต้องชำระ', req.dueDate]] : []),
            ...(req.prNo ? [['PR No.', req.prNo]] : []),
            ...(req.poNo ? [['PO No.', req.poNo]] : []),
            ...(req.transferRef ? [['Ref. โอนเงิน', req.transferRef]] : []),
            ...(req.transferDate ? [['วันที่โอน', req.transferDate]] : []),
          ].map(([label, val], i) => (
            <div key={i}>
              <div className="text-[11px] text-slate-400 font-medium mb-0.5">{label}</div>
              <div className="text-slate-700 dark:text-slate-200 font-medium">{val}</div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium mb-2">รายการสินค้า</div>
          <div className="space-y-1">
            {(req.items ?? []).map((it, i) => (
              <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>{it.name} × {it.qty} {it.unit}</span>
                <span className="font-medium">฿{fmt(it.qty * it.price)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200 border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 text-sm">
            <span>รวมทั้งหมด</span><span className="text-blue-600">฿{fmt(req.totalAmount)}</span>
          </div>
        </div>

        {req.reason && (
          <div>
            <div className="text-[11px] text-slate-400 font-medium mb-0.5">เหตุผล</div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{req.reason}</p>
          </div>
        )}
        {req.notes && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3">
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-0.5">หมายเหตุ</div>
            <p className="text-slate-600 dark:text-slate-400 text-xs">{req.notes}</p>
          </div>
        )}
        {(req.requestFile || req.prFile || req.poFile || req.transferFile || req.deliveryNote || req.taxInvoice) && (
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-3">เอกสารแนบ</div>
            <div className="relative">
              {/* vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-green-400 dark:bg-green-600" />
              <div className="space-y-5">
                {req.requestFile && (
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-green-400 dark:border-green-600 bg-white dark:bg-slate-900" />
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">พนักงาน</div>
                    <FileButton label="ใบขอสั่งซื้อ" raw={req.requestFile} />
                  </div>
                )}
                {(req.prFile || req.poFile) && (
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-green-400 dark:border-green-600 bg-white dark:bg-slate-900" />
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">ฝ่ายจัดซื้อ</div>
                    <div className="space-y-2">
                      {req.prFile && <FileButton label="เอกสาร PR" raw={req.prFile} />}
                      {req.poFile && <FileButton label="เอกสาร PO" raw={req.poFile} />}
                    </div>
                  </div>
                )}
                {req.transferFile && (
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-green-400 dark:border-green-600 bg-white dark:bg-slate-900" />
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">ฝ่ายบัญชี</div>
                    <FileButton label="สลิปโอนเงิน" raw={req.transferFile} />
                  </div>
                )}
                {(req.deliveryNote || req.taxInvoice) && (
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-green-400 dark:border-green-600 bg-white dark:bg-slate-900" />
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">พนักงาน (รับสินค้า)</div>
                    <div className="space-y-2">
                      {req.deliveryNote && <FileButton label="ใบส่งของ" raw={req.deliveryNote} />}
                      {req.taxInvoice && <FileButton label="ใบกำกับภาษี" raw={req.taxInvoice} />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {req.receivedAt && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-3 space-y-2">
            <div className="text-[11px] text-green-600 dark:text-green-400 font-medium">รับสินค้าแล้ว — วันที่: {req.receivedAt}</div>
            {req.productPhotos && (() => {
              try {
                const photos: string[] = JSON.parse(req.productPhotos);
                return photos.length > 0 ? (
                  <div>
                    <div className="text-[10px] text-slate-400 mb-1.5">รูปภาพสินค้า</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-green-200 dark:border-green-700 bg-slate-50 dark:bg-slate-800 block hover:opacity-80 transition-opacity">
                          <img src={url} alt={`สินค้า ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null;
              } catch { return null; }
            })()}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// DISCORD SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function DiscordSettingsPage({ current, onSave, toast }: {
  current: SiteSettings; onSave: (s: SiteSettings) => void; toast: (m: string, t?: Toast['type']) => void;
}) {
  const [webhook, setWebhook] = useState(current.discordWebhook || '');
  const [events, setEvents] = useState({
    discordOnNewRequest: current.discordOnNewRequest ?? true,
    discordOnPurchasing: current.discordOnPurchasing ?? true,
    discordOnAccounting: current.discordOnAccounting ?? true,
    discordOnTransferred: current.discordOnTransferred ?? true,
    discordOnRejected: current.discordOnRejected ?? true,
    discordOnReceived: current.discordOnReceived ?? true,
  });
  const [reportEnabled, setReportEnabled] = useState(current.discordReportEnabled ?? false);
  const [reportTime, setReportTime] = useState(current.discordReportTime || '08:00');
  const [botToken, setBotToken] = useState(current.discordBotToken || '');
  const [channelId, setChannelId] = useState(current.discordChannelId || '');
  const [botOnline, setBotOnline] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [botLoading, setBotLoading] = useState(false);
  const [botReportLoading, setBotReportLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings.botStatus().then(r => setBotOnline(r.online)).catch(() => { });
  }, []);

  const toggleEvt = (k: keyof typeof events) => setEvents(p => ({ ...p, [k]: !p[k] }));

  const eventList: { key: keyof typeof events; label: string; desc: string }[] = [
    { key: 'discordOnNewRequest', label: 'ใบขอซื้อใหม่', desc: 'เมื่อพนักงานสร้างใบขอซื้อ' },
    { key: 'discordOnPurchasing', label: 'ออก PR/PO', desc: 'เมื่อฝ่ายจัดซื้อออกเอกสาร PR/PO' },
    { key: 'discordOnAccounting', label: 'ส่งต่อบัญชี', desc: 'เมื่อส่งต่อให้ฝ่ายบัญชีโอนเงิน' },
    { key: 'discordOnTransferred', label: 'โอนเงินสำเร็จ', desc: 'เมื่อบัญชีบันทึกการโอนเงิน' },
    { key: 'discordOnRejected', label: 'ปฏิเสธคำขอ', desc: 'เมื่อใบขอซื้อถูกปฏิเสธ' },
    { key: 'discordOnReceived', label: 'รับสินค้าแล้ว', desc: 'เมื่อพนักงานกดยืนยันรับสินค้า' },
  ];

  const handleBotToggle = async () => {
    if (!botToken.trim() && !botOnline) return toast('กรุณากรอก Bot Token ก่อน', 'error');
    setBotLoading(true);
    try {
      if (botOnline) {
        await api.settings.botStop();
        setBotOnline(false);
        toast('ปิด Bot สำเร็จ');
      } else {
        // บันทึก token + channel ก่อนเสมอ แล้วค่อย start
        await api.settings.update({ discordBotToken: botToken, discordChannelId: channelId || null });
        await api.settings.botStart();
        setBotOnline(true);
        toast('เชื่อมต่อ Bot สำเร็จ');
      }
    } catch (e: any) { toast(e.message || 'เกิดข้อผิดพลาด — ตรวจสอบ Bot Token อีกครั้ง', 'error'); }
    finally { setBotLoading(false); }
  };

  const handleBotReport = async () => {
    setBotReportLoading(true);
    try {
      await api.settings.botReport();
      toast('ส่งรายงานพร้อมปุ่มไปยัง Discord สำเร็จ');
    } catch (e: any) { toast(e.message || 'ส่งไม่สำเร็จ', 'error'); }
    finally { setBotReportLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.settings.update({
        discordWebhook: webhook || null, ...events,
        discordReportEnabled: reportEnabled, discordReportTime: reportTime,
        discordBotToken: botToken || null, discordChannelId: channelId || null,
      });
      onSave(updated);
      toast('บันทึกการตั้งค่า Discord สำเร็จ');
    } catch (e: any) { toast(e.message || 'เกิดข้อผิดพลาด', 'error'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!webhook.trim()) return toast('กรุณากรอก Webhook URL ก่อน', 'error');
    setTesting(true);
    try {
      await api.settings.testDiscord(webhook);
      toast('ส่งข้อความทดสอบไปยัง Discord สำเร็จ');
    } catch (e: any) { toast(e.message || 'ส่งไม่สำเร็จ — ตรวจสอบ URL อีกครั้ง', 'error'); }
    finally { setTesting(false); }
  };

  const handleSendReport = async () => {
    if (!webhook.trim()) return toast('กรุณากรอก Webhook URL ก่อน', 'error');
    setSendingReport(true);
    try {
      await api.settings.sendReport();
      toast('ส่งรายงานสรุปไปยัง Discord สำเร็จ');
    } catch (e: any) { toast(e.message || 'ส่งไม่สำเร็จ', 'error'); }
    finally { setSendingReport(false); }
  };

  return (
    <div className="page-anim max-w-xl flex flex-col gap-5">
      {/* Webhook URL */}
      <Card title="Discord Webhook">
        <div className="p-5 flex flex-col gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Discord → ช่องที่ต้องการ → Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL</div>
            <Input label="Webhook URL *" value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
          </div>
          <button onClick={handleTest} disabled={testing || !webhook.trim()}
            className="self-start flex items-center gap-1.5 px-4 py-2 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50">
            {testing ? <RefreshCw size={12} className="animate-spin" /> : <MessageSquare size={12} />}
            ทดสอบส่งข้อความ
          </button>
        </div>
      </Card>

      {/* Event toggles */}
      <Card title="แจ้งเตือน Event">
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {eventList.map(ev => (
            <div key={ev.key} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{ev.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{ev.desc}</div>
              </div>
              <Toggle on={events[ev.key]} onToggle={() => toggleEvt(ev.key)} />
            </div>
          ))}
        </div>
      </Card>

      {/* Daily report */}
      <Card title="รายงานสรุปสำหรับหัวหน้า">
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">ส่งรายงานอัตโนมัติ</div>
              <div className="text-xs text-slate-400 mt-0.5">ยอดภาพรวม / สถานะ / ค้างดำเนินการ ส่งทุกวันตามเวลาที่กำหนด</div>
            </div>
            <Toggle on={reportEnabled} onToggle={() => setReportEnabled(p => !p)} />
          </div>
          {reportEnabled && (
            <div className="flex items-center gap-3 px-5 py-3.5">
              <div className="text-sm text-slate-600 dark:text-slate-300">ส่งทุกวันเวลา</div>
              <input type="time" value={reportTime} onChange={e => setReportTime(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20" />
              <span className="text-xs text-slate-400">น. (เวลาประเทศไทย)</span>
            </div>
          )}
          <div className="px-5 py-3.5">
            <button onClick={handleSendReport} disabled={sendingReport || !webhook.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50">
              {sendingReport ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
              ส่งรายงานตอนนี้เลย
            </button>
            <div className="text-xs text-slate-400 mt-1.5">ส่งยอดสรุป ณ ขณะนี้ไปยัง Discord ทันที</div>
          </div>
        </div>
      </Card>

      {/* Discord Bot */}
      <Card title="Discord Bot (Interactive)">
        <div className="p-5 flex flex-col gap-4">
          {/* Status */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${botOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {botOnline ? 'Bot ออนไลน์ — พร้อมรับคำสั่ง' : 'Bot ออฟไลน์'}
            </span>
            <button onClick={handleBotToggle} disabled={botLoading}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${botOnline ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100'}`}>
              {botLoading ? <RefreshCw size={11} className="animate-spin" /> : null}
              {botOnline ? 'ปิด Bot' : 'เปิด Bot'}
            </button>
          </div>

          {/* Token */}
          <div>
            <div className="text-xs text-slate-500 mb-1">
              วิธีสร้าง Bot: <span className="font-medium">discord.com/developers/applications</span> → New Application → Bot → Reset Token → Copy
            </div>
            <Input label="Bot Token *" value={botToken} onChange={e => setBotToken(e.target.value)}
              placeholder="MTxxxxxxxxxxxxxxxxxxxxxxxx.Xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              type="password" />
          </div>

          {/* Channel ID */}
          <div>
            <div className="text-xs text-slate-500 mb-1">วิธีดู Channel ID: Discord (Developer Mode) → คลิกขวาที่ช่อง → Copy Channel ID</div>
            <Input label="Channel ID *" value={channelId} onChange={e => setChannelId(e.target.value)}
              placeholder="1234567890123456789" />
          </div>

          {/* Permissions note */}
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5 border border-amber-100 dark:border-amber-800">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>Bot ต้องมีสิทธิ์ <strong>Send Messages</strong> และ <strong>Use Application Commands</strong> ในช่องนั้น รวมถึง Scopes: <strong>bot</strong></span>
          </div>

          {/* Send report with buttons */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
            <button onClick={handleBotReport} disabled={botReportLoading || !botOnline || !channelId.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
              {botReportLoading ? <RefreshCw size={12} className="animate-spin" /> : <MessageSquare size={12} />}
              ส่งรายงานพร้อมปุ่มไปยัง Discord
            </button>
            <div className="text-xs text-slate-400 mt-1.5">Bot จะส่ง embed พร้อมปุ่ม รีเฟรช / รายการค้าง / เกินกำหนด</div>
          </div>
        </div>
      </Card>

      <button onClick={handleSave} disabled={saving}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <RefreshCw size={14} className="animate-spin" /> : <MessageSquare size={14} />}
        บันทึกการตั้งค่า
      </button>
    </div>
  );
}

// SITE SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════
function SiteSettingsPage({ current, onSave, toast }: {
  current: SiteSettings;
  onSave: (s: SiteSettings) => void;
  toast: (m: string, t?: Toast['type']) => void;
}) {
  const [siteName, setSiteName] = useState(current.siteName);
  const [siteSubtitle, setSiteSubtitle] = useState(current.siteSubtitle);
  const [logoUrl, setLogoUrl] = useState(current.logoUrl || '');
  const [logoName, setLogoName] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const res = await api.settings.testEmail();
      toast(`ส่งอีเมลทดสอบไปที่ ${res.sentTo} สำเร็จ ✓`, 'success');
    } catch (err: any) { toast(err.message || 'ส่งอีเมลไม่สำเร็จ', 'error'); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (!siteName.trim()) return toast('กรุณากรอกชื่อเว็บไซต์', 'error');
    setSaving(true);
    try {
      const updated = await api.settings.update({ siteName: siteName.trim(), siteSubtitle: siteSubtitle.trim(), logoUrl: logoUrl || null });
      onSave(updated);
      toast('บันทึกการตั้งค่าสำเร็จ');
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setSiteName(current.siteName);
    setSiteSubtitle(current.siteSubtitle);
    setLogoUrl(current.logoUrl || '');
    setLogoName('');
  };

  const previewLogo = logoUrl.startsWith('/api/files/') ? logoUrl : (logoUrl || null);

  return (
    <div className="page-anim max-w-xl flex flex-col gap-5">
      <Card title="ตั้งค่าเว็บไซต์">
        <div className="p-5 flex flex-col gap-5">

          {/* Preview */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            {previewLogo ? (
              <img
                src={previewLogo.startsWith('/api/') ? previewLogo : previewLogo}
                alt="logo preview"
                className="w-14 h-14 object-contain rounded-xl bg-white dark:bg-slate-700 p-1 border border-slate-200 dark:border-slate-600"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                <Shield size={24} className="text-blue-500" />
              </div>
            )}
            <div>
              <div className="font-bold text-slate-800 dark:text-white text-base">{siteName || 'ชื่อเว็บไซต์'}</div>
              <div className="text-xs text-slate-400 mt-0.5">{siteSubtitle || 'คำอธิบาย'}</div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">โลโก้</label>
            <FileUploadField
              label=""
              fileName={logoName}
              onFile={(name, url) => { setLogoName(name); setLogoUrl(url); }}
              onError={msg => toast(msg, 'error')}
            />
            {logoUrl && !logoName && (
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>โลโก้ปัจจุบัน: ใช้งานอยู่</span>
                <button onClick={() => setLogoUrl('')} className="text-red-400 hover:text-red-600">ลบโลโก้</button>
              </div>
            )}
          </div>

          <Input label="ชื่อเว็บไซต์ / ชื่อร้าน *" value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="เช่น Casa Lapin" />
          <Input label="คำอธิบายใต้ชื่อ" value={siteSubtitle} onChange={e => setSiteSubtitle(e.target.value)} placeholder="เช่น ระบบขอซื้อสินค้า" />

          {current.updatedByName && (
            <div className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700">
              แก้ไขล่าสุดโดย <span className="font-medium text-slate-600 dark:text-slate-300">{current.updatedByName}</span>
              {current.updatedAt && <span> · {new Date(current.updatedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              บันทึกการตั้งค่า
            </button>
            <button onClick={handleReset} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              รีเซ็ต
            </button>
          </div>
        </div>
      </Card>

      {/* Test Email Card */}
      <Card title="ทดสอบระบบอีเมล">
        <div className="p-5 flex flex-col gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            กดปุ่มด้านล่างเพื่อส่งอีเมลทดสอบไปยัง email ของ account ที่ login อยู่
          </p>
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <AlertCircle size={14} className="shrink-0 text-amber-500" />
            ต้องอัปเดต Email ใน User Management ให้เป็นอีเมลจริงก่อน ระบบจึงจะส่งได้ถูกต้อง
          </div>
          <button onClick={handleTestEmail} disabled={testing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm w-fit">
            {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {testing ? 'กำลังส่ง...' : 'ส่งอีเมลทดสอบ'}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ siteName: 'Casa Lapin', siteSubtitle: 'ระบบขอซื้อสินค้า', logoUrl: null });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // โหลด settings ตั้งแต่เริ่ม (ก่อน login) เพื่อให้หน้า login แสดง branding ที่ถูกต้อง
  useEffect(() => {
    api.settings.get().then(s => { setSiteSettings(s); setSettingsLoaded(true); }).catch(() => setSettingsLoaded(true));
  }, []);

  // อัปเดต favicon + title ทุกครั้งที่ settings เปลี่ยน
  useEffect(() => {
    document.title = `${siteSettings.siteName} — ${siteSettings.siteSubtitle}`;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) favicon.href = siteSettings.logoUrl || '/favicon.png';
  }, [siteSettings.siteName, siteSettings.siteSubtitle, siteSettings.logoUrl]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modal states
  const [viewReq, setViewReq] = useState<PurchaseRequest | null>(null);
  const [issuePRReq, setIssuePRReq] = useState<PurchaseRequest | null>(null);
  const [rejectReq, setRejectReq] = useState<PurchaseRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [forwardReq, setForwardReq] = useState<PurchaseRequest | null>(null);
  const [recordPayReq, setRecordPayReq] = useState<PurchaseRequest | null>(null);
  const [editReq, setEditReq] = useState<PurchaseRequest | null>(null);
  const [receiveReq, setReceiveReq] = useState<PurchaseRequest | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);
  const [editUserTarget, setEditUserTarget] = useState<User | null | undefined>(undefined);

  // Inline modal form fields
  const [prFile, setPrFile] = useState('');
  const [prFileUrl, setPrFileUrl] = useState('');
  const [poFile, setPoFile] = useState('');
  const [poFileUrl, setPoFileUrl] = useState('');
  const [prNotes, setPrNotes] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [transferDate, setTransferDate] = useState(today());
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSlip, setTransferSlip] = useState('');
  const [transferSlipUrl, setTransferSlipUrl] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Auto-login: ถ้ามี token ใน localStorage ให้ดึง user และเข้าระบบอัตโนมัติ
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.auth.me()
      .then(user => {
        setCurrentUser(user);
        const defaults: Partial<Record<Role, Page>> = { owner: 'dashboard', employee: 'my-requests', purchasing: 'pending-approval', accounting: 'payment-list', itsupport: 'dashboard' };
        setPage(defaults[user.role as Role] || 'dashboard');
      })
      .catch(() => localStorage.removeItem('token'));
  }, []);

  // Fetch data เมื่อ login สำเร็จ
  useEffect(() => {
    if (!currentUser) { setRequests([]); setUsers([]); setAuditLogs([]); return; }
    api.settings.get().then(setSiteSettings).catch(console.error);
    const fetchReq = ['owner', 'purchasing', 'accounting', 'itsupport'].includes(currentUser.role)
      ? api.requests.listAll()
      : api.requests.list();
    fetchReq.then(setRequests).catch(console.error);
    if (currentUser.role === 'itsupport') {
      api.users.list().then(setUsers).catch(console.error);
      api.audit.list().then(setAuditLogs).catch(console.error);
    } else if (currentUser.role === 'owner') {
      api.audit.list().then(setAuditLogs).catch(console.error);
    }
  }, [currentUser?.id]);

  // Polling ทุก 30 วินาที — ดึง requests ใหม่อัตโนมัติ
  useEffect(() => {
    if (!currentUser) return;
    const poll = () => {
      const fetchReq = ['owner', 'purchasing', 'accounting', 'itsupport'].includes(currentUser.role)
        ? api.requests.listAll()
        : api.requests.list();
      fetchReq.then(setRequests).catch(console.error);
    };
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [currentUser?.id]);

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const addAudit = useCallback((action: string, module: string, detail: string) => {
    api.audit.log({ action, module, detail }).catch(console.error);
  }, []);

  const navigate = useCallback((p: Page) => {
    setIsLoading(true);
    setTimeout(() => { setPage(p); setIsLoading(false); }, 400);
  }, []);

  const handleLogin = (u: User) => {
    setCurrentUser(u);
    addAudit('LOGIN', 'Auth', 'เข้าสู่ระบบสำเร็จ');
    const defaults: Partial<Record<Role, Page>> = { owner: 'dashboard', employee: 'my-requests', purchasing: 'pending-approval', accounting: 'payment-list', itsupport: 'dashboard' };
    setPage(defaults[u.role] || 'dashboard');
  };

  const handleLogout = () => {
    addAudit('LOGOUT', 'Auth', 'ออกจากระบบ');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setPage('dashboard');
  };

  const handleCreateRequest = async (data: Omit<PurchaseRequest, 'id' | 'reqNo' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newReq = await api.requests.create(data);
      setRequests(r => [...r, newReq]);
      addAudit('CREATE', 'Purchase Request', `สร้างใบขอซื้อ ${newReq.reqNo}`);
      toast(`สร้างใบขอซื้อ ${newReq.reqNo} สำเร็จ`);
      setPage('my-requests');
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  const handleIssuePRPO = async (id: string, prf: string, pof: string, notes: string, isDraft = false) => {
    try {
      const existing = requests.find(x => x.id === id);
      const n = requests.filter(x => x.prNo).length + 1;
      const prNo = existing?.prNo || `PR-${String(n).padStart(3, '0')}`;
      const poNo = existing?.poNo || `PO-${String(n).padStart(3, '0')}`;
      const payload: any = { status: 'purchasing', prNo, poNo, notes };
      if (prf) payload.prFile = prf;
      if (pof) payload.poFile = pof;
      const updated = await api.requests.updateStatus(id, payload);
      setRequests(r => r.map(x => x.id === id ? updated : x));
      if (isDraft) {
        addAudit('UPDATE', 'Purchase Request', `บันทึกร่าง PR/PO ${prNo}`);
        toast('บันทึกแบบร่างแล้ว — แนบเอกสารให้ครบก่อนส่งต่อบัญชี', 'warning');
      } else {
        addAudit('UPDATE', 'Purchase Request', `แนบเอกสาร PR/PO ${prNo}/${poNo}`);
        toast('แนบเอกสาร PR/PO ครบแล้ว');
      }
      setIssuePRReq(null); setPrFile(''); setPrFileUrl(''); setPoFile(''); setPoFileUrl(''); setPrNotes('');
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  const handleReject = async (id: string, notes: string) => {
    try {
      const updated = await api.requests.updateStatus(id, { status: 'rejected', notes: notes || undefined });
      setRequests(r => r.map(x => x.id === id ? updated : x));
      addAudit('REJECT', 'Purchase Request', `ปฏิเสธคำขอ${notes ? `: ${notes}` : ''}`);
      toast('ปฏิเสธคำขอแล้ว', 'info');
      setRejectReq(null);
      setRejectNotes('');
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  const handleForward = async (r: PurchaseRequest) => {
    try {
      const updated = await api.requests.updateStatus(r.id, { status: 'accounting' });
      setRequests(prev => prev.map(x => x.id === r.id ? updated : x));
      addAudit('UPDATE', 'Purchase Request', `ส่งต่อบัญชี ${r.reqNo}`);
      toast('ส่งต่อฝ่ายบัญชีสำเร็จ');
      setForwardReq(null);
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  const handleTransfer = async (id: string, ref: string, date: string, notes: string, fileUrl?: string) => {
    try {
      const updated = await api.requests.updateStatus(id, { status: 'transferred', transferRef: ref, transferDate: date, notes, ...(fileUrl ? { transferFile: fileUrl } : {}) });
      setRequests(r => r.map(x => x.id === id ? updated : x));
      addAudit('UPDATE', 'Payment', `บันทึกการโอนเงิน ${ref}`);
      toast(`บันทึกการโอนเงิน ${ref} สำเร็จ`);
      setRecordPayReq(null); setTransferRef(''); setTransferNotes(''); setTransferSlip(''); setTransferSlipUrl('');
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  const handleDeleteUser = async (u: User) => {
    try {
      await api.users.delete(u.id);
      setUsers(list => list.filter(x => x.id !== u.id));
      addAudit('DELETE', 'User Management', `ลบผู้ใช้ ${u.username}`);
      toast(`ลบผู้ใช้ ${u.name} แล้ว`, 'info');
      setDeleteUserTarget(null);
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  const handleSaveUser = async (data: Partial<User>) => {
    try {
      if (editUserTarget) {
        const updated = await api.users.update(editUserTarget.id, data);
        setUsers(list => list.map(u => u.id === editUserTarget.id ? updated : u));
        addAudit('UPDATE', 'User Management', `แก้ไขผู้ใช้ ${editUserTarget.username}`);
        toast('บันทึกการแก้ไขสำเร็จ');
      } else {
        const newU = await api.users.create(data);
        setUsers(list => [...list, newU]);
        addAudit('CREATE', 'User Management', `เพิ่มผู้ใช้ ${newU.username}`);
        toast(`เพิ่มผู้ใช้ ${newU.name} สำเร็จ`);
      }
      setEditUserTarget(undefined);
      setPage('user-management');
    } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  if (!settingsLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return (
    <>
      <LoginPage onLogin={handleLogin} siteSettings={siteSettings} />
      <ToastContainer toasts={toasts} remove={id => setToasts(t => t.filter(x => x.id !== id))} />
    </>
  );

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage requests={requests} />;
      case 'my-requests': return <MyRequestsPage requests={requests} user={currentUser} onView={setViewReq} onEdit={setEditReq} onReceive={setReceiveReq} />;
      case 'create-request': return <CreateRequestPage user={currentUser} onSave={handleCreateRequest} toast={toast} />;
      case 'pending-approval': return <PendingApprovalPage requests={requests} onIssuePRPO={r => { setIssuePRReq(r); setPrFile(''); setPrFileUrl(''); setPoFile(''); setPoFileUrl(''); }} onReject={setRejectReq} onView={setViewReq} />;
      case 'issue-pr-po': return <IssuePRPOPage requests={requests} onIssue={handleIssuePRPO} toast={toast} />;
      case 'forward-accounting': return <ForwardAccountingPage requests={requests} onForward={r => setForwardReq(r)} onAddFile={r => { setIssuePRReq(r); setPrFile(''); setPrFileUrl(''); setPoFile(''); setPoFileUrl(''); setPrNotes(''); }} />;
      case 'payment-list': return <PaymentListPage requests={requests} onRecord={r => { setRecordPayReq(r); setTransferDate(today()); }} />;
      case 'record-payment': return <RecordPaymentPage requests={requests} onTransfer={handleTransfer} toast={toast} />;
      case 'payment-history': return <PaymentHistoryPage requests={requests} />;
      case 'user-management': return <UserManagementPage users={users} onAdd={() => { setEditUserTarget(null); setPage('add-user'); }} onEdit={u => { setEditUserTarget(u); setPage('add-user'); }} onDelete={setDeleteUserTarget} onReset={setResetPwUser} />;
      case 'add-user': return <AddUserPage editUser={editUserTarget} onSave={handleSaveUser} />;
      case 'audit-log': return <AuditLogPage logs={auditLogs} />;
      case 'site-settings': return <SiteSettingsPage current={siteSettings} onSave={setSiteSettings} toast={toast} />;
      case 'discord-settings': return <DiscordSettingsPage current={siteSettings} onSave={setSiteSettings} toast={toast} />;
      case 'all-requests': return <AllRequestsPage requests={requests} />;
      case 'reports': return <ReportsPage requests={requests} />;
      case 'tracking': return <TrackingPage requests={requests} user={currentUser} onView={setViewReq} />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''} bg-slate-50 dark:bg-slate-950`}>
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}
      <Sidebar user={currentUser} page={page} setPage={navigate} collapsed={collapsed} dark={dark} toggleDark={() => setDark(!dark)} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} siteSettings={siteSettings} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar page={page} user={currentUser} requests={requests} onLogout={handleLogout} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto p-5 sm:p-6">
          {isLoading ? <SkeletonPage page={page} /> : renderPage()}
        </main>
      </div>

      <PageLoader loading={isLoading} />
      <ToastContainer toasts={toasts} remove={id => setToasts(t => t.filter(x => x.id !== id))} />

      {/* Request Detail Modal */}
      <RequestDetailModal req={viewReq} onClose={() => setViewReq(null)} />

      {/* Issue PR/PO Modal */}
      <Modal open={!!issuePRReq} title="แนบเอกสาร PR / PO" onClose={() => setIssuePRReq(null)}
        footer={
          <div className="flex flex-col gap-2">
            {/* status indicator */}
            <div className="flex gap-3 text-xs mb-1">
              <span className={`flex items-center gap-1 font-medium ${(prFileUrl || issuePRReq?.prFile) ? 'text-green-600' : 'text-slate-400'}`}>
                {(prFileUrl || issuePRReq?.prFile) ? <CheckCircle size={12} /> : <Clock size={12} />} PR
              </span>
              <span className={`flex items-center gap-1 font-medium ${(poFileUrl || issuePRReq?.poFile) ? 'text-green-600' : 'text-slate-400'}`}>
                {(poFileUrl || issuePRReq?.poFile) ? <CheckCircle size={12} /> : <Clock size={12} />} PO
              </span>
              {(prFileUrl || issuePRReq?.prFile) && (poFileUrl || issuePRReq?.poFile)
                ? <span className="text-green-600 font-semibold">ครบแล้ว ✓</span>
                : <span className="text-amber-500">ยังไม่ครบ — บันทึกแบบร่างได้</span>}
            </div>
            <div className="flex gap-2">
              {/* บันทึกแบบร่าง — ต้องมีอย่างน้อย 1 ไฟล์ */}
              <button
                onClick={() => {
                  if (!prFileUrl && !poFileUrl && !issuePRReq?.prFile && !issuePRReq?.poFile)
                    return toast('กรุณาแนบเอกสารอย่างน้อย 1 ไฟล์', 'error');
                  handleIssuePRPO(issuePRReq!.id, prFileUrl, poFileUrl, prNotes, true);
                }}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl py-2 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                บันทึกแบบร่าง
              </button>
              {/* บันทึกครบ — ต้องมีทั้ง 2 ไฟล์ */}
              <button
                disabled={!(prFileUrl || issuePRReq?.prFile) || !(poFileUrl || issuePRReq?.poFile)}
                onClick={() => handleIssuePRPO(issuePRReq!.id, prFileUrl || issuePRReq?.prFile || '', poFileUrl || issuePRReq?.poFile || '', prNotes)}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                บันทึกครบ ✓
              </button>
            </div>
            <button onClick={() => setIssuePRReq(null)} className="text-xs text-slate-400 hover:text-slate-600 text-center py-1">ยกเลิก</button>
          </div>
        }>
        {issuePRReq && (
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
              <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{issuePRReq.title}</div>
              <div className="mt-1">฿<span className="font-bold text-blue-600">{fmt(issuePRReq.totalAmount)}</span> · {issuePRReq.createdByName}</div>
            </div>
            <FileUploadField
              label={`เอกสาร PR ${issuePRReq.prFile ? '(มีไฟล์แล้ว — อัปโหลดใหม่เพื่อแทนที่)' : '*'}`}
              fileName={prFile}
              onFile={(name, url) => { setPrFile(name); setPrFileUrl(url); }}
              onError={msg => toast(msg, 'error')} />
            <FileUploadField
              label={`เอกสาร PO ${issuePRReq.poFile ? '(มีไฟล์แล้ว — อัปโหลดใหม่เพื่อแทนที่)' : '*'}`}
              fileName={poFile}
              onFile={(name, url) => { setPoFile(name); setPoFileUrl(url); }}
              onError={msg => toast(msg, 'error')} />
            <Textarea label="หมายเหตุ" value={prNotes} onChange={e => setPrNotes(e.target.value)} rows={2} />
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectReq} title="ปฏิเสธคำขอ" onClose={() => { setRejectReq(null); setRejectNotes(''); }}
        footer={
          <div className="flex gap-3">
            <button onClick={() => rejectReq && handleReject(rejectReq.id, rejectNotes)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2 text-sm font-semibold transition-colors">
              ยืนยันปฏิเสธ
            </button>
            <button onClick={() => { setRejectReq(null); setRejectNotes(''); }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              ยกเลิก
            </button>
          </div>
        }>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{rejectReq?.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">การปฏิเสธนี้ไม่สามารถยกเลิกได้</div>
            </div>
          </div>
          <Textarea label="หมายเหตุการปฏิเสธ" value={rejectNotes} onChange={e => setRejectNotes(e.target.value)}
            rows={3} placeholder="ระบุเหตุผลการปฏิเสธ..." />
        </div>
      </Modal>

      {/* Forward Confirm */}
      <ConfirmDialog open={!!forwardReq} title="ส่งต่อฝ่ายบัญชี"
        message={`ยืนยันการส่งต่อ "${forwardReq?.title}" ไปยังฝ่ายบัญชี?`}
        onConfirm={() => forwardReq && handleForward(forwardReq)}
        onCancel={() => setForwardReq(null)} confirmLabel="ส่งต่อ"
        confirmClass="bg-purple-600 hover:bg-purple-700 text-white" />

      {/* Record Payment Modal */}
      <Modal open={!!recordPayReq} title="บันทึกการโอนเงิน" onClose={() => setRecordPayReq(null)}
        footer={
          <div className="flex gap-3">
            <button onClick={() => { if (!transferRef) { toast('กรุณากรอก Ref.', 'error'); return; } handleTransfer(recordPayReq!.id, transferRef, transferDate, transferNotes, transferSlipUrl); }} className="flex-1 bg-green-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-700 transition-colors">ยืนยันการโอน</button>
            <button onClick={() => setRecordPayReq(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">ยกเลิก</button>
          </div>
        }>
        {recordPayReq && (
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-xs border border-slate-100 dark:border-slate-700">
              <div className="font-semibold text-slate-700 dark:text-slate-200">{recordPayReq.title}</div>
              <div className="mt-0.5 text-blue-600 font-bold">฿{fmt(recordPayReq.totalAmount)}</div>
            </div>
            <Input label="เลขอ้างอิงการโอน *" value={transferRef} onChange={e => setTransferRef(e.target.value)} placeholder="TRF-010" />
            <Input label="วันที่โอน" type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} />
            <Textarea label="หมายเหตุ" value={transferNotes} onChange={e => setTransferNotes(e.target.value)} rows={2} />
            <FileUploadField label="แนบสลิปการโอน" fileName={transferSlip} onFile={(name, url) => { setTransferSlip(name); setTransferSlipUrl(url); }} onError={msg => toast(msg, 'error')} />
          </div>
        )}
      </Modal>

      {/* Receive Goods Modal */}
      {receiveReq && <ReceiveGoodsModal req={receiveReq} onClose={() => setReceiveReq(null)}
        onSaved={updated => { setRequests(r => r.map(x => x.id === updated.id ? updated : x)); setReceiveReq(null); toast('บันทึกการรับสินค้าสำเร็จ'); }}
        toast={toast} />}

      {/* Edit Request Modal */}
      {editReq && <EditRequestModal req={editReq} onClose={() => setEditReq(null)}
        onSaved={updated => { setRequests(r => r.map(x => x.id === updated.id ? updated : x)); setEditReq(null); toast('บันทึกการแก้ไขสำเร็จ'); }}
        toast={toast} />}

      {/* Delete User Confirm */}
      <ConfirmDialog open={!!deleteUserTarget} title="ลบผู้ใช้"
        message={`ยืนยันการลบผู้ใช้ "${deleteUserTarget?.name}" ? การกระทำนี้ไม่สามารถยกเลิกได้`}
        onConfirm={() => deleteUserTarget && handleDeleteUser(deleteUserTarget)}
        onCancel={() => setDeleteUserTarget(null)} confirmLabel="ลบผู้ใช้" />

      {/* Reset Password Confirm */}
      <ConfirmDialog open={!!resetPwUser} title="Reset Password"
        message={`ยืนยัน Reset Password ของ "${resetPwUser?.name}" ? รหัสผ่านใหม่จะเป็น "1234"`}
        onConfirm={async () => {
          if (!resetPwUser) return;
          try {
            await api.users.resetPassword(resetPwUser.id);
            addAudit('UPDATE', 'User Management', `Reset password ของ ${resetPwUser.username}`);
            toast(`Reset Password ของ ${resetPwUser.name} แล้ว (รหัสใหม่: 1234)`, 'warning');
            setResetPwUser(null);
          } catch (err: any) { toast(err.message || 'เกิดข้อผิดพลาด', 'error'); }
        }}
        onCancel={() => setResetPwUser(null)} confirmLabel="Reset"
        confirmClass="bg-amber-500 hover:bg-amber-600 text-white" />
    </div>
  );
}
