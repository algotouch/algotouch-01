
export interface ValidationErrors {
  [key: string]: string;
}

export const validateSignupInputs = (
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  password: string,
  passwordConfirm: string
): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // בדיקת שדות חובה
  if (!firstName.trim()) errors.firstName = 'שדה חובה';
  if (!lastName.trim()) errors.lastName = 'שדה חובה';
  
  // בדיקת תקינות מייל
  if (!email.trim()) {
    errors.email = 'שדה חובה';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'כתובת מייל לא תקינה';
  }
  
  // בדיקת תקינות סיסמה
  if (!password) {
    errors.password = 'שדה חובה';
  } else if (password.length < 6) {
    errors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
  }
  
  // בדיקת התאמת סיסמאות
  if (password !== passwordConfirm) {
    errors.passwordConfirm = 'הסיסמאות אינן תואמות';
  }
  
  // בדיקת תקינות מספר טלפון (אם הוזן)
  if (phone.trim() && !/^0[2-9]\d{7,8}$/.test(phone)) {
    errors.phone = 'מספר טלפון לא תקין';
  }
  
  return errors;
};
