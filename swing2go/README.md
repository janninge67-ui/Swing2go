# Swing2Go

Webbshop för Swing2Go UF. *Spela mer. Betala mindre.*

**Teknik:** React + TypeScript + Tailwind CSS (Vite), Hono på Cloudflare Workers, Supabase (PostgreSQL, Auth, Storage).

En enda Worker serverar både React-appen (statiska filer) och API:t (`/api/*`).

## Kom igång lokalt

```bash
npm install
cp .env.example .env              # publika Supabase-värden för frontend
cp .dev.vars.example .dev.vars    # secrets för Workern (gitignorad)
npm run dev
```

Utan Supabase-värden visar webbplatsen demo-produkter, så du kan se designen direkt.

## Sätt upp Supabase

1. Skapa ett projekt på supabase.com.
2. Kör filerna i `supabase/migrations/` i ordning (001 till 004) i SQL Editor.
3. Kör `supabase/seed.sql` för demo-produkter (alla är märkta `is_demo`).
4. Kopiera `Project URL` och `anon`-nyckeln till `.env` och `.dev.vars`.
5. Kopiera `service_role`-nyckeln till `.dev.vars`. **Den får aldrig committas.**
6. Efter att du registrerat ditt eget konto: gör dig själv till admin i SQL Editor:
   ```sql
   update profiles set role = 'admin' where id = (select id from auth.users where email = 'din@epost.se');
   ```

## Publicera på Cloudflare

```bash
npx wrangler login
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npm run deploy
```

Ändra `SUPABASE_URL` och `SUPABASE_ANON_KEY` under `vars` i `wrangler.jsonc`. Dessa är publika värden.

## GitHub och automatisk publicering

`.github/workflows/deploy.yml` kontrollerar typer och bygger vid varje push, och publicerar när du pushar till `main`. Lägg till i GitHub-repot (Settings > Secrets and variables > Actions):

- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Innan lansering

- Ta bort demo-data: `delete from products where is_demo;`
- Bekräfta gradedefinitionerna (A/B/C) i `src/client/i18n/sv.ts`.
- Fyll i egna texter på Om oss, FAQ och Kontakt. Inget på sidan är påhittat om företaget.
