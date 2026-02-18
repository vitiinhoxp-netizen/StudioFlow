-- ═══════════════════════════════════════════════════════════
-- STUDIO FLOW – Schema do Banco de Dados (Supabase / PostgreSQL)
-- Execute este script no SQL Editor do Supabase:
-- https://app.supabase.com → seu projeto → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- 1. PROFISSIONAIS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profissionais (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  servicos    TEXT[] NOT NULL,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed das profissionais
INSERT INTO profissionais (nome, servicos) VALUES
  ('Raquel Verusa',  ARRAY['Extensão de Cílios', 'Sobrancelha']),
  ('Samara Sodré',   ARRAY['Micropigmentação', 'Extensão de Cílios', 'Sobrancelha']),
  ('Joyce Souza',    ARRAY['Depilação', 'Extensão de Cílios', 'Sobrancelha'])
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- 2. AGENDAMENTOS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agendamentos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Cliente
  cliente_nome        TEXT NOT NULL,
  cliente_telefone    TEXT NOT NULL,
  cliente_email       TEXT NOT NULL,
  -- Serviço
  profissional_id     UUID REFERENCES profissionais(id),
  profissional_nome   TEXT NOT NULL,
  servico             TEXT NOT NULL,
  data                DATE NOT NULL,
  horario             TIME NOT NULL,
  -- Pagamento
  status              TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','pago','confirmado','cancelado')),
  metodo_pagamento    TEXT CHECK (metodo_pagamento IN ('pix','cartao')),
  taxa_agendamento    NUMERIC(10,2) DEFAULT 30.00,
  -- Mercado Pago
  mp_preference_id    TEXT,
  mp_payment_id       TEXT,
  mp_payment_status   TEXT,
  -- Controle
  whatsapp_enviado    BOOLEAN DEFAULT FALSE,
  observacoes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. HORÁRIOS BLOQUEADOS (folgas, feriados)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS horarios_bloqueados (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID REFERENCES profissionais(id),
  data            DATE NOT NULL,
  horario         TIME,          -- NULL = dia inteiro bloqueado
  motivo          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 4. TRIGGER: updated_at automático
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agendamentos_updated_at ON agendamentos;
CREATE TRIGGER agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 5. RLS (Row Level Security)
-- ─────────────────────────────────────────
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler profissionais (público)
CREATE POLICY "profissionais_read" ON profissionais FOR SELECT USING (TRUE);

-- Qualquer um pode inserir agendamento (cliente)
CREATE POLICY "agendamentos_insert" ON agendamentos FOR INSERT WITH CHECK (TRUE);

-- Somente service_role pode ler/atualizar agendamentos (admin/backend)
CREATE POLICY "agendamentos_service_read" ON agendamentos
  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "agendamentos_service_update" ON agendamentos
  FOR UPDATE USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────
-- 6. ÍNDICES para performance
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional ON agendamentos(profissional_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_mp_payment ON agendamentos(mp_payment_id);

-- ─────────────────────────────────────────
-- 7. VIEW útil para o painel admin
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_agendamentos_hoje AS
SELECT
  a.id,
  a.cliente_nome,
  a.cliente_telefone,
  a.profissional_nome,
  a.servico,
  a.data,
  a.horario,
  a.status,
  a.metodo_pagamento,
  a.taxa_agendamento,
  a.created_at
FROM agendamentos a
WHERE a.data = CURRENT_DATE
ORDER BY a.horario;
