import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Share2, ThumbsUp, Tag, Image as ImageIcon } from 'lucide-react';
import { likePost } from '@/lib/community';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { useCommunity } from '@/contexts/community/CommunityContext';
import { Badge } from '../ui/badge';
import { Post } from '@/lib/community/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommentSection } from './CommentSection';
import { AspectRatio } from '../ui/aspect-ratio';

export function PostList() {
  const { isAuthenticated, user } = useAuth();
  const { 
    posts, 
    loading, 
    handlePostLiked, 
    setActivePostId,
    activePostId,
    activePost,
    activePostComments
  } = useCommunity();

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const formatPostTime = (timeString: string) => {
    const postTime = new Date(timeString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'כרגע';
    if (diffInMinutes < 60) return `לפני ${diffInMinutes} דקות`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `לפני ${diffInHours} שעות`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `לפני ${diffInDays} ימים`;
  };
  
  const formatUserName = (post: Post) => {
    if (post.profiles?.first_name || post.profiles?.last_name) {
      return `${post.profiles.first_name || ''} ${post.profiles.last_name || ''}`.trim();
    }
    return `סוחר${post.user_id.substring(0, 4)}`;
  };
  
  const handleLikePostClick = async (postId: string) => {
    if (!isAuthenticated) {
      toast.error('יש להתחבר כדי לבצע פעולה זו');
      return;
    }
    
    try {
      const success = await likePost(postId, user!.id);
      
      if (success) {
        await handlePostLiked(postId);
        toast.success('הוספת לייק לפוסט!');
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('שגיאה בהוספת לייק לפוסט');
    }
  };

  const handleOpenComments = (postId: string) => {
    setActivePostId(postId);
  };

  const handleOpenImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };
  
  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-5 w-1/3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-1/4 bg-gray-100 rounded mb-4"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-5/6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-4 mt-4">
                    <div className="h-8 w-16 bg-gray-100 rounded"></div>
                    <div className="h-8 w-16 bg-gray-100 rounded"></div>
                    <div className="h-8 w-16 bg-gray-100 rounded"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (posts.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground py-8">
            עדיין אין פוסטים בקהילה. היה הראשון לפרסם!
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <div className="space-y-4">
        {posts.map(post => (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://avatar.vercel.sh/${post.user_id}?size=40`} />
                  <AvatarFallback>{post.profiles?.first_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium">@
                        {post.profiles?.first_name || post.profiles?.last_name 
                          ? `${post.profiles?.first_name || ''} ${post.profiles?.last_name || ''}`.trim()
                          : `סוחר${post.user_id.substring(0, 4)}`
                        }
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleString('he-IL')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <h4 className="font-semibold text-lg mb-2">{post.title}</h4>
                    <p className="text-gray-700 whitespace-pre-line">{post.content}</p>
                    
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {post.tags.map(tag => (
                          <Badge key={tag.id} variant="outline" className="bg-blue-50">
                            <Tag className="h-3 w-3 mr-1" /> {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {post.media_urls.slice(0, 4).map((url, idx) => (
                          <div 
                            key={idx} 
                            className="relative cursor-pointer rounded-md overflow-hidden"
                            onClick={() => handleOpenImageModal(url)}
                          >
                            <AspectRatio ratio={16/9}>
                              <img 
                                src={url} 
                                alt={`תמונה ${idx + 1}`}
                                className="object-cover w-full h-full"
                              />
                            </AspectRatio>
                          </div>
                        ))}
                        {post.media_urls.length > 4 && (
                          <div className="relative rounded-md overflow-hidden bg-black/60 flex items-center justify-center">
                            <span className="text-white text-lg font-medium">+{post.media_urls.length - 4}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex mt-4 gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => handleLikePostClick(post.id)}
                      disabled={loading || !isAuthenticated}
                    >
                      <ThumbsUp size={16} /> {post.likes}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => handleOpenComments(post.id)}
                    >
                      <MessageSquare size={16} /> {post.comments}
                    </Button>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <Share2 size={16} /> שתף
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog 
        open={activePostId !== null} 
        onOpenChange={(open) => !open && setActivePostId(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {activePost && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{activePost.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={`https://avatar.vercel.sh/${activePost.user_id}?size=24`} />
                    <AvatarFallback>{activePost.profiles?.first_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {activePost.profiles?.first_name || activePost.profiles?.last_name 
                      ? `${activePost.profiles?.first_name || ''} ${activePost.profiles?.last_name || ''}`.trim()
                      : `סוחר${activePost.user_id.substring(0, 4)}`
                    }
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(activePost.created_at).toLocaleString('he-IL')}
                  </span>
                </div>
              </DialogHeader>
              
              <div className="whitespace-pre-line mt-4">
                {activePost.content}
              </div>
              
              {activePost.tags && activePost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {activePost.tags.map(tag => (
                    <Badge key={tag.id} variant="outline" className="bg-blue-50">
                      <Tag className="h-3 w-3 mr-1" /> {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
              
              {activePost.media_urls && activePost.media_urls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {activePost.media_urls.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="relative cursor-pointer rounded-md overflow-hidden"
                      onClick={() => handleOpenImageModal(url)}
                    >
                      <AspectRatio ratio={16/9}>
                        <img 
                          src={url} 
                          alt={`תמונה ${idx + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </AspectRatio>
                    </div>
                  ))}
                </div>
              )}
              
              <CommentSection 
                postId={activePost.id} 
                comments={activePostComments} 
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none">
          {selectedImage && (
            <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center">
              <img 
                src={selectedImage}
                alt="תמונה מוגדלת"
                className="object-contain max-h-[80vh] rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
