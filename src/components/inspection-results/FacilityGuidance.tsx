export default function FacilityGuidance() {
  return (
    <>
      <div className="flex flex-col gap-1 rounded-md bg-[#f3f8fc] px-3 py-[10px] text-xs leading-[18px] text-[#264d6e]">
        <h4 className="font-bold">지원사업 연계 안내</h4>
        <p>
          권장 예방조치에서 시설명을 추출하고, 이를 기반으로 AI가 관련 지원사업을
          추천합니다.
        </p>
        <p className="text-[#617080]">
          지원사업 연계를 위해 &apos;물막이판 설치&apos; 등 구체적인 시설명을 포함해
          주세요.
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-[#d4dee8] bg-[#fbfcfd] px-3 py-[10px] text-xs leading-[18px] text-[#3d4d5e]">
        <h4 className="font-bold text-[#264d6e]">작성 예시</h4>
        <p>시설명 포함: 출입구에 물막이판 설치를 권장합니다.</p>
        <p>시설명 없음: 출입구 침수에 주의하세요.</p>
        <p className="text-[#5c6e7d]">
          시설명 예시: 물막이판 · 차수판 · 역류방지밸브 · 배수펌프
        </p>
      </div>
    </>
  );
}
