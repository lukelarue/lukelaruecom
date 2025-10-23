# Terraform Bootstrap

This directory houses Terraform configuration for the LukeLaRue production infrastructure.

## Prerequisites

- Google Cloud project configured and `gcloud` authenticated.
- GCS bucket for Terraform state (example: `lukelarue-terraform-state`).
- Terraform >= 1.5.0 installed locally.

## Bootstrap Command

Adjust names, region, and project as needed before running the commands.

### Windows (PowerShell)

```powershell
$ProjectId = "parabolic-env-456611-q9"
$BucketName = "lukelarue-terraform-state"
$BucketLocation = "us-central1"

gcloud storage buckets create "gs://$BucketName" `
  --project "$ProjectId" `
  --location "$BucketLocation" `
  --uniform-bucket-level-access

gcloud storage buckets update "gs://$BucketName" --versioning

$TerraformSa = "terraform-admin@$ProjectId.iam.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding "gs://$BucketName" `
  --member "serviceAccount:$TerraformSa" `
  --role "roles/storage.admin"
```

### macOS / Linux (bash)

```bash
PROJECT_ID="parabolic-env-456611-q9"
BUCKET_NAME="lukelarue-terraform-state"
BUCKET_LOCATION="us-central1"

gcloud storage buckets create gs://${BUCKET_NAME} \
  --project "${PROJECT_ID}" \
  --location "${BUCKET_LOCATION}" \
  --uniform-bucket-level-access

gcloud storage buckets update gs://${BUCKET_NAME} --versioning

TERRAFORM_SA="terraform-admin@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member "serviceAccount:${TERRAFORM_SA}" \
  --role "roles/storage.admin"
```

## Initialize Terraform

After creating the bucket and updating `backend.tf` with the correct bucket name and prefix, run:

```bash
terraform init
```

Then follow with optional validation:

```bash
terraform fmt
terraform validate
```
