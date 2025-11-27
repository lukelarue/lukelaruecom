# Load balancer resources removed to eliminate $0.60/day forwarding rule cost.
# Frontend now uses Cloud Run domain mapping (see cloud_run.tf).
# APIs are accessed directly via their Cloud Run URLs.
#
# To fully remove these resources from GCP, run: terraform apply
# Then update Cloudflare DNS to point to the Cloud Run domain mapping records.
