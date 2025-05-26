
export const getPlanDetails = (planId: string) => {
  switch (planId) {
    case 'monthly':
      return {
        name: 'מסלול חודשי',
        price: '1₪',
        description: 'חודש ראשון 1₪ לבדיקת תקינות הכרטיס, אחר כך 371₪ לחודש',
        info: 'חיוב וטוקן - 1₪ עכשיו + הכנה לחיובים חוזרים',
        operationType: 2, // ChargeAndCreateToken - charge 1₪ + token
        amount: 100, // 1₪ in agorot
        hasTrial: false,
        recurringAmount: 37100 // 371₪ for monthly charges after first month
      };
    case 'annual':
      return {
        name: 'מסלול שנתי',
        price: '3,371₪',
        description: 'חיוב מיידי + הנחה של 25%',
        info: 'חיוב וטוקן - תשלום עכשיו + הכנה לשנה הבאה',
        operationType: 2, // ChargeAndCreateToken - immediate charge + token for next year
        amount: 337100, // 3,371₪ in agorot
        hasTrial: false
      };
    case 'vip':
      return {
        name: 'מסלול VIP',
        price: '13,121₪',
        description: 'תשלום חד-פעמי לכל החיים',
        info: 'חיוב בלבד - ללא חיובים עתידיים',
        operationType: 1, // ChargeOnly - one-time payment, no recurring
        amount: 1312100, // 13,121₪ in agorot
        hasTrial: false
      };
    default:
      return {
        name: 'מסלול לא ידוע',
        price: '0₪',
        description: '',
        info: '',
        operationType: 2,
        amount: 0,
        hasTrial: false
      };
  }
};

export const getTrialEndDate = (planId: string): Date | null => {
  // No more trial periods, just reduced first payment for monthly
  return null;
};

export const getNextChargeDate = (planId: string): Date | null => {
  switch (planId) {
    case 'monthly':
      const monthlyNext = new Date();
      monthlyNext.setMonth(monthlyNext.getMonth() + 1); // Next charge in one month
      return monthlyNext;
    case 'annual':
      const annualNext = new Date();
      annualNext.setFullYear(annualNext.getFullYear() + 1);
      return annualNext;
    case 'vip':
      return null; // No future charges
    default:
      return null;
  }
};
