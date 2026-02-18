// pages/api/webhook-pagamento.js
// Recebe notificações do Mercado Pago e atualiza o status

import { MercadoPagoConfig, Payment } from 'mercadopago'
import { supabaseAdmin } from '../../lib/supabase'
import { enviarPagamentoConfirmado } from '../../lib/whatsapp'
import crypto from 'crypto'

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  // ── Verificação de assinatura (segurança) ─────────────────
  // O MP envia x-signature no header para validar a autenticidade
  const signature = req.headers['x-signature']
  const requestId = req.headers['x-request-id']

  if (process.env.MERCADOPAGO_WEBHOOK_SECRET && signature) {
    const ts = signature.split(',').find(s => s.startsWith('ts='))?.split('=')[1]
    const v1 = signature.split(',').find(s => s.startsWith('v1='))?.split('=')[1]
    const manifest = `id:${req.query['data.id']};request-id:${requestId};ts:${ts};`
    const hmac = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex')

    if (hmac !== v1) {
      console.warn('[webhook] Assinatura inválida')
      return res.status(401).json({ error: 'Assinatura inválida' })
    }
  }

  const { type, data } = req.body

  // ── Apenas eventos de pagamento ───────────────────────────
  if (type !== 'payment') {
    return res.status(200).json({ received: true })
  }

  const supabase = supabaseAdmin()

  try {
    // ── Busca detalhes do pagamento no MP ─────────────────────
    const payment = new Payment(mp)
    const mpPayment = await payment.get({ id: data.id })

    const paymentId = mpPayment.id?.toString()
    const paymentStatus = mpPayment.status
    const externalReference = mpPayment.external_reference // = agendamento.id

    console.log(`[webhook] payment_id=${paymentId} status=${paymentStatus} ref=${externalReference}`)

    if (!externalReference) {
      return res.status(200).json({ received: true, warning: 'Sem external_reference' })
    }

    // ── Mapeia status MP → status interno ────────────────────
    const statusMap = {
      approved: 'pago',
      pending: 'pendente',
      in_process: 'pendente',
      rejected: 'cancelado',
      cancelled: 'cancelado',
      refunded: 'cancelado',
      charged_back: 'cancelado',
    }
    const novoStatus = statusMap[paymentStatus] || 'pendente'

    // ── Atualiza agendamento no Supabase ──────────────────────
    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .update({
        mp_payment_id: paymentId,
        mp_payment_status: paymentStatus,
        status: novoStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', externalReference)
      .select()
      .single()

    if (error) {
      console.error('[webhook] Erro ao atualizar:', error)
      return res.status(500).json({ error: 'Erro ao atualizar agendamento' })
    }

    // ── Se aprovado, envia WhatsApp de confirmação ────────────
    if (novoStatus === 'pago' && agendamento) {
      await enviarPagamentoConfirmado(agendamento)

      // Marca como confirmado após o WA ser enviado
      await supabase
        .from('agendamentos')
        .update({ status: 'confirmado' })
        .eq('id', externalReference)
    }

    return res.status(200).json({ received: true, status: novoStatus })

  } catch (error) {
    console.error('[webhook] Erro geral:', error)
    // Retorna 200 para o MP não retentar (pode ser handled depois)
    return res.status(200).json({ received: true, error: error.message })
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
}
