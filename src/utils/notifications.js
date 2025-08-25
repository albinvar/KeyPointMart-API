const nodemailer = require('nodemailer');
const twilio = require('twilio');
const config = require('../config/config');

// Email transporter setup
const createEmailTransporter = () => {
  if (config.email.host && config.email.user && config.email.pass) {
    return nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port || 587,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }
  return null;
};

// SMS client setup
const createSMSClient = () => {
  if (config.sms.accountSid && config.sms.authToken) {
    return twilio(config.sms.accountSid, config.sms.authToken);
  }
  return null;
};

// Email templates
const emailTemplates = {
  'email-verification': (data) => ({
    subject: 'Verify Your KeyPointMart Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">KeyPointMart</h1>
          <p style="color: white; margin: 10px 0 0; font-size: 16px;">Your Key to Local Commerce</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #2C2C2C; margin: 0 0 20px;">Welcome ${data.name}!</h2>
          <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">
            Thank you for joining KeyPointMart. To get started, please verify your email address by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/verify-email/${data.token}" 
               style="background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666666; font-size: 14px; margin: 20px 0 0;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
        
        <div style="padding: 20px; background: white; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999999; font-size: 12px; margin: 0;">
            © 2024 KeyPointMart. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),
  
  'password-reset': (data) => ({
    subject: 'Password Reset - KeyPointMart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">KeyPointMart</h1>
          <p style="color: white; margin: 10px 0 0; font-size: 16px;">Password Reset Request</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #2C2C2C; margin: 0 0 20px;">Hi ${data.name},</h2>
          <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reset-password/${data.resetToken}" 
               style="background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666666; font-size: 14px; margin: 20px 0 0;">
            This link will expire in 15 minutes. If you didn't request this reset, please ignore this email.
          </p>
        </div>
        
        <div style="padding: 20px; background: white; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999999; font-size: 12px; margin: 0;">
            © 2024 KeyPointMart. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),
  
  'order-confirmation': (data) => ({
    subject: `Order Confirmation - ${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">KeyPointMart</h1>
          <p style="color: white; margin: 10px 0 0; font-size: 16px;">Order Confirmed!</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #2C2C2C; margin: 0 0 20px;">Hi ${data.customerName},</h2>
          <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">
            Your order <strong>#${data.orderNumber}</strong> has been confirmed and is being prepared by ${data.shopName}.
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #FF6B35; margin: 0 0 15px;">Order Details</h3>
            <p style="margin: 5px 0;"><strong>Order Number:</strong> #${data.orderNumber}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${data.total}</p>
            <p style="margin: 5px 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>
          </div>
        </div>
        
        <div style="padding: 20px; background: white; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999999; font-size: 12px; margin: 0;">
            © 2024 KeyPointMart. All rights reserved.
          </p>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async ({ to, subject, template, data, html, text }) => {
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    console.log('Email configuration not found. Email not sent.');
    return { success: false, message: 'Email configuration not found' };
  }

  try {
    let emailContent = {};

    if (template && emailTemplates[template]) {
      emailContent = emailTemplates[template](data);
    } else {
      emailContent = { subject, html, text };
    }

    const mailOptions = {
      from: `"KeyPointMart" <${config.email.user}>`,
      to,
      subject: emailContent.subject || subject,
      html: emailContent.html || html,
      text: emailContent.text || text
    };

    const result = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send SMS function
const sendSMS = async ({ to, message }) => {
  const client = createSMSClient();
  
  if (!client) {
    console.log('SMS configuration not found. SMS not sent.');
    return { success: false, message: 'SMS configuration not found' };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: config.sms.phoneNumber,
      to: to
    });

    return {
      success: true,
      sid: result.sid
    };
  } catch (error) {
    console.error('SMS sending failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send push notification (placeholder)
const sendPushNotification = async ({ userId, title, message, data }) => {
  // Implementation depends on push notification service (FCM, etc.)
  console.log(`Push notification to user ${userId}: ${title} - ${message}`);
  return { success: true };
};

// Send notification (unified function)
const sendNotification = async ({ 
  type, // 'email', 'sms', 'push', 'all'
  to, 
  userId,
  subject, 
  message, 
  template, 
  data 
}) => {
  const results = {};

  if (type === 'email' || type === 'all') {
    results.email = await sendEmail({
      to,
      subject,
      template,
      data
    });
  }

  if (type === 'sms' || type === 'all') {
    results.sms = await sendSMS({
      to,
      message: message || subject
    });
  }

  if (type === 'push' || type === 'all') {
    results.push = await sendPushNotification({
      userId,
      title: subject,
      message,
      data
    });
  }

  return results;
};

module.exports = {
  sendEmail,
  sendSMS,
  sendPushNotification,
  sendNotification
};