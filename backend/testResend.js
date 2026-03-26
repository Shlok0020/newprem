require('dotenv').config();
const { Resend } = require('resend');

const testEmail = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY in .env');
    return process.exit(1);
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'newpremglasshouse75@gmail.com',
      subject: 'Resend Test',
      html: '<p>Testing Resend integration from Glasshouse Backend!</p>'
    });

    if (error) {
      console.error('Verification Error:', error);
      process.exit(1);
    }

    console.log('Verification Success:', data);
    process.exit(0);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
};

testEmail();
