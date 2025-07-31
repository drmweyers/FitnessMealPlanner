// Simple test script to verify email service functionality
import dotenv from 'dotenv';
dotenv.config();

import { emailService } from './server/services/emailService.js';

console.log('🧪 Testing email service...');

// Test data
const testData = {
  customerEmail: 'dr.m.weyers@bcinnovationlabs.com', // Your verified Resend email
  trainerName: 'Test Trainer',
  trainerEmail: 'trainer@fitnessmealplanner.com',
  invitationLink: 'https://fitnessmealplanner.com/register?invitation=test123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
};

console.log('📧 Sending test invitation email...');
console.log('To:', testData.customerEmail);

try {
  const result = await emailService.sendInvitationEmail(testData);
  
  if (result.success) {
    console.log('✅ Email sent successfully!');
    console.log('📨 Message ID:', result.messageId);
    console.log('');
    console.log('🎉 Check your email inbox for the invitation!');
    console.log('📧 Email sent to:', testData.customerEmail);
    console.log('');
    console.log('📋 Email includes:');
    console.log('  • Professional invitation template');
    console.log('  • Trainer information');
    console.log('  • Clear call-to-action button');
    console.log('  • Expiration date warning');
    console.log('  • Fallback plain text version');
  } else {
    console.log('❌ Email sending failed:');
    console.log('Error:', result.error);
    
    if (result.error?.includes('API key')) {
      console.log('');
      console.log('💡 Make sure your RESEND_API_KEY is set correctly in .env');
    }
  }
} catch (error) {
  console.log('💥 Error during email test:');
  console.log(error.message);
}

console.log('');
console.log('🔗 Test complete. You can also test via API:');
console.log('curl -X POST http://localhost:4000/api/invitations/test-email \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\'); 
console.log('  -d \'{"email": "your-email@example.com"}\'');

process.exit(0);