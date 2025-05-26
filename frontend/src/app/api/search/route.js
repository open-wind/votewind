export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  const all = ['Brighton', 'Histon', 'London', 'Bristol', 'Hiscox'];
  const results = all.filter((item) => item.toLowerCase().includes(q)).slice(0, 5);

  return Response.json({ results });
}
