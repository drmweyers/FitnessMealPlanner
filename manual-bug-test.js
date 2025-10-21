#!/usr/bin/env node

// Manual Bug Testing Script for FitnessMealPlanner
// This script tests critical API endpoints and functionality

import http from 'http';
import fs from 'fs';

const baseURL = 'http://localhost:4000';
const testResults = [];

function addResult(test, status, message) {
    testResults.push({ test, status, message, timestamp: new Date().toISOString() });
    console.log(`[${status}] ${test}: ${message}`);
}

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 4000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'BugTestScript/1.0'
            }
        };

        if (data) {
            options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testEndpoint(name, path, expectedStatus = 200) {
    try {
        const response = await makeRequest(path);
        if (response.status === expectedStatus) {
            addResult(name, 'PASS', `Status ${response.status} - Response length: ${response.body.length}`);
            return true;
        } else {
            addResult(name, 'FAIL', `Expected ${expectedStatus}, got ${response.status}`);
            return false;
        }
    } catch (error) {
        addResult(name, 'ERROR', `Request failed: ${error.message}`);
        return false;
    }
}

async function testLoginEndpoint() {
    try {
        const testCredentials = {
            email: 'admin@fitmeal.pro',
            password: 'AdminPass123'
        };
        
        const response = await makeRequest('/api/auth/login', 'POST', testCredentials);
        
        if (response.status === 200) {
            const data = JSON.parse(response.body);
            if (data.token) {
                addResult('Admin Login', 'PASS', 'Login successful, token received');
                return data.token;
            } else {
                addResult('Admin Login', 'FAIL', 'No token in response');
                return null;
            }
        } else {
            addResult('Admin Login', 'FAIL', `Status ${response.status}: ${response.body}`);
            return null;
        }
    } catch (error) {
        addResult('Admin Login', 'ERROR', `Login failed: ${error.message}`);
        return null;
    }
}

async function runBugTests() {
    console.log('🔍 Starting Manual Bug Testing for FitnessMealPlanner');
    console.log('==================================================');
    
    // Test basic connectivity
    await testEndpoint('Root Endpoint', '/', 302);  // Should redirect to landing
    
    // Test API endpoints
    await testEndpoint('Landing Page', '/landing/index.html');
    await testEndpoint('Recipes API', '/api/recipes', 401);  // Should require auth
    await testEndpoint('Users API', '/api/users', 401);  // Should require auth
    
    // Test authentication
    const token = await testLoginEndpoint();
    
    if (token) {
        // Test authenticated endpoints
        console.log('\n📋 Testing authenticated endpoints...');
        // Note: Would need to modify makeRequest to include authorization header
    }
    
    // Test meal plan generator
    await testEndpoint('Meal Plans API', '/api/meal-plans', 401);
    
    // Test admin endpoints  
    await testEndpoint('Admin Stats', '/api/admin/stats', 401);
    
    console.log('\n📊 Test Results Summary:');
    console.log('==========================');
    
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const errors = testResults.filter(r => r.status === 'ERROR').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚨 Errors: ${errors}`);
    console.log(`📈 Total Tests: ${testResults.length}`);
    
    if (failed > 0 || errors > 0) {
        console.log('\n🐛 Issues Found:');
        testResults.filter(r => r.status !== 'PASS').forEach(result => {
            console.log(`   ${result.status}: ${result.test} - ${result.message}`);
        });
    }
    
    // Write results to file
    fs.writeFileSync('manual-test-results.json', JSON.stringify(testResults, null, 2));
    console.log('\n💾 Results saved to manual-test-results.json');
}

// Run the tests
runBugTests().catch(console.error);