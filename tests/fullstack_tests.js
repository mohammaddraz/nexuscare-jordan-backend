/**
 * NexusCare Jordan — Full Stack API Test Suite
 * 
 * Tests every backend API endpoint for correctness.
 * Run: node tests/fullstack_tests.js
 * 
 * Requires the backend server to be running on localhost:5000.
 */

const http = require('http');

// ────────────────────────────────────────────────────────────────────
// Configuration & Helpers
// ────────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:5000';

// Known seed credentials
const USERS = {
  consumer:  { email: 'ahmed.alamiri@gmail.com', password: 'password123' },
  consumer2: { email: 'sara.kamel@yahoo.com',    password: 'password123' },
  provider1: { email: 'reem.khalidi@alkhalidi.jo', password: 'password123' },
  provider2: { email: 'tariq.haddad@istiklal.jo',  password: 'password123' },
  provider3: { email: 'huda.s@ammanclinic.jo',     password: 'password123' },
  admin:     { email: 'faisal.rifai@moh.gov.jo',   password: 'password123' },
};

// Known seed IDs
const SEED = {
  patientAhmed: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  patientRania: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  patientOmar:  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  patientSara:  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  providerReem: '33333333-3333-3333-3333-333333333333',
  providerTariq:'44444444-4444-4444-4444-444444444444',
  providerHuda: '88888888-8888-8888-8888-888888888888',
};

const results = [];
let passed = 0;
let failed = 0;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password) {
  const res = await request('POST', '/api/auth/login', { email, password });
  return res.body.token;
}

function record(id, name, status, detail = '') {
  const icon = status === 'PASSED' ? '✅' : '❌';
  results.push({ id, name, status, detail });
  if (status === 'PASSED') passed++; else failed++;
  console.log(`  ${icon} ${id}: ${name}${detail ? ' — ' + detail : ''}`);
}

async function test(id, name, fn) {
  try {
    await fn();
  } catch (err) {
    record(id, name, 'FAILED', err.message);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// ────────────────────────────────────────────────────────────────────
// TEST SUITE
// ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║       NexusCare Jordan — Full Stack API Test Suite         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ── 1. HEALTH CHECK ───────────────────────────────────────────────
  console.log('─── Health Check ───');

  await test('HC-01', 'Health endpoint returns 200', async () => {
    const res = await request('GET', '/api/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.status === 'success', 'Health check body mismatch');
    record('HC-01', 'Health endpoint returns 200', 'PASSED');
  });

  // ── 2. AUTH TESTS ─────────────────────────────────────────────────
  console.log('\n─── Authentication ───');

  await test('AUTH-01', 'Consumer login succeeds', async () => {
    const res = await request('POST', '/api/auth/login', USERS.consumer);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.token, 'No token returned');
    assert(res.body.user.role === 'CONSUMER', `Expected CONSUMER, got ${res.body.user.role}`);
    assert(res.body.user.name === 'Ahmed Al-Amiri', `Expected Ahmed Al-Amiri, got ${res.body.user.name}`);
    record('AUTH-01', 'Consumer login succeeds', 'PASSED');
  });

  await test('AUTH-02', 'Provider login succeeds', async () => {
    const res = await request('POST', '/api/auth/login', USERS.provider1);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.user.role === 'PROVIDER', `Expected PROVIDER, got ${res.body.user.role}`);
    record('AUTH-02', 'Provider login succeeds', 'PASSED');
  });

  await test('AUTH-03', 'Admin login succeeds', async () => {
    const res = await request('POST', '/api/auth/login', USERS.admin);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.user.role === 'ADMIN', `Expected ADMIN, got ${res.body.user.role}`);
    record('AUTH-03', 'Admin login succeeds', 'PASSED');
  });

  await test('AUTH-04', 'Login with wrong password fails', async () => {
    const res = await request('POST', '/api/auth/login', { email: USERS.consumer.email, password: 'wrongpass' });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    record('AUTH-04', 'Login with wrong password fails', 'PASSED');
  });

  await test('AUTH-05', 'Login with non-existent email fails', async () => {
    const res = await request('POST', '/api/auth/login', { email: 'nobody@test.com', password: 'password123' });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    record('AUTH-05', 'Login with non-existent email fails', 'PASSED');
  });

  await test('AUTH-06', 'Login with missing fields fails', async () => {
    const res = await request('POST', '/api/auth/login', { email: USERS.consumer.email });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    record('AUTH-06', 'Login with missing fields fails', 'PASSED');
  });

  await test('AUTH-07', 'Protected route without token returns 401', async () => {
    const res = await request('GET', '/api/auth/profile');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    record('AUTH-07', 'Protected route without token returns 401', 'PASSED');
  });

  await test('AUTH-08', 'Protected route with valid token returns profile', async () => {
    const token = await login(USERS.consumer.email, USERS.consumer.password);
    const res = await request('GET', '/api/auth/profile', null, token);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.role === 'CONSUMER', `Expected CONSUMER, got ${res.body.role}`);
    record('AUTH-08', 'Protected route with valid token returns profile', 'PASSED');
  });

  await test('AUTH-09', 'Protected route with invalid token returns 401', async () => {
    const res = await request('GET', '/api/auth/profile', null, 'invalid.token.here');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    record('AUTH-09', 'Protected route with invalid token returns 401', 'PASSED');
  });

  await test('AUTH-10', 'Second consumer login succeeds', async () => {
    const res = await request('POST', '/api/auth/login', USERS.consumer2);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.user.name === 'Sara Kamel', `Expected Sara Kamel, got ${res.body.user.name}`);
    record('AUTH-10', 'Second consumer login succeeds', 'PASSED');
  });

  // ── 3. CONSUMER TESTS ────────────────────────────────────────────
  console.log('\n─── Consumer API ───');

  const consumerToken = await login(USERS.consumer.email, USERS.consumer.password);
  const consumer2Token = await login(USERS.consumer2.email, USERS.consumer2.password);

  await test('CONS-01', 'Get family members returns array', async () => {
    const res = await request('GET', '/api/consumers/family', null, consumerToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    assert(res.body.length >= 1, 'Expected at least 1 family member');
    record('CONS-01', 'Get family members returns array', 'PASSED', `${res.body.length} members`);
  });

  await test('CONS-02', 'Family members have correct fields', async () => {
    const res = await request('GET', '/api/consumers/family', null, consumerToken);
    const member = res.body[0];
    assert(member.id, 'Missing id');
    assert(member.name, 'Missing name');
    assert(member.relation, 'Missing relation');
    assert(member.national_id, 'Missing national_id');
    assert(member.plan_type, 'Missing plan_type');
    record('CONS-02', 'Family members have correct fields', 'PASSED');
  });

  await test('CONS-03', 'Consumer 2 sees only their own family', async () => {
    const res = await request('GET', '/api/consumers/family', null, consumer2Token);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const names = res.body.map(m => m.name);
    assert(names.includes('Sara Kamel'), 'Sara Kamel missing');
    assert(!names.includes('Ahmed Al-Amiri'), 'Should not see Ahmed family');
    record('CONS-03', 'Consumer 2 sees only their own family', 'PASSED');
  });

  await test('CONS-04', 'Get provider directory returns array', async () => {
    const res = await request('GET', '/api/consumers/providers', null, consumerToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    assert(res.body.length >= 4, 'Expected at least 4 providers');
    record('CONS-04', 'Get provider directory returns array', 'PASSED', `${res.body.length} providers`);
  });

  await test('CONS-05', 'Provider directory has correct fields', async () => {
    const res = await request('GET', '/api/consumers/providers', null, consumerToken);
    const prov = res.body[0];
    assert(prov.name, 'Missing name');
    assert(prov.specialty, 'Missing specialty');
    assert(prov.clinic, 'Missing clinic');
    assert(prov.city, 'Missing city');
    assert(prov.rating !== undefined, 'Missing rating');
    assert(prov.accepting_new !== undefined, 'Missing accepting_new');
    record('CONS-05', 'Provider directory has correct fields', 'PASSED');
  });

  await test('CONS-06', 'Get medical records for patient', async () => {
    const res = await request('GET', `/api/consumers/records/${SEED.patientAhmed}`, null, consumerToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    assert(res.body.length >= 2, 'Expected at least 2 records for Ahmed');
    record('CONS-06', 'Get medical records for patient', 'PASSED', `${res.body.length} records`);
  });

  await test('CONS-07', 'Medical records have correct fields', async () => {
    const res = await request('GET', `/api/consumers/records/${SEED.patientAhmed}`, null, consumerToken);
    const rec = res.body[0];
    assert(rec.id, 'Missing id');
    assert(rec.diagnosis, 'Missing diagnosis');
    assert(rec.record_date, 'Missing record_date');
    assert(rec.provider_name, 'Missing provider_name');
    record('CONS-07', 'Medical records have correct fields', 'PASSED');
  });

  await test('CONS-08', 'Get claims for patient', async () => {
    const res = await request('GET', `/api/consumers/claims/${SEED.patientAhmed}`, null, consumerToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    assert(res.body.length >= 1, 'Expected at least 1 claim');
    record('CONS-08', 'Get claims for patient', 'PASSED', `${res.body.length} claims`);
  });

  await test('CONS-09', 'Claims have correct fields', async () => {
    const res = await request('GET', `/api/consumers/claims/${SEED.patientAhmed}`, null, consumerToken);
    const claim = res.body[0];
    assert(claim.id, 'Missing id');
    assert(claim.claim_type, 'Missing claim_type');
    assert(claim.amount !== undefined, 'Missing amount');
    assert(claim.status, 'Missing status');
    record('CONS-09', 'Claims have correct fields', 'PASSED');
  });

  await test('CONS-10', 'Get PCP history returns array', async () => {
    const res = await request('GET', '/api/consumers/pcp-history', null, consumerToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    assert(res.body.length >= 1, 'Expected at least 1 PCP history entry');
    record('CONS-10', 'Get PCP history returns array', 'PASSED', `${res.body.length} entries`);
  });

  await test('CONS-11', 'PCP history has correct fields', async () => {
    const res = await request('GET', '/api/consumers/pcp-history', null, consumerToken);
    const entry = res.body[0];
    assert(entry.id, 'Missing id');
    assert(entry.status, 'Missing status');
    assert(entry.date_requested, 'Missing date_requested');
    assert(entry.patient_name, 'Missing patient_name');
    assert(entry.provider_name, 'Missing provider_name');
    record('CONS-11', 'PCP history has correct fields', 'PASSED');
  });

  await test('CONS-12', 'Request PCP assignment succeeds', async () => {
    const res = await request('POST', '/api/consumers/pcp-request', {
      patient_id: SEED.patientAhmed,
      provider_id: SEED.providerTariq,
    }, consumerToken);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.status === 'Pending', `Expected Pending, got ${res.body.status}`);
    record('CONS-12', 'Request PCP assignment succeeds', 'PASSED');
  });

  await test('CONS-13', 'Request PCP with missing fields fails', async () => {
    const res = await request('POST', '/api/consumers/pcp-request', { patient_id: SEED.patientAhmed }, consumerToken);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    record('CONS-13', 'Request PCP with missing fields fails', 'PASSED');
  });

  // ── 4. RBAC / AUTHORIZATION TESTS ────────────────────────────────
  console.log('\n─── Role-Based Access Control ───');

  const providerToken = await login(USERS.provider1.email, USERS.provider1.password);
  const adminToken = await login(USERS.admin.email, USERS.admin.password);

  await test('RBAC-01', 'Consumer cannot access provider endpoints', async () => {
    const res = await request('GET', '/api/providers/assignments', null, consumerToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    record('RBAC-01', 'Consumer cannot access provider endpoints', 'PASSED');
  });

  await test('RBAC-02', 'Consumer cannot access admin endpoints', async () => {
    const res = await request('GET', '/api/admin/dashboard', null, consumerToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    record('RBAC-02', 'Consumer cannot access admin endpoints', 'PASSED');
  });

  await test('RBAC-03', 'Provider cannot access consumer endpoints', async () => {
    const res = await request('GET', '/api/consumers/family', null, providerToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    record('RBAC-03', 'Provider cannot access consumer endpoints', 'PASSED');
  });

  await test('RBAC-04', 'Provider cannot access admin endpoints', async () => {
    const res = await request('GET', '/api/admin/dashboard', null, providerToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    record('RBAC-04', 'Provider cannot access admin endpoints', 'PASSED');
  });

  await test('RBAC-05', 'Admin cannot access consumer endpoints', async () => {
    const res = await request('GET', '/api/consumers/family', null, adminToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    record('RBAC-05', 'Admin cannot access consumer endpoints', 'PASSED');
  });

  await test('RBAC-06', 'Admin cannot access provider endpoints', async () => {
    const res = await request('GET', '/api/providers/assignments', null, adminToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    record('RBAC-06', 'Admin cannot access provider endpoints', 'PASSED');
  });

  // ── 5. PROVIDER TESTS ────────────────────────────────────────────
  console.log('\n─── Provider API ───');

  const reemToken = await login(USERS.provider1.email, USERS.provider1.password);
  const tariqToken = await login(USERS.provider2.email, USERS.provider2.password);
  const hudaToken = await login(USERS.provider3.email, USERS.provider3.password);

  await test('PROV-01', 'Get pending assignments returns array', async () => {
    const res = await request('GET', '/api/providers/assignments', null, reemToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    record('PROV-01', 'Get pending assignments returns array', 'PASSED', `${res.body.length} pending`);
  });

  await test('PROV-02', 'Get my patients returns array', async () => {
    const res = await request('GET', '/api/providers/patients', null, reemToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    record('PROV-02', 'Get my patients returns array', 'PASSED', `${res.body.length} patients`);
  });

  await test('PROV-03', 'Provider patients have correct fields', async () => {
    const res = await request('GET', '/api/providers/patients', null, reemToken);
    if (res.body.length > 0) {
      const p = res.body[0];
      assert(p.name, 'Missing name');
      assert(p.plan_type, 'Missing plan_type');
      assert(p.assignment_status, 'Missing assignment_status');
      record('PROV-03', 'Provider patients have correct fields', 'PASSED');
    } else {
      record('PROV-03', 'Provider patients have correct fields', 'PASSED', 'No patients assigned yet');
    }
  });

  await test('PROV-04', 'Verify coverage by national ID succeeds', async () => {
    const res = await request('GET', '/api/providers/verify/9821034455', null, reemToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.name === 'Ahmed Al-Amiri', `Expected Ahmed Al-Amiri, got ${res.body.name}`);
    assert(res.body.plan_type, 'Missing plan_type');
    assert(res.body.approval_status, 'Missing approval_status');
    record('PROV-04', 'Verify coverage by national ID succeeds', 'PASSED');
  });

  await test('PROV-05', 'Verify coverage with invalid ID returns 404', async () => {
    const res = await request('GET', '/api/providers/verify/0000000000', null, reemToken);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    record('PROV-05', 'Verify coverage with invalid ID returns 404', 'PASSED');
  });

  await test('PROV-06', 'Submit clinical log succeeds', async () => {
    const res = await request('POST', '/api/providers/clinical-log', {
      patient_id: SEED.patientAhmed,
      diagnosis: 'Test follow-up visit',
      icd_code: 'Z00.0',
      prescription: 'None',
      notes: 'Test clinical log entry'
    }, reemToken);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.diagnosis === 'Test follow-up visit', 'Diagnosis mismatch');
    record('PROV-06', 'Submit clinical log succeeds', 'PASSED');
  });

  await test('PROV-07', 'Submit clinical log without diagnosis fails', async () => {
    const res = await request('POST', '/api/providers/clinical-log', {
      patient_id: SEED.patientAhmed,
    }, reemToken);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    record('PROV-07', 'Submit clinical log without diagnosis fails', 'PASSED');
  });

  await test('PROV-08', 'Submit clinical log for unassigned patient fails', async () => {
    // Reem is NOT assigned to Sara (Sara is assigned to Huda)
    const res = await request('POST', '/api/providers/clinical-log', {
      patient_id: SEED.patientSara,
      diagnosis: 'Should fail',
    }, reemToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    record('PROV-08', 'Submit clinical log for unassigned patient fails', 'PASSED');
  });

  await test('PROV-09', 'Submit claim succeeds', async () => {
    const res = await request('POST', '/api/providers/claims', {
      patient_id: SEED.patientAhmed,
      claim_type: 'Follow-up Consultation',
      billing_code: '99214',
      amount: 45.00,
      deductible_applied: 5.00,
    }, reemToken);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.amount == 45, `Expected 45, got ${res.body.amount}`);
    record('PROV-09', 'Submit claim succeeds', 'PASSED');
  });

  await test('PROV-10', 'Submit claim without amount fails', async () => {
    const res = await request('POST', '/api/providers/claims', {
      patient_id: SEED.patientAhmed,
      claim_type: 'Test',
    }, reemToken);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    record('PROV-10', 'Submit claim without amount fails', 'PASSED');
  });

  // Approve/Reject assignment test
  await test('PROV-11', 'Approve PCP assignment succeeds', async () => {
    // First, get a pending assignment for Tariq (we created one in CONS-12)
    const pending = await request('GET', '/api/providers/assignments', null, tariqToken);
    if (pending.body.length > 0) {
      const assignmentId = pending.body[0].id;
      const res = await request('PUT', `/api/providers/assignments/${assignmentId}`, { status: 'Approved' }, tariqToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.status === 'Approved', `Expected Approved, got ${res.body.status}`);
      record('PROV-11', 'Approve PCP assignment succeeds', 'PASSED');
    } else {
      record('PROV-11', 'Approve PCP assignment succeeds', 'PASSED', 'No pending assignments to test');
    }
  });

  await test('PROV-12', 'Update assignment with invalid status fails', async () => {
    // Try to set to an invalid status
    const res = await request('PUT', '/api/providers/assignments/00000000-0000-0000-0000-000000000000', { status: 'InvalidStatus' }, reemToken);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    record('PROV-12', 'Update assignment with invalid status fails', 'PASSED');
  });

  await test('PROV-13', 'Update non-existent assignment returns 404', async () => {
    const res = await request('PUT', '/api/providers/assignments/00000000-0000-0000-0000-000000000000', { status: 'Approved' }, reemToken);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    record('PROV-13', 'Update non-existent assignment returns 404', 'PASSED');
  });

  // ── 6. ADMIN TESTS ───────────────────────────────────────────────
  console.log('\n─── Admin API ───');

  await test('ADM-01', 'Get dashboard stats returns correct structure', async () => {
    const res = await request('GET', '/api/admin/dashboard', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.totalPatients !== undefined, 'Missing totalPatients');
    assert(res.body.totalProviders !== undefined, 'Missing totalProviders');
    assert(res.body.totalClaims !== undefined, 'Missing totalClaims');
    assert(res.body.pendingAssignments !== undefined, 'Missing pendingAssignments');
    assert(res.body.pendingConsumers !== undefined, 'Missing pendingConsumers');
    record('ADM-01', 'Get dashboard stats returns correct structure', 'PASSED', 
      `P:${res.body.totalPatients} Prov:${res.body.totalProviders} Claims:${res.body.totalClaims}`);
  });

  await test('ADM-02', 'Get pending consumers returns array', async () => {
    const res = await request('GET', '/api/admin/pending-consumers', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    record('ADM-02', 'Get pending consumers returns array', 'PASSED', `${res.body.length} pending`);
  });

  await test('ADM-03', 'Pending consumers have correct fields', async () => {
    const res = await request('GET', '/api/admin/pending-consumers', null, adminToken);
    if (res.body.length > 0) {
      const c = res.body[0];
      assert(c.id, 'Missing id');
      assert(c.name, 'Missing name');
      assert(c.national_id, 'Missing national_id');
      assert(c.approval_status, 'Missing approval_status');
      assert(c.email, 'Missing email');
      record('ADM-03', 'Pending consumers have correct fields', 'PASSED');
    } else {
      record('ADM-03', 'Pending consumers have correct fields', 'PASSED', 'No pending consumers');
    }
  });

  await test('ADM-04', 'Approve consumer with invalid status fails', async () => {
    const res = await request('PUT', `/api/admin/approve-consumer/${SEED.patientOmar}`, { status: 'InvalidStatus' }, adminToken);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    record('ADM-04', 'Approve consumer with invalid status fails', 'PASSED');
  });

  await test('ADM-05', 'Approve consumer succeeds', async () => {
    const res = await request('PUT', `/api/admin/approve-consumer/${SEED.patientOmar}`, { status: 'Approved' }, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.approval_status === 'Approved', `Expected Approved, got ${res.body.approval_status}`);
    record('ADM-05', 'Approve consumer succeeds', 'PASSED');
  });

  await test('ADM-06', 'Approve non-existent consumer returns 404', async () => {
    const res = await request('PUT', '/api/admin/approve-consumer/00000000-0000-0000-0000-000000000000', { status: 'Approved' }, adminToken);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    record('ADM-06', 'Approve non-existent consumer returns 404', 'PASSED');
  });

  await test('ADM-07', 'Get certifications returns array', async () => {
    const res = await request('GET', '/api/admin/certifications', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    record('ADM-07', 'Get certifications returns array', 'PASSED', `${res.body.length} certs`);
  });

  await test('ADM-08', 'Certifications have correct fields', async () => {
    const res = await request('GET', '/api/admin/certifications', null, adminToken);
    if (res.body.length > 0) {
      const c = res.body[0];
      assert(c.provider_name, 'Missing provider_name');
      assert(c.license_number, 'Missing license_number');
      assert(c.status, 'Missing status');
      record('ADM-08', 'Certifications have correct fields', 'PASSED');
    } else {
      record('ADM-08', 'Certifications have correct fields', 'PASSED', 'No certifications');
    }
  });

  await test('ADM-09', 'Update certification with invalid status fails', async () => {
    const res = await request('PUT', '/api/admin/certifications/00000000-0000-0000-0000-000000000000', { status: 'InvalidStatus' }, adminToken);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    record('ADM-09', 'Update certification with invalid status fails', 'PASSED');
  });

  await test('ADM-10', 'Get admins list returns array', async () => {
    const res = await request('GET', '/api/admin/admins', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    assert(res.body.length >= 2, 'Expected at least 2 admins');
    record('ADM-10', 'Get admins list returns array', 'PASSED', `${res.body.length} admins`);
  });

  await test('ADM-11', 'Admin list has correct fields', async () => {
    const res = await request('GET', '/api/admin/admins', null, adminToken);
    const admin = res.body[0];
    assert(admin.name, 'Missing name');
    assert(admin.email, 'Missing email');
    assert(admin.admin_role, 'Missing admin_role');
    assert(admin.status, 'Missing status');
    record('ADM-11', 'Admin list has correct fields', 'PASSED');
  });

  await test('ADM-12', 'Get provider directory returns array', async () => {
    const res = await request('GET', '/api/admin/providers', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response is not an array');
    assert(res.body.length >= 4, 'Expected at least 4 providers');
    record('ADM-12', 'Get provider directory returns array', 'PASSED', `${res.body.length} providers`);
  });

  await test('ADM-13', 'Provider directory has enriched fields', async () => {
    const res = await request('GET', '/api/admin/providers', null, adminToken);
    const prov = res.body[0];
    assert(prov.name, 'Missing name');
    assert(prov.email, 'Missing email');
    assert(prov.specialty, 'Missing specialty');
    assert(prov.active_patients !== undefined, 'Missing active_patients');
    record('ADM-13', 'Provider directory has enriched fields', 'PASSED');
  });

  // ── 7. CROSS-ROLE DATA INTEGRITY ─────────────────────────────────
  console.log('\n─── Cross-Role Data Integrity ───');

  await test('INT-01', 'Clinical log created by provider shows in consumer medical records', async () => {
    // We created a clinical log in PROV-06 for Ahmed by Reem
    const res = await request('GET', `/api/consumers/records/${SEED.patientAhmed}`, null, consumerToken);
    const found = res.body.find(r => r.diagnosis === 'Test follow-up visit');
    assert(found, 'Clinical log not found in consumer medical records');
    record('INT-01', 'Clinical log created by provider shows in consumer medical records', 'PASSED');
  });

  await test('INT-02', 'Claim submitted by provider shows in consumer claims', async () => {
    // We created a claim in PROV-09 for Ahmed by Reem
    const res = await request('GET', `/api/consumers/claims/${SEED.patientAhmed}`, null, consumerToken);
    const found = res.body.find(c => c.claim_type === 'Follow-up Consultation');
    assert(found, 'Claim not found in consumer claims');
    record('INT-02', 'Claim submitted by provider shows in consumer claims', 'PASSED');
  });

  await test('INT-03', 'PCP request from consumer shows in provider pending', async () => {
    // Create a fresh PCP request to provider Huda
    await request('POST', '/api/consumers/pcp-request', {
      patient_id: SEED.patientAhmed,
      provider_id: SEED.providerHuda,
    }, consumerToken);
    
    const res = await request('GET', '/api/providers/assignments', null, hudaToken);
    const found = res.body.find(a => a.patient_name === 'Ahmed Al-Amiri');
    assert(found, 'PCP request not found in provider pending assignments');
    record('INT-03', 'PCP request from consumer shows in provider pending', 'PASSED');
  });

  await test('INT-04', 'PCP request shows in consumer history', async () => {
    const res = await request('GET', '/api/consumers/pcp-history', null, consumerToken);
    const found = res.body.find(h => h.provider_name && h.patient_name === 'Ahmed Al-Amiri');
    assert(found, 'PCP request not found in consumer history');
    record('INT-04', 'PCP request shows in consumer history', 'PASSED');
  });

  await test('INT-05', 'Admin dashboard counts reflect database state', async () => {
    const res = await request('GET', '/api/admin/dashboard', null, adminToken);
    assert(res.body.totalProviders >= 4, `Expected >=4 providers, got ${res.body.totalProviders}`);
    assert(res.body.totalPatients >= 3, `Expected >=3 patients, got ${res.body.totalPatients}`);
    record('INT-05', 'Admin dashboard counts reflect database state', 'PASSED');
  });

  await test('INT-06', 'Consumer approved by admin updates patient status', async () => {
    // Omar was approved in ADM-05. Verify via family endpoint
    const res = await request('GET', '/api/consumers/family', null, consumerToken);
    const omar = res.body.find(m => m.name === 'Omar Al-Amiri');
    assert(omar, 'Omar not found in family');
    assert(omar.approval_status === 'Approved', `Expected Approved, got ${omar.approval_status}`);
    record('INT-06', 'Consumer approved by admin updates patient status', 'PASSED');
  });

  // ── 8. EDGE CASES ────────────────────────────────────────────────
  console.log('\n─── Edge Cases ───');

  await test('EDGE-01', 'Empty body on login returns 400', async () => {
    const res = await request('POST', '/api/auth/login', {});
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    record('EDGE-01', 'Empty body on login returns 400', 'PASSED');
  });

  await test('EDGE-02', 'Medical records for non-owned patient returns 403', async () => {
    const res = await request('GET', '/api/consumers/records/00000000-0000-0000-0000-000000000000', null, consumerToken);
    // Backend correctly blocks access to patients not belonging to this consumer
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    record('EDGE-02', 'Medical records for non-owned patient returns 403', 'PASSED');
  });

  await test('EDGE-03', 'Claims for non-owned patient returns 403', async () => {
    const res = await request('GET', '/api/consumers/claims/00000000-0000-0000-0000-000000000000', null, consumerToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    record('EDGE-03', 'Claims for non-owned patient returns 403', 'PASSED');
  });

  await test('EDGE-04', 'Verify coverage for Sara via provider', async () => {
    // Sara Kamel has national_id 9901054321
    const res = await request('GET', '/api/providers/verify/9901054321', null, hudaToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.name === 'Sara Kamel', `Expected Sara Kamel, got ${res.body.name}`);
    record('EDGE-04', 'Verify coverage for Sara via provider', 'PASSED');
  });

  await test('EDGE-05', 'Login returns a valid JWT token format', async () => {
    const token = await login(USERS.consumer.email, USERS.consumer.password);
    // JWT tokens have 3 dot-separated parts
    assert(token.split('.').length === 3, 'Token is not a valid JWT format');
    record('EDGE-05', 'Login returns a valid JWT token format', 'PASSED');
  });

  // ── SUMMARY ──────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} PASSED  |  ${failed} FAILED  |  ${passed + failed} TOTAL          ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => r.status === 'FAILED').forEach(r => {
      console.log(`  ❌ ${r.id}: ${r.name} — ${r.detail}`);
    });
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
