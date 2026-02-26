// pages/api/clientes/perfil.js
// PATCH: Atualizar perfil da cliente (dados complementares)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function getClienteIdFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  try {
    const payload = JSON.parse(Buffer.from(authHeader.replace('Bearer ', ''), 'base64').toString())
    return payload.id
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const clienteId = getClienteIdFromToken(req.headers.authorization)
  if (!clienteId) return res.status(401).json({ error: 'Não autorizado' })

  const { telefone, data_nascimento, observacoes } = req.body
  const updates = {}
  if (telefone !== undefined) updates.telefone = telefone
  if (data_nascimento !== undefined) updates.data_nascimento = data_nascimento
  if (observacoes !== undefined) updates.observacoes = observacoes

  const { data: cliente, error } = await supabase
    .from('clientes')
    .update(updates)
    .eq('id', clienteId)
    .select('id, nome, telefone, email, data_nascimento, observacoes')
    .single()

  if (error) return res.status(500).json({ error: 'Erro ao atualizar perfil' })

  return res.status(200).json({ cliente })
}
