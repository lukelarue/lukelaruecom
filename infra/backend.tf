terraform {
  backend "gcs" {
    bucket = "lukelarue-terraform-state"
    prefix = "envs/prod"
  }
}
