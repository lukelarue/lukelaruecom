resource "google_firestore_index" "chatmessages_channel_createdat" {
  project     = var.project_id
  database    = "(default)"
  collection  = "chatMessages"
  query_scope = "COLLECTION"

  fields {
    field_path = "channelId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}
