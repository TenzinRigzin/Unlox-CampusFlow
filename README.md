# CampusFlow

## What it does
CampusFlow is a state-of-the-art AI-powered academic assistant and productivity coordinator. Designed specifically to alleviate students from the cognitive load of managing academic deadlines and scattered study resources, it monitors incoming communication channels (like WhatsApp, Slack, or Discord) and uses the Groq LLM API to automatically classify, extract, and schedule assignment deadlines, test dates, and presentations.

The application's "magic moment" occurs when a student receives a chaotic, unstructured chat message containing deadline info in a WhatsApp group, copy-pastes it into the AI Extractor tool, and instantly witnesses the system classify the message, parse the exact datetime, extract key subjects/links/attachments, and schedule a calendar event with automated reminder alerts—all in a single click, without manually opening a single calendar form.

## Architecture
Below is the architectural data flow map for CampusFlow:

```text
               +----------------------------------------+
               |                Browser                 |
               +-------------------+--------------------+
                                   | HTTP / JSON
                                   v
               +-------------------+--------------------+
               |          Next.js Frontend              |
               +-------------------+--------------------+
                                   | HTTP / CORS
                                   v
               +-------------------+--------------------+
               |           Express Backend              |
               +----------+------------------+----------+
                          |                  |
               SQL / RLS  v                  v  n8n Webhooks (HTTP)
               +----------+--------+   +-----+------------------+
               |  Supabase Database|   |      n8n Workflows     |
               +-------------------+   +-----+------------------+
                                             |
                                             v  Twilio WhatsApp API
                                       +-----+------------------+
                                       |     WhatsApp / SMS     |
                                       +------------------------+
```

### Automation & Integrations loop:
```text
n8n Workflows <---> Twilio WhatsApp Gateway <---> Express API <---> Google Calendar Sync
```

## Setup (local)
Follow these sequential steps to boot CampusFlow locally:

1. **Clone the Repository:**
   ```bash
   git clone <repository_url>
   cd campusflow
   ```

2. **Configure Environment Variables:**
   Copy the root `.env` template and populate all required API secrets:
   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies:**
   Install npm packages in both the frontend and backend workspace directories:
   ```bash
   # Install Backend dependencies
   cd backend
   npm install
   
   # Install Frontend dependencies
   cd ../frontend
   npm install
   ```

4. **Seed Database Tables:**
   Execute the database seeder script in the backend directory to populate mock academic tasks for the test account `riya@test.com`:
   ```bash
   cd ../backend
   node scripts/seed.js
   ```

5. **Start Servers:**
   Boot both Express API server and Next.js local dev servers:
   ```bash
   # Launch Backend (starts on port 4000)
   cd ../backend
   npm run dev
   
   # Launch Frontend (starts on port 3000)
   cd ../frontend
   npm run dev
   ```

## Environment Variables
The following environment variables should be defined in your `.env` configuration:

| Variable Name | Description |
|---|---|
| `SUPABASE_URL` | The unique API endpoint URL of your Supabase project instance. |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role API key used by the backend to bypass database Row Level Security. |
| `GROQ_API_KEY` | Groq Developer Cloud API key used for executing chat completions and parsing deadlines. |
| `N8N_DEADLINE_WEBHOOK_URL` | Endpoint URL of the active n8n workflow triggered when a task is confirmed. |
| `N8N_NOTICE_WEBHOOK_URL` | Webhook triggered to broadcast notifications to student communication feeds. |
| `N8N_SHARED_SECRET` | Secret key used to verify secure webhook validation headers between n8n and Express. |
| `JWT_SECRET` | Salt string used for cryptographic signing of client authentication tokens. |
| `PORT` | Custom port configuration for running the Express backend (defaults to 4000). |
| `NEXT_PUBLIC_API_URL` | Public endpoint URL pointing to the Express backend (defaults to `http://localhost:4000`). |
| `NEXT_PUBLIC_FRONTEND_URL` | Base URL of the client-side frontend application (defaults to `http://localhost:3000`). |

## n8n Workflows
CampusFlow delegates trigger automation flows to n8n pipelines:
* **Workflow 0 (Inbound Webhook):** Triggered when an incoming WhatsApp message is received. It classifies the message via the `/ai/classify-message` backend endpoint. If a valid academic deadline is detected, it triggers task extraction and alerts the student on WhatsApp.
* **Workflow 1 (Outbound Webhook):** Triggered when a student confirms an extracted task on the dashboard. It maps the payload, syncs the event to Google Calendar, and queues SMS/WhatsApp notifications to fire 1 hour prior to the deadline.

## Live Demo Flow
To demonstrate the core capabilities of CampusFlow:

1. **Dashboard & Auth:** Open `http://localhost:3000`. Register a new account or sign in. Go to `/dashboard`.
2. **AI Task Parsing:** Click the **Add Task via AI** button.
3. **Insert Message:** Paste: `"Hey guys DBMS assignment 2 is due this Friday 6pm, covers normalization + ER diagrams"`.
4. **Extract:** Click **Extract Deadline**. Witness "Classifying..." and "Extracting..." status transitions.
5. **Adjust & Verify:** Modify the title slightly in the editable card, and click **Confirm**. Observe the success Toast and verify the new card renders in your list.
6. **Supabase Check:** In the backend folder, run `node verify_tasks.js` to see the task record successfully written in the Supabase database.
