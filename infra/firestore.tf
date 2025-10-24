# Enable the Firestore API
resource "google_project_service" "firestore" {
  project            = var.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

# Create the (default) Firestore database in Native mode
resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.firestore_location_id
  type        = "FIRESTORE_NATIVE"

  # Ensure Terraform never deletes the database on destroy
  deletion_policy = "ABANDON"

  # Optional but recommended for production:
  # point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"
  # version_retention_period          = "7d"

  lifecycle {
    # Extra guardrail against accidental destroy
    prevent_destroy = true
  }

  depends_on = [google_project_service.firestore]
}

output "firestore_database" {
  description = "Firestore default database resource"
  value       = google_firestore_database.default.id
}
