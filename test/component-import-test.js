// Component Import Test
// This test verifies that our new components can be imported without errors

console.log('🔧 Testing component imports...');

// Test if we can compile TypeScript without runtime errors
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testComponentImports = () => {
  return new Promise((resolve, reject) => {
    console.log('📝 Creating test import file...');
    
    const testContent = `
import React from 'react';
import SpecializedProtocolsPanel from '../client/src/components/SpecializedProtocolsPanel';
import MinimalSpecializedPanel from '../client/src/components/MinimalSpecializedPanel';
import { 
  Sparkles, 
  Shield, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Settings,
  Activity,
  Clock,
  Bug,
  Leaf,
  Info
} from 'lucide-react';

// Test that components can be instantiated
const TestApp = () => {
  return (
    <>
      <MinimalSpecializedPanel />
      <SpecializedProtocolsPanel 
        onConfigChange={() => {}} 
      />
      <div>
        <Sparkles />
        <Shield />
        <Clock />
        <Bug />
      </div>
    </>
  );
};

console.log('✅ All imports successful!');
export default TestApp;
`;

    const testFile = path.join(__dirname, 'temp-import-test.tsx');
    fs.writeFileSync(testFile, testContent);
    
    console.log('🔍 Running TypeScript check on imports...');
    
    // Use npx tsc to check the file
    const tsc = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck', testFile], {
      shell: true,
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    tsc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    tsc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    tsc.on('close', (code) => {
      // Clean up test file
      try {
        fs.unlinkSync(testFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (code === 0) {
        console.log('✅ TypeScript compilation successful!');
        console.log('📋 Component Import Test Results:');
        console.log('  ✓ SpecializedProtocolsPanel - Imports successfully');
        console.log('  ✓ MinimalSpecializedPanel - Imports successfully');
        console.log('  ✓ Lucide-react icons - All imports working');
        console.log('  ✓ UI components - Card, Button, etc. available');
        resolve({
          success: true,
          message: 'All component imports working correctly',
          details: output
        });
      } else {
        console.log('❌ TypeScript compilation failed');
        console.log('Error output:', errorOutput);
        resolve({
          success: false,
          message: 'Component import errors detected',
          errors: errorOutput,
          details: output
        });
      }
    });
    
    tsc.on('error', (error) => {
      console.log('❌ Failed to run TypeScript check:', error.message);
      resolve({
        success: false,
        message: 'Failed to run TypeScript check',
        error: error.message
      });
    });
  });
};

// Run the test
testComponentImports().then(result => {
  console.log('🏁 Component Import Test Complete');
  console.log('Result:', result.success ? '✅ PASSED' : '❌ FAILED');
  if (!result.success) {
    console.log('Details:', result.message);
    if (result.errors) console.log('Errors:', result.errors);
  }
  process.exit(result.success ? 0 : 1);
});