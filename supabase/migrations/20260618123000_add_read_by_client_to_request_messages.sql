ALTER TABLE public.request_messages
ADD COLUMN IF NOT EXISTS read_by_client boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS read_by_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.prevent_request_message_content_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.request_id IS DISTINCT FROM OLD.request_id
    OR NEW.sender_role IS DISTINCT FROM OLD.sender_role
    OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only request message read flags can be updated.';
  END IF;

  IF OLD.read_by_client = true AND NEW.read_by_client = false THEN
    RAISE EXCEPTION 'read_by_client cannot be reset through this update.';
  END IF;

  IF OLD.read_by_admin = true AND NEW.read_by_admin = false THEN
    RAISE EXCEPTION 'read_by_admin cannot be reset through this update.';
  END IF;

  IF NEW.read_by_client IS DISTINCT FROM OLD.read_by_client
    AND NOT (
      OLD.sender_role = 'admin'
      AND NEW.read_by_client = true
      AND EXISTS (
        SELECT 1
        FROM public.contact_requests
        WHERE contact_requests.id = OLD.request_id
          AND contact_requests.user_id = auth.uid()
      )
    )
  THEN
    RAISE EXCEPTION 'Only the owning client can mark admin messages as read.';
  END IF;

  IF NEW.read_by_admin IS DISTINCT FROM OLD.read_by_admin
    AND NOT (
      OLD.sender_role = 'client'
      AND NEW.read_by_admin = true
      AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
      )
    )
  THEN
    RAISE EXCEPTION 'Only an admin can mark client messages as read.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_request_message_content_update_trigger ON public.request_messages;
CREATE TRIGGER prevent_request_message_content_update_trigger
BEFORE UPDATE ON public.request_messages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_request_message_content_update();

DROP POLICY IF EXISTS "request messages mark as read for admin or owner" ON public.request_messages;
DROP POLICY IF EXISTS "clients mark admin messages as read" ON public.request_messages;
CREATE POLICY "clients mark admin messages as read"
ON public.request_messages
FOR UPDATE
TO authenticated
USING (
  sender_role = 'admin'
  AND EXISTS (
    SELECT 1
    FROM public.contact_requests
    WHERE contact_requests.id = request_messages.request_id
      AND contact_requests.user_id = auth.uid()
  )
)
WITH CHECK (
  sender_role = 'admin'
  AND read_by_client = true
  AND EXISTS (
    SELECT 1
    FROM public.contact_requests
    WHERE contact_requests.id = request_messages.request_id
      AND contact_requests.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admins mark client messages as read" ON public.request_messages;
CREATE POLICY "admins mark client messages as read"
ON public.request_messages
FOR UPDATE
TO authenticated
USING (
  sender_role = 'client'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  sender_role = 'client'
  AND read_by_admin = true
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);
