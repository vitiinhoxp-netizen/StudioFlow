// pages/api/cron-lembretes.js
// Envia lembretes WhatsApp para clientes com agendamento amanhã
// Configure no Vercel: vercel.json → "crons" → executa todo dia às 18h

import { supabaseAdmin } from '../../lib/supabase'
import { enviarLembrete } from '../../lib/whatsapp'

export default async function handler(req, res) {
  // Só aceita chamada do cron do Vercel ou com Authorization header
  const auth = req.headers['authorization']
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const supabase = supabaseAdmin()
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const dataAmanha = amanha.toISOString().split('T')[0]

  const { data: agendamentos, error } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('data', dataAmanha)
    .in('status', ['pago', 'confirmado'])

  if (error) return res.status(500).json({ error: error.message })

  const resultados = await Promise.allSettled(
    agendamentos.map(a => enviarLembrete(a))
  )

  const sucessos = resultados.filter(r => r.status === 'fulfilled' && r.value.success).length

  return res.status(200).json({
    mensagem: `Lembretes enviados: ${sucessos}/${agendamentos.length}`,
    data: dataAmanha,
  })
}
