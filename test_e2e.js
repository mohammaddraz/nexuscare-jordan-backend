const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runAllTests() {
  const results = {};

  console.log('--- STARTING TESTS ---');

  // AUTH TESTS
  const adminLogin = await request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'faisal.rifai@moh.gov.jo', password: 'password123' });
  results['AUTH-01'] = adminLogin.status === 200 ? 'Successful' : 'Failed';
  const adminToken = adminLogin.data?.token;

  const provLogin = await request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'reem.khalidi@alkhalidi.jo', password: 'password123' });
  results['AUTH-02'] = provLogin.status === 200 ? 'Successful' : 'Failed';
  const provToken = provLogin.data?.token;

  const conLogin = await request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'ahmed.alamiri@gmail.com', password: 'password123' });
  results['AUTH-03'] = conLogin.status === 200 ? 'Successful' : 'Failed';
  const conToken = conLogin.data?.token;

  const badLogin = await request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'fake@email.com', password: 'password123' });
  results['AUTH-04'] = badLogin.status === 401 ? 'Successful' : 'Failed';

  const badPass = await request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'faisal.rifai@moh.gov.jo', password: 'wrong' });
  results['AUTH-05'] = badPass.status === 401 ? 'Successful' : 'Failed';

  const emptyLogin = await request({ hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: '', password: '' });
  results['AUTH-06'] = emptyLogin.status === 400 ? 'Successful' : 'Failed';

  const noTokenAccess = await request({ hostname: 'localhost', port: 5000, path: '/api/consumers/family', method: 'GET', headers: { } });
  results['AUTH-11'] = noTokenAccess.status === 401 ? 'Successful' : 'Failed';

  // CONSUMER
  const familyHub = await request({ hostname: 'localhost', port: 5000, path: '/api/consumers/family', method: 'GET', headers: { 'Authorization': 'Bearer ' + conToken } });
  results['CONS-01'] = familyHub.status === 200 ? 'Successful' : 'Failed';
  const primaryPatientId = familyHub.data[0].id;

  const getProviders = await request({ hostname: 'localhost', port: 5000, path: '/api/consumers/providers', method: 'GET', headers: { 'Authorization': 'Bearer ' + conToken } });
  results['CONS-03'] = getProviders.status === 200 ? 'Successful' : 'Failed';
  const providerId = getProviders.data[1].user_id; // Let's request Dr. Tariq Haddad (index 1) since Reem is already approved for Ahmed in seed

  // Check Provider protection
  const checkProvAuth = await request({ hostname: 'localhost', port: 5000, path: '/api/providers/assignments', method: 'GET', headers: { 'Authorization': 'Bearer ' + conToken } });
  results['AUTH-09'] = checkProvAuth.status === 403 ? 'Successful' : 'Failed';

  const pcpReq = await request({ hostname: 'localhost', port: 5000, path: '/api/consumers/pcp-request', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + conToken } }, { patient_id: primaryPatientId, provider_id: providerId });
  results['CONS-07'] = pcpReq.status === 201 ? 'Successful' : 'Failed';

  const getRecords = await request({ hostname: 'localhost', port: 5000, path: '/api/consumers/records', method: 'GET', headers: { 'Authorization': 'Bearer ' + conToken } });
  results['CONS-09'] = getRecords.status === 200 ? 'Successful' : 'Failed';

  const getClaims = await request({ hostname: 'localhost', port: 5000, path: '/api/consumers/claims', method: 'GET', headers: { 'Authorization': 'Bearer ' + conToken } });
  results['CONS-12'] = getClaims.status === 200 ? 'Successful' : 'Failed';

  // PROVIDER
  const provQueue = await request({ hostname: 'localhost', port: 5000, path: '/api/providers/assignments', method: 'GET', headers: { 'Authorization': 'Bearer ' + provToken } });
  results['PROV-01'] = provQueue.status === 200 ? 'Successful' : 'Failed';
  
  // Try Coverage Verification
  const verifyCov = await request({ hostname: 'localhost', port: 5000, path: '/api/providers/verify/9821034455', method: 'GET', headers: { 'Authorization': 'Bearer ' + provToken } });
  results['PROV-10'] = verifyCov.status === 200 ? 'Successful' : 'Failed';

  const verifyCovFail = await request({ hostname: 'localhost', port: 5000, path: '/api/providers/verify/1111111111', method: 'GET', headers: { 'Authorization': 'Bearer ' + provToken } });
  results['PROV-11'] = verifyCovFail.status === 404 ? 'Successful' : 'Failed';

  // Submit claim
  const submitClaim = await request({ hostname: 'localhost', port: 5000, path: '/api/providers/claims', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provToken } }, { patient_id: primaryPatientId, claim_type: 'Outpatient', billing_code: '99214', amount: 100.00 });
  results['PROV-08'] = submitClaim.status === 201 ? 'Successful' : 'Failed';

  // Submit Clinical Log
  const submitLog = await request({ hostname: 'localhost', port: 5000, path: '/api/providers/clinical-log', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + provToken } }, { patient_id: primaryPatientId, diagnosis: 'Test Diagnosis', icd_code: 'A00', notes: 'Test notes' });
  results['PROV-07'] = submitLog.status === 201 ? 'Successful' : 'Failed';

  // Admin
  const adminNet = await request({ hostname: 'localhost', port: 5000, path: '/api/admin/providers', method: 'GET', headers: { 'Authorization': 'Bearer ' + adminToken } });
  results['ADMN-01'] = adminNet.status === 200 ? 'Successful' : 'Failed';

  const adminComp = await request({ hostname: 'localhost', port: 5000, path: '/api/admin/certifications', method: 'GET', headers: { 'Authorization': 'Bearer ' + adminToken } });
  results['ADMN-05'] = adminComp.status === 200 ? 'Successful' : 'Failed';

  // Check admin auth protection
  const checkAdminAuth = await request({ hostname: 'localhost', port: 5000, path: '/api/admin/providers', method: 'GET', headers: { 'Authorization': 'Bearer ' + provToken } });
  results['AUTH-08'] = checkAdminAuth.status === 403 ? 'Successful' : 'Failed';

  console.log(JSON.stringify(results, null, 2));
}

runAllTests().catch(console.error);
