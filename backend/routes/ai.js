// backend/routes/ai.js
// AI helper endpoints using Groq LLM

import express from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import supabase from '../lib/supabase.js';
import { groqChat } from '../lib/groq.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * Resolve the caller identity.
 *   1️⃣ If an Authorization: Bearer <token> header is present, verify the JWT with Supabase.
 *   2️⃣ Else, if X‑N8N‑Secret header matches the shared secret, use the phone supplied in the request body.
 * Returns an object { studentId: string|null, phone: string|undefined }.
 */
async function resolveIdentity(req) {
  // 1️⃣ Bearer token (Custom JWT verification with fallback to Supabase)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const JWT_SECRET = (process.env.JWT_SECRET || 'super_secret_jwt_key_campusflow').trim().replace(/"/g, '');
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.userId) {
        return { studentId: decoded.userId, phone: undefined };
      }
    } catch (err) {
      // Fallback: try checking if it's a Supabase Auth token
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          return { studentId: user.id, phone: undefined };
        }
      } catch (subErr) {
        // ignore
      }
    }
  }

  // 2️⃣ N8N shared secret fallback
  const n8nSecret = req.headers['x-n8n-secret'] || req.headers['x-shared-secret'];
  const expected = process.env.N8N_SHARED_SECRET;
  if (expected && n8nSecret === expected) {
    // phone may be supplied in body – keep it as‑is (could be undefined)
    return { studentId: null, phone: req.body?.phone };
  }

  // No valid identity – treat as unauthenticated but allow the request to continue (some fields may be null)
  return { studentId: null, phone: req.body?.phone };
}

// ---------------------------------------------------------------
// POST /classify-message
// ---------------------------------------------------------------
router.post('/classify-message', async (req, res) => {
  const { text, phone } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const systemPrompt =
    "You are a classifier. Given a WhatsApp message, determine if it contains a concrete academic deadline, assignment, exam, or event with a specific date. Respond ONLY with a valid JSON object: { \"hasDeadline\": true/false, \"confidence\": \"high\" or \"low\" }. Do not include any other text.";

  try {
    const raw = await groqChat(systemPrompt, text, true);
    let parsed = { hasDeadline: false, confidence: 'low' };
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      // keep default fail‑safe
    }
    const response = {
      hasDeadline: Boolean(parsed.hasDeadline),
      confidence: parsed.confidence === 'high' ? 'high' : 'low',
    };
    return res.status(200).json(response);
  } catch (err) {
    // Never expose internal errors – fail safe
    return res.status(200).json({ hasDeadline: false, confidence: 'low' });
  }
});

// ---------------------------------------------------------------
// POST /extract-task
// ---------------------------------------------------------------
router.post('/extract-task', async (req, res) => {
  const { text, phone } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  const { studentId, phone: fallbackPhone } = await resolveIdentity(req);

  const todayIso = new Date().toISOString();
  const systemPrompt = `You are a deadline extractor. Today's date is ${todayIso}. Extract the academic deadline from the following message and respond ONLY with a valid JSON object with these exact keys:
{ "title": string (short task name),
  "subject": string (course/subject name),
  "deadline": string (ISO8601 datetime, resolve relative dates like 'this Friday' against today's date),
  "shortDescription": string (max 140 chars, suitable for a Calendar event description),
  "longSummary": string (full context: what the task is, what it covers, any links or attachments mentioned, the professor's instructions),
  "links": array of strings (URLs found in the message, empty array if none),
  "notesOrAttachmentsMentioned": array of strings (file names, doc titles mentioned, empty array if none)
}
Do not include any other text.`;

  try {
    const raw = await groqChat(systemPrompt, text, true);
    let extracted;
    try {
      extracted = JSON.parse(raw);
    } catch (e) {
      throw new Error('Invalid JSON from LLM');
    }

    // Resolve student_id by phone if we have a phone number (from body or fallback)
    let resolvedStudentId = studentId;
    if (!resolvedStudentId && (phone || fallbackPhone)) {
      const lookupPhone = phone || fallbackPhone;
      const { data: stud, error: studErr } = await supabase
        .from('students')
        .select('id')
        .eq('phone', lookupPhone)
        .single();
      if (!studErr && stud) {
        resolvedStudentId = stud.id;
      }
    }

    // Insert into pending_extractions
    const insertPayload = {
      student_id: resolvedStudentId,
      phone: phone || fallbackPhone,
      source_text: text,
      title: extracted.title,
      subject: extracted.subject,
      deadline: extracted.deadline,
      short_description: extracted.shortDescription,
      long_summary: extracted.longSummary,
      links: extracted.links,
      notes_or_attachments_mentioned: extracted.notesOrAttachmentsMentioned,
    };

    const { data: ins, error: insErr } = await supabase
      .from('pending_extractions')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insErr) {
      throw insErr;
    }

    return res.status(200).json({
      extractionId: ins.id,
      title: extracted.title,
      subject: extracted.subject,
      deadline: extracted.deadline,
      shortDescription: extracted.shortDescription,
      longSummary: extracted.longSummary,
      links: extracted.links,
      notesOrAttachmentsMentioned: extracted.notesOrAttachmentsMentioned,
    });
  } catch (err) {
    console.error('Extraction error:', err);
    return res.status(500).json({ error: 'Extraction failed — try again' });
  }
});

// ---------------------------------------------------------------
// POST /generate-study-pack – generate flashcards + quiz and trigger n8n
// Accepts: { notes, subject, phone?, studyTime? }
// The workflow expects: { subject, phone, studyTime, quizLink }
// ---------------------------------------------------------------
router.post('/generate-study-pack', requireAuth, async (req, res) => {
  const { notes, subject, phone, studyTime } = req.body;
  if (!notes) {
    return res.status(400).json({ error: 'Missing notes' });
  }

  const flashcardPrompt =
    "You are a study assistant. Convert the following lecture notes into flashcards. Respond ONLY with a valid JSON array of objects, each with keys 'question' (string) and 'answer' (string). Generate between 5 and 10 flashcards. Do not include any other text.";

  const quizPrompt =
    "You are a study assistant. Create a multiple-choice quiz from the following lecture notes. Respond ONLY with a valid JSON array of objects, each with keys: 'question' (string), 'options' (array of exactly 4 strings), 'correctIndex' (integer 0-3). Generate between 4 and 8 questions. Do not include any other text.";

  try {
    // Run both AI calls in parallel
    const [rawFlashcards, rawQuiz] = await Promise.all([
      groqChat(flashcardPrompt, notes, true),
      groqChat(quizPrompt, notes, true),
    ]);

    let flashcards, quiz;
    try { flashcards = JSON.parse(rawFlashcards); } catch (_) { throw new Error('Invalid flashcard JSON'); }
    try { quiz = JSON.parse(rawQuiz); } catch (_) { throw new Error('Invalid quiz JSON'); }

    // Persist the study pack
    let studyPackId = null;
    try {
      const { data: pack } = await supabase.from('study_packs').insert({
        student_id: req.user.id,
        source_notes: notes,
        flashcards,
        quiz,
      }).select('id').single();
      studyPackId = pack?.id;
    } catch (e) {
      console.error('Study pack insert error:', e.message);
    }

    // Build a quizLink pointing to the study-buddy page (n8n sends this via WhatsApp)
    const frontendUrl = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000').replace(/"/g, '').trim();
    const quizLink = studyPackId
      ? `${frontendUrl}/study-buddy?pack=${studyPackId}`
      : `${frontendUrl}/study-buddy`;

    // Fire n8n workflow if configured
    const webhookUrl = (process.env.N8N_WEBHOOK_URL || '').trim();
    if (webhookUrl) {
      // Fetch student phone if not provided
      let studentPhone = phone;
      if (!studentPhone) {
        try {
          const { data: stu } = await supabase.from('students').select('phone').eq('id', req.user.id).single();
          studentPhone = stu?.phone;
        } catch (_) {}
      }

      const n8nPayload = {
        subject: subject || 'Study Session',
        phone: studentPhone || '',
        // studyTime defaults to 30 min from now if not provided
        studyTime: studyTime || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        quizLink,
      };

      try {
        await axios.post(webhookUrl, n8nPayload, { timeout: 8000 });
      } catch (e) {
        // Non-fatal — don't block the user
        console.error('n8n webhook error:', e.message);
      }
    }

    return res.status(200).json({ flashcards, quiz, quizLink });
  } catch (err) {
    console.error('Study pack generation error:', err.message);
    return res.status(500).json({ error: 'Could not generate study pack — try again' });
  }
});

// ---------------------------------------------------------------
// POST /flashcards – kept for backwards compatibility
// ---------------------------------------------------------------
router.post('/flashcards', requireAuth, async (req, res) => {
  const { notes } = req.body;
  if (!notes) {
    return res.status(400).json({ error: 'Missing notes' });
  }

  const systemPrompt =
    "You are a study assistant. Convert the following lecture notes into flashcards. Respond ONLY with a valid JSON array of objects, each with keys 'question' (string) and 'answer' (string). Generate between 5 and 10 flashcards. Do not include any other text.";

  try {
    const raw = await groqChat(systemPrompt, notes, true);
    let flashcards;
    try {
      flashcards = JSON.parse(raw);
    } catch (_) {
      throw new Error('Invalid JSON');
    }
    return res.status(200).json({ flashcards });
  } catch (err) {
    console.error('Flashcards generation error:', err.message);
    return res.status(500).json({ error: 'Could not generate flashcards — try again' });
  }
});

// ---------------------------------------------------------------
// POST /quiz – generate multiple‑choice quiz from lecture notes
// ---------------------------------------------------------------
router.post('/quiz', requireAuth, async (req, res) => {
  const { notes } = req.body;
  if (!notes) {
    return res.status(400).json({ error: 'Missing notes' });
  }

  const systemPrompt =
    "You are a study assistant. Create a multiple-choice quiz from the following lecture notes. Respond ONLY with a valid JSON array of objects, each with keys: 'question' (string), 'options' (array of exactly 4 strings), 'correctIndex' (integer 0-3). Generate between 4 and 8 questions. Do not include any other text.";

  try {
    const raw = await groqChat(systemPrompt, notes, true);
    let quiz;
    try {
      quiz = JSON.parse(raw);
    } catch (_) {
      throw new Error('Invalid JSON');
    }

    return res.status(200).json({ quiz });
  } catch (err) {
    console.error('Quiz generation error:', err.message);
    return res.status(500).json({ error: 'Could not generate quiz — try again' });
  }
});

export default router;
