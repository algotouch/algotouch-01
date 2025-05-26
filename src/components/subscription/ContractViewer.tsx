import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { getContractById, verifyContractSignature } from '@/lib/contracts/contract-service';
import { Button } from '@/components/ui/button';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContractViewerProps {
  userId?: string;
  contractId?: string;
  onBack?: () => void;
  className?: string;
}

const ContractViewer: React.FC<ContractViewerProps> = ({ 
  userId: externalUserId, 
  contractId: externalContractId,
  onBack, 
  className 
}) => {
  const { user } = useAuth();
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  const [contractData, setContractData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const userId = externalUserId || user?.id;

  useEffect(() => {
    async function fetchContract() {
      if (!userId && !externalContractId) {
        setError('משתמש לא מזוהה ומזהה הסכם חסר');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        console.log('Fetching contract:', { userId, externalContractId });
        
        // If a specific contract ID is provided, fetch that contract
        if (externalContractId) {
          const { success, contract, error: fetchError } = await getContractById(externalContractId);
          
          if (fetchError || !success) {
            console.error('Error fetching specific contract:', fetchError);
            setError('שגיאה בטעינת ההסכם');
            setLoading(false);
            return;
          }
          
          if (!contract || !contract.contract_html) {
            console.error('Contract not found or missing HTML content');
            setError('לא נמצא הסכם חתום או תוכן ההסכם חסר');
            setLoading(false);
            return;
          }
          
          console.log('Contract found:', { id: contract.id, hasHtml: !!contract.contract_html });
          setContractData(contract);
          setContractHtml(contract.contract_html);
          setLoading(false);
          return;
        }
        
        // Otherwise, find the latest contract for this user
        const { signed, contractId, signedAt } = await verifyContractSignature(userId);
        console.log('Contract verification result:', { signed, contractId, signedAt });
        
        if (!signed || !contractId) {
          setError('לא נמצא הסכם חתום');
          setLoading(false);
          return;
        }
        
        // Fetch the contract details using the ID
        const { success, contract, error: fetchError } = await getContractById(contractId);
        
        if (fetchError || !success) {
          console.error('Error fetching contract by ID:', fetchError);
          setError('שגיאה בטעינת ההסכם');
          setLoading(false);
          return;
        }
        
        if (!contract || !contract.contract_html) {
          console.error('Contract found but missing HTML content');
          setError('תוכן ההסכם חסר');
          setLoading(false);
          return;
        }
        
        console.log('Contract loaded successfully');
        setContractData(contract);
        setContractHtml(contract.contract_html);
      } catch (err) {
        console.error('Error fetching contract:', err);
        setError('שגיאה בטעינת ההסכם');
      } finally {
        setLoading(false);
      }
    }
    
    fetchContract();
  }, [userId, externalContractId]);

  // Function to download the contract as an HTML file
  const downloadContract = () => {
    if (!contractHtml || !contractData) return;
    
    const element = document.createElement('a');
    
    // Enhance the HTML with additional metadata
    const enhancedHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הסכם חתום - ${contractData.full_name || 'לקוח'}</title>
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
          h2 { color: #333; }
          .signature-block { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px; }
          .metadata { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h2>הסכם חתום</h2>
        <p>תאריך חתימה: ${new Date(contractData.created_at).toLocaleDateString('he-IL')}</p>
        
        <div class="contract-content">
          ${contractHtml}
        </div>
        
        <div class="signature-block">
          <h3>פרטי החותם:</h3>
          <p><strong>שם מלא:</strong> ${contractData.full_name || 'לא צוין'}</p>
          <p><strong>אימייל:</strong> ${contractData.email || 'לא צוין'}</p>
          <p><strong>כתובת:</strong> ${contractData.address || 'לא צוין'}</p>
          <p><strong>טלפון:</strong> ${contractData.phone || 'לא צוין'}</p>
          ${contractData.signature ? `<p><strong>חתימה:</strong><br><img src="${contractData.signature}" alt="חתימה דיגיטלית" style="max-width: 300px; border: 1px solid #eee;" /></p>` : ''}
          <p><strong>תאריך חתימה:</strong> ${new Date(contractData.created_at).toLocaleString('he-IL')}</p>
        </div>
        
        <div class="metadata">
          <h4>מידע נוסף:</h4>
          <p>מזהה הסכם: ${contractData.id}</p>
          <p>גרסת הסכם: ${contractData.contract_version || '1.0'}</p>
          <p>הוסכם לתנאי שימוש: ${contractData.agreed_to_terms ? 'כן' : 'לא'}</p>
          <p>הוסכם למדיניות פרטיות: ${contractData.agreed_to_privacy ? 'כן' : 'לא'}</p>
        </div>
      </body>
      </html>
    `;
    
    const file = new Blob([enhancedHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `contract-${contractData.full_name || 'user'}-${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          הסכם חתום
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : contractHtml ? (
          <div className="space-y-4">
            <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900">
              <p className="text-sm text-center mb-2">ההסכם נחתם ונשמר בהצלחה</p>
              <div className="flex justify-center">
                <Button onClick={downloadContract} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  הורד עותק של ההסכם
                </Button>
              </div>
            </div>
            <div className="w-full h-[400px] border rounded-md overflow-auto">
              <div className="p-4" dangerouslySetInnerHTML={{ __html: contractHtml }} />
            </div>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>לא נמצא הסכם חתום</AlertDescription>
          </Alert>
        )}
        
        {onBack && (
          <div className="mt-4 flex justify-end">
            <Button onClick={onBack} variant="outline">חזור</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractViewer;
