// pages/api/clientes/index.js
// GET: Listar clientes que já agendaram com a profissional
// PATCH /:id/nota já é outro arquivo
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function autenticarPro(req) {
  return req.headers['x-admin-secret'] ? true : false
  // Em produção, valide a senha contra o banco
}

export default async function handler(req, res) {
  if (!autenticarPro(req)) return res.status(401).json({ error: 'Não autorizado' })

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { profissional } = req.query
  if (!profissional) return res.status(400).json({ error: 'profissional é obrigatório' })

  // Buscar IDs únicos de clientes que agendaram com essa profissional
  const { data: agendamentos, error: agErr } = await supabase
    .from('agendamentos')
    .select('cliente_id, servico, data, horario, cliente_nome, cliente_telefone')
    .eq('profissional_nome', profissional)
    .order('data', { ascending: false })

  if (agErr) return res.status(500).json({ error: 'Erro ao buscar agendamentos' })

  // Pegar IDs únicos (com dados mais recentes)
  const clienteMap = {}
  agendamentos.forEach(ag => {
    if (!ag.cliente_id) return
    if (!clienteMap[ag.cliente_id]) {
      clienteMap[ag.cliente_id] = { ultimo_servico: ag.servico, ultima_data: ag.data }
    }
  })

  const clienteIds = Object.keys(clienteMap)
  if (!clienteIds.length) return res.status(200).json({ clientes: [] })

  const { data: clientes, error: cliErr } = await supabase
    .from('clientes')
    .select('id, nome, telefone, email, data_nascimento, observacoes, nota_geral')
    .in('id', clienteIds)
    .order('nome')

  if (cliErr) return res.status(500).json({ error: 'Erro ao buscar clientes' })

  // Juntar com último serviço
  const clientesComInfo = clientes.map(c => ({
    ...c,
    ultimo_servico: clienteMap[c.id]?.ultimo_servico || null,
    ultima_data: clienteMap[c.id]?.ultima_data || null,
  }))

  return res.status(200).json({ clientes: clientesComInfo })
}
