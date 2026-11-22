# CogniCare – Adaptive Cognitive Gaming Platform for Elderly Users

Capstone project (B.Tech CSE, J.C. Bose University of Science & Technology, YMCA).
Built with Next.js, React, TypeScript, Tailwind CSS and Supabase.

## Run it on your computer

1. Install Node.js 22 or newer (check with `node -v`).
2. In the project folder run `npm install` (only needed the first time, or when `package.json` changes).
3. Copy `.env.example` to `.env.local` and fill in your Supabase values (see below).
4. Run `npm run dev` and open http://localhost:3000.

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project's API settings. Set `NEXT_PUBLIC_SITE_URL` to the app address. Never put a service-role key in a `NEXT_PUBLIC_` variable.
3. For a new project, run `supabase/setup_cognicare.sql` once in the Supabase SQL Editor. It also supports a project where only the original baseline was run. It stops if later tables or legacy reminder data exist; do not use it to upgrade an existing installation. Running SQL manually does not record migration history in the Supabase CLI; reconcile that history before using CLI migrations. To check the reminder access rules in a development project, run `supabase/tests/rls_reminders.sql` (it rolls back).
4. Turn on email/password sign-in and add `http://localhost:3000/auth/callback` (and your deployed address + `/auth/callback`) to Supabase's allowed redirect URLs.

Planned features such as family invitations, voice messages and daily reports need their own schema, access policies and migrations when implemented. The setup script covers the features built today; it does not make future features available.

## How the app is organised

- `/family`: the signed-in family member adds the people they care for, sets an exit PIN and sees progress.
- `/play`: patient mode. The person taps their name and plays. No password.
- Without Supabase settings the app runs in a local demo mode that stores everything in the browser, so it can be shown with no internet.

## How saving works

Every finished game is saved in the browser first, so the games always work, even offline. When someone is signed in, new games are uploaded to their account and the account history is merged back into the device. On sign-out, the device copy is cleared once everything has been uploaded.
A caregiver can only see a patient's data after the patient approves the link.

## Useful commands

- `npm run dev` – start the app while you work
- `npm run lint` – check the code for mistakes
- `npm test` – run the automated tests for the game rules
- `npm run build` – make the production version (what Vercel runs)

Progress and plans: `docs/PROGRESS.md`.
