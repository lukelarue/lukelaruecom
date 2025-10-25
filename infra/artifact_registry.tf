resource "google_project_service" "artifactregistry" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

locals {
  artifact_registry_repositories = {
    login_api = {
      repository_id = "login-api"
      description   = "Docker images for the Login API Cloud Run service."
      labels = {
        service = "login-api"
      }
    }
    chat_api = {
      repository_id = "chat-api"
      description   = "Docker images for the Chat API Cloud Run service."
      labels = {
        service = "chat-api"
      }
    }
  }
}

resource "google_artifact_registry_repository" "api" {
  for_each = local.artifact_registry_repositories

  project       = var.project_id
  location      = var.artifact_registry_location
  repository_id = each.value.repository_id
  description   = each.value.description
  format        = "DOCKER"
  mode          = "STANDARD_REPOSITORY"

  labels = merge(
    {
      managed_by   = "terraform"
      environment  = "prod"
      application  = "lukelarue"
      service_role = "api"
    },
    lookup(each.value, "labels", {})
  )

  depends_on = [google_project_service.artifactregistry]
}

output "artifact_registry_repository_ids" {
  description = "Artifact Registry repository resource IDs by service."
  value = {
    for key, repo in google_artifact_registry_repository.api : key => repo.id
  }
}
