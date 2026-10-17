// Mailer stub. Configure a real SMTP provider later and replace the body.
// Currently logs to console so OTP/dev flows are visible without credentials.
export const sendMail = async ({ to, subject, text }) => {
  console.log(`[mailer] To: ${to} | Subject: ${subject} | ${text}`);
  return true;
};
