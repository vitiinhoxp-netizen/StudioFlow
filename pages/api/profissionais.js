// pages/api/profissionais.js
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('profissionais')
    .select('id, nome, servicos')
    .eq('ativo', true)
    .order('nome')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ profissionais: data })
}
