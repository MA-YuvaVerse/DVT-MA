// Module: Acqs Vendor Sensor (Acquisition_Vendor_Sensor), layout Standard
// Event: onChange of field Sensor_Name, pages Create / Edit / Clone
// Copies the selected Sensor Name picklist value into the mandatory Name field
// (trailing commas from the legacy spreadsheet values are removed).
var v = (value === undefined || value === null) ? '' : String(value);
v = v.replace(/[,\s]+$/, '').trim();
if (v && v !== '-None-') {
  ZDK.Page.getField('Name').setValue(v);
}

// ---- Event: onLoad, pages Create / Edit ----
// var nameField = ZDK.Page.getField('Name');
// nameField.setReadOnly(true);
// var s = ZDK.Page.getField('Sensor_Name').getValue();
// if (s) { var v = String(s).replace(/[,\s]+$/, '').trim(); if (v && v !== '-None-') nameField.setValue(v); }
