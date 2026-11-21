# APML Firebase database rules

`database.rules.json` is the complete Realtime Database rules document. Any verified Firebase user can create or edit active shared records and move them into Trash Archive. Only `kundar.work@gmail.com` and `kundar701@gmail.com` can see Trash, restore records, or permanently delete them. The root administrator write rule, public reads, analytics, presence, and score index are preserved.

The former `catbox_gdrive_files/$fileKey` quotation-only validation has been removed so ordinary Drive files and links can be saved. Cloudinary permanent deletion remains protected by Firebase authentication and the admin allowlist in the Cloudflare Worker.

Publish this complete rules file in the Firebase console after review; do not replace it with a fragment or unrelated rules.
