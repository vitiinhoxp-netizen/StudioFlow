// pages/api/horarios-disponiveis.js
// Retorna horários disponíveis respeitando disponibilidade definida pela profissional e duração do serviço

import { supabaseAdmin } from '../../lib/supabase'

const TODOS_HORARIOS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30',
  '17:00','17:30','18:00','18:30','19:00','19:30',
]

// Converte HH:MM em minutos
function toMin(h) { const [hh,mm]=h.split(':').map(Number); return hh*60+mm }
// Converte minutos em HH:MM
function toHHMM(m) { return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0') }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' })

  const { profissional_id, data, duracao = 60 } = req.query
  if (!profissional_id || !data) {
    return res.status(400).json({ error: 'profissional_id e data são obrigatórios' })
  }

  const duracaoMin = parseInt(duracao)
  const supabase = supabaseAdmin()

  try {
    // 1. Busca disponibilidade definida pela profissional
    const { data: dispRows } = await supabase
      .from('disponibilidades')
      .select('horario, aberto')
      .eq('profissional_id', profissional_id)
      .eq('data', data)

    // Se não tem disponibilidade cadastrada, retorna tudo fechado
    if (!dispRows || dispRows.length === 0) {
      return res.status(200).json({
        horarios: TODOS_HORARIOS.map(h => ({ horario: h, disponivel: false }))
      })
    }

    // Monta set de horários abertos pela profissional
    const abertos = new Set(dispRows.filter(r => r.aberto).map(r => r.horario.substring(0,5)))

    // 2. Busca agendamentos existentes (pendente/pago/confirmado)
    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('horario, duracao')
      .eq('profissional_id', profissional_id)
      .eq('data', data)
      .in('status', ['pendente', 'pago', 'confirmado'])

    // Monta blocos de tempo já ocupados
    const bloqueados = new Set()
    ;(agendamentos || []).forEach(ag => {
      const inicio = toMin(ag.horario.substring(0,5))
      const dur = ag.duracao || 60
      for (let t = inicio; t < inicio + dur; t += 30) {
        bloqueados.add(toHHMM(t))
      }
    })

    // 3. Filtra horários passados se for hoje
    const hoje = new Date().toISOString().split('T')[0]
    const agora = new Date()
    const horaAtualMin = agora.getHours()*60 + agora.getMinutes()

    // 4. Verifica quais horários têm janela suficiente para o serviço
    const resultado = TODOS_HORARIOS.map(h => {
      const inicioMin = toMin(h)

      // Verifica se está no passado
      if (data === hoje && inicioMin <= horaAtualMin + 30) {
        return { horario: h, disponivel: false }
      }

      // Verifica se a profissional abriu este horário
      if (!abertos.has(h)) {
        return { horario: h, disponivel: false }
      }

      // Verifica se todos os slots necessários para a duração estão abertos e livres
      let temJanela = true
      for (let t = inicioMin; t < inicioMin + duracaoMin; t += 30) {
        const slot = toHHMM(t)
        if (!abertos.has(slot) || bloqueados.has(slot)) {
          temJanela = false
          break
        }
      }

      return { horario: h, disponivel: temJanela }
    })

    return res.status(200).json({ horarios: resultado })

  } catch (error) {
    console.error('[horarios-disponiveis]', error)
    return res.status(500).json({ error: 'Erro ao buscar horários' })
  }
}
