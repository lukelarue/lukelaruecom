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

variable "artifact_registry_location" {
  description = "Region where Artifact Registry repositories are created"
  type        = string
  default     = "us-central1"
}

variable "firestore_location_id" {
  description = "Firestore database location ID (e.g. nam5, us-central1)"
  type        = string
  default     = "nam5"
}

variable "cloud_run_location" {
  description = "Region where Cloud Run services are deployed"
  type        = string
  default     = "us-central1"
}

variable "web_app_origins" {
  description = "Allowed production origins for CORS configuration"
  type        = list(string)
  default     = ["https://lukelarue.com", "https://www.lukelarue.com"]
}

variable "login_api_image_tag" {
  description = "Container image tag for the login API deployment"
  type        = string
  default     = "latest"
}

variable "chat_api_image_tag" {
  description = "Container image tag for the chat API deployment"
  type        = string
  default     = "latest"
}

variable "frontend_image_tag" {
  description = "Container image tag for the frontend deployment"
  type        = string
  default     = "latest"
}

variable "login_api_min_instance_count" {
  description = "Minimum number of login API Cloud Run instances"
  type        = number
  default     = 0
}

variable "login_api_max_instance_count" {
  description = "Maximum number of login API Cloud Run instances"
  type        = number
  default     = 3
}

variable "chat_api_min_instance_count" {
  description = "Minimum number of chat API Cloud Run instances"
  type        = number
  default     = 0
}

variable "chat_api_max_instance_count" {
  description = "Maximum number of chat API Cloud Run instances"
  type        = number
  default     = 3
}

variable "frontend_min_instance_count" {
  description = "Minimum number of frontend Cloud Run instances"
  type        = number
  default     = 0
}

variable "frontend_max_instance_count" {
  description = "Maximum number of frontend Cloud Run instances"
  type        = number
  default     = 3
}

variable "login_api_session_cookie_name" {
  description = "Session cookie name issued by the login API"
  type        = string
  default     = "session_token"
}

variable "login_api_session_expires_in" {
  description = "Session expiration duration in seconds"
  type        = number
  default     = 604800
}

variable "login_api_use_fake_google_auth" {
  description = "Whether the login API accepts fake Google credentials"
  type        = bool
  default     = false
}

variable "login_api_use_firestore_emulator" {
  description = "Whether the login API should use the Firestore emulator"
  type        = bool
  default     = false
}

variable "chat_api_use_firestore_emulator" {
  description = "Whether the chat API should use the Firestore emulator"
  type        = bool
  default     = false
}

variable "chat_api_default_channel_history_limit" {
  description = "Default number of chat messages returned when no limit is provided"
  type        = number
  default     = 50
}

variable "frontend_domains" {
  description = "Domain names served by the frontend HTTPS load balancer"
  type        = list(string)
  default = [
    "lukelarue.com",
    "www.lukelarue.com"
  ]
}

variable "login_api_google_client_id" {
  description = "Google OAuth client ID injected into the login API"
  type        = string
  default     = "226428490565-rj7bibt60n6errq7fp29utte133s8osc.apps.googleusercontent.com"
}

variable "login_api_session_signing_key_version" {
  description = "Secret Manager version for the login API session signing key"
  type        = string
  default     = "latest"
}
