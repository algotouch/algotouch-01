
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { UserCircle, Lock, MapPin, Wrench } from 'lucide-react';
import UserSubscription from '@/components/UserSubscription';
import RecoveryTool from '@/components/payment/RecoveryTool';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionProvider } from '@/contexts/subscription/SubscriptionContext';

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  city: string;
  postal_code: string;
  country: string;
}

const Profile = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    phone: '',
    street: '',
    city: '',
    postal_code: '',
    country: 'Israel',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error) {
            throw error;
          }
          
          if (data) {
            setProfileData({
              first_name: data.first_name || '',
              last_name: data.last_name || '',
              phone: data.phone || '',
              street: data.street || '',
              city: data.city || '',
              postal_code: data.postal_code || '',
              country: data.country || 'Israel',
            });
          }
          
          // Check if user is admin
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
            
          setIsAdmin(!!roleData);
        } catch (error) {
          console.error('Error fetching profile:', error);
          toast.error('שגיאה בטעינת פרטי פרופיל');
        } finally {
          setLoadingProfile(false);
        }
      }
    };
    
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  const handlePaymentRecovery = async (result: any) => {
    if (result?.success) {
      toast.success("Payment recovery completed successfully");
      
      // Refresh the page after a short delay to show updated subscription info
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);
      
      if (error) {
        throw error;
      }
      
      toast.success('פרטי פרופיל עודכנו בהצלחה');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('שגיאה בעדכון פרטי פרופיל');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }
    
    try {
      setChangingPassword(true);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('הסיסמה עודכנה בהצלחה');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('שגיאה בעדכון הסיסמה');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!loading && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <div className="tradervue-container py-8" dir="rtl">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <UserCircle size={28} className="text-primary" />
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">הפרופיל שלי</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="personal">פרטים אישיים</TabsTrigger>
                <TabsTrigger value="security">אבטחה</TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="admin">כלי ניהול</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="personal">
                <Card className="glass-card-2025">
                  <CardHeader>
                    <CardTitle>פרטים אישיים</CardTitle>
                    <CardDescription>עדכן את פרטיך האישיים וקשר</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">שם פרטי</Label>
                        <Input 
                          id="first_name" 
                          name="first_name" 
                          value={profileData.first_name} 
                          onChange={handleInputChange} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">שם משפחה</Label>
                        <Input 
                          id="last_name" 
                          name="last_name" 
                          value={profileData.last_name} 
                          onChange={handleInputChange} 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">דוא"ל</Label>
                      <Input id="email" value={user?.email || ''} disabled />
                      <p className="text-xs text-muted-foreground">לא ניתן לשנות את כתובת האימייל</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">טלפון</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        value={profileData.phone} 
                        onChange={handleInputChange} 
                      />
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      כתובת
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="street">רחוב ומספר</Label>
                      <Input 
                        id="street" 
                        name="street" 
                        value={profileData.street} 
                        onChange={handleInputChange} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">עיר</Label>
                        <Input 
                          id="city" 
                          name="city" 
                          value={profileData.city} 
                          onChange={handleInputChange} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postal_code">מיקוד</Label>
                        <Input 
                          id="postal_code" 
                          name="postal_code" 
                          value={profileData.postal_code} 
                          onChange={handleInputChange} 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">מדינה</Label>
                      <Input 
                        id="country" 
                        name="country" 
                        value={profileData.country} 
                        onChange={handleInputChange} 
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? 'שומר שינויים...' : 'שמור שינויים'}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="security">
                <Card className="glass-card-2025">
                  <CardHeader>
                    <CardTitle>אבטחה</CardTitle>
                    <CardDescription>נהל את הגדרות האבטחה שלך</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      שינוי סיסמה
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">סיסמה נוכחית</Label>
                        <Input 
                          id="current-password" 
                          type="password" 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-password">סיסמה חדשה</Label>
                        <Input 
                          id="new-password" 
                          type="password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">אימות סיסמה חדשה</Label>
                        <Input 
                          id="confirm-password" 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {changingPassword ? 'מעדכן סיסמה...' : 'עדכן סיסמה'}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {isAdmin && (
                <TabsContent value="admin">
                  <Card className="glass-card-2025">
                    <CardHeader>
                      <CardTitle>כלי ניהול</CardTitle>
                      <CardDescription>כלים מתקדמים למנהלי המערכת</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-primary" />
                          שחזור תשלומים
                        </h3>
                        <RecoveryTool onComplete={handlePaymentRecovery} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
          
          <div>
            <SubscriptionProvider>
              <UserSubscription />
            </SubscriptionProvider>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
