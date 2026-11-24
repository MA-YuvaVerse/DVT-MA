# DroneView Proposals widget (adapted to this account)

Nhat's proposal screen (built in the test org) pointed at this account's modules. Nothing in the account is changed by it:
it reads and writes the existing records, and the existing Zoho scripts do the numbering, syncing, roll-ups and projects.

| Screen name | This account |
|---|---|
| Proposal, Proposal ID | Deals, `Proposal_ID` |
| Version (.1 .2), price, title, accepted | `Scope_Versions`: `Name` (ProposalID.n), `Value`, `Title`, `Status` = Selected |
| Quote, Quote ID, cost, selected, days, expiry | `Vendor_Quotes`: `Name` (= Quote ID, AQ/MQ number), `Vendor_Cost`, `Is_Selected_Vendor`, `Est_Project_Days`, `Quote_Expiry_Date`, `Acquisition_Sensor` |
| Project, contract value | `Project`: `Project_number`, `Awarded_Contract_Value`, `Proposal_Version` |
| Follow ups, city, due date, type | `Followup_Date`, `Next_Follow_up_Date`, `Opportunity_City`, `Proposal_Due_Date`, `Opportunity_Type1` |

Behaviour in this account:
- Contribution Margin = Proposal Total - (selected acquisition + selected mapping); % = margin / total (same as Zoho and the 11-11 sheet).
- Picking a quote saves the version's Acquisition / Mapping table; Zoho's script copies it to Vendor Quotes and rolls the costs up.
- Accept = the ticked versions' scope rows set to Selected + status DVT Won in one save. Zoho then makes one project per
  Selected version, sets the others Not Selected and fills Final Proposal Value.
- Delete quote / version removes its table row / scope row first, so Zoho's sync does not recreate it.
- Pipeline value = Estimated Proposal Value when typed, else the highest version price.
- Not shown (no field in this account): Mobilization, quote Location, Deliverables, Loss Reason, the "one project for all" option.
- Nhat's six Deluge scripts are NOT used here; the account's own scripts do that work.

## Upload
Setup > Developer Hub > Widgets > Create New Widget: Type **Web Tab**, Hosting **Zoho**, upload `dvt-proposals-widget.zip`,
index page `/app/widget.html`. Then Setup > Modules and Fields (or Tabs) > New Web Tab "DV Proposals" using that widget,
and give it to the profiles that should see it.
