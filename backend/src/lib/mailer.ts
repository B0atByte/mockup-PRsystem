import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || ''

function fmt(n: number) {
  return n.toLocaleString('th-TH')
}

function base(title: string, body: string) {
  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px">
    <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0;font-size:18px">🏪 Casa Lapin — ระบบขอซื้อสินค้า</h2>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
      <h3 style="color:#1e293b;margin-top:0">${title}</h3>
      ${body}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
      <p style="color:#94a3b8;font-size:12px;margin:0">อีเมลนี้ส่งอัตโนมัติจากระบบ Casa Lapin PR System — กรุณาอย่าตอบกลับ</p>
    </div>
  </div>`
}

// แจ้งฝ่ายบัญชีเมื่อมีใบรอโอนเงิน
export async function mailAccountingForward(to: string[], req: {
  reqNo: string; title: string; totalAmount: number; createdByName: string; prNo?: string; poNo?: string;
}) {
  const body = `
    <p style="color:#475569">มีใบขอซื้อถูกส่งมาให้ฝ่ายบัญชีดำเนินการโอนเงิน</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#64748b;width:140px">เลขที่ใบขอซื้อ</td><td style="font-weight:600;color:#1e293b">${req.reqNo}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">รายการ</td><td style="font-weight:600;color:#1e293b">${req.title}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">ผู้ขอ</td><td style="color:#1e293b">${req.createdByName}</td></tr>
      ${req.prNo ? `<tr><td style="padding:8px 0;color:#64748b">PR No.</td><td style="font-family:monospace;color:#1e293b">${req.prNo}</td></tr>` : ''}
      ${req.poNo ? `<tr><td style="padding:8px 0;color:#64748b">PO No.</td><td style="font-family:monospace;color:#1e293b">${req.poNo}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#64748b">ยอดรวม</td><td style="font-weight:700;color:#1d4ed8;font-size:16px">฿${fmt(req.totalAmount)}</td></tr>
    </table>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-top:16px">
      <p style="color:#1d4ed8;margin:0;font-size:14px">📋 กรุณาเข้าสู่ระบบเพื่อดำเนินการบันทึกการโอนเงิน</p>
    </div>`

  await transporter.sendMail({
    from: FROM, to: to.join(','),
    subject: `[PR System] รอโอนเงิน — ${req.reqNo} | ${req.title}`,
    html: base('มีรายการรอการโอนเงิน', body),
  })
}

// แจ้งผู้ขอเมื่อโอนเงินสำเร็จ
export async function mailTransferred(to: string, req: {
  reqNo: string; title: string; totalAmount: number; transferRef?: string; transferDate?: string;
}) {
  const body = `
    <p style="color:#475569">ฝ่ายบัญชีได้บันทึกการโอนเงินสำหรับใบขอซื้อของคุณแล้ว</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#64748b;width:140px">เลขที่ใบขอซื้อ</td><td style="font-weight:600;color:#1e293b">${req.reqNo}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">รายการ</td><td style="font-weight:600;color:#1e293b">${req.title}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">ยอดรวม</td><td style="font-weight:700;color:#16a34a;font-size:16px">฿${fmt(req.totalAmount)}</td></tr>
      ${req.transferRef ? `<tr><td style="padding:8px 0;color:#64748b">เลข Ref.</td><td style="font-family:monospace;color:#1e293b">${req.transferRef}</td></tr>` : ''}
      ${req.transferDate ? `<tr><td style="padding:8px 0;color:#64748b">วันที่โอน</td><td style="color:#1e293b">${req.transferDate}</td></tr>` : ''}
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-top:16px">
      <p style="color:#16a34a;margin:0;font-size:14px">✅ ดำเนินการเสร็จสิ้นแล้ว</p>
    </div>`

  await transporter.sendMail({
    from: FROM, to,
    subject: `[PR System] โอนเงินแล้ว — ${req.reqNo} | ${req.title}`,
    html: base('ยืนยันการโอนเงินสำเร็จ', body),
  })
}

// แจ้งผู้ขอเมื่อถูกปฏิเสธ
export async function mailRejected(to: string, req: {
  reqNo: string; title: string; notes?: string;
}) {
  const body = `
    <p style="color:#475569">ใบขอซื้อของคุณถูกปฏิเสธโดยฝ่ายจัดซื้อ</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#64748b;width:140px">เลขที่ใบขอซื้อ</td><td style="font-weight:600;color:#1e293b">${req.reqNo}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">รายการ</td><td style="font-weight:600;color:#1e293b">${req.title}</td></tr>
      ${req.notes ? `<tr><td style="padding:8px 0;color:#64748b">เหตุผล</td><td style="color:#dc2626">${req.notes}</td></tr>` : ''}
    </table>
    <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:12px 16px;margin-top:16px">
      <p style="color:#dc2626;margin:0;font-size:14px">❌ กรุณาติดต่อฝ่ายจัดซื้อเพื่อข้อมูลเพิ่มเติม</p>
    </div>`

  await transporter.sendMail({
    from: FROM, to,
    subject: `[PR System] ปฏิเสธคำขอ — ${req.reqNo} | ${req.title}`,
    html: base('ใบขอซื้อถูกปฏิเสธ', body),
  })
}
