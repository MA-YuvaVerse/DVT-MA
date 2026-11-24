# Zoho CRM automations (DVT CRM sandbox)

Source of the Deluge functions deployed in Zoho, kept here as a backup.

| Function | Workflow (trigger) | What it does |
|---|---|---|
| `proposal_automation` | Proposals (Deals): create or edit | Proposal ID (YY + 5 digits). One Scope/Version record per scope row, named `ProposalID.n` and linked through the row's **Version ID** lookup; row edits are copied to the version (only changed fields, never duplicates). Open > 45 days sets Probability to 15%. On **DVT Won**: Final Proposal Value = sum of Selected versions, and one Project per Selected version (`YYMM18##` + P/D/M/S/O, add-ons `parent-n`) with **Proposal Version**, vendors and costs. Estimated Proposal Value stays manual. |
| `sync_vendor_quotes` | Scope/Versions: create or edit | Version number + two-way sync with its proposal scope row (a version created on its own gets a new row). Acquisition and Mapping quote rows create/update Vendor Quotes (type Acquisition / Mapping), keyed by the row's Acq/Map Quote ID lookup. Mapping Cost/Acre = vendor cost / version Mapping Acres. Selected costs rolled up to the version. |
| `vendor_quote_automation` | Vendor Quotes: create or edit | Edits on a Vendor Quote update its quote row; a Vendor Quote created on its own adds and links a new row (no duplicates). |

Status mapping between the scope table (Version Status) and the version record (Status): DVT Won ↔ Selected, Cancelled / Client Lost / Client Won-DVT Lost → Cancelled, Abandoned ↔ Abandoned, everything else → Open.

## Cost rules (Nov 24, per the 11-11 sheet)
- Total = Proposal Version Cost (`Proposal_Cost`, typed) when filled, else Value (the scope row's Proposal Total).
- Contribution Margin (Scope_Versions) = `If(IsEmpty(${Proposal_Cost}),${Value},${Proposal_Cost})-(${Total_Vendor_Costs}+${Select_Mapping_Cost})`
- Contribution Margin % = `If(T>0,(T-(${Total_Vendor_Costs}+${Select_Mapping_Cost}))/T*100,0)`, T = the same If(IsEmpty(...)) total.
  (`IsEmpty` is needed: an empty Proposal_Cost does not fall back to Value otherwise. A formula cannot use another
  formula field, and expressions are limited to 255 characters.)
- Selected acquisition / mapping costs are rolled up by `sync_vendor_quotes`. No Proposal Version Cost total and no
  Internal Cost (field deleted); Proposal_Cost is typed by the user (no automation).
- Final Proposal Value (Deals) = sum of the Selected versions' Value (set at DVT Won by `proposal_automation`).
- Open > 45 days -> 15%: the daily schedule counts from Proposal Request Date (else Created Time).

## Dashboard "DroneView Home" (analytics 7550436000001382001)
KPIs: Open proposals, Pipeline (Amount), Weighted (Expected Revenue), Open over 45 days (Open + 15%),
Projects in progress, Backlog, To be billed. Panels: Open over 45 days list, Open proposals by status,
Invoicing, Mapping due from the sub, Projects by status, Vendor quotes expiring (new Vendor Quotes field Quote_Expiry_Date).
Follow-ups due waits on a Next Follow-up date field (API rejects relative-date filters).

## Live (production org 7638879000000020005), Nov 24
Deployed from the sandbox, then fixed/completed here:
- Subform Proposal Services/Scope: added `P_Version` (Version ID lookup) and `Version_Status` (Open/Selected/Not Selected/Cancelled/Abandoned) - the sandbox change set for the subform was not deployed.
- Margin formulas re-applied (the deploy carried an older version) with the IsEmpty fix.
- Dashboard "DroneView Home" recreated (analytics 7638879000001151001).
- Existing data: Proposal_ID set from the proposal names (2500472, 2600366, 2500158, 2600380, 2600371); versions renamed
  ProposalID.1 / created where missing, set Selected and linked to their rows and existing projects.
- IDs backfilled (workbook IDs where matched): 15 companies, 8 contacts, 11 sensors, 1 location.
- Live test passed end to end (proposal ID, versions, quotes AQ/MQ, cost roll-up, margin, quote edit sync, DVT Won -> project, ID rule); test records deleted.
