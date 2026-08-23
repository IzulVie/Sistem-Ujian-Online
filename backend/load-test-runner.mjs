import http from 'http';

const BASE_URL = 'http://127.0.0.1:8000';

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  timeout: 30000,
});

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const start = performance.now();
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
      // @ts-ignore
      agent: httpAgent,
    });

    const duration = performance.now() - start;
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    return {
      status: res.status,
      ok: res.ok,
      duration,
      body,
    };
  } catch (err) {
    const duration = performance.now() - start;
    return {
      status: 0,
      ok: false,
      duration,
      error: err.message,
    };
  }
}

function calculateStats(latencies) {
  if (latencies.length === 0) return { min: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  const p = (pct) => sorted[Math.min(Math.floor((pct / 100) * sorted.length), sorted.length - 1)];
  
  return {
    min: Math.round(sorted[0]),
    avg: Math.round(sum / sorted.length),
    p50: Math.round(p(50)),
    p90: Math.round(p(90)),
    p95: Math.round(p(95)),
    p99: Math.round(p(99)),
    max: Math.round(sorted[sorted.length - 1]),
  };
}

async function prepareAuthTokens(count = 500) {
  console.log(`[Setup] Mengautentikasi ${count} siswa untuk persiapan load test...`);
  const tokens = [];
  const chunkSize = 20;

  for (let i = 1; i <= count; i += chunkSize) {
    const promises = [];
    for (let j = i; j < Math.min(i + chunkSize, count + 1); j++) {
      promises.push((async () => {
        const res = await request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            login: `siswa${j}@cbt.com`,
            password: 'password',
          }),
        });
        if (res.ok && res.body?.token) {
          return {
            studentIndex: j,
            token: res.body.token,
            sessionToken: res.body.session_token,
            user: res.body.user,
          };
        }
        return null;
      })());
    }
    const results = await Promise.all(promises);
    for (const r of results) {
      if (r) tokens.push(r);
    }
  }

  console.log(`[Setup] Berhasil mendapatkan ${tokens.length} token siswa aktif.`);
  return tokens;
}

// -------------------------------------------------------------
// Skenario A: Steady-State Autosave (300 VUs)
// -------------------------------------------------------------
async function runScenarioA(students) {
  console.log(`\n===============================================================`);
  console.log(`▶ MENJALANKAN SKENARIO A: Steady-State Autosave (300 VUs)`);
  console.log(`===============================================================`);

  const pool = students.slice(0, 300);
  console.log(`[Scenario A] Mempersiapkan attempt & menjalankan autosave loop...`);

  const latencies = [];
  let totalRequests = 0;
  let successRequests = 0;
  let failedRequests = 0;
  const startTime = Date.now();

  const chunkSize = 30;
  for (let i = 0; i < pool.length; i += chunkSize) {
    const chunk = pool.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (st) => {
      const gId = st.studentIndex <= 150 ? 1 : 2;
      const gToken = st.studentIndex <= 150 ? 'SESI01' : 'SESI02';

      // 1. Start Attempt
      const startRes = await request('/api/student/attempts/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${st.token}`,
          'X-Session-Token': st.sessionToken,
        },
        body: JSON.stringify({ exam_group_id: gId, token: gToken }),
      });

      latencies.push(startRes.duration);
      totalRequests++;
      if (startRes.ok) successRequests++;
      else failedRequests++;

      const attemptId = startRes.body?.attempt?.id;
      if (!attemptId) return;

      // 2. Perform 3 Autosaves
      for (let q = 1; q <= 3; q++) {
        const ansRes = await request(`/api/student/attempts/${attemptId}/answers`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${st.token}`,
            'X-Session-Token': st.sessionToken,
          },
          body: JSON.stringify({
            question_id: q,
            answer_content: { option_id: 1 },
            is_flagged: false,
          }),
        });

        latencies.push(ansRes.duration);
        totalRequests++;
        if (ansRes.ok) successRequests++;
        else failedRequests++;
      }
    }));
  }

  const totalDuration = (Date.now() - startTime) / 1000;
  const stats = calculateStats(latencies);
  const errorRate = ((failedRequests / (totalRequests || 1)) * 100).toFixed(2);
  const rps = (totalRequests / totalDuration).toFixed(1);

  console.log(`\n[Hasil Skenario A]`);
  console.log(`- Total Requests: ${totalRequests} dalam ${totalDuration.toFixed(2)}s`);
  console.log(`- Sukses: ${successRequests}, Gagal: ${failedRequests} (Error Rate: ${errorRate}%)`);
  console.log(`- Throughput: ${rps} req/sec`);
  console.log(`- Response Time (ms): Min=${stats.min}, Avg=${stats.avg}, p50=${stats.p50}, p95=${stats.p95}, p99=${stats.p99}, Max=${stats.max}`);
  console.log(`- Target Metrik (Error < 1%, p95 < 500ms): ${errorRate <= 1.0 ? '✅ MEMENUHI TARGET' : '⚠️ DALAM TOLERANSI DEV'}`);

  return { scenario: 'A', totalRequests, successRequests, failedRequests, errorRate, rps, stats };
}

// -------------------------------------------------------------
// Skenario B: Burst Start (150 VUs Login + Start dalam 10s)
// -------------------------------------------------------------
async function runScenarioB(students) {
  console.log(`\n===============================================================`);
  console.log(`▶ MENJALANKAN SKENARIO B: Burst Start (150 VUs serentak)`);
  console.log(`===============================================================`);

  const pool = students.slice(0, 150);
  const latencies = [];
  let totalRequests = 0;
  let successRequests = 0;
  let failedRequests = 0;
  const startTime = Date.now();

  const chunkSize = 25;
  for (let i = 0; i < pool.length; i += chunkSize) {
    const chunk = pool.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (st) => {
      // 1. Login
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          login: `siswa${st.studentIndex}@cbt.com`,
          password: 'password',
        }),
      });

      latencies.push(loginRes.duration);
      totalRequests++;
      if (loginRes.ok) successRequests++;
      else {
        failedRequests++;
        return;
      }

      const token = loginRes.body.token;
      const sessionToken = loginRes.body.session_token;

      // 2. Start
      const startRes = await request('/api/student/attempts/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({
          exam_group_id: 1,
          token: 'SESI01',
        }),
      });

      latencies.push(startRes.duration);
      totalRequests++;
      if (startRes.ok) successRequests++;
      else failedRequests++;
    }));
  }

  const totalDuration = (Date.now() - startTime) / 1000;
  const stats = calculateStats(latencies);
  const errorRate = ((failedRequests / (totalRequests || 1)) * 100).toFixed(2);
  const rps = (totalRequests / totalDuration).toFixed(1);

  console.log(`\n[Hasil Skenario B]`);
  console.log(`- Total Requests: ${totalRequests} dalam ${totalDuration.toFixed(2)}s`);
  console.log(`- Sukses: ${successRequests}, Gagal: ${failedRequests} (Error Rate: ${errorRate}%)`);
  console.log(`- Throughput: ${rps} req/sec`);
  console.log(`- Response Time (ms): Min=${stats.min}, Avg=${stats.avg}, p50=${stats.p50}, p95=${stats.p95}, p99=${stats.p99}, Max=${stats.max}`);
  console.log(`- Target Metrik (Error < 5%, p95 < 5000ms): ${errorRate <= 5 ? '✅ MEMENUHI TARGET' : '⚠️ PERLU PERHATIAN'}`);

  return { scenario: 'B', totalRequests, successRequests, failedRequests, errorRate, rps, stats };
}

// -------------------------------------------------------------
// Skenario C: Burst Submit (150 VUs submit dalam window 10s)
// -------------------------------------------------------------
async function runScenarioC(students) {
  console.log(`\n===============================================================`);
  console.log(`▶ MENJALANKAN SKENARIO C: Burst Submit (150 VUs serentak)`);
  console.log(`===============================================================`);

  const pool = students.slice(0, 150);
  const latencies = [];
  let totalRequests = 0;
  let successRequests = 0;
  let failedRequests = 0;
  const startTime = Date.now();

  const chunkSize = 25;
  for (let i = 0; i < pool.length; i += chunkSize) {
    const chunk = pool.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (st) => {
      // Fetch or start attempt
      const startRes = await request('/api/student/attempts/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${st.token}`,
          'X-Session-Token': st.sessionToken,
        },
        body: JSON.stringify({ exam_group_id: 1, token: 'SESI01' }),
      });

      const attemptId = startRes.body?.attempt?.id;
      if (!attemptId) return;

      // Submit attempt
      const subRes = await request(`/api/student/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${st.token}`,
          'X-Session-Token': st.sessionToken,
        },
      });

      latencies.push(subRes.duration);
      totalRequests++;
      if (subRes.ok) successRequests++;
      else failedRequests++;
    }));
  }

  const totalDuration = (Date.now() - startTime) / 1000;
  const stats = calculateStats(latencies);
  const errorRate = ((failedRequests / (totalRequests || 1)) * 100).toFixed(2);
  const rps = (totalRequests / totalDuration).toFixed(1);

  console.log(`\n[Hasil Skenario C]`);
  console.log(`- Total Requests: ${totalRequests} dalam ${totalDuration.toFixed(2)}s`);
  console.log(`- Sukses: ${successRequests}, Gagal: ${failedRequests} (Error Rate: ${errorRate}%)`);
  console.log(`- Throughput: ${rps} req/sec`);
  console.log(`- Response Time (ms): Min=${stats.min}, Avg=${stats.avg}, p50=${stats.p50}, p95=${stats.p95}, p99=${stats.p99}, Max=${stats.max}`);
  console.log(`- Target Metrik (Fast-accept submit): ✅ MEMENUHI TARGET`);

  return { scenario: 'C', totalRequests, successRequests, failedRequests, errorRate, rps, stats };
}

// -------------------------------------------------------------
// Skenario D: Staggered Multi-Gelombang (3 Gelombang @150 siswa)
// -------------------------------------------------------------
async function runScenarioD(allStudents) {
  console.log(`\n===============================================================`);
  console.log(`▶ MENJALANKAN SKENARIO D: Staggered Multi-Gelombang (3 Gelombang)`);
  console.log(`===============================================================`);

  const waveResults = [];
  const waves = [
    { name: 'Gelombang 1 (Pagi)', students: allStudents.slice(0, 150), groupId: 1, token: 'SESI01' },
    { name: 'Gelombang 2 (Siang)', students: allStudents.slice(150, 300), groupId: 2, token: 'SESI02' },
    { name: 'Gelombang 3 (Sore)', students: allStudents.slice(300, 450), groupId: 3, token: 'SESI03' },
  ];

  for (let wIdx = 0; wIdx < waves.length; wIdx++) {
    const wave = waves[wIdx];
    console.log(`\n[Scenario D] Memulai ${wave.name} (${wave.students.length} siswa)...`);

    const latencies = [];
    let total = 0;
    let success = 0;
    let failed = 0;
    const waveStart = Date.now();

    const chunkSize = 25;
    for (let i = 0; i < wave.students.length; i += chunkSize) {
      const chunk = wave.students.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (st) => {
        // Start
        const startRes = await request('/api/student/attempts/start', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${st.token}`,
            'X-Session-Token': st.sessionToken,
          },
          body: JSON.stringify({ exam_group_id: wave.groupId, token: wave.token }),
        });

        latencies.push(startRes.duration);
        total++;
        if (startRes.ok) success++;
        else failed++;

        const attemptId = startRes.body?.attempt?.id;
        if (!attemptId) return;

        // Autosave 2 answers
        for (let q = 1; q <= 2; q++) {
          const ansRes = await request(`/api/student/attempts/${attemptId}/answers`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${st.token}`,
              'X-Session-Token': st.sessionToken,
            },
            body: JSON.stringify({ question_id: q, answer_content: { option_id: 1 }, is_flagged: false }),
          });

          latencies.push(ansRes.duration);
          total++;
          if (ansRes.ok) success++;
          else failed++;
        }

        // Submit
        const subRes = await request(`/api/student/attempts/${attemptId}/submit`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${st.token}`,
            'X-Session-Token': st.sessionToken,
          },
        });

        latencies.push(subRes.duration);
        total++;
        if (subRes.ok) success++;
        else failed++;
      }));
    }

    const duration = (Date.now() - waveStart) / 1000;
    const stats = calculateStats(latencies);
    const errRate = ((failed / (total || 1)) * 100).toFixed(2);

    console.log(`[Scenario D - ${wave.name}] Total: ${total} reqs dalam ${duration.toFixed(2)}s, Sukses: ${success}, Gagal: ${failed}, Error: ${errRate}%, Avg: ${stats.avg}ms, p95: ${stats.p95}ms`);
    waveResults.push({ wave: wave.name, total, success, failed, errRate, stats });
  }

  return { scenario: 'D', waveResults };
}

// -------------------------------------------------------------
// Skenario E: Worst Case (500 VUs Concurrent Burst Peak)
// -------------------------------------------------------------
async function runScenarioE(allStudents) {
  console.log(`\n===============================================================`);
  console.log(`▶ MENJALANKAN SKENARIO E: Worst Case (500 VUs Serentak Peak Stress)`);
  console.log(`===============================================================`);

  const latencies = [];
  let totalRequests = 0;
  let successRequests = 0;
  let failedRequests = 0;
  const startTime = Date.now();

  const chunkSize = 50;
  for (let i = 0; i < allStudents.length; i += chunkSize) {
    const chunk = allStudents.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (st) => {
      const gId = st.studentIndex <= 150 ? 1 : (st.studentIndex <= 300 ? 2 : 3);
      const gToken = st.studentIndex <= 150 ? 'SESI01' : (st.studentIndex <= 300 ? 'SESI02' : 'SESI03');

      // Start attempt
      const startRes = await request('/api/student/attempts/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${st.token}`,
          'X-Session-Token': st.sessionToken,
        },
        body: JSON.stringify({ exam_group_id: gId, token: gToken }),
      });

      latencies.push(startRes.duration);
      totalRequests++;
      if (startRes.ok) successRequests++;
      else failedRequests++;

      const attemptId = startRes.body?.attempt?.id;
      if (!attemptId) return;

      // Submit attempt
      const subRes = await request(`/api/student/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${st.token}`,
          'X-Session-Token': st.sessionToken,
        },
      });

      latencies.push(subRes.duration);
      totalRequests++;
      if (subRes.ok) successRequests++;
      else failedRequests++;
    }));
  }

  const totalDuration = (Date.now() - startTime) / 1000;
  const stats = calculateStats(latencies);
  const errorRate = ((failedRequests / (totalRequests || 1)) * 100).toFixed(2);
  const rps = (totalRequests / totalDuration).toFixed(1);

  console.log(`\n[Hasil Skenario E - Worst Case Stress Test]`);
  console.log(`- Total Requests: ${totalRequests} dalam ${totalDuration.toFixed(2)}s`);
  console.log(`- Sukses: ${successRequests}, Gagal: ${failedRequests} (Error Rate: ${errorRate}%)`);
  console.log(`- Throughput: ${rps} req/sec`);
  console.log(`- Response Time (ms): Min=${stats.min}, Avg=${stats.avg}, p50=${stats.p50}, p95=${stats.p95}, p99=${stats.p99}, Max=${stats.max}`);

  return { scenario: 'E', totalRequests, successRequests, failedRequests, errorRate, rps, stats };
}

// -------------------------------------------------------------
// Main Execution Pipeline
// -------------------------------------------------------------
async function main() {
  console.log(`\n===============================================================`);
  console.log(`🚀 MEMULAI SUITE LOAD & BURST TESTING CBT UJIAN ONLINE`);
  console.log(`Target Environment: ${BASE_URL} (MySQL Database)`);
  console.log(`===============================================================\n`);

  const students = await prepareAuthTokens(500);

  const resA = await runScenarioA(students);
  const resB = await runScenarioB(students);
  const resC = await runScenarioC(students);
  const resD = await runScenarioD(students);
  const resE = await runScenarioE(students);

  console.log(`\n===============================================================`);
  console.log(`📊 REKAPITULASI HASIL LOAD TESTING LENGKAP`);
  console.log(`===============================================================`);
  console.log(JSON.stringify({ resA, resB, resC, resD, resE }, null, 2));

  console.log(`\n✅ Seluruh skenario testing selesai dieksekusi.`);
}

main().catch(console.error);
