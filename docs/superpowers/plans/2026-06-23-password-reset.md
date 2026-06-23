# Password Reset Flow — Recuperação de Senha

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar fluxo completo de recuperação de senha: link "Esqueceu?" no login → página de e-mail → Supabase envia link → página para definir nova senha.

**Architecture:** Supabase Auth nativo (`resetPasswordForEmail` + `onAuthStateChange` PASSWORD_RECOVERY event + `updateUser`). Três páginas simples em Next.js App Router. Sem API route nova — o envio de e-mail é 100% gerenciado pelo Supabase. O estilo segue exatamente o da página de login existente (stone + green, lucide icons).

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript strict, Supabase JS client (`@supabase/supabase-js`), lucide-react.

## Global Constraints

- TypeScript strict — zero `any`, zero erros em `tsc --noEmit`
- Estilo visual idêntico ao de `/login` (bg-stone-50, card branco, inputs stone-50, botão green-600)
- `supabase` importado de `@/lib/supabase` (client-side)
- Nenhuma nova dependência npm
- `redirectTo` URL: `${window.location.origin}/redefinir-senha` (funciona tanto em dev quanto em produção)

## Pré-requisito manual (Supabase Dashboard)

Adicionar as duas URLs à lista de Redirect URLs permitidas em:
`https://supabase.com/dashboard/project/cnsrpukgnsdxznhlyyvr/auth/url-configuration`

```
https://brotaria.vercel.app/redefinir-senha
http://localhost:3000/redefinir-senha
```

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/app/login/page.tsx` | Modificar | Adiciona link "Esqueceu a senha?" |
| `src/app/esqueci-senha/page.tsx` | Criar | Formulário de e-mail + chamada resetPasswordForEmail |
| `src/app/redefinir-senha/page.tsx` | Criar | Detecta PASSWORD_RECOVERY + formulário nova senha |

---

## Task 1 — Página `/esqueci-senha` + link no login

**Files:**
- Create: `src/app/esqueci-senha/page.tsx`
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Criar `src/app/esqueci-senha/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import NavLink from '@/components/NavLink';
import { Flower, Mail, Loader2, CheckCircle } from 'lucide-react';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setLoading(false);
    if (error) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.');
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-3 rounded-xl mb-4">
            <Flower className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-stone-800">Recuperar senha</h1>
          <p className="text-stone-500 text-sm text-center">
            Informe seu e-mail e enviaremos um link para redefinir sua senha
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <p className="text-stone-700 font-bold text-center">
              E-mail enviado!
            </p>
            <p className="text-stone-500 text-sm text-center">
              Verifique sua caixa de entrada (e a pasta de spam) para o link de redefinição.
            </p>
            <NavLink
              href="/login"
              className="mt-2 text-green-600 font-bold hover:underline text-sm"
            >
              ← Voltar ao login
            </NavLink>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  E-mail cadastrado
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar link de recuperação'}
              </button>
            </form>

            <p className="mt-6 text-center text-stone-500 text-sm">
              <NavLink href="/login" className="text-green-600 font-bold hover:underline">
                ← Voltar ao login
              </NavLink>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar link "Esqueceu a senha?" em `src/app/login/page.tsx`**

Localizar o bloco da label de Senha:
```tsx
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Senha</label>
```

Substituir por:
```tsx
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Senha</label>
              <NavLink href="/esqueci-senha" className="text-xs text-green-600 hover:underline font-medium">
                Esqueceu a senha?
              </NavLink>
            </div>
```

- [ ] **Step 3: Verificar tipos**

```powershell
cd "C:\Users\mathe\Projetos\brotaria"
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```powershell
git add src/app/esqueci-senha/page.tsx src/app/login/page.tsx
git commit -m "feat: add forgot password page and link on login"
```

---

## Task 2 — Página `/redefinir-senha`

**Files:**
- Create: `src/app/redefinir-senha/page.tsx`

**Como funciona o fluxo Supabase:**
O link no e-mail leva o usuário para `/redefinir-senha?code=XXX`. O Supabase processa o `code` automaticamente via `onAuthStateChange` e dispara o evento `PASSWORD_RECOVERY`. A página escuta esse evento e exibe o formulário de nova senha.

- [ ] **Step 1: Criar `src/app/redefinir-senha/page.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NavLink from '@/components/NavLink';
import { Flower, Lock, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false); // true quando o token foi validado
  const router = useRouter();

  useEffect(() => {
    // Supabase processa o token do link e dispara PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError('Não foi possível redefinir a senha. O link pode ter expirado — solicite um novo.');
    } else {
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  // Senha redefinida com sucesso
  if (done) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-8 text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-stone-800 mb-2">Senha redefinida!</h1>
          <p className="text-stone-500 text-sm">
            Você será redirecionado ao login em instantes...
          </p>
          <NavLink href="/login" className="mt-6 inline-block text-green-600 font-bold hover:underline text-sm">
            Ir para o login agora
          </NavLink>
        </div>
      </div>
    );
  }

  // Aguardando o token ser validado pelo Supabase
  if (!ready) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-8 text-center">
          <Loader2 className="w-10 h-10 text-green-500 mx-auto mb-4 animate-spin" />
          <p className="text-stone-500 text-sm">Validando link de recuperação...</p>
          <p className="text-stone-400 text-xs mt-3">
            Se esta tela persistir,{' '}
            <NavLink href="/esqueci-senha" className="text-green-600 hover:underline">
              solicite um novo link
            </NavLink>
            .
          </p>
        </div>
      </div>
    );
  }

  // Token válido — formulário de nova senha
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-3 rounded-xl mb-4">
            <Flower className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-stone-800">Nova senha</h1>
          <p className="text-stone-500 text-sm">Escolha uma senha forte para sua conta</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
              Nova senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
              Confirmar senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                placeholder="Repita a nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 3: Smoke test**

```powershell
npm run dev
```

Roteiro:
1. Abrir `/login` → link "Esqueceu a senha?" deve aparecer abaixo do label "Senha"
2. Clicar → vai para `/esqueci-senha`
3. Digitar e-mail cadastrado → clicar "Enviar link" → mensagem de sucesso
4. Abrir e-mail recebido → clicar no link → vai para `/redefinir-senha`
5. Tela de loading enquanto o token é validado
6. Formulário de nova senha aparece → digitar senha → confirmar
7. Tela de sucesso → redireciona para `/login` após 3s

**Nota:** Para testar em dev local, configure o Supabase para enviar e-mails reais ou use o Supabase Dashboard para ver o link gerado em Authentication > Users > ações do usuário.

- [ ] **Step 4: Commit**

```powershell
git add src/app/redefinir-senha/page.tsx
git commit -m "feat: add password reset page with Supabase PASSWORD_RECOVERY flow"
```

---

## Self-review

### Spec coverage
- [x] Task 1 — `/esqueci-senha`: e-mail input + `resetPasswordForEmail` + estado de sucesso + link de volta ao login
- [x] Task 1 — `/login`: link "Esqueceu a senha?" junto ao campo de senha
- [x] Task 2 — `/redefinir-senha`: detecta `PASSWORD_RECOVERY` event + loading state + formulário nova senha + validação + `updateUser` + sucesso com redirect

### Verificações adicionais
- `window.location.origin` em `redirectTo` funciona em todos os ambientes (localhost e produção). ✓
- `onAuthStateChange` retorna `subscription` para unsubscribe no cleanup do useEffect. ✓
- `done` state redireciona após 3s mas também oferece link imediato caso o usuário não queira esperar. ✓
- Validação client-side mínima: senhas iguais e ≥6 caracteres. O Supabase também valida server-side. ✓
- A tela "validando..." com link para solicitar novo link cobre o caso de token expirado ou inválido. ✓

### Pré-requisito de deploy
Antes de funcionar em produção, adicionar no dashboard Supabase:
- `https://brotaria.vercel.app/redefinir-senha`
- `http://localhost:3000/redefinir-senha`

Em: Project Settings → Authentication → URL Configuration → Redirect URLs
