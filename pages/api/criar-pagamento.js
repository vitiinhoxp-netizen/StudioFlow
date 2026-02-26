// pages/api/criar-pagamento.js
// Cria preferência no Mercado Pago e salva agendamento como 'pendente'

import { MercadoPagoConfig, Preference } from 'mercadopago'
import { supabaseAdmin } from '../../lib/supabase'
import { enviarConfirmacaoCliente, enviarNotificacaoAdmin, enviarNotificacaoProfissional } from '../../lib/whatsapp'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const {
    cliente_nome,
    cliente_telefone,
    cliente_email,
    profissional_id,
    profissional_nome,
    servico,
    data,
    horario,
    metodo_pagamento,
  } = req.body

  // ── Validação básica ──────────────────────────────────────
  if (!cliente_nome || !cliente_telefone || !cliente_email || !profissional_id || !servico || !data || !horario) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' })
  }

  const supabase = supabaseAdmin()

  try {
    // ── 0. Busca dados da profissional (pix_key e telefone) ───
    const { data: profissional } = await supabase
      .from('profissionais')
      .select('pix_key, telefone')
      .eq('id', profissional_id)
      .single()

    const pixKey = profissional?.pix_key || process.env.NEXT_PUBLIC_PIX_KEY || ''
    const telefoneProfissional = profissional?.telefone || null

    // ── 1. Verifica se horário ainda está disponível ──────────
    const { data: conflito } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('profissional_id', profissional_id)
      .eq('data', data)
      .eq('horario', horario + ':00')
      .in('status', ['pendente', 'pago', 'confirmado'])
      .single()

    if (conflito) {
      return res.status(409).json({ error: 'Horário não disponível. Por favor, escolha outro.' })
    }

    // ── 2. Insere agendamento como 'pendente' no Supabase ─────
    const { data: agendamento, error: insertError } = await supabase
      .from('agendamentos')
      .insert({
        cliente_nome,
        cliente_telefone,
        cliente_email,
        profissional_id,
        profissional_nome,
        servico,
        data,
        horario: horario + ':00',
        metodo_pagamento: metodo_pagamento || 'pix',
        status: 'pendente',
        taxa_agendamento: 30.00,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // ── 3. Cria preferência no Mercado Pago ──────────────────
    const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })

    const preference = new Preference(mp)
    const mpResponse = await preference.create({
      body: {
        items: [{
          id: agendamento.id,
          title: `Taxa de Agendamento – ${servico}`,
          description: `${profissional_nome} · ${dataFormatada} às ${horario}`,
          quantity: 1,
          unit_price: 30.00,
          currency_id: 'BRL',
        }],
        payer: {
          name: cliente_nome,
          email: cliente_email,
          phone: { number: cliente_telefone.replace(/\D/g, '') },
        },
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: metodo_pagamento === 'pix'
            ? [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }]
            : [{ id: 'bank_transfer' }],
          installments: 1,
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/sucesso?id=${agendamento.id}`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/falha?id=${agendamento.id}`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/pendente?id=${agendamento.id}`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook-pagamento`,
        external_reference: agendamento.id,
        expires: true,
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      }
    })

    // ── 4. Salva preference_id no agendamento ────────────────
    await supabase
      .from('agendamentos')
      .update({ mp_preference_id: mpResponse.id })
      .eq('id', agendamento.id)

    // ── 5. Envia WhatsApp (async, não bloqueia resposta) ──────
    Promise.all([
      enviarConfirmacaoCliente(agendamento),
      enviarNotificacaoAdmin(agendamento),
      telefoneProfissional ? enviarNotificacaoProfissional(agendamento, telefoneProfissional) : Promise.resolve(),
    ]).then(([r1, r2]) => {
      if (r1.success || r2.success) {
        supabase.from('agendamentos')
          .update({ whatsapp_enviado: true })
          .eq('id', agendamento.id)
          .then(() => {})
      }
    })

    // ── 6. Retorna para o frontend ────────────────────────────
    return res.status(200).json({
      agendamento_id: agendamento.id,
      mp_preference_id: mpResponse.id,
      mp_init_point: mpResponse.init_point,
      mp_sandbox_init_point: mpResponse.sandbox_init_point,
      pix_key: pixKey,
    })

  } catch (error) {
    console.error('[criar-pagamento] Erro:', error)
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' })
  }
}
