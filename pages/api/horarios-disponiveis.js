// pages/api/horarios-disponiveis.js
// Retorna horários livres de uma profissional em uma data

import { supabaseAdmin } from '../../lib/supabase'

// Todos os horários possíveis (08:00 – 19:30, a cada 30 min)
const TODOS_HORARIOS = [
  '08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30',
  '17:00','17:30','18:00','18:30',
  '19:00','19:30',
]

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { profissional_id, data } = req.query

  if (!profissional_id || !data) {
    return res.status(400).json({ error: 'profissional_id e data são obrigatórios' })
  }

  const supabase = supabaseAdmin()

  try {
    // Busca agendamentos confirmados/pendentes nessa data e profissional
    const { data: ocupados, error } = await supabase
      .from('agendamentos')
      .select('horario')
      .eq('profissional_id', profissional_id)
      .eq('data', data)
      .in('status', ['pendente', 'pago', 'confirmado'])

    if (error) throw error

    // Busca horários bloqueados manualmente
    const { data: bloqueados } = await supabase
      .from('horarios_bloqueados')
      .select('horario')
      .eq('profissional_id', profissional_id)
      .eq('data', data)

    const horariosOcupados = new Set([
      ...ocupados.map(a => a.horario.substring(0, 5)),
      ...(bloqueados || []).filter(b => b.horario).map(b => b.horario.substring(0, 5)),
    ])

    // Filtra horários passados se for hoje
    const hoje = new Date().toISOString().split('T')[0]
    const agora = new Date()
    const horaAtual = agora.getHours() * 60 + agora.getMinutes()

    const disponiveis = TODOS_HORARIOS.map(h => {
      const [hh, mm] = h.split(':').map(Number)
      const minutos = hh * 60 + mm
      const passado = data === hoje && minutos <= horaAtual + 30

      return {
        horario: h,
        disponivel: !horariosOcupados.has(h) && !passado,
      }
    })

    return res.status(200).json({ horarios: disponiveis })

  } catch (error) {
    console.error('[horarios-disponiveis]', error)
    return res.status(500).json({ error: 'Erro ao buscar horários' })
  }
}
