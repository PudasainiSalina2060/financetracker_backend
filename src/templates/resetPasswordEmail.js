export const resetPasswordTemplate = ({ name, resetLink }) => {
  return `<p>Hello ${name},</p>

  <p>We received a request to reset your <strong>Smart Budget</strong> password.</p>

  <p>
    <a href="${resetLink}">Reset your password</a>
  </p>

  <p>This link will expire in 10 minutes.</p>

  <p>If you did not request this, please ignore this email.</p>

  <p> ~Smart Budget Team</p>
  `;
};
