// Module: Acqs Vendor Sensor (Acquisition_Vendor_Sensor), layout Standard
// Event: onChange of field Sensor_Name, pages Create / Edit / Clone (scripts 1213099 / 1206207 / 1206217)
// Copies the selected Sensor Name picklist value into the Name field (trailing commas removed).
// Name stays editable (Nov 24: users could not save when the onChange did not fire).
var s = ZDK.Page.getField('Sensor_Name').getValue();
if (s && typeof s === 'object') { s = s.display_value || s.actual_value || s.name || ''; }
var v = (s === undefined || s === null) ? '' : String(s);
v = v.replace(/[,\s]+$/, '').trim();
if (v && v !== '-None-') {
  ZDK.Page.getField('Name').setValue(v);
}

// ---- Event: onLoad, pages Create / Edit (scripts 1197157 / 1207140) ----
// var nameField = ZDK.Page.getField('Name');
// nameField.setReadOnly(false);
// var s = ZDK.Page.getField('Sensor_Name').getValue();
// if (s && !nameField.getValue()) { var v = String(s).replace(/[,\s]+$/, '').trim(); if (v && v !== '-None-') nameField.setValue(v); }
