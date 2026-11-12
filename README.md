# Calendar Questions - REDCap External Module

## What does it do?

Calendar Questions allows you to capture simple questions in a calendar format where questions are repeated for each day within specified date ranges. Data is stored as JSON in a REDCap text area (notes) field. This allows capturing daily responses over hundreds of days without creating individual fields for every day.

The module works on both standard REDCap data entry forms and public/participant surveys.

## Features

* **Calendar View** - Displays daily questions in an interactive monthly calendar grid.
* **Data Entry & Survey Support** - Works on backend data entry forms and public or participant survey pages.
* **Date Ranges & Offsets** - Configure question ranges using project date fields with optional day offsets.
* **Event Scoping** - Optionally limit a calendar configuration to a specific event, allowing reuse of the same notes field across multiple longitudinal events.
* **Branching & Replacement Logic** - Show questions conditionally based on field values, or replace older questions with newer ones.
* **Mark All Buttons** - Quick-fill buttons to set values across all incomplete days in a month.
* **Optional Compression** - Automatic gzip/base64 compression when fields approach character limits.

## Installing

You can install the module from the REDCap EM repo or drop it directly into your modules folder (i.e. `redcap/modules/calendar_questions_v1.0.0`) and enable it in the Control Center and your project.

## Configuration

* **Calendar Settings** - Select a target notes field, an optional event to scope the calendar to, and options for compression, blocking future dates, statistics, and always showing existing data.
* **Questions** - Define question text, type (text, integer, numeric/float, yes/no, checkbox), a variable name, and optional branching or replacement rules.
* **Ranges** - Define start and end date fields with optional offsets and question exclusion lists.
* **Mark All Buttons** - Define quick-action buttons with preset values for the current month.

## Compression

Optionally, you can compress the data stored in the notes field to save space when approaching the character limit. Data is only compressed when the stored JSON approaches the field limit (~60 KB). To decompress in external analysis scripts (e.g., Python):

```python
import binascii, gzip, json
redcap_string = "H4sIAAAAAAAACqtWSq1IzC3ISVWyUvJUSMlMyVMvUSjJyMzLVkjMq8zPS1Uozy/NSVFISU3OT0kFyRTrKdUCAFZwQgQ2AAAA"
data = json.loads(gzip.decompress(binascii.a2b_base64(redcap_string)))
```

## Dependencies

* **Day.js** (`js/dayjs.min.js`) - Auto-updating via GitHub Actions weekly workflow.