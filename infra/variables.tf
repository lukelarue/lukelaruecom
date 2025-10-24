variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
  default     = "parabolic-env-456611-q9"
}

variable "github_repository" {
  description = "GitHub repository in the format owner/repo used for workload identity federation"
  type        = string
  default     = "lukelarue/lukelaruecom"
}

variable "firestore_location_id" {
  description = "Firestore database location ID (e.g. nam5, us-central1)"
  type        = string
  default     = "nam5"
}
