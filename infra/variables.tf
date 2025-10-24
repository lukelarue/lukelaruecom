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
