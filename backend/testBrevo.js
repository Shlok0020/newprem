require('dotenv').config();

const testEmail = async () => {
  const payload = {
    sender: { name: "New Prem Glass House", email: process.env.EMAIL_USER || "newpremglasshouse75@gmail.com" },
    to: [{ email: "newpremglasshouse75@gmail.com" }],
    subject: "Brevo Test",
    htmlContent: "<p>Testing Brevo HTTP API!</p>"
  };

  try {
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
      console.error('Brevo API Error:', data);
      process.exit(1);
    }
    console.log('Brevo Success:', data);
    process.exit(0);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
};

testEmail();
