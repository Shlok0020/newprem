require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    logger: true,
    debug: true,
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.verify();
    console.log('Verification Success:', info);
    process.exit(0);
  } catch (error) {
    console.error('Verification Error:', error);
    process.exit(1);
  }
};

testEmail();
