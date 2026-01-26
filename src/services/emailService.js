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
