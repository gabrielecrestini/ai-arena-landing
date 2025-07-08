import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export default async function handler(req, res) {
  const { product } = req.query;
  const fileMap = {
    modulo1: 'modulo1.pdf',
    modulo2: 'modulo2.pdf',
    completo: 'pacchetto-completo.pdf',
  };

  const filename = fileMap[product];
  if (!filename) {
    return res.status(400).json({ error: 'Prodotto non valido' });
  }

  try {
    const { data, error } = await supabase.storage
      .from('downloads')
      .createSignedUrl(filename, 3600);

    if (error || !data?.signedUrl) {
      return res.status(500).json({ error: 'Errore nella generazione del link' });
    }

    return res.redirect(data.signedUrl);
  } catch (err) {
    console.error('Errore server:', err);
    return res.status(500).json({ error: 'Errore interno' });
  }
}
