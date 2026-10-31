import { useState } from "react";
import type { FormEvent } from "react";
import type { InspectionApplication } from "../../pages/Inspection/mockData";
import type {
  RegionIssue,
  ResultContent,
  ResultsDialogKind,
} from "../../pages/InspectionResults/types";
import { addressExamples } from "../../pages/InspectionResults/fixtures";
import ResultDialog from "./ResultDialog";
import { GrowingTextarea } from "./ResultFeedback";
import { resultInput, resultPrimary, resultSecondary } from "./styles";

type Props = {
  kind: ResultsDialogKind;
  application: InspectionApplication;
  content: ResultContent;
  setDialog: (kind: ResultsDialogKind | null) => void;
  onActions: (actions: string[]) => void;
  onRegion: (
    issue: Omit<RegionIssue, "id" | "source" | "status" | "applicationId">,
  ) => boolean;
  addressQuery: string;
  onSearchAddress: (query: string) => void;
};
function ActionsForm({
  content,
  onClose,
  onActions,
}: {
  content: ResultContent;
  onClose: () => void;
  onActions: (actions: string[]) => void;
}) {
  const [actions, setActions] = useState(() => [
    ...content.actions,
    ...(Array(Math.max(1, 4 - content.actions.length)).fill("") as string[]),
  ]);
  const [error, setError] = useState("");

  return (
    <ResultDialog size="actions" title="권장조치 목록 편집" onClose={onClose}>
      <p className="text-sm leading-[21px] text-[#64748b]">
        한 결과에 여러 조치를 등록할 수 있습니다. 설치시설과 행동 안내를 구분해
        작성하세요.
      </p>
      {actions.map((action, index) => (
        <input
          key={index}
          aria-label={`권장조치 ${index + 1}`}
          value={action}
          placeholder="추가 조치 입력"
          onChange={(e) =>
            setActions((values) =>
              values.map((v, i) => (i === index ? e.target.value : v)),
            )
          }
          className={`${resultInput} h-10 px-[15px] py-0`}
        />
      ))}
      {error && (
        <p role="alert" className="text-sm text-[#a53632]">
          {error}
        </p>
      )}
      <button
        type="button"
        className={resultPrimary}
        onClick={() => {
          const next = actions.map((s) => s.trim()).filter(Boolean);

          if (!next.length) {
            setError("권장조치를 1개 이상 입력해 주세요.");

            return;
          }

          onActions(next);
        }}
      >
        목록에 반영
      </button>
    </ResultDialog>
  );
}

function RegionForm({
  kind,
  application: a,
  setDialog,
  onRegion,
  addressQuery,
  onSearchAddress,
}: Props) {
  const [location, setLocation] = useState(`원미구 ${a.address}`);
  const [postcode, setPostcode] = useState("");
  const [type, setType] = useState("반복 침수");
  const [description, setDescription] = useState(
    "빗물받이 막힘 및 주변 도로 배수 상태 확인 필요",
  );
  const [findings, setFindings] = useState(
    "같은 골목에 배수구 덮개 주변에 이물질이 쌓여 있고, 역류방지 장치는 설치되어 있지 않아요.",
  );
  const [query, setQuery] = useState(addressQuery);
  const [addressError, setAddressError] = useState("");
  const [error, setError] = useState("");
  const addressOpen = kind === "address" || kind === "address-results";
  const results = addressExamples.filter((a) =>
    `${a.road} ${a.lot} ${a.postcode} ${a.building} ${a.keywords.join(" ")}`.includes(
      addressQuery.trim(),
    ),
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!location.trim() || !description.trim() || !findings.trim()) {
      setError("위치, 문제 내용, 현장 확인 내용을 모두 입력해 주세요.");

      return;
    }

    if (
      !onRegion({
        location: location.trim(),
        postcode,
        kind: type,
        description: description.trim(),
        findings: findings.trim(),
      })
    )
      setError("저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
  }

  return (
    <>
      <ResultDialog
        size="region"
        title="지역·공공 문제 등록"
        onClose={() => setDialog(null)}
      >
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label
            htmlFor="region-location"
            className="text-sm font-bold leading-[21px]"
          >
            위치
          </label>
          <div className="flex gap-2">
            <input
              id="region-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={`${resultInput} h-10 flex-1 px-[15px] py-0`}
            />
            <button
              type="button"
              onClick={() => setDialog("address")}
              className={`${resultSecondary} w-[112px] shrink-0 text-[#234f73]`}
            >
              주소 검색
            </button>
          </div>
          <p className="text-sm font-bold leading-[21px]">문제 유형</p>
          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label="지역 문제 유형"
          >
            {["반복 침수", "하수 역류", "도로 배수 불량", "빗물받이 막힘"].map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={type === value}
                  onClick={() => setType(value)}
                  className={type === value ? resultPrimary : resultSecondary}
                >
                  {value}
                </button>
              ),
            )}
          </div>
          <label
            htmlFor="region-description"
            className="text-sm font-bold leading-[21px]"
          >
            문제 내용
          </label>
          <input
            id="region-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${resultInput} h-10 px-[15px] py-0`}
          />
          <p className="text-sm font-bold leading-[21px]">현장 확인 내용</p>
          <GrowingTextarea
            label="지역 문제 현장 확인 내용"
            value={findings}
            onChange={setFindings}
            minHeight={62}
          />
          {error && (
            <p role="alert" className="text-sm leading-[21px] text-[#a53632]">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDialog(null)}
              className={`${resultSecondary} flex-1`}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={
                !location.trim() || !description.trim() || !findings.trim()
              }
              className={`${resultPrimary} flex-1`}
            >
              지역 문제 등록
            </button>
          </div>
        </form>
      </ResultDialog>
      {addressOpen && (
        <ResultDialog
          size="address"
          title="주소 검색"
          onClose={() => setDialog("region")}
        >
          <p className="text-sm leading-[22px] text-[#43515e]">
            도로명·건물명·지번으로 검색하세요.
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) {
                setAddressError("");
                onSearchAddress(query.trim());
              } else setAddressError("검색할 주소를 입력해 주세요.");
            }}
          >
            <input
              aria-label="도로명·건물명·지번 검색"
              placeholder="예) 길주로 210, 부천시청, 중동 1156"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAddressError("");
              }}
              className={`${resultInput} h-11 min-w-0 flex-1 border-[#234f73] px-[11px] py-0`}
            />
            <button
              className={`${resultPrimary} w-[112px] shrink-0`}
              type="submit"
            >
              검색
            </button>
          </form>
          {addressError && (
            <p role="alert" className="text-sm leading-[21px] text-[#a53632]">
              {addressError}
            </p>
          )}
          {kind === "address" ? (
            <>
              <div className="flex h-[324px] shrink-0 flex-col gap-4 rounded-lg bg-[#f4f5f6] px-6 pt-8 text-sm leading-[22px]">
                <h3 className="text-lg font-bold leading-[27px]">
                  이렇게 검색해 보세요
                </h3>
                <p className="font-bold">도로명 + 건물번호</p>
                <p className="text-[#596672]">예) 길주로 210</p>
                <p className="font-bold">지역명 + 건물명 또는 지번</p>
                <p className="text-[#596672]">예) 부천시청 / 중동 1156</p>
                <p className="text-[13px] leading-5 text-[#43515e]">
                  정확한 주소를 입력하면 더 쉽게 찾을 수 있어요.
                </p>
              </div>
              <p className="text-[13px] leading-5 text-[#596672]">
                주소를 선택하면 우편번호와 도로명주소가 자동 입력됩니다.
              </p>
            </>
          ) : (
            <>
              <p
                className="text-sm font-bold leading-[22px]"
                aria-live="polite"
              >
                검색 결과 {results.length}건
              </p>
              <div className="flex flex-col gap-2">
                {results.map((address) => (
                  <button
                    type="button"
                    key={address.postcode}
                    onClick={() => {
                      setLocation(address.road);
                      setPostcode(address.postcode);
                      setDialog("region");
                    }}
                    className="flex min-h-[112px] flex-col gap-2 rounded-md border border-[#c8d0d7] p-[15px] text-left text-sm leading-[22px]"
                  >
                    <span className="font-bold text-[#234f73]">
                      {address.postcode}
                    </span>
                    <strong>{address.road}</strong>
                    <span className="text-[13px] text-[#596672]">
                      지번 {address.lot} · {address.building}
                    </span>
                  </button>
                ))}
                {!results.length && (
                  <p
                    role="status"
                    className="py-12 text-center text-sm text-[#596672]"
                  >
                    검색 결과가 없습니다. 검색어를 변경해 주세요.
                  </p>
                )}
              </div>
              {!!results.length && (
                <nav
                  aria-label="주소 검색 페이지"
                  className="flex justify-center gap-4 text-sm text-[#234f73]"
                >
                  <button
                    type="button"
                    disabled
                    aria-label="이전 주소 검색 페이지"
                  >
                    ‹
                  </button>
                  <span aria-current="page">1</span>
                  <button
                    type="button"
                    disabled
                    aria-label="다음 주소 검색 페이지"
                  >
                    ›
                  </button>
                </nav>
              )}
            </>
          )}
        </ResultDialog>
      )}
    </>
  );
}

export default function ResultsDialogs(props: Props) {
  const { kind, application: a, content, setDialog, onActions } = props;
  const close = () => setDialog(null);

  if (["region", "address", "address-results"].includes(kind))
    return <RegionForm {...props} />;
  if (kind === "actions")
    return (
      <ActionsForm content={content} onClose={close} onActions={onActions} />
    );
  const published = kind === "published" || kind === "republished";
  const republished = kind === "republished";
  const title = published
    ? republished
      ? "수정 결과를 저장·공개했습니다."
      : "결과를 저장·공개했습니다."
    : kind === "region-saved"
      ? "지역 문제를 등록했습니다."
      : "임시저장되었습니다.";

  return (
    <ResultDialog
      size="small"
      title={title}
      onClose={close}
      rounded={republished}
    >
      {republished && (
        <p className="text-sm leading-[21px] text-[#64748b]">
          주민에게 수정된 점검 결과와 권장조치를 제공합니다. 지원 신청은 주민이
          제출한 뒤 별도로 접수됩니다.
        </p>
      )}
      {published ? (
        <dl className="flex flex-col gap-3 text-sm leading-[22px]">
          {[
            ["접수번호", `${a.id} · ${a.resident}`],
            ["점검 상태", "완료 · 결과 공개"],
            ["지원 상태", "미신청"],
          ].map(([label, value]) => (
            <div
              key={label}
              className={`flex ${republished ? "gap-3" : "justify-between"}`}
            >
              <dt
                className={`text-[13px] ${republished ? "w-[116px] shrink-0 leading-5 text-[#64748b]" : ""}`}
              >
                {label}
              </dt>
              <dd
                className={`${republished ? "leading-[21px]" : "text-right"} ${label === "점검 상태" ? "text-[#27654d]" : ""}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm leading-[21px]">
          {kind === "region-saved" ? (
            "지역 문제 목록과 지도에 반영됩니다. 개별 주택 지원·시공 신청은 별도 절차로 진행합니다."
          ) : (
            <>
              입력한 점검 결과와 사진이 임시저장되었습니다.
              <br />
              주민에게는 아직 공개되지 않습니다.
            </>
          )}
        </p>
      )}
      <button
        type="button"
        onClick={close}
        className={`${resultPrimary} ${republished ? "h-10" : "h-11 text-base leading-6"}`}
      >
        확인
      </button>
    </ResultDialog>
  );
}
