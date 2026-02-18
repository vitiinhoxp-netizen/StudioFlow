# 🌸 Studio Flow – Sistema de Agendamento

Sistema completo de agendamento para estúdio de beleza com:
- **Frontend** mobile-first em HTML/CSS/JS puro
- **Backend** Next.js API Routes
- **Banco de dados** Supabase (PostgreSQL)
- **Pagamentos** Mercado Pago (PIX + Cartão)
- **WhatsApp** automático via Z-API
- **Deploy** na Vercel (gratuito)

---

## 📁 Estrutura do Projeto

```
studio-flow/
├── lib/
│   ├── supabase.js          # Cliente Supabase (público + admin)
│   └── whatsapp.js          # Envio de mensagens Z-API
├── pages/
│   └── api/
│       ├── profissionais.js      # GET profissionais
│       ├── criar-pagamento.js    # POST agendamento + preferência MP
│       ├── webhook-pagamento.js  # POST webhook Mercado Pago
│       ├── agendamentos.js       # GET/PATCH/DELETE (admin)
│       ├── horarios-disponiveis.js # GET horários livres
│       └── cron-lembretes.js     # GET cron diário (18h)
├── public/
│   └── index.html           # Frontend completo (mobile-first)
├── supabase-schema.sql      # Schema do banco de dados
├── vercel.json              # Cron config
├── .env.local.example       # Template de variáveis de ambiente
├── next.config.js
└── package.json
```

---

## 🚀 Passo a passo para colocar no ar

### 1️⃣ Supabase (banco de dados)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Crie um novo projeto (anote a senha do banco)
3. Vá em **SQL Editor** e cole todo o conteúdo de `supabase-schema.sql`
4. Execute o script (botão **Run**)
5. Vá em **Settings → API** e copie:
   - `Project URL`
   - `anon public key`
   - `service_role key` ⚠️ (mantenha secreta!)

---

### 2️⃣ Mercado Pago

1. Acesse [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Crie uma aplicação em **Suas integrações**
3. Copie:
   - **Access Token** (começa com `TEST-` em sandbox)
   - **Public Key** (começa com `TEST-` em sandbox)
4. Configure o **Webhook**:
   - URL: `https://SEU_APP.vercel.app/api/webhook-pagamento`
   - Eventos: `payment`
   - Copie o **Webhook Secret**

> 💡 Para produção, use as credenciais de **Produção** (sem `TEST-`)

---

### 3️⃣ Z-API (WhatsApp)

1. Acesse [z-api.io](https://z-api.io) e crie uma conta
2. Crie uma instância e conecte seu WhatsApp (escaneie o QR code)
3. Copie **Instance ID**, **Token** e **Client Token**
4. O número do WhatsApp deve permanecer conectado (celular com internet)

> 💡 **Alternativa gratuita**: [Evolution API](https://github.com/EvolutionAPI/evolution-api) (self-hosted no Railway/Render)

---

### 4️⃣ Vercel (deploy)

**Opção A – via GitHub (recomendado):**
```bash
# 1. Crie repositório no GitHub e faça push
git init
git add .
git commit -m "Studio Flow inicial"
git remote add origin https://github.com/SEU_USUARIO/studio-flow.git
git push -u origin main

# 2. Acesse vercel.com → New Project → importe do GitHub
# 3. Configure as variáveis de ambiente (próximo passo)
```

**Opção B – via CLI:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

### 5️⃣ Variáveis de ambiente na Vercel

No painel da Vercel → seu projeto → **Settings → Environment Variables**, adicione:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token do MP |
| `MERCADOPAGO_PUBLIC_KEY` | Public key do MP |
| `MERCADOPAGO_WEBHOOK_SECRET` | Webhook secret do MP |
| `ZAPI_INSTANCE_ID` | Instance ID da Z-API |
| `ZAPI_TOKEN` | Token da Z-API |
| `ZAPI_CLIENT_TOKEN` | Client token da Z-API |
| `STUDIO_WHATSAPP` | Número do estúdio (ex: `5511999999999`) |
| `NEXT_PUBLIC_APP_URL` | URL da Vercel (ex: `https://studio-flow.vercel.app`) |
| `ADMIN_SECRET` | Senha do admin (defina você mesmo) |
| `CRON_SECRET` | Senha para o cron de lembretes |

---

### 6️⃣ Instalação local (desenvolvimento)

```bash
cd studio-flow
npm install

# Copie e preencha as variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com suas credenciais

npm run dev
# Acesse: http://localhost:3000
```

---

## 🔐 Senhas padrão (demo)

| Perfil | Senha |
|--------|-------|
| Admin | Definida em `ADMIN_SECRET` |
| Profissional | `pro123` (altere em produção) |

---

## 💬 Mensagens WhatsApp automáticas

| Evento | Destinatário |
|--------|-------------|
| Novo agendamento | Cliente + Estúdio (admin) |
| Pagamento confirmado | Cliente |
| Agendamento cancelado | Cliente |
| Lembrete (dia anterior) | Cliente (cron 18h) |

---

## 🧪 Testando pagamentos

Use os dados de teste do Mercado Pago:

**Cartão aprovado:**
- Número: `5031 7557 3453 0604`
- Nome: `APRO`
- Vencimento: qualquer data futura
- CVV: `123`

**PIX:** Gera QR code automaticamente em sandbox.

---

## 📞 Suporte

Qualquer dúvida sobre a configuração, entre em contato! 🌸
