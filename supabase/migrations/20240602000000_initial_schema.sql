-- Create plant_stages table
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

-- Create users profile table (extending Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seeds table
CREATE TABLE seeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pots table
CREATE TABLE pots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plants table
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

-- Add plant_id to pots (one-to-one or one-to-many relationship)
ALTER TABLE pots ADD COLUMN plant_id UUID REFERENCES plants(id) ON DELETE SET NULL;

-- Create plant_versions table
CREATE TABLE plant_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    prompt_used TEXT,
    dna_snapshot JSONB NOT NULL,
    stage_id UUID REFERENCES plant_stages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    item_type TEXT NOT NULL, -- seed, pot
    amount DECIMAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed', -- for MVP we mock as completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gifts table
CREATE TABLE gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id),
    recipient_id UUID REFERENCES profiles(id),
    item_type TEXT NOT NULL, -- seed, pot, plant
    item_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial data for plant_stages
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
('grande_3', 'Grande 3', 13, 3, false, 'Full grown botanical masterpiece');
