#!/usr/bin/env node
/**
 * Quick Authentication Token Fix Script
 * 
 * This script helps fix the expired JWT token issue that's preventing
 * recipe generation by clearing expired tokens from localStorage.
 * 
 * Usage: Run this in the browser console to clear expired tokens
 */

console.log("🔧 FitnessMealPlanner Authentication Token Fix");
console.log("================================================");

// Check if we're in a browser environment
if (typeof localStorage !== 'undefined') {
  const token = localStorage.getItem('token');
  
  if (token) {
    console.log("✅ Found existing token in localStorage");
    
    try {
      // Decode JWT to check expiration (simple base64 decode)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      console.log("Token payload:", payload);
      console.log("Current time:", new Date(currentTime * 1000));
      console.log("Token expires:", new Date(payload.exp * 1000));
      
      if (payload.exp < currentTime) {
        console.log("❌ Token is EXPIRED - clearing localStorage");
        localStorage.removeItem('token');
        console.log("✅ Expired token removed from localStorage");
        console.log("🔄 Please refresh the page and log in again");
      } else {
        console.log("✅ Token is still valid");
      }
    } catch (error) {
      console.log("❌ Invalid token format - clearing localStorage");
      localStorage.removeItem('token');
      console.log("✅ Invalid token removed from localStorage");
      console.log("🔄 Please refresh the page and log in again");
    }
  } else {
    console.log("ℹ️ No token found in localStorage");
    console.log("🔄 Please log in to access admin features");
  }
} else {
  console.log("❌ This script must be run in a browser environment");
}

console.log("================================================");
console.log("🔧 Authentication fix complete");