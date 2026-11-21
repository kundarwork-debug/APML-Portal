# APML Portal Analytics — Data Audit & Firebase Contract

**Audit date:** 21 November 2026  
**Repository branch reviewed:** `main`  
**Scope:** Static code audit of the React Analytics page, Firebase counter writers, selected action loggers, homepage telemetry, and the Cloudflare Worker references. This is not a live Firebase data export; actual stored numeric values and Firebase Rules were not independently verified during this audit.

## 1. Executive summary

The Analytics page previously displayed a **Visitors** metric even though no code path was found that writes a daily visitor count. The homepage does calculate a temporary online-presence count from the `presence` node, but that is not a daily unique-visitor metric or historical visitor count. The current policy text also says visitor/presence analytics are not collected, so visitor tracking must not be added without an explicit product and privacy-policy decision.

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
- **Drive downloads:** `src/pages/Drive.jsx` calls `incrementApmlMediaDownload()` after a Drive download action.
- **Gallery downloads:** `src/pages/Gallery.jsx` calls `incrementApmlMediaDownload()` after a Gallery download action.
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

The first Analytics page load (or next counter write) runs `ensureApmlAnalyticsStructure()`. It migrates existing daily PDF/media counts and lifetime totals from the legacy lowercase node if schema version 1 has not yet been initialized. The migration intentionally does not copy a legacy `visitors` field because no verified visitor writer exists and the current dashboard does not display visitor counts.

## 5. Legacy compatibility paths

These paths are kept in sync by the counter writer for existing consumers:

- `analytics/daily_logs/{YYYY-MM-DD}/pdf`
- `analytics/daily_logs/{YYYY-MM-DD}/media`
- `analytics/totalPdfDownloads`
- `analytics/totalMediaDownloads`

The homepage telemetry and Cloudflare Worker report code still reference these lowercase paths. Do not remove them until those consumers are deliberately migrated and verified.

## 6. Data that is missing / not currently collected

The following are **not currently valid Analytics dashboard metrics**:

- Unique visitors (daily, weekly or monthly)
- Page views or page/module visits
- Visitor sessions, session duration or bounce rate
- Historical online-user counts or peak concurrent users
- Referral sources / campaign attribution
- Browser, device or operating-system breakdown
- Geographic visitor breakdown
- Per-module usage for calculators, directory searches, editor opens, etc.
- A complete event stream of all user actions
- Historical per-file download totals in the Analytics aggregate dataset
- Upload totals by day as an aggregate metric

The Worker contains a reader for `analytics/visitor_sessions`, but this audit found no corresponding writer in the React application. A reader alone does not mean the data is being collected.

## 7. Important interpretation and privacy notes

- The homepage reads the `presence` node and calculates a temporary online count using recent session timestamps. That live operational count is not a daily visitor count and is not used by the Analytics page.
- The current Privacy and Cookies copy says visitor/presence analytics are not collected. Because the homepage has live presence logic, that wording should be reviewed for accuracy before any visitor/session analytics are introduced.
- Do not add visitor/session/page-view tracking or visitor identifiers without an explicit decision and a corresponding privacy-policy update.
- Aggregate totals and client-side activity events are only as trustworthy as the Firebase Realtime Database Security Rules. Client-side code is not a security boundary. Review Rules separately before relying on these counts for auditing or compliance.
- The current activity list is capped at 50 records; older actions are intentionally pruned and cannot be used for long-term reporting.

## 8. Rules for future Analytics development

1. Every new dashboard metric must have a documented Firebase field and a real writer.
2. Write the canonical record under `Analytics page`; do not add a display-only metric or silently estimate missing data.
3. Use IST date keys for daily aggregates.
4. If an old homepage/Worker consumer needs the metric, update its compatibility mirror until that consumer has been migrated.
5. Document the event trigger, whether it is a count or unique entity, its retention, and any privacy implications.
6. Keep derived metrics clearly derived from stored source fields.
7. Do not use the 50-event Recent Activity list as a substitute for aggregate analytics or a complete audit log.
