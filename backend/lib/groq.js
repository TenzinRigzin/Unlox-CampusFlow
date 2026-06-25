// backend/lib/groq.js
// Groq client wrapper for CampusFlow AI pipelines with local fallback when GROQ_API_KEY is missing/invalid
import Groq from 'groq-sdk';
import supabase from './supabase.js';

const apiKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim().replace(/"/g, '') : '';

let client = null;
if (apiKey) {
  try {
    client = new Groq({ apiKey });
  } catch (e) {
    console.warn('Failed to initialize Groq client:', e.message);
  }
} else {
  console.warn('Warning: GROQ_API_KEY is not set. Falling back to local rule-based AI simulation.');
}

async function getKnownSubjects() {
  try {
    const { data, error } = await supabase.from('students').select('subjects');
    if (error || !data) return ['DBMS', 'OS'];
    const subjects = new Set();
    data.forEach(row => {
      if (Array.isArray(row.subjects)) {
        row.subjects.forEach(s => subjects.add(s.trim()));
      }
    });
    return Array.from(subjects);
  } catch (e) {
    return ['DBMS', 'OS'];
  }
}

function fallbackClassify(text) {
  const lowercase = text.toLowerCase();
  const hasDeadline = lowercase.includes('due') || 
                      lowercase.includes('deadline') || 
                      lowercase.includes('submit') || 
                      lowercase.includes('assignment') || 
                      lowercase.includes('exam') || 
                      lowercase.includes('quiz') || 
                      lowercase.includes('test');
  return {
    hasDeadline,
    confidence: "high"
  };
}

async function fallbackExtract(text) {
  const lowercase = text.toLowerCase();
  const subjects = await getKnownSubjects();
  
  let subject = 'Unknown';
  for (const sub of subjects) {
    if (lowercase.includes(sub.toLowerCase())) {
      subject = sub;
      break;
    }
  }

  let title = 'Task';
  const assignmentMatch = text.match(/(assignment\s*\d+|project\s*\d+|quiz\s*\d+|homework\s*\d+|lab\s*\d+|exam|test)/i);
  if (assignmentMatch) {
    title = assignmentMatch[0].replace(/\b\w/g, c => c.toUpperCase());
    if (subject !== 'Unknown' && !title.toUpperCase().includes(subject.toUpperCase())) {
      title = `${subject} ${title}`;
    }
  } else if (subject !== 'Unknown') {
    title = `${subject} Task`;
  }

  const now = new Date();
  let deadline = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); 
  
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = lowercase.match(/(this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (dayMatch) {
    const targetDayStr = dayMatch[2].toLowerCase();
    const targetDayIndex = daysOfWeek.indexOf(targetDayStr);
    const currentDayIndex = now.getDay();
    
    let daysDiff = targetDayIndex - currentDayIndex;
    if (daysDiff <= 0) {
      daysDiff += 7;
    }
    
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysDiff);
    
    const timeMatch = lowercase.match(/(\d+)\s*(am|pm)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const ampm = timeMatch[2].toLowerCase();
      if (ampm === 'pm' && hour < 12) {
        hour += 12;
      } else if (ampm === 'am' && hour === 12) {
        hour = 0;
      }
      targetDate.setHours(hour, 0, 0, 0);
    } else {
      targetDate.setHours(23, 59, 0, 0);
    }
    deadline = targetDate;
  }

  let shortDescription = `${title} is due.`;
  const dueMatch = text.match(/(is\s+)?due\s+([^,.]+)/i);
  if (dueMatch) {
    shortDescription = `${title} is due ${dueMatch[2].trim()}.`;
  }

  if (shortDescription.length > 140) {
    shortDescription = shortDescription.substring(0, 137) + '...';
  }

  const longSummary = text;

  const links = [];
  const linkMatches = text.match(/https?:\/\/[^\s,]+/gi);
  if (linkMatches) {
    links.push(...linkMatches);
  }

  const notesOrAttachmentsMentioned = [];
  if (lowercase.includes('portal')) {
    notesOrAttachmentsMentioned.push('portal');
  }

  return {
    title,
    subject,
    deadline: deadline.toISOString(),
    shortDescription,
    longSummary,
    links,
    notesOrAttachmentsMentioned
  };
}

function fallbackFlashcards(notes) {
  const sentences = notes.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const flashcards = [];

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();
    if (lower.includes(' is the ') || lower.includes(' is a ') || lower.includes(' refers to ')) {
      const parts = sentence.split(/ is the | is a | refers to /i);
      flashcards.push({
        question: `What is ${parts[0].trim()}?`,
        answer: parts[1].trim()
      });
    } else if (lower.includes(' requires ')) {
      const parts = sentence.split(/ requires /i);
      flashcards.push({
        question: `What does ${parts[0].trim()} require?`,
        answer: parts[1].trim()
      });
    } else {
      flashcards.push({
        question: `Explain: ${sentence}`,
        answer: `From lecture notes: ${sentence}`
      });
    }
  });

  // Ensure at least 4 flashcards
  while (flashcards.length < 4) {
    flashcards.push({
      question: `Key concept in database management systems`,
      answer: notes
    });
  }

  return flashcards;
}

function fallbackQuiz(notes) {
  const cards = fallbackFlashcards(notes);
  const quiz = [];

  cards.forEach((card, index) => {
    const correctOption = card.answer;
    const options = [correctOption];

    // Gather potential distractors from other flashcard answers
    const otherAnswers = cards.filter((c, idx) => idx !== index).map(c => c.answer);
    
    // Add distractors
    while (options.length < 4 && otherAnswers.length > 0) {
      const randIdx = Math.floor(Math.random() * otherAnswers.length);
      const val = otherAnswers.splice(randIdx, 1)[0];
      if (!options.includes(val)) {
        options.push(val);
      }
    }

    // Default generic options if not enough distractors
    const genericDistractors = [
      'An index to speed up retrieval.',
      'A primary key constraint.',
      'To prevent SQL injection.',
      'Database replication schema.'
    ];
    while (options.length < 4) {
      const val = genericDistractors.shift();
      if (!options.includes(val)) {
        options.push(val);
      }
    }

    quiz.push({
      question: card.question,
      options: options,
      correctIndex: 0
    });
  });

  return quiz;
}

export async function groqChat(systemPrompt, userMessage, jsonMode = false) {
  if (!client) {
    console.log('Using local fallback parser...');
    const sysPromptLower = systemPrompt.toLowerCase();
    
    if (sysPromptLower.includes('classifier') || sysPromptLower.includes('hasdeadline')) {
      const result = fallbackClassify(userMessage);
      return JSON.stringify(result);
    } else if (sysPromptLower.includes('flashcard')) {
      const result = fallbackFlashcards(userMessage);
      return JSON.stringify(result);
    } else if (sysPromptLower.includes('quiz')) {
      const result = fallbackQuiz(userMessage);
      return JSON.stringify(result);
    } else {
      const result = await fallbackExtract(userMessage);
      return JSON.stringify(result);
    }
  }

  try {
    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1024,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    };

    const response = await client.chat.completions.create(payload);
    return response?.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    console.warn('Groq Chat call failed, falling back to local parser:', err.message);
    const sysPromptLower = systemPrompt.toLowerCase();
    if (sysPromptLower.includes('classifier') || sysPromptLower.includes('hasdeadline')) {
      const result = fallbackClassify(userMessage);
      return JSON.stringify(result);
    } else if (sysPromptLower.includes('flashcard')) {
      const result = fallbackFlashcards(userMessage);
      return JSON.stringify(result);
    } else if (sysPromptLower.includes('quiz')) {
      const result = fallbackQuiz(userMessage);
      return JSON.stringify(result);
    } else {
      const result = await fallbackExtract(userMessage);
      return JSON.stringify(result);
    }
  }
}
