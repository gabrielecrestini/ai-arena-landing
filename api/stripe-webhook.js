import { buffer } from 'micro';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

// ⚙️ Inizializza Stripe e Supabase
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 🚀 FUNZIONE: genera link temporaneo da Supabase
async function generateSupabaseLink(filePath = 'pacchetto-completo.pdf') {
  const { data, error } = await supabase.storage
    .from('downloads') // nome del bucket Supabase
    .createSignedUrl(filePath, 60 * 60); // 1 ora

  if (error) throw new Error('Errore Supabase: ' + error.message);
  return data.signedUrl;
}

// 💌 FUNZIONE: invia email con Nodemailer
async function sendConfirmationEmail(toEmail, downloadLink) {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // o smtp
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Digital Launch OS" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: '✅ Il tuo pacchetto è pronto!',
    html: `
      <h2 style="color:#2ecc71;">Grazie per l'acquisto!</h2>
      <p>Hai sbloccato il <strong>Pacchetto Completo</strong>.</p>
      <p>Clicca qui per scaricare il tuo contenuto: <br>
      👉 <a href="${downloadLink}" target="_blank">Scarica PDF</a></p>
      <p style="font-size: 0.9em; color: gray;">Il link sarà valido per 1 ora.</p>
    `,
  });
}

// 🎯 FUNZIONE PRINCIPALE: webhook Stripe
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🔁 Evento: acquisto confermato
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;

    try {
      const downloadLink = await generateSupabaseLink();
      await sendConfirmationEmail(email, downloadLink);
      console.log(`✅ Email inviata a ${email}`);
    } catch (error) {
      console.error('Errore durante invio email o generazione link:', error);
      return res.status(500).send('Errore interno');
    }
  }

  res.status(200).json({ received: true });
}
