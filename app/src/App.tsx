import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, FileText, CreditCard, Users, LogOut,
  Bell, Search, X, ChevronRight, Plus, Trash2, Edit2, Eye,
  CheckCircle, XCircle, Clock, DollarSign, AlertCircle,
  Upload, Moon, Sun, ChevronDown, Activity,
  Shield, KeyRound, UserPlus, BarChart2,
  FileCheck, Send, Banknote, History, RefreshCw, Menu, Package
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
  | 'all-requests' | 'reports' | 'tracking';

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

// ─── File Upload Field ────────────────────────────────────────────────────────
function FileUploadField({ label, fileName, onFile }: { label: string; fileName: string; onFile: (name: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>}
      <div onClick={() => ref.current?.click()}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none
          ${fileName ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-slate-800'}`}>
        <input ref={ref} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f.name); e.target.value = ''; }} />
        {fileName ? (
          <>
            <FileCheck size={15} className="text-blue-500 shrink-0" />
            <span className="text-sm text-blue-700 dark:text-blue-300 truncate flex-1">{fileName}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onFile(''); }}
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

// ═══════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════
function LoginPage({ onLogin }: { onLogin: (u: User) => void }) {
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
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900">
            <ShoppingCart size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">ระบบขอซื้อสินค้า</h1>
          <p className="text-slate-400 text-sm mt-1">Purchase Request System</p>
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
  { id: 'issue-pr-po', label: 'ออก PR / PO', icon: FileCheck, roles: ['purchasing'] },
  { id: 'forward-accounting', label: 'ส่งต่อบัญชี', icon: Send, roles: ['purchasing'] },
  { id: 'payment-list', label: 'รายการรอโอนเงิน', icon: Banknote, roles: ['accounting', 'itsupport'] },
  { id: 'record-payment', label: 'บันทึกการโอนเงิน', icon: CreditCard, roles: ['accounting'] },
  { id: 'payment-history', label: 'ประวัติการโอน', icon: History, roles: ['accounting', 'itsupport'] },
  { id: 'user-management', label: 'จัดการผู้ใช้', icon: Users, roles: ['itsupport'] },
  { id: 'add-user', label: 'เพิ่มผู้ใช้ใหม่', icon: UserPlus, roles: ['itsupport'] },
  { id: 'audit-log', label: 'Audit Log', icon: Activity, roles: ['itsupport'] },
];

function Sidebar({ user, page, setPage, collapsed, dark, toggleDark, mobileOpen, setMobileOpen }: {
  user: User; page: Page; setPage: (p: Page) => void; collapsed: boolean; dark: boolean; toggleDark: () => void; mobileOpen: boolean; setMobileOpen: (v: boolean) => void;
}) {
  const items = MENU.filter(m => m.roles.includes(user.role));
  return (
    <aside className={`fixed md:relative z-40 h-screen flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-transform md:transition-all duration-200 shrink-0 w-64 ${collapsed ? 'md:w-14' : 'md:w-56'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-3 py-4 border-b border-slate-100 dark:border-slate-800 ${collapsed ? 'justify-center' : 'px-4'}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <ShoppingCart size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-800 dark:text-white leading-tight">PR System</div>
            <div className="text-[10px] text-slate-400">ระบบขอซื้อสินค้า</div>
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
    'pending-approval': 'รายการรออนุมัติ', 'issue-pr-po': 'ออก PR / PO', 'forward-accounting': 'ส่งต่อบัญชี',
    'payment-list': 'รายการรอโอนเงิน', 'record-payment': 'บันทึกการโอนเงิน', 'payment-history': 'ประวัติการโอน',
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

function MyRequestsPage({ requests, user, onView }: { requests: PurchaseRequest[]; user: User; onView: (r: PurchaseRequest) => void }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const mine = requests.filter(r => r.createdBy === user.id)
    .filter(r => (r.title.toLowerCase().includes(search.toLowerCase()) || r.reqNo.includes(search)) && (!filterStatus || r.status === filterStatus));

  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] max-w-xs"><SearchBar value={search} onChange={setSearch} /></div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {/* Mobile card list */}
      <div className="sm:hidden flex flex-col gap-2">
        {mine.length === 0
          ? <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-12 text-center text-slate-400 text-sm">ไม่พบข้อมูล</div>
          : mine.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] font-mono text-slate-400">{r.reqNo}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{r.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{r.createdAt} · <span className="font-semibold text-slate-600 dark:text-slate-300">฿{fmt(r.totalAmount)}</span></div>
              </div>
              <button onClick={() => onView(r)} className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors shrink-0"><Eye size={16} /></button>
            </div>
          ))
        }
      </div>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <Card>
          <Table headers={['เลขที่', 'รายการ', 'จำนวนเงิน', 'สถานะ', 'วันที่', '']} rows={
            mine.length === 0
              ? <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">ไม่พบข้อมูล</td></tr>
              : mine.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{r.reqNo}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[180px] truncate">{r.title}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">฿{fmt(r.totalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.createdAt}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onView(r)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"><Eye size={14} /></button>
                  </td>
                </tr>
              ))
          } />
        </Card>
      </div>
    </div>
  );
}

// ── Checkbox group (multi-select pills) ────────────────────────────────────
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
  const [categories, setCategories] = useState<string[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierName2, setSupplierName2] = useState('');
  const [items, setItems] = useState([{ code: '', name: '', qty: 1, unit: 'กก.', price: 0, itemNote: '' }]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentTiming, setPaymentTiming] = useState('');
  const [orderDate, setOrderDate] = useState(today());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState(user.name);
  const [signedDate, setSignedDate] = useState(today());

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const updateItem = (i: number, f: string, v: string | number) =>
    setItems(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x));

  const handleReset = () => {
    setCategories([]); setSupplierName(''); setSupplierName2('');
    setItems([{ code: '', name: '', qty: 1, unit: 'กก.', price: 0, itemNote: '' }]);
    setPaymentMethod(''); setPaymentTiming('');
    setOrderDate(today()); setDeliveryDate(''); setDueDate('');
    setNotes(''); setContactName(user.name); setSignedDate(today());
  };

  const handleSubmit = () => {
    if (categories.length === 0) return toast('กรุณาเลือกประเภทสินค้าอย่างน้อย 1 ประเภท', 'error');
    if (!supplierName.trim()) return toast('กรุณากรอกชื่อ Supplier', 'error');
    if (items.some(i => !i.name.trim())) return toast('กรุณากรอกชื่อสินค้าทุกรายการ', 'error');
    if (total <= 0) return toast('ยอดรวมต้องมากกว่า 0', 'error');
    if (!paymentMethod) return toast('กรุณาเลือกช่องทางการชำระเงิน', 'error');
    onSave({
      title: `สั่งซื้อ${categories.join('/')} - ${supplierName}`,
      category: categories[0] || '', categories, supplierName, supplierName2,
      items, totalAmount: total, reason: notes,
      paymentMethod: paymentMethod as any, paymentTiming: paymentTiming as any,
      orderDate, deliveryDate, dueDate, contactName, signedDate,
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

          {/* ประเภท checkboxes */}
          <div>
            <SLabel t="ประเภท : ผัก / เนื้อ หมู ไก่ / ซอส / เครื่องดื่ม / อื่นๆ *" />
            <CheckboxGroup options={CATEGORIES} selected={categories} onChange={setCategories} />
          </div>

          {/* Supplier */}
          <div className="grid grid-cols-1 gap-4">
            <Input label="ชื่อ (Supplier Name) *" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="ชื่อผู้จำหน่าย" />
          </div>

          {/* ตารางรายการ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SLabel t="ตารางรายการสินค้า *" />
              <button onClick={() => setItems(p => [...p, { code: '', name: '', qty: 1, unit: 'หน่วย', price: 0, itemNote: '' }])}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                <Plus size={12} />เพิ่มรายการ
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
              {/* Desktop: grid table */}
              <div className="hidden sm:block">
                {/* Header */}
                <div className="grid bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wide"
                  style={{ gridTemplateColumns: '80px 1fr 64px 80px 100px 1fr 36px' }}>
                  {['Code','รายการ','จำนวน','หน่วย','ราคา','หมายเหตุ',''].map((h, i) => (
                    <div key={i} className={`px-2 py-2 ${i < 6 ? 'border-r border-slate-200 dark:border-slate-700' : ''} ${i >= 2 && i <= 4 ? 'text-center' : ''}`}>{h}</div>
                  ))}
                </div>
                {/* Rows */}
                <div className="divide-y divide-slate-50 dark:divide-slate-800/80">
                  {items.map((item, i) => (
                    <div key={i} className="grid items-stretch" style={{ gridTemplateColumns: '80px 1fr 64px 80px 100px 1fr 36px' }}>
                      {[
                        <input key="code" value={item.code} onChange={e => updateItem(i,'code',e.target.value)} placeholder="C..."
                          className="w-full h-full px-2 py-2 text-xs bg-transparent outline-none text-slate-600 dark:text-slate-300 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="name" value={item.name} onChange={e => updateItem(i,'name',e.target.value)} placeholder="ชื่อสินค้า"
                          className="w-full h-full px-2 py-2 text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="qty" type="number" value={item.qty} onChange={e => updateItem(i,'qty',+e.target.value)} min={1}
                          className="w-full h-full px-2 py-2 text-sm text-center bg-transparent outline-none text-slate-700 dark:text-slate-200 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="unit" value={item.unit} onChange={e => updateItem(i,'unit',e.target.value)} placeholder="หน่วย"
                          className="w-full h-full px-2 py-2 text-xs text-center bg-transparent outline-none text-slate-600 dark:text-slate-300 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="price" type="number" value={item.price || ''} onChange={e => updateItem(i,'price',+e.target.value)} placeholder="0"
                          className="w-full h-full px-2 py-2 text-sm text-right bg-transparent outline-none text-slate-700 dark:text-slate-200 focus:bg-blue-50 dark:focus:bg-blue-900/20" />,
                        <input key="note" value={item.itemNote} onChange={e => updateItem(i,'itemNote',e.target.value)} placeholder="-"
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

              {/* Mobile: card per item */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, i) => (
                  <div key={i} className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <input value={item.name} onChange={e => updateItem(i,'name',e.target.value)} placeholder="ชื่อสินค้า *"
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
                        <input value={item.code} onChange={e => updateItem(i,'code',e.target.value)} placeholder="C..."
                          className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-400 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400">จำนวน</span>
                        <input type="number" value={item.qty} onChange={e => updateItem(i,'qty',+e.target.value)} min={1}
                          className="px-2 py-1.5 text-sm text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 dark:text-slate-200" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400">หน่วย</span>
                        <input value={item.unit} onChange={e => updateItem(i,'unit',e.target.value)} placeholder="หน่วย"
                          className="px-2 py-1.5 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-400 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400">ราคา</span>
                        <input type="number" value={item.price || ''} onChange={e => updateItem(i,'price',+e.target.value)} placeholder="0"
                          className="px-2 py-1.5 text-sm text-right rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 dark:text-slate-200" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Footer */}
              <div className="flex justify-end items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-bold">ยอดรวมทั้งสิ้น:</span>
                <span className="text-lg font-bold text-blue-600">฿{fmt(total)}</span>
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
                { val: 'transfer', label: 'โอนหน้าร้าน' },
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
            <Input label="วันที่ต้องชำระ" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
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

function PendingApprovalPage({ requests, onIssuePRPO, onReject }: { requests: PurchaseRequest[]; onIssuePRPO: (r: PurchaseRequest) => void; onReject: (r: PurchaseRequest) => void }) {
  const [search, setSearch] = useState('');
  const pending = requests.filter(r => r.status === 'pending' && r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="max-w-xs"><SearchBar value={search} onChange={setSearch} placeholder="ค้นหาคำขอ..." /></div>
      {pending.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-16 text-center">
          <CheckCircle size={36} className="mx-auto text-green-400 mb-3" />
          <p className="text-slate-400 text-sm">ไม่มีรายการรออนุมัติ</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
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
                </div>
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
      )}
    </div>
  );
}

function IssuePRPOPage({ requests, onIssue, toast }: { requests: PurchaseRequest[]; onIssue: (id: string, prFile: string, poFile: string, notes: string) => void; toast: (m: string, t?: Toast['type']) => void }) {
  const avail = requests.filter(r => r.status === 'pending');
  const [selId, setSelId] = useState('');
  const [prFile, setPrFile] = useState('');
  const [poFile, setPoFile] = useState('');
  const [notes, setNotes] = useState('');
  const sel = avail.find(r => r.id === selId);

  const handle = () => {
    if (!selId) return toast('กรุณาเลือกใบขอซื้อ', 'error');
    if (!prFile) return toast('กรุณาแนบเอกสาร PR', 'error');
    if (!poFile) return toast('กรุณาแนบเอกสาร PO', 'error');
    onIssue(selId, prFile, poFile, notes);
    setSelId(''); setPrFile(''); setPoFile(''); setNotes('');
  };

  return (
    <div className="page-anim max-w-xl">
      <Card title="แนบเอกสาร PR / PO">
        <div className="p-5 flex flex-col gap-4">
          <Sel label="เลือกใบขอซื้อ" value={selId} onChange={e => setSelId(e.target.value)}>
            <option value="">-- เลือกรายการที่ต้องการ --</option>
            {avail.map(r => <option key={r.id} value={r.id}>{r.reqNo} — {r.title}</option>)}
          </Sel>

          {sel && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-xs space-y-1.5 border border-slate-100 dark:border-slate-700">
              <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{sel.title}</div>
              <div className="text-slate-500">ผู้ขอ: {sel.createdByName} · {sel.category}</div>
              <div className="text-slate-500">จำนวนเงิน: <span className="font-bold text-blue-600 text-sm">฿{fmt(sel.totalAmount)}</span></div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FileUploadField label="เอกสาร PR *" fileName={prFile} onFile={setPrFile} />
            <FileUploadField label="เอกสาร PO *" fileName={poFile} onFile={setPoFile} />
          </div>
          <Textarea label="หมายเหตุ" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="หมายเหตุเพิ่มเติม..." />

          <div className="flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span>เมื่อแนบเอกสารแล้ว สถานะจะเปลี่ยนเป็น "รอฝ่ายบัญชี" โดยอัตโนมัติ</span>
          </div>

          <button onClick={handle} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
            <FileCheck size={15} />ยืนยันและส่งต่อบัญชี
          </button>
        </div>
      </Card>
    </div>
  );
}

function ForwardAccountingPage({ requests, onForward }: { requests: PurchaseRequest[]; onForward: (r: PurchaseRequest) => void }) {
  const ready = requests.filter(r => r.status === 'purchasing');
  return (
    <div className="page-anim flex flex-col gap-4">
      {ready.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-16 text-center">
          <CheckCircle size={36} className="mx-auto text-green-400 mb-3" />
          <p className="text-slate-400 text-sm">ไม่มีรายการรอส่งต่อบัญชี</p>
        </div>
      ) : ready.map(r => (
        <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5"><span className="text-xs font-mono text-slate-400">{r.reqNo}</span><StatusBadge status={r.status} /></div>
            <div className="font-semibold text-slate-800 dark:text-white text-sm truncate">{r.title}</div>
            <div className="text-xs text-slate-400 mt-1">PR: <span className="font-mono">{r.prNo}</span> · PO: <span className="font-mono">{r.poNo}</span> · <span className="font-semibold text-slate-600 dark:text-slate-300">฿{fmt(r.totalAmount)}</span></div>
          </div>
          <button onClick={() => onForward(r)} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 transition-colors shrink-0">
            <Send size={13} />ส่งต่อบัญชี
          </button>
        </div>
      ))}
    </div>
  );
}

function PaymentListPage({ requests, onRecord }: { requests: PurchaseRequest[]; onRecord: (r: PurchaseRequest) => void }) {
  const waiting = requests.filter(r => r.status === 'accounting');
  return (
    <div className="page-anim flex flex-col gap-4">
      {waiting.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-16 text-center">
          <CheckCircle size={36} className="mx-auto text-green-400 mb-3" />
          <p className="text-slate-400 text-sm">ไม่มีรายการรอโอนเงิน</p>
        </div>
      ) : waiting.map(r => (
        <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5"><span className="text-xs font-mono text-slate-400">{r.reqNo}</span><StatusBadge status={r.status} /></div>
            <div className="font-semibold text-slate-800 dark:text-white text-sm truncate">{r.title}</div>
            <div className="text-xs text-slate-400 mt-1">PR: <span className="font-mono">{r.prNo}</span> · PO: <span className="font-mono">{r.poNo}</span></div>
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

function RecordPaymentPage({ requests, onTransfer, toast }: { requests: PurchaseRequest[]; onTransfer: (id: string, ref: string, date: string, notes: string) => void; toast: (m: string, t?: Toast['type']) => void }) {
  const avail = requests.filter(r => r.status === 'accounting');
  const [selId, setSelId] = useState('');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState('');

  const handle = () => {
    if (!selId) return toast('กรุณาเลือกรายการ', 'error');
    if (!ref.trim()) return toast('กรุณากรอกเลขอ้างอิงการโอน', 'error');
    onTransfer(selId, ref, date, notes);
    setSelId(''); setRef(''); setNotes(''); setFile('');
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
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">แนบสลิปการโอน</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors w-fit">
              <Upload size={13} />เลือกไฟล์สลิป
              <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0]?.name || '')} />
            </label>
            {file && <span className="text-xs text-slate-400">{file}</span>}
          </div>
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
  const done = requests.filter(r => r.status === 'transferred' && (r.title.toLowerCase().includes(search.toLowerCase()) || (r.transferRef || '').includes(search)));
  const totalAmt = done.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="flex items-center gap-3 justify-between">
        <div className="max-w-xs flex-1"><SearchBar value={search} onChange={setSearch} /></div>
        <div className="text-xs text-slate-500 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 px-3 py-2 rounded-xl">
          ยอดรวม: <span className="font-bold text-green-600">฿{fmt(totalAmt)}</span>
        </div>
      </div>
      <Card>
        <Table headers={['เลขที่', 'รายการ', 'จำนวนเงิน', 'Ref. โอน', 'วันที่โอน', 'สถานะ']} rows={
          done.length === 0
            ? <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">ไม่พบข้อมูล</td></tr>
            : done.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-3 text-xs font-mono text-slate-400">{r.reqNo}</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 max-w-[160px] truncate">{r.title}</td>
                <td className="px-4 py-3 text-sm font-semibold text-green-600">฿{fmt(r.totalAmount)}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-500">{r.transferRef || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{r.transferDate || '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))
        } />
      </Card>
    </div>
  );
}

function AllRequestsPage({ requests }: { requests: PurchaseRequest[] }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const filtered = requests.filter(r =>
    (r.title.toLowerCase().includes(search.toLowerCase()) || r.reqNo.includes(search)) &&
    (!filterStatus || r.status === filterStatus)
  );
  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] max-w-xs"><SearchBar value={search} onChange={setSearch} /></div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white outline-none">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} รายการ</span>
      </div>
      <Card>
        <Table headers={['เลขที่', 'รายการ', 'ผู้ขอ', 'หมวด', 'จำนวนเงิน', 'สถานะ', 'วันที่']} rows={
          filtered.length === 0
            ? <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">ไม่พบข้อมูล</td></tr>
            : filtered.map(r => (
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
  const filtered = logs.filter(l => l.userName.includes(search) || l.action.includes(search) || l.detail.toLowerCase().includes(search.toLowerCase()));
  const actionColor: Record<string, string> = {
    LOGIN: 'bg-blue-100 text-blue-700', CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-amber-100 text-amber-700', DELETE: 'bg-red-100 text-red-700',
    REJECT: 'bg-red-100 text-red-700', LOGOUT: 'bg-slate-100 text-slate-500',
  };
  return (
    <div className="page-anim flex flex-col gap-4">
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="ค้นหาใน audit log..." /></div>
      <Card>
        <Table headers={['เวลา', 'ผู้ใช้', 'Action', 'Module', 'รายละเอียด', 'IP']} rows={
          filtered.map(l => (
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
      </Card>
    </div>
  );
}

function ReportsPage({ requests }: { requests: PurchaseRequest[] }) {
  const total = requests.reduce((s, r) => s + r.totalAmount, 0);
  const transferred = requests.filter(r => r.status === 'transferred').reduce((s, r) => s + r.totalAmount, 0);
  const inProgress = requests.filter(r => r.status !== 'transferred' && r.status !== 'rejected').reduce((s, r) => s + r.totalAmount, 0);
  const catData = CATEGORIES.map(cat => ({ label: cat, value: requests.filter(r => r.category === cat).reduce((s, r) => s + r.totalAmount, 0) })).filter(d => d.value > 0);

  return (
    <div className="page-anim flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="งบประมาณรวมทั้งหมด" value={`฿${fmt(total)}`} icon={DollarSign} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600" />
        <StatCard label="โอนเงินสำเร็จ" value={`฿${fmt(transferred)}`} icon={CheckCircle} color="bg-green-100 dark:bg-green-900/30 text-green-600" />
        <StatCard label="อยู่ระหว่างดำเนินการ" value={`฿${fmt(inProgress)}`} icon={Clock} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="งบประมาณตามหมวดหมู่">
          <div className="px-5 pb-5 pt-2"><PieChart data={catData} /></div>
        </Card>
        <Card title="สรุปสถานะคำขอ">
          <div className="p-5">
            {Object.entries(STATUS_LABELS).map(([k]) => {
              const count = requests.filter(r => r.status === k).length;
              const pct = total ? Math.round(requests.filter(r => r.status === k).reduce((s, r) => s + r.totalAmount, 0) / total * 100) : 0;
              return (
                <div key={k} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <div className="flex items-center gap-2.5"><StatusBadge status={k} /><span className="text-xs text-slate-500">{count} รายการ</span></div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                    <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <Card title="สรุปตามหมวดหมู่">
        <Table headers={['หมวดหมู่', 'จำนวนคำขอ', 'ยอดรวม', 'สัดส่วน']} rows={
          catData.map((d, i) => (
            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{d.label}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{requests.filter(r => r.category === d.label).length} รายการ</td>
              <td className="px-4 py-3 text-sm font-semibold text-blue-600">฿{fmt(d.value)}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{total ? Math.round(d.value / total * 100) : 0}%</td>
            </tr>
          ))
        } />
      </Card>
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

  type StepState = 'done' | 'current' | 'pending' | 'rejected';

  const getSteps = (r: PurchaseRequest): { label: string; sub: string; state: StepState }[] => {
    const s = r.status;
    return [
      {
        label: 'สร้างคำขอ',
        sub: r.createdAt,
        state: 'done',
      },
      {
        label: 'ฝ่ายจัดซื้อ',
        sub: s === 'pending' ? 'รอดำเนินการ' : s === 'rejected' ? 'ปฏิเสธแล้ว' : r.updatedAt,
        state: s === 'pending' ? 'current' : s === 'rejected' ? 'rejected' : 'done',
      },
      {
        label: 'ออก PR/PO',
        sub: ['accounting', 'transferred'].includes(s) ? (r.prNo || r.updatedAt) : s === 'purchasing' ? 'กำลังดำเนินการ' : '—',
        state: s === 'rejected' || s === 'pending' ? 'pending' : s === 'purchasing' ? 'current' : 'done',
      },
      {
        label: 'โอนเงิน',
        sub: s === 'transferred' ? (r.transferDate || r.updatedAt) : s === 'accounting' ? 'รอโอนเงิน' : '—',
        state: s === 'transferred' ? 'done' : s === 'accounting' ? 'current' : 'pending',
      },
    ];
  };

  const lineColor = (state: StepState) =>
    state === 'done' ? 'bg-green-400' :
    state === 'rejected' ? 'bg-red-300 dark:bg-red-800' :
    'bg-slate-200 dark:bg-slate-700';

  const circleClass = (state: StepState) =>
    state === 'done' ? 'bg-green-500 border-green-500' :
    state === 'current' ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/40' :
    state === 'rejected' ? 'bg-red-500 border-red-500' :
    'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

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

  const allCounts = (['pending', 'purchasing', 'accounting', 'transferred', 'rejected'] as const).map(k => ({
    key: k,
    count: requests.filter(r => (user.role === 'employee' ? r.createdBy === user.id : true) && r.status === k).length,
  })).filter(s => s.count > 0);

  return (
    <div className="page-anim flex flex-col gap-4">
      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2 items-center">
        {allCounts.map(s => (
          <button key={s.key}
            onClick={() => setFilterStatus(filterStatus === s.key ? '' : s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 transition-all hover:shadow-sm ${filterStatus === s.key ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
            <StatusBadge status={s.key} />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{s.count}</span>
          </button>
        ))}
        {filterStatus && (
          <button onClick={() => setFilterStatus('')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors">
            <X size={11} />ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาเลขที่ / รายการ..." />
        </div>
        <span className="text-xs text-slate-400">{visible.length} รายการ</span>
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 py-16 text-center text-slate-400 text-sm">
          ไม่พบรายการ
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(r => {
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
                    <div className="text-xs text-slate-400 mt-0.5">
                      {r.createdByName} · <span className="font-semibold text-slate-600 dark:text-slate-300">฿{fmt(r.totalAmount)}</span>
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
                            {step.state === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
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
  const steps: { label: string; sub: string; state: StepState }[] = [
    { label: 'สร้างคำขอ', sub: req.createdAt, state: 'done' },
    {
      label: 'ฝ่ายจัดซื้อ',
      sub: s === 'pending' ? 'รอดำเนินการ' : s === 'rejected' ? 'ปฏิเสธแล้ว' : req.updatedAt,
      state: s === 'pending' ? 'current' : s === 'rejected' ? 'rejected' : 'done',
    },
    {
      label: 'ออก PR/PO',
      sub: ['accounting', 'transferred'].includes(s) ? (req.prNo || req.updatedAt) : s === 'purchasing' ? 'กำลังดำเนินการ' : '—',
      state: s === 'rejected' || s === 'pending' ? 'pending' : s === 'purchasing' ? 'current' : 'done',
    },
    {
      label: 'โอนเงิน',
      sub: s === 'transferred' ? (req.transferDate || req.updatedAt) : s === 'accounting' ? 'รอโอนเงิน' : '—',
      state: s === 'transferred' ? 'done' : s === 'accounting' ? 'current' : 'pending',
    },
  ];
  const lineColor = (st: StepState) =>
    st === 'done' ? 'bg-green-400' : st === 'rejected' ? 'bg-red-300 dark:bg-red-800' : 'bg-slate-200 dark:bg-slate-700';
  const circleClass = (st: StepState) =>
    st === 'done' ? 'bg-green-500 border-green-500' :
    st === 'current' ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/40' :
    st === 'rejected' ? 'bg-red-500 border-red-500' :
    'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
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
                      {step.state === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
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
            {req.items.map((it, i) => (
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
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
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
  const [forwardReq, setForwardReq] = useState<PurchaseRequest | null>(null);
  const [recordPayReq, setRecordPayReq] = useState<PurchaseRequest | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);
  const [editUserTarget, setEditUserTarget] = useState<User | null | undefined>(undefined);

  // Inline modal form fields
  const [prFile, setPrFile] = useState('');
  const [poFile, setPoFile] = useState('');
  const [prNotes, setPrNotes] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [transferDate, setTransferDate] = useState(today());
  const [transferNotes, setTransferNotes] = useState('');

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
    api.requests.list().then(setRequests).catch(console.error);
    if (currentUser.role === 'itsupport') {
      api.users.list().then(setUsers).catch(console.error);
      api.audit.list().then(setAuditLogs).catch(console.error);
    } else if (currentUser.role === 'owner') {
      api.audit.list().then(setAuditLogs).catch(console.error);
    }
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

  const handleCreateRequest = (data: Omit<PurchaseRequest, 'id' | 'reqNo' | 'createdAt' | 'updatedAt'>) => {
    const newReq: PurchaseRequest = { ...data, id: `r${Date.now()}`, reqNo: `PR-2025-${String(requests.length + 1).padStart(3, '0')}`, createdAt: today(), updatedAt: today() };
    setRequests(r => [...r, newReq]);
    addAudit('CREATE', 'Purchase Request', `สร้างใบขอซื้อ ${newReq.reqNo}`);
    toast(`สร้างใบขอซื้อ ${newReq.reqNo} สำเร็จ`);
    setPage('my-requests');
  };

  const handleIssuePRPO = (id: string, prf: string, pof: string, notes: string) => {
    const n = requests.filter(x => x.prNo).length + 1;
    const prNo = `PR-${String(n).padStart(3, '0')}`;
    const poNo = `PO-${String(n).padStart(3, '0')}`;
    setRequests(r => r.map(x => x.id === id ? { ...x, status: 'purchasing', prNo, poNo, prFile: prf, poFile: pof, notes, updatedAt: today() } : x));
    addAudit('UPDATE', 'Purchase Request', `แนบเอกสาร PR/PO ${prNo}/${poNo}`);
    toast('แนบเอกสาร PR/PO สำเร็จ พร้อมส่งต่อฝ่ายบัญชี');
    setIssuePRReq(null); setPrFile(''); setPoFile(''); setPrNotes('');
  };

  const handleReject = (id: string) => {
    setRequests(r => r.map(x => x.id === id ? { ...x, status: 'rejected', notes: 'ปฏิเสธโดยฝ่ายจัดซื้อ', updatedAt: today() } : x));
    addAudit('REJECT', 'Purchase Request', `ปฏิเสธคำขอ`);
    toast('ปฏิเสธคำขอแล้ว', 'info');
    setRejectReq(null);
  };

  const handleForward = (r: PurchaseRequest) => {
    setRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'accounting', updatedAt: today() } : x));
    addAudit('UPDATE', 'Purchase Request', `ส่งต่อบัญชี ${r.reqNo}`);
    toast('ส่งต่อฝ่ายบัญชีสำเร็จ');
    setForwardReq(null);
  };

  const handleTransfer = (id: string, ref: string, date: string, notes: string) => {
    setRequests(r => r.map(x => x.id === id ? { ...x, status: 'transferred', transferRef: ref, transferDate: date, notes, updatedAt: today() } : x));
    addAudit('UPDATE', 'Payment', `บันทึกการโอนเงิน ${ref}`);
    toast(`บันทึกการโอนเงิน ${ref} สำเร็จ`);
    setRecordPayReq(null); setTransferRef(''); setTransferNotes('');
  };

  const handleDeleteUser = (u: User) => {
    setUsers(list => list.filter(x => x.id !== u.id));
    addAudit('DELETE', 'User Management', `ลบผู้ใช้ ${u.username}`);
    toast(`ลบผู้ใช้ ${u.name} แล้ว`, 'info');
    setDeleteUserTarget(null);
  };

  const handleSaveUser = (data: Partial<User>) => {
    if (editUserTarget) {
      setUsers(list => list.map(u => u.id === editUserTarget.id ? { ...u, ...data } : u));
      addAudit('UPDATE', 'User Management', `แก้ไขผู้ใช้ ${editUserTarget.username}`);
      toast('บันทึกการแก้ไขสำเร็จ');
    } else {
      const newU: User = { id: `u${Date.now()}`, username: data.username!, password: data.password || '1234', name: data.name!, email: data.email!, role: data.role!, active: data.active ?? true, createdAt: today() };
      setUsers(list => [...list, newU]);
      addAudit('CREATE', 'User Management', `เพิ่มผู้ใช้ ${newU.username}`);
      toast(`เพิ่มผู้ใช้ ${newU.name} สำเร็จ`);
    }
    setEditUserTarget(undefined);
    setPage('user-management');
  };

  if (!currentUser) return (
    <>
      <LoginPage onLogin={handleLogin} />
      <ToastContainer toasts={toasts} remove={id => setToasts(t => t.filter(x => x.id !== id))} />
    </>
  );

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage requests={requests} />;
      case 'my-requests': return <MyRequestsPage requests={requests} user={currentUser} onView={setViewReq} />;
      case 'create-request': return <CreateRequestPage user={currentUser} onSave={handleCreateRequest} toast={toast} />;
      case 'pending-approval': return <PendingApprovalPage requests={requests} onIssuePRPO={r => { setIssuePRReq(r); setPrFile(''); setPoFile(''); }} onReject={setRejectReq} />;
      case 'issue-pr-po': return <IssuePRPOPage requests={requests} onIssue={handleIssuePRPO} toast={toast} />;
      case 'forward-accounting': return <ForwardAccountingPage requests={requests} onForward={r => setForwardReq(r)} />;
      case 'payment-list': return <PaymentListPage requests={requests} onRecord={r => { setRecordPayReq(r); setTransferDate(today()); }} />;
      case 'record-payment': return <RecordPaymentPage requests={requests} onTransfer={handleTransfer} toast={toast} />;
      case 'payment-history': return <PaymentHistoryPage requests={requests} />;
      case 'user-management': return <UserManagementPage users={users} onAdd={() => { setEditUserTarget(null); setPage('add-user'); }} onEdit={u => { setEditUserTarget(u); setPage('add-user'); }} onDelete={setDeleteUserTarget} onReset={setResetPwUser} />;
      case 'add-user': return <AddUserPage editUser={editUserTarget} onSave={handleSaveUser} />;
      case 'audit-log': return <AuditLogPage logs={auditLogs} />;
      case 'all-requests': return <AllRequestsPage requests={requests} />;
      case 'reports': return <ReportsPage requests={requests} />;
      case 'tracking': return <TrackingPage requests={requests} user={currentUser} onView={setViewReq} />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''} bg-slate-50 dark:bg-slate-950`}>
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}
      <Sidebar user={currentUser} page={page} setPage={navigate} collapsed={collapsed} dark={dark} toggleDark={() => setDark(!dark)} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar page={page} user={currentUser} requests={requests} onLogout={handleLogout} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className={`flex-1 overflow-y-auto p-5 sm:p-6 transition-opacity duration-200 ${isLoading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {renderPage()}
        </main>
      </div>

      <PageLoader loading={isLoading} />
      <ToastContainer toasts={toasts} remove={id => setToasts(t => t.filter(x => x.id !== id))} />

      {/* Request Detail Modal */}
      <RequestDetailModal req={viewReq} onClose={() => setViewReq(null)} />

      {/* Issue PR/PO Modal */}
      <Modal open={!!issuePRReq} title="แนบเอกสาร PR / PO" onClose={() => setIssuePRReq(null)}
        footer={
          <div className="flex gap-3">
            <button onClick={() => { if (!prFile) { toast('กรุณาแนบเอกสาร PR', 'error'); return; } if (!poFile) { toast('กรุณาแนบเอกสาร PO', 'error'); return; } handleIssuePRPO(issuePRReq!.id, prFile, poFile, prNotes); }} className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-blue-700 transition-colors">ยืนยันและส่งต่อบัญชี</button>
            <button onClick={() => setIssuePRReq(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">ยกเลิก</button>
          </div>
        }>
        {issuePRReq && (
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
              <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{issuePRReq.title}</div>
              <div className="mt-1">฿<span className="font-bold text-blue-600">{fmt(issuePRReq.totalAmount)}</span> · {issuePRReq.createdByName}</div>
            </div>
            <FileUploadField label="เอกสาร PR *" fileName={prFile} onFile={setPrFile} />
            <FileUploadField label="เอกสาร PO *" fileName={poFile} onFile={setPoFile} />
            <Textarea label="หมายเหตุ" value={prNotes} onChange={e => setPrNotes(e.target.value)} rows={2} />
          </div>
        )}
      </Modal>

      {/* Reject Confirm */}
      <ConfirmDialog open={!!rejectReq} title="ปฏิเสธคำขอ"
        message={`ยืนยันการปฏิเสธ "${rejectReq?.title}" ? การกระทำนี้ไม่สามารถยกเลิกได้`}
        onConfirm={() => rejectReq && handleReject(rejectReq.id)}
        onCancel={() => setRejectReq(null)} confirmLabel="ปฏิเสธ" />

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
            <button onClick={() => { if (!transferRef) { toast('กรุณากรอก Ref.', 'error'); return; } handleTransfer(recordPayReq!.id, transferRef, transferDate, transferNotes); }} className="flex-1 bg-green-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-green-700 transition-colors">ยืนยันการโอน</button>
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
          </div>
        )}
      </Modal>

      {/* Delete User Confirm */}
      <ConfirmDialog open={!!deleteUserTarget} title="ลบผู้ใช้"
        message={`ยืนยันการลบผู้ใช้ "${deleteUserTarget?.name}" ? การกระทำนี้ไม่สามารถยกเลิกได้`}
        onConfirm={() => deleteUserTarget && handleDeleteUser(deleteUserTarget)}
        onCancel={() => setDeleteUserTarget(null)} confirmLabel="ลบผู้ใช้" />

      {/* Reset Password Confirm */}
      <ConfirmDialog open={!!resetPwUser} title="Reset Password"
        message={`ยืนยัน Reset Password ของ "${resetPwUser?.name}" ? รหัสผ่านใหม่จะเป็น "1234"`}
        onConfirm={() => {
          if (!resetPwUser) return;
          setUsers(list => list.map(u => u.id === resetPwUser.id ? { ...u, password: '1234' } : u));
          addAudit('UPDATE', 'User Management', `Reset password ของ ${resetPwUser.username}`);
          toast(`Reset Password ของ ${resetPwUser.name} แล้ว (รหัสใหม่: 1234)`, 'warning');
          setResetPwUser(null);
        }}
        onCancel={() => setResetPwUser(null)} confirmLabel="Reset"
        confirmClass="bg-amber-500 hover:bg-amber-600 text-white" />
    </div>
  );
}
