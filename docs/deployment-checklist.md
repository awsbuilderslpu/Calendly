# Deployment Checklist

- [ ] Environment configured (`NODE_ENV=production`)
- [ ] Required secrets exported to the host platform.
- [ ] Database migrated (`schema.sql` applied successfully).
- [ ] OAuth callbacks explicitly whitelisted in Google Cloud / Azure Portal.
- [ ] HTTPS explicitly active; HSTS header enabled.
- [ ] Security headers confirmed strictly passing (`curl -I`).
- [ ] Health endpoint (`/api/health/ready`) returns 200 READY.
- [ ] Logs validated to ensure no tokens or secrets (e.g. `access_token`, `refresh_token`) are accidentally dumped in production format.
- [ ] Database automatic backups actively enabled in Supabase console.
