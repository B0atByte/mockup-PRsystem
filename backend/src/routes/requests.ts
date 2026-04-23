import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { mailNewRequest, mailAccountingForward, mailTransferred, mailRejected } from '../lib/mailer.js'
import { discordNewRequest, discordPurchasing, discordAccounting, discordTransferred, discordRejected, discordReceived, type Actor } from '../lib/discord.js'
import { parseBody } from '../lib/validate.js'
import type { RequestStatus } from '@prisma/client'

const requests = new Hono()
requests.use('*', authMiddleware)

const itemSchema = z.object({
  code: z.string().max(50).default(''),
  name: z.string().max(200).default(''),
  qty: z.number().positive('จำนวนต้องมากกว่า 0').default(1),
  unit: z.string().max(50).default(''),
  price: z.number().nonnegative('ราคาต้องไม่ติดลบ').default(0),
  itemNote: z.string().max(500).optional().default(''),
})

const createRequestSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกชื่อใบขอซื้อ').max(200),
  reason: z.string().max(1000).optional().default(''),
  category: z.string().max(100).default(''),
  categories: z.array(z.string()).optional().default([]),
  totalAmount: z.number().nonnegative('ยอดรวมต้องไม่ติดลบ'),
  supplierName: z.string().max(200).default(''),
  supplierName2: z.string().max(200).optional().default(''),
  paymentMethod: z.enum(['bank', 'cash', 'transfer'], { message: 'กรุณาเลือกช่องทางการชำระเงิน' }),
  paymentTiming: z.enum(['before', 'after'], { message: 'กรุณาเลือกกำหนดจ่าย' }),
  orderDate: z.string().optional().default(''),
  deliveryDate: z.string().optional().default(''),
  dueDate: z.string().optional().default(''),
  contactName: z.string().max(200).optional().default(''),
  signedDate: z.string().optional().default(''),
  requestFile: z.string().optional(),
  items: z.array(itemSchema).optional().default([]),
})

const STATUS_VALUES = ['purchasing', 'accounting', 'transferred', 'received', 'rejected'] as const

const updateStatusSchema = z.object({
  status: z.enum(STATUS_VALUES, { message: 'status ไม่ถูกต้อง' }),
  prNo: z.string().max(100).optional(),
  poNo: z.string().max(100).optional(),
  prFile: z.string().optional(),
  poFile: z.string().optional(),
  transferRef: z.string().max(200).optional(),
  transferDate: z.string().optional(),
  transferFile: z.string().optional(),
  deliveryNote: z.string().optional(),
  taxInvoice: z.string().optional(),
  receivedAt: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

const formatRequest = (r: any) => ({
  ...r,
  categories: JSON.parse(r.categories || '[]'),
  createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString().slice(0, 10) : r.createdAt,
  updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString().slice(0, 10) : r.updatedAt,
})

// GET /api/requests
requests.get('/', async (c) => {
  const user = c.get('user')
  // owner เห็นทุกใบ, role อื่นเห็นเฉพาะที่ตัวเองสร้าง + ที่ต้องดำเนินการตาม role
  const where = user.role === 'owner' ? {} : { createdBy: user.id }
  const data = await prisma.purchaseRequest.findMany({
    where,
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
  })
  return c.json(data.map(formatRequest))
})

// GET /api/requests/all — ดึงทุกใบสำหรับ role ที่ต้องดำเนินการ (purchasing, accounting, itsupport)
requests.get('/all', async (c) => {
  const user = c.get('user')
  const allowed = ['owner', 'purchasing', 'accounting', 'itsupport']
  if (!allowed.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
  const data = await prisma.purchaseRequest.findMany({
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
  })
  return c.json(data.map(formatRequest))
})

// GET /api/requests/:id
requests.get('/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const data = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!data) return c.json({ error: 'Not found' }, 404)
  // ถ้าไม่ใช่ owner และไม่ใช่ผู้สร้าง ต้องเป็น role ที่ดำเนินการ
  const isOwnerOfReq = data.createdBy === user.id
  const isProcessor = ['owner', 'purchasing', 'accounting', 'itsupport'].includes(user.role)
  if (!isOwnerOfReq && !isProcessor) return c.json({ error: 'Forbidden' }, 403)
  return c.json(formatRequest(data))
})

// PUT /api/requests/:id — แก้ไขใบขอซื้อ (เฉพาะผู้สร้าง + status pending เท่านั้น)
requests.put('/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  const existing = await prisma.purchaseRequest.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.createdBy !== user.id) return c.json({ error: 'Forbidden' }, 403)
  if (existing.status !== 'pending') return c.json({ error: 'ไม่สามารถแก้ไขใบขอซื้อที่ส่งดำเนินการแล้ว' }, 400)

  const result = await parseBody(c, createRequestSchema)
  if (!(result as any).data) return result as unknown as Response
  const body = (result as any).data

  const wrapFile = (url?: string) =>
    url ? JSON.stringify({ url, by: user.name, byRole: user.role, at: new Date().toISOString() }) : undefined

  const updated = await prisma.purchaseRequest.update({
    where: { id },
    data: {
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
      requestFile: body.requestFile ? wrapFile(body.requestFile) : existing.requestFile,
      items: { deleteMany: {}, create: body.items },
    },
    include: { items: true },
  })

  return c.json(formatRequest(updated))
})

// POST /api/requests — employee เท่านั้น
requests.post('/', requireRole('employee'), async (c) => {
  const user = c.get('user')
  const result = await parseBody(c, createRequestSchema)
  if (!(result as any).data) return result as unknown as Response
  const body = (result as any).data

  const year = new Date().getFullYear() + 543
  const prefix = `PR-${year}-`
  const last = await prisma.purchaseRequest.findFirst({
    where: { reqNo: { startsWith: prefix } },
    orderBy: { reqNo: 'desc' },
    select: { reqNo: true },
  })
  const lastNum = last ? parseInt(last.reqNo.replace(prefix, ''), 10) : 0
  const reqNo = `${prefix}${String(lastNum + 1).padStart(3, '0')}`

  const wrapFileCreate = (url?: string) =>
    url ? JSON.stringify({ url, by: user.name, byRole: user.role, at: new Date().toISOString() }) : undefined

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
      requestFile: wrapFileCreate(body.requestFile),
      createdBy: user.id,
      createdByName: user.name,
      items: { create: body.items },
    },
    include: { items: true },
  })

  const r = formatRequest(data)
  prisma.user.findMany({ where: { role: 'purchasing', active: true }, select: { email: true } })
    .then(users => {
      const emails = users.map(u => u.email).filter(Boolean) as string[]
      if (emails.length) mailNewRequest(emails, r)
        .then(() => console.log('[mail] new request sent OK'))
        .catch(e => console.error('[mail] new request error:', e.message))
    }).catch(e => console.error('[mail] find purchasing error:', e.message))

  // Discord notification — new request
  const actor: Actor = { name: user.name, role: user.role }
  prisma.settings.findUnique({ where: { id: 'singleton' } }).then(s => {
    if (s?.discordWebhook && s.discordOnNewRequest) discordNewRequest(s.discordWebhook, r, actor).catch(console.error)
  }).catch(console.error)

  return c.json(r, 201)
})

// PATCH /api/requests/:id/status
requests.patch('/:id/status', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  const result = await parseBody(c, updateStatusSchema)
  if (!(result as any).data) return result as unknown as Response
  const body = (result as any).data

  // ตรวจ role อย่างเข้มงวด — ถ้า status ไม่อยู่ใน map ให้ reject ทันที
  const allowedActions: Record<string, string[]> = {
    purchasing: ['purchasing'],
    accounting: ['purchasing'],
    transferred: ['accounting'],
    received: ['employee', 'owner'],
    rejected: ['purchasing', 'accounting'],
  }

  const allowed = allowedActions[body.status]
  if (!allowed || !allowed.includes(user.role)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  // received — ต้องเป็นเจ้าของใบขอซื้อเท่านั้น
  if (body.status === 'received') {
    const existing = await prisma.purchaseRequest.findUnique({ where: { id }, select: { createdBy: true, status: true } })
    if (!existing || existing.createdBy !== user.id) return c.json({ error: 'Forbidden' }, 403)
    if (existing.status !== 'transferred') return c.json({ error: 'รับสินค้าได้เฉพาะเมื่อโอนเงินแล้วเท่านั้น' }, 400)
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
      deliveryNote: body.deliveryNote ? wrapFile(body.deliveryNote) : undefined,
      taxInvoice: body.taxInvoice ? wrapFile(body.taxInvoice) : undefined,
      receivedAt: body.receivedAt,
      notes: body.notes,
    },
    include: { items: true },
  })

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

  // Discord notifications per status
  const statusActor: Actor = { name: user.name, role: user.role }
  prisma.settings.findUnique({ where: { id: 'singleton' } }).then(s => {
    if (!s?.discordWebhook) return
    const wh = s.discordWebhook
    if (body.status === 'purchasing' && s.discordOnPurchasing) discordPurchasing(wh, r, statusActor).catch(console.error)
    else if (body.status === 'accounting' && s.discordOnAccounting) discordAccounting(wh, r, statusActor).catch(console.error)
    else if (body.status === 'transferred' && s.discordOnTransferred) discordTransferred(wh, r, statusActor).catch(console.error)
    else if (body.status === 'rejected' && s.discordOnRejected) discordRejected(wh, { ...r, notes: body.notes }, statusActor).catch(console.error)
    else if (body.status === 'received' && s.discordOnReceived) discordReceived(wh, r, statusActor).catch(console.error)
  }).catch(console.error)

  return c.json(r)
})

export default requests
