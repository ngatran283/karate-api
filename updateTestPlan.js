#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

// Environment variables from pipeline
const ADO_ORG = process.env.ADO_ORG;
const ADO_PROJECT = process.env.ADO_PROJECT;
const ADO_PAT = process.env.ADO_PAT;
const ADO_TEST_PLAN_ID = process.env.ADO_TEST_PLAN_ID;
const ADO_TEST_SUITE_ID = process.env.ADO_TEST_SUITE_ID; // optional
const TEST_REPORT_FILE = process.env.TEST_REPORT_FILE;
const TEST_REPORT_HTML_FOLDER = process.env.TEST_REPORT_HTML_FOLDER;
const BUILD_BUILDID = process.env.BUILD_BUILDID;

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
        let name = tc.$.name.replace(/\[.*?\]/g, '').trim();
        let outcome = "Passed";
        let errorMessage = "";
        let stackTrace = "";
        let systemOutput = "";
        if (tc.failure) {
            outcome = "Failed";
            if (Array.isArray(tc.failure)) {
              errorMessage = tc.failure
              .map(f => f.$ && f.$.message ? f.$.message : (f._ || f))
              .join('\n');
              stackTrace = tc.failure
              .map(f => (f._ || ''))
              .join('\n');
            } else {
              errorMessage = tc.failure.$ && tc.failure.$.message
              ? tc.failure.$.message : (tc.failure._ || '');
              stackTrace = (tc.failure._ || '');
            }
            systemOutput = tc['system-out'][0];
        }
        if(outcome=="Passed" && tc['system-out'][0] && tc['system-out'][0].includes("SKIP_TESTCASE")){
          outcome = "Skipped";
        }

        return {
            name,
            outcome,
            errorMessage,
            stackTrace,
            systemOutput

        };
    }).filter(tc=>tc.outcome !== "Skipped");
}

// Create a new test run
async function createTestRun() {
  const points = await getTestPoints();
  const pointIds = points.map(p => p.id);
  const url = `${baseUrl}/test/runs?api-version=7.1`;
  const body = {
    name: `Karate Test Run - ${new Date().toISOString()}`,
    plan: { id: parseInt(ADO_TEST_PLAN_ID, 10) },
    // Optional: include suite
    ...(ADO_TEST_SUITE_ID ? { suite: { id: parseInt(ADO_TEST_SUITE_ID, 10) } } : {}),
    automated: true,
    pointIds: pointIds,
    build: { id: BUILD_BUILDID }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create test run: ${res.status} ${text}`);
  }

  return res.json();
}

// Upload Attachment (JUnit XML)
async function addRunAttachmentRun(runId, filePath) {
  const url = `${baseUrl}/test/runs/${runId}/attachments?api-version=7.1`;
  const content = fs.readFileSync(filePath);

  const formData = {
    stream: content.toString('base64'), // must be base64
    fileName: path.basename(filePath),
    comment: 'JUnit XML Test Report',
    attachmentType: 'GeneralAttachment',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  if (!res.ok) throw new Error(`Failed to attach file: ${res.status} ${await res.text()}`);
  return res.json();
}

async function addRunAttachmentResult(runId, pointId, formData) {
  const url = `${baseUrl}/test/runs/${runId}/Results/${pointId}/attachments?api-version=7.1`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  if (!res.ok) throw new Error(`Failed to attach file: ${res.status} ${await res.text()}`);
  return res.json();
}

// ---------------------------
// Upload folder as ZIP
// ---------------------------
async function addRunAttachmentFolder(runId, folderPath, attachmentName = 'karate-reports.zip') {
  const zip = new AdmZip();
  zip.addLocalFolder(folderPath);
  const zipBuffer = zip.toBuffer();

  // Convert buffer to base64
  const formData = {
    stream: zipBuffer.toString('base64'),
    fileName: attachmentName,
    comment: 'Karate Test Report',
    attachmentType: 'GeneralAttachment',
  };

  // Step 4: POST to Azure DevOps
  const url = `${baseUrl}/test/runs/${runId}/attachments?api-version=7.1`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  if (!res.ok) {
    throw new Error(`Failed to attach file: ${res.status} ${await res.text()}`);
  }

  console.log(`Attachment uploaded: ${attachmentName}`);
  return res.json();
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
const payloadAttachment =[];
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
    outcome:testcase.outcome,
    automatedTestName: testcase.name,
    automatedTestType: 'Unit',
    testCaseTitle: testcase.name,
    errorMessage: testcase.outcome!=='Passed'?testcase.errorMessage: '',
    stackTrace: testcase.stackTrace,
    state:'Completed'
  });

  if(testcase.outcome!=='Passed'){
    payloadAttachment.push({
      pointId: point.id, // ✅ use pointId, not id
      stream: Buffer.from(testcase.systemOutput).toString('base64'),
      fileName: 'Console_Output.log',
      comment: 'Failure Log',
      attachmentType: 'GeneralAttachment',
    })
  }
}
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

  for(const formData of payloadAttachment){
    addRunAttachmentResult(runId,formData.pointId,formData)
  }
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
    const run = await createTestRun();
    console.log(`Test run created: ID ${run.id}`);

    console.log('Attaching JUnit report...');
    await addRunAttachmentRun(run.id, TEST_REPORT_FILE);
    await addRunAttachmentFolder(run.id, TEST_REPORT_HTML_FOLDER);
    console.log('✅ JUnit report attached.');

    console.log('Uploading test results...');
    await addTestResults(run.id, results);

    await completeTestRun(run.id);

    console.log('Test results uploaded successfully!');
  } catch (err) {
    console.error('Error updating Azure DevOps Test Plan:', err);
    process.exit(1);
  }
})();
