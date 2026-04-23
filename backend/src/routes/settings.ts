import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { parseBody } from '../lib/validate.js'
import nodemailer from 'nodemailer'
import { discordTest } from '../lib/discord.js'

const router = new Hono()

const updateSettingsSchema = z.object({
  siteName: z.string().min(1, 'กรุณากรอกชื่อเว็บไซต์').max(200).optional(),
  siteSubtitle: z.string().max(500).optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  discordWebhook: z.string().max(500).nullable().optional(),
  discordOnNewRequest: z.boolean().optional(),
  discordOnPurchasing: z.boolean().optional(),
  discordOnAccounting: z.boolean().optional(),
  discordOnTransferred: z.boolean().optional(),
  discordOnRejected: z.boolean().optional(),
  discordOnReceived: z.boolean().optional(),
})

const ensureSettings = () =>
  prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

// GET /api/settings — public (ใช้ก่อน login เพื่อโหลด branding)
router.get('/', async (c) => {
  const s = await ensureSettings()
  return c.json(s)
})

// PUT /api/settings — itsupport เท่านั้น
router.put('/', authMiddleware, requireRole('itsupport'), async (c) => {
  const user = c.get('user')

  const result = await parseBody(c, updateSettingsSchema)
  if (!(result as any).data) return result as unknown as Response
  const body = (result as any).data

  const s = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      siteName: body.siteName || 'ระบบขอซื้อสินค้า',
      siteSubtitle: body.siteSubtitle || 'ระบบขอซื้อสินค้า',
      logoUrl: body.logoUrl || null,
      updatedBy: user.id,
      updatedByName: user.name,
    },
    update: {
      siteName: body.siteName || undefined,
      siteSubtitle: body.siteSubtitle || undefined,
      logoUrl: body.logoUrl ?? undefined,
      discordWebhook: body.discordWebhook ?? undefined,
      discordOnNewRequest: body.discordOnNewRequest ?? undefined,
      discordOnPurchasing: body.discordOnPurchasing ?? undefined,
      discordOnAccounting: body.discordOnAccounting ?? undefined,
      discordOnTransferred: body.discordOnTransferred ?? undefined,
      discordOnRejected: body.discordOnRejected ?? undefined,
      discordOnReceived: body.discordOnReceived ?? undefined,
      updatedBy: user.id,
      updatedByName: user.name,
    },
  })

  return c.json(s)
})

// POST /api/settings/test-email — itsupport ทดสอบส่งอีเมล
router.post('/test-email', authMiddleware, requireRole('itsupport'), async (c) => {
  const { id, name, role } = c.get('user')

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return c.json({ error: 'ยังไม่ได้ตั้งค่า SMTP_USER / SMTP_PASS ใน .env' }, 400)
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    const [settings, dbUser] = await Promise.all([ensureSettings(), prisma.user.findUnique({ where: { id }, select: { email: true } })])
    const siteName = settings.siteName || 'ระบบขอซื้อสินค้า'
    const toEmail = dbUser?.email || process.env.SMTP_USER
    console.log(`[test-email] sending to: ${toEmail} | from: ${process.env.SMTP_USER}`)

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: `[${siteName}] ทดสอบระบบอีเมลแจ้งเตือน`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <div style="background:#1d4ed8;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">${siteName} — ทดสอบระบบอีเมล</h2>
          </div>
          <div style="background:#fff;padding:20px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
            <p>ระบบอีเมลแจ้งเตือนของ <strong>${siteName}</strong> พร้อมใช้งานแล้ว</p>
            <p style="color:#64748b;font-size:14px">ทดสอบโดย: ${name} (${role})<br/>
            เวลา: ${new Date().toLocaleString('th-TH')}</p>
          </div>
        </div>`,
    })

    return c.json({ ok: true, sentTo: toEmail })
  } catch (err: any) {
    return c.json({ error: err.message || 'ส่งอีเมลไม่สำเร็จ' }, 500)
  }
})

// POST /api/settings/test-discord — itsupport ทดสอบส่ง Discord webhook
router.post('/test-discord', authMiddleware, requireRole('itsupport'), async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const webhook = body.webhook || (await ensureSettings()).discordWebhook
  if (!webhook) return c.json({ error: 'ยังไม่ได้ตั้งค่า Discord Webhook URL' }, 400)
  try {
    await discordTest(webhook)
    return c.json({ ok: true })
  } catch (e: any) {
    return c.json({ error: e.message || 'ส่ง Discord ไม่สำเร็จ' }, 500)
  }
})

export default router
