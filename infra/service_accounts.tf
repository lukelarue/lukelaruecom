terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.33"
    }
  }
}

variable "project_id" {
  type = string
}

provider "google" {
  project = var.project_id
}

locals {
  login_api_roles = [
    "roles/datastore.user",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter"
  ]

  chat_api_roles = [
    "roles/datastore.user",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter"
  ]

  deploy_automation_roles = [
    "roles/run.admin",
    "roles/artifactregistry.writer"
  ]
}

resource "google_service_account" "login_api" {
  account_id   = "login-api-runtime"
  display_name = "Login API Cloud Run runtime"
}

resource "google_service_account" "chat_api" {
  account_id   = "chat-api-runtime"
  display_name = "Chat API Cloud Run runtime"
}

resource "google_service_account" "deploy_automation" {
  account_id   = "deploy-automation"
  display_name = "CI/CD deploy automation"
}

resource "google_project_iam_member" "login_api_roles" {
  for_each = toset(local.login_api_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.login_api.email}"
}

resource "google_project_iam_member" "chat_api_roles" {
  for_each = toset(local.chat_api_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.chat_api.email}"
}

resource "google_project_iam_member" "deploy_automation_roles" {
  for_each = toset(local.deploy_automation_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deploy_automation.email}"
}

resource "google_service_account_iam_member" "deploy_can_use_login_runtime" {
  service_account_id = google_service_account.login_api.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy_automation.email}"
}

resource "google_service_account_iam_member" "deploy_can_use_chat_runtime" {
  service_account_id = google_service_account.chat_api.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy_automation.email}"
}

output "login_api_service_account_email" {
  value = google_service_account.login_api.email
}

output "chat_api_service_account_email" {
  value = google_service_account.chat_api.email
}

output "deploy_automation_service_account_email" {
  value = google_service_account.deploy_automation.email
}
