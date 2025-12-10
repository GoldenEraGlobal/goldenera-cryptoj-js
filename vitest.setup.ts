/**
 * Vitest global setup - regenerates test vectors from Java before running tests.
 */
import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function setup() {
  const projectRoot = process.cwd();
  const javaProject = join(projectRoot, 'test-vectors-java');
  const vectorsFile = join(projectRoot, 'src', '__tests__', 'testVectors.generated.ts');
  
  // Check if Java project exists
  if (!existsSync(join(javaProject, 'pom.xml'))) {
    console.log('⚠️  Java project not found, using existing test vectors');
    return;
  }

  try {
    console.log('🔄 Generating test vectors from Java...');
    
    // Run Maven to generate vectors
    const output = execSync('mvn compile exec:java -q 2>/dev/null', {
      cwd: javaProject,
      encoding: 'utf-8',
      timeout: 120000,
    });

    // Add TypeScript header
    const tsContent = `/**
 * Auto-generated test vectors from Java implementation.
 * DO NOT EDIT - regenerated on each test run.
 * Generated at: ${new Date().toISOString()}
 */

export interface TestVector {
  name: string;
  timestamp: bigint;
  expected: {
    hashForSigning: string;
    txHash: string;
    signature: string;
    rlpWithoutSig: string;
    rlpWithSig: string;
    size: number;
  };
}

export interface KeyDerivationVector {
  index: number;
  privateKey: string;
  address: string;
}

// Test Configuration
export const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
export const TEST_PASSWORD = '';

${output}
`;

    writeFileSync(vectorsFile, tsContent);
    console.log('✅ Test vectors generated successfully');
    
  } catch (error) {
    console.log('⚠️  Failed to generate vectors from Java, using existing vectors');
    console.log('   (Run "cd test-vectors-java && mvn compile exec:java" manually to debug)');
  }
}

export async function teardown() {
  // Cleanup if needed
}
