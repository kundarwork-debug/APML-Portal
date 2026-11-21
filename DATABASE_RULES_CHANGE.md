# APML Firebase database rules

`database.rules.json` is the complete Realtime Database rules document. It preserves the existing public reads, administrator root write rule, analytics, presence, and score index.

For the five shared data branches, verified Firebase users can create or edit active records and move them into the `deleted` / Trash Archive state. Only `kundar.work@gmail.com` and `kundar701@gmail.com` can restore records from trash or permanently remove them. This is enforced by the per-record rules, so the root administrator rule remains in place and no broad branch-level write grants are added.

The former `catbox_gdrive_files/$fileKey` quotation-only validation has been removed so ordinary Drive files and links can be saved. Cloudinary permanent deletion remains protected by the Firebase-authenticated, admin-only Cloudflare Worker route.

To publish after approval, replace the Realtime Database rules with this file using the Firebase console. Do not publish a fragment or replace it with unrelated rules.
