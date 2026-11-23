# Zoho CRM automations (DVT CRM sandbox)

Source of the Deluge functions deployed in Zoho, kept here as a backup.

| Function | Trigger (workflow rule) | What it does |
|---|---|---|
| `proposal_automation` | Proposals (Deals): create or edit | Proposal ID (YY + 5 digits), version IDs (`.1`, `.2`…), one Scope/Version record per version row, current version → Current Proposal Value, Awarded Contract Value = sum of DVT Won versions, Opportunity Status + Probability (Open 40%, Open > 45 days 15%, Open/HIGH 75%), and on DVT Won creates the Project (`YYMM18##` + P/D/M/S/O; add-ons `parent-n`) with selected vendors and costs. |
| `sync_vendor_quotes` | Scope/Versions: create or edit | Mirrors every Acquisition and Mapping quote row into the Vendor Quotes module (keyed on the subform row id; removed rows are flagged "Removed from Version"), enforces one final vendor per version (Selection Warning), and rolls the selected costs up to the version. |
