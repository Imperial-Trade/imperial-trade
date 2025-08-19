export const getPasswordResetEmailTemplate = (resetUrl: string): string => {
  const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Password Reset Request</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
    /**
     * Google Font Import
     */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');

    /**
     * Reset styles
     */
    body, table, td, a {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
    }
    a[x-apple-data-detectors] {
      font-family: inherit !important;
      font-size: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
      color: inherit !important;
      text-decoration: none !important;
    }
    body {
      width: 100% !important;
      height: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      background-color: #f4f4f4; /* Light grey background */
    }
    table {
      border-collapse: collapse !important;
    }

    /* Button Styling */
    .button-a:hover {
      background-color: #b8860b !important; /* Darker Gold on hover */
    }

    /* Mobile Specific Styles */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .logo-text {
        font-size: 22px !important;
      }
      .logo-svg {
        width: 32px !important;
        height: 32px !important;
      }
    }
  </style>
</head>

<body style="background-color: #f4f4f4; margin: 0; padding: 0; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;">

  <!-- Preheader Text (Hidden) -->
  <div style="display: none; max-height: 0px; overflow: hidden; color: #f4f4f4;">
    A request to reset your password for Trade Imperial was received.
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">

    <!-- Header/Logo -->
    <tr>
      <td align="center" style="padding: 40px 0 30px 0;">
        <!-- Using a table for alignment of logo and text -->
        <table border="0" cellpadding="0" cellspacing="0" width="auto" style="margin: 0 auto;">
          <tr>
            <!-- Logo SVG -->
            <td style="padding-right: 12px;" valign="middle">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="logo-svg"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path><path d="M5 21h14"></path></svg>
            </td>
            <!-- Company Name -->
            <td valign="middle">
              <span class="logo-text" style="font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 28px; color: #000000; font-weight: 700;">
                Trade Imperial
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td align="center" style="padding: 0px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="email-container">

          <!-- Content Block -->
          <tr>
            <!-- White card background -->
            <td align="left" bgcolor="#ffffff" style="padding: 40px; color: #111111; font-size: 16px; line-height: 24px; border-radius: 12px; border: 1px solid #dddddd;">
              <h2 style="margin: 0 0 20px; font-size: 22px; font-weight: 700; color: #000000;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 20px; color: #555555;">
                We received a request to reset the password for your Trade Imperial account.
              </p>
              <p style="margin: 0 0 30px; color: #555555;">
                To proceed, please click the button below. This link is time-sensitive.
              </p>

              <!-- Button -->
              <table border="0" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td align="center">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Gold button color -->
                        <td bgcolor="#D4AF37" style="border-radius: 8px;">
                          <a href="${resetUrl}" target="_blank" class="button-a" style="background-color: #D4AF37; color: #000000; display: inline-block; font-size: 16px; font-weight: bold; padding: 15px 30px; text-decoration: none; border-radius: 8px;">
                            Set New Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- End Button -->

              <p style="margin: 30px 0 20px; color: #555555;">
                If you did not request a password reset, please ignore this email. Your account remains secure.
              </p>
              
              <p style="margin: 0; color: #555555;">
                Regards,<br>
                The Trade Imperial Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="center" style="font-size: 12px; line-height: 18px; color: #888888;">
              <p style="margin: 0;">
                &copy; 2025 Trade Imperial. All rights reserved.<br>
                <a href="https://tradeimperial.com" target="_blank" style="color: #D4AF37; text-decoration: underline;">tradeimperial.com</a> | support@tradeimperial.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
</body>
</html>`;

  return htmlTemplate;
};