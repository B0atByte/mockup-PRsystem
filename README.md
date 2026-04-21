# ระบบขอซื้อสินค้า (Purchase Request System)

ระบบจัดการใบขอซื้อสำหรับธุรกิจร้านอาหาร รองรับ 5 บทบาท มี workflow อนุมัติ 3 ขั้นตอน และระบบ tracking สถานะแบบ real-time

---

## ภาพรวมระบบ

```
พนักงานสร้างใบขอซื้อ
    ↓
[รอฝ่ายจัดซื้อ] → ฝ่ายจัดซื้อออก PR/PO
    ↓
[รอฝ่ายบัญชี] → บัญชีบันทึกการโอนเงิน
    ↓
[โอนเงินแล้ว] ✓
```

---

## Tech Stack

| ส่วน | เทคโนโลยี |
|------|----------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |

> ⚠️ เวอร์ชันนี้เป็น **Frontend Mockup** — ข้อมูลทั้งหมดอยู่ใน React state (รีเฟรชหน้าจะ reset)

---

## วิธีรัน

### ติดตั้ง dependencies

```bash
cd app
npm install
```

### รัน Development Server

```bash
npm run dev
```

เปิดที่ `http://localhost:5173`

### รันให้เครื่องอื่นใน LAN เข้าได้

```bash
npm run dev -- --host
```

จะได้ IP สำหรับแชร์ในวง LAN เช่น `http://192.168.x.x:5173`

### Build สำหรับ Production

```bash
npm run build
```

ไฟล์ output อยู่ที่ `app/dist/`

---

## บัญชีผู้ใช้ (Mock)

> รหัสผ่านทุก account: **1234**

| Username | บทบาท | สิทธิ์ |
|----------|-------|--------|
| `owner` | ผู้ประกอบการ | ดูภาพรวม, รายงาน, คำขอทั้งหมด |
| `employee` | พนักงาน | สร้างใบขอซื้อ, ดูสถานะของตัวเอง |
| `emp2` | พนักงาน | สร้างใบขอซื้อ, ดูสถานะของตัวเอง |
| `purchasing` | ฝ่ายจัดซื้อ | อนุมัติ, ออก PR/PO, ส่งต่อบัญชี |
| `accounting` | บัญชี | บันทึกการโอนเงิน, ประวัติการโอน |
| `itsupport` | IT Support | จัดการผู้ใช้, Audit Log |

---

## หน้าจอหลัก

| หน้า | เข้าถึงได้โดย |
|------|-------------|
| แดชบอร์ด | owner, itsupport |
| ติดตามคำขอ | **ทุก role** |
| สร้างใบขอซื้อ | employee |
| คำขอของฉัน | employee |
| รายการรออนุมัติ | purchasing, itsupport |
| ออก PR/PO | purchasing |
| ส่งต่อบัญชี | purchasing |
| รายการรอโอนเงิน | accounting, itsupport |
| บันทึกการโอนเงิน | accounting |
| ประวัติการโอน | accounting, itsupport |
| คำขอทั้งหมด | owner, itsupport |
| รายงานสรุป | owner |
| จัดการผู้ใช้ | itsupport |
| Audit Log | itsupport |

---

## โครงสร้างโปรเจ็ค

```
prs/
├── CLAUDE.md          # สารบัญระบบสำหรับ AI agent
├── README.md
└── app/
    ├── src/
    │   ├── App.tsx    # Components ทั้งหมด (~1,700 บรรทัด)
    │   ├── data.ts    # Types + Mock data
    │   ├── main.tsx   # Entry point
    │   └── index.css  # Global styles + animations
    ├── public/
    ├── dist/          # Build output (git ignored)
    └── package.json
```

---

## Roadmap (Production)

ดูรายละเอียดการพัฒนาต่อใน [CLAUDE.md](./CLAUDE.md)

| Phase | งาน | เวลา |
|-------|-----|------|
| 1 | Backend API (Node.js + Hono + PostgreSQL) | สัปดาห์ 1 |
| 2 | Authentication จริง (JWT + bcrypt) | สัปดาห์ 2 |
| 3 | เชื่อม Frontend กับ API | สัปดาห์ 3 |
| 4 | File Upload + PDF + Email | สัปดาห์ 4 |
| 5 | Testing + Bug fix | สัปดาห์ 5 |
| 6 | Deploy (VPS + Nginx + Docker) | สัปดาห์ 6 |
