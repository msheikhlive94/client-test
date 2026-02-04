#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";

// Supabase config - all values from environment variables
const SUPABASE_URL = process.env.ZFLOW_SUPABASE_URL || "https://gpsztpweqkqvalgsckdd.supabase.co";
const SUPABASE_ANON_KEY = process.env.ZFLOW_SUPABASE_ANON_KEY;

// MCP service account credentials
const MCP_EMAIL = process.env.ZFLOW_MCP_EMAIL;
const MCP_PASSWORD = process.env.ZFLOW_MCP_PASSWORD;

// Validate required env vars
const missing = [];
if (!SUPABASE_ANON_KEY) missing.push("ZFLOW_SUPABASE_ANON_KEY");
if (!MCP_EMAIL) missing.push("ZFLOW_MCP_EMAIL");
if (!MCP_PASSWORD) missing.push("ZFLOW_MCP_PASSWORD");

if (missing.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missing.join(", ")}`);
  console.error("Set these in your shell profile (~/.zshrc or ~/.bashrc)");
  process.exit(1);
}

// Create Supabase client with anon key (will authenticate as user)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authenticate on startup
async function authenticate() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: MCP_EMAIL,
    password: MCP_PASSWORD
  });
  
  if (error) {
    console.error(`Authentication failed: ${error.message}`);
    process.exit(1);
  }
  
  console.error(`Authenticated as ${data.user.email}`);
  return data;
}

// Tool definitions
const TOOLS = [
  {
    name: "list_projects",
    description: "List all projects, optionally filtered by status",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["draft", "active", "on_hold", "completed", "cancelled"],
          description: "Filter by project status"
        },
        client_id: {
          type: "string",
          description: "Filter by client ID"
        }
      }
    }
  },
  {
    name: "get_project",
    description: "Get details of a specific project including client info",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID" }
      },
      required: ["project_id"]
    }
  },
  {
    name: "create_project",
    description: "Create a new project",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        description: { type: "string", description: "Project description" },
        client_id: { type: "string", description: "Client ID" },
        status: { type: "string", enum: ["draft", "active", "on_hold"], default: "draft" },
        project_type: { type: "string", enum: ["automation", "internal_system", "mvp", "ai_agent", "consulting", "other"] },
        budget_type: { type: "string", enum: ["fixed", "hourly", "retainer"] },
        budget_amount: { type: "number" },
        hourly_rate: { type: "number", default: 85 }
      },
      required: ["name"]
    }
  },
  {
    name: "update_project",
    description: "Update a project's details or status",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID" },
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["draft", "active", "on_hold", "completed", "cancelled"] },
        budget_amount: { type: "number" },
        hourly_rate: { type: "number" }
      },
      required: ["project_id"]
    }
  },
  {
    name: "list_tasks",
    description: "List tasks for a project, optionally filtered by status",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID (required)" },
        status: { type: "string", enum: ["todo", "in_progress", "review", "done"] }
      },
      required: ["project_id"]
    }
  },
  {
    name: "create_task",
    description: "Create a new task in a project",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID" },
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        status: { type: "string", enum: ["todo", "in_progress", "review", "done"], default: "todo" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], default: "medium" },
        due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
        estimated_hours: { type: "number" }
      },
      required: ["project_id", "title"]
    }
  },
  {
    name: "update_task",
    description: "Update a task's details or status",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task ID" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["todo", "in_progress", "review", "done"] },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        due_date: { type: "string" }
      },
      required: ["task_id"]
    }
  },
  {
    name: "log_time",
    description: "Log time worked on a project",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID" },
        task_id: { type: "string", description: "Task ID (optional)" },
        duration_minutes: { type: "number", description: "Duration in minutes" },
        description: { type: "string", description: "What was done" },
        date: { type: "string", description: "Date (YYYY-MM-DD), defaults to today" },
        billable: { type: "boolean", default: true }
      },
      required: ["project_id", "duration_minutes"]
    }
  },
  {
    name: "get_time_entries",
    description: "Get time entries for a project or date range",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Filter by project" },
        start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
        end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
        limit: { type: "number", default: 50 }
      }
    }
  },
  {
    name: "list_clients",
    description: "List all clients",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search by name" }
      }
    }
  },
  {
    name: "create_client",
    description: "Create a new client",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Client/Company name" },
        contact_name: { type: "string", description: "Contact person" },
        email: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
        notes: { type: "string" }
      },
      required: ["name"]
    }
  },
  {
    name: "list_leads",
    description: "List leads/inquiries, optionally filtered by status",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["new", "contacted", "qualified", "converted", "lost"] },
        limit: { type: "number", default: 20 }
      }
    }
  },
  {
    name: "update_lead",
    description: "Update a lead's status or notes",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "Lead ID" },
        status: { type: "string", enum: ["new", "contacted", "qualified", "converted", "lost"] },
        notes: { type: "string" }
      },
      required: ["lead_id"]
    }
  },
  {
    name: "add_note",
    description: "Add a note to a project",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID" },
        title: { type: "string", description: "Note title" },
        content: { type: "string", description: "Note content" },
        note_type: { type: "string", enum: ["general", "meeting", "technical", "decision"], default: "general" }
      },
      required: ["project_id", "title"]
    }
  },
  {
    name: "get_project_summary",
    description: "Get a summary of a project including tasks, time, and notes",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID" }
      },
      required: ["project_id"]
    }
  },
  {
    name: "get_dashboard",
    description: "Get dashboard overview: active projects, recent time entries, upcoming tasks",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "list_task_comments",
    description: "Get comments for a specific task",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task ID" }
      },
      required: ["task_id"]
    }
  },
  {
    name: "add_task_comment",
    description: "Add a comment to a task",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task ID" },
        content: { type: "string", description: "Comment content" }
      },
      required: ["task_id", "content"]
    }
  }
];

// Tool handlers
async function handleTool(name, args) {
  switch (name) {
    case "list_projects": {
      let query = supabase.from("projects").select("*, clients(name)").order("created_at", { ascending: false });
      if (args.status) query = query.eq("status", args.status);
      if (args.client_id) query = query.eq("client_id", args.client_id);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_project": {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name, email)")
        .eq("id", args.project_id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "create_project": {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: args.name,
          description: args.description,
          client_id: args.client_id,
          status: args.status || "draft",
          project_type: args.project_type || "other",
          budget_type: args.budget_type || "hourly",
          budget_amount: args.budget_amount,
          hourly_rate: args.hourly_rate || 85
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "update_project": {
      const { project_id, ...updates } = args;
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", project_id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "list_tasks": {
      let query = supabase.from("tasks")
        .select("*")
        .eq("project_id", args.project_id)
        .order("position").order("created_at");
      if (args.status) query = query.eq("status", args.status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }

    case "create_task": {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          project_id: args.project_id,
          title: args.title,
          description: args.description,
          status: args.status || "todo",
          priority: args.priority || "medium",
          due_date: args.due_date,
          estimated_hours: args.estimated_hours
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "update_task": {
      const { task_id, ...updates } = args;
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", task_id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "log_time": {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          project_id: args.project_id,
          task_id: args.task_id,
          duration_minutes: args.duration_minutes,
          description: args.description,
          date: args.date || new Date().toISOString().split("T")[0],
          billable: args.billable !== false
        })
        .select("*, projects(name)")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_time_entries": {
      let query = supabase.from("time_entries")
        .select("*, projects(name), tasks(title)")
        .order("date", { ascending: false })
        .limit(args.limit || 50);
      if (args.project_id) query = query.eq("project_id", args.project_id);
      if (args.start_date) query = query.gte("date", args.start_date);
      if (args.end_date) query = query.lte("date", args.end_date);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }

    case "list_clients": {
      let query = supabase.from("clients").select("*").order("name");
      if (args.search) query = query.ilike("name", `%${args.search}%`);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }

    case "create_client": {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: args.name,
          contact_name: args.contact_name,
          email: args.email,
          phone: args.phone,
          company: args.company,
          notes: args.notes
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "list_leads": {
      let query = supabase.from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(args.limit || 20);
      if (args.status) query = query.eq("status", args.status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    }

    case "update_lead": {
      const { lead_id, ...updates } = args;
      const { data, error } = await supabase
        .from("leads")
        .update(updates)
        .eq("id", lead_id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "add_note": {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          project_id: args.project_id,
          title: args.title,
          content: args.content,
          note_type: args.note_type || "general"
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_project_summary": {
      const [project, tasks, timeEntries, notes] = await Promise.all([
        supabase.from("projects").select("*, clients(name)").eq("id", args.project_id).single(),
        supabase.from("tasks").select("*").eq("project_id", args.project_id),
        supabase.from("time_entries").select("*").eq("project_id", args.project_id),
        supabase.from("notes").select("*").eq("project_id", args.project_id).order("created_at", { ascending: false }).limit(5)
      ]);

      if (project.error) throw new Error(project.error.message);

      const tasksByStatus = {
        todo: tasks.data?.filter(t => t.status === "todo").length || 0,
        in_progress: tasks.data?.filter(t => t.status === "in_progress").length || 0,
        review: tasks.data?.filter(t => t.status === "review").length || 0,
        done: tasks.data?.filter(t => t.status === "done").length || 0
      };

      const totalMinutes = timeEntries.data?.reduce((sum, e) => sum + e.duration_minutes, 0) || 0;
      const billableMinutes = timeEntries.data?.filter(e => e.billable).reduce((sum, e) => sum + e.duration_minutes, 0) || 0;

      return {
        project: project.data,
        tasks: {
          total: tasks.data?.length || 0,
          by_status: tasksByStatus,
          items: tasks.data
        },
        time: {
          total_hours: (totalMinutes / 60).toFixed(1),
          billable_hours: (billableMinutes / 60).toFixed(1),
          billable_amount: ((billableMinutes / 60) * (project.data.hourly_rate || 85)).toFixed(2)
        },
        recent_notes: notes.data
      };
    }

    case "get_dashboard": {
      const [projects, recentTime, leads] = await Promise.all([
        supabase.from("projects").select("*, clients(name)").in("status", ["active", "on_hold"]).order("updated_at", { ascending: false }),
        supabase.from("time_entries").select("*, projects(name)").order("date", { ascending: false }).limit(10),
        supabase.from("leads").select("*").eq("status", "new").order("created_at", { ascending: false }).limit(5)
      ]);

      // Get tasks due soon
      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const upcomingTasks = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .neq("status", "done")
        .gte("due_date", today)
        .lte("due_date", nextWeek)
        .order("due_date");

      return {
        active_projects: projects.data,
        recent_time_entries: recentTime.data,
        new_leads: leads.data,
        upcoming_tasks: upcomingTasks.data
      };
    }

    case "list_task_comments": {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", args.task_id)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    }

    case "add_task_comment": {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("task_comments")
        .insert({
          task_id: args.task_id,
          user_id: user.id,
          content: args.content,
          author_type: "admin",
          author_name: user.email || "MCP Assistant"
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create server
const server = new Server(
  { name: "zflow-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleTool(name, args || {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Start server with authentication
async function main() {
  await authenticate();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("z-flow MCP server running");
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
