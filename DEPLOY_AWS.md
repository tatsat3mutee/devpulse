# DevPulse AWS Delivery

This is the deployment runbook. The repository configures delivery to an **existing x86-64 EC2 instance**, with host Caddy terminating HTTPS and Neon PostgreSQL providing persistence. It does not provision compute, DNS, certificates or a database. AWS activation requires authenticated operator access; adding these files alone does not deploy anything.

## Architecture and Decisions

- Retain React 19 + Vite, Bun 1.3.13 + Express, and PostgreSQL. The interactive lessons benefit from the existing React components; an Astro migration would not improve their teaching content or deployment reliability.
- Build one production image in GitHub Actions, smoke-test it against disposable PostgreSQL, and publish that same image to ECR. Deploy by digest, never `latest`.
- Use GitHub OIDC with separate publish and release roles. No EC2 SSH key or long-lived AWS access key belongs in GitHub.
- Release through a restricted SSM document. Its only input is an image digest; repository, instance and command are fixed by infrastructure configuration.
- Stop the old application before migration/startup. This causes brief downtime but prevents duplicate in-process schedulers. Do not add replicas or blue/green overlap until scheduling, rate limits and process-local state are externalized.
- The app owns automated fetching. The separate GitHub fetch workflow is manual recovery only. `CRON_ENABLED=false` is for disposable smoke tests, not the production environment.

## One-Time Prerequisites

1. Use an x86-64 Linux EC2 instance, not Graviton: CI currently builds `linux/amd64`. Ensure adequate disk space for both current and previous images. The app and migration each have a 512 MB limit; size the host for Docker, Caddy and any other workloads.
2. Install Docker, Bash, curl, util-linux (`flock`), AWS CLI v2 and an up-to-date SSM agent (at least 3.3.2746.0 for environment-variable parameter interpolation). Confirm the instance is Online in Systems Manager. Enable Docker/SSM on boot.
3. Attach an instance profile with `AmazonSSMManagedInstanceCore` or equivalent least-privilege permissions. The delivery stack adds ECR pull access to this existing role. Require IMDSv2; keep the metadata hop limit at 1 so application containers cannot obtain instance credentials.
4. Permit outbound HTTPS to SSM, ECR, S3 image layers, Neon and required application integrations, through internet/NAT or suitable VPC endpoints. Open inbound 80/443 for Caddy. Do not expose port 3000. CI needs no inbound SSH.
5. Keep production secrets in `/opt/devpulse/backend/.env`, owned by root, mode `600`, with parent directories inaccessible to untrusted users. Provision/edit it directly through your secure operator session, never chat or GitHub logs. No repository clone is required on the host.
6. Set `DATABASE_URL` (Neon TLS URL), `JWT_SECRET` (random, at least 32 characters), `ADMIN_EMAIL`, `CRON_SECRET`, `APP_URL` and `CORS_ORIGIN`. Retain existing optional LLM, OAuth, email and fetcher keys. `PORT=3000` and `NODE_ENV=production` are forced by release. Rotate any previously exposed credentials.
7. Point DNS at the instance and configure Caddy:

```caddyfile
devpulse.tatsatpandey.com {
    reverse_proxy 127.0.0.1:3000
}
```

## Database Safety Gate

Before the first automated release, inspect `schema_migrations` against the actual production schema and the numbered SQL files. Some historical migrations were applied manually, and migration 008 is not safe to replay blindly. Do not bulk mark files applied without verifying their effects. Never run a shell loop over all historical SQL files.

Take and verify a recoverable database backup or Neon restore point within your plan's retention capabilities. Test any new migration against a representative non-production copy. CI tests a fresh database and a second runner invocation; that is not proof of production-data compatibility.

The release runs `backend/scripts/migrate.ts`, which applies only untracked migrations, transactionally per file. **Rollback restores the application only, not database changes.** Use additive/backward-compatible schema changes so the previous image remains usable. Destructive changes require a separate reviewed migration plan. Initial concept editions also require the separately reviewed `seed:concepts` operation.

## Provision Delivery Resources

Authenticate with your approved AWS operator profile outside chat. Review [deploy/aws/delivery-stack.json](deploy/aws/delivery-stack.json), then run the following in a Bash operator terminal with real values:

```bash
aws sts get-caller-identity
aws cloudformation validate-template --template-body file://deploy/aws/delivery-stack.json
aws cloudformation deploy \
  --stack-name devpulse-delivery \
  --template-file deploy/aws/delivery-stack.json \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    InstanceId=i-YOUR_INSTANCE \
    InstanceRoleName=YOUR_EXISTING_INSTANCE_ROLE \
    GitHubSubjectPrefix=repo:tatsat3mutee/devpulse \
  --region YOUR_REGION
aws cloudformation describe-stacks --stack-name devpulse-delivery \
  --query 'Stacks[0].Outputs' --region YOUR_REGION
```

If the account already has the GitHub OIDC provider, also pass `ExistingOidcProviderArn=arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com`. Do not create a duplicate provider. Verify the repository's actual OIDC subject configuration; repositories using immutable IDs must supply their actual subject prefix. The template supports the standard branch and environment suffixes, not arbitrary customized claim layouts. Never weaken the trust to a wildcard to make authentication pass.

The stack creates an immutable ECR repository, publish role, release role, SSM document and an ECR pull policy on the existing instance role. ECR is retained if the stack is removed. ECR scan-on-push is enabled for visibility; vulnerability findings are **not currently a release-blocking security scan**. Review findings before approval and manage retained-image storage costs.

## Configure GitHub

Create a `production` environment restricted to the `main` branch, with required reviewer approval and prevention of self-review where your GitHub plan supports it. Protect `main`: require PR review and the `verify` job, and restrict changes to workflows, Dockerfile, deployment scripts and SQL. The environment's branch restriction is essential because its OIDC subject does not include the branch.

Add these **repository variables**, using stack outputs:

| GitHub Variable | Stack Output / Value |
| --- | --- |
| `AWS_REGION` | `AWSRegion` |
| `ECR_REGISTRY` | `EcrRegistry` |
| `ECR_REPOSITORY` | `EcrRepository` |
| `AWS_PUBLISH_ROLE_ARN` | `PublishRoleArn` |
| `AWS_DEPLOY_ROLE_ARN` | `DeployRoleArn` |
| `EC2_INSTANCE_ID` | `InstanceId` |
| `SSM_DOCUMENT_NAME` | `ReleaseDocument` |
| `AWS_DEPLOY_ENABLED` | Keep `false` until every prerequisite and database gate above is satisfied |

Only the optional manual-fetch workflow requires environment secrets `DEVPULSE_API_URL` and `CRON_SECRET`. The release workflow does not use them. Retire legacy `EC2_HOST` and `EC2_SSH_KEY` repository secrets after confirming no other consumer needs them.

## Release and Recovery

1. Open a PR to `main`. CI installs frozen dependencies, typechecks, runs unit/browser/deployment tests, builds the Docker image, applies migrations twice to disposable PostgreSQL, and checks health, topics, static routing and non-root configuration. Browser reports are retained for seven days.
2. After the first green CI run and completed setup, set `AWS_DEPLOY_ENABLED=true`. Merge to `main` or manually run the workflow on `main`. Other refs cannot publish or release.
3. Review the tested image digest in the job summary, migration compatibility and ECR findings, then approve the production job. Approve releases in commit order; cancel obsolete pending approvals rather than deploying an older commit after a newer one.
4. The instance pulls the image before downtime. It stops/retains the existing `devpulse` container, migrates, starts the candidate on loopback, and checks database-backed health. Failure attempts to restore the old application; a first deployment has no old image to restore.
5. GitHub waits for SSM completion using the bundled extended waiter. The command ID is recorded in the job summary. Confirm public HTTPS, `/edition`, sign-in and your edition after release; instance health alone does not verify DNS, Caddy, email or every user journey.

Concurrent release jobs are serialized, and host locks reject overlapping commands. Cancelling GitHub does not guarantee cancellation of an already dispatched SSM command. Inspect that command in Systems Manager before retrying. If `devpulse-previous` remains, reconcile container state and health through SSM before removing anything; the script refuses to overwrite that recovery marker.

For a later application rollback, an authorized operator can send the same SSM document a previously tested ECR digest. Confirm schema compatibility first. Record release digests and retain their ECR images. Do not prune recovery images until the release is accepted. Database recovery is a separate incident procedure, not an automatic reversal.

## Local Verification

```bash
bun run --cwd backend typecheck
bun test ./backend/src
bun run --cwd frontend test
bun run --cwd frontend build
bun run --cwd frontend test:e2e
bun test ./deploy/aws/delivery.test.ts
bash deploy/aws/release.test.sh
cfn-lint deploy/aws/delivery-stack.json
actionlint .github/workflows/deploy.yml .github/workflows/fetch.yml
```

Install Playwright Chromium from the frontend package before the first browser run. Docker smoke execution needs a Linux Docker host and a **disposable** PostgreSQL database; never point [deploy/aws/smoke.sh](deploy/aws/smoke.sh) at production. Windows without Docker can run the unit/browser/configuration checks, but cannot establish a passing container smoke result.
