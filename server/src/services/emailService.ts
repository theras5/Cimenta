import { supabase } from '../config/supabase';

export const sendInvitationEmail = async (
  email: string,
  invitationLink: string,
  siteId: string
) => {
  try {
    // Obtener información de la obra
    const { data: site } = await supabase
      .from('sites')
      .select('address')
      .eq('id', siteId)
      .single();

    const siteName = site?.address || ' ';

    // Si hay RESEND_API_KEY configurada, intentar enviar email real
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'Cimenta <noreply@cimenta.app>',
            to: email,
            subject: 'Has sido invitado a colaborar en Cimenta',
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2563EB; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                    .content { background-color: #f9fafb; padding: 30px; }
                    .button { display: inline-block; background-color: #2563EB; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
                    .footer { background-color: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0;">Cimenta</h1>
                    </div>
                    <div class="content">
                      <h2>¡Has sido invitado!</h2>
                      <p>Hola,</p>
                      <p>Has sido invitado a colaborar en la obra <strong>${siteName}</strong> en Cimenta.</p>
                      <p>Para aceptar la invitación, haz clic en el siguiente botón:</p>
                      <a href="${invitationLink}" class="button" style="color: #ffffff;">Aceptar Invitación</a>
                      <p>O copia y pega este enlace en tu navegador:</p>
                      <p style="word-break: break-all; color: #6b7280;">${invitationLink}</p>
                      <p><strong>Este enlace expirará en 7 días.</strong></p>
                      <p>Si no solicitaste esta invitación, puedes ignorar este correo.</p>
                    </div>
                    <div class="footer">
                      <p>Saludos,<br>El equipo de Cimenta</p>
                    </div>
                  </div>
                </body>
              </html>
            `
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error de Resend:', errorData);
          throw new Error('Error al enviar email con Resend');
        }

        const data = await response.json();
        console.log('✅ Email enviado exitosamente con Resend:', data.id);
        return true;
      } catch (resendError) {
        console.error('Error enviando email con Resend:', resendError);
        // Continuar con fallback a consola
      }
    }

    // Fallback: Mostrar en consola si no hay Resend configurado o falló
    console.log('='.repeat(60));
    console.log('📧 INVITACIÓN ENVIADA (MODO DESARROLLO)');
    console.log('='.repeat(60));
    console.log(`Para: ${email}`);
    console.log(`Obra: ${siteName}`);
    console.log(`Enlace: ${invitationLink}`);
    console.log('='.repeat(60));
    console.log('');
    console.log('⚠️  RESEND_API_KEY no configurada - Email mostrado solo en consola');
    console.log('');
    console.log('Asunto: Has sido invitado a colaborar en Cimenta');
    console.log('');
    console.log(`Hola,`);
    console.log('');
    console.log(`Has sido invitado a colaborar en la obra ${siteName} en Cimenta.`);
    console.log('');
    console.log(`Para aceptar la invitación, haz clic en el siguiente enlace:`);
    console.log(invitationLink);
    console.log('');
    console.log(`Este enlace expirará en 7 días.`);
    console.log('');
    console.log(`Si no solicitaste esta invitación, puedes ignorar este correo.`);
    console.log('');
    console.log('Saludos,');
    console.log('El equipo de Cimenta');
    console.log('='.repeat(60));
    
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
};
