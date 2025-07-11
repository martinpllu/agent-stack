#!/usr/bin/env node

console.log('Testing login issue...');

// Test 1: Check if the app is running
const testUrls = [
  'http://localhost:5173/',
  'http://localhost:5173/tasks'
];

async function testUrl(url) {
  try {
    const response = await fetch(url);
    console.log(`${url} - Status: ${response.status}`);
    
    if (response.status === 500) {
      const text = await response.text();
      console.log(`Error response: ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`${url} - Error: ${error.message}`);
  }
}

async function main() {
  console.log('Testing URLs...');
  for (const url of testUrls) {
    await testUrl(url);
  }
}

main().catch(console.error);