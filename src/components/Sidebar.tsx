import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Calendar, ScrollText, Users, GraduationCap, Search, 
  FileSpreadsheet, Bot, X, ChevronRight, Newspaper, 
  UserCircle, LogOut, CreditCard
} from 'lucide-react';
import TraderVueLogo from './TraderVueLogo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth';
import { Skeleton } from '@/components/ui/skeleton';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, isAuthenticated, loading, signOut } = useAuth();
  
  const navItems = [{
    path: '/dashboard',
    name: 'לוח בקרה',
    icon: <Home size={18} />
  }, {
    path: '/monthly-report',
    name: 'דוח עסקאות',
    icon: <FileSpreadsheet size={18} />
  }, {
    path: '/calendar',
    name: 'לוח שנה',
    icon: <Calendar size={18} />
  }, {
    path: '/trade-journal',
    name: 'יומן מסחר',
    icon: <ScrollText size={18} />
  }, {
    path: '/blog',
    name: 'בלוג',
    icon: <Newspaper size={18} />
  }, {
    path: '/community',
    name: 'קהילה',
    icon: <Users size={18} />
  }, {
    path: '/courses',
    name: 'קורסים',
    icon: <GraduationCap size={18} />
  }, {
    path: '/ai-assistant',
    name: 'עוזר AI',
    icon: <Bot size={18} />
  }];
  
  const accountItems = [{
    path: '/profile',
    name: 'הפרופיל שלי',
    icon: <UserCircle size={18} />
  }, {
    path: '/my-subscription',
    name: 'המנוי שלי',
    icon: <CreditCard size={18} />
  }];
  
  const isActive = (path: string) => {
    return location.pathname === path || path !== '/' && location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return <div className={cn("dark:bg-sidebar dark:text-sidebar-foreground border-l border-sidebar-border min-h-screen flex flex-col shadow-lg shadow-primary/10 transition-all duration-300 relative overflow-hidden", collapsed ? "w-16" : "w-64")} dir="rtl">
      <Button variant="ghost" size="icon" className="absolute top-3 left-3 z-20 h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-muted-foreground" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronRight size={14} /> : <X size={14} />}
      </Button>
      
      <div className="absolute inset-0 bg-mesh opacity-5 pointer-events-none"></div>
      
      <div className={cn("p-6 border-b border-sidebar-border flex justify-center relative z-10", collapsed ? "p-3" : "p-6")}>
        <TraderVueLogo className="mb-2 hover-scale" collapsed={collapsed} />
      </div>
      
      <div className={cn("p-4 border-b border-sidebar-border relative z-10", collapsed ? "p-2" : "p-4")}>
        {!collapsed && <div className="relative mb-4">
            <Input type="text" placeholder="חיפוש" className="w-full pr-8 bg-sidebar-accent/10 border-sidebar-border/50 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-300" />
            <Search className="h-4 w-4 absolute top-3 right-3 text-muted-foreground" />
          </div>}
      </div>
      
      {/* User section */}
      {!collapsed && (
        <div className="p-4 border-b border-sidebar-border relative z-10">
          {loading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ) : isAuthenticated ? (
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{user?.user_metadata?.first_name || 'משתמש'} {user?.user_metadata?.last_name || ''}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full"
                onClick={handleSignOut}
              >
                <LogOut size={14} />
                התנתק
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">אינך מחובר כרגע</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                התחבר
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Main navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin relative z-10">
        {navItems.map(item => <Link key={item.path} to={item.path} className={cn("flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/15 text-sidebar-foreground transition-all duration-200 sidebar-link", isActive(item.path) && "active bg-sidebar-accent/10 text-primary font-medium", collapsed && "justify-center px-2")}>
            <span className={cn("transition-colors duration-300", isActive(item.path) ? "text-primary" : "text-primary/60")}>
              {item.icon}
            </span>
            {!collapsed && <span>{item.name}</span>}
            
            {isActive(item.path) && <span className=""></span>}
          </Link>)}
      </nav>
      
      {/* Account navigation */}
      {isAuthenticated && !collapsed && (
        <div className="p-2 border-t border-sidebar-border relative z-10">
          <p className="px-3 py-1 text-xs text-muted-foreground">חשבון</p>
          {accountItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/15 text-sidebar-foreground transition-all duration-200 sidebar-link", 
                isActive(item.path) && "active bg-sidebar-accent/10 text-primary font-medium"
              )}
            >
              <span className={cn("transition-colors duration-300", isActive(item.path) ? "text-primary" : "text-primary/60")}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      )}
      
      <div className={cn("p-4 border-t border-sidebar-border text-xs relative z-10 flex flex-col items-center justify-center", collapsed && "p-2")}>
        {!collapsed ? <div className="w-full flex flex-col items-center justify-center text-center">
            <p className="text-sidebar-foreground/60 text-center w-full">AlgoTouch &copy; 2025</p>
            <p className="mt-1 text-sidebar-foreground/60 text-center w-full">כל הזכויות שמורות</p>
          </div> : <div className="w-full text-center text-sidebar-foreground/60">
            <span>&copy;</span>
          </div>}
      </div>
    </div>;
};

export default Sidebar;
