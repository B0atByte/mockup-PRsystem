import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import nodemailer from 'nodemailer'

const router = new Hono()

const ensureSettings = () =>
  prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

// GET /api/settings — ทุก role ดูได้
router.get('/', authMiddleware, async (c) => {
  const s = await ensureSettings()
  return c.json(s)
})

// PUT /api/settings — itsupport เท่านั้น
router.put('/', authMiddleware, requireRole('itsupport'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const s = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      siteName: body.siteName || 'Casa Lapin',
      siteSubtitle: body.siteSubtitle || 'ระบบขอซื้อสินค้า',
      logoUrl: body.logoUrl || null,
      updatedBy: user.id,
      updatedByName: user.name,
    },
    update: {
      siteName: body.siteName || 'Casa Lapin',
      siteSubtitle: body.siteSubtitle || 'ระบบขอซื้อสินค้า',
      logoUrl: body.logoUrl ?? undefined,
      updatedBy: user.id,
      updatedByName: user.name,
    },
  })

  return c.json(s)
})

// POST /api/settings/test-email — itsupport ทดสอบส่งอีเมล
router.post('/test-email', authMiddleware, requireRole('itsupport'), async (c) => {
  const user = c.get('user')

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return c.json({ error: 'ยังไม่ได้ตั้งค่า SMTP_USER / SMTP_PASS ใน .env' }, 400)
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email || process.env.SMTP_USER,
      subject: '[Casa Lapin] ทดสอบระบบอีเมลแจ้งเตือน',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <div style="background:#1d4ed8;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">Casa Lapin — ทดสอบระบบอีเมล</h2>
          </div>
          <div style="background:#fff;padding:20px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
            <p>ระบบอีเมลแจ้งเตือนของ <strong>Casa Lapin PR System</strong> พร้อมใช้งานแล้ว</p>
            <p style="color:#64748b;font-size:14px">ทดสอบโดย: ${user.name} (${user.role})<br/>
            เวลา: ${new Date().toLocaleString('th-TH')}</p>
          </div>
        </div>`,
    })

    return c.json({ ok: true, sentTo: user.email || process.env.SMTP_USER })
  } catch (err: any) {
    return c.json({ error: err.message || 'ส่งอีเมลไม่สำเร็จ' }, 500)
  }
})

export default router
