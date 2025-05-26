import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  BarChart3, BookOpen, Calendar, Home, MessageSquare, 
  PlusCircle, Settings, TrendingUp, User, CreditCard, Bot,
  LogOut, Menu, X
} from "lucide-react";
import { useAuth } from '@/contexts/auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onCollapseToggle?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, isCollapsed: initialCollapsed, onCollapseToggle }) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed || false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onCollapseToggle) {
      onCollapseToggle(newState);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const sidebarItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "דאשבורד",
    },
    {
      href: "/subscription",
      icon: CreditCard,
      label: "מנוי",
    },
    {
      href: "/community",
      icon: MessageSquare,
      label: "קהילה",
    },
    {
      href: "/courses",
      icon: BookOpen,
      label: "קורסים",
    },
    {
      href: "/calendar",
      icon: Calendar,
      label: "לוח שנה",
    },
    {
      href: "/trade-journal",
      icon: TrendingUp,
      label: "יומן מסחר",
    },
    {
      href: "/ai-assistant",
      icon: Bot,
      label: "AI Assistant",
    },
    {
      href: "/account",
      icon: Settings,
      label: "הגדרות",
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-secondary border-r border-muted/50",
        className
      )}
    >
      <div className="flex items-center py-4 px-3">
        <Button variant="ghost" onClick={toggleCollapse} className="md:hidden">
          {isCollapsed ? <Menu /> : <X />}
        </Button>
        {!isCollapsed && (
          <span className="font-bold text-xl px-2">AlgoTouch</span>
        )}
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                "justify-start rounded-none w-full p-2",
                location.pathname === item.href
                  ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                  : "hover:bg-secondary/50 hover:text-foreground"
              )}
              onClick={() => navigate(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {!isCollapsed && item.label}
            </Button>
          ))}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {!isCollapsed && "התנתק"}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
