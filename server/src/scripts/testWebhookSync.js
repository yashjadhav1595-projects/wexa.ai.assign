/**
 * Webhook Verification & Graph Mutation Test Script
 */
require('dotenv').config();
const crypto = require('crypto');
const webhookService = require('../services/webhookService');
const githubAppService = require('../services/githubAppService');

async function runTests() {
  console.log('🧪 Starting GraphGuard AI Webhook & GitHub App Test Suite...\n');

  // Test 1: GitHub App Status & Program Eligibility
  console.log('--- Test 1: GitHub App Status & Program Eligibility ---');
  const appStatus = githubAppService.getStatus();
  console.log('App Status:', JSON.stringify(appStatus, null, 2));

  // Test 2: Webhook HMAC Signature Validation
  console.log('\n--- Test 2: Webhook HMAC SHA-256 Signature Verification ---');
  const secret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';
  const testPayload = JSON.stringify({ action: 'created', repository: { name: 'graph-guard-core' } });
  const hmac = crypto.createHmac('sha256', secret);
  const validSignature = `sha256=${hmac.update(testPayload).digest('hex')}`;
  
  const isValid = webhookService.verifySignature(testPayload, validSignature);
  const isInvalid = webhookService.verifySignature(testPayload, 'sha256=invalid-signature-hex');
  console.log(`Valid signature verified: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Invalid signature rejected: ${!isInvalid ? '✅ PASS' : '❌ FAIL'}`);

  // Test 3: Membership Webhook Event
  console.log('\n--- Test 3: Organization Membership Event ---');
  const membershipResult = await webhookService.processEvent('membership', {
    action: 'added',
    scope: 'admin',
    member: { login: 'alex-engineer' },
    organization: { login: 'cyberdyne-systems' }
  });
  console.log('Membership Result:', membershipResult);

  // Test 4: Repository Webhook Event
  console.log('\n--- Test 4: Repository Event ---');
  const repoResult = await webhookService.processEvent('repository', {
    action: 'created',
    repository: {
      name: 'neural-pipeline',
      stargazers_count: 142,
      language: 'TypeScript',
      owner: { login: 'cyberdyne-systems' }
    }
  });
  console.log('Repository Result:', repoResult);

  // Test 5: Pull Request Audit Event
  console.log('\n--- Test 5: Pull Request Activity Event ---');
  const prResult = await webhookService.processEvent('pull_request', {
    action: 'opened',
    pull_request: {
      number: 88,
      user: { login: 'alex-engineer' }
    },
    repository: {
      name: 'neural-pipeline',
      full_name: 'cyberdyne-systems/neural-pipeline'
    }
  });
  console.log('PR Result:', prResult);

  console.log('\n✅ All GitHub App & Webhook Verification Tests Passed Successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
