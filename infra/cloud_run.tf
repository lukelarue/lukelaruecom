resource "google_project_service" "run" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

locals {
  login_api_image = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/login-api/login-api:${var.login_api_image_tag}"
  chat_api_image  = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/chat-api/chat-api:${var.chat_api_image_tag}"
  frontend_image  = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/frontend/frontend:${var.frontend_image_tag}"
}

resource "google_cloud_run_service" "frontend" {
  name     = "frontend"
  location = var.cloud_run_location

  metadata {
    annotations = {
      "run.googleapis.com/ingress" = "internal-and-cloud-load-balancing"
    }
  }

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = tostring(var.frontend_min_instance_count)
        "autoscaling.knative.dev/maxScale" = tostring(var.frontend_max_instance_count)
      }
    }

    spec {
      service_account_name = google_service_account.frontend.email

      containers {
        image = local.frontend_image

        ports {
          name           = "http1"
          container_port = 8080
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.run,
    google_service_account.frontend
  ]
}

resource "google_cloud_run_service_iam_member" "frontend_public" {
  service  = google_cloud_run_service.frontend.name
  location = google_cloud_run_service.frontend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service" "login_api" {
  name     = "login-api"
  location = var.cloud_run_location

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = tostring(var.login_api_min_instance_count)
        "autoscaling.knative.dev/maxScale" = tostring(var.login_api_max_instance_count)
      }
    }

    spec {
      service_account_name = google_service_account.login_api.email

      containers {
        image = local.login_api_image

        ports {
          name           = "http1"
          container_port = 8080
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        env {
          name  = "WEB_APP_ORIGINS"
          value = join(",", var.web_app_origins)
        }

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "SESSION_COOKIE_NAME"
          value = var.login_api_session_cookie_name
        }

        env {
          name  = "SESSION_EXPIRES_IN"
          value = tostring(var.login_api_session_expires_in)
        }

        env {
          name = "SESSION_JWT_SECRET"

          value_from {
            secret_key_ref {
              name = "login-api-session-signing-key"
              key  = var.login_api_session_signing_key_version
            }
          }
        }

        env {
          name  = "GOOGLE_CLIENT_ID"
          value = var.login_api_google_client_id
        }

        env {
          name = "GOOGLE_CLIENT_SECRET"

          value_from {
            secret_key_ref {
              name = "google-oauth-client-secret"
              key  = "latest"
            }
          }
        }

        env {
          name  = "USE_FIRESTORE_EMULATOR"
          value = tostring(var.login_api_use_firestore_emulator)
        }

        env {
          name  = "USE_FAKE_GOOGLE_AUTH"
          value = tostring(var.login_api_use_fake_google_auth)
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.run,
    google_service_account.login_api,
    google_project_service.secretmanager,
    google_secret_manager_secret.managed["login-api-session-signing-key"],
    google_secret_manager_secret.managed["google-oauth-client-secret"]
  ]
}

resource "google_cloud_run_service" "chat_api" {
  name     = "chat-api"
  location = var.cloud_run_location

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = tostring(var.chat_api_min_instance_count)
        "autoscaling.knative.dev/maxScale" = tostring(var.chat_api_max_instance_count)
      }
    }

    spec {
      service_account_name = google_service_account.chat_api.email

      containers {
        image = local.chat_api_image

        ports {
          name           = "http1"
          container_port = 8080
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        env {
          name  = "WEB_APP_ORIGINS"
          value = join(",", var.web_app_origins)
        }

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "USE_FIRESTORE_EMULATOR"
          value = tostring(var.chat_api_use_firestore_emulator)
        }

        env {
          name  = "DEFAULT_CHANNEL_HISTORY_LIMIT"
          value = tostring(var.chat_api_default_channel_history_limit)
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.run,
    google_service_account.chat_api
  ]
}

resource "google_cloud_run_service_iam_member" "login_api_public" {
  service  = google_cloud_run_service.login_api.name
  location = google_cloud_run_service.login_api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service_iam_member" "chat_api_public" {
  service  = google_cloud_run_service.chat_api.name
  location = google_cloud_run_service.chat_api.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
