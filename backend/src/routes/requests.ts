import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { mailNewRequest, mailAccountingForward, mailTransferred, mailRejected } from '../lib/mailer.js'
import type { RequestStatus } from '@prisma/client'

const requests = new Hono()
requests.use('*', authMiddleware)

const formatRequest = (r: any) => ({
  ...r,
  categories: JSON.parse(r.categories || '[]'),
  createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString().slice(0, 10) : r.createdAt,
  updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString().slice(0, 10) : r.updatedAt,
})

// GET /api/requests — ดึงรายการตาม role
requests.get('/', async (c) => {
  const user = c.get('user')
  const where = user.role === 'employee' ? { createdBy: user.id } : {}

  const data = await prisma.purchaseRequest.findMany({
    where,
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
  })

  return c.json(data.map(formatRequest))
})

// GET /api/requests/:id — ดูรายละเอียด
requests.get('/:id', async (c) => {
  const { id } = c.req.param()
  const data = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!data) return c.json({ error: 'Not found' }, 404)
  return c.json(formatRequest(data))
})

// POST /api/requests — สร้างใบขอซื้อ
requests.post('/', requireRole('employee'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const count = await prisma.purchaseRequest.count()
  const year = new Date().getFullYear() + 543
  const reqNo = `PR-${year}-${String(count + 1).padStart(3, '0')}`

  const data = await prisma.purchaseRequest.create({
    data: {
      reqNo,
      title: body.title,
      reason: body.reason || '',
      category: body.category,
      categories: JSON.stringify(body.categories || []),
      totalAmount: body.totalAmount,
      supplierName: body.supplierName,
      supplierName2: body.supplierName2 || '',
      paymentMethod: body.paymentMethod,
      paymentTiming: body.paymentTiming,
      orderDate: body.orderDate,
      deliveryDate: body.deliveryDate,
      dueDate: body.dueDate,
      contactName: body.contactName,
      signedDate: body.signedDate,
      createdBy: user.id,
      createdByName: user.name,
      items: { create: body.items },
    },
    include: { items: true },
  })

  // แจ้งฝ่ายจัดซื้อแบบ fire-and-forget
  const r = formatRequest(data)
  prisma.user.findMany({ where: { role: 'purchasing', active: true }, select: { email: true } })
    .then(users => {
      const emails = users.map(u => u.email).filter(Boolean) as string[]
      console.log('[mail] new request → purchasing emails:', emails)
      if (emails.length) mailNewRequest(emails, r)
        .then(() => console.log('[mail] new request sent OK'))
        .catch(e => console.error('[mail] new request error:', e.message))
    }).catch(e => console.error('[mail] find purchasing error:', e.message))

  return c.json(r, 201)
})

// PATCH /api/requests/:id/status — อัปเดตสถานะ
requests.patch('/:id/status', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const body = await c.req.json()

  // Role guard สำหรับแต่ละ action
  const allowedActions: Record<string, string[]> = {
    purchasing: ['purchasing'],   // จัดซื้อออก PR/PO
    accounting: ['purchasing'],   // จัดซื้อ forward ไปบัญชี
    transferred: ['accounting'],  // บัญชีบันทึกการโอน
    rejected: ['purchasing', 'accounting'],  // จัดซื้อหรือบัญชีปฏิเสธ
  }

  const allowed = allowedActions[body.status]
  if (allowed && !allowed.includes(user.role)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const wrapFile = (url?: string) =>
    url ? JSON.stringify({ url, by: user.name, byRole: user.role, at: new Date().toISOString() }) : undefined

  const updated = await prisma.purchaseRequest.update({
    where: { id },
    data: {
      status: body.status as RequestStatus,
      prNo: body.prNo,
      poNo: body.poNo,
      prFile: body.prFile ? wrapFile(body.prFile) : undefined,
      poFile: body.poFile ? wrapFile(body.poFile) : undefined,
      transferRef: body.transferRef,
      transferDate: body.transferDate,
      transferFile: body.transferFile ? wrapFile(body.transferFile) : undefined,
      notes: body.notes,
    },
    include: { items: true },
  })

  // ส่งอีเมลแจ้งแบบ fire-and-forget
  const r = formatRequest(updated)
  if (body.status === 'accounting') {
    prisma.user.findMany({ where: { role: 'accounting', active: true }, select: { email: true } })
      .then(users => {
        const emails = users.map(u => u.email).filter(Boolean)
        if (emails.length) mailAccountingForward(emails, r).catch(console.error)
      }).catch(console.error)
  } else if (body.status === 'transferred') {
    prisma.user.findUnique({ where: { id: updated.createdBy }, select: { email: true } })
      .then(u => { if (u?.email) mailTransferred(u.email, r).catch(console.error) })
      .catch(console.error)
  } else if (body.status === 'rejected') {
    prisma.user.findUnique({ where: { id: updated.createdBy }, select: { email: true } })
      .then(u => { if (u?.email) mailRejected(u.email, { ...r, notes: body.notes }).catch(console.error) })
      .catch(console.error)
  }

  return c.json(r)
})

export default requests
