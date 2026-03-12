#!/usr/bin/env node

/**
 * Batch Enrichment Script
 * 
 * Triggers metadata enrichment via the admin API endpoint.
 * Requires the server to be running.
 * 
 * Usage: npm run dev (in another terminal), then:
 *   node scripts/enrich-metadata.mjs
 *   node scripts/enrich-metadata.mjs --ratings-only
 *   node scripts/enrich-metadata.mjs --arcs-only
 */

import http from 'http';

const OPERATIONS = {
  ALL: ['arcs', 'ratings'],
  ARCS: ['arcs'],
  RATINGS: ['ratings'],
};

function getOperations() {
  const args = process.argv.slice(2);
  if (args.includes('--arcs-only')) return OPERATIONS.ARCS;
  if (args.includes('--ratings-only')) return OPERATIONS.RATINGS;
  return OPERATIONS.ALL;
}

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  const operations = getOperations();
  
  console.log('🚀 Starting metadata enrichment via API...\n');
  console.log(`📋 Operations: ${operations.join(', ')}`);
  console.log(`🔗 Endpoint: POST http://localhost:3000/api/v1/admin/enrich\n`);

  try {
    const startTime = Date.now();
    
    const response = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/admin/enrich',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      { operations, limit: 100 }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (response.status !== 200) {
      console.error(`❌ Error (${response.status}):`, response.body);
      process.exit(1);
    }

    const { results, total_duration_ms } = response.body;

    // Display results
    if (results.arcs) {
      console.log(`📚 Story Arcs:`);
      console.log(`   ✓ Computed: ${results.arcs.computed}`);
      console.log(`   ⏱️  Duration: ${(results.arcs.duration_ms / 1000).toFixed(1)}s\n`);
    }

    if (results.ratings) {
      console.log(`⭐ Ratings:`);
      console.log(`   ✓ Matched: ${results.ratings.matched} books in OpenLibrary`);
      console.log(`   ✓ Updated: ${results.ratings.updated} with ratings`);
      if (results.ratings.errors > 0) {
        console.log(`   ⚠️  Errors: ${results.ratings.errors}`);
      }
      console.log(`   ⏱️  Duration: ${(results.ratings.duration_ms / 1000).toFixed(1)}s\n`);
    }

    console.log(`✅ Enrichment complete! Total: ${(total_duration_ms / 1000).toFixed(1)}s`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.log('\n💡 Make sure the server is running: npm run dev');
    process.exit(1);
  }
}

main();
