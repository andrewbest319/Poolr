import { redirect } from "next/navigation";

type SearchParams =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

function getFirstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function safeReturnPath(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value === "/login" || value === "/account") return null;
  return value;
}

export default async function LoginRedirectPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const returnTo = safeReturnPath(getFirstParam(params.returnTo));

  if (returnTo) {
    redirect(`/account?returnTo=${encodeURIComponent(returnTo)}`);
  }

  redirect("/account");
}
