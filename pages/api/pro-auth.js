// pages/api/pro-auth.js
import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  const supabase = supabaseAdmin()

  // POST: validar login
  if (req.method === 'POST') {
    const { profissional_id, senha } = req.body
    if (!profissional_id || !senha) return res.status(400).json({ error: 'Dados inválidos' })

    const { data, error } = await supabase
      .from('profissionais')
      .select('id, nome, senha')
      .eq('id', profissional_id)
      .single()

    if (error || !data) return res.status(401).json({ error: 'Profissional não encontrado' })
    
    const senhaCorreta = data.senha || 'flow2026'
    if (senha !== senhaCorreta) return res.status(401).json({ error: 'Senha incorreta' })

    return res.status(200).json({ ok: true })
  }

  // PATCH: alterar senha
  if (req.method === 'PATCH') {
    const { profissional_id, senha_atual, senha_nova } = req.body
    if (!profissional_id || !senha_atual || !senha_nova) return res.status(400).json({ error: 'Dados inválidos' })

    const { data, error } = await supabase
      .from('profissionais')
      .select('id, senha')
      .eq('id', profissional_id)
      .single()

    if (error || !data) return res.status(401).json({ error: 'Profissional não encontrado' })

    const senhaCorreta = data.senha || 'flow2026'
    if (senha_atual !== senhaCorreta) return res.status(401).json({ error: 'Senha atual incorreta' })

    const { error: updateError } = await supabase
      .from('profissionais')
      .update({ senha: senha_nova })
      .eq('id', profissional_id)

    if (updateError) return res.status(500).json({ error: 'Erro ao atualizar senha' })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Método não permitido' })
}
