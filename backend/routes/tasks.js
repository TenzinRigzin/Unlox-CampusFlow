// backend/routes/tasks.js
// Routes for confirming AI‑extracted tasks and manual task management

const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken'); // only used by resolveIdentity fallback
const supabase = require('../lib/supabase.js').default;
const { requireAuth } = require('../middleware/auth.js');

const router = express.Router();

/**
 * Resolve identity – same logic as in ai.js.
 * Returns { studentId: string|null, phone: string|undefined }.
 */
async function resolveIdentity(req) {
  // 1️⃣ Supabase Bearer token (fallback to custom JWT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const JWT_SECRET = (process.env.JWT_SECRET || 'super_secret_jwt_key_campusflow').trim().replace(/"/g, '');
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.userId) {
        return { studentId: decoded.userId, phone: undefined };
      }
    } catch (_) {
      // try Supabase auth token as fallback
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          return { studentId: user.id, phone: undefined };
        }
      } catch (__) {}
    }
  }

  // 2️⃣ N8N shared secret fallback (or X‑Shared‑Secret header)
  const n8nSecret = req.headers['x-n8n-secret'] || req.headers['x-shared-secret'];
  const expected = process.env.N8N_SHARED_SECRET;
  if (expected && n8nSecret === expected) {
    return { studentId: null, phone: req.body?.phone };
  }

  // Default – unauthenticated (but we still allow the request to continue)
  return { studentId: null, phone: req.body?.phone };
}

// ---------------------------------------------------------------
// POST /confirm
// ---------------------------------------------------------------
router.post('/confirm', async (req, res) => {
  const { extractionId, edits, phone } = req.body;
  if (!extractionId) {
    return res.status(400).json({ error: 'extractionId is required' });
  }

  // 1️⃣ fetch pending extraction (must be pending)
  const { data: extraction, error: fetchErr } = await supabase
    .from('pending_extractions')
    .select('*')
    .eq('id', extractionId)
    .eq('status', 'pending')
    .single();

  if (fetchErr || !extraction) {
    return res.status(404).json({ error: 'Extraction not found or already confirmed' });
  }

  // 2️⃣ merge edits over extracted fields
  const merged = {
    title: (edits && edits.title) || extraction.title,
    subject: (edits && edits.subject) || extraction.subject,
    deadline: (edits && edits.deadline) || extraction.deadline,
    shortDescription: (edits && edits.shortDescription) || extraction.short_description,
    longSummary: (edits && edits.longSummary) || extraction.long_summary,
    links: extraction.links, // links are not editable via this endpoint
    notesOrAttachmentsMentioned: extraction.notes_or_attachments_mentioned,
  };

  // 3️⃣ resolve student_id
  let studentId = extraction.student_id;
  if (!studentId) {
    // try phone from body or extraction
    const lookupPhone = phone || extraction.phone;
    if (lookupPhone) {
      const { data: stud, error: studErr } = await supabase
        .from('students')
        .select('id')
        .eq('phone', lookupPhone)
        .single();
      if (!studErr && stud) {
        studentId = stud.id;
      }
    }
  }

  if (!studentId) {
    return res.status(404).json({ error: 'Student not found — please register first' });
  }

  // 4️⃣ insert into tasks
  const reminderTime = new Date(new Date(merged.deadline).getTime() - 60 * 60 * 1000).toISOString();
  const taskPayload = {
    student_id: studentId,
    title: merged.title,
    subject: merged.subject,
    deadline: merged.deadline,
    reminder_time: reminderTime,
    add_to_calendar: true,
    source_text: extraction.source_text,
  };

  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .insert(taskPayload)
    .select('*')
    .single();

  if (taskErr) {
    console.error('Task insert error:', taskErr);
    return res.status(500).json({ error: 'Failed to create task' });
  }

  // 5️⃣ insert into task_details
  const detailsPayload = {
    task_id: task.id,
    long_summary: merged.longSummary,
    links: merged.links,
    notes_or_attachments_mentioned: merged.notesOrAttachmentsMentioned,
  };
  const { error: detailsErr } = await supabase.from('task_details').insert(detailsPayload);
  if (detailsErr) {
    console.error('Task details insert error:', detailsErr);
    // Not fatal for the user – continue
  }

  // 6️⃣ update pending_extractions to confirmed
  await supabase.from('pending_extractions').update({ status: 'confirmed' }).eq('id', extractionId);

  // 7️⃣ Build webhook payload
  const { data: student, error: studFetchErr } = await supabase
    .from('students')
    .select('name, phone')
    .eq('id', studentId)
    .single();

  const deepDiveUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL || ''}/tasks/${task.id}`;

  const webhookPayload = {
    studentName: student?.name || '',
    phone: student?.phone || '',
    subject: task.subject,
    taskTitle: task.title,
    shortDescription: merged.shortDescription,
    deepDiveUrl,
    deadline: task.deadline,
    reminderTime: task.reminder_time,
    addToCalendar: true,
  };

  // 8️⃣ log automation and fire webhook
  const { data: logEntry, error: logErr } = await supabase
    .from('automations_log')
    .insert({
      student_id: studentId,
      task_id: task.id,
      workflow_name: 'deadline_reminder',
      status: 'queued',
      payload: webhookPayload,
    })
    .select('id')
    .single();

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (webhookUrl && logEntry) {
    try {
      const resp = await axios.post(webhookUrl, webhookPayload);
      await supabase
        .from('automations_log')
        .update({ status: 'success', response: resp.data })
        .eq('id', logEntry.id);
    } catch (e) {
      console.error('Webhook error:', e.message);
      await supabase
        .from('automations_log')
        .update({ status: 'failed', response: e.message })
        .eq('id', logEntry.id);
    }
  }

  // 9️⃣ response
  return res.status(201).json({
    taskId: task.id,
    deepDiveUrl,
    message: 'Task created and reminder queued.',
  });
});

// ---------------------------------------------------------------
// GET / (list tasks for authenticated user)
// ---------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  const studentId = req.user.id;
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, task_details(*)')
    .eq('student_id', studentId)
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Fetch tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }

  // reshape to match spec: merge details under a "details" key
  const result = tasks.map(t => ({
    id: t.id,
    student_id: t.student_id,
    title: t.title,
    subject: t.subject,
    deadline: t.deadline,
    reminder_time: t.reminder_time,
    add_to_calendar: t.add_to_calendar,
    source_text: t.source_text,
    created_at: t.created_at,
    details: t.task_details ? t.task_details[0] : null,
  }));

  return res.status(200).json(result);
});

// ---------------------------------------------------------------
// GET /:id (fetch details for a specific task)
// ---------------------------------------------------------------
router.get('/:id', requireAuth, async (req, res) => {
  const studentId = req.user.id;
  const { id } = req.params;
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*, task_details(*)')
    .eq('student_id', studentId)
    .eq('id', id)
    .single();

  if (error || !task) {
    console.error('Fetch task details error:', error);
    return res.status(404).json({ error: 'Task not found' });
  }

  const result = {
    id: task.id,
    student_id: task.student_id,
    title: task.title,
    subject: task.subject,
    deadline: task.deadline,
    reminder_time: task.reminder_time,
    add_to_calendar: task.add_to_calendar,
    source_text: task.source_text,
    created_at: task.created_at,
    details: task.task_details ? task.task_details[0] : null,
  };

  return res.status(200).json(result);
});

// ---------------------------------------------------------------
// POST /manual – create a task without AI extraction
// ---------------------------------------------------------------
router.post('/manual', requireAuth, async (req, res) => {
  const { title, subject, deadline, reminderTime, addToCalendar } = req.body;
  if (!title || !subject || !deadline) {
    return res.status(400).json({ error: 'title, subject and deadline are required' });
  }

  const reminder = reminderTime || new Date(new Date(deadline).getTime() - 60 * 60 * 1000).toISOString();
  const taskPayload = {
    student_id: req.user.id,
    title,
    subject,
    deadline,
    reminder_time: reminder,
    add_to_calendar: addToCalendar !== undefined ? addToCalendar : true,
    source_text: '',
  };

  const { data: task, error: taskErr } = await supabase.from('tasks').insert(taskPayload).select('*').single();
  if (taskErr) {
    console.error('Manual task insert error:', taskErr);
    return res.status(500).json({ error: 'Failed to create manual task' });
  }

  // Minimal webhook payload for manual tasks
  const { data: student } = await supabase.from('students').select('name, phone').eq('id', req.user.id).single();
  const deepDiveUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL || ''}/tasks/${task.id}`;
  const webhookPayload = {
    studentName: student?.name || '',
    phone: student?.phone || '',
    subject: task.subject,
    taskTitle: task.title,
    shortDescription: '',
    deepDiveUrl,
    deadline: task.deadline,
    reminderTime: task.reminder_time,
    addToCalendar: task.add_to_calendar,
  };

  const { data: logEntry, error: logErr } = await supabase
    .from('automations_log')
    .insert({
      student_id: req.user.id,
      task_id: task.id,
      workflow_name: 'deadline_reminder',
      status: 'queued',
      payload: webhookPayload,
    })
    .select('id')
    .single();

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (webhookUrl && logEntry) {
    try {
      const resp = await axios.post(webhookUrl, webhookPayload);
      await supabase.from('automations_log').update({ status: 'success', response: resp.data }).eq('id', logEntry.id);
    } catch (e) {
      console.error('Manual webhook error:', e.message);
      await supabase.from('automations_log').update({ status: 'failed', response: e.message }).eq('id', logEntry.id);
    }
  }

  return res.status(201).json({ taskId: task.id });
});

module.exports = router;
