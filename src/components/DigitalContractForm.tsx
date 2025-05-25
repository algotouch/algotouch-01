
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import SignaturePad from '@/components/signature/SignaturePad';
import { Loader2 } from 'lucide-react';

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
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const contractRef = useRef<HTMLDivElement>(null);

  // Get user's IP address and browser info
  const [userInfo, setUserInfo] = useState({
    ipAddress: '',
    browserInfo: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  });

  useEffect(() => {
    // Get user's IP address
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => {
        setUserInfo(prev => ({
          ...prev,
          ipAddress: data.ip
        }));
      })
      .catch(error => {
        console.warn('Could not fetch IP address:', error);
      });
  }, []);

  const generateContractHTML = () => {
    if (!contractRef.current) return '';
    return contractRef.current.innerHTML;
  };

  const handleSubmit = async () => {
    if (!signature || !agreedToTerms || !agreedToPrivacy) {
      alert('אנא השלם את כל השדות הנדרשים');
      return;
    }

    setIsLoading(true);
    
    try {
      const contractHTML = generateContractHTML();
      
      const contractData = {
        signature,
        contractHtml: contractHTML,
        agreedToTerms,
        agreedToPrivacy,
        contractVersion: "1.0",
        browserInfo: userInfo.browserInfo,
        ipAddress: userInfo.ipAddress,
        signedAt: new Date().toISOString()
      };

      onSign(contractData);
    } catch (error) {
      console.error('Error processing contract:', error);
      alert('אירעה שגיאה בעיבוד החוזה');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            הסכם מנוי שירותי TraderVue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={contractRef} className="contract-content space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">הסכם מנוי שירותי TraderVue</h2>
              <p className="text-sm text-muted-foreground">
                תאריך: {new Date().toLocaleDateString('he-IL')}
              </p>
            </div>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold">1. מבוא</h3>
              <p className="text-sm leading-relaxed">
                הסכם זה ("ההסכם") נערך בין TraderVue Ltd. ("החברה") לבין המנוי ("המנוי") בעת רכישת מנוי לשירותי TraderVue.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold">2. השירותים</h3>
              <p className="text-sm leading-relaxed">
                החברה מספקת למנוי גישה לפלטפורמת TraderVue הכוללת כלים לניתוח מסחר, מעקב אחר ביצועים, יומן מסחר דיגיטלי וכלי למידה מתקדמים.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold">3. תנאי התשלום</h3>
              <p className="text-sm leading-relaxed">
                התשלום יבוצע בהתאם לתוכנית המנוי שנבחרה. החיוב יתבצע באופן אוטומטי בהתאם לתקופת המנוי.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold">4. ביטול המנוי</h3>
              <p className="text-sm leading-relaxed">
                המנוי רשאי לבטל את המנוי בכל עת דרך לוח הבקרה האישי. הביטול ייכנס לתוקף בתום תקופת החיוב הנוכחית.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold">5. מדיניות הפרטיות</h3>
              <p className="text-sm leading-relaxed">
                החברה מתחייבת לשמור על פרטיות המידע של המנוי בהתאם למדיניות הפרטיות המפורסמת באתר.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold">6. הגבלת אחריות</h3>
              <p className="text-sm leading-relaxed">
                החברה לא תהיה אחראית לכל נזק עקיף או תוצאתי הנובע משימוש בשירותים.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold">7. שינויים בהסכם</h3>
              <p className="text-sm leading-relaxed">
                החברה רשאית לעדכן הסכם זה מעת לעת. עדכונים יפורסמו באתר ויכנסו לתוקף לאחר הודעה מוקדמת.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold">8. סמכות שיפוט</h3>
              <p className="text-sm leading-relaxed">
                על הסכם זה יחולו חוקי מדינת ישראל. סמכות השיפוט הבלעדית תהיה לבתי המשפט בתל אביב.
              </p>
            </section>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>חתימה דיגיטלית</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={setAgreedToTerms}
              />
              <label htmlFor="terms" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                אני מסכים לתנאי השימוש
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="privacy"
                checked={agreedToPrivacy}
                onCheckedChange={setAgreedToPrivacy}
              />
              <label htmlFor="privacy" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                אני מסכים למדיניות הפרטיות
              </label>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                אנא חתום במסגרת שלהלן:
              </p>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <SignaturePad onChange={setSignature} />
            </div>
            
            {signature && (
              <div className="text-center">
                <p className="text-sm text-green-600">חתימה נקלטה בהצלחה</p>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!signature || !agreedToTerms || !agreedToPrivacy || isLoading}
              className="px-8 py-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  מעבד חתימה...
                </>
              ) : (
                'חתום על ההסכם'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalContractForm;
