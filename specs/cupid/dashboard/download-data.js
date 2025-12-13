#!/usr/bin/env node
/**
 * Download Langfuse Data to JSON
 *
 * Fetches all sessions, traces, and observations from Langfuse API
 * and saves them to JSON files for use by the dashboard.
 *
 * Usage: node download-data.js
 */

const LANGFUSE_CONFIG = {
  baseUrl: 'https://us.cloud.langfuse.com/api/public',
  publicKey: 'pk-lf-b957e40e-94f5-4654-a74d-97d190b18e12',
  secretKey: 'sk-lf-c4956a16-4229-4146-af77-b5311b7eb253'
};

const fs = require('fs');
const path = require('path');

// Create auth header
const auth = Buffer.from(`${LANGFUSE_CONFIG.publicKey}:${LANGFUSE_CONFIG.secretKey}`).toString('base64');

async function fetchAPI(endpoint, retries = 5) {
  const url = `${LANGFUSE_CONFIG.baseUrl}${endpoint}`;
  console.log(`Fetching: ${endpoint}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 2000; // Longer exponential backoff: 4s, 8s, 16s, 32s, 64s
        console.log(`   Rate limited. Waiting ${waitTime / 1000}s... (attempt ${attempt}/${retries})`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`   Retry ${attempt}/${retries}: ${error.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Max retries exceeded');
}

async function fetchAllPages(endpoint, limit = 100) {
  const allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const result = await fetchAPI(`${endpoint}${separator}limit=${limit}&page=${page}`);

    if (result.data && Array.isArray(result.data)) {
      allData.push(...result.data);
      hasMore = result.data.length === limit;
      page++;
    } else {
      hasMore = false;
    }

    // Delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  return allData;
}

async function downloadData() {
  const dataDir = path.join(__dirname, 'data');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  console.log('\n=== Downloading Langfuse Data ===\n');

  // 1. Fetch all sessions
  console.log('1. Fetching sessions...');
  const sessions = await fetchAllPages('/sessions');
  console.log(`   Found ${sessions.length} sessions`);

  // 2. Fetch all traces
  console.log('2. Fetching traces...');
  const traces = await fetchAllPages('/traces');
  console.log(`   Found ${traces.length} traces`);

  // 3. Fetch all observations
  console.log('3. Fetching observations...');
  const observations = await fetchAllPages('/observations');
  console.log(`   Found ${observations.length} observations`);

  // 4. Fetch detailed trace data (with nested observations)
  console.log('4. Fetching detailed trace data...');
  const traceDetails = {};
  for (let i = 0; i < traces.length; i++) {
    const trace = traces[i];
    try {
      const detail = await fetchAPI(`/traces/${trace.id}`);
      traceDetails[trace.id] = detail;

      // Progress indicator
      if ((i + 1) % 10 === 0 || i === traces.length - 1) {
        console.log(`   ${i + 1}/${traces.length} traces processed`);
      }

      // Rate limit delay
      await new Promise(r => setTimeout(r, 300));
    } catch (error) {
      console.warn(`   Warning: Could not fetch trace ${trace.id}: ${error.message}`);
    }
  }

  // 5. Save to JSON files
  console.log('\n5. Saving to JSON files...');

  const data = {
    sessions,
    traces,
    observations,
    traceDetails,
    downloadedAt: new Date().toISOString()
  };

  // Save combined file
  const combinedPath = path.join(dataDir, 'langfuse-data.json');
  fs.writeFileSync(combinedPath, JSON.stringify(data, null, 2));
  console.log(`   Saved: ${combinedPath}`);

  // Save individual files for easier inspection
  fs.writeFileSync(path.join(dataDir, 'sessions.json'), JSON.stringify(sessions, null, 2));
  fs.writeFileSync(path.join(dataDir, 'traces.json'), JSON.stringify(traces, null, 2));
  fs.writeFileSync(path.join(dataDir, 'observations.json'), JSON.stringify(observations, null, 2));
  fs.writeFileSync(path.join(dataDir, 'trace-details.json'), JSON.stringify(traceDetails, null, 2));

  console.log('\n=== Download Complete ===');
  console.log(`Sessions: ${sessions.length}`);
  console.log(`Traces: ${traces.length}`);
  console.log(`Observations: ${observations.length}`);
  console.log(`Trace Details: ${Object.keys(traceDetails).length}`);
  console.log(`\nData saved to: ${dataDir}/`);
}

// Run
downloadData().catch(error => {
  console.error('Download failed:', error);
  process.exit(1);
});
