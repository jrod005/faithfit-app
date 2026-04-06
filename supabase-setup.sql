-- =============================================
-- Iron Faith Social - Supabase Setup
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  profile_pic TEXT DEFAULT '',
  stats JSONB DEFAULT '{}',
  friends UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friend requests
CREATE TABLE friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_username TEXT NOT NULL,
  from_display_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  workout JSONB,
  likes UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_friend_requests_to ON friend_requests(to_uid, status);
CREATE INDEX idx_friend_requests_from ON friend_requests(from_uid);
CREATE INDEX idx_posts_uid ON posts(uid);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, users manage their own
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Friend requests: users see their own, create their own
CREATE POLICY "Users view own requests" ON friend_requests FOR SELECT USING (auth.uid() = from_uid OR auth.uid() = to_uid);
CREATE POLICY "Users create requests" ON friend_requests FOR INSERT WITH CHECK (auth.uid() = from_uid);
CREATE POLICY "Recipients update requests" ON friend_requests FOR UPDATE USING (auth.uid() = to_uid);

-- Posts: anyone can read, users manage their own
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users create own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY "Users delete own posts" ON posts FOR DELETE USING (auth.uid() = uid);

-- RPC: Toggle like (needs to update other users' posts)
CREATE OR REPLACE FUNCTION toggle_like(post_id UUID)
RETURNS void AS $$
BEGIN
  IF (SELECT auth.uid() = ANY(likes) FROM posts WHERE id = post_id) THEN
    UPDATE posts SET likes = array_remove(likes, auth.uid()) WHERE id = post_id;
  ELSE
    UPDATE posts SET likes = array_append(likes, auth.uid()) WHERE id = post_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Accept friend request (updates both users)
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS void AS $$
DECLARE
  req friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO req FROM friend_requests WHERE id = request_id AND to_uid = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  UPDATE profiles SET friends = array_append(friends, req.from_uid) WHERE id = auth.uid() AND NOT (req.from_uid = ANY(friends));
  UPDATE profiles SET friends = array_append(friends, auth.uid()) WHERE id = req.from_uid AND NOT (auth.uid() = ANY(friends));
  UPDATE friend_requests SET status = 'accepted' WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Remove friend (updates both users)
CREATE OR REPLACE FUNCTION remove_friend(friend_uid UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET friends = array_remove(friends, friend_uid) WHERE id = auth.uid();
  UPDATE profiles SET friends = array_remove(friends, auth.uid()) WHERE id = friend_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket for post photos
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'posts');
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'posts');
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'posts');

-- =============================================
-- ADDITIONS: Profile pics, privacy, verses
-- Run this AFTER the initial setup above
-- =============================================

-- Add privacy column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add verse/message column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS verse_or_message JSONB DEFAULT NULL;

-- Avatar storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Avatar storage policies
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'avatars');
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'avatars');
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id = 'avatars');

-- Update posts visibility for private accounts
-- Drop old permissive policy and replace with privacy-aware one
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
CREATE POLICY "Posts visibility with privacy" ON posts FOR SELECT USING (
    uid = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = posts.uid AND profiles.is_public = true)
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND posts.uid = ANY(profiles.friends))
);

-- =============================================
-- COMMENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  uid UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users create own comments" ON comments FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY "Users delete own comments" ON comments FOR DELETE USING (auth.uid() = uid);
