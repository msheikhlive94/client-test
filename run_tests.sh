#!/bin/bash
# TaskFlow Pro - Full Multi-Tenant Isolation Test Suite

SUPABASE_URL="https://bylvbbadzzznjdrymiyg.supabase.co"
ANON_KEY="sb_publishable_gJQ-XaYwsWccrTxWBrQ6nA_nQAf0XDU"
SERVICE_KEY="sb_secret_pzLPZoGIpwRiKmlp7tN1iA_FlpjPdbn"
APP_URL="https://taskflow-pro-xi.vercel.app"

WS1="8b8c553d-73eb-4140-9b4f-d74abfc44402"
WS2="71250406-2b6c-4185-9a32-463536432cb2"
USER1_AUTH="f6ebcd63-1091-472d-a238-6f6e50622309"
USER2_AUTH="87dd7a20-5ee2-4b46-a7ff-cb5441f7a83d"

# Authenticate
TOKEN1=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"mcp+first-tenant@z-flow.de\",\"password\":\"Mike123\"}" | jq -r '.access_token')

TOKEN2=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"mcp+second-tenant@z-flow.de\",\"password\":\"Mike123\"}" | jq -r '.access_token')

if [ "$TOKEN1" = "null" ] || [ -z "$TOKEN1" ]; then echo "FATAL: Cannot authenticate User 1"; exit 1; fi
if [ "$TOKEN2" = "null" ] || [ -z "$TOKEN2" ]; then echo "FATAL: Cannot authenticate User 2"; exit 1; fi

echo "=== AUTH OK ==="

# Helper: query as user
query_as() {
  local token="$1"
  local endpoint="$2"
  curl -s "$SUPABASE_URL/rest/v1/$endpoint" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation"
}

# Helper: query with service key
query_service() {
  local endpoint="$1"
  curl -s "$SUPABASE_URL/rest/v1/$endpoint" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation"
}

# Helper: POST as user
post_as() {
  local token="$1"
  local endpoint="$2"
  local data="$3"
  curl -s -X POST "$SUPABASE_URL/rest/v1/$endpoint" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data"
}

# Helper: PATCH as user
patch_as() {
  local token="$1"
  local endpoint="$2"
  local data="$3"
  curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH "$SUPABASE_URL/rest/v1/$endpoint" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data"
}

# Helper: DELETE as user
delete_as() {
  local token="$1"
  local endpoint="$2"
  curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "$SUPABASE_URL/rest/v1/$endpoint" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation"
}

# Helper: query anonymous
query_anon() {
  local endpoint="$1"
  curl -s "$SUPABASE_URL/rest/v1/$endpoint" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json"
}

# Helper: POST anonymous
post_anon() {
  local endpoint="$1"
  local data="$2"
  curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$SUPABASE_URL/rest/v1/$endpoint" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data"
}

TABLES="projects clients tasks notes time_entries leads intake_links admin_users"

echo ""
echo "========================================"
echo "TEST GROUP 1: Tenant 1 reads own data"
echo "========================================"
for table in $TABLES; do
  result=$(query_as "$TOKEN1" "$table?select=*")
  count=$(echo "$result" | jq 'if type == "array" then length else -1 end')
  # Check all records belong to WS1
  if [ "$count" -gt 0 ]; then
    wrong=$(echo "$result" | jq "[.[] | select(.workspace_id != \"$WS1\")] | length")
    echo "G1 | $table | rows=$count | wrong_ws=$wrong"
  else
    echo "G1 | $table | rows=$count"
  fi
done

echo ""
echo "========================================"
echo "TEST GROUP 2: Tenant 2 reads own data"
echo "========================================"
for table in $TABLES; do
  result=$(query_as "$TOKEN2" "$table?select=*")
  count=$(echo "$result" | jq 'if type == "array" then length else -1 end')
  if [ "$count" -gt 0 ]; then
    wrong=$(echo "$result" | jq "[.[] | select(.workspace_id != \"$WS2\")] | length")
    echo "G2 | $table | rows=$count | wrong_ws=$wrong"
  else
    echo "G2 | $table | rows=$count"
  fi
done

echo ""
echo "========================================"
echo "TEST GROUP 3: Cross-tenant READ isolation"
echo "========================================"
# First get some record IDs from each workspace using service key
for table in projects clients tasks notes time_entries leads intake_links; do
  # Get a WS1 record ID
  ws1_id=$(query_service "$table?workspace_id=eq.$WS1&limit=1&select=id" | jq -r '.[0].id // "none"')
  # Get a WS2 record ID
  ws2_id=$(query_service "$table?workspace_id=eq.$WS2&limit=1&select=id" | jq -r '.[0].id // "none"')
  
  # User 1 tries to read WS2 record
  if [ "$ws2_id" != "none" ]; then
    result=$(query_as "$TOKEN1" "$table?id=eq.$ws2_id&select=id")
    count=$(echo "$result" | jq 'if type == "array" then length else -1 end')
    echo "G3 | U1->WS2 | $table | id=$ws2_id | rows=$count (expect 0)"
  else
    echo "G3 | U1->WS2 | $table | NO WS2 RECORD"
  fi
  
  # User 2 tries to read WS1 record
  if [ "$ws1_id" != "none" ]; then
    result=$(query_as "$TOKEN2" "$table?id=eq.$ws1_id&select=id")
    count=$(echo "$result" | jq 'if type == "array" then length else -1 end')
    echo "G3 | U2->WS1 | $table | id=$ws1_id | rows=$count (expect 0)"
  else
    echo "G3 | U2->WS1 | $table | NO WS1 RECORD"
  fi
done

echo ""
echo "========================================"
echo "TEST GROUP 4: Cross-tenant WRITE isolation"
echo "========================================"

# Get record IDs from WS2 for User 1 to try to attack
for table in projects clients tasks notes time_entries leads intake_links; do
  ws2_id=$(query_service "$table?workspace_id=eq.$WS2&limit=1&select=id" | jq -r '.[0].id // "none"')
  
  # INSERT with WS2 workspace_id
  case $table in
    projects)
      insert_data="{\"workspace_id\":\"$WS2\",\"name\":\"ATTACK\",\"status\":\"active\"}"
      ;;
    clients)
      insert_data="{\"workspace_id\":\"$WS2\",\"name\":\"ATTACK\"}"
      ;;
    tasks)
      # Need a project_id from WS2
      ws2_proj=$(query_service "projects?workspace_id=eq.$WS2&limit=1&select=id" | jq -r '.[0].id // "none"')
      insert_data="{\"workspace_id\":\"$WS2\",\"title\":\"ATTACK\",\"project_id\":\"$ws2_proj\"}"
      ;;
    notes)
      ws2_proj=$(query_service "projects?workspace_id=eq.$WS2&limit=1&select=id" | jq -r '.[0].id // "none"')
      insert_data="{\"workspace_id\":\"$WS2\",\"content\":\"ATTACK\",\"project_id\":\"$ws2_proj\"}"
      ;;
    time_entries)
      ws2_task=$(query_service "tasks?workspace_id=eq.$WS2&limit=1&select=id" | jq -r '.[0].id // "none"')
      insert_data="{\"workspace_id\":\"$WS2\",\"task_id\":\"$ws2_task\",\"duration_minutes\":60,\"date\":\"2026-01-01\"}"
      ;;
    leads)
      ws2_link=$(query_service "intake_links?workspace_id=eq.$WS2&limit=1&select=id" | jq -r '.[0].id // "none"')
      insert_data="{\"workspace_id\":\"$WS2\",\"name\":\"ATTACK\",\"email\":\"attack@test.com\",\"intake_link_id\":\"$ws2_link\"}"
      ;;
    intake_links)
      insert_data="{\"workspace_id\":\"$WS2\",\"slug\":\"attack-link\",\"is_active\":true}"
      ;;
  esac
  
  insert_result=$(post_as "$TOKEN1" "$table" "$insert_data")
  insert_err=$(echo "$insert_result" | jq -r '.code // .message // "inserted"')
  echo "G4 | INSERT | $table -> WS2 | result: $insert_err"
  
  # UPDATE WS2 record
  if [ "$ws2_id" != "none" ]; then
    update_result=$(patch_as "$TOKEN1" "$table?id=eq.$ws2_id" "{\"updated_at\":\"2026-01-01T00:00:00Z\"}")
    update_body=$(echo "$update_result" | head -1)
    update_count=$(echo "$update_body" | jq 'if type == "array" then length else -1 end' 2>/dev/null || echo "-1")
    echo "G4 | UPDATE | $table | id=$ws2_id | affected=$update_count (expect 0)"
    
    # DELETE WS2 record
    delete_result=$(delete_as "$TOKEN1" "$table?id=eq.$ws2_id")
    delete_body=$(echo "$delete_result" | head -1)
    delete_count=$(echo "$delete_body" | jq 'if type == "array" then length else -1 end' 2>/dev/null || echo "-1")
    echo "G4 | DELETE | $table | id=$ws2_id | affected=$delete_count (expect 0)"
  fi
done

echo ""
echo "========================================"
echo "TEST GROUP 5: workspace_members isolation"
echo "========================================"
wm1=$(query_as "$TOKEN1" "workspace_members?select=*")
wm1_count=$(echo "$wm1" | jq 'if type == "array" then length else -1 end')
wm1_ws=$(echo "$wm1" | jq "[.[] | select(.workspace_id != \"$WS1\")] | length" 2>/dev/null || echo "err")
echo "G5 | User1 workspace_members | rows=$wm1_count | wrong_ws=$wm1_ws"
echo "G5 | User1 data: $(echo "$wm1" | jq -c '.[].workspace_id' 2>/dev/null)"

wm2=$(query_as "$TOKEN2" "workspace_members?select=*")
wm2_count=$(echo "$wm2" | jq 'if type == "array" then length else -1 end')
wm2_ws=$(echo "$wm2" | jq "[.[] | select(.workspace_id != \"$WS2\")] | length" 2>/dev/null || echo "err")
echo "G5 | User2 workspace_members | rows=$wm2_count | wrong_ws=$wm2_ws"
echo "G5 | User2 data: $(echo "$wm2" | jq -c '.[].workspace_id' 2>/dev/null)"

# Check for recursion errors
echo "G5 | Recursion check User1: $(echo "$wm1" | jq -r '.message // "no error"' 2>/dev/null)"
echo "G5 | Recursion check User2: $(echo "$wm2" | jq -r '.message // "no error"' 2>/dev/null)"

echo ""
echo "========================================"
echo "TEST GROUP 6: workspaces table"
echo "========================================"
ws_u1=$(query_as "$TOKEN1" "workspaces?select=id,slug")
ws_u1_count=$(echo "$ws_u1" | jq 'if type == "array" then length else -1 end')
echo "G6 | User1 workspaces | rows=$ws_u1_count | data=$(echo "$ws_u1" | jq -c '.' 2>/dev/null)"

ws_u2=$(query_as "$TOKEN2" "workspaces?select=id,slug")
ws_u2_count=$(echo "$ws_u2" | jq 'if type == "array" then length else -1 end')
echo "G6 | User2 workspaces | rows=$ws_u2_count | data=$(echo "$ws_u2" | jq -c '.' 2>/dev/null)"

echo ""
echo "========================================"
echo "TEST GROUP 7: users table"
echo "========================================"
users_u1=$(query_as "$TOKEN1" "users?select=id,email")
users_u1_count=$(echo "$users_u1" | jq 'if type == "array" then length else -1 end')
echo "G7 | User1 sees users | rows=$users_u1_count | data=$(echo "$users_u1" | jq -c '.' 2>/dev/null)"

users_u2=$(query_as "$TOKEN2" "users?select=id,email")
users_u2_count=$(echo "$users_u2" | jq 'if type == "array" then length else -1 end')
echo "G7 | User2 sees users | rows=$users_u2_count | data=$(echo "$users_u2" | jq -c '.' 2>/dev/null)"

# User 1 read User 2 by ID
u1_reads_u2=$(query_as "$TOKEN1" "users?id=eq.$USER2_AUTH&select=id,email")
u1_reads_u2_count=$(echo "$u1_reads_u2" | jq 'if type == "array" then length else -1 end')
echo "G7 | User1 reads User2 by ID | rows=$u1_reads_u2_count (expect 0)"

echo ""
echo "========================================"
echo "TEST GROUP 8: Anonymous access"
echo "========================================"
for table in projects clients tasks notes time_entries admin_users workspace_members workspaces users; do
  anon_result=$(query_anon "$table?select=id&limit=5")
  anon_count=$(echo "$anon_result" | jq 'if type == "array" then length else -1 end')
  anon_err=$(echo "$anon_result" | jq -r '.message // "none"' 2>/dev/null)
  echo "G8 | anon SELECT $table | rows=$anon_count | err=$anon_err"
done

# intake_links anonymous - should see active links
anon_intake=$(query_anon "intake_links?select=id,is_active")
anon_intake_count=$(echo "$anon_intake" | jq 'if type == "array" then length else -1 end')
anon_intake_active=$(echo "$anon_intake" | jq '[.[] | select(.is_active == true)] | length' 2>/dev/null)
echo "G8 | anon intake_links | total=$anon_intake_count | active=$anon_intake_active"

# leads INSERT anonymous
anon_lead_insert=$(post_anon "leads" "{\"name\":\"Anon Test\",\"email\":\"anon@test.com\",\"workspace_id\":\"$WS1\"}")
anon_lead_body=$(echo "$anon_lead_insert" | head -1)
anon_lead_status=$(echo "$anon_lead_insert" | grep "HTTP_STATUS" | sed 's/HTTP_STATUS://')
echo "G8 | anon INSERT leads | status=$anon_lead_status | body=$(echo "$anon_lead_body" | jq -c '.' 2>/dev/null)"

# client_invitations anonymous
anon_inv=$(query_anon "client_invitations?select=id,status")
anon_inv_count=$(echo "$anon_inv" | jq 'if type == "array" then length else -1 end')
echo "G8 | anon client_invitations | rows=$anon_inv_count"

echo ""
echo "========================================"
echo "TEST GROUP 9: API routes"
echo "========================================"
# GET /api/setup
setup_get=$(curl -s "$APP_URL/api/setup")
echo "G9 | GET /api/setup | $(echo "$setup_get" | jq -c '.' 2>/dev/null || echo "$setup_get")"

# POST /api/setup
setup_post=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$APP_URL/api/setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}')
setup_post_status=$(echo "$setup_post" | grep "HTTP_STATUS" | sed 's/HTTP_STATUS://')
setup_post_body=$(echo "$setup_post" | head -1)
echo "G9 | POST /api/setup | status=$setup_post_status | body=$(echo "$setup_post_body" | jq -c '.' 2>/dev/null || echo "$setup_post_body")"

# POST /api/stripe/checkout
stripe_checkout=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$APP_URL/api/stripe/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{"plan":"pro"}')
stripe_status=$(echo "$stripe_checkout" | grep "HTTP_STATUS" | sed 's/HTTP_STATUS://')
stripe_body=$(echo "$stripe_checkout" | head -1)
echo "G9 | POST /api/stripe/checkout | status=$stripe_status | body=$(echo "$stripe_body" | jq -c '.' 2>/dev/null | head -c 200)"

# GET /api/stripe/portal without auth
stripe_portal=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$APP_URL/api/stripe/portal")
portal_status=$(echo "$stripe_portal" | grep "HTTP_STATUS" | sed 's/HTTP_STATUS://')
portal_body=$(echo "$stripe_portal" | head -1)
echo "G9 | GET /api/stripe/portal (no auth) | status=$portal_status | body=$(echo "$portal_body" | jq -c '.' 2>/dev/null | head -c 200)"

echo ""
echo "========================================"
echo "TEST GROUP 10: Data count verification"
echo "========================================"
echo "--- Service key counts ---"
for table in projects clients tasks notes time_entries leads intake_links; do
  ws1_svc=$(query_service "$table?workspace_id=eq.$WS1&select=id" | jq 'length')
  ws2_svc=$(query_service "$table?workspace_id=eq.$WS2&select=id" | jq 'length')
  
  # User-visible counts
  u1_count=$(query_as "$TOKEN1" "$table?select=id" | jq 'if type == "array" then length else -1 end')
  u2_count=$(query_as "$TOKEN2" "$table?select=id" | jq 'if type == "array" then length else -1 end')
  
  echo "G10 | $table | WS1_svc=$ws1_svc WS1_user=$u1_count | WS2_svc=$ws2_svc WS2_user=$u2_count"
done

echo ""
echo "=== ALL TESTS COMPLETE ==="
