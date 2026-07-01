import nodemailer from "nodemailer";

const user = process.env.SMTP_USER;
// Gmail app passwords are shown with spaces; strip them.
const pass = (process.env.SMTP_PASS ?? "").replace(/\s+/g, "");
const FROM = process.env.MAIL_FROM ?? (user ? `VedMedAgri <${user}>` : "VedMedAgri <no-reply@vedmedagri.net>");

export const mailerEnabled = !!(user && pass);

const transporter = mailerEnabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: true,
      auth: { user: user!, pass },
    })
  : null;

export async function sendPasswordReset(to: string, link: string): Promise<void> {
  if (!transporter) throw new Error("Mailer not configured");
  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Reset your VedMedAgri password",
    text: `Reset your VedMedAgri password using this link (valid for 1 hour):\n\n${link}\n\nIf you didn't request this, you can ignore this email.`,
    html: resetTemplate(link),
  });
}

function resetTemplate(link: string): string {
  const brand = "#0f766e";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:${brand};padding:22px 28px;">
              <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">VedMedAgri</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Reset your password</h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#475569;">
                We received a request to reset your VedMedAgri account password. Click the button below to choose a new one. This link is valid for <strong>1 hour</strong>.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="border-radius:12px;background:${brand};">
                  <a href="${link}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">Reset password</a>
                </td>
              </tr></table>
              <p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#94a3b8;">
                If the button doesn't work, copy this link into your browser:<br>
                <a href="${link}" style="color:${brand};word-break:break-all;">${link}</a>
              </p>
              <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">
                Didn't request this? You can safely ignore this email — your password won't change.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #e2e8f0;">
              <span style="font-size:12px;color:#94a3b8;">© VedMedAgri · Veterinary &amp; agricultural supplies</span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
