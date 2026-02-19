// pages/api/disponibilidade.js
// Gerencia disponibilidade das profissionais por dia

import { supabaseAdmin } from '../../lib/supabase'

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

  // GET: buscar disponibilidade de uma profissional em uma data
  if (req.method === 'GET') {
    const { profissional_id, data } = req.query
    if (!profissional_id || !data) {
      return res.status(400).json({ error: 'profissional_id e data são obrigatórios' })
    }

    const { data: rows, error } = await supabase
      .from('disponibilidades')
      .select('horario, aberto')
      .eq('profissional_id', profissional_id)
      .eq('data', data)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ horarios: rows || [] })
  }

  // POST: salvar disponibilidade
  if (req.method === 'POST') {
    const { profissional_id, data, horarios } = req.body

    if (!profissional_id || !data || !Array.isArray(horarios)) {
      return res.status(400).json({ error: 'Dados inválidos' })
    }

    // Remove disponibilidades antigas desta data/profissional
    await supabase
      .from('disponibilidades')
      .delete()
      .eq('profissional_id', profissional_id)
      .eq('data', data)

    // Insere as novas
    const rows = horarios.map(({ horario, aberto }) => ({
      profissional_id,
      data,
      horario,
      aberto,
    }))

    const { error } = await supabase.from('disponibilidades').insert(rows)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
