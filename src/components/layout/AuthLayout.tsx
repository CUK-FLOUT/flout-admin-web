import type { ReactNode } from "react";
import logo from "../../assets/login/FLOUT_logo.png";
import circleBottom from "../../assets/login/circle-bottom.png";
import circleTop from "../../assets/login/circle-top.png";
import featureDot from "../../assets/login/feature-dot.png";

type Props = { children: ReactNode; variant?: "login" | "signup" };

export default function AuthLayout({ children, variant = "login" }: Props) {
  const signup = variant === "signup";
  return (
    <main className="grid min-h-dvh bg-[#f4f5f6] text-[#202b36] lg:grid-cols-[minmax(380px,580fr)_minmax(0,860fr)]">
      <aside className="relative overflow-hidden bg-[#183b58] text-white lg:min-h-[900px]">
        <img
          src={circleBottom}
          alt=""
          aria-hidden="true"
          width={520}
          height={520}
          className="pointer-events-none absolute left-[-210px] top-[560px] hidden h-[520px] w-[520px] max-w-none lg:block"
        />
        <img
          src={circleTop}
          alt=""
          aria-hidden="true"
          width={320}
          height={320}
          className="pointer-events-none absolute right-[-120px] top-[-120px] h-[320px] w-[320px] max-w-none"
        />
        <div className="relative z-10 px-6 py-8 lg:px-10 lg:py-[72px] xl:px-[72px]">
          <div className="flex items-center gap-3">
            <span className="relative block h-[37.714px] w-12 shrink-0 overflow-hidden rounded">
              <img
                src={logo}
                alt=""
                className="absolute left-[-23.08%] top-[-29.42%] h-[158.83%] w-[138.47%] max-w-none"
              />
            </span>
            <span className="text-[28px] font-bold leading-[38px]">FLOUT</span>
          </div>
          <span className="mt-6 inline-block rounded-2xl bg-white/10 px-3 py-[7px] text-xs font-bold lg:mt-[74px]">
            FLOUT ADMIN
          </span>
          <h1 className="mt-5 break-keep text-[26px] font-bold leading-9 tracking-[-0.03em] lg:mt-[38px] lg:text-[32px] lg:leading-[50px] xl:text-[36px]">
            {signup ? (
              <>
                안전한 지역을 위한
                <br />
                운영자 계정을 시작하세요
              </>
            ) : (
              <>
                현장부터 지원까지
                <br />
                한눈에 관리하세요
              </>
            )}
          </h1>
          <p className="mt-[22px] hidden break-keep text-base leading-[26px] text-[#d1dee8] lg:block">
            침수 예방 업무의 접수·점검·지원·시공 현황을
            <br className="hidden xl:block" />
            하나의 관리 시스템에서 빠르게 확인할 수 있습니다.
          </p>
          <ul className="mt-14 hidden space-y-[18px] lg:block">
            {[
              "신청·점검 현황 통합 관리",
              "지원 승인 및 시공 진행 관리",
              "지역·공공시설 위험 정보 확인",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-[15px] font-medium"
              >
                <img
                  src={featureDot}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="flex min-w-0 items-center justify-center px-5 py-10 lg:px-10 lg:py-[70px]">
        <div
          className={`w-full rounded-2xl border border-[#cbd5e1] bg-white px-6 shadow-[0_10px_30px_rgba(15,23,42,0.1)] sm:px-[50px] ${signup ? "max-w-[620px] py-10 lg:min-h-[760px]" : "max-w-[520px] py-12 lg:min-h-[660px]"}`}
        >
          {children}
        </div>
      </section>
    </main>
  );
}
