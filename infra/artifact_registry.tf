resource "google_project_service" "artifactregistry" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

data "google_project" "current" {
  project_id = var.project_id
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
    frontend = {
      repository_id = "frontend"
      description   = "Docker images for the web frontend Cloud Run service."
      labels = {
        service = "frontend"
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

resource "google_artifact_registry_repository_iam_member" "cloud_run_pull" {
  for_each = google_artifact_registry_repository.api

  project    = var.project_id
  location   = each.value.location
  repository = each.value.repository_id
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:service-${data.google_project.current.number}@serverless-robot-prod.iam.gserviceaccount.com"
}

output "artifact_registry_repository_ids" {
  description = "Artifact Registry repository resource IDs by service."
  value = {
    for key, repo in google_artifact_registry_repository.api : key => repo.id
  }
}
