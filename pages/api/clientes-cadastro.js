import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { nome, telefone, email, senha } = req.body

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha' })
  }
  if (senha.length < 4) {
    return res.status(400).json({ error: 'Senha deve ter ao menos 4 caracteres' })
  }

  const { data: existing } = await supabase
    .from('clientes')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (existing) {
    return res.status(409).json({ error: 'E-mail já cadastrado' })
  }

  const senha_hash = await bcrypt.hash(senha, 10)

  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert({ nome: nome.trim(), telefone, email: email.toLowerCase(), senha_hash })
    .select('id, nome, telefone, email, data_nascimento, observacoes')
    .single()

  if (error) {
    return res.status(500).json({ error: 'Erro ao criar conta', detail: error.message })
  }

  const token = Buffer.from(JSON.stringify({ id: cliente.id, email: cliente.email, ts: Date.now() })).toString('base64')

  return res.status(201).json({ cliente, token })
}
