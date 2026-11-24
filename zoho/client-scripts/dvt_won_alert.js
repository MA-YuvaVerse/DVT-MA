// Module: Proposals (Deals), layout Standard, page Edit. Event: onChange of Opportunity Status (Stage).
if (value === 'DVT Won') {
  var rows = ZDK.Page.getSubform('Proposal_Services_Scope').getValue() || [];
  var selected = rows.filter(function (r) { return r.Version_Status === 'Selected'; }).length;
  if (selected === 0) {
    ZDK.Client.showAlert('No version is marked Selected. Mark the accepted version(s) as Selected in Proposal Services/Scope before saving as DVT Won.');
  } else {
    ZDK.Client.showAlert(selected + ' version(s) Selected. On save, one project is created per Selected version and every version still Open is set to Not Selected.');
  }
}
