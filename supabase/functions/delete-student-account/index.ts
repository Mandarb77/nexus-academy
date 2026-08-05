import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type DeleteRequest = {
  studentId?: unknown;
  confirmation?: unknown;
};

type StorageAdmin = {
  listBuckets: () => Promise<{
    data: Array<{ id: string }> | null;
    error: { message: string } | null;
  }>;
  from: (bucketId: string) => {
    list: (
      path: string,
      options: { limit: number; offset: number },
    ) => Promise<{
      data: Array<{ id: string | null; name: string }> | null;
      error: { message: string } | null;
    }>;
    remove: (
      paths: string[],
    ) => Promise<{ error: { message: string } | null }>;
  };
};

type DatabaseError = { message: string };

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string;
};

type AuditInsert = {
  student_id: string;
  student_display_name: string | null;
  student_email: string | null;
  deleted_by: string;
  status: "requested";
};

type AuditUpdate = {
  status: "completed" | "partial" | "failed";
  storage_objects_deleted?: number;
  error_message: string | null;
  completed_at: string;
};

type AdminClient = {
  from(table: "profiles"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{
          data: ProfileRow | null;
          error: DatabaseError | null;
        }>;
      };
    };
  };
  from(table: "account_deletion_log"): {
    insert(values: AuditInsert): {
      select(columns: string): {
        single(): Promise<{
          data: { id: string } | null;
          error: DatabaseError | null;
        }>;
      };
    };
    update(values: AuditUpdate): {
      eq(
        column: string,
        value: string,
      ): Promise<{ error: DatabaseError | null }>;
    };
  };
  auth: {
    admin: {
      deleteUser(
        userId: string,
      ): Promise<{ error: { message: string } | null }>;
    };
  };
  storage: StorageAdmin;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

async function listFiles(
  storage: StorageAdmin,
  bucketId: string,
  path: string,
): Promise<string[]> {
  const files: string[] = [];
  const limit = 100;

  for (let offset = 0;; offset += limit) {
    const { data, error } = await storage
      .from(bucketId)
      .list(path, { limit, offset });

    if (error) throw new Error(`${bucketId}: ${error.message}`);

    const entries = data ?? [];
    for (const entry of entries) {
      const entryPath = `${path}/${entry.name}`;
      if (entry.id) {
        files.push(entryPath);
      } else {
        files.push(...await listFiles(storage, bucketId, entryPath));
      }
    }

    if (entries.length < limit) break;
  }

  return files;
}

async function removeStudentStorage(
  storage: StorageAdmin,
  studentId: string,
): Promise<number> {
  const { data: buckets, error: bucketsError } = await storage.listBuckets();
  if (bucketsError) throw new Error(bucketsError.message);

  let deleted = 0;
  for (const bucket of buckets ?? []) {
    const files = await listFiles(storage, bucket.id, studentId);
    for (let index = 0; index < files.length; index += 100) {
      const batch = files.slice(index, index + 100);
      const { error } = await storage.from(bucket.id).remove(batch);
      if (error) throw new Error(`${bucket.id}: ${error.message}`);
      deleted += batch.length;
    }
  }

  return deleted;
}

const deleteStudent = withSupabase(
  { auth: "user" },
  async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    let body: DeleteRequest;
    try {
      body = await req.json() as DeleteRequest;
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const studentId = typeof body.studentId === "string"
      ? body.studentId.trim()
      : "";
    if (
      !UUID_PATTERN.test(studentId) ||
      body.confirmation !== studentId
    ) {
      return json({ ok: false, error: "Invalid deletion confirmation" }, 400);
    }

    const callerId = ctx.userClaims?.id;
    if (!callerId) {
      return json({ ok: false, error: "Authentication required" }, 401);
    }

    const admin = ctx.supabaseAdmin as unknown as AdminClient;

    const { data: caller, error: callerError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", callerId)
      .maybeSingle();

    if (callerError) {
      console.error("Could not verify caller role:", callerError.message);
      return json({ ok: false, error: "Could not verify teacher access" }, 500);
    }
    if (caller?.role !== "teacher") {
      return json({ ok: false, error: "Teachers only" }, 403);
    }

    const { data: student, error: studentError } = await admin
      .from("profiles")
      .select("id, display_name, email, role")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) {
      console.error("Could not load target student:", studentError.message);
      return json({ ok: false, error: "Could not load student" }, 500);
    }
    if (!student || student.role !== "student") {
      return json({ ok: false, error: "Student not found" }, 404);
    }

    const { data: audit, error: auditError } = await admin
      .from("account_deletion_log")
      .insert({
        student_id: student.id,
        student_display_name: student.display_name,
        student_email: student.email,
        deleted_by: callerId,
        status: "requested",
      })
      .select("id")
      .single();

    if (auditError || !audit) {
      console.error("Could not create deletion audit:", auditError?.message);
      return json({
        ok: false,
        error: "Deletion stopped because the audit record could not be created",
      }, 500);
    }

    const { error: deleteError } = await admin.auth.admin
      .deleteUser(studentId);

    if (deleteError) {
      await admin
        .from("account_deletion_log")
        .update({
          status: "failed",
          error_message: deleteError.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", audit.id);

      console.error("Auth user deletion failed:", deleteError.message);
      return json({ ok: false, error: "Student account deletion failed" }, 500);
    }

    let storageObjectsDeleted = 0;
    let storageError: string | null = null;
    try {
      storageObjectsDeleted = await removeStudentStorage(
        admin.storage,
        studentId,
      );
    } catch (error) {
      storageError = error instanceof Error ? error.message : String(error);
      console.error("Student storage cleanup failed:", storageError);
    }

    await admin
      .from("account_deletion_log")
      .update({
        status: storageError ? "partial" : "completed",
        storage_objects_deleted: storageObjectsDeleted,
        error_message: storageError,
        completed_at: new Date().toISOString(),
      })
      .eq("id", audit.id);

    return json({
      ok: true,
      deletedStudentId: studentId,
      storageObjectsDeleted,
      warning: storageError
        ? "The account was deleted, but some uploaded files may remain."
        : null,
    });
  },
);

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const response = await deleteStudent(req);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(corsHeaders)) {
      headers.set(name, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
