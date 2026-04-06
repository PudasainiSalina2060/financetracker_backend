export const resetPasswordTemplate = ({ name, resetLink }) => {
  const token = resetLink.split('token=')[1];
  return `<p>Hello ${name},</p>

  <p>We received a request to reset your <strong>Smart Budget</strong> password.</p>

  <p>Open the Smart Budget app and enter this reset token:</p>

  <div style="
    background-color: #f0f0f0;
    padding: 15px;
    border-radius: 8px;
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 2px;
    text-align: center;
    margin: 20px 0;
  ">
    ${token}
  </div>

  <p>This link will expire in 10 minutes.</p>

  <p>If you did not request this, please ignore this email.</p>

  <p> ~Smart Budget Team</p>
  `;
};
