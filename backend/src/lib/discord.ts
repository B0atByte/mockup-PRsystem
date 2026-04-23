interface DiscordField { name: string; value: string; inline?: boolean }
interface DiscordEmbed {
  author?: { name: string; icon_url?: string }
  title: string
  description?: string
  color: number
  fields?: DiscordField[]
  footer?: { text: string }
  timestamp?: string
}

export interface Actor { name: string; role: string }

const DEPT: Record<string, string> = {
  employee: 'พนักงาน',
  purchasing: 'ฝ่ายจัดซื้อ',
  accounting: 'ฝ่ายบัญชี',
  itsupport: 'IT Support',
  owner: 'ผู้ประกอบการ',
}

const DEPT_ICON: Record<string, string> = {
  employee: '👤',
  purchasing: '🛒',
  accounting: '💼',
  itsupport: '🖥️',
  owner: '👑',
}

const fmt = (n: number) => n.toLocaleString('th-TH')
const deptLabel = (role: string) => DEPT[role] || role
const authorText = (actor: Actor) => `${DEPT_ICON[actor.role] || '👤'} ${actor.name}  ·  ${deptLabel(actor.role)}`

async function send(webhook: string, embed: DiscordEmbed) {
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Casa Lapin — ระบบขอซื้อสินค้า',
        embeds: [{
          ...embed,
          footer: embed.footer ?? { text: 'Casa Lapin PR System' },
          timestamp: new Date().toISOString(),
        }],
      }),
    })
    if (!res.ok) console.error('[discord] error:', res.status, await res.text().catch(() => ''))
  } catch (e: any) {
    console.error('[discord] fetch error:', e.message)
  }
}

export function discordNewRequest(webhook: string, r: any, actor: Actor) {
  return send(webhook, {
    author: { name: authorText(actor) },
    title: '📋  ใบขอซื้อใหม่ — รอดำเนินการ',
    description: `> **${r.title}**\nพนักงานส่งคำขอเข้ามาแล้ว รอ**ฝ่ายจัดซื้อ**ดำเนินการ`,
    color: 0xf59e0b,
    fields: [
      { name: '🔢 เลขที่', value: `\`${r.reqNo}\``, inline: true },
      { name: '📂 หมวด', value: r.category || '—', inline: true },
      { name: '💰 ยอดเงิน', value: `**฿${fmt(r.totalAmount)}**`, inline: true },
      { name: '📅 กำหนดชำระ', value: r.dueDate || '—', inline: true },
      { name: '💳 วิธีชำระ', value: r.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน', inline: true },
    ],
    footer: { text: '🛒 ฝ่ายจัดซื้อ: โปรดดำเนินการอนุมัติ' },
  })
}

export function discordPurchasing(webhook: string, r: any, actor: Actor) {
  return send(webhook, {
    author: { name: authorText(actor) },
    title: '📦  ออก PR/PO เรียบร้อยแล้ว',
    description: `> **${r.title}**\n**ฝ่ายจัดซื้อ**ออกเอกสารแล้ว รอ**ฝ่ายบัญชี**โอนเงิน`,
    color: 0x3b82f6,
    fields: [
      { name: '🔢 เลขที่', value: `\`${r.reqNo}\``, inline: true },
      { name: '📄 PR', value: `**${r.prNo || '—'}**`, inline: true },
      { name: '📄 PO', value: `**${r.poNo || '—'}**`, inline: true },
      { name: '💰 ยอดเงิน', value: `**฿${fmt(r.totalAmount)}**`, inline: true },
      { name: '👤 ผู้ขอ', value: r.createdByName, inline: true },
    ],
    footer: { text: '💼 ฝ่ายบัญชี: มีรายการรอโอนเงิน' },
  })
}

export function discordAccounting(webhook: string, r: any, actor: Actor) {
  return send(webhook, {
    author: { name: authorText(actor) },
    title: '💳  ส่งต่อฝ่ายบัญชีแล้ว — รอโอนเงิน',
    description: `> **${r.title}**\n**ฝ่ายจัดซื้อ**ส่งงานต่อ รอ**ฝ่ายบัญชี**บันทึกการโอนเงิน`,
    color: 0x8b5cf6,
    fields: [
      { name: '🔢 เลขที่', value: `\`${r.reqNo}\``, inline: true },
      { name: '📄 PR / PO', value: `**${r.prNo || '—'}** / **${r.poNo || '—'}**`, inline: true },
      { name: '💰 ยอดเงิน', value: `**฿${fmt(r.totalAmount)}**`, inline: true },
      { name: '👤 ผู้ขอ', value: r.createdByName, inline: true },
      { name: '📅 กำหนดชำระ', value: r.dueDate || '—', inline: true },
    ],
    footer: { text: '💼 ฝ่ายบัญชี: โปรดบันทึกการโอนเงิน' },
  })
}

export function discordTransferred(webhook: string, r: any, actor: Actor) {
  return send(webhook, {
    author: { name: authorText(actor) },
    title: '✅  โอนเงินสำเร็จแล้ว',
    description: `> **${r.title}**\n**ฝ่ายบัญชี**บันทึกการโอนเงินเรียบร้อย รอพนักงานยืนยันรับสินค้า`,
    color: 0x10b981,
    fields: [
      { name: '🔢 เลขที่', value: `\`${r.reqNo}\``, inline: true },
      { name: '🏦 Ref โอนเงิน', value: `**${r.transferRef || '—'}**`, inline: true },
      { name: '📅 วันที่โอน', value: r.transferDate || '—', inline: true },
      { name: '💰 ยอดเงิน', value: `**฿${fmt(r.totalAmount)}**`, inline: true },
      { name: '👤 ผู้ขอ', value: r.createdByName, inline: true },
    ],
    footer: { text: '👤 พนักงาน: โปรดตรวจรับสินค้า แล้วกดยืนยัน' },
  })
}

export function discordRejected(webhook: string, r: any, actor: Actor) {
  return send(webhook, {
    author: { name: authorText(actor) },
    title: '❌  ปฏิเสธใบขอซื้อ',
    description: `> **${r.title}**\n**${deptLabel(actor.role)}**ปฏิเสธคำขอนี้แล้ว`,
    color: 0xef4444,
    fields: [
      { name: '🔢 เลขที่', value: `\`${r.reqNo}\``, inline: true },
      { name: '👤 ผู้ขอ', value: r.createdByName, inline: true },
      { name: '💰 ยอดเงิน', value: `฿${fmt(r.totalAmount)}`, inline: true },
      { name: '📝 เหตุผล', value: r.notes ? `> ${r.notes}` : '—' },
    ],
    footer: { text: '👤 พนักงาน: ติดต่อผู้ดูแลเพื่อสอบถามเพิ่มเติม' },
  })
}

export function discordReceived(webhook: string, r: any, actor: Actor) {
  return send(webhook, {
    author: { name: authorText(actor) },
    title: '📬  ยืนยันรับสินค้าแล้ว — เสร็จสิ้น',
    description: `> **${r.title}**\nพนักงานยืนยันรับสินค้าเรียบร้อย กระบวนการ**เสร็จสิ้น**ทั้งหมด ✅`,
    color: 0x22c55e,
    fields: [
      { name: '🔢 เลขที่', value: `\`${r.reqNo}\``, inline: true },
      { name: '👤 ผู้รับ', value: `**${actor.name}**`, inline: true },
      { name: '💰 ยอดเงิน', value: `฿${fmt(r.totalAmount)}`, inline: true },
      { name: '📅 วันที่รับ', value: r.receivedAt || '—', inline: true },
    ],
    footer: { text: 'Casa Lapin PR System — เสร็จสิ้น' },
  })
}

export function discordTest(webhook: string) {
  return send(webhook, {
    author: { name: '🖥️ IT Support  ·  ทดสอบระบบ' },
    title: '🔔  ทดสอบการแจ้งเตือน Discord',
    description: '**ระบบแจ้งเตือนเชื่อมต่อสำเร็จ** ✅\nข้อความนี้ถูกส่งจากหน้าตั้งค่า Discord ของระบบขอซื้อสินค้า',
    color: 0x6366f1,
    fields: [
      { name: '📋 New Request', value: 'แจ้งเมื่อมีใบขอซื้อใหม่', inline: true },
      { name: '📦 PR/PO', value: 'แจ้งเมื่อออกเอกสาร', inline: true },
      { name: '✅ โอนเงิน', value: 'แจ้งเมื่อโอนเงินสำเร็จ', inline: true },
    ],
    footer: { text: 'Casa Lapin PR System' },
  })
}
