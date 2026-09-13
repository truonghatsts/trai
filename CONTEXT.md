# Domain Glossary

## Environment

A coherent whole-stack runtime context. The term is used as a qualifier
distinguishing deployments, not as a list of services.

### Local environment

A whole stack running with local configuration, using the same services as
every other environment.

#### Local Supabase project

A non-production Supabase project used by the local environment.

### Production environment

One live whole-stack deployment.

#### Production backend host

Railway, the host for the production backend.

#### Production Supabase project

An isolated Supabase project serving production only.

#### Manual release

An intentional production deployment initiated by an operator rather than by
every source-code push.

## Whole stack

The Chrome extension, Fastify backend, Supabase, the transcription provider,
and the media downloader, taken together.
