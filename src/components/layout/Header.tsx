import { useEffect, useState, useSyncExternalStore } from "react";
import { getAdminProfile } from "../../api/admin";
import type { AdminProfile } from "../../api/admin";
import {
  getSession,
  getSessionGeneration,
  subscribeSession,
} from "../../auth/session";
import profile from "../../assets/layout/profile.png";

export default function Header() {
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    () => null,
  );
  const generation = getSessionGeneration();
  const [account, setAccount] = useState<{
    generation: number;
    profile?: AdminProfile;
    error?: string;
  } | null>(null);
  const currentAccount = account?.generation === generation ? account : null;

  useEffect(() => {
    let active = true;

    if (session) {
      void getAdminProfile().then(
        (profile) => {
          if (active) setAccount({ generation, profile });
        },
        (error: unknown) => {
          if (active)
            setAccount({
              generation,
              error:
                error instanceof Error
                  ? error.message
                  : "계정 정보를 확인하지 못했습니다.",
            });
        },
      );
    }

    return () => {
      active = false;
    };
  }, [generation, session]);

  const jurisdiction = currentAccount?.profile
    ? (currentAccount.profile.jurisdiction ?? "미지정")
    : currentAccount?.error
      ? "확인 불가"
      : "확인 중";

  const date =
    currentAccount?.profile?.timeStamp ??
    (currentAccount?.profile || currentAccount?.error
      ? "확인 불가"
      : "확인 중");

  return (
    <header className="flex min-h-[68px] shrink-0 flex-wrap items-center justify-end gap-3 border-b border-[#c8d0d7] bg-white px-6 py-3 text-[15px] leading-5">
      <span className="max-sm:hidden">업무일자: {date}</span>

      <span
        aria-hidden="true"
        className="h-4 w-px bg-[#f4f5f6] max-sm:hidden"
      />

      <span title={currentAccount?.error}>관할 {jurisdiction}</span>

      <span aria-hidden="true" className="h-4 w-px bg-[#f4f5f6]" />

      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f4f5f6]">
          <img src={profile} alt="" width={24} height={24} />
        </span>
        {currentAccount?.profile?.name ?? session?.name ?? "운영자"}
      </span>
    </header>
  );
}
