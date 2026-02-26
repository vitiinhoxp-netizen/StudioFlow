// pages/api/clientes/auth.js
// POST: Login da cliente
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, senha } = req.body
  if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' })

  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('id, nome, telefone, email, senha_hash, data_nascimento, observacoes')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (error || !cliente) return res.status(401).json({ error: 'E-mail ou senha incorretos' })

  const ok = await bcrypt.compare(senha, cliente.senha_hash)
  if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos' })

  const { senha_hash, ...clientePublico } = cliente
  const token = Buffer.from(JSON.stringify({ id: cliente.id, email: cliente.email, ts: Date.now() })).toString('base64')

  return res.status(200).json({ cliente: clientePublico, token })
}
