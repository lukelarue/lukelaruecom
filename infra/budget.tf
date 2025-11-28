# Budget alert for cost monitoring
# Alerts when spending approaches $2.50/day ($75/month)

resource "google_project_service" "billingbudgets" {
  project            = var.project_id
  service            = "billingbudgets.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "monitoring" {
  project            = var.project_id
  service            = "monitoring.googleapis.com"
  disable_on_destroy = false
}

resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "Budget Alert Email"
  type         = "email"

  labels = {
    email_address = var.budget_alert_email
  }

  depends_on = [google_project_service.monitoring]
}

resource "google_billing_budget" "daily_spend_alert" {
  billing_account = var.billing_account_id
  display_name    = "Daily Spend Alert ($2.50/day)"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "75" # $2.50/day * 30 days
    }
  }

  # Alert at 50% ($37.50/month = ~$1.25/day)
  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert at 90% ($67.50/month = ~$2.25/day)
  threshold_rules {
    threshold_percent = 0.9
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert at 100% ($75/month = $2.50/day)
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert if forecast predicts going over
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  # Email notifications
  all_updates_rule {
    monitoring_notification_channels = [google_monitoring_notification_channel.email.name]
    disable_default_iam_recipients   = false # Also sends to billing account admins
  }

  depends_on = [
    google_project_service.billingbudgets,
    google_monitoring_notification_channel.email
  ]
}
