import nodemailer from "nodemailer";

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendResetPasswordEmail = async ({ to, subject, text, html}) => {
  const mailDetails = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  return mailTransporter.sendMail(mailDetails);
};

//generate a random 6 digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

//send OTP to users email
export const sendOTPEmail = async (email, otp) => {
  await sendResetPasswordEmail({
    to: email,
    subject: "Verify Your Email - SmartBudget",
    html: `
      <h2>Email Verification</h2>
      <p>Your OTP code is:</p>
      <h1 style="color: teal; letter-spacing: 8px;">${otp}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
  });
};
