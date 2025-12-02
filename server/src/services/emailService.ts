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

    const siteName = site?.address || 'la obra';

    console.log('='.repeat(60));
    console.log('📧 INVITACIÓN ENVIADA');
    console.log('='.repeat(60));
    console.log(`Para: ${email}`);
    console.log(`Obra: ${siteName}`);
    console.log(`Enlace: ${invitationLink}`);
    console.log('='.repeat(60));
    console.log('');
    console.log('Asunto: Has sido invitado a colaborar en Cimenta');
    console.log('');
    console.log(`Hola,`);
    console.log('');
    console.log(`Has sido invitado a colaborar en "${siteName}" en Cimenta.`);
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

    // TODO: Integrar con servicio de email real (Resend, SendGrid, etc.)
    // Por ahora solo logueamos el email en la consola
    
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
};
