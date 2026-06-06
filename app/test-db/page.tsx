import { supabase } from "../../lib/supabase";

export default async function TestDbPage() {
  const { data, error } = await supabase.from("pools").select("*");

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <h1 className="mb-4 text-2xl font-bold">Supabase Test</h1>

      {error ? (
        <pre className="rounded-xl bg-red-950 p-4 text-red-200">
          {JSON.stringify(error, null, 2)}
        </pre>
      ) : (
        <pre className="rounded-xl bg-zinc-900 p-4 text-zinc-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}