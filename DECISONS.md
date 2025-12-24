# image-hospital — Final Decisions

- Image URLs expire exactly 60 seconds after creation.
- If there is any ambiguity (clock skew, missing metadata), access must be denied.
- Clock skew of ±5 seconds is acceptable.
- No deletion or cleanup of stored images is required.
- Backend must be stateless and safe behind a load balancer.
- Metadata must be durable and shared across instances.
- Local filesystem is used for image storage in this iteration.
- UI must be minimal and monochrome.
- If a database is used, Postgres is the default choice.
- Metadata-store interfaces must be database-agnostic.
- **Future**: Use AWS RDS PostgreSQL instead of local PostgreSQL on EC2 for production deployments (better reliability, automatic backups, easier scaling).