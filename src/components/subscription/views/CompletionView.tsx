
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import SubscriptionCard from '@/components/subscription/SubscriptionCard';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, FileText } from 'lucide-react';
import { getUserDocuments } from '@/lib/contracts/document-service';

interface CompletionViewProps {
  planId: string;
}

const CompletionView: React.FC<CompletionViewProps> = ({ planId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshSubscription } = useSubscriptionContext();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const { success, documents } = await getUserDocuments(user.id);
        if (success && documents) {
          setDocuments(documents);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user?.id]);

  // Determine plan name
  const planName = planId === 'monthly' 
    ? 'חודשי'
    : planId === 'annual'
      ? 'שנתי'
      : 'VIP';

  // Handle navigation to dashboard
  const goToDashboard = () => {
    refreshSubscription()
      .then(() => {
        navigate('/dashboard');
      })
      .catch((error) => {
        console.error('Error refreshing subscription:', error);
        toast.error('שגיאה בטעינת פרטי המנוי');
        navigate('/dashboard');
      });
  };

  // Get latest document if available
  const latestDocument = documents.length > 0 ? documents[0] : null;

  return (
    <div className="max-w-xl mx-auto">
      <SubscriptionCard
        title="ההרשמה הושלמה בהצלחה!"
        description={`המנוי ${planName} שלך פעיל כעת.`}
      >
        <div className="flex flex-col items-center py-6">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          
          <h3 className="text-xl font-medium mb-2 text-center">ברוכים הבאים!</h3>
          <p className="text-muted-foreground text-center mb-6">
            {planId === 'monthly' 
              ? 'המנוי החודשי שלך עם תקופת ניסיון חינם מוכן לשימוש.' 
              : planId === 'annual'
                ? 'המנוי השנתי שלך פעיל כעת. תודה על בחירתך בתכנית זו!'
                : 'מנוי ה-VIP שלך פעיל כעת. תודה על הצטרפותך לחוויית השירות המלאה!'}
          </p>

          {latestDocument && (
            <div className="w-full p-4 border rounded-lg mb-6 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {latestDocument.document_type === 'invoice' ? 'חשבונית' : 'קבלה'} #{latestDocument.document_number}
                  </span>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a href={latestDocument.document_url} target="_blank" rel="noopener noreferrer">
                    הצג מסמך
                  </a>
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={goToDashboard} className="px-8">
              המשך למערכת
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/my-subscription')}
            >
              צפה בפרטי המנוי
            </Button>
          </div>
        </div>
      </SubscriptionCard>
    </div>
  );
};

export default CompletionView;
