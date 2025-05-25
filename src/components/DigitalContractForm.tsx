
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import SignaturePad from '@/components/signature/SignaturePad';
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
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [userIP, setUserIP] = useState<string>('');

  // Get user's IP address
  useEffect(() => {
    const fetchUserIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIP(data.ip);
      } catch (error) {
        console.warn('Could not fetch user IP:', error);
        setUserIP('Unknown');
      }
    };
    
    fetchUserIP();
  }, []);

  const handleSubmit = async () => {
    if (!signature) {
      toast.error('נדרשת חתימה דיגיטלית');
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      toast.error('נדרש לאשר את התנאים ומדיניות הפרטיות');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate contract HTML with full content
      const contractHtml = generateContractHTML();
      
      const contractData = {
        signature,
        contractHtml,
        agreedToTerms,
        agreedToPrivacy,
        contractVersion: "1.0",
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ipAddress: userIP
        }
      };

      console.log('DigitalContractForm: Submitting contract with data:', {
        hasSignature: !!signature,
        hasContractHtml: !!contractHtml,
        agreedToTerms,
        agreedToPrivacy,
        ipAddress: userIP
      });

      onSign(contractData);
    } catch (error) {
      console.error('Error submitting contract:', error);
      toast.error('שגיאה בשליחת החוזה');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateContractHTML = () => {
    const now = new Date();
    const hebrewDate = now.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>חוזה מנוי - TraderVue</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f9f9f9;
            direction: rtl;
        }
        .contract-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .contract-title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 20px 0;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            border-right: 4px solid #2563eb;
            padding-right: 10px;
        }
        .terms-list {
            list-style-type: decimal;
            padding-right: 20px;
        }
        .terms-list li {
            margin-bottom: 10px;
            line-height: 1.8;
        }
        .highlight {
            background-color: #fef3c7;
            padding: 2px 4px;
            border-radius: 3px;
        }
        .signature-section {
            margin-top: 40px;
            padding: 20px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background-color: #f8fafc;
        }
        .signature-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            font-weight: bold;
            color: #374151;
            margin-bottom: 5px;
        }
        .info-value {
            color: #6b7280;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 5px;
        }
        .signature-box {
            border: 2px dashed #9ca3af;
            min-height: 150px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: white;
            border-radius: 8px;
            margin: 20px 0;
        }
        .signature-image {
            max-width: 300px;
            max-height: 120px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        .technical-info {
            margin-top: 30px;
            padding: 15px;
            background-color: #f3f4f6;
            border-radius: 6px;
            font-size: 11px;
            color: #4b5563;
        }
        .technical-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .tech-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        @media print {
            body { background: white; }
            .contract-container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="contract-container">
        <div class="header">
            <div class="logo">TraderVue</div>
            <h1 class="contract-title">חוזה מנוי לשירותי מסחר</h1>
            <p>תאריך: ${hebrewDate}</p>
        </div>

        <div class="section">
            <h2 class="section-title">פרטי המנוי</h2>
            <div class="signature-info">
                <div class="info-item">
                    <span class="info-label">שם מלא:</span>
                    <span class="info-value">${fullName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">חבילת מנוי:</span>
                    <span class="info-value">${planId === 'monthly' ? 'חבילה חודשית' : planId === 'annual' ? 'חבילה שנתית' : planId}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">תנאי השירות</h2>
            <ol class="terms-list">
                <li>השירות מיועד למטרות מסחר ואינו מהווה יעוץ השקעות</li>
                <li>המשתמש אחראי לכל ההחלטות הכספיות שיקבל</li>
                <li>החברה אינה אחראית להפסדים או נזקים הנובעים משימוש בשירות</li>
                <li>המנוי מתחדש אוטומטית אלא אם בוטל 24 שעות לפני תום התקופה</li>
                <li>ביטול המנוי יכול להתבצע בכל עת דרך האזור האישי</li>
                <li>החברה שומרת על הזכות לשנות את התנאים עם הודעה מוקדמת</li>
                <li>כל מחלוקת תיפתר בבית משפט מוסמך בישראל</li>
            </ol>
        </div>

        <div class="section">
            <h2 class="section-title">הצהרות המנוי</h2>
            <p>אני החתום מטה מצהיר ומתחייב:</p>
            <ul style="padding-right: 20px;">
                <li>קראתי והבנתי את כל תנאי החוזה</li>
                <li>אני מסכים לתנאי השירות ומדיניות הפרטיות</li>
                <li>הפרטים שמסרתי נכונים ומעודכנים</li>
                <li>אני בגיר ובעל כשירות משפטית לחתימה על חוזה זה</li>
            </ul>
        </div>

        <div class="signature-section">
            <h2 class="section-title">חתימה דיגיטלית</h2>
            <div class="signature-box">
                <img src="${signature}" alt="חתימה דיגיטלית" class="signature-image" />
            </div>
            
            <div class="signature-info">
                <div class="info-item">
                    <span class="info-label">תאריך חתימה:</span>
                    <span class="info-value">${now.toLocaleString('he-IL')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">כתובת IP:</span>
                    <span class="info-value">${userIP}</span>
                </div>
            </div>
        </div>

        <div class="technical-info">
            <h3 style="margin-top: 0; color: #374151;">מידע טכני לצורכי אימות</h3>
            <div class="technical-grid">
                <div class="tech-item">
                    <span>דפדפן:</span>
                    <span>${navigator.userAgent}</span>
                </div>
                <div class="tech-item">
                    <span>שפה:</span>
                    <span>${navigator.language}</span>
                </div>
                <div class="tech-item">
                    <span>פלטפורמה:</span>
                    <span>${navigator.platform}</span>
                </div>
                <div class="tech-item">
                    <span>אזור זמן:</span>
                    <span>${Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                </div>
                <div class="tech-item">
                    <span>רזולוציה:</span>
                    <span>${window.innerWidth}x${window.innerHeight}</span>
                </div>
                <div class="tech-item">
                    <span>זמן חתימה UTC:</span>
                    <span>${now.toISOString()}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>חוזה זה נחתם באמצעות מערכת חתימה דיגיטלית מאובטחת</p>
            <p>© ${now.getFullYear()} TraderVue - כל הזכויות שמורות</p>
        </div>
    </div>
</body>
</html>`;
  };

  return (
    <div className="space-y-6">
      {/* Contract content display */}
      <div className="border rounded-lg p-6 bg-white max-h-96 overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-2">TraderVue</h2>
          <h3 className="text-xl font-semibold mb-4">חוזה מנוי לשירותי מסחר</h3>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">פרטי המנוי:</h4>
            <p>שם: {fullName}</p>
            <p>חבילה: {planId === 'monthly' ? 'חודשית' : planId === 'annual' ? 'שנתית' : planId}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">תנאי השירות:</h4>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>השירות מיועד למטרות מסחר ואינו מהווה יעוץ השקעות</li>
              <li>המשתמש אחראי לכל ההחלטות הכספיות שיקבל</li>
              <li>החברה אינה אחראית להפסדים או נזקים הנובעים משימוש בשירות</li>
              <li>המנוי מתחדש אוטומטית אלא אם בוטל 24 שעות לפני תום התקופה</li>
              <li>ביטול המנוי יכול להתבצע בכל עת דרך האזור האישי</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Signature section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">חתימה דיגיטלית *</label>
          <SignaturePad 
            onChange={setSignature}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              disabled={isSubmitting}
            />
            <label htmlFor="terms" className="text-sm">
              אני מסכים לתנאי השירות *
            </label>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="privacy"
              checked={agreedToPrivacy}
              onCheckedChange={(checked) => setAgreedToPrivacy(checked === true)}
              disabled={isSubmitting}
            />
            <label htmlFor="privacy" className="text-sm">
              אני מסכים למדיניות הפרטיות *
            </label>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!signature || !agreedToTerms || !agreedToPrivacy || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'שומר חוזה...' : 'חתום ושמור חוזה'}
        </Button>
      </div>
    </div>
  );
};

export default DigitalContractForm;
