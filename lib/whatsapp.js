// lib/whatsapp.js
// Integração com Z-API (https://z-api.io)
// Para usar Evolution API (gratuita/self-hosted), ajuste a função sendMessage

import axios from 'axios'

const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN
const STUDIO_NUMBER = process.env.STUDIO_WHATSAPP

// ─────────────────────────────────────────
// Função base de envio
// ─────────────────────────────────────────
async function sendMessage(phone, message) {
  // Normaliza telefone → somente dígitos com DDI 55
  const normalized = normalizePhone(phone)

  try {
    const response = await axios.post(
      `${ZAPI_BASE}/send-text`,
      { phone: normalized, message },
      { headers: { 'Client-Token': CLIENT_TOKEN, 'Content-Type': 'application/json' } }
    )
    console.log(`[WhatsApp] Mensagem enviada para ${normalized}:`, response.data)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar:', error.response?.data || error.message)
    return { success: false, error: error.message }
  }
}

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  // Se já começa com 55, mantém; senão adiciona
  if (digits.startsWith('55')) return digits
  return '55' + digits
}

// ─────────────────────────────────────────
// 1. Confirmação para a CLIENTE
// ─────────────────────────────────────────
export async function enviarConfirmacaoCliente(agendamento) {
  const { cliente_nome, cliente_telefone, profissional_nome, servico, data, horario } = agendamento

  const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  })

  const msg = `✨ *Studio Flow* ✨

Olá, *${cliente_nome}*! Seu agendamento foi recebido com sucesso! 🎉

📋 *Detalhes do agendamento:*
💅 Serviço: ${servico}
👩‍🦰 Profissional: ${profissional_nome}
📅 Data: ${dataFormatada}
🕐 Horário: ${horario.substring(0, 5)}

💳 *Status:* Aguardando confirmação do pagamento

Assim que confirmarmos o pagamento da taxa de agendamento (R$ 30,00), você receberá uma nova mensagem. 😊

Qualquer dúvida, estamos por aqui!
_Studio Flow – Beleza & Bem-estar_ 🌸`

  return sendMessage(cliente_telefone, msg)
}

// ─────────────────────────────────────────
// 2. Pagamento confirmado → cliente
// ─────────────────────────────────────────
export async function enviarPagamentoConfirmado(agendamento) {
  const { cliente_nome, cliente_telefone, profissional_nome, servico, data, horario } = agendamento

  const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  })

  const msg = `✅ *Pagamento Confirmado!*

Olá, *${cliente_nome}*! Seu agendamento está *confirmado*! 🎊

📋 *Resumo:*
💅 ${servico}
👩‍🦰 ${profissional_nome}
📅 ${dataFormatada} às ${horario.substring(0, 5)}

📍 *Studio Flow*
🕐 Chegue com 5 minutinhos de antecedência

Te esperamos! 💖
_Studio Flow_`

  return sendMessage(cliente_telefone, msg)
}

// ─────────────────────────────────────────
// 3. Novo agendamento → ADMIN do estúdio
// ─────────────────────────────────────────
export async function enviarNotificacaoAdmin(agendamento) {
  if (!STUDIO_NUMBER) return { success: false, error: 'STUDIO_WHATSAPP não configurado' }

  const { cliente_nome, cliente_telefone, profissional_nome, servico, data, horario, metodo_pagamento } = agendamento

  const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  const msg = `🔔 *Novo Agendamento – Studio Flow*

👤 Cliente: ${cliente_nome}
📱 Telefone: ${cliente_telefone}
💅 Serviço: ${servico}
👩‍🦰 Profissional: ${profissional_nome}
📅 Data: ${dataFormatada} às ${horario.substring(0, 5)}
💳 Pagamento: ${metodo_pagamento === 'pix' ? 'PIX' : 'Cartão'}
💰 Taxa: R$ 30,00

_Acesse o painel para confirmar._`

  return sendMessage(STUDIO_NUMBER, msg)
}

// ─────────────────────────────────────────
// 4. Cancelamento → cliente
// ─────────────────────────────────────────
export async function enviarCancelamento(agendamento, motivo = '') {
  const { cliente_nome, cliente_telefone, servico, data, horario } = agendamento

  const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit'
  })

  const msg = `❌ *Agendamento Cancelado*

Olá, *${cliente_nome}*,

Infelizmente seu agendamento foi cancelado:
💅 ${servico} em ${dataFormatada} às ${horario.substring(0, 5)}
${motivo ? `📝 Motivo: ${motivo}` : ''}

Entre em contato para reagendar. 💙
_Studio Flow_`

  return sendMessage(cliente_telefone, msg)
}

// ─────────────────────────────────────────
// 5. Lembrete (pode ser chamado por cron)
// ─────────────────────────────────────────
export async function enviarLembrete(agendamento) {
  const { cliente_nome, cliente_telefone, profissional_nome, servico, horario } = agendamento

  const msg = `⏰ *Lembrete – Studio Flow*

Olá, *${cliente_nome}*! Passando para lembrar que você tem horário *amanhã*! 😊

💅 ${servico}
👩‍🦰 ${profissional_nome}
🕐 ${horario.substring(0, 5)}

Nos vemos amanhã! 🌸
_Studio Flow_`

  return sendMessage(cliente_telefone, msg)
}
