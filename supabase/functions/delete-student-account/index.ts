import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.100.1'
import {
  normalizeEmail,
  validateConfirmation,
  validateDeletionTarget,
  validateTeacher,
} from '../_shared/accountDeletionPolicy.ts'

const STORAGE_BUCKETS = ['patent-uploads', 'makers-marks'] as const
const PAGE_SIZE = 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type DeleteRequest = {
  studentId?: unknown
  confirmation?: unknown
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

async function listFilesRecursively(
  admin: Pick<SupabaseClient, 'storage'>,
  bucket: string,
  path: string,
): Promise<string[]> {
  const files: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(path, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) throw new Error(`Could not list ${bucket}/${path}: ${error.message}`)
    if (!data?.length) break

    for (const item of data) {
      const itemPath = path ? `${path}/${item.name}` : item.name
      if (item.id == null) {
        files.push(...(await listFilesRecursively(admin, bucket, itemPath)))
      } else {
        files.push(itemPath)
      }
    }

    if (data.length < PAGE_SIZE) break
    offset += data.length
  }

  return files
}

async function removeStudentUploads(
  admin: Pick<SupabaseClient, 'storage'>,
  studentId: string,
): Promise<number> {
  let removed = 0

  for (const bucket of STORAGE_BUCKETS) {
    const paths = await listFilesRecursively(admin, bucket, studentId)
    for (let start = 0; start < paths.length; start += PAGE_SIZE) {
      const batch = paths.slice(start, start + PAGE_SIZE)
      const { error } = await admin.storage.from(bucket).remove(batch)
      if (error) throw new Error(`Could not remove files from ${bucket}: ${error.message}`)
      removed += batch.length
    }
  }

  return removed
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: 'Function is not configured' }, 500)
  }

  const authorization = request.headers.get('Authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) {
    return jsonResponse({ ok: false, error: 'Authentication required' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: callerData, error: callerError } = await admin.auth.getUser(accessToken)
  const caller = callerData.user
  if (callerError || !caller) {
    return jsonResponse({ ok: false, error: 'Invalid session' }, 401)
  }

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('id, role, email')
    .eq('id', caller.id)
    .maybeSingle()

  if (callerProfileError) {
    return jsonResponse({ ok: false, error: 'Could not verify teacher account' }, 500)
  }
  if (!callerProfile) {
    return jsonResponse({ ok: false, error: 'Teacher profile not found' }, 403)
  }
  const teacherFailure = validateTeacher(callerProfile.role)
  if (teacherFailure) {
    return jsonResponse({ ok: false, error: teacherFailure.error }, teacherFailure.status)
  }

  let body: DeleteRequest
  try {
    body = (await request.json()) as DeleteRequest
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid request body' }, 400)
  }

  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
  const confirmation = typeof body.confirmation === 'string' ? body.confirmation : ''
  if (!studentId) {
    return jsonResponse({ ok: false, error: 'Student is required' }, 400)
  }
  const confirmationFailure = validateConfirmation(confirmation)
  if (confirmationFailure) {
    return jsonResponse({ ok: false, error: confirmationFailure.error }, confirmationFailure.status)
  }

  const { data: studentProfile, error: studentProfileError } = await admin
    .from('profiles')
    .select('id, role, email, display_name')
    .eq('id', studentId)
    .maybeSingle()

  if (studentProfileError) {
    return jsonResponse({ ok: false, error: 'Could not load student account' }, 500)
  }
  if (!studentProfile) {
    return jsonResponse({ ok: false, error: 'Student account not found' }, 404)
  }

  const { data: authStudentData, error: authStudentError } = await admin.auth.admin.getUserById(studentId)
  if (authStudentError || !authStudentData.user) {
    return jsonResponse({ ok: false, error: 'Student Auth account not found' }, 404)
  }

  const studentEmail = normalizeEmail(authStudentData.user.email ?? studentProfile.email)
  if (!studentEmail) {
    return jsonResponse({ ok: false, error: 'Student account has no email address' }, 400)
  }
  const targetFailure = validateDeletionTarget({
    callerId: caller.id,
    studentId,
    studentRole: studentProfile.role,
    studentEmail,
  })
  if (targetFailure) {
    return jsonResponse({ ok: false, error: targetFailure.error }, targetFailure.status)
  }

  let filesRemoved = 0
  try {
    filesRemoved = await removeStudentUploads(admin, studentId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Storage cleanup failed'
    return jsonResponse({ ok: false, error: message }, 500)
  }

  const { data: auditRow, error: auditError } = await admin
    .from('teacher_account_deletions')
    .insert({
      deleted_by: caller.id,
      deleted_by_email: normalizeEmail(caller.email ?? callerProfile.email),
      student_id: studentId,
      student_email: studentEmail,
      student_display_name: studentProfile.display_name,
    })
    .select('id')
    .single()

  if (auditError || !auditRow) {
    return jsonResponse(
      {
        ok: false,
        error: 'Could not write deletion audit; account was not deleted',
        filesRemoved,
      },
      500,
    )
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(studentId, false)
  if (deleteError) {
    await admin.from('teacher_account_deletions').delete().eq('id', auditRow.id)
    return jsonResponse(
      {
        ok: false,
        error: `Auth deletion failed: ${deleteError.message}`,
        filesRemoved,
      },
      500,
    )
  }

  return jsonResponse({
    ok: true,
    studentId,
    studentEmail,
    filesRemoved,
  })
})
