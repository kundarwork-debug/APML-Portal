# APML Portal Analytics — Data Audit & Firebase Contract

**Audit date:** 22 November 2026  
**Repository branch reviewed:** `main`  
**Scope:** Static code audit of the React Analytics page, Firebase counter writers, selected action loggers, homepage telemetry, and the Cloudflare Worker references. Live dashboard values and the deployed Vercel page were inspected. This was not a direct Firebase data export, and the deployed Firebase Rules were not independently retrieved.

## 1. Executive summary

The Analytics page now includes a live Visitor Intelligence panel. The React shell posts page views and 30-second heartbeats to the Cloudflare Worker at `/visitor/collect`; the Worker derives a secret-keyed SHA-256 identifier from the connecting IP, reads approximate location from Cloudflare request metadata, filters obvious automated user agents, and stores pseudonymous session records in Cloudflare KV. Raw IP addresses are not written to the analytics database. The privacy policy now discloses this automatic collection without a consent popup. The metrics are estimates, not verified counts of individual human beings.

The existing download counter called **Media downloads** was also too narrow a label: its writer is called by both Gallery downloads and Drive downloads, including non-media files. The dashboard now labels it **Drive/Gallery downloads**.

The dashboard now reads from the canonical Firebase folder **`Analytics page`**. Existing lowercase `analytics` paths are retained as compatibility mirrors because the homepage and Cloudflare Worker still read them.

## 2. What the Analytics page displays

| Dashboard item | How it is calculated | Stored source |
|---|---|---|
| Active days | Number of selected dates where PDF generation + Drive/Gallery download count is greater than zero. Derived; not an independent event counter. | `Analytics page/daily_logs/{YYYY-MM-DD}` |
| PDFs generated | Sum of daily `pdf` values in the selected date range. | `Analytics page/daily_logs/{YYYY-MM-DD}/pdf` |
| Drive/Gallery downloads | Sum of daily `media` values in the selected date range. Despite the historical field name, it includes Drive file downloads and Gallery downloads. | `Analytics page/daily_logs/{YYYY-MM-DD}/media` |
| Total downloads | PDFs generated + Drive/Gallery downloads for the selected date range. Derived. | Derived from the two daily fields above |
| Daily activity chart | Daily PDF generation and Drive/Gallery download counts. | Same daily log fields |
| Smart insights | Recorded PDF total, combined downloads, average combined downloads per calendar day, and busiest day. Derived from daily logs. | Same daily log fields |
| Period summary | Average downloads/day, PDF total, Drive/Gallery download total, busiest date. Derived. | Same daily log fields |
| Activity heatmap | Combined PDF + Drive/Gallery counts for each of the last 365 dates. | Same daily log fields |
| Daily breakdown | Daily PDF, Drive/Gallery and combined totals. For the 1-year view, only the latest 45 rows are displayed in the table. | Same daily log fields |
| CSV / JSON export | Exports the selected daily records and their derived totals. | Same daily log fields and lifetime totals |
| Recent Activity | Latest 50 instrumented successful actions; admin-only panel. This is an audit trail, not a complete clickstream. | `Analytics page/recent_actions` |

## 3. Current data writers and event coverage

### Recorded aggregate counters

- **PDF generation:** `src/pages/Editor.jsx` calls `incrementApmlPdfGenerated()` after a PDF is generated and downloaded. The counter is stored as a daily `pdf` count and a lifetime `pdfGenerated` total.
- **Drive downloads:** `src/pages/Drive.jsx` calls `incrementApmlMediaDownload()` after the download request succeeds and the browser/native download is started.
- **Gallery downloads:** `src/pages/Gallery.jsx` calls `incrementApmlMediaDownload()` after the media fetch succeeds and the browser/native download is started.
- **Timezone:** daily keys are generated in `Asia/Kolkata` (IST).

### Recent Activity events

The `logApmlAction()` helper writes to `Analytics page/recent_actions` and prunes the node to the latest 50 records. Existing instrumentation includes selected actions in Drive, Gallery, Directory and Field Officer. Successful Editor PDF generation is now also logged. The helper records action, module, item, details, user label and timestamp. It does not represent every button click or every page visit.

## 4. Firebase structure (canonical source of truth)

The application initializes this schema under the Firebase Realtime Database root:

```text
Analytics page/
  _meta/
    schemaVersion: 1
    timezone: "Asia/Kolkata"
    createdAt: <unix milliseconds>
    description: <schema purpose>
  daily_logs/
    YYYY-MM-DD/
      pdf: <integer>
      media: <integer>
  lifetime_totals/
    pdfGenerated: <integer>
    mediaDownloads: <integer>
  recent_actions/
    <push-id>/
      action: <string>
      module: <string>
      item: <string>
      details: <string>
      user: <string>
      timestamp: <unix milliseconds>
```

The `media` / `mediaDownloads` field names are retained for compatibility with existing counter code; their actual meaning is **Drive/Gallery downloads**, not exclusively image/video downloads.

The first Analytics page load (or next counter write) runs `ensureApmlAnalyticsStructure()`. It migrates existing daily PDF/media counts and lifetime totals from the legacy lowercase node if schema version 1 has not yet been initialized. Visitor sessions are collected separately in Cloudflare KV; no legacy Firebase `visitors` field is used as a source for these estimates.

## 5. Legacy compatibility paths

These paths are kept in sync by the counter writer for existing consumers:

- `analytics/daily_logs/{YYYY-MM-DD}/pdf`
- `analytics/daily_logs/{YYYY-MM-DD}/media`
- `analytics/totalPdfDownloads`
- `analytics/totalMediaDownloads`

The homepage telemetry and Cloudflare Worker report code still reference these lowercase paths. Do not remove them until those consumers are deliberately migrated and verified.

## 6. Visitor Intelligence: collection contract and limitations

- **Session source:** Cloudflare KV keys prefixed `visitor_session:`; records expire 90 days after their last update (the TTL is refreshed by heartbeats).
- **Session identity:** a random ID in `sessionStorage`, so sessions are browser-tab/session scoped rather than a verified person.
- **IP identifier:** `SHA-256(secret + ':' + IP)` groups sessions by a stable network identifier. The raw IP is not stored in the session record. The secret is held in the Worker KV namespace and currently has no automatic rotation.
- **Location:** approximate city, region and country from Cloudflare `request.cf`; no GPS coordinates.
- **Client details:** broad device, browser and OS categories derived from the user-agent; the raw user-agent is not stored.
- **Pages and duration:** route paths without query strings, page-view counts and accumulated active-tab heartbeat time.
- **Bot filtering:** obvious bot/crawler/preview/headless user-agent strings are ignored. This is not proof of a human; user-agent filtering can miss automation and can reject unusual clients.
- **Sampling:** the Worker reads at most 500 KV session records per analytics request. KV list order is not guaranteed to be newest-first, so once the namespace contains more than 500 records, this is not a reliable latest-500 sample. Unique/returning IP figures and location/device rankings can then be incomplete or biased.
- **Interpretation:** distinct IP hashes are not unique people. Shared office/home networks may collapse several people into one identifier; VPNs and changing IPs may split one person across identifiers. Active now means a record was updated in the last 60 seconds.
- **Endpoint exposure:** `/nova/analytics` returns aggregate visitor summaries without authentication. It does not return session IDs, raw IPs or individual session records.

The following are **not currently collected or verified**:

- A guaranteed count of real human beings (bot filtering is heuristic)
- Referral sources / campaign attribution
- GPS or precise device location
- A complete clickstream or every user interaction
- Historical per-file download totals in the Analytics aggregate dataset
- Upload totals by day as an aggregate metric

## 7. Important interpretation and privacy notes

- The homepage reads the `presence` node and calculates a temporary online count using recent session timestamps. That live operational count is separate from Visitor Intelligence.
- The Privacy Policy and Cookies Policy disclose automatic IP-derived visitor analytics without a consent popup. Raw IP addresses are not stored in the portal analytics database; the IP-derived identifier secret currently has no scheduled rotation.
- Aggregate totals and client-side activity events are only as trustworthy as the Firebase Realtime Database Security Rules. Client-side code is not a security boundary. Review deployed Rules separately before relying on these counts for auditing or compliance.
- The activity list is capped at 50 records; older actions are intentionally pruned and cannot be used for long-term reporting. Firebase Rules restrict `Analytics page/recent_actions` writes to verified admin accounts, so actions from ordinary signed-out visitors will not be captured by this log.
- The repository's current Rules file restricts reads at the `Analytics page/daily_logs` parent to verified admins, while the dashboard reads that entire parent node. If those exact Rules are deployed, a signed-out/non-admin dashboard session will not be able to read the daily report. The live dashboard did return daily data during this audit, so verify the deployed Firebase Rules and the active browser auth context before changing access.

## 8. Rules for future Analytics development

1. Every new dashboard metric must have a documented Firebase field and a real writer.
2. Write the canonical record under `Analytics page`; do not add a display-only metric or silently estimate missing data.
3. Use IST date keys for daily aggregates.
4. If an old homepage/Worker consumer needs the metric, update its compatibility mirror until that consumer has been migrated.
5. Document the event trigger, whether it is a count or unique entity, its retention, and any privacy implications.
6. Keep derived metrics clearly derived from stored source fields.
7. Do not use the 50-event Recent Activity list as a substitute for aggregate analytics or a complete audit log.
