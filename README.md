# Casa Lapin — ระบบขอซื้อสินค้า (Purchase Request System)

ระบบจัดการใบขอซื้อสำหรับร้านอาหาร Casa Lapin รองรับ 5 บทบาท มี workflow อนุมัติ 3 ขั้นตอน ระบบแนบไฟล์จริง และ tracking สถานะแบบ real-time

---

## สถานะการพัฒนา (Development Progress)

> **ปัจจุบันอยู่ระหว่าง Phase 6–7 — Email notifications ครบทุก workflow แล้ว**

| Phase | ชื่อ | สถานะ | หมายเหตุ |
|-------|------|--------|---------|
| **0** | Setup & Infrastructure | ✅ เสร็จ | |
| **1** | Authentication | ✅ เสร็จ | |
| **2** | Dashboard | 🟡 บางส่วน | ยังไม่มีกราฟใน Dashboard (มีเฉพาะในหน้า Reports) |
| **3** | Employee Pages | ✅ เสร็จ | |
| **4** | Purchasing Pages | ✅ เสร็จ | |
| **5** | Accounting Pages | 🟡 บางส่วน | ขาด Export CSV, sort dueDate, filter วันที่ |
| **6** | Tracking Page | 🟡 บางส่วน | ขาด Real-time polling/SSE |
| **7** | IT Support Pages | 🟡 บางส่วน | ขาด Export PDF/Excel ในรายงาน |
| **8** | PDF Generation | ⬜ ยังไม่ทำ | |
| **9** | Testing & QA | ⬜ ยังไม่ทำ | |
| **10** | Deploy & Go Live | ⬜ ยังไม่ทำ | |

---

## รายละเอียดแต่ละ Phase

### ✅ Phase 0 — Setup & Infrastructure
- โครงสร้าง Monorepo (frontend + backend แยก folder)
- Docker Compose: MySQL 8.0 + Node.js backend + phpMyAdmin
- Database schema ด้วย Prisma ORM (User, PurchaseRequest, PurchaseItem, AuditLog, Settings)
- Environment config (.env)
- Git repository + .gitignore

---

### ✅ Phase 1 — Authentication
- หน้า Login พร้อม demo account shortcuts
- JWT login / logout จริง (8 ชั่วโมง)
- bcrypt password hash
- Role-based middleware guard ทุก API endpoint
- Auto-login จาก token ใน localStorage
- Redirect ไปหน้า Login เมื่อ session หมดอายุ

---

### 🟡 Phase 2 — Dashboard
- ✅ Stat cards ดึงข้อมูลจาก DB จริง (จำนวนคำขอ, ยอดรวม, สถานะ)
- ✅ Filter ตาม role อัตโนมัติ
- ✅ ตารางคำขอล่าสุด 10 รายการ (เรียงตาม updatedAt)
- ⬜ กราฟ Bar/Pie ใน Dashboard (มีเฉพาะในหน้า Reports แยกต่างหาก)

---

### ✅ Phase 3 — Employee Pages
**หน้าสร้างใบขอซื้อ**
- Form submit → บันทึก DB จริง
- Auto-generate เลขใบขอซื้อ (PR-2568-001)
- Toast notification เมื่อสำเร็จ

**หน้าคำขอของฉัน**
- ดึงเฉพาะ request ของ user นั้นจาก DB
- Filter ตามสถานะ
- กดดูรายละเอียดเปิด modal พร้อม timeline

---

### ✅ Phase 4 — Purchasing Pages
**หน้ารออนุมัติ**
- List pending requests จาก DB
- ปุ่ม Approve / Reject พร้อมบันทึก audit log

**หน้าออก PR/PO**
- Upload ไฟล์จริง → บันทึก local disk (`backend/uploads/`)
- แสดงผู้อัปโหลด + role + เวลา
- บันทึก prNo / poNo ลง DB

**หน้าส่งต่อบัญชี**
- Forward status → accounting
- ส่ง Email แจ้งฝ่ายบัญชีทุกคนอัตโนมัติ (Gmail SMTP)
- ส่ง Email แจ้งฝ่ายจัดซื้อเมื่อมีใบขอซื้อใหม่จากพนักงาน

---

### 🟡 Phase 5 — Accounting Pages
**หน้ารายการรอโอนเงิน**
- ✅ ดึง status = accounting จาก DB
- ⬜ เรียงตาม dueDate ใกล้หมดก่อน (ปัจจุบันเรียงตาม updatedAt)

**หน้าบันทึกการโอน**
- บันทึก transferRef + transferDate + แนบสลิป ลง DB
- อัปเดต status → transferred
- ส่ง Email แจ้งผู้ขอเมื่อโอนเงินสำเร็จ
- ส่ง Email แจ้งผู้ขอเมื่อถูกปฏิเสธ (ทั้ง purchasing และ accounting ปฏิเสธได้)

**หน้าประวัติการโอน**
- ✅ ตาราง + search
- ⬜ Filter ตามช่วงวันที่
- ⬜ Export CSV

---

### ✅ Phase 6 — Tracking Page
- ✅ Timeline ดึงจาก DB จริง พร้อมสถานะแต่ละขั้น
- ✅ Employee เห็นเฉพาะของตัวเอง
- ✅ กดการ์ดเพื่อดูรายละเอียดเต็ม + ไฟล์แนบ
- ⬜ Real-time polling / SSE (ต้อง refresh เพื่อดูสถานะใหม่)

---

### ✅ Phase 7 — IT Support Pages
**หน้าจัดการผู้ใช้**
- ✅ CRUD user ลง DB (เพิ่ม / แก้ไข / ลบ)
- ✅ Reset password (รีเซ็ตเป็น 1234)
- ✅ Toggle active / inactive

**หน้า Audit Log**
- ✅ บันทึก log ทุก action ลง DB
- ✅ แสดง user, action, module, เวลา, IP
- ⬜ Filter by user / action / วันที่

**หน้ารายงาน**
- ✅ กราฟ Bar/Pie จากข้อมูลจริง (อยู่ในหน้า Reports)
- ⬜ Export PDF / Excel

**ตั้งค่าเว็บไซต์** *(bonus — นอก phase plan)*
- ✅ เปลี่ยนโลโก้ + ชื่อร้าน + subtitle ผ่าน UI
- ✅ มีผลทันทีทั้ง Login page, Sidebar, Favicon, Title

---

### ⬜ Phase 8 — PDF Generation
- Template ใบ PR (header บริษัท, รายการ, ผู้อนุมัติ)
- Template ใบ PO
- Download PDF จากหน้า detail
- แนบ PDF ใน Email อัตโนมัติ

---

### ⬜ Phase 9 — Testing & QA
- ทดสอบ workflow ทุก role ครบทุก path
- Edge cases: file ใหญ่, network error, session หมดอายุ
- UAT กับผู้ใช้จริงในทีม
- Bug fix จาก feedback

---

### ⬜ Phase 10 — Deploy & Go Live
- Setup VPS + Nginx + SSL
- Docker Compose production mode
- Import ข้อมูลเก่า (ถ้ามี)
- สร้าง user จริงทุก account
- Monitor + รับ feedback สัปดาห์แรก

---

## ภาพรวม Workflow

```
พนักงาน: สร้างใบขอซื้อ
    ↓
[pending] — รอฝ่ายจัดซื้อ
    ↓ ฝ่ายจัดซื้อ: ออก PR/PO + แนบเอกสาร
[purchasing] — รอส่งต่อบัญชี
    ↓ ฝ่ายจัดซื้อ: Forward ไปบัญชี
[accounting] — รอโอนเงิน
    ↓ ฝ่ายบัญชี: บันทึก Transfer Ref + แนบสลิป
[transferred] ✓ เสร็จสิ้น

(ปฏิเสธได้ทุกขั้น → rejected)
```

---

## Tech Stack

### Frontend
| ส่วน | เทคโนโลยี |
|------|----------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |

### Backend
| ส่วน | เทคโนโลยี |
|------|----------|
| Runtime | Node.js 20 |
| Framework | Hono |
| ORM | Prisma |
| Database | MySQL 8.0 |
| Auth | JWT + bcryptjs |
| File Storage | Local disk (`backend/uploads/`) |

### Infrastructure
| ส่วน | เทคโนโลยี |
|------|----------|
| Container | Docker + Docker Compose |
| DB Admin | phpMyAdmin |
| Dev Proxy | Vite proxy (`/api` → `localhost:3000`) |

---

## วิธีรัน (Development)

### ต้องติดตั้งก่อน
- Docker Desktop
- Node.js 20+

### 1. Clone และตั้งค่า
```bash
git clone https://github.com/B0atByte/mockup-PRsystem.git
cd mockup-PRsystem
```

สร้างไฟล์ `.env` ที่ root:
```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=pr_system
MYSQL_USER=pruser
MYSQL_PASSWORD=prpassword
JWT_SECRET=your-secret-key
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=Casa Lapin PR System <your-gmail@gmail.com>
SITE_URL=http://your-server-ip:5173
```

### 2. รัน Backend + Database
```bash
docker compose up -d
```

### 3. Seed ข้อมูลตัวอย่าง (ครั้งแรก)
```bash
docker exec pr_backend npx prisma db push
docker exec pr_backend npm run db:seed
```

### 4. รัน Frontend
```bash
cd app
npm install
npm run dev
```

เปิดที่ `http://localhost:5173`

### LAN Access
Vite ตั้งค่า `host: true` ไว้แล้ว — เปิด `http://<IP เครื่อง>:5173` จากเครื่องอื่นในวงได้เลย

> Windows ต้องเพิ่ม Firewall rule ก่อน:
> ```powershell
> New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
> ```

---

## Services และ Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend API (Hono) | 3000 | http://localhost:3000 |
| MySQL | 3306 | — |
| phpMyAdmin | 8080 | http://localhost:8080 |

---

## บัญชีผู้ใช้เริ่มต้น

> รหัสผ่านทุก account: **1234**

| Username | บทบาท | สิทธิ์หลัก |
|----------|-------|-----------|
| `owner` | ผู้ประกอบการ | ดูภาพรวม, รายงาน, คำขอทั้งหมด |
| `employee` | พนักงาน | สร้างใบขอซื้อ, ติดตามสถานะ |
| `emp2` | พนักงาน | สร้างใบขอซื้อ, ติดตามสถานะ |
| `purchasing` | ฝ่ายจัดซื้อ | อนุมัติ, ออก PR/PO, แนบเอกสาร, ส่งต่อบัญชี |
| `accounting` | บัญชี | บันทึกการโอนเงิน, แนบสลิป, ประวัติการโอน |
| `itsupport` | IT Support | จัดการผู้ใช้, Audit Log, ตั้งค่าเว็บไซต์ |

---

## โครงสร้างโปรเจ็ค

```
prs/
├── docker-compose.yml
├── .env                        # credentials (git ignored)
├── README.md
├── CLAUDE.md                   # สารบัญสำหรับ AI agent
├── app/                        # Frontend
│   ├── src/
│   │   ├── App.tsx             # Components ทั้งหมด
│   │   ├── data.ts             # Types
│   │   ├── lib/api.ts          # API client
│   │   └── index.css
│   ├── public/
│   │   └── favicon.png
│   └── package.json
└── backend/                    # Backend
    ├── src/
    │   ├── index.ts            # Hono server entry
    │   ├── routes/             # auth, requests, users, audit, files, settings
    │   ├── middleware/         # JWT auth + requireRole
    │   └── lib/                # prisma client, jwt utils
    ├── prisma/
    │   └── schema.prisma
    ├── uploads/                # ไฟล์ที่ผู้ใช้อัปโหลด (git ignored)
    └── Dockerfile
```
