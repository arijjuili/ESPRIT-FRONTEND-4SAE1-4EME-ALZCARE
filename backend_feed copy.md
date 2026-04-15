Here’s the full breakdown of the **Community & Social Service** backend and what you still need to wire up on the frontend.

---

## ✅ What you already have
**Posts & Comments** — you said this is done, but for reference the backend exposes:
- `POST   /api/v1/posts` / `GET /api/v1/posts` / `GET /api/v1/posts/{id}` / `PUT /api/v1/posts/{id}` / `DELETE /api/v1/posts/{id}`
- `POST   /api/v1/posts/{id}/like`
- `GET    /api/v1/posts/trending`
- `GET    /api/v1/posts?category=ADVICE`
- `POST   /api/v1/comments` / `GET /api/v1/comments/post/{postId}` / `PUT /api/v1/comments/{id}` / `DELETE /api/v1/comments/{id}`

Enums for posts:
- `DiscussionCategory`: `ADVICE`, `SUPPORT`, `RESOURCES`, `SUCCESS_STORIES`, `QUESTIONS`

---

## 🆕 What you still need to implement on the frontend

### 1. Activities (Events)
Backend entity: `Activity` — scheduled community events with location, capacity, status.

**Endpoints**
| Method | Endpoint | What it does |
|--------|----------|--------------|
| `GET`    | `/api/v1/activities` | Paginated list (query: `?type=GROUP` or `?status=PUBLISHED`) |
| `GET`    | `/api/v1/activities/upcoming` | List of future activities |
| `GET`    | `/api/v1/activities/{id}` | Full activity details |
| `POST`   | `/api/v1/activities` | Create activity *(Admin/Doctor only)* |
| `PUT`    | `/api/v1/activities/{id}` | Update activity |
| `DELETE` | `/api/v1/activities/{id}` | Cancel activity (sets status = `CANCELLED`) |

**Request shape (`ActivityCreateRequest`)**
```json
{
  "title": "Yoga for Seniors",
  "description": "Gentle morning yoga...",
  "type": "GROUP",
  "startDate": "2026-05-10T09:00:00",
  "endDate": "2026-05-10T10:00:00",
  "location": "Tunis Community Center",
  "latitude": 36.8065,
  "longitude": 10.1815,
  "maxCapacity": 20
}
```

**Response shape (`ActivityResponse`)**
```json
{
  "id": "uuid",
  "title": "...",
  "description": "...",
  "type": "GROUP",
  "startDate": "...",
  "endDate": "...",
  "location": "...",
  "latitude": 36.8,
  "longitude": 10.1,
  "maxCapacity": 20,
  "registeredCount": 5,
  "status": "PUBLISHED",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Enums:
- `ActivityType`: `GROUP`, `INDIVIDUAL`, `VIRTUAL`, `IN_PERSON`
- `ActivityStatus`: `PUBLISHED`, `IN_PROGRESS`, `CANCELLED`

---

### 2. Activity Recommendations & Map
**Endpoints**
| Method | Endpoint | What it does |
|--------|----------|--------------|
| `GET` | `/api/v1/activities/recommended?patientId={id}` | Personalized recommendations |
| `GET` | `/api/v1/activities/recommended/by-type?patientId={id}&type=VIRTUAL` | Filtered by type |
| `GET` | `/api/v1/activities/near?city=Tunis` | Near a city |
| `GET` | `/api/v1/activities/locations` | All activities with coords (for map pins) |
| `GET` | `/api/v1/activities/map?north=...&south=...&east=...&west=...` | Map bounds query |

---

### 3. Registrations (Sign-ups)
Backend entity: `Registration` — links a patient (and optional caregiver) to an activity.

**Endpoints**
| Method | Endpoint | What it does |
|--------|----------|--------------|
| `POST`   | `/api/v1/registrations` | Register patient for activity |
| `GET`    | `/api/v1/registrations/{id}` | Get registration details |
| `GET`    | `/api/v1/registrations/activity/{activityId}` | List all registrations for an activity |
| `GET`    | `/api/v1/registrations/patient/{patientId}` | List patient’s registrations |
| `GET`    | `/api/v1/registrations/activity/{activityId}/patient/{patientId}` | Check if specific patient is registered |
| `PUT`    | `/api/v1/registrations/{id}/status` | Update status (e.g. `CONFIRMED`, `CANCELLED`) |
| `DELETE` | `/api/v1/registrations/{id}` | Cancel registration |

**Request shape (`RegistrationCreateRequest`)**
```json
{
  "activityId": "uuid",
  "patientId": "string",
  "caregiverId": "string (optional)",
  "specialNeeds": "Wheelchair access (optional)"
}
```

**Status update request (`RegistrationStatusUpdateRequest`)**
```json
{ "status": "CONFIRMED" }
```

Enums:
- `RegistrationStatus`: `PENDING`, `CONFIRMED`, `RECORDED`, `CANCELLED`

---

### 4. Reminders
Backend entity: `ActivityReminder` — auto-generated reminders before an activity.

**Endpoints**
| Method | Endpoint | What it does |
|--------|----------|--------------|
| `GET`    | `/api/v1/reminders/upcoming?patientId={id}` | Unsent upcoming reminders for patient |
| `GET`    | `/api/v1/reminders/patient/{patientId}` | All reminders (including sent) |
| `GET`    | `/api/v1/reminders/activity/{activityId}` | Reminders for a specific activity |
| `POST`   | `/api/v1/reminders/trigger/{registrationId}` | Manually trigger a reminder |
| `PATCH`  | `/api/v1/reminders/{id}/mark-sent` | Mark reminder as sent |

**Response shape (`ReminderResponse`)**
```json
{
  "id": "uuid",
  "activityId": "uuid",
  "activityTitle": "Yoga for Seniors",
  "patientId": "string",
  "caregiverId": "string",
  "reminderDate": "2026-05-10T07:00:00",
  "activityStartDate": "2026-05-10T09:00:00",
  "sent": false,
  "sentAt": null,
  "timing": "H2",
  "emailSent": false
}
```

Enums:
- `ReminderTiming`: `H2`, `H24`, `H48`

---

### 5. Patient Interests (Preferences)
Backend entity: `PatientInterest` — stores city + preferred activity types for recommendations.

**Endpoints**
| Method | Endpoint | What it does |
|--------|----------|--------------|
| `PUT`    | `/api/v1/patient-interests` | Create / update interests |
| `GET`    | `/api/v1/patient-interests?patientId={id}` | Get interests |
| `DELETE` | `/api/v1/patient-interests?patientId={id}` | Delete interests |

**Request/response shape (`PatientInterest`)**
```json
{
  "id": "uuid",
  "patientId": "string",
  "city": "Tunis",
  "activityTypes": ["GROUP", "VIRTUAL"],
  "emailNotifications": true,
  "preferredReminderTiming": "H24"
}
```

---

### 6. Content Moderation
**Endpoints**
| Method | Endpoint | What it does |
|--------|----------|--------------|
| `POST` | `/api/v1/moderation/check` | Check text toxicity |
| `GET`  | `/api/v1/moderation/languages` | Supported languages |
| `GET`  | `/api/v1/moderation/blocked-words/{language}` | Blocked words list |

**Request**
```json
{ "content": "some text to check" }
```

**Response**
```json
{
  "toxic": true,
  "toxicityScore": 0.85,
  "detectedWords": ["badword"],
  "message": "Content contains inappropriate language"
}
```

---

## 🎯 Suggested frontend pages/features to build

| Feature | Backend resources needed |
|---------|--------------------------|
| **Activities calendar / list** | `GET /api/v1/activities`, `/upcoming` |
| **Activity details page** | `GET /api/v1/activities/{id}` + `GET /api/v1/registrations/activity/{id}` |
| **Register for activity button** | `POST /api/v1/registrations` |
| **My registrations page** | `GET /api/v1/registrations/patient/{patientId}` |
| **Activity map view** | `GET /api/v1/activities/locations` or `/map` |
| **Recommended for you** | `GET /api/v1/activities/recommended?patientId={id}` |
| **User interests settings** | `PUT /api/v1/patient-interests` |
| **Reminders / notifications panel** | `GET /api/v1/reminders/upcoming?patientId={id}` |
| **Post/comment toxicity guard** | `POST /api/v1/moderation/check` before submit |

If you want, I can generate Angular services + models for all of these now.