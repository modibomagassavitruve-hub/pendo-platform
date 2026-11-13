# Collecte automatique des données

La collecte est planifiée dans **Supabase** (extensions `pg_cron` + `pg_net`), qui appelle
les endpoints `/api/cron/*` du backend avec l'en-tête `Authorization: Bearer <CRON_SECRET>`.

Pourquoi : les workflows GitHub Actions du dépôt privé ne démarraient plus (minutes
gratuites épuisées / limite de dépenses), et les crons Vercel du plan Hobby sont limités
à une exécution par jour.

| Tâche (cron.job)              | Planning (UTC)          | Endpoint                               |
|-------------------------------|-------------------------|----------------------------------------|
| pendo-collect-news            | `30 * * * *`            | /api/cron/collect-news                 |
| pendo-enrich-news             | `45 * * * *`            | /api/cron/enrich-news?limit=12         |
| pendo-collect-opportunities   | `15 * * * *`            | /api/cron/collect-opportunities        |
| pendo-collect-markets         | `*/15 7-17 * * 1-5`     | /api/cron/collect-markets              |
| pendo-collect-markets-close   | `0 20 * * 1-5`          | /api/cron/collect-markets              |
| pendo-translate-content       | `50 */2 * * *`          | /api/cron/translate-content?limit=5    |

Le secret est stocké dans le **Vault Supabase** sous le nom `pendo_cron_secret` et doit être
identique à la variable `CRON_SECRET` du projet Vercel `pendo-backend`.

Surveiller : `select * from cron.job_run_details order by start_time desc limit 20;`
et les réponses HTTP : `select status_code, created from net._http_response order by created desc limit 20;`

Les workflows GitHub restent disponibles en lancement manuel (workflow_dispatch).
