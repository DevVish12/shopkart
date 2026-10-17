export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

export function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(String(phone || '').replace(/\s/g, ''));
}

export function isValidPincode(pincode) {
  return /^\d{6}$/.test(String(pincode || '').trim());
}

export function isStrongPassword(pw) {
  return String(pw || '').length >= 6;
}

export function validateAddress(addr) {
  const errors = {};
  if (!addr.fullName?.trim()) errors.fullName = 'Full name is required';
  if (!isValidPhone(addr.phone)) errors.phone = 'Enter a valid 10-digit mobile number';
  if (!addr.line1?.trim()) errors.line1 = 'Address line is required';
  if (!addr.city?.trim()) errors.city = 'City is required';
  if (!addr.state?.trim()) errors.state = 'State is required';
  if (!isValidPincode(addr.pincode)) errors.pincode = 'Enter a valid 6-digit pincode';
  return errors;
}
