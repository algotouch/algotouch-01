
export const getPlanDetails = (planId: string) => {
  switch (planId) {
    case 'monthly':
      return {
        name: 'מסלול חודשי',
        price: '371₪',
        description: 'תקופת ניסיון 30 יום חינם, אחר כך 371₪ לחודש',
        info: 'יצירת טוקן בלבד - ללא חיוב בתקופת הניסיון',
        operationType: 3, // CreateTokenOnly - trial first, then recurring charges
        amount: 0, // No charge during trial
        hasTrial: true,
        trialDays: 30,
        recurringAmount: 371 // Amount for monthly charges after trial
      };
    case 'annual':
      return {
        name: 'מסלול שנתי',
        price: '3,371₪',
        description: 'חיוב מיידי + הנחה של 25%',
        info: 'חיוב וטוקן - תשלום עכשיו + הכנה לשנה הבאה',
        operationType: 2, // ChargeAndCreateToken - immediate charge + token for next year
        amount: 3371,
        hasTrial: false
      };
    case 'vip':
      return {
        name: 'מסלול VIP',
        price: '13,121₪',
        description: 'תשלום חד-פעמי לכל החיים',
        info: 'חיוב בלבד - ללא חיובים עתידיים',
        operationType: 1, // ChargeOnly - one-time payment, no recurring
        amount: 13121,
        hasTrial: false
      };
    default:
      return {
        name: 'מסלול לא ידוע',
        price: '0₪',
        description: '',
        info: '',
        operationType: 3,
        amount: 0,
        hasTrial: false
      };
  }
};

export const getTrialEndDate = (planId: string): Date | null => {
  if (planId === 'monthly') {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    return trialEnd;
  }
  return null;
};

export const getNextChargeDate = (planId: string): Date | null => {
  switch (planId) {
    case 'monthly':
      const monthlyNext = new Date();
      monthlyNext.setDate(monthlyNext.getDate() + 30); // After trial
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
