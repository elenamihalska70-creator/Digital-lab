# React + Vite

## Local portal recovery

The public build retires `/login`, `/dashboard`, `/espace-client` and `/admin`.
For authorized recovery, use an isolated local checkout and start Vite on loopback:

```sh
VITE_ENABLE_LOCAL_PORTAL=true npm run dev -- --host 127.0.0.1
```

Set the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in an ignored
`.env.local` for the intended project, then open `/login` and sign in with an
existing account. The admin view still requires the existing admin profile role.
Use a test project for routine checks. Only the Vite development server on
loopback can enable recovery. All built output, including Preview and builds
using development mode, disables the portal even when the recovery flag is set.

This switch only controls the website. Review new-user sign-up and OAuth provider
settings in Supabase separately before restricting account creation. Existing
portal links in old emails lead to the retirement notice on the public site.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
