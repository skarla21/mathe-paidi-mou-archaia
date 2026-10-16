-- content_url stores the private object path, lesson-content/<file>.
-- Older rows kept the public uploads URL. The file is already in lesson-files.
-- Run this in the Supabase SQL editor before deploying the sign-only read path.

update public.lessons
set content_url = substring(content_url from '/(lesson-content/[^/?#]+)')
where content_url ~ '/storage/v1/object/public/uploads/lesson-content/';
