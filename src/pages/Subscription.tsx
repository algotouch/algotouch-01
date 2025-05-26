
import React from 'react';
import Layout from '@/components/Layout';
import { SubscriptionProvider } from '@/contexts/subscription/SubscriptionContext';
import { SubscriptionErrorBoundary } from '@/components/subscription/SubscriptionErrorBoundary';
import SubscriptionContent from '@/components/subscription/SubscriptionContent';

const Subscription = () => {
  return (
    <Layout className="py-8" hideSidebar={true}>
      <SubscriptionErrorBoundary>
        <SubscriptionProvider>
          <SubscriptionContent />
        </SubscriptionProvider>
      </SubscriptionErrorBoundary>
    </Layout>
  );
};

export default Subscription;
