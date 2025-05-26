import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/auth/AuthContext';

interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  created_at: string;
  likes: number;
  comments: number;
  tags: string[];
  liked_by_user: boolean;
}

interface PostListProps {
  posts: Post[];
  loading?: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onPostClick?: (postId: string) => void;
}

const PostList: React.FC<PostListProps> = ({
  posts,
  loading = false,
  onLike,
  onComment,
  onShare,
  onPostClick,
}) => {
  const { user } = useAuth();
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize liked posts from props
    const initialLikedPosts: Record<string, boolean> = {};
    posts.forEach(post => {
      initialLikedPosts[post.id] = post.liked_by_user;
    });
    setLikedPosts(initialLikedPosts);
  }, [posts]);

  const handleLike = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
    if (onLike) onLike(postId);
  };

  const handleComment = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComment) onComment(postId);
  };

  const handleShare = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) onShare(postId);
  };

  const handlePostClick = (postId: string) => {
    if (onPostClick) onPostClick(postId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((_, index) => (
          <Card key={index} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-muted animate-pulse rounded"></div>
                  <div className="h-3 w-1/4 bg-muted animate-pulse rounded"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded"></div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex space-x-4">
                  <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                  <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                </div>
                <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <Card className="text-center p-6">
        <CardContent>
          <p className="text-muted-foreground">אין פוסטים להצגה</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card 
          key={post.id} 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => handlePostClick(post.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Avatar className="h-10 w-10">
                {post.author.avatar ? (
                  <img src={post.author.avatar} alt={post.author.name} />
                ) : (
                  <AvatarFallback>{post.author.name.substring(0, 2)}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <CardTitle className="text-base">{post.author.name}</CardTitle>
                <CardDescription>
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-2">{post.title}</h3>
            <p className="text-muted-foreground mb-4 line-clamp-3">{post.content}</p>
            
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex space-x-4 rtl:space-x-reverse">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`flex items-center gap-1 ${likedPosts[post.id] ? 'text-red-500' : ''}`}
                  onClick={(e) => handleLike(post.id, e)}
                >
                  <Heart className={`h-4 w-4 ${likedPosts[post.id] ? 'fill-red-500' : ''}`} />
                  <span>{post.likes}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={(e) => handleComment(post.id, e)}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{post.comments}</span>
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => handleShare(post.id, e)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PostList;
