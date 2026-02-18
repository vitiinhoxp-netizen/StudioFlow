// pages/api/agendamentos.js
// CRUD de agendamentos para o painel admin

import { supabaseAdmin } from '../../lib/supabase'
import { enviarCancelamento } from '../../lib/whatsapp'

// Senha admin simples (em produção, use NextAuth ou Supabase Auth)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'

function checkAuth(req) {
  const auth = req.headers['x-admin-secret'] || req.query.secret
  return auth === ADMIN_SECRET
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Não autorizado' })
  }

  const supabase = supabaseAdmin()

  // ── GET: listar agendamentos ──────────────────────────────
  if (req.method === 'GET') {
    const { data, inicio, fim, profissional, status, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let query = supabase
      .from('agendamentos')
      .select('*', { count: 'exact' })
      .order('data', { ascending: true })
      .order('horario', { ascending: true })
      .range(offset, offset + Number(limit) - 1)

    if (data) query = query.eq('data', data)
    if (inicio) query = query.gte('data', inicio)
    if (fim) query = query.lte('data', fim)
    if (profissional) query = query.eq('profissional_nome', profissional)
    if (status) query = query.eq('status', status)

    const { data: agendamentos, error, count } = await query

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ agendamentos, total: count, page: Number(page), limit: Number(limit) })
  }

  // ── PATCH: atualizar status ───────────────────────────────
  if (req.method === 'PATCH') {
    const { id, status, observacoes } = req.body

    if (!id || !status) {
      return res.status(400).json({ error: 'id e status são obrigatórios' })
    }

    const statusValidos = ['pendente', 'pago', 'confirmado', 'cancelado']
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' })
    }

    // Busca agendamento antes de atualizar
    const { data: agendamentoAtual } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('id', id)
      .single()

    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .update({ status, observacoes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Envia WhatsApp de cancelamento se necessário
    if (status === 'cancelado' && agendamentoAtual?.status !== 'cancelado') {
      enviarCancelamento(agendamento, observacoes).catch(console.error)
    }

    return res.status(200).json({ agendamento })
  }

  // ── DELETE: remover agendamento ───────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id obrigatório' })

    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
