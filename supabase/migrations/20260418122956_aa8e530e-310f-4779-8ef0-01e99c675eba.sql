
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'hrd', 'staff');
CREATE TYPE public.task_status AS ENUM ('unread', 'read', 'in_progress', 'done');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.checklist_status AS ENUM ('pending', 'in_progress', 'done');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security definer to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- get highest role for a user
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'hrd' THEN 2
    WHEN 'staff' THEN 3
  END
  LIMIT 1
$$;

-- ============ TASKS ============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deadline TIMESTAMPTZ,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'unread',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  attachment_url TEXT,
  read_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- ============ TASK LOGS ============
CREATE TABLE public.task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_task_logs_task_id ON public.task_logs(task_id);
CREATE INDEX idx_task_logs_created_at ON public.task_logs(created_at DESC);

-- ============ CHECKLISTS ============
CREATE TABLE public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  status public.checklist_status NOT NULL DEFAULT 'pending',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_checklists_user_date ON public.checklists(user_id, date);

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_checklists_updated BEFORE UPDATE ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AUTO PROFILE + ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, position)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'position'
  );
  -- default role: staff (admin must promote manually)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- PROFILES: everyone authenticated can view all (needed for assignment dropdown, activity log display)
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- USER ROLES: users see own; admin sees all & manages
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin views all roles"
  ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin inserts roles"
  ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin deletes roles"
  ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- TASKS: assignee, creator, admin & hrd can view
CREATE POLICY "View tasks - assignee/creator/admin/hrd"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    auth.uid() = assigned_to
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hrd')
  );

CREATE POLICY "Admin/HRD create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hrd'))
  );

-- assignee can update (status/progress); admin/hrd can update everything
CREATE POLICY "Assignee/Admin/HRD update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    auth.uid() = assigned_to
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hrd')
  );

CREATE POLICY "Admin/HRD delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hrd'));

-- TASK LOGS: anyone who can see the task can see logs; everyone authenticated can insert their own log
CREATE POLICY "View task logs if can see task"
  ON public.task_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (
        t.assigned_to = auth.uid()
        OR t.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'hrd')
      )
    )
  );
CREATE POLICY "Insert own task logs"
  ON public.task_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- CHECKLISTS: own only; admin/hrd can view all
CREATE POLICY "View own checklists"
  ON public.checklists FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hrd')
  );
CREATE POLICY "Insert own checklists"
  ON public.checklists FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own checklists"
  ON public.checklists FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Delete own checklists"
  ON public.checklists FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============ STORAGE BUCKET FOR ATTACHMENTS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('task-files', 'task-files', false);

CREATE POLICY "Authenticated users can view task files"
  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-files');
CREATE POLICY "Authenticated users upload task files"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-files');
