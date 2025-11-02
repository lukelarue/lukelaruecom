resource "google_project_service" "compute" {
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_global_address" "frontend_lb" {
  name         = "frontend-lb-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"

  depends_on = [google_project_service.compute]
}

resource "google_compute_region_network_endpoint_group" "frontend" {
  name                  = "frontend-serverless-neg"
  region                = var.cloud_run_location
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_service.frontend.name
  }

  depends_on = [
    google_project_service.compute,
    google_cloud_run_service.frontend
  ]
}

resource "google_compute_backend_service" "frontend" {
  name                  = "frontend-backend-service"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL"
  enable_cdn            = false
  timeout_sec           = 30

  backend {
    group = google_compute_region_network_endpoint_group.frontend.id
  }

  depends_on = [google_project_service.compute]
}

resource "google_compute_url_map" "frontend" {
  name            = "frontend-url-map"
  default_service = google_compute_backend_service.frontend.id
}

resource "google_compute_managed_ssl_certificate" "frontend" {
  name = "frontend-managed-cert"

  managed {
    domains = var.frontend_domains
  }
}

resource "google_compute_target_https_proxy" "frontend" {
  name             = "frontend-https-proxy"
  url_map          = google_compute_url_map.frontend.id
  ssl_certificates = [google_compute_managed_ssl_certificate.frontend.id]
}

resource "google_compute_global_forwarding_rule" "frontend" {
  name                  = "frontend-https-forwarding-rule"
  target                = google_compute_target_https_proxy.frontend.id
  ip_address            = google_compute_global_address.frontend_lb.address
  load_balancing_scheme = "EXTERNAL"
  port_range            = "443"
  ip_protocol           = "TCP"
}
