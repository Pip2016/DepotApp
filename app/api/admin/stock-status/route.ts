import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Alle Symbole mit Statistiken
  const { data, error } = await supabase
    .from('stock_symbols')
    .select(
      `
      symbol,
      name,
      is_active,
      last_updated,
      created_at
    `
    )
    .order('symbol');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Datenpunkte pro Symbol zählen
  const statsPromises = (data || []).map(async (stock) => {
    const { count } = await supabase
      .from('stock_historical')
      .select('id', { count: 'exact', head: true })
      .eq('symbol', stock.symbol);

    const { data: latestData } = await supabase
      .from('stock_historical')
      .select('date, close')
      .eq('symbol', stock.symbol)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    return {
      ...stock,
      dataPoints: count || 0,
      latestDate: latestData?.date || null,
      latestClose: latestData?.close || null,
    };
  });

  const stocksWithStats = await Promise.all(statsPromises);

  return NextResponse.json({ stocks: stocksWithStats });
}
