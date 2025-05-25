
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ExistingUserAlertProps {
  onSwitchToLogin: () => void;
}

const ExistingUserAlert: React.FC<ExistingUserAlertProps> = ({ onSwitchToLogin }) => {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        המשתמש עם כתובת המייל הזו כבר רשום במערכת.
        <Button 
          variant="link" 
          className="p-0 h-auto font-normal underline mr-1"
          onClick={onSwitchToLogin}
        >
          לחץ כאן להתחברות
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default ExistingUserAlert;
