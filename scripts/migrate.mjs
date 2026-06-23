import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Reading migration file...');
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20240602000000_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Executing SQL migration...');
  
  // Split SQL into statements to execute them individually if needed, 
  // but for a single block we can try rpc if we have a custom function, 
  // or use the 'sql' endpoint if we had access to the management API.
  // Since we only have the client, we'll try to execute it via postgres if possible.
  
  // Note: supabase-js doesn't have a direct 'query' method for raw SQL.
  // The best way without CLI is the SQL Editor in the Dashboard.
  
  console.log('--- SQL START ---');
  console.log(sql);
  console.log('--- SQL END ---');
  
  console.log('\n[AVISO] O SDK do Supabase (@supabase/supabase-js) não permite a execução direta de DDL (CREATE TABLE, etc.).');
  console.log('Por favor, copie o código SQL acima e cole no "SQL Editor" do seu dashboard em:');
  console.log(`${supabaseUrl.replace('.co', '.com')}/project/_/sql`);
}

runMigration();
