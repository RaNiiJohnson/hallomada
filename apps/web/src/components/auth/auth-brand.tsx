import { Link } from "@/i18n/navigation";
import { righteous } from "@/web/fonts";
import { Logo } from "@/web/logo";

/** Logo + wordmark at the top of the login and register cards. */
export function AuthBrand() {
  return (
    <Link
      href="/"
      className="mx-auto flex w-fit items-center gap-2 transition hover:opacity-80"
    >
      <Logo className="size-9" />
      <span
        className={`${righteous.className} text-2xl leading-none text-primary`}
      >
        Hallomada
      </span>
    </Link>
  );
}
