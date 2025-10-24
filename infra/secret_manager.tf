resource "google_project_service" "secretmanager" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

locals {
  secret_manager_secrets = {
    "login-api-session-signing-key" = {
      labels = {
        service = "login-api"
        purpose = "session"
      }
    }
    "google-oauth-client-secret" = {
      labels = {
        service = "auth"
        purpose = "google-oauth"
      }
    }
  }
}

resource "google_secret_manager_secret" "managed" {
  for_each = local.secret_manager_secrets

  secret_id   = each.key

  replication {
    auto {}
  }

  labels = {
    managed_by = "terraform"
    purpose    = lookup(each.value.labels, "purpose", "unspecified")
  }

  depends_on = [google_project_service.secretmanager]
}

output "secret_manager_secret_ids" {
  description = "Secret resource IDs managed by Terraform"
  value       = { for name, secret in google_secret_manager_secret.managed : name => secret.id }
}
