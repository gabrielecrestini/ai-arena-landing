import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const productFiles = {
  modulo1: 'modulo1.pdf',
  modulo2: 'modulo2.pdf',
  completo: 'pacchetto-completo.pdf'
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { product } = req.query;
  if (!product || !productFiles[product]) {
    return res.status(400).json({ error: 'Prodotto non valido' });
  }

  const { data, error } = await supabase
    .storage
    .from('downloads')
    .createSignedUrl(productFiles[product], 60 * 60); // valido 1 ora

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Errore generazione link' });
  }

  res.status(200).json({ url: data.signedUrl });
}
