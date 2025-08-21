#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

// Environment variables from pipeline
const ADO_ORG = process.env.ADO_ORG;
const ADO_PROJECT = process.env.ADO_PROJECT;
const ADO_PAT = process.env.ADO_PAT;
const ADO_TEST_PLAN_ID = process.env.ADO_TEST_PLAN_ID;
const ADO_TEST_SUITE_ID = process.env.ADO_TEST_SUITE_ID; // optional
const TEST_REPORT_FILE = process.env.TEST_REPORT_FILE;
const BUILD_BUILDID = process.env.BUILD_BUILDID;
const buildUri = process.env.BUILD_URI; // $(Build.BuildUri)

if (!ADO_ORG || !ADO_PROJECT || !ADO_PAT || !ADO_TEST_PLAN_ID || !TEST_REPORT_FILE) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

// Basic auth header for Azure DevOps REST API
const authHeader = () => {
  const token = Buffer.from(`:${ADO_PAT}`).toString('base64');
  return `Basic ${token}`;
};

// Azure DevOps REST API base URL
const baseUrl = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis`;

// Read and parse JUnit report
async function parseJUnitReport(filePath) {
  const xml = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const result = await parseStringPromise(xml);
  const testcases = result.testsuite.testcase || [];
  if (!Array.isArray(testcases)) testcases = [testcases];

    return testcases.map(tc => {
        let name = tc.$.name.replace(/^\[\d+:\d+\]\s*/, ''); // remove [1:4]
        let outcome = "Passed";
        let errorMessage = "";
        let stackTrace = "";

        if (tc.failure) {
            outcome = "Failed";
            if (Array.isArray(tc.failure)) {
              errorMessage = tc.failure
              .map(f => f.$ && f.$.message ? f.$.message : (f._ || f))
              .join('\n');
              stackTrace = tc.failure
              .map(f => f.$ && f.$.type ? f.$.type : (f._ || f))
              .join('\n');
            } else {
              errorMessage = tc.failure.$ && tc.failure.$.message
              ? tc.failure.$.message
              : (tc.failure._ || '');
              errorMessage = tc.failure.$ && tc.failure.$.type
              ? tc.failure.$.type
              : (tc.failure._ || '');
            }
        }

        return {
            name: name,
            outcome,
            errorMessage
        };
    });

}

// Fetch test points for the suite
async function getTestPoints() {
  const url = `${baseUrl}/testplan/Plans/${ADO_TEST_PLAN_ID}/suites/${ADO_TEST_SUITE_ID}/TestPoint?api-version=7.1`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch test points: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.value; // array of test points
}

// Get results for a test run and extract ID + test name
async function getTestResults(runId) {
  const url = `${baseUrl}/test/runs/${runId}/results?api-version=7.1-preview.6`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader() },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch test results: ${res.status} ${text}`);
  }
    const data = await res.json();
  const results = Array.isArray(data.value)
  ? data.value.map(r => ({
      id: r.id,
      title: r.testCaseTitle
    }))
  : [];

console.log("Parsed Results:", results);
  return results;
}

// Update test results using point IDs
async function addTestResults(runId, testcases) {
  const points = await getTestResults(runId);

  // Map suites to points
const payload = [];
for (const point of points) {
  // Find matching suite by name (case-insensitive)
  const testcase = testcases.find(s => 
    s.name.toLowerCase() === (point.title || '').toLowerCase()
  );

  if (!testcase) {
    console.warn(`⚠️ No matching suite found for test point "${point.title}" (ID ${point.id})`);
    continue;
  }
  payload.push({
    id: point.id, // ✅ use pointId, not id
    automatedTestName: testcase.name,
    automatedTestType: 'Unit',
    testCaseTitle: testcase.name,
    state:'Completed'
  });
}
  console.log(payload)
  const patchUrl = `${baseUrl}/test/runs/${runId}/results?api-version=7.1`;
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!patchRes.ok) {
    const text = await patchRes.text();
    throw new Error(`Failed to update test results: ${patchRes.status} ${text}`);
  }

  console.log(`Updated ${payload.length} test results for run ${runId}.`);
  return patchRes.json();
}

// Complete the test run to update statistics
async function completeTestRun(runId) {
  const url = `${baseUrl}/test/runs/${runId}?api-version=7.1`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ state: 'Completed' }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to complete test run: ${res.status} ${text}`);
  }

  console.log(`Test run ${runId} marked as Completed.`);
  return res.json();
}

// Get latest run created by PublishTestResults
async function getLatestRunId() {
  console.log('Build URI:', buildUri);
  const url = `${baseUrl}/test/runs?buildUri=${buildUri}&api-version=7.1`;
  console.log(url);
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get test runs: ${res.status} ${text}`);
  }
  console.log(res)
  const data = await res.json();
  if (data.count === 0) throw new Error('No test runs found for this build.');
  return data.value[0].id; // latest run ID
}

// Main execution
(async () => {
  try {
    console.log('Parsing JUnit report...');
    const results = await parseJUnitReport(TEST_REPORT_FILE);
    results.map((testcase) => {
    // Detailed logging
    console.log('-----------------------------------------');
    console.log(`Test Case : ${testcase.name}`);
    console.log('-----------------------------------------')});
    console.log('Creating test run...');
    const runId = await getLatestRunId();
    console.log(`Get RUN ID ${runId}`);
    console.log('Uploading test results...');
    await addTestResults(runId, results);

    await completeTestRun(runId);

    console.log('Test results uploaded successfully!');
  } catch (err) {
    console.error('Error updating Azure DevOps Test Plan:', err);
    process.exit(1);
  }
})();
