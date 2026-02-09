import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { processVideo } from '../../server/ai/index.js'; // Ensure .js extension for ESM

// Use import.meta.dirname for Bun compatibility, or fallback to process.cwd() joined with path
// Since we are in a test environment, let's use a robust way to find the cases directory relative to this file
const casesDir = path.join(import.meta.dirname, 'cases');

describe('Golden Tests', () => {
  const files = fs.readdirSync(casesDir).filter(f => f.endsWith('-expected.json'));

  for (const expectedFile of files) {
    const inputFile = expectedFile.replace('-expected.json', '.json');
    const inputPath = path.join(casesDir, inputFile);
    const expectedPath = path.join(casesDir, expectedFile);

    if (!fs.existsSync(inputPath)) {
      continue;
    }

    const testCase = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    const expectedOutput = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));

    it(`should match golden output for ${inputFile}`, async () => {
      const result = await processVideo(testCase.input, testCase.config);

      // Verify total output duration
      const resultDuration = result.segments.reduce((acc: any, s: any) => acc + (s.end - s.start), 0);
      const expectedDuration = expectedOutput.segments.reduce((acc: any, s: any) => acc + (s.end - s.start), 0);
      assert.strictEqual(resultDuration, expectedDuration, 'Total duration mismatch');

      // Verify number of segments
      assert.strictEqual(result.segments.length, expectedOutput.segments.length, 'Segment count mismatch');

      // Verify dominant mood (if applicable in meta)
      assert.strictEqual(result.meta.mood, expectedOutput.meta.mood, 'Mood mismatch');

      // Verify deterministic ordering
      assert.deepStrictEqual(result.segments.map((s: any) => s.id), expectedOutput.segments.map((s: any) => s.id), 'Segment order mismatch');

      // Verify deep equality of the entire structure
      // Normalize result to match JSON serialization (strips undefined)
      const normalizedResult = JSON.parse(JSON.stringify(result));
      assert.deepStrictEqual(normalizedResult, expectedOutput, 'Full structure mismatch');
    });
  }
});
