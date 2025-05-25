
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SignaturePad from '@/components/signature/SignaturePad';
import { AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface DigitalContractFormProps {
  onSign: (contractData: any) => void;
  planId: string;
  fullName: string;
}

const DigitalContractForm: React.FC<DigitalContractFormProps> = ({
  onSign,
  planId,
  fullName
}) => {
  const [signature, setSignature] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userIP, setUserIP] = useState<string>('');
  const contractRef = useRef<HTMLDivElement>(null);

  // Get user's IP address
  useEffect(() => {
    const fetchIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIP(data.ip);
      } catch (error) {
        console.log('Could not fetch IP address:', error);
        setUserIP('לא זמין');
      }
    };
    
    fetchIP();
  }, []);

  // Contract content with dynamic plan information
  const getContractContent = () => {
    const planNames = {
      'monthly': 'חבילה חודשית - ₪49/חודש',
      'quarterly': 'חבילה רבעונית - ₪120/3 חודשים',
      'annual': 'חבילה שנתית - ₪399/שנה',
      'vip': 'חבילת VIP - ₪999 (חד פעמי)'
    };

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">הסכם שירות - TraderVue</h1>
          <p style="color: #666; font-size: 14px;">מערכת לניהול תיק השקעות ומסחר</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="color: #2563eb; margin-bottom: 15px;">פרטי החבילה הנבחרת:</h3>
          <p style="font-size: 16px; font-weight: bold; color: #333;">${planNames[planId] || planId}</p>
          <p style="color: #666; margin-top: 10px;">לקוח: ${fullName}</p>
        </div>

        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">תנאי השירות</h2>
        
        <h3 style="color: #374151; margin-top: 25px;">1. תיאור השירות</h3>
        <p>TraderVue מספקת פלטפורמה מתקדמת לניהול תיק השקעות, מעקב אחר עסקאות, וניתוח ביצועים. השירות כולל:</p>
        <ul style="padding-right: 20px;">
          <li>מערכת לניהול ומעקב עסקאות</li>
          <li>כלי ניתוח וביצועים מתקדמים</li>
          <li>יומן מסחר אישי</li>
          <li>דוחות מפורטים</li>
          <li>גישה למידע פיננסי עדכני</li>
        </ul>

        <h3 style="color: #374151; margin-top: 25px;">2. תנאי תשלום</h3>
        <p>התשלום יתבצע מראש בהתאם לחבילה הנבחרת. התשלום בטוח ומוצפן באמצעות מערכת אשראי מאובטחת.</p>

        <h3 style="color: #374151; margin-top: 25px;">3. זכויות והגבלות</h3>
        <p>הלקוח זכאי לגישה מלאה לשירותי הפלטפורמה במהלך תקופת המנוי. אסור להעביר נתונים או פרטי גישה לצדדים שלישיים.</p>

        <h3 style="color: #374151; margin-top: 25px;">4. ביטול והחזר</h3>
        <p>ביטול המנוי אפשרי בכל עת. החזר כספי יתבצע באופן יחסי לתקופה שלא נוצלה, בהתאם למדיניות החזרים.</p>

        <h3 style="color: #374151; margin-top: 25px;">5. אחריות ושיפוי</h3>
        <p>השירות ניתן "כפי שהוא". החברה לא תישא באחריות לנזקים עקיפים או תוצאתיים הנובעים משימוש בשירות.</p>

        <h3 style="color: #374151; margin-top: 25px;">6. שינויים בהסכם</h3>
        <p>החברה רשאית לעדכן את תנאי השירות מעת לעת. הודעה על שינויים תישלח ללקוחות מראש.</p>

        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 25px 0;">
          <h4 style="color: #92400e; margin: 0 0 10px 0;">חשוב לדעת:</h4>
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            על ידי חתימה על הסכם זה, אתה מאשר כי קראת והבנת את כל התנאים והגבלות.
            השירות כפוף לחוקי מדינת ישראל.
          </p>
        </div>

        <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="font-weight: bold; color: #374151;">תאריך הסכם: ${new Date().toLocaleDateString('he-IL')}</p>
          <p style="color: #666; font-size: 14px; margin-top: 10px;">
            הסכם זה נכנס לתוקף ברגע החתימה ויישאר בתוקף למשך תקופת המנוי.
          </p>
        </div>
      </div>
    `;
  };

  const handleSign = async () => {
    if (!signature) {
      toast.error('אנא הוסף חתימה');
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      toast.error('אנא אשר את התנאים ומדיניות הפרטיות');
      return;
    }

    setIsProcessing(true);

    try {
      // Generate enhanced browser info including IP
      const browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ipAddress: userIP,
        timestamp: new Date().toISOString()
      };

      const contractData = {
        signature,
        contractHtml: getContractContent(),
        agreedToTerms,
        agreedToPrivacy,
        contractVersion: "1.0",
        browserInfo,
        planId,
        fullName
      };

      console.log('DigitalContractForm: Submitting contract with enhanced browser info:', {
        hasSignature: !!signature,
        hasContractHtml: !!contractData.contractHtml,
        browserInfo: browserInfo,
        planId,
        fullName
      });

      onSign(contractData);
    } catch (error) {
      console.error('Error preparing contract data:', error);
      toast.error('שגיאה בהכנת נתוני החוזה');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contract content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            הסכם שירות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={contractRef}
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: getContractContent() }}
            style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              padding: '20px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#fff'
            }}
          />
        </CardContent>
      </Card>

      {/* Signature section */}
      <Card>
        <CardHeader>
          <CardTitle>חתימה דיגיטלית</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אנא חתום במקום המיועד למטה כדי לאשר את הסכמתך לתנאי השירות
            </AlertDescription>
          </Alert>
          
          <SignaturePad 
            onSignatureChange={setSignature}
            disabled={isProcessing}
          />
        </CardContent>
      </Card>

      {/* Agreements */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox 
              id="terms" 
              checked={agreedToTerms}
              onCheckedChange={setAgreedToTerms}
              disabled={isProcessing}
            />
            <label htmlFor="terms" className="text-sm font-medium">
              אני מסכים לתנאי השירות ולהסכם זה
            </label>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox 
              id="privacy" 
              checked={agreedToPrivacy}
              onCheckedChange={setAgreedToPrivacy}
              disabled={isProcessing}
            />
            <label htmlFor="privacy" className="text-sm font-medium">
              אני מסכים למדיניות הפרטיות
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Sign button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSign}
          disabled={!signature || !agreedToTerms || !agreedToPrivacy || isProcessing}
          className="w-full max-w-md"
          size="lg"
        >
          {isProcessing ? 'מעבד חתימה...' : 'חתום על ההסכם'}
        </Button>
      </div>

      {userIP && (
        <div className="text-center text-xs text-muted-foreground">
          כתובת IP: {userIP} | {new Date().toLocaleString('he-IL')}
        </div>
      )}
    </div>
  );
};

export default DigitalContractForm;
