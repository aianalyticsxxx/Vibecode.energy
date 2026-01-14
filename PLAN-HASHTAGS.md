# Implementation Plan: Hashtag System with Trending Tags

## Status: IMPLEMENTED

The hashtag system has been fully implemented with the following features:
- Hashtag extraction from both prompts and captions
- Tag storage with many-to-many relationship
- Trending tags API endpoint
- Tag-filtered feed
- Clickable hashtags in VibeCard
- Dynamic TrendingPanel in dashboard sidebar
- Dedicated tag page at `/tags/[tag]`

---

## Files Created/Modified

| Status | File | Description |
|--------|------|-------------|
| CREATED | `apps/api/src/db/migrations/007_hashtags.sql` | Tags + shot_tags tables |
| CREATED | `apps/api/src/services/tag.service.ts` | Extraction, CRUD, trending |
| CREATED | `apps/api/src/routes/tags/index.ts` | `/tags/trending`, `/tags/:name/shots` |
| MODIFIED | `apps/api/src/routes/shots/index.ts` | Extract & attach hashtags on create |
| MODIFIED | `apps/api/src/app.ts` | Registered tag routes |
| CREATED | `apps/web/src/hooks/useTags.ts` | `useTrendingTags`, `useTagFeed` |
| MODIFIED | `apps/web/src/lib/api.ts` | Added tag API methods + types |
| CREATED | `apps/web/src/components/HashtagText.tsx` | Clickable hashtag rendering |
| CREATED | `apps/web/src/components/TrendingSidebar.tsx` | Standalone sidebar component |
| MODIFIED | `apps/web/src/components/dashboard/TrendingPanel.tsx` | Now uses real API data |
| CREATED | `apps/web/src/app/(main)/tags/[tag]/page.tsx` | Tag detail page |
| MODIFIED | `apps/web/src/components/feed/VibeCard.tsx` | Uses HashtagText for prompts |

---

## Database Schema

```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tags_name ON tags(name);

CREATE TABLE shot_tags (
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (shot_id, tag_id)
);

CREATE INDEX idx_shot_tags_tag_id ON shot_tags(tag_id);
CREATE INDEX idx_shot_tags_created_at ON shot_tags(created_at);
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /tags/trending?days=7&limit=10` | Get trending hashtags |
| `GET /tags/:name/shots?cursor=...&limit=20` | Get shots by tag |

---

## To Complete

Run the database migration:
```bash
# From vibecode directory
psql $DATABASE_URL -f apps/api/src/db/migrations/007_hashtags.sql
```

---

## Verification Checklist

- [ ] Run migration against database
- [ ] Create a shot with `#test` in the prompt
- [ ] Verify `GET /tags/trending` returns the tag
- [ ] Visit `/tags/test` in browser to see filtered shots
- [ ] Click hashtag in VibeCard to navigate to tag page
- [ ] Check TrendingPanel in sidebar shows real data

---

## Features

### Hashtag Extraction
- Regex: `/#([a-zA-Z][a-zA-Z0-9_]{0,49})/g`
- Tags extracted from both prompt and caption
- Normalized to lowercase
- Deduplicated before storing

### Trending Algorithm
- Counts tag usage within configurable time window (default: 7 days)
- Uses `shot_tags.created_at` for accurate time-based filtering
- Returns top N tags sorted by count

### UI Components
- **HashtagText**: Renders text with clickable `#tag` links styled in terminal accent color
- **TrendingPanel**: Dashboard sidebar showing top 5 trending tags
- **TrendingSidebar**: Alternative standalone component for other layouts
- **TagPage**: Full page with tag header and filtered shot feed

---

## Notes

- Tags are case-insensitive (stored lowercase)
- Maximum tag length: 50 characters
- Tags must start with a letter
- Old shots without tags will simply have empty tags array
- CASCADE delete ensures cleanup when shots are deleted
