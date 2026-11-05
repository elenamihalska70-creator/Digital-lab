# LOT SEC-EMAIL-02 — Neutralisation de `api/send-quote-email.js`

**Statut : en Production depuis le 2026-11-05**, commit `3fa2efb` sur `main` (contenu identique à `origin/release/sec-email-02-aios` `9454fa5`). `feat/notify-01` a intégré ce commit (fusion `7b9c0e9`), et son `api/send-quote-email.js` est **exactement** celui de `3fa2efb`.

- Le premier correctif de cette branche (`4a206aa`) avait le même comportement. Il a été remplacé par la version publiée lors de la fusion.
- La branche locale `release/sec-email-02-phase1` (`db97407`) est **dépassée**. Elle ne doit pas être fusionnée.

**Règle Firewall active**, relevée en `GET` le 2026-11-05 (configuration non lisible par l'API) : `/api/send-quote-email`, sa barre oblique finale, `?x=1` **et** `/api/send-quote-email.js` répondent 403 en périphérie. **Elle reste en place** tant qu'un déploiement antérieur à `3fa2efb` peut être promu.

## 1. Faille (confirmée par la revue indépendante)

Sur `origin/main` (`c80ce8e`), donc en Production, `api/send-quote-email.js` acceptait un `POST` anonyme `{ quoteId, clientEmail, clientName }` :
- il envoyait par Resend « Votre devis Digital Lab est prêt » à **l'adresse fournie par l'appelant** ;
- le lien de l'e-mail était construit à partir de `VITE_APP_URL`, ou à défaut de l'en-tête `Host`, qui n'est pas fiable ;
- il n'y avait ni authentification ni limitation ;
- il renvoyait les `details` de Resend à l'appelant.

Rien ne l'appelait :
- le site, l'espace client et l'admin ne l'utilisent pas ;
- `src/services/quoteEmail.js` vise l'Edge Function du même nom, et ce fichier n'est importé nulle part.

## 2. Correction

`api/send-quote-email.js` répond **410 Gone** à toutes les méthodes, avec `{ ok: false, error: "gone" }` et `Cache-Control: no-store`.
- Il n'importe rien.
- Il ne lit ni le corps de la requête, ni ses en-têtes, ni ses paramètres, ni l'environnement.
- Il n'appelle aucun service.

Les conditions d'une éventuelle réactivation, dans un lot dédié, sont écrites en tête du fichier. Aucun ancien flux e-mail n'est réactivé.

**Garde-fou ajouté** (`api/_lib/security/public-routes.test.js`) : il échoue si une nouvelle route exposée apparaît dans `api/` sans revue, si une route exposée appelle Resend elle-même ou lit le corps de la requête, ou si les deux destinataires fixes changent.

## 3. Tests

| Test | Résultat |
|---|---|
| `npm run test:notify` (unitaires NOTIFY-01A et SEC-EMAIL-02) | **66/66** (au HEAD après fusion de `3fa2efb`) |
| Pour 7 méthodes HTTP : réponse 410 ; **aucune propriété de la requête lue** (Proxy espion) ; **`fetch` jamais appelé** ; **aucune variable d'environnement lue** ; aucune donnée de l'attaquant dans la réponse | OK |
| Corps impossible à analyser : réponse 410 | OK |
| Source : pas de `fetch`, `resend`, `process`, `Deno`, `import`, ni lecture de la requête | OK |
| Surface exposée : exactement `send-contact-email.js`, `send-quote-email.js`, `cron/notify-reconcile.js` | OK |
| **Contre-épreuve :** les mêmes tests lancés sur l'ancien fichier (`origin/main`) | **11 échecs**, comme attendu |
| SQL NOTIFY-01A (PGlite), dont le contrôle quotidien des notifications `dead` | **110/110** |
| Bout en bout NOTIFY-01A | **35/35** |
| `npm run build` | OK, 13 routes pré-rendues |
| ESLint | 16 problèmes, tous dans `src/`, que ce lot ne modifie pas. Le total était de 25 avant NOTIFY-01A |
| `git diff c80ce8e -- src` | Vide |

## 4. Rollback sûr

La correction de la documentation de NOTIFY-01A se trouve dans `docs/LOT-NOTIFY-01A.md` §10 :
- un retour à un déploiement antérieur à ce lot **rouvre les deux relais**. Il n'est autorisé que derrière deux règles Firewall *Deny* vérifiées avant et après (R2-B) ;
- la voie normale est la pause (R1), ou une version corrigée (R2-A, version de repli « notifications coupées » décrite au §10.3) ;
- la première version sûre est relevée au déploiement (§9.2, étape 6) ;
- toutes les vérifications HTTP se font en `GET`, sans envoi (§9.0) ;
- contrôle quotidien des notifications `dead` sans données personnelles : `docs/sql/notify-01a/80-daily-dead-check.sql` (§10.4).

## 5. Points restants (hors périmètre)

1. ~~La Production reste vulnérable jusqu'au déploiement de ce correctif.~~ **Fermé** : `3fa2efb` est en Production, et la règle Firewall couvre le préfixe. Les anciens déploiements (`dpl_8PYye…`, `dpl_3e1LHu…`) contiennent toujours l'ancien relais : pas d'Instant Rollback vers eux sans la règle (`docs/LOT-NOTIFY-01A.md` §10).
2. `supabase/functions/send-quote-email/index.ts` sur `main` contient encore l'ancien code de l'Edge Function. La version déployée en Production répond 410 (vérifié par Digital Lab), mais **un `supabase functions deploy send-quote-email` lancé depuis `main` la réactiverait.** À traiter dans un lot dédié (même neutralisation 410), et à ne pas redéployer d'ici là.
3. L'historique Git contient l'ancien code : c'est voulu, pour la traçabilité.
