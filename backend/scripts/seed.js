// backend/scripts/seed.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/"/g, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/"/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Starting database seeding...');
  
  // 1. Find the test student 'riya@test.com'
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('email', 'riya@test.com')
    .single();

  if (studentError || !student) {
    console.error('Test student riya@test.com not found. Please register first.');
    return;
  }

  const studentId = student.id;
  console.log(`Found test student ID: ${studentId}`);

  // Calculate dynamic dates relative to today
  const getRelativeDate = (daysAhead, hours, minutes) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  const seedTasks = [
    {
      title: 'DBMS Assignment 2',
      subject: 'DBMS',
      deadline: getRelativeDate(1, 18, 0),
      long_summary: 'DBMS Assignment 2 covering Schema Normalization (1NF, 2NF, 3NF, BCNF) and ER Diagrams. Exercises require solving normal form decompositions and creating a entity-relationship model for a university grading database.',
      links: ['database-normal-forms.pdf', 'er-diagram-maker.com'],
      attachments: ['assignment_details.docx']
    },
    {
      title: 'OS Lab Report',
      subject: 'Operating Systems',
      deadline: getRelativeDate(3, 23, 59),
      long_summary: 'Complete OS Lab Report for CPU Scheduling algorithms. Must implement simulation scripts for First-Come First-Served (FCFS), Shortest Job First (SJF), and Round Robin (RR) policies and compare turnaround/waiting times.',
      links: ['os-scheduling-basics.org'],
      attachments: ['scheduling_template.c', 'lab_instructions.pdf']
    },
    {
      title: 'CN Quiz – Chapter 3',
      subject: 'Computer Networks',
      deadline: getRelativeDate(5, 10, 0),
      long_summary: 'Chapter 3 (Transport Layer) multiple choice assessment. Preparation should focus on TCP congestion control windows, UDP headers, three-way handshakes, and sliding window protocols.',
      links: ['tcp-state-transition-diagram.png'],
      attachments: ['chapter_3_slides.pdf']
    },
    {
      title: 'Software Engineering Presentation',
      subject: 'SE',
      deadline: getRelativeDate(8, 14, 0),
      long_summary: 'Group presentation on Agile Development methodologies (Scrum vs Kanban). Requirements: 10-minute slide deck submission highlighting role separation (Product Owner, Scrum Master, Team) and sprint cycle planning.',
      links: ['agilemanifesto.org'],
      attachments: ['presentation_outline.pptx', 'grading_rubric.xlsx']
    }
  ];

  let insertedCount = 0;

  for (const taskData of seedTasks) {
    // Check if task already exists for this student
    const { data: existing, error: existError } = await supabase
      .from('tasks')
      .select('id')
      .eq('student_id', studentId)
      .eq('title', taskData.title)
      .maybeSingle();

    if (existError) {
      console.error(`Error checking existing task "${taskData.title}":`, existError.message);
      continue;
    }

    if (existing) {
      console.log(`Task "${taskData.title}" already exists. Skipping.`);
      continue;
    }

    // Calculate reminder time (1 hour before deadline)
    const deadlineDate = new Date(taskData.deadline);
    const reminderTime = new Date(deadlineDate.getTime() - 60 * 60 * 1000).toISOString();

    // Insert task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        student_id: studentId,
        title: taskData.title,
        subject: taskData.subject,
        deadline: taskData.deadline,
        reminder_time: reminderTime,
        add_to_calendar: true,
        source_text: `Mock parsed task: ${taskData.title}`
      })
      .select('id')
      .single();

    if (taskError || !task) {
      console.error(`Error inserting task "${taskData.title}":`, taskError?.message);
      continue;
    }

    // Insert task details
    const { error: detailsError } = await supabase
      .from('task_details')
      .insert({
        task_id: task.id,
        long_summary: taskData.long_summary,
        links: taskData.links,
        notes_or_attachments_mentioned: taskData.attachments
      });

    if (detailsError) {
      console.error(`Error inserting details for "${taskData.title}":`, detailsError.message);
    } else {
      insertedCount++;
    }
  }

  console.log(`Seeded ${insertedCount} rows`);
}

seed();
