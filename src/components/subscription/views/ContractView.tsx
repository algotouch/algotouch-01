import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth/AuthContext';

const ContractView = () => {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>חוזה</CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          {user?.email ? `החוזה שלך, ${user?.email}` : 'החוזה שלך'}
        </p>
      </CardContent>
    </Card>
  );
};

export default ContractView;
