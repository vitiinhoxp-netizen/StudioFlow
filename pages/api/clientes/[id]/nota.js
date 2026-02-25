// pages/api/clientes/[id]/nota.js
// PATCH: Salvar anotação geral da cliente (visível a todas as profissionais)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })
  if (!req.headers['x-admin-secret']) return res.status(401).json({ error: 'Não autorizado' })

  const { id } = req.query
  const { nota_geral } = req.body

  const { error } = await supabase
    .from('clientes')
    .update({ nota_geral: nota_geral || null })
    .eq('id', id)

  if (error) return res.status(500).json({ error: 'Erro ao salvar anotação' })

  return res.status(200).json({ ok: true })
}
