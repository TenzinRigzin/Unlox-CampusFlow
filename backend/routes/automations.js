// backend/routes/automations.js
// Route to list automation log entries for the authenticated student

const express = require('express');
const { requireAuth } = require('../middleware/auth.js');
const supabase = require('../lib/supabase.js').default;

const router = express.Router();

// GET /automations – list automation logs for the current user
router.get('/', requireAuth, async (req, res) => {
  const studentId = req.user.id;
  const { data: logs, error } = await supabase
    .from('automations_log')
    .select('id, workflow_name, status, payload, response, created_at, task_id')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Automations fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch automations' });
  }

  return res.status(200).json(logs);
});

module.exports = router;
