# GiggleBox Parent Dashboard — Product Structure

This pack moves the project from proof-of-pipeline toward a cleaner parent-facing product structure.

## Core product sections

### 1. Top Summary
This is the "at a glance" layer for a parent:
- total children
- linked devices
- total events
- latest emotion
- latest spoken word
- coloring saves
- last activity

### 2. Recent Activity
This is the living feed:
- words spoken
- emotion state updates
- Ask Me style interactions
- coloring saves
- storybook interactions
- session / activity markers

### 3. Deep Dive
This gives a parent more context without overwhelming the main screen:
- words history
- emotion history
- saved artwork history
- telemetry by event type
- raw payload snapshots for debugging during build phase

### 4. Child Profiles
Each child should eventually show:
- name
- age
- linked device
- last activity
- event count
- emotion snapshot
- recent activity
- saved artwork count

### 5. Alerts
This is where higher-priority signals will surface:
- concern / flagged Ask Me input
- unusual behavior patterns
- sync issues
- device connection issues

### 6. Saved Artwork / Coloring
This should become its own content bucket:
- latest saved drawing
- recent saves list
- image reference / image URL
- page / prompt / title

### 7. Emotion View
This should be parent-readable, not raw:
- latest emotion
- emotion counts
- emotion timeline
- trend summary later

## Recommended parent UX shape

### Dashboard home
- summary cards on top
- recent activity feed in main left column
- emotion summary / child list / saved artwork panel in right column

### Child detail
- child header
- linked device info
- last known emotion
- words spoken
- saved artwork
- recent child-only activity

## Current data source assumptions
The current implementation uses:
- children
- devices
- child_device_links
- telemetry_events
- alerts

Telemetry event types already supported or anticipated:
- word_spoken
- emotion_state
- emotion_selected
- emotion_detected
- coloring_saved
- coloring_book_saved
- coloring_save
- ask_me
- story_played
- session_started
- session_ended
