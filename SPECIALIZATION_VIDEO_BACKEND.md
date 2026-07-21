# Backend Implementation Plan — Add Specialization via Video Approval

This document describes exactly what the backend must implement so the
**"Add a specialization"** feature on the Profile screen works end to end.

The mobile app is already built and calls the endpoints described here. **Match
these request/response shapes exactly** — where the app is lenient it is called
out explicitly.

- **Stack assumed:** Node.js + Express 5, Drizzle ORM + PostgreSQL, Zod, AWS SDK
  v3 for S3, JWT bearer auth. (Same stack as the rest of the API.)
- **Auth:** every `/api/*` route resolves the worker from the `Authorization:
  Bearer <token>` header. There is **no `workerId` in request bodies/paths** —
  the app never sends one.
- **Response envelope:** the app expects the existing convention —
  `{ "success": true, "message"?: string, ...fields }` on success, and
  `{ "success": false, "message": string }` on failure (any non-2xx **or** a
  2xx with `success:false` is treated as an error by the client).

---

## 1. Feature flow (what we're building)

```
Worker taps "+ Add" on an unheld specialization (e.g. Deep cleaning)
        │
        ▼
App requests a presigned S3 PUT URL for that (category, subcategory)
        │
        ▼
App uploads the demo video straight to S3 (bypasses the API server)
        │
        ▼
App calls /submit  ──►  backend verifies the object, records a PENDING
                        submission, returns the updated profile
        │
        ▼
Reviewer approves in admin panel  ──►  subcategory becomes ACTIVE on the worker
                       (or rejects  ──►  subcategory becomes REJECTED, retryable)
        │
        ▼
Next GET /api/profile reflects the new status; worker is notified
```

The specialization is **NOT** added on upload. It is added only when a reviewer
**approves** it. Until then the app shows it as **"In review"**.

---

## 2. API contract the app already calls

### 2.1 `POST /api/profile/expertise/video/presigned-url`

**Request body**

```json
{
  "category": "cleaning",
  "subcategory": "deep_cleaning",
  "fileName": "VID_20260721.mp4",
  "fileType": "video/mp4",
  "fileSize": 48213456
}
```

- `category` — the worker's service category id (e.g. `cleaning`).
- `subcategory` — the specialization **key/code** (e.g. `deep_cleaning`), same
  codes used by the expertise system.
- `fileType` — MIME, always `video/mp4` or `video/quicktime`.
- `fileSize` — bytes.

**Success response** — the app is deliberately tolerant of field naming
(`services/videoUpload.ts::normalizePresign`). It accepts the URL under any of
`url` / `uploadUrl` / `presignedUrl` / `signedUrl` / `putUrl`, and the key under
`s3Key` / `key` / `objectKey` / `Key`, at the top level **or** nested under a
`data` object. Recommended canonical shape:

```json
{
  "success": true,
  "url": "https://<bucket>.s3.<region>.amazonaws.com/workers/<id>/...?X-Amz-...",
  "s3Key": "workers/<id>/specializations/cleaning/deep_cleaning/1721563200-uuid.mp4",
  "expiresInSeconds": 900
}
```

> ⚠️ **Two failures we already hit — do not repeat:**
> 1. The `url` **must be present** in one of the accepted fields. An earlier
>    version returned it under an unrecognized name → the app received
>    `undefined` and the native uploader crashed.
> 2. The URL host **must be reachable from the phone** (a public HTTPS S3/MinIO
>    endpoint). A `localhost` / `127.0.0.1` / private-IP / Docker-service host
>    is reachable from the server but not the device → the upload throws a
>    connection error.

### 2.2 `POST /api/profile/expertise/video/submit`

Called after the S3 PUT succeeds.

**Request body**

```json
{
  "category": "cleaning",
  "subcategory": "deep_cleaning",
  "s3Key": "workers/<id>/specializations/cleaning/deep_cleaning/1721563200-uuid.mp4",
  "durationSeconds": 74,
  "fileSize": 48213456
}
```

**Success response** — the app reads `res.profile` and, if present, replaces its
local profile with it. Return the **full updated `ProfileData`** with the
subcategory now `pending`:

```json
{
  "success": true,
  "message": "Submitted for review",
  "profile": { /* full ProfileData, see §4 */ }
}
```

If `profile` is omitted the app falls back to marking the row `pending`
optimistically and refetching later — but returning it is strongly preferred.

### 2.3 `GET /api/profile` (existing — must be extended)

Each expertise **subcategory** object must now include a `status` field:

```json
{
  "key": "deep_cleaning",
  "name": "Deep cleaning",
  "active": false,
  "status": "pending"
}
```

`status` ∈ `"active" | "pending" | "rejected" | "none"`. See §5 for how to
derive it. (`active` stays for backwards-compat; the app prefers `status` and
falls back to `active` when `status` is absent.)

---

## 3. Data model (Drizzle + PostgreSQL)

### 3.1 New table: `specialization_submissions`

Tracks each video submitted for review.

```ts
// lib/db/src/schema/specializationSubmissions.ts
import { pgTable, uuid, text, integer, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { workersTable } from "./workers"; // your existing workers table

export const specializationSubmissionsTable = pgTable(
  "specialization_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workerId: uuid("worker_id").notNull().references(() => workersTable.id),

    category: text("category").notNull(),        // e.g. "cleaning"
    subcategory: text("subcategory").notNull(),   // e.g. "deep_cleaning"

    s3Key: text("s3_key").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    durationSeconds: integer("duration_seconds"),

    // pending | approved | rejected | superseded
    status: text("status").notNull().default("pending"),

    reviewerId: uuid("reviewer_id"),              // admin user, nullable
    rejectionReason: text("rejection_reason"),    // required when rejected
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byWorkerSkill: index("spec_sub_worker_skill_idx").on(t.workerId, t.category, t.subcategory),
    byStatus: index("spec_sub_status_idx").on(t.status),
  }),
);
```

Use a real enum if you prefer: `pgEnum("specialization_submission_status", [...])`.

### 3.2 Active specializations

You already store the worker's active expertise (the existing
`PUT /api/profile/expertise` endpoint writes it). Reuse that store. If it's a
JSON column, approval flips the subcategory on; if it's a join table
(recommended), approval inserts a row:

```ts
export const workerSpecializationsTable = pgTable(
  "worker_specializations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workerId: uuid("worker_id").notNull().references(() => workersTable.id),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull(),
    approvedFromSubmissionId: uuid("approved_from_submission_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ uniq: uniqueIndex("worker_spec_uniq").on(t.workerId, t.category, t.subcategory) }),
);
```

### 3.3 Migration

```bash
pnpm --filter @workspace/db exec drizzle-kit generate
pnpm --filter @workspace/db exec drizzle-kit migrate
```

---

## 4. `ProfileData` shape (what GET /api/profile returns)

The client type (`types/profile.ts`) is:

```ts
ProfileData {
  fullName: string;
  city: string;
  photoUrl: string | null;
  displayInitial: string;
  rating: number | null;
  jobsCompleted: number;
  expertise: Array<{
    category: string;      // "cleaning"
    name: string;          // "Cleaning"
    active: boolean;
    subcategories: Array<{
      key: string;         // "deep_cleaning"
      name: string;        // "Deep cleaning"
      active: boolean;
      status?: "active" | "pending" | "rejected" | "none";  // NEW
    }>;
  }>;
  account: { serviceArea: string; phone: string };
}
```

---

## 5. Deriving `status` per subcategory (the key wiring)

For each subcategory the worker's role supports, compute `status`:

```
if subcategory is in worker_specializations (active)      -> "active"
else look at the LATEST specialization_submission for (worker, category, subcategory):
    status === "pending"    -> "pending"
    status === "rejected"   -> "rejected"
    otherwise / no row      -> "none"
```

`active` should mirror `status === "active"` for backwards-compat.

Build the full subcategory catalog from the worker's role definition (the same
list the app shows), then annotate each with the derived status.

---

## 6. Endpoint implementations

### 6.1 S3 client + presign helper

```ts
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_SPECIALIZATION_BUCKET!;

const MAX_BYTES = 200 * 1024 * 1024;      // 200 MB  (mirror the app)
const MIN_SECONDS = 30;
const MAX_SECONDS = 180;
const ALLOWED_MIME = new Set(["video/mp4", "video/quicktime"]);
```

### 6.2 `POST /api/profile/expertise/video/presigned-url`

```ts
router.post("/api/profile/expertise/video/presigned-url", requireAuth, async (req, res) => {
  const worker = req.worker; // from token
  const body = presignSchema.parse(req.body); // zod: category, subcategory, fileName, fileType, fileSize

  // 1. Validate the skill belongs to the worker's role catalog.
  if (!isValidSkill(worker.role, body.category, body.subcategory))
    return res.status(400).json({ success: false, message: "Unknown specialization." });

  // 2. Reject if already active or already pending (see §7).
  //    (allow re-submit if last submission was rejected)

  // 3. Validate declared type/size up front.
  if (!ALLOWED_MIME.has(body.fileType))
    return res.status(400).json({ success: false, message: "Only MP4 and MOV videos are allowed." });
  if (body.fileSize > MAX_BYTES)
    return res.status(400).json({ success: false, message: "This video is too large (max 200 MB)." });

  // 4. Build an owner-scoped key. The workerId prefix is how we enforce
  //    ownership on /submit — never trust a client-supplied key.
  const ext = body.fileType === "video/quicktime" ? "mov" : "mp4";
  const s3Key = `workers/${worker.id}/specializations/${body.category}/${body.subcategory}/${Date.now()}-${randomUUID()}.${ext}`;

  // 5. Sign a PUT. ContentType MUST equal what the app sends as the PUT
  //    Content-Type header (it sends body.fileType) or S3 returns 403.
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, ContentType: body.fileType }),
    { expiresIn: 900 }, // 15 min
  );

  return res.json({ success: true, url, s3Key, expiresInSeconds: 900 });
});
```

**Content-Type note:** the app uploads with `Content-Type: <fileType>` (binary
PUT). Sign with the same `ContentType`, or you'll get `SignatureDoesNotMatch`.

**Enforcing max size at the edge (optional, stronger):** a plain presigned PUT
can't enforce a size range. Either (a) trust the declared `fileSize` here + the
`headObject` check in `/submit` (below), or (b) switch to
`createPresignedPost` with a `content-length-range` condition. Option (a) is
simpler and sufficient given the `/submit` verification.

### 6.3 `POST /api/profile/expertise/video/submit`

```ts
router.post("/api/profile/expertise/video/submit", requireAuth, async (req, res) => {
  const worker = req.worker;
  const body = submitSchema.parse(req.body); // category, subcategory, s3Key, durationSeconds, fileSize

  // 1. OWNERSHIP: the key must live under this worker's prefix.
  const prefix = `workers/${worker.id}/specializations/${body.category}/${body.subcategory}/`;
  if (!body.s3Key.startsWith(prefix))
    return res.status(403).json({ success: false, message: "Invalid upload key." });

  // 2. Duration bounds (mirror the app).
  if (body.durationSeconds < MIN_SECONDS || body.durationSeconds > MAX_SECONDS)
    return res.status(400).json({ success: false, message: "Video must be 30s–3min." });

  // 3. VERIFY the object really exists on S3 and matches limits.
  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: body.s3Key }));
  } catch {
    return res.status(400).json({ success: false, message: "We couldn't find your uploaded video. Please try again." });
  }
  if ((head.ContentLength ?? 0) > MAX_BYTES)
    return res.status(400).json({ success: false, message: "This video is too large (max 200 MB)." });
  if (head.ContentType && !ALLOWED_MIME.has(head.ContentType))
    return res.status(400).json({ success: false, message: "Unsupported video format." });

  // 4. Guard rails (see §7): reject if already active; supersede any prior pending.
  if (await isActive(worker.id, body.category, body.subcategory))
    return res.status(409).json({ success: false, message: "You already have this specialization." });

  await db.update(specializationSubmissionsTable)
    .set({ status: "superseded", updatedAt: new Date() })
    .where(and(
      eq(specializationSubmissionsTable.workerId, worker.id),
      eq(specializationSubmissionsTable.category, body.category),
      eq(specializationSubmissionsTable.subcategory, body.subcategory),
      eq(specializationSubmissionsTable.status, "pending"),
    ));

  // 5. Insert the PENDING submission.
  await db.insert(specializationSubmissionsTable).values({
    workerId: worker.id,
    category: body.category,
    subcategory: body.subcategory,
    s3Key: body.s3Key,
    fileSizeBytes: head.ContentLength ?? body.fileSize,
    durationSeconds: body.durationSeconds,
    status: "pending",
  });

  // 6. (optional) enqueue admin-review notification / Slack ping.

  // 7. Return the fresh profile (subcategory now "pending").
  const profile = await buildProfile(worker.id); // §5 logic
  return res.json({ success: true, message: "Submitted for review", profile });
});
```

Zod schemas:

```ts
const presignSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.enum(["video/mp4", "video/quicktime"]),
  fileSize: z.number().int().positive(),
});
const submitSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().min(1),
  s3Key: z.string().min(1),
  durationSeconds: z.number().int().positive(),
  fileSize: z.number().int().positive(),
});
```

---

## 7. Guard rails / state rules

| Current state of (worker, cat, sub) | presigned-url | submit |
|---|---|---|
| `active` (already approved) | 409 "already have this" | 409 |
| `pending` (in review) | 409 "already in review" **or** allow re-record and supersede | supersede old pending, insert new |
| `rejected` | allow (retry) | allow; new row supersedes rejected |
| `none` | allow | allow |

Pick one policy for `pending` and be consistent. Recommended: **allow
re-recording while pending** and supersede the previous pending row (the app's
"Choose a different video" affordance implies this).

---

## 8. Admin / reviewer endpoints

These power the review that flips `pending → approved/rejected`. Protect with an
**admin** auth guard (separate from worker tokens).

### 8.1 `GET /api/admin/specialization-submissions?status=pending`

Queue for reviewers, oldest first. Include worker name/phone/city, category,
subcategory, `durationSeconds`, `createdAt`, and a playback URL (below).

### 8.2 `GET /api/admin/specialization-submissions/:id/video`

Return a **presigned GET** URL (expires ~1h) so the reviewer streams the video
without the bucket being public:

```ts
const url = await getSignedUrl(
  s3,
  new GetObjectCommand({ Bucket: BUCKET, Key: submission.s3Key }),
  { expiresIn: 3600 },
);
return res.json({ success: true, url });
```

### 8.3 `POST /api/admin/specialization-submissions/:id/approve`

Transaction:
1. `specialization_submissions.status = "approved"`, set `reviewerId`, `reviewedAt`.
2. Upsert into `worker_specializations` (worker now **has** the skill).
3. Notify the worker (push + SMS): *"Your ‘Deep cleaning' specialization has been approved."*

Next `GET /api/profile` returns `status: "active"` for that subcategory.

### 8.4 `POST /api/admin/specialization-submissions/:id/reject`

Body `{ reason }`. Set `status = "rejected"`, store `rejectionReason`,
`reviewedAt`, `reviewerId`. Notify worker with the reason. App shows a **"Retry"**
pill; the worker can submit a new video.

---

## 9. S3 bucket configuration

- **Bucket:** dedicated, e.g. `kaaryo-worker-specialization-videos` (separate
  from app assets and, ideally, from onboarding videos).
- **Block all public access: ON.** Videos are served only via presigned GET.
- **Encryption:** SSE-S3 (default).
- **CORS** (required for browser/mobile presigned PUT):

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Tighten `AllowedOrigins` for production web; mobile native PUTs are unaffected.

- **Key layout:** `workers/{workerId}/specializations/{category}/{subcategory}/{ts}-{uuid}.{ext}`
- **Lifecycle:** delete videos of `rejected`/`superseded` submissions after ~90
  days to save cost; keep approved ones (or archive to Glacier after 1 year).

---

## 10. Security checklist

- ✅ Worker resolved from bearer token; **never** trust a client `workerId`.
- ✅ `s3Key` ownership enforced via the `workers/{workerId}/…` prefix check on
  `/submit`.
- ✅ Presigned PUT expires in 15 min; presigned GET (admin) in 1 h.
- ✅ Sign PUT with the exact `ContentType` the app sends.
- ✅ Re-validate type/size/duration server-side (client checks are UX only);
  confirm real size/type via `headObject`.
- ✅ Presigned URL host is public + HTTPS + reachable from mobile networks.
- ✅ Rate-limit presign/submit per worker (e.g. 10/hour) to prevent abuse.
- ✅ Admin endpoints behind a separate admin guard.

---

## 11. Edge cases

- **Upload OK but `/submit` never arrives** (app killed): a nightly reconcile job
  lists the bucket prefix and drops orphaned objects with no matching
  submission after N hours.
- **Duplicate/superseded pending:** handled by the supersede step in §6.3.
- **Skill not in worker's role:** reject in presign (`isValidSkill`).
- **Category mismatch** between `presigned-url` and `submit`: the prefix check
  catches it (key encodes category+subcategory).
- **Re-submit after reject:** allowed; the new row supersedes the rejected one;
  status returns to `pending`.

---

## 12. Dependencies & env

```bash
pnpm --filter @workspace/api-server add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# uuid: use node's crypto.randomUUID() (no dep needed)
```

Environment variables:

```
AWS_REGION=ap-south-1
S3_SPECIALIZATION_BUCKET=kaaryo-worker-specialization-videos
# Credentials via IAM role (preferred) or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
VIDEO_MAX_BYTES=209715200
VIDEO_MIN_SECONDS=30
VIDEO_MAX_SECONDS=180
```

IAM permissions for the API role, scoped to the bucket:
`s3:PutObject`, `s3:GetObject`, `s3:HeadObject`, `s3:DeleteObject`,
`s3:ListBucket`.

---

## 13. Build/verify checklist

- [ ] Migration creates `specialization_submissions` (+ `worker_specializations`).
- [ ] `GET /api/profile` returns `status` on every subcategory (§5).
- [ ] `presigned-url` returns a **reachable, HTTPS** `url` + `s3Key`, signed with
      the request's `fileType` as `ContentType`.
- [ ] Manual test: `curl -X PUT -H "Content-Type: video/mp4" --data-binary @clip.mp4 "<url>"`
      returns `200` from a machine **outside** your VPC.
- [ ] `submit` verifies via `headObject`, records `pending`, returns full profile.
- [ ] Approve flips subcategory to `active` on next profile fetch; reject → `rejected`.
- [ ] Ownership: submitting another worker's `s3Key` returns `403`.
- [ ] Worker notified on approve/reject.

---

### Note: onboarding practical-video endpoints (shared infra)

The onboarding task uses the same pattern under
`/api/worker/onboarding/video/{presigned-url,confirm-upload,status}`. If those
aren't finished yet, the S3 client, presign helper, `headObject` verification,
CORS, and reconcile job built here are directly reusable — only the key prefix
(`workers/{id}/onboarding/task{n}/…`) and the "both uploaded → advance
onboarding step" logic differ.
