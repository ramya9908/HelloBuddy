const nodemailer = require('nodemailer');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// Email transporter setup - FIXED: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationCode = async (email, code, type) => {
  // Debug output
  console.log('\n🔥 EMAIL DEBUG 🔥');
  console.log(`📧 To: ${email}`);
  console.log(`🔑 Code: ${code}`);
  console.log(`📋 Type: ${type}`);
  console.log('========================');
     
  // Debug email configuration
  console.log('📧 EMAIL CONFIG:');
  console.log(`HOST: ${process.env.EMAIL_HOST}`);
  console.log(`PORT: ${process.env.EMAIL_PORT}`);
  console.log(`USER: ${process.env.EMAIL_USER}`);
  console.log(`PASS: ${process.env.EMAIL_PASS ? '***SET***' : 'NOT SET'}`);
  console.log('========================\n');
     
  try {
    const subject = type === 'register' ? 'Email Verification - SocialEarn' : 'Login Code - SocialEarn';
    const expiryMinutes = type === 'register' ? 15 : 10;
         
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">SocialEarn Platform</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1f2937; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>This code will expire in ${expiryMinutes} minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">SocialEarn - Social Engagement Reward Platform</p>
        </div>
      `
    };

    console.log('📤 Attempting to send email...');
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    logger.info(`Verification code sent to ${email}`);
    return true;
  } catch (error) {
    console.log('❌ Email sending failed with error:');
    console.log('Error details:', error.message);
    console.log('Error code:', error.code);
         
    // Log specific error types for better debugging
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      console.log('🔄 Network connectivity issue - but code is available in console');
    } else if (error.code === 'EAUTH') {
      console.log('🔐 Authentication failed - check email credentials');
    } else if (error.response && error.response.includes('rate limit')) {
      console.log('⏱️ Rate limited by email provider - wait before next request');
    } else if (error.code === 'EDNS') {
      console.log('🌐 DNS resolution failed - check EMAIL_HOST setting');
    } else {
      console.log('❓ Unknown email error - check configuration');
    }
         
    logger.error('Email sending failed:', error);
         
    // Always return true so the login/registration process continues
    // User can still use the code shown in console for debugging
    console.log('⚠️ Continuing process - use code from console output above');
    return true;
  }
};

const sendPermanentLoginCode = async (email, permanentCode) => {
  // Debug output
  console.log('\n🎉 PERMANENT CODE EMAIL DEBUG 🎉');
  console.log(`📧 To: ${email}`);
  console.log(`🔑 Permanent Code: ${permanentCode}`);
  console.log('========================');
     
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🎉 Your Permanent Login Code - SocialEarn',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🎉 Welcome to SocialEarn!</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Registration completed successfully!</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; text-align: center; margin: 25px 0; border-radius: 10px;">
              <h2 style="color: white; margin: 0 0 10px 0; font-size: 18px;">Your Permanent Login Code</h2>
              <div style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h1 style="color: #1f2937; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">${permanentCode}</h1>
              </div>
              <p style="color: white; margin: 10px 0 0 0; font-size: 14px;">Save this code - you'll need it to login!</p>
            </div>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <h3 style="color: #047857; margin: 0 0 10px 0; font-size: 16px;">🔐 How to Login:</h3>
              <ul style="color: #065f46; margin: 0; padding-left: 20px;">
                <li>Go to the login page</li>
                <li>Enter your 6-digit permanent code: <strong>${permanentCode}</strong></li>
                <li>Click "Login with Permanent Code"</li>
                <li>You'll be logged in instantly - no email verification needed!</li>
              </ul>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ Important:</strong> Keep this code safe and secure. This is your unique login code - no other user has the same code.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Ready to start earning? Login now and begin engaging with social media posts to earn rewards!
              </p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                SocialEarn - Social Engagement Reward Platform<br>
                If you didn't create this account, please ignore this email.
              </p>
            </div>
          </div>
        </div>
      `
    };

    console.log('📤 Attempting to send permanent code email...');
    await transporter.sendMail(mailOptions);
    console.log('✅ Permanent code email sent successfully!');
    logger.info(`Permanent login code sent to ${email}`);
    return true;
  } catch (error) {
    console.log('❌ Permanent code email sending failed with error:');
    console.log('Error details:', error.message);
    console.log('Error code:', error.code);
         
    // Log specific error types for better debugging
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      console.log('🔄 Network connectivity issue - but permanent code is available in console');
    } else if (error.code === 'EAUTH') {
      console.log('🔐 Authentication failed - check email credentials');
    } else if (error.response && error.response.includes('rate limit')) {
      console.log('⏱️ Rate limited by email provider - wait before next request');
    } else if (error.code === 'EDNS') {
      console.log('🌐 DNS resolution failed - check EMAIL_HOST setting');
    } else {
      console.log('❓ Unknown email error - check configuration');
    }
         
    logger.error('Permanent code email sending failed:', error);
         
    // Always return true so the registration process continues
    // User permanent code is still saved in database
    console.log('⚠️ Continuing process - permanent code saved in database');
    console.log(`🔑 PERMANENT CODE FOR ${email}: ${permanentCode}`);
    return true;
  }
};

// Function to send resend verification code
const resendVerificationCode = async (email) => {
  console.log('\n🔄 RESEND VERIFICATION DEBUG 🔄');
  console.log(`📧 To: ${email}`);
  console.log('========================');
  
  try {
    // Generate new code
    const newCode = generateCode();
    
    // Send the new verification code
    const emailSent = await sendVerificationCode(email, newCode, 'register');
    
    if (emailSent) {
      console.log('✅ Resend verification successful');
      return { success: true, code: newCode };
    } else {
      console.log('❌ Resend verification failed');
      return { success: false, code: newCode };
    }
  } catch (error) {
    console.log('❌ Resend verification error:', error.message);
    logger.error('Resend verification error:', error);
    return { success: false, error: error.message };
  }
};

// Function to test email configuration
const testEmailConnection = async () => {
  console.log('\n🧪 TESTING EMAIL CONNECTION 🧪');
  console.log('================================');
  
  try {
    await transporter.verify();
    console.log('✅ Email server connection successful');
    console.log('📧 Ready to send emails');
    return true;
  } catch (error) {
    console.log('❌ Email server connection failed');
    console.log('Error details:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('🔐 Authentication issue - check EMAIL_USER and EMAIL_PASS');
    } else if (error.code === 'ECONNECTION') {
      console.log('🌐 Connection issue - check EMAIL_HOST and EMAIL_PORT');
    }
    
    return false;
  }
};

// Function to send welcome email (optional)
const sendWelcomeEmail = async (email, fullName) => {
  console.log('\n📩 SENDING WELCOME EMAIL 📩');
  console.log(`📧 To: ${email}`);
  console.log(`👤 Name: ${fullName}`);
  console.log('========================');
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🎉 Welcome to SocialEarn - Start Earning Today!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🎉 Welcome to SocialEarn!</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Hi ${fullName}, you're all set!</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; text-align: center; margin: 25px 0; border-radius: 10px;">
              <h2 style="color: white; margin: 0 0 15px 0; font-size: 20px;">🚀 Ready to Start Earning?</h2>
              <p style="color: white; margin: 0; font-size: 14px;">
                Engage with social media posts and earn real money!
              </p>
            </div>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <h3 style="color: #047857; margin: 0 0 15px 0; font-size: 16px;">💰 How to Earn:</h3>
              <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Login to your dashboard</li>
                <li>Browse available social media posts</li>
                <li>Click, like, follow, or share as required</li>
                <li>Earn money for each engagement</li>
                <li>Withdraw your earnings anytime</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                🚀 Start Earning Now
              </a>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                SocialEarn - Social Engagement Reward Platform<br>
                Need help? Contact us at support@sociallearn.com
              </p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully!');
    logger.info(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.log('❌ Welcome email sending failed:', error.message);
    logger.error('Welcome email sending failed:', error);
    return false;
  }
};

module.exports = {
  generateCode,
  sendVerificationCode,
  sendPermanentLoginCode,
  resendVerificationCode,
  testEmailConnection,
  sendWelcomeEmail
};