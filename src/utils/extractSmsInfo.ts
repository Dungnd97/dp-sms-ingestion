/* eslint-disable no-useless-escape */
export function extractSmsInfo(message: string, sender: string) {
  if (sender === 'TPBank' || sender === 'TPBank Mobile' || sender === 'com.tpb.mb.gprsandroid') {
    // 1. Lấy số tiền từ PS
    const amountMatch = message.match(/PS:\+?([\d.,]+)VND/i)
    const rawAmount = amountMatch?.[1] ?? null
    const amount = rawAmount ? Number(rawAmount.replace(/[.,]/g, '')) : null

    // 2. Lấy UUID sau "ID-" theo định dạng chuẩn
    const idMatch = message.match(/ID([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
    const transactionId = idMatch?.[1] ?? null

    return { amount, transactionId }
  }

  return null
}
