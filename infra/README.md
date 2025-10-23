# Terraform Bootstrap

This directory houses Terraform configuration for the LukeLaRue production infrastructure.

## Prerequisites

- Google Cloud project configured and `gcloud` authenticated.
- GCS bucket for Terraform state (example: `lukelarue-terraform-state`).
- Terraform >= 1.5.0 installed locally.

## Bootstrap Command

Create state bucket and enable versioning (adjust names, region, and project as needed):

```bash
PROJECT_ID="parabolic-env-456611-q9"
BUCKET_NAME="lukelarue-terraform-state"
BUCKET_LOCATION="us-central1"

gcloud storage buckets create gs://${BUCKET_NAME} \
  --project "${PROJECT_ID}" \
  --location "${BUCKET_LOCATION}" \
  --uniform-bucket-level-access

gcloud storage buckets update gs://${BUCKET_NAME} --versioning
```

Grant the Terraform service account permissions on the bucket:

```bash
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
