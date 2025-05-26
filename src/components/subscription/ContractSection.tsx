import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/auth/AuthContext';

interface ContractSectionProps {
  contractUrl?: string;
  contractName?: string;
  onDownload?: () => void;
  onView?: () => void;
}

const ContractSection: React.FC<ContractSectionProps> = ({ 
  contractUrl, 
  contractName = 'תנאי שימוש',
  onDownload,
  onView
}) => {
  const { user } = useAuth();
  const [canDownload, setCanDownload] = useState(false);
  const [canView, setCanView] = useState(false);

  useEffect(() => {
    setCanDownload(!!contractUrl && !!onDownload);
    setCanView(!!contractUrl && !!onView);
  }, [contractUrl, onDownload, onView]);

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle>חוזה והסכמות</CardTitle>
        <CardDescription>סקירה וחתימה על החוזה שלך</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{contractName}</h3>
            <p className="text-sm text-muted-foreground">
              אנא סקור את החוזה שלך בעיון לפני שתמשיך.
            </p>
          </div>
          <Badge variant="secondary">מחייב חתימה</Badge>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {canView && (
            <Button variant="outline" className="w-full" onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              צפייה בחוזה
            </Button>
          )}
          {canDownload && (
            <Button className="w-full" onClick={onDownload}>
              <Download className="mr-2 h-4 w-4" />
              הורדת חוזה
            </Button>
          )}
          {!canView && !canDownload && (
            <div className="text-center text-muted-foreground">
              <FileText className="mx-auto h-6 w-6 mb-2" />
              <p>החוזה אינו זמין כרגע</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractSection;
