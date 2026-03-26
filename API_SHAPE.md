# Next API / Data Shape

This pack standardizes the dashboard response into parent-facing sections.

## GET /api/dashboard/overview

Supports:
- all children summary
- optional child filter via `?childId=...`

## Response shape

```json
{
  "ok": true,
  "filters": {
    "childId": null
  },
  "summary": {
    "totalChildren": 1,
    "totalDevices": 1,
    "totalLinks": 1,
    "totalEvents": 3,
    "lastActivityAt": "2026-03-26T13:28:08.085481+00:00",
    "lastEventType": "word_spoken",
    "latestWord": "apple",
    "latestEmotion": "happy",
    "coloringSaveCount": 1,
    "openAlerts": 0
  },
  "children": [],
  "recentActivity": [],
  "deepDive": {
    "words": [],
    "emotions": [],
    "savedArtwork": [],
    "eventTypes": {}
  },
  "alerts": []
}
```

## Notes
- `children` is the product-friendly child list for cards/navigation
- `recentActivity` powers the feed
- `deepDive.words` provides a drill-down list for words
- `deepDive.emotions` powers emotion trend/timeline
- `deepDive.savedArtwork` powers coloring/art sections
- `alerts` is designed to be parent-facing later
