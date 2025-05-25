
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  
  // Add error handling for route transitions
  useEffect(() => {
    const handleRouteError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('Failed to fetch dynamically imported module')) {
        console.error('Route loading error:', event.message);
        toast.error('שגיאה בטעינת העמוד. מנסה לתקן...', {
          duration: 3000,
        });
        
        // Try to recover by reloading the current page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    };
    
    window.addEventListener('error', handleRouteError);
    
    return () => {
      window.removeEventListener('error', handleRouteError);
    };
  }, []);
  
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
