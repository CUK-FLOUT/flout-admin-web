import type { ReactNode } from "react";
import logo from "../../assets/login/FLOUT_logo.png";
import circleBottom from "../../assets/login/circle-bottom.png";
import circleTop from "../../assets/login/circle-top.png";
import featureDot from "../../assets/login/feature-dot.png";

type Props = {
  children: ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <main className="flout-admin-auth grid min-h-dvh w-full bg-[#f4f5f6] text-left text-[#202b36] lg:grid-cols-[minmax(0,580fr)_minmax(0,860fr)]">
      <aside className="relative isolate overflow-hidden bg-[#183b58] text-white lg:min-h-[900px]">
        <img
          src={circleBottom}
          alt=""
          aria-hidden="true"
          width={520}
          height={520}
          className="pointer-events-none absolute left-[-260px] top-[640px] hidden max-w-none lg:block"
        />

        <img
          src={circleTop}
          alt=""
          aria-hidden="true"
          width={320}
          height={320}
          className="pointer-events-none absolute left-[calc(100%_-_170.54px)] top-[-146.51px] hidden max-w-none lg:block"
        />

        <div className="relative z-10 px-6 py-8 lg:px-10 lg:py-[72px] xl:px-[72px]">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt=""
              width={48}
              height={38}
              className="h-[37.714px] w-12 shrink-0 rounded object-cover"
            />

            <span className="text-[28px] font-bold leading-[38px]">FLOUT</span>
          </div>

          <span className="mt-6 inline-flex rounded-2xl bg-white/[0.12] px-3 py-[7px] text-xs font-bold leading-[14px] lg:mt-[74px]">
            FLOUT ADMIN
          </span>

          <h1 className="mt-6 break-keep text-[28px] font-bold leading-10 lg:mt-[39px] xl:text-[36px] xl:leading-[50px]">
            현장부터 지원까지
            <br />
            한눈에 관리하세요
          </h1>

          <p className="mt-[22px] hidden break-keep text-base leading-[26px] text-[#d1dee8] lg:block">
            침수 예방 업무의 접수·점검·지원·시공 현황을
            <br className="hidden xl:block" />
            하나의 관리 시스템에서 빠르게 확인할 수 있습니다.
          </p>

          <ul className="mt-[56px] hidden list-none space-y-[18px] p-0 lg:block">
            {[
              "신청·점검 현황 통합 관리",
              "지원 승인 및 시공 진행 관리",
              "지역·공공시설 위험 정보 확인",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-[15px] font-medium leading-6"
              >
                <img
                  src={featureDot}
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={24}
                  className="shrink-0"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section
        aria-label="운영자 로그인"
        className="flex min-w-0 items-center justify-center px-5 py-10 lg:px-10 lg:py-[60px]"
      >
        <div className="w-full max-w-[520px] rounded-2xl border border-[#cbd5e1] bg-white px-6 py-10 shadow-[0_10px_30px_rgba(15,23,42,0.1)] sm:px-[50px] sm:py-12 lg:min-h-[660px]">
          {children}
        </div>
      </section>
    </main>
  );
}
