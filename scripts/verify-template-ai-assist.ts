import { htmlToPlainText, plainTextToEmailHtml } from '../src/utils/emailFormatters';
import { executeTemplateAiAssist, generateMockTemplateResponse } from '../server/aiAssistBackend';

async function runTests() {
  console.log('================================================================');
  console.log('   RUNNING TEMPLATE AI ASSIST & SIMPLE BODY FORMATTER TESTS    ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: htmlToPlainText strips tags and preserves paragraphs
  console.log('>>> [TEST 1] htmlToPlainText conversion');
  const sampleHtml = '<p>Hi {{first_name}},</p><p>I noticed {{company}} has been expanding quickly.</p><p>Would love to chat.<br/>Best,<br/>Alex</p>';
  const plainText = htmlToPlainText(sampleHtml);
  console.log('Plain text output:\n', plainText);

  if (
    !plainText.includes('<p>') &&
    !plainText.includes('</p>') &&
    !plainText.includes('<br/>') &&
    plainText.includes('Hi {{first_name}},') &&
    plainText.includes('I noticed {{company}}')
  ) {
    console.log('✔ TEST 1 PASSED: htmlToPlainText correctly strips all HTML tags into clean text.\n');
    passed++;
  } else {
    console.error('✖ TEST 1 FAILED');
    failed++;
  }

  // Test 2: plainTextToEmailHtml converts newlines to standard email HTML
  console.log('>>> [TEST 2] plainTextToEmailHtml conversion');
  const userText = `Hi {{first_name}},\n\nHere is how we help {{company}}:\n- Faster response times\n- Better conversion\n\nCheck out [our platform](https://example.com) anytime.\n\nBest,\n{{sender_name}}`;
  const convertedHtml = plainTextToEmailHtml(userText);
  console.log('Converted HTML output:\n', convertedHtml);

  if (
    convertedHtml.includes('<p') &&
    convertedHtml.includes('<ul') &&
    convertedHtml.includes('<li>Faster response times</li>') &&
    convertedHtml.includes('<a href="https://example.com">our platform</a>') &&
    convertedHtml.includes('{{sender_name}}')
  ) {
    console.log('✔ TEST 2 PASSED: plainTextToEmailHtml converts paragraphs, lists, and links properly.\n');
    passed++;
  } else {
    console.error('✖ TEST 2 FAILED');
    failed++;
  }

  // Test 3: executeTemplateAiAssist in Write Mode
  console.log('>>> [TEST 3] executeTemplateAiAssist (Write Mode - Stage 1)');
  const mockUser = { id: 'test-usr-1', email: 'tester@outreach.test', name: 'Tester', role: 'admin' };
  const writeResult = await executeTemplateAiAssist({
    user: mockUser,
    stageNumber: 1,
    stageName: 'Introduction',
    stagePurpose: 'Initial cold outreach introduction',
    instruction: 'Keep it punchy, under 60 words, and mention our automated outreach tool.',
    mode: 'write'
  });
  console.log('AI Generated (Write Mode):\n', writeResult.text);

  if (
    typeof writeResult.text === 'string' &&
    writeResult.text.length > 20 &&
    !writeResult.text.includes('<p>') && // Ensure AI returns clean plain text
    !writeResult.text.includes('<br>')
  ) {
    console.log('✔ TEST 3 PASSED: Template AI assistant generated plain text for sequence stage.\n');
    passed++;
  } else {
    console.error('✖ TEST 3 FAILED: AI output had HTML or failed');
    failed++;
  }

  // Test 4: executeTemplateAiAssist in Rewrite Mode
  console.log('>>> [TEST 4] executeTemplateAiAssist (Rewrite Mode)');
  const rewriteResult = await executeTemplateAiAssist({
    user: mockUser,
    stageNumber: 2,
    stageName: 'Quick Follow-up',
    stagePurpose: 'Polite reminder on previous message',
    currentBodyText: 'Hey {{first_name}}, did you get a chance to read my previous email? Let me know if you want to meet.',
    instruction: 'Make it friendlier and add a soft call to action.',
    mode: 'rewrite',
    tone: 'Friendlier'
  });
  console.log('AI Generated (Rewrite Mode):\n', rewriteResult.text);

  if (
    typeof rewriteResult.text === 'string' &&
    rewriteResult.text.length > 20 &&
    !rewriteResult.text.includes('<p>')
  ) {
    console.log('✔ TEST 4 PASSED: Template AI assistant rewrote existing text in plain text.\n');
    passed++;
  } else {
    console.error('✖ TEST 4 FAILED');
    failed++;
  }

  // Test 5: Fallback generator test
  console.log('>>> [TEST 5] generateMockTemplateResponse fallback logic');
  const mockResp = generateMockTemplateResponse({
    stageNumber: 3,
    stageName: 'Value Proposition',
    instruction: 'Share concrete customer case study or metrics',
    mode: 'write',
    selectedText: '',
    currentBodyText: '',
    tone: 'persuasive'
  });
  console.log('Mock fallback response:\n', mockResp);

  if (mockResp.includes('{{first_name}}') && !mockResp.includes('<p>')) {
    console.log('✔ TEST 5 PASSED: Mock fallback provides natural sequence template text.\n');
    passed++;
  } else {
    console.error('✖ TEST 5 FAILED');
    failed++;
  }

  console.log('================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
