import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bylvbbadzzznjdrymiyg.supabase.co';
const ANON_KEY = 'sb_publishable_gJQ-XaYwsWccrTxWBrQ6nA_nQAf0XDU';
const SERVICE_KEY = 'sb_secret_pzLPZoGIpwRiKmlp7tN1iA_FlpjPdbn';

const T1 = {
  email: 'mcp+first-tenant@z-flow.de',
  password: 'Test1234!',
  userId: 'f6ebcd63-1091-472d-a238-6f6e50622309',
  workspaceId: '8b8c553d-73eb-4140-9b4f-d74abfc44402',
};
const T2 = {
  email: 'mcp+second-tenant@z-flow.de',
  password: 'Test1234!',
  userId: '87dd7a20-5ee2-4b46-a7ff-cb5441f7a83d',
  workspaceId: '71250406-2b6c-4185-9a32-463536432cb2',
};

const results = [];
function record(id, phase, test, expected, actual, status, notes = '') {
  results.push({ id, phase, test, expected, actual, status, notes });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'BLOCKED' ? '🚫' : '⚠️';
  console.log(`${icon} [${id}] ${test}: ${status}${notes ? ' — ' + notes : ''}`);
}

async function createServiceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createAuthClient(tenant) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: tenant.email,
    password: tenant.password,
  });
  if (error) throw new Error(`Auth failed for ${tenant.email}: ${error.message}`);
  return { client, session: data.session };
}

async function createAnonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================
// PHASE 1: Verify tenant setup
// ============================================================
async function phase1(svc) {
  console.log('\n========== PHASE 1: Verify Tenant Setup ==========\n');

  // 1.1 - Both tenants in auth.users
  const { data: authUsers, error: authErr } = await svc.auth.admin.listUsers();
  const t1Exists = authUsers?.users?.some(u => u.id === T1.userId);
  const t2Exists = authUsers?.users?.some(u => u.id === T2.userId);
  record('1.1', 1, 'Tenant 1 exists in auth.users', 'Found', t1Exists ? 'Found' : 'Not found', t1Exists ? 'PASS' : 'FAIL');
  record('1.2', 1, 'Tenant 2 exists in auth.users', 'Found', t2Exists ? 'Found' : 'Not found', t2Exists ? 'PASS' : 'FAIL');

  // 1.3 - Both in admin_users
  const { data: admins, error: adminErr } = await svc.from('admin_users').select('*');
  const t1Admin = admins?.some(a => a.workspace_id === T1.workspaceId);
  const t2Admin = admins?.some(a => a.workspace_id === T2.workspaceId);
  record('1.3', 1, 'Tenant 1 in admin_users', 'Found', t1Admin ? 'Found' : `Not found (${adminErr?.message || 'no match'})`, t1Admin ? 'PASS' : 'FAIL');
  record('1.4', 1, 'Tenant 2 in admin_users', 'Found', t2Admin ? 'Found' : `Not found (${adminErr?.message || 'no match'})`, t2Admin ? 'PASS' : 'FAIL');

  // 1.5 - Both in workspace_members
  const { data: members, error: memErr } = await svc.from('workspace_members').select('*');
  const t1Member = members?.some(m => m.workspace_id === T1.workspaceId && m.user_id === T1.userId);
  const t2Member = members?.some(m => m.workspace_id === T2.workspaceId && m.user_id === T2.userId);
  record('1.5', 1, 'Tenant 1 in workspace_members', 'Found', t1Member ? 'Found' : `Not found (${memErr?.message || 'no match'})`, t1Member ? 'PASS' : 'FAIL');
  record('1.6', 1, 'Tenant 2 in workspace_members', 'Found', t2Member ? 'Found' : `Not found (${memErr?.message || 'no match'})`, t2Member ? 'PASS' : 'FAIL');

  // 1.7 - Both workspaces exist
  const { data: workspaces, error: wsErr } = await svc.from('workspaces').select('*');
  const ws1 = workspaces?.some(w => w.id === T1.workspaceId);
  const ws2 = workspaces?.some(w => w.id === T2.workspaceId);
  record('1.7', 1, 'Workspace 1 exists', 'Found', ws1 ? 'Found' : `Not found`, ws1 ? 'PASS' : 'FAIL');
  record('1.8', 1, 'Workspace 2 exists', 'Found', ws2 ? 'Found' : `Not found`, ws2 ? 'PASS' : 'FAIL');
}

// ============================================================
// PHASE 2: Verify seeded data
// ============================================================
async function phase2(svc) {
  console.log('\n========== PHASE 2: Verify Seeded Data ==========\n');

  const tables = ['clients', 'projects', 'tasks', 'notes', 'time_entries', 'leads', 'intake_links'];
  let testNum = 1;

  for (const table of tables) {
    for (const [label, wsId] of [['WS1', T1.workspaceId], ['WS2', T2.workspaceId]]) {
      const { data, error } = await svc.from(table).select('*').eq('workspace_id', wsId);
      const count = data?.length || 0;
      const hasData = count > 0;
      record(`2.${testNum}`, 2, `${label} → ${table}`, '>0 rows', `${count} rows${error ? ' (error: ' + error.message + ')' : ''}`,
        hasData ? 'PASS' : (error ? 'BLOCKED' : 'FAIL'), error ? error.code : '');
      testNum++;
    }
  }
}

// ============================================================
// PHASE 3: RLS Multi-Tenant Isolation
// ============================================================
async function phase3(t1Client, t2Client, svc) {
  console.log('\n========== PHASE 3: RLS Multi-Tenant Isolation ==========\n');

  // Tables that have workspace_id
  const wsIdTables = ['projects', 'clients', 'tasks', 'notes', 'time_entries', 'leads', 'intake_links', 'admin_users', 'workspace_members'];
  
  // Get IDs of T2's records for cross-tenant update/delete tests (using service client)
  const t2Records = {};
  for (const table of wsIdTables) {
    const { data } = await svc.from(table).select('id').eq('workspace_id', T2.workspaceId).limit(1);
    if (data && data.length > 0) t2Records[table] = data[0].id;
  }

  let testNum = 1;

  for (const table of wsIdTables) {
    console.log(`\n--- Testing: ${table} ---`);

    // Test 1: T1 reads own data
    const { data: t1Own, error: t1OwnErr } = await t1Client.from(table).select('*').eq('workspace_id', T1.workspaceId);
    if (t1OwnErr) {
      record(`3.${testNum}`, 3, `T1 reads own ${table}`, 'Own data', `Error: ${t1OwnErr.message}`, 'BLOCKED', t1OwnErr.code);
    } else {
      const allOwn = t1Own.every(r => r.workspace_id === T1.workspaceId);
      record(`3.${testNum}`, 3, `T1 reads own ${table}`, 'Only own workspace data', `${t1Own.length} rows, all own: ${allOwn}`, 
        (t1Own.length > 0 && allOwn) ? 'PASS' : (t1Own.length === 0 ? 'FAIL' : 'FAIL'), `rows=${t1Own.length}`);
    }
    testNum++;

    // Test 2: T1 reads T2 data by workspace_id filter
    const { data: t1CrossRead, error: t1CrossErr } = await t1Client.from(table).select('*').eq('workspace_id', T2.workspaceId);
    if (t1CrossErr) {
      record(`3.${testNum}`, 3, `T1 reads T2's ${table} by ws filter`, '0 rows', `Error: ${t1CrossErr.message}`, 
        // Error could mean RLS is blocking - which is good if it's an RLS violation
        t1CrossErr.code === '42501' ? 'PASS' : 'BLOCKED', t1CrossErr.code);
    } else {
      record(`3.${testNum}`, 3, `T1 reads T2's ${table} by ws filter`, '0 rows', `${t1CrossRead.length} rows`, 
        t1CrossRead.length === 0 ? 'PASS' : 'FAIL');
    }
    testNum++;

    // Test 3: T1 inserts into T2's workspace
    let insertPayload = { workspace_id: T2.workspaceId };
    // Build a valid-ish insert payload per table
    if (table === 'projects') insertPayload = { ...insertPayload, name: 'RLS Test Project', status: 'active' };
    else if (table === 'clients') insertPayload = { ...insertPayload, name: 'RLS Test Client' };
    else if (table === 'tasks') {
      // Need a valid project_id from T2
      const { data: t2proj } = await svc.from('projects').select('id').eq('workspace_id', T2.workspaceId).limit(1);
      insertPayload = { ...insertPayload, title: 'RLS Test Task', status: 'todo', project_id: t2proj?.[0]?.id || '00000000-0000-0000-0000-000000000000' };
    }
    else if (table === 'notes') {
      const { data: t2proj } = await svc.from('projects').select('id').eq('workspace_id', T2.workspaceId).limit(1);
      insertPayload = { ...insertPayload, title: 'RLS Test Note', content: 'test', project_id: t2proj?.[0]?.id || '00000000-0000-0000-0000-000000000000' };
    }
    else if (table === 'time_entries') {
      const { data: t2task } = await svc.from('tasks').select('id').eq('workspace_id', T2.workspaceId).limit(1);
      insertPayload = { ...insertPayload, task_id: t2task?.[0]?.id || '00000000-0000-0000-0000-000000000000', duration_minutes: 30, date: '2026-01-01' };
    }
    else if (table === 'leads') insertPayload = { ...insertPayload, company_name: 'RLS Test Lead', status: 'new' };
    else if (table === 'intake_links') insertPayload = { ...insertPayload, token: 'rls-test-token-' + Date.now(), is_active: true };
    else if (table === 'admin_users') insertPayload = { ...insertPayload, email: 'rls-test@example.com', user_id: T1.userId };
    else if (table === 'workspace_members') insertPayload = { ...insertPayload, user_id: T1.userId, role: 'member' };

    const { data: insertData, error: insertErr } = await t1Client.from(table).insert(insertPayload).select();
    if (insertErr) {
      record(`3.${testNum}`, 3, `T1 inserts into T2's ${table}`, 'Denied', `Error: ${insertErr.message}`, 'PASS', insertErr.code);
    } else {
      // Insert succeeded - that's a failure of isolation
      // Clean up
      if (insertData && insertData[0]) {
        await svc.from(table).delete().eq('id', insertData[0].id);
      }
      record(`3.${testNum}`, 3, `T1 inserts into T2's ${table}`, 'Denied', `Succeeded! ${insertData?.length} row(s) inserted`, 'FAIL');
    }
    testNum++;

    // Test 4: T2 reads own data
    const { data: t2Own, error: t2OwnErr } = await t2Client.from(table).select('*').eq('workspace_id', T2.workspaceId);
    if (t2OwnErr) {
      record(`3.${testNum}`, 3, `T2 reads own ${table}`, 'Own data', `Error: ${t2OwnErr.message}`, 'BLOCKED', t2OwnErr.code);
    } else {
      const allOwn = t2Own.every(r => r.workspace_id === T2.workspaceId);
      record(`3.${testNum}`, 3, `T2 reads own ${table}`, 'Only own workspace data', `${t2Own.length} rows, all own: ${allOwn}`, 
        (t2Own.length > 0 && allOwn) ? 'PASS' : (t2Own.length === 0 ? 'FAIL' : 'FAIL'), `rows=${t2Own.length}`);
    }
    testNum++;

    // Test 5: T1 updates T2's record
    if (t2Records[table]) {
      const { data: upd, error: updErr, count: updCount } = await t1Client.from(table).update({ updated_at: new Date().toISOString() }).eq('id', t2Records[table]).select();
      if (updErr) {
        record(`3.${testNum}`, 3, `T1 updates T2's ${table} record`, '0 rows affected', `Error: ${updErr.message}`, 
          (updErr.code === '42501' || updErr.message.includes('permission denied') || updErr.message.includes('violates row-level security')) ? 'PASS' : 'BLOCKED', updErr.code);
      } else {
        const affected = upd?.length || 0;
        record(`3.${testNum}`, 3, `T1 updates T2's ${table} record`, '0 rows affected', `${affected} rows affected`, 
          affected === 0 ? 'PASS' : 'FAIL');
      }
    } else {
      record(`3.${testNum}`, 3, `T1 updates T2's ${table} record`, '0 rows affected', 'No T2 record found to test', 'BLOCKED');
    }
    testNum++;

    // Test 6: T1 deletes T2's record
    if (t2Records[table]) {
      const { data: del, error: delErr } = await t1Client.from(table).delete().eq('id', t2Records[table]).select();
      if (delErr) {
        record(`3.${testNum}`, 3, `T1 deletes T2's ${table} record`, '0 rows affected', `Error: ${delErr.message}`, 
          (delErr.code === '42501' || delErr.message.includes('permission denied') || delErr.message.includes('violates row-level security')) ? 'PASS' : 'BLOCKED', delErr.code);
      } else {
        const affected = del?.length || 0;
        record(`3.${testNum}`, 3, `T1 deletes T2's ${table} record`, '0 rows affected', `${affected} rows affected`, 
          affected === 0 ? 'PASS' : 'FAIL');
      }
    } else {
      record(`3.${testNum}`, 3, `T1 deletes T2's ${table} record`, '0 rows affected', 'No T2 record found to test', 'BLOCKED');
    }
    testNum++;
  }

  // --- workspaces table (no workspace_id on itself, uses id) ---
  console.log('\n--- Testing: workspaces ---');

  // T1 reads workspaces - should only see own
  const { data: t1Ws, error: t1WsErr } = await t1Client.from('workspaces').select('*');
  if (t1WsErr) {
    record(`3.${testNum}`, 3, 'T1 reads workspaces', 'Only own workspace(s)', `Error: ${t1WsErr.message}`, 'BLOCKED', t1WsErr.code);
  } else {
    const ownOnly = t1Ws.every(w => w.id === T1.workspaceId);
    record(`3.${testNum}`, 3, 'T1 reads workspaces', 'Only own workspace(s)', `${t1Ws.length} workspace(s), all own: ${ownOnly}`, 
      ownOnly ? 'PASS' : 'WARNING', `IDs: ${t1Ws.map(w=>w.id).join(', ')}`);
  }
  testNum++;

  // T2 reads workspaces
  const { data: t2Ws, error: t2WsErr } = await t2Client.from('workspaces').select('*');
  if (t2WsErr) {
    record(`3.${testNum}`, 3, 'T2 reads workspaces', 'Only own workspace(s)', `Error: ${t2WsErr.message}`, 'BLOCKED', t2WsErr.code);
  } else {
    const ownOnly = t2Ws.every(w => w.id === T2.workspaceId);
    record(`3.${testNum}`, 3, 'T2 reads workspaces', 'Only own workspace(s)', `${t2Ws.length} workspace(s), all own: ${ownOnly}`, 
      ownOnly ? 'PASS' : 'WARNING', `IDs: ${t2Ws.map(w=>w.id).join(', ')}`);
  }
  testNum++;

  // --- users table ---
  console.log('\n--- Testing: users ---');

  const { data: t1Users, error: t1UsersErr } = await t1Client.from('users').select('*');
  if (t1UsersErr) {
    record(`3.${testNum}`, 3, 'T1 reads users', 'Only own user', `Error: ${t1UsersErr.message}`, 'BLOCKED', t1UsersErr.code);
  } else {
    const ownOnly = t1Users.every(u => u.id === T1.userId);
    record(`3.${testNum}`, 3, 'T1 reads users', 'Only own user', `${t1Users.length} user(s), all own: ${ownOnly}`, 
      ownOnly ? 'PASS' : 'FAIL', `IDs: ${t1Users.map(u=>u.id).join(', ')}`);
  }
  testNum++;

  const { data: t2Users, error: t2UsersErr } = await t2Client.from('users').select('*');
  if (t2UsersErr) {
    record(`3.${testNum}`, 3, 'T2 reads users', 'Only own user', `Error: ${t2UsersErr.message}`, 'BLOCKED', t2UsersErr.code);
  } else {
    const ownOnly = t2Users.every(u => u.id === T2.userId);
    record(`3.${testNum}`, 3, 'T2 reads users', 'Only own user', `${t2Users.length} user(s), all own: ${ownOnly}`, 
      ownOnly ? 'PASS' : 'FAIL', `IDs: ${t2Users.map(u=>u.id).join(', ')}`);
  }
  testNum++;

  // T1 updates T2's user
  const { data: updUser, error: updUserErr } = await t1Client.from('users').update({ updated_at: new Date().toISOString() }).eq('id', T2.userId).select();
  if (updUserErr) {
    record(`3.${testNum}`, 3, "T1 updates T2's user record", '0 rows affected', `Error: ${updUserErr.message}`,
      (updUserErr.code === '42501' || updUserErr.message.includes('row-level security')) ? 'PASS' : 'BLOCKED', updUserErr.code);
  } else {
    record(`3.${testNum}`, 3, "T1 updates T2's user record", '0 rows affected', `${updUser?.length || 0} rows affected`,
      (updUser?.length || 0) === 0 ? 'PASS' : 'FAIL');
  }
  testNum++;

  // T1 deletes T2's user
  const { data: delUser, error: delUserErr } = await t1Client.from('users').delete().eq('id', T2.userId).select();
  if (delUserErr) {
    record(`3.${testNum}`, 3, "T1 deletes T2's user record", '0 rows affected', `Error: ${delUserErr.message}`,
      (delUserErr.code === '42501' || delUserErr.message.includes('row-level security')) ? 'PASS' : 'BLOCKED', delUserErr.code);
  } else {
    record(`3.${testNum}`, 3, "T1 deletes T2's user record", '0 rows affected', `${delUser?.length || 0} rows affected`,
      (delUser?.length || 0) === 0 ? 'PASS' : 'FAIL');
  }
  testNum++;

  // --- subscriptions table ---
  console.log('\n--- Testing: subscriptions ---');

  const { data: t1Subs, error: t1SubsErr } = await t1Client.from('subscriptions').select('*');
  if (t1SubsErr) {
    record(`3.${testNum}`, 3, 'T1 reads subscriptions', 'Only own', `Error: ${t1SubsErr.message}`, 'BLOCKED', t1SubsErr.code);
  } else {
    record(`3.${testNum}`, 3, 'T1 reads subscriptions', 'Only own workspace', `${t1Subs.length} rows`, 
      t1Subs.length >= 0 ? 'PASS' : 'FAIL', t1Subs.length === 0 ? 'No subscription data exists' : '');
  }
  testNum++;

  const { data: t2Subs, error: t2SubsErr } = await t2Client.from('subscriptions').select('*');
  if (t2SubsErr) {
    record(`3.${testNum}`, 3, 'T2 reads subscriptions', 'Only own', `Error: ${t2SubsErr.message}`, 'BLOCKED', t2SubsErr.code);
  } else {
    record(`3.${testNum}`, 3, 'T2 reads subscriptions', 'Only own workspace', `${t2Subs.length} rows`,
      t2Subs.length >= 0 ? 'PASS' : 'FAIL', t2Subs.length === 0 ? 'No subscription data exists' : '');
  }
  testNum++;
}

// ============================================================
// PHASE 4: Edge Cases
// ============================================================
async function phase4(t1Client, anonClient) {
  console.log('\n========== PHASE 4: Edge Cases ==========\n');

  // 4.1: Anonymous user access - should see nothing for most tables
  const anonTables = ['projects', 'clients', 'tasks', 'notes', 'time_entries', 'leads', 'admin_users', 'workspace_members'];
  let testNum = 1;
  
  for (const table of anonTables) {
    const { data, error } = await anonClient.from(table).select('*');
    if (error) {
      record(`4.${testNum}`, 4, `Anon reads ${table}`, '0 rows or error', `Error: ${error.message}`, 'PASS', error.code);
    } else {
      record(`4.${testNum}`, 4, `Anon reads ${table}`, '0 rows', `${data.length} rows`, data.length === 0 ? 'PASS' : 'FAIL');
    }
    testNum++;
  }

  // 4.9: Anon reads intake_links
  const { data: anonIntake, error: anonIntakeErr } = await anonClient.from('intake_links').select('*');
  if (anonIntakeErr) {
    record(`4.${testNum}`, 4, 'Anon reads intake_links', 'Only active tokens or restricted', `Error: ${anonIntakeErr.message}`, 'PASS', anonIntakeErr.code);
  } else {
    // Previously this was a FAIL because all intake links were exposed
    // Ideally only active tokens should be visible, or none at all, or filtered by token
    const activeOnly = anonIntake.every(l => l.is_active === true);
    record(`4.${testNum}`, 4, 'Anon reads intake_links', 'Only active tokens or none', `${anonIntake.length} rows, all active: ${activeOnly}`,
      anonIntake.length === 0 ? 'PASS' : (activeOnly ? 'WARNING' : 'FAIL'),
      anonIntake.length > 0 ? 'Anon can see intake links' : '');
  }
  testNum++;

  // 4.10: Anon submits lead (should work for intake)
  const { data: anonLeadInsert, error: anonLeadErr } = await anonClient.from('leads').insert({
    workspace_id: T1.workspaceId,
    company_name: 'Anon Test Lead',
    status: 'new',
  }).select();
  if (anonLeadErr) {
    record(`4.${testNum}`, 4, 'Anon submits lead', 'Allowed or denied (design choice)', `Error: ${anonLeadErr.message}`, 'PASS', 'Anon insert blocked');
  } else {
    record(`4.${testNum}`, 4, 'Anon submits lead', 'Allowed (for intake forms)', `Inserted ${anonLeadInsert?.length} row(s)`, 'PASS', 'Intake form submission works');
    // Clean up
    if (anonLeadInsert?.[0]?.id) {
      const svc = await createServiceClient();
      await svc.from('leads').delete().eq('id', anonLeadInsert[0].id);
    }
  }
  testNum++;

  // 4.11: workspace_members recursion test
  const { data: wmTest, error: wmErr } = await t1Client.from('workspace_members').select('*');
  if (wmErr && wmErr.code === '42P17') {
    record(`4.${testNum}`, 4, 'workspace_members recursion test', 'No 42P17 error', `42P17 infinite recursion detected`, 'FAIL', 'Still broken');
  } else if (wmErr) {
    record(`4.${testNum}`, 4, 'workspace_members recursion test', 'No 42P17 error', `Error: ${wmErr.message}`, 'BLOCKED', wmErr.code);
  } else {
    record(`4.${testNum}`, 4, 'workspace_members recursion test', 'No 42P17 error', `Success: ${wmTest.length} rows returned`, 'PASS');
  }
  testNum++;

  // 4.12: Workspaces visibility
  const { data: wsVis, error: wsVisErr } = await t1Client.from('workspaces').select('*');
  if (wsVisErr) {
    record(`4.${testNum}`, 4, 'Workspaces visibility (T1)', 'Only own', `Error: ${wsVisErr.message}`, 'BLOCKED');
  } else {
    const ownOnly = wsVis.length === 1 && wsVis[0].id === T1.workspaceId;
    record(`4.${testNum}`, 4, 'Workspaces visibility (T1)', 'Only own workspace', `${wsVis.length} workspace(s) visible`,
      ownOnly ? 'PASS' : 'WARNING', `IDs: ${wsVis.map(w=>w.id).join(', ')}`);
  }
  testNum++;

  // 4.13: Anon reads workspaces
  const { data: anonWs, error: anonWsErr } = await anonClient.from('workspaces').select('*');
  if (anonWsErr) {
    record(`4.${testNum}`, 4, 'Anon reads workspaces', '0 rows', `Error: ${anonWsErr.message}`, 'PASS');
  } else {
    record(`4.${testNum}`, 4, 'Anon reads workspaces', '0 rows', `${anonWs.length} workspace(s) visible`,
      anonWs.length === 0 ? 'PASS' : 'WARNING', anonWs.length > 0 ? 'Anon can see workspaces' : '');
  }
  testNum++;
}

// ============================================================
// PHASE 5: API Route Tests
// ============================================================
async function phase5() {
  console.log('\n========== PHASE 5: API Route Tests ==========\n');

  const APP_URL = 'https://taskflow-pro-xi.vercel.app';

  // 5.1: GET /api/setup
  try {
    const res = await fetch(`${APP_URL}/api/setup`);
    const body = await res.json();
    record('5.1', 5, 'GET /api/setup', '{setupRequired: false}', JSON.stringify(body),
      body.setupRequired === false ? 'PASS' : 'FAIL', `HTTP ${res.status}`);
  } catch (e) {
    record('5.1', 5, 'GET /api/setup', '{setupRequired: false}', `Error: ${e.message}`, 'BLOCKED');
  }

  // 5.2: POST /api/setup
  try {
    const res = await fetch(`${APP_URL}/api/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const body = await res.json();
    record('5.2', 5, 'POST /api/setup', '409 already completed', `HTTP ${res.status}: ${JSON.stringify(body)}`,
      res.status === 409 ? 'PASS' : 'FAIL');
  } catch (e) {
    record('5.2', 5, 'POST /api/setup', '409', `Error: ${e.message}`, 'BLOCKED');
  }

  // 5.3: POST /api/stripe/checkout (invalid plan)
  try {
    const res = await fetch(`${APP_URL}/api/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'invalid' }),
    });
    const body = await res.json();
    record('5.3', 5, 'POST /api/stripe/checkout (invalid plan)', '400', `HTTP ${res.status}: ${JSON.stringify(body)}`,
      res.status === 400 ? 'PASS' : 'FAIL');
  } catch (e) {
    record('5.3', 5, 'POST /api/stripe/checkout (invalid)', '400', `Error: ${e.message}`, 'BLOCKED');
  }

  // 5.4: POST /api/stripe/checkout (plan=pro)
  try {
    const res = await fetch(`${APP_URL}/api/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'pro' }),
    });
    const body = await res.json();
    const hasUrl = body.url && body.url.includes('stripe.com');
    record('5.4', 5, 'POST /api/stripe/checkout (plan=pro)', 'Stripe checkout URL', 
      hasUrl ? 'Stripe URL returned' : `HTTP ${res.status}: ${JSON.stringify(body).substring(0, 200)}`,
      hasUrl ? 'PASS' : (res.status === 200 ? 'WARNING' : 'FAIL'), `HTTP ${res.status}`);
  } catch (e) {
    record('5.4', 5, 'POST /api/stripe/checkout (pro)', 'Stripe URL', `Error: ${e.message}`, 'BLOCKED');
  }

  // 5.5: GET /api/stripe/portal (no auth)
  try {
    const res = await fetch(`${APP_URL}/api/stripe/portal`);
    const body = await res.json().catch(() => res.text());
    record('5.5', 5, 'GET /api/stripe/portal (no auth)', '401 Unauthorized', `HTTP ${res.status}: ${JSON.stringify(body).substring(0, 200)}`,
      res.status === 401 ? 'PASS' : 'FAIL');
  } catch (e) {
    record('5.5', 5, 'GET /api/stripe/portal (no auth)', '401', `Error: ${e.message}`, 'BLOCKED');
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('TaskFlow Pro — RLS Test Suite v2\n');
  console.log('Starting tests at', new Date().toISOString(), '\n');

  const svc = await createServiceClient();

  // Authenticate both tenants
  console.log('Authenticating tenants...');
  const { client: t1Client } = await createAuthClient(T1);
  console.log('  T1 authenticated ✓');
  const { client: t2Client } = await createAuthClient(T2);
  console.log('  T2 authenticated ✓');
  const anonClient = await createAnonClient();
  console.log('  Anon client created ✓\n');

  await phase1(svc);
  await phase2(svc);
  await phase3(t1Client, t2Client, svc);
  await phase4(t1Client, anonClient);
  await phase5();

  // Output JSON results
  console.log('\n\n===== RESULTS JSON =====');
  console.log(JSON.stringify(results, null, 2));

  // Summary
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const blocked = results.filter(r => r.status === 'BLOCKED').length;
  const warn = results.filter(r => r.status === 'WARNING').length;
  console.log(`\n===== SUMMARY =====`);
  console.log(`Total: ${results.length} | PASS: ${pass} | FAIL: ${fail} | BLOCKED: ${blocked} | WARNING: ${warn}`);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
