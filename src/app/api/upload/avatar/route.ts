import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/getAuthUser';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const form = await request.formData();
    const file = form.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Arquivo muito grande (máx 5 MB)' }, { status: 413 });

    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/avatar.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());

    // Bucket criado via SQL migration
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(path, buf, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabaseAdmin.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);

    return NextResponse.json({ avatar_url: publicUrl });
  } catch (err: unknown) {
    console.error('[Avatar Upload]', err);
    return NextResponse.json({ error: 'Erro ao salvar avatar' }, { status: 500 });
  }
}
