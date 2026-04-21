# CLAUDE.md — ระบบขอซื้อ (Purchase Request System)

ระบบจัดการใบขอซื้อสำหรับร้านอาหาร/ธุรกิจขนาดเล็ก
มี 5 roles, workflow อนุมัติ 3 ขั้น, ข้อมูลอยู่ใน React state (ไม่มี backend)

---

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 (ผ่าน `@tailwindcss/vite`)
- Lucide React (icons)
- ไม่มี router library — routing ทำด้วย `useState<Page>` ใน `App.tsx:1407`
- ไม่มี backend / database — state อยู่ใน memory, seed จาก `data.ts`

---

## โครงสร้างไฟล์

```
C:\tmp\
├── server.js                  # Node HTTP server เสิร์ฟ dist/ บน port 3456
└── prs\app\
    ├── src\
    │   ├── main.tsx           # React entry point
    │   ├── App.tsx            # ไฟล์เดียวที่มี components ทั้งหมด (~1600 บรรทัด)
    │   ├── data.ts            # Types, constants, mock data ทั้งหมด
    │   ├── index.css          # Global styles + Tailwind imports
    │   └── App.css            # Animation keyframes (toast, modal)
    ├── public\
    │   ├── favicon.svg
    │   └── icons.svg
    ├── dist\                  # Build output — เปิดได้เลยโดยไม่ต้อง server
    ├── vite.config.ts         # Build: inline ทุกอย่างเป็นไฟล์เดียว (no code splitting)
    └── package.json
```

---

## Roles และสิทธิ์

| Role | ชื่อไทย | เมนูที่เข้าถึงได้ |
|------|---------|------------------|
| `owner` | ผู้ประกอบการ | Dashboard, AllRequests, Reports |
| `employee` | พนักงาน | Dashboard, MyRequests, CreateRequest |
| `purchasing` | ฝ่ายจัดซื้อ | Dashboard, PendingApproval, IssuePRPO, ForwardAccounting |
| `accounting` | บัญชี | Dashboard, PaymentList, RecordPayment, PaymentHistory |
| `itsupport` | IT Support | Dashboard, UserManagement, AddUser, AuditLog |

Mock users (password ทุกคนคือ `1234`):
- `owner` / `employee` / `purchasing` / `accounting` / `itsupport` / `emp2`

---

## Workflow ใบขอซื้อ

```
Employee: สร้างใบขอซื้อ
    ↓
[pending] — รอฝ่ายจัดซื้อ
    ↓ Purchasing: PendingApprovalPage → IssuePRPOPage (ออก PR/PO)
[purchasing] — รอฝ่ายบัญชี
    ↓ Purchasing: ForwardAccountingPage
[accounting] — รอโอนเงิน
    ↓ Accounting: RecordPaymentPage (บันทึก Transfer Ref)
[transferred] — เสร็จสิ้น

(ปฏิเสธได้ทุกขั้น → [rejected])
```

---

## สารบัญ `data.ts`

| Export | ประเภท | เนื้อหา |
|--------|--------|---------|
| `Role` | type | `'owner' \| 'employee' \| 'purchasing' \| 'accounting' \| 'itsupport'` |
| `User` | interface | id, username, password, name, email, role, active, createdAt |
| `PurchaseRequest` | interface | ใบขอซื้อ — items[], status, prNo, poNo, transferRef ฯลฯ |
| `AuditLog` | interface | userId, action, module, detail, timestamp, ip |
| `USERS` | User[] | Mock users 6 คน |
| `INITIAL_REQUESTS` | PurchaseRequest[] | Mock ใบขอซื้อ 10 ใบ (ครบทุก status) |
| `INITIAL_AUDIT` | AuditLog[] | Mock log 7 รายการ |
| `ROLE_LABELS/COLORS` | Record | Label + Tailwind class ตาม role |
| `STATUS_LABELS/COLORS` | Record | Label + Tailwind class ตาม status |
| `CATEGORIES` | string[] | `['ผัก','เนื้อ','หมู','ไก่','ซอส','เครื่องดื่ม','เบ็ดเตล็ด']` |

---

## สารบัญ `App.tsx` — ตามบรรทัด

### Shared UI Components
| บรรทัด | ชื่อ | หน้าที่ |
|--------|------|---------|
| 17 | Types | `Toast`, `Page` (union of all page names) |
| 27 | Utils | `fmt(n)` format ตัวเลข TH, `today()` ISO date |
| 32 | `ToastContainer` | Notification stack มุมขวาบน (auto-dismiss 4s) |
| 54 | `Modal` | Popup กลางจอ รองรับ header/body/footer |
| 73 | `ConfirmDialog` | Dialog ถามยืนยัน (ใช้ก่อน delete/reject) |
| 99 | `StatusBadge` | Badge สี + label ตาม PurchaseRequest.status |
| 102 | `RoleBadge` | Badge สี + label ตาม User.role |
| 107 | `Input` | Input field + label wrapper |
| 115 | `Sel` | Select dropdown + label wrapper |
| 123 | `Textarea` | Textarea + label wrapper |
| 133 | `StatCard` | กล่องสถิติ (icon + label + value + gradient) |
| 143 | `BarChart` | กราฟแท่ง SVG (ไม่ใช้ library) |
| 159 | `PieChart` | กราฟวงกลม SVG + legend |
| 193 | `Table` | ตาราง responsive พร้อม sticky header |
| 209 | `Card` | Section wrapper พร้อม title + action slot |
| 224 | `SearchBar` | Input ค้นหา + clear button |
| 236 | `FileUploadField` | Simulate file upload (เก็บแค่ชื่อไฟล์) |

### Layout Components
| บรรทัด | ชื่อ | หน้าที่ |
|--------|------|---------|
| 371 | `Sidebar` | เมนูซ้าย — collapsible, mobile drawer, dark mode toggle |
| 435 | `Topbar` | แถบบน — page title, notification bell, user avatar |

### Pages
| บรรทัด | Page name | Role | หน้าที่ |
|--------|-----------|------|---------|
| 266 | `LoginPage` | ทุกคน | Login form, เลือก user จาก mock list |
| 527 | `DashboardPage` | ทุกคน | สรุป stat cards ตาม role |
| 580 | `MyRequestsPage` | employee | รายการใบขอซื้อของตัวเอง + filter status |
| 684 | `CreateRequestPage` | employee | ฟอร์มสร้างใบขอซื้อ + dynamic item rows |
| 914 | `PendingApprovalPage` | purchasing | คิวใบ pending รอ approve หรือ reject |
| 961 | `IssuePRPOPage` | purchasing | ออกเลข PR/PO + แนบไฟล์ |
| 1014 | `ForwardAccountingPage` | purchasing | ส่งใบที่ issue แล้วไปบัญชี |
| 1039 | `PaymentListPage` | accounting | รายการใบรอบันทึกการโอน |
| 1065 | `RecordPaymentPage` | accounting | บันทึก transferRef + transferDate |
| 1108 | `PaymentHistoryPage` | accounting | ประวัติการโอนทั้งหมด |
| 1141 | `AllRequestsPage` | owner | ดูใบขอซื้อทั้งหมด + filter/search |
| 1180 | `UserManagementPage` | itsupport | ตาราง users + edit/delete/reset password |
| 1229 | `AddUserPage` | itsupport | ฟอร์มเพิ่ม/แก้ไข user |
| 1265 | `AuditLogPage` | itsupport | ตาราง audit log ทั้งหมด |
| 1294 | `ReportsPage` | owner | รายงานสรุป + BarChart + PieChart |
| 1345 | `TrackingPage` | **ทุกคน** | ติดตามสถานะแบบ timeline 4 ขั้น (employee เห็นเฉพาะของตัวเอง) |
| ~1475 | `RequestDetailModal` | ทุกคน | Modal แสดงรายละเอียดใบขอซื้อครบ |

### Root App Component
| บรรทัด | ชื่อ | หน้าที่ |
|--------|------|---------|
| 1405 | `App` (default export) | State กลางทั้งหมด: currentUser, page, requests, users, auditLogs, toasts, modal states |

---

## State กลางใน `App` (บรรทัด 1405)

```typescript
currentUser: User | null        // ผู้ใช้ที่ login อยู่
page: Page                      // หน้าปัจจุบัน (routing)
requests: PurchaseRequest[]     // ใบขอซื้อทั้งหมด
users: User[]                   // รายชื่อผู้ใช้ทั้งหมด
auditLogs: AuditLog[]           // log ทั้งหมด
toasts: Toast[]                 // notification queue
dark: boolean                   // dark mode (persist localStorage)
collapsed: boolean              // sidebar collapsed state
// modal states: viewReq, issuePRReq, rejectReq, forwardReq, recordPayReq, ...
```

---

## Commands

```bash
cd prs/app
npm run dev        # dev server (Vite HMR)
npm run build      # build → dist/
npm run preview    # preview build

# เสิร์ฟ build ด้วย server.js
node ../../server.js   # port 3456
```

---

## หมายเหตุสำหรับ Agent

- **ไม่มี backend** — ข้อมูลทั้งหมดเป็น React state, รีเฟรชหน้าจะ reset ทุกอย่าง
- **ไม่มี router** — เปลี่ยนหน้าด้วย `setPage(...)` เท่านั้น
- **component ทั้งหมดอยู่ใน `App.tsx` ไฟล์เดียว** — ถ้าจะเพิ่ม component ใหม่ใส่ก่อน `export default function App()`
- **Tailwind v4** — ไม่มี `tailwind.config.js`, config อยู่ใน CSS (`@theme`) และ `vite.config.ts`
- **Build inline** — `vite.config.ts` ตั้งค่า `inlineDynamicImports: true` ทำให้ build ออกมาเป็นไฟล์ JS เดียว เหมาะสำหรับแจกจ่ายเป็น single HTML file
