
export const getPlanDetails = (planId: string) => {
  if (planId === 'annual') {
    return {
      name: 'שנתי',
      price: '₪3,371',
      description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
      info: 'חיוב מיידי לכל השנה'
    };
  } else if (planId === 'vip') {
    return {
      name: 'VIP',
      price: '₪13,121',
      description: 'גישה לכל החיים בתשלום חד פעמי',
      info: 'חיוב מיידי חד פעמי'
    };
  } else {
    // Default to monthly plan
    return {
      name: 'חודשי',
      price: '₪371',
      description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
      info: 'חודש ראשון ללא תשלום'
    };
  }
};
