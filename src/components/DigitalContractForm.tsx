
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, FileText, CheckCircle } from 'lucide-react';
import SignaturePad from '@/components/signature/SignaturePad';
import { contractService } from '@/lib/contracts/contract-service';
import { emailService } from '@/lib/contracts/email-service';
import { supabase } from '@/lib/supabase';

interface DigitalContractFormProps {
  planId: string;
  fullName: string;
  onSign: (contractData: any) => void;
}

const DigitalContractForm: React.FC<DigitalContractFormProps> = ({
  planId,
  fullName,
  onSign
}) => {
  const [contractHtml, setContractHtml] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadContractTemplate();
  }, [planId]);

  const loadContractTemplate = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('app_config')
        .select('key_value')
        .eq('key_name', `contract_template_${planId}`)
        .single();

      if (error || !data) {
        setContractHtml(getDefaultTemplate());
      } else {
        setContractHtml(data.key_value);
      }
    } catch (error) {
      console.error('Error loading contract template:', error);
      setContractHtml(getDefaultTemplate());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultTemplate = () => {
    return `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
        <h1 style="text-align: center;">הסכם שירות - תכנית ${planId}</h1>
        <p>הסכם זה נחתם בין החברה לבין הלקוח ${fullName}.</p>
        <p>התנאים וההסכמות מפורטים להלן...</p>
        <div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px;">
          <p><strong>חתימת הלקוח:</strong></p>
          <div id="signature-area" style="height: 100px; border: 1px dashed #ccc; margin: 10px 0;"></div>
        </div>
      </div>
    `;
  };

  const handleSaveContract = async () => {
    if (!signature) {
      toast.error('נדרשת חתימה דיגיטלית');
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      toast.error('נדרש לאשר את התנאים ומדיניות הפרטיות');
      return;
    }

    try {
      setIsLoading(true);

      const contractData = {
        planId,
        fullName,
        email: '', // Will be filled from user context
        contractHtml,
        signature,
        contractVersion: '1.0',
        notes,
        agreedToTerms,
        agreedToPrivacy,
        browserInfo: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      const { data, error } = await supabase
        .from('contract_signatures')
        .insert({
          plan_id: planId,
          full_name: fullName,
          contract_html: contractHtml,
          signature,
          contract_version: '1.0',
          agreed_to_terms: agreedToTerms,
          agreed_to_privacy: agreedToPrivacy,
          browser_info: contractData.browserInfo
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('החוזה נחתם בהצלחה!');
      onSign({ ...contractData, contractId: data.id });

    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('שגיאה בשמירת החוזה');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !contractHtml) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="mr-2">טוען חוזה...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            חוזה דיגיטלי
          </CardTitle>
          <CardDescription>
            אנא קרא את החוזה בעיון וחתום בתחתית העמוד
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="prose max-w-none mb-6 p-4 border rounded-lg bg-muted/50 max-h-96 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: contractHtml }}
          />

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center space-x-2 rtl:space-x-reverse">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">אני מסכים לתנאי השירות</span>
              </label>

              <label className="flex items-center space-x-2 rtl:space-x-reverse">
                <input
                  type="checkbox"
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">אני מסכים למדיניות הפרטיות</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                הערות נוספות (אופציונלי)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הוסף הערות או שאלות..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                חתימה דיגיטלית
              </label>
              <SignaturePad onSignatureChange={setSignature} />
            </div>

            <Button
              onClick={handleSaveContract}
              disabled={isLoading || !signature || !agreedToTerms || !agreedToPrivacy}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  שומר חוזה...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  חתום על החוזה
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalContractForm;
