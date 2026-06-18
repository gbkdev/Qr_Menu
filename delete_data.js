const url = 'https://tzocwexicxbpxrzsetej.supabase.co';
const key = 'sb_publishable_9-7B21pKPG3msG7hfaeBWA_VmsoUpKQ';
const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

async function clearTable(table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=id`, { headers });
  const rows = await r.json();
  if (!Array.isArray(rows)) return;
  console.log(`Deleting ${rows.length} from ${table}...`);
  for (const row of rows) {
    await fetch(`${url}/rest/v1/${table}?id=eq.${row.id}`, { method: 'DELETE', headers });
  }
}

async function run() {
  await clearTable('order_items');
  await clearTable('orders');
  await clearTable('menu_items');
  await clearTable('categories');
  console.log('All done!');
}
run().catch(console.error);
