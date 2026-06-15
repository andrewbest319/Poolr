import { redirect } from "next/navigation";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function getFirstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function BuildTeamRedirectPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = await Promise.resolve(searchParams ?? {});

  const poolId =
    getFirstParam(params.poolId) ||
    getFirstParam(params.pool_id) ||
    getFirstParam(params.id);

  if (poolId) {
    redirect(`/pool/${encodeURIComponent(poolId)}/build-team`);
  }

  redirect("/create-pool");
}