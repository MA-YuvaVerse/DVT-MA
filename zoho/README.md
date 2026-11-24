# Zoho CRM automations (DVT CRM sandbox)

Source of the Deluge functions deployed in Zoho, kept here as a backup.

| Function | Workflow (trigger) | What it does |
|---|---|---|
| `proposal_automation` | Proposals (Deals): create or edit | Proposal ID (YY + 5 digits). One Scope/Version record per scope row, named `ProposalID.n` and linked through the row's **Version ID** lookup; row edits are copied to the version (only changed fields, never duplicates). Open > 45 days sets Probability to 15%. On **DVT Won**: Final Proposal Value = sum of Selected versions, and one Project per Selected version (`YYMM18##` + P/D/M/S/O, add-ons `parent-n`) with **Proposal Version**, vendors and costs. Estimated Proposal Value stays manual. |
| `sync_vendor_quotes` | Scope/Versions: create or edit | Version number + two-way sync with its proposal scope row (a version created on its own gets a new row). Acquisition and Mapping quote rows create/update Vendor Quotes (type Acquisition / Mapping), keyed by the row's Acq/Map Quote ID lookup. Mapping Cost/Acre = vendor cost / version Mapping Acres. Selected costs rolled up to the version. |
| `vendor_quote_automation` | Vendor Quotes: create or edit | Edits on a Vendor Quote update its quote row; a Vendor Quote created on its own adds and links a new row (no duplicates). |

Status mapping between the scope table (Version Status) and the version record (Status): DVT Won ↔ Selected, Cancelled / Client Lost / Client Won-DVT Lost → Cancelled, Abandoned ↔ Abandoned, everything else → Open.

## Cost rules (Nov 24)
- Proposal Version Cost (`Scope_Versions.Proposal_Cost`) = selected acquisition cost + selected mapping cost + Internal Cost
  (calculated by `sync_vendor_quotes` on every version save; no longer copied from Value).
- Final Proposal Value (Deals) = sum of the Selected versions' Value (set at DVT Won by `proposal_automation`).
- Open > 45 days -> 15%: the daily schedule counts from Proposal Request Date (else Created Time).
  The in-deal check in `proposal_automation` references `Proposal_Sent_Date`, which does not exist, so it is a no-op.

## Dashboard "DroneView Home" (analytics 7550436000001382001)
KPIs: Open proposals, Pipeline (Amount), Weighted (Expected Revenue), Open over 45 days (Open + 15%),
Projects in progress, Backlog, To be billed. Panels: Open over 45 days list, Open proposals by status,
Invoicing, Mapping due from the sub, Projects by status, Vendor quotes expiring (new Vendor Quotes field Quote_Expiry_Date).
Follow-ups due waits on a Next Follow-up date field (API rejects relative-date filters).

## Margin formulas (Scope_Versions, Nov 24)
- Contribution Margin = `${Value}-(${Total_Vendor_Costs}+${Select_Mapping_Cost}+${Internal_Cost})`
- Contribution Margin % = `If(${Value}>0,(Value - those three costs)/${Value}*100,0)`
They read the three cost fields directly, so the margin is right the moment the version is saved; Proposal Version Cost
(same sum) is written by `sync_vendor_quotes` a few seconds later. With no Proposal Total (Value) the % is blank.
