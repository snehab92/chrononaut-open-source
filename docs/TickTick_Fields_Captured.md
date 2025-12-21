# TickTick Fields Captured in Tasks Table

## Overview
This document shows what fields from TickTick are captured and stored in the `tasks` table.

## Database Schema

### TickTick Sync Fields

| Field | Type | Description | Source from TickTick |
|-------|------|-------------|---------------------|
| `ticktick_id` | `text` (unique) | TickTick task ID | `task.id` |
| `ticktick_list_id` | `text` | TickTick project/list ID | `task.projectId` |
| `ticktick_list_name` | `text` | Human-readable list/project name | `projectProfiles[projectId].name` |
| `ticktick_section_name` | `text` | Section name within the list | `sections[columnId].name` |
| `sync_status` | `text` | Sync status (default: 'synced') | Computed |
| `last_synced_at` | `timestamp` | Last sync timestamp | Computed |

### Task Data Fields (from TickTick)

| Field | Type | Description | Source from TickTick |
|-------|------|-------------|---------------------|
| `title` | `text` | Task title | `task.title` |
| `content` | `text` | Task description/notes | `task.content` or `task.desc` |
| `priority` | `integer` (0-4) | Priority level | `task.priority` (0=none, 1=low, 3=medium, 5=high) |
| `due_date` | `timestamp` | Due date | `task.dueDate` (parsed) |
| `completed` | `boolean` | Completion status | `task.status === 2` |
| `completed_at` | `timestamp` | Completion timestamp | Set when `completed = true` |

### Time Tracking Fields

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `estimated_minutes` | `integer` | Estimated time | Not from TickTick (local only) |
| `actual_minutes` | `integer` | Actual time spent | Not from TickTick (local only) |

## Fields NOT Captured (Available in TickTick API but not stored)

Based on the TickTick API structure, these fields are available but not currently captured:

- `startDate` - Task start date
- `isAllDay` - All-day flag
- `timeZone` - Timezone
- `reminders` - Reminder array
- `tags` - Tag array
- `sortOrder` - Sort order
- `items` - Checklist/subtasks
- `parentId` - Parent task ID (for subtasks)
- `modifiedTime` - Last modification timestamp

## Sync Process

1. **Fetch Projects**: Gets all projects to build `projectNameMap`
2. **Fetch Sections**: For each project, fetches sections to build `sectionNameMap`
3. **Map Fields**: When upserting tasks:
   - `ticktick_list_name` = `projectNameMap.get(projectId)`
   - `ticktick_section_name` = `sectionNameMap.get(columnId)` (if columnId exists)

## Example Data Structure

```typescript
{
  id: "uuid",
  user_id: "uuid",
  
  // TickTick sync fields
  ticktick_id: "60a8f8e8e8e8e8e8e8e8e8e8",
  ticktick_list_id: "5f8f8f8f8f8f8f8f8f8f8f8f",
  ticktick_list_name: "Projects",
  ticktick_section_name: "Build Second Brain App",
  sync_status: "synced",
  last_synced_at: "2025-12-20T14:30:00Z",
  
  // Task data
  title: "Implement MCP connection",
  content: "Set up Supabase MCP for database queries",
  priority: 3, // medium
  due_date: "2025-12-25T00:00:00Z",
  completed: false,
  completed_at: null,
  
  // Time tracking
  estimated_minutes: 120,
  actual_minutes: null,
  
  created_at: "2025-12-20T10:00:00Z",
  updated_at: "2025-12-20T14:30:00Z"
}
```

## Notes

- **List vs Section**: 
  - List = TickTick Project (e.g., "Projects", "Health & Beauty")
  - Section = Sub-category within a project (e.g., "Build Second Brain App" section within "Projects")
  
- **Priority Mapping**:
  - TickTick: 0=none, 1=low, 3=medium, 5=high
  - Stored as-is (0-4 range enforced by DB constraint, but TickTick uses 0,1,3,5)

- **Section Names**: Only captured if the task has a `columnId` (belongs to a section)




