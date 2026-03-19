import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendPasswordResetOtp(
  toEmail: string,
  firstName: string,
  otp: string,
): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Workpilot <onboarding@resend.dev>";
  await getResend().emails.send({
    from,
    to: toEmail,
    subject: "Dein Workpilot Bestätigungscode",
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:24px 32px;">
            <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
              Workpilot
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">
              Passwort zurücksetzen
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#71717a;line-height:1.6;">
              Hallo ${firstName},<br/>
              wir haben eine Anfrage erhalten, dein Passwort zu ändern.
              Hier ist dein 6-stelliger Bestätigungscode:
            </p>
            <!-- OTP Box -->
            <div style="text-align:center;margin:0 0 28px;">
              <span style="display:inline-block;background:#f4f4f5;border-radius:12px;
                           padding:20px 36px;font-size:40px;font-weight:800;letter-spacing:8px;
                           color:#18181b;font-family:monospace;">
                ${otp}
              </span>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;text-align:center;">
              Dieser Code ist <strong>15 Minuten</strong> gültig.
            </p>
            <p style="margin:0;font-size:13px;color:#a1a1aa;text-align:center;">
              Falls du diese Anfrage nicht gestellt hast, kannst du die E-Mail ignorieren.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;border-top:1px solid #f4f4f5;
                     padding:16px 32px;font-size:12px;color:#a1a1aa;">
            Workpilot — Dein Freelancer-Dashboard
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
