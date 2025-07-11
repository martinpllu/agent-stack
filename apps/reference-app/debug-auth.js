#!/usr/bin/env node

async function debugAuth() {
  try {
    console.log('Debugging auth configuration...');
    
    // Test if we can import the auth client
    const { Resource } = await import('sst');
    console.log('SST Resource imported successfully');
    
    // Check if MyAuth exists
    if (Resource.MyAuth) {
      console.log('MyAuth resource found');
      console.log('MyAuth URL:', Resource.MyAuth.url);
    } else {
      console.log('MyAuth resource NOT found');
      console.log('Available resources:', Object.keys(Resource));
    }
    
  } catch (error) {
    console.error('Error debugging auth:', error);
  }
}

debugAuth();