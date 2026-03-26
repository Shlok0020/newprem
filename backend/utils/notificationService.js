// backend/utils/notificationService.js
// Sending emails via Brevo HTTPS API

// Only try to load twilio if credentials are provided
let twilio = null;
try {
  // Only require twilio if credentials exist and are valid
  if (process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    twilio = require('twilio');
    console.log('✅ Twilio module loaded');
  } else {
    console.log('⚠️ Twilio credentials not valid, WhatsApp disabled');
  }
} catch (error) {
  console.log('⚠️ Twilio module not available, WhatsApp disabled');
}

// Verify Brevo
if (process.env.BREVO_API_KEY) {
  console.log('✅ Brevo configured');
} else {
  console.log('⚠️ BREVO_API_KEY missing!');
}

// WhatsApp configuration (using Twilio) - only if twilio is available
let twilioClient = null;
if (twilio && process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Twilio client initialized successfully');
  } catch (error) {
    console.error('❌ Twilio initialization failed:', error.message);
    twilioClient = null;
  }
} else {
  console.log('📱 WhatsApp notifications are disabled (Twilio not configured)');
}

// Admin contact details
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'newpremglasshouse75@gmail.com';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP_NUMBER || 'whatsapp:+917328019093';

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

// Format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'short'
    });
  } catch (error) {
    return new Date(date).toString();
  }
};

/**
 * Send Email Notification with retry logic
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.BREVO_API_KEY) {
       console.error('❌ Failed to use Brevo API');
       return { success: false, error: 'Brevo API Key missing' };
    }
    
    const payload = {
      sender: { name: "New Prem Glass House", email: process.env.EMAIL_USER || "newpremglasshouse75@gmail.com" },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
      textContent: text || html?.replace(/<[^>]*>/g, '') || subject
    };

    console.log(`📧 Attempting to send email via Brevo HTTPS API to: ${to}`);

    // Using native fetch to bypass SMTP entirely
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Brevo API Error:', data);
      return { success: false, error: data.message || 'Brevo API request failed' };
    }

    console.log(`✅ Email sent successfully via Brevo to ${to}: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
    
  } catch (error) {
    console.error(`❌ Email sending failed:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp Notification via Twilio
 */
const sendWhatsApp = async ({ to, body }) => {
  // Skip if Twilio is not configured
  if (!twilioClient) {
    console.log('📱 WhatsApp notification skipped - Twilio not configured');
    return { success: false, skipped: true, message: 'Twilio not configured' };
  }

  try {
    // Ensure phone number is in correct format
    let formattedNumber = to;
    if (!formattedNumber.includes('whatsapp:')) {
      // Remove any non-digit characters except +
      const digits = formattedNumber.replace(/[^\d+]/g, '');
      formattedNumber = `whatsapp:${digits}`;
    }

    const message = await twilioClient.messages.create({
      body: body,
      from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
      to: formattedNumber
    });

    console.log(`✅ WhatsApp sent to ${to}:`, message.sid);
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('❌ WhatsApp sending failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send New Registration Notification to Admin
 */
const sendNewRegistrationNotification = async (userData) => {
  const { name, email, phone, role, createdAt } = userData;
  
  // Email HTML template
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #c9a96e, #a07840); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .detail-label { font-weight: bold; width: 120px; color: #c9a96e; }
        .badge { background: ${role === 'admin' ? '#ef4444' : '#10b981'}; color: white; padding: 3px 10px; border-radius: 20px; font-size: 12px; display: inline-block; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .button { background: #c9a96e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🆕 New User Registration</h1>
        </div>
        <div class="content">
          <p>A new user has registered on <strong>New Prem Glass House</strong>.</p>
          
          <div class="details">
            <h3>User Details:</h3>
            <div class="detail-row">
              <span class="detail-label">Name:</span>
              <span>${name || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span>${email || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Phone:</span>
              <span>${phone || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Role:</span>
              <span><span class="badge">${role || 'user'}</span></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Registered:</span>
              <span>${formatDate(createdAt)}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL || 'https://newpremglasshouse.in'}/admin/users" class="button">
              View in Admin Panel
            </a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} New Prem Glass House. All rights reserved.</p>
          <p>Bombay Chowk, Jharsuguda | +91 7328019093</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // WhatsApp message template
  const whatsappBody = `
🆕 *New User Registration - New Prem Glass House*

📋 *User Details:*
• Name: ${name}
• Email: ${email}
• Phone: ${phone}
• Role: ${role}
• Registered: ${formatDate(createdAt)}

View in Admin Panel: ${process.env.CLIENT_URL || 'https://newpremglasshouse.in'}/admin/users
  `.trim();

  // Send to admin
  const emailResult = await sendEmail({
    to: ADMIN_EMAIL,
    subject: '🆕 New User Registration - New Prem Glass House',
    html: emailHtml,
    text: whatsappBody.replace(/\*/g, '')
  });

  // Only send WhatsApp if it's configured
  let whatsappResult = { success: false, skipped: true };
  if (twilioClient) {
    whatsappResult = await sendWhatsApp({
      to: ADMIN_WHATSAPP,
      body: whatsappBody
    });
  } else {
    console.log('📱 WhatsApp notification skipped for new registration');
  }

  return { email: emailResult, whatsapp: whatsappResult };
};

/**
 * Send New Order Notification to Admin
 */
const sendNewOrderNotification = async (orderData) => {
  const { orderId, customerName, customerEmail, customerPhone, items, totalAmount, date, status } = orderData;

  // Generate items list for email
  const itemsList = items && items.length ? items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 0}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price || 0)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency((item.price || 0) * (item.quantity || 0))}</td>
      </tr>
  `).join('') : '<tr><td colspan="4" style="text-align: center;">No items</td></tr>';

  // Email HTML template
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #c9a96e, #a07840); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .detail-label { font-weight: bold; width: 120px; color: #c9a96e; }
        .status-badge { background: #f59e0b; color: white; padding: 3px 10px; border-radius: 20px; font-size: 12px; display: inline-block; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #c9a96e; color: white; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .total-row { font-weight: bold; background: #f0f0f0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .button { background: #c9a96e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 New Order Received</h1>
          <p style="font-size: 18px;">Order #${orderId || 'N/A'}</p>
        </div>
        <div class="content">
          <p>A new order has been placed on <strong>New Prem Glass House</strong>.</p>
          
          <div class="order-details">
            <h3>Customer Information:</h3>
            <div class="detail-row">
              <span class="detail-label">Name:</span>
              <span>${customerName || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span>${customerEmail || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Phone:</span>
              <span>${customerPhone || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Order Date:</span>
              <span>${date || formatDate(new Date())}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span><span class="status-badge">${status || 'pending'}</span></span>
            </div>
          </div>

          <h3>Order Items:</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding: 10px;"><strong>Total Amount:</strong></td>
                <td style="text-align: right; padding: 10px;"><strong>${formatCurrency(totalAmount || 0)}</strong></td>
              </tr>
            </tfoot>
          </table>

          <div style="text-align: center;">
            <a href="${process.env.ADMIN_URL || 'https://admin.newpremglasshouse.in'}/orders/${orderId}" class="button">
              View Order Details
            </a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} New Prem Glass House. All rights reserved.</p>
          <p>Bombay Chowk, Jharsuguda | +91 7328019093</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // WhatsApp message template
  const itemsSummary = items && items.length ? items.map(item => 
    `  • ${item.name} x${item.quantity} - ${formatCurrency((item.price || 0) * (item.quantity || 0))}`
  ).join('\n') : '  • No items';

  const whatsappBody = `
🛒 *NEW ORDER RECEIVED - New Prem Glass House*
━━━━━━━━━━━━━━━━━━━━━

📋 *Order #${orderId}*

👤 *Customer Details:*
• Name: ${customerName}
• Email: ${customerEmail}
• Phone: ${customerPhone}
• Date: ${date || formatDate(new Date())}

📦 *Order Items:*
${itemsSummary}

💰 *Total Amount: ${formatCurrency(totalAmount || 0)}*
📊 *Status: ${status || 'pending'}*

━━━━━━━━━━━━━━━━━━━━━
View in Admin Panel: ${process.env.ADMIN_URL || 'https://admin.newpremglasshouse.in'}/orders/${orderId}
  `.trim();

  // Send to admin
  const emailResult = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `🛒 New Order #${orderId} - New Prem Glass House`,
    html: emailHtml,
    text: whatsappBody.replace(/\*/g, '')
  });

  // Only send WhatsApp if it's configured
  let whatsappResult = { success: false, skipped: true };
  if (twilioClient) {
    whatsappResult = await sendWhatsApp({
      to: ADMIN_WHATSAPP,
      body: whatsappBody
    });
  } else {
    console.log('📱 WhatsApp notification skipped for new order');
  }

  return { email: emailResult, whatsapp: whatsappResult };
};

/**
 * Send Order Status Update Notification to Customer
 */
const sendOrderStatusNotification = async (orderData) => {
  const { orderId, customerName, customerEmail, customerPhone, status, items, totalAmount } = orderData;

  const statusColors = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444'
  };

  const statusEmojis = {
    pending: '⏳',
    processing: '🔄',
    shipped: '🚚',
    delivered: '✅',
    cancelled: '❌'
  };

  // Email HTML template for customer
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #c9a96e, #a07840); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .status-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .status-badge { background: ${statusColors[status] || '#6b7280'}; color: white; padding: 8px 20px; border-radius: 30px; font-size: 18px; display: inline-block; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .button { background: #c9a96e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusEmojis[status] || '📦'} Order Status Update</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${customerName || 'Customer'}</strong>,</p>
          <p>Your order status has been updated.</p>
          
          <div class="status-box">
            <h3>Order #${orderId || 'N/A'}</h3>
            <div class="status-badge">${(status || 'pending').toUpperCase()}</div>
            <p style="margin-top: 20px;">Total Amount: <strong>${formatCurrency(totalAmount || 0)}</strong></p>
          </div>

          <div style="text-align: center;">
            <p>Track your order status in real-time:</p>
            <a href="${process.env.CLIENT_URL || 'https://newpremglasshouse.in'}/my-orders/${orderId}" class="button">
              Track Order
            </a>
          </div>

          <p style="margin-top: 30px;">Thank you for shopping with New Prem Glass House!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} New Prem Glass House. All rights reserved.</p>
          <p>Bombay Chowk, Jharsuguda | +91 7328019093</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // WhatsApp message template for customer
  const whatsappBody = `
${statusEmojis[status] || '📦'} *ORDER STATUS UPDATE - New Prem Glass House*

Dear *${customerName || 'Customer'}*,

Your order *#${orderId || 'N/A'}* status has been updated to:

*${(status || 'pending').toUpperCase()}*

💰 *Total Amount:* ${formatCurrency(totalAmount || 0)}
📅 *Update Time:* ${formatDate(new Date())}

Track your order: ${process.env.CLIENT_URL || 'https://newpremglasshouse.in'}/my-orders/${orderId}

Thank you for choosing New Prem Glass House!
  `.trim();

  const results = [];

  // Send to customer if email exists
  if (customerEmail && customerEmail !== 'guest@example.com' && customerEmail !== 'N/A') {
    const emailResult = await sendEmail({
      to: customerEmail,
      subject: `${statusEmojis[status] || '📦'} Order #${orderId} Status: ${status || 'pending'}`,
      html: emailHtml,
      text: whatsappBody.replace(/\*/g, '')
    });
    results.push({ type: 'email', result: emailResult });
  }

  // Send to customer if phone exists and Twilio is configured
  if (customerPhone && customerPhone !== 'N/A' && customerPhone !== '' && twilioClient) {
    const whatsappResult = await sendWhatsApp({
      to: customerPhone,
      body: whatsappBody
    });
    results.push({ type: 'whatsapp', result: whatsappResult });
  } else if (customerPhone && customerPhone !== 'N/A' && customerPhone !== '') {
    console.log('📱 WhatsApp notification skipped for customer - Twilio not configured');
  }

  return results;
};

/**
 * Send Welcome Email to New User
 */
const sendWelcomeEmail = async (userData) => {
  const { name, email, role } = userData;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #c9a96e, #a07840); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .button { background: #c9a96e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to New Prem Glass House!</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${name || 'Customer'}</strong>,</p>
          <p>Thank you for registering with New Prem Glass House!</p>
          <p>Your account has been successfully created. You can now:</p>
          <ul>
            <li>Browse our premium glass products</li>
            <li>Track your orders in real-time</li>
            <li>Save your favorite items</li>
            <li>Get exclusive offers and updates</li>
          </ul>
          <div style="text-align: center;">
            <a href="${process.env.CLIENT_URL || 'https://newpremglasshouse.in'}/shop" class="button">
              Start Shopping
            </a>
          </div>
          <p style="margin-top: 30px;">If you have any questions, feel free to contact us.</p>
          <p>Best regards,<br>Team New Prem Glass House</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} New Prem Glass House. All rights reserved.</p>
          <p>Bombay Chowk, Jharsuguda | +91 7328019093</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: '🎉 Welcome to New Prem Glass House!',
    html: emailHtml
  });
};

/**
 * Send Verification Email to New User
 */
const sendVerificationEmail = async (email, code, name) => {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #c9a96e, #a07840); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
        .otp-box { background: #eee; font-size: 32px; letter-spacing: 5px; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; font-weight: bold; color: #a07840; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${name || 'Customer'}</strong>,</p>
          <p>Thank you for registering at New Prem Glass House! To complete your registration, please verify your email address using the following One-Time Password (OTP):</p>
          <div class="otp-box">${code}</div>
          <p>This code will expire in 10 minutes. Please do not share this code with anyone.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} New Prem Glass House. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: '🔐 Verify Your Email - New Prem Glass House',
    html: emailHtml
  });
};

/**
 * Send Password Reset Email
 */
const sendPasswordResetEmail = async (email, resetUrl, name) => {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #c9a96e, #a07840); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .button { background: #c9a96e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔑 Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${name || 'Customer'}</strong>,</p>
          <p>We received a request to reset the password for your New Prem Glass House account. If you made this request, click the button below to set a new password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p style="margin-top: 25px; font-size: 14px; color: #666;">This link will expire in 30 minutes. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} New Prem Glass House. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: '🔑 Password Reset Request - New Prem Glass House',
    html: emailHtml
  });
};

module.exports = {
  sendEmail,
  sendWhatsApp,
  sendNewRegistrationNotification,
  sendNewOrderNotification,
  sendOrderStatusNotification,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
};