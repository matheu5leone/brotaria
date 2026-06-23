-- ################################################
-- BROTARIA - SCRIPT DE INICIALIZAÇÃO COMPLETO
-- Cole este script no SQL Editor do Supabase
-- ################################################

-- 1. LIMPEZA (OPCIONAL - CUIDADO)
-- DROP TABLE IF EXISTS gifts CASCADE;
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS plant_versions CASCADE;
-- DROP TABLE IF EXISTS plants CASCADE;
-- DROP TABLE IF EXISTS pots CASCADE;
-- DROP TABLE IF EXISTS seeds CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS plant_stages CASCADE;

-- 2. TABELAS DE CONFIGURAÇÃO
CREATE TABLE plant_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    waters_required INTEGER NOT NULL DEFAULT 3,
    generate_image BOOLEAN NOT NULL DEFAULT false,
    prompt_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELAS DE USUÁRIO E INVENTÁRIO
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- Relacionado ao auth.users.id
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE seeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE PLANTAS (CORE)
CREATE TABLE plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    pot_id UUID REFERENCES pots(id) ON DELETE SET NULL,
    dna JSONB NOT NULL,
    current_stage_id UUID REFERENCES plant_stages(id),
    current_stage_waters INTEGER NOT NULL DEFAULT 0,
    last_watered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_water_needed_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 hours'),
    hydration_status TEXT NOT NULL DEFAULT 'hydrated', -- hydrated, waiting_water, paused
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar referência circular controlada
ALTER TABLE pots ADD COLUMN plant_id UUID REFERENCES plants(id) ON DELETE SET NULL;

-- 5. HISTÓRICO E VERSÕES VISUAIS
CREATE TABLE plant_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    prompt_used TEXT,
    dna_snapshot JSONB NOT NULL,
    stage_id UUID REFERENCES plant_stages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ECONOMIA E SOCIEDADE
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    item_type TEXT NOT NULL, -- seed, pot
    amount DECIMAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id),
    recipient_id UUID REFERENCES profiles(id),
    item_type TEXT NOT NULL, -- seed, pot, plant
    item_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. DADOS INICIAIS (OBRIGATÓRIOS)
INSERT INTO plant_stages (code, name, order_index, waters_required, generate_image, prompt_context) VALUES
('enterrada', 'Enterrada', 1, 3, false, 'Seed buried in soil'),
('broto_1', 'Broto 1', 2, 3, true, 'First sprout appearing'),
('broto_2', 'Broto 2', 3, 3, false, 'Growing sprout'),
('broto_3', 'Broto 3', 4, 3, false, 'Sprout getting bigger'),
('pequena_1', 'Pequena 1', 5, 3, true, 'Small plant with first leaves'),
('pequena_2', 'Pequena 2', 6, 3, false, 'Growing small plant'),
('pequena_3', 'Pequena 3', 7, 3, false, 'Sturdy small plant'),
('media_1', 'Média 1', 8, 3, true, 'Medium sized plant with branches'),
('media_2', 'Média 2', 9, 3, false, 'Developing medium plant'),
('media_3', 'Média 3', 10, 3, false, 'Thriving medium plant'),
('grande_1', 'Grande 1', 11, 3, true, 'Large mature plant'),
('grande_2', 'Grande 2', 12, 3, false, 'Majestic large plant'),
('grande_3', 'Grande 3', 13, 3, false, 'Full grown botanical masterpiece')
ON CONFLICT (code) DO NOTHING;

-- 8. POLÍTICAS BÁSICAS DE SEGURANÇA (RLS)
-- Nota: Habilitar RLS é recomendado para produção.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pots ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

-- Políticas simples para o MVP (Permitir acesso se autenticado)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage their own seeds" ON seeds FOR ALL USING (true);
CREATE POLICY "Users can manage their own pots" ON pots FOR ALL USING (true);
CREATE POLICY "Users can manage their own plants" ON plants FOR ALL USING (true);
